(function(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    let gl;
    let is2D = false;

    // Defensively acquire WebGL2 context
    if (ctx && ctx.getParameter) {
        gl = ctx;
    } else {
        is2D = true;
        if (!canvas.__webglCanvas) {
            canvas.__webglCanvas = document.createElement('canvas');
            const glOptions = { 
                antialias: false, 
                preserveDrawingBuffer: true,
                depth: false,
                stencil: false
            };
            canvas.__webglCtx = canvas.__webglCanvas.getContext('webgl2', glOptions);
        }
        canvas.__webglCanvas.width = grid.width;
        canvas.__webglCanvas.height = grid.height;
        gl = canvas.__webglCtx;
    }

    if (!gl) {
        if (is2D) {
            ctx.fillStyle = '#050810';
            ctx.fillRect(0, 0, grid.width, grid.height);
            ctx.fillStyle = '#ff0055';
            ctx.font = '14px monospace';
            ctx.fillText("WebGL2 not supported.", 20, 30);
        }
        return;
    }

    // Initialize only once per canvas
    if (!gl.__phospheneEngine) {
        gl.getExtension('EXT_color_buffer_float');

        const compileShader = (type, source) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, source);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(s));
                gl.deleteShader(s);
                return null;
            }
            return s;
        };

        const createProgram = (vsSrc, fsSrc) => {
            const p = gl.createProgram();
            const vs = compileShader(gl.VERTEX_SHADER, vsSrc);
            const fs = compileShader(gl.FRAGMENT_SHADER, fsSrc);
            gl.attachShader(p, vs);
            gl.attachShader(p, fs);
            gl.linkProgram(p);
            if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
                console.error(gl.getProgramInfoLog(p));
            }
            return p;
        };

        const createFBO = (w, h) => {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            
            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            return { tex, fbo };
        };

        const vsFullscreen = `#version 300 es
        out vec2 v_uv;
        void main() {
            vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
            v_uv = p;
            gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
        }`;

        const fsCore = `#version 300 es
        precision highp float;
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        out vec4 fragColor;

        #define PI 3.14159265359
        #define TAU 6.28318530718

        vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
        vec2 cdiv(vec2 a, vec2 b) { float d = dot(b,b)+1e-8; return vec2(dot(a,b), a.y*b.x - a.x*b.y)/d; }
        vec2 cexp(vec2 z) { return exp(z.x) * vec2(cos(z.y), sin(z.y)); }
        vec2 cpow(vec2 z, float n) { float r=length(z); float a=atan(z.y,z.x); return pow(r,n)*vec2(cos(n*a), sin(n*a)); }

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f*f*(3.0-2.0*f);
            return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
        }
        float fbm(vec2 p) {
            float f = 0.0, amp = 0.5;
            for(int i=0; i<5; i++) { f += amp * noise(p); p *= 2.02; amp *= 0.5; }
            return f;
        }

        vec3 candy_acid(float t) {
            t = fract(t);
            vec3 c1 = vec3(1.0, 0.0, 0.4); // Hot Pink
            vec3 c2 = vec3(0.5, 0.0, 1.0); // Violet
            vec3 c3 = vec3(0.0, 0.9, 1.0); // Cyan
            vec3 c4 = vec3(0.7, 1.0, 0.0); // Acid Green
            vec3 c5 = vec3(1.0, 0.9, 0.7); // White-Yellow
            
            if(t < 0.25) return mix(c1, c2, t*4.0);
            if(t < 0.50) return mix(c2, c3, (t-0.25)*4.0);
            if(t < 0.75) return mix(c3, c4, (t-0.50)*4.0);
            return mix(c4, c5, (t-0.75)*4.0);
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
            
            float tremor = fbm(vec2(u_time * 2.5, 0.0)) * 0.015;
            float breath = sin(u_time * 0.3) * 0.12;
            
            vec2 fovea = vec2(sin(u_time*0.2)*0.15 + tremor, cos(u_time*0.25)*0.1 + tremor);
            if(u_mouse.x > 0.0 || u_mouse.y > 0.0) {
                vec2 m = (u_mouse - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
                fovea = mix(fovea, m, 0.5);
            }
            
            float pulse = smoothstep(0.6, 1.0, sin(u_time * 0.4));
            
            vec2 d = uv - fovea;
            float r = max(length(d), 1e-5);
            vec2 lp = vec2(log(r) - breath, atan(d.y, d.x));
            
            float chirality = sign(sin(u_time * 0.15));
            
            vec2 c_const = vec2(0.4 * sin(u_time*0.1), 0.3 * cos(u_time*0.15));
            vec2 w = cdiv(cpow(lp, 3.0) - vec2(1.0,0.0), cpow(lp, 2.0) + c_const);
            
            float phase = atan(w.y, w.x) / TAU + 0.5;
            float mag = length(w);
            
            float tunnel = sin(8.0 * lp.x - u_time * 1.5 + 3.0 * lp.y * chirality);
            float cobweb = sin(5.0 * lp.x) * sin(12.0 * lp.y + u_time);
            float spiral = sin(4.0 * lp.x + 6.0 * lp.y * chirality - u_time * 2.0);
            float grid = sin(10.0 * w.x) * sin(10.0 * w.y);
            
            float m1 = fbm(uv * 1.5 + u_time * 0.05);
            float m2 = fbm(uv * 2.5 - u_time * 0.08);
            
            float form = mix(mix(tunnel, spiral, m1), mix(cobweb, grid, m2), 0.5 + pulse * 0.5);
            
            float contour = fract(phase * 12.0 + u_time * 0.5);
            float rib = smoothstep(0.4, 0.5, contour) - smoothstep(0.5, 0.6, contour);
            
            float intensity = abs(form) * 0.6 + rib * 0.3 + (1.0 / (1.0 + mag * 0.4)) * 0.4;
            
            vec3 col = candy_acid(phase + u_time * 0.1 + intensity * 0.3);
            
            vec2 eps = vec2(0.01, 0.0);
            float h0 = fbm(lp * 3.0);
            float hx = fbm(lp * 3.0 + eps.xy);
            float hy = fbm(lp * 3.0 + eps.yx);
            vec3 n = normalize(vec3(hx-h0, hy-h0, 0.08));
            vec3 light = normalize(vec3(1.0, 1.0, 1.5));
            float spec = pow(max(dot(reflect(-light, n), vec3(0,0,1)), 0.0), 48.0);
            
            col += spec * vec3(1.0, 0.95, 1.0) * (0.6 + pulse * 0.4);
            
            vec3 void_col = vec3(0.01, 0.05, 0.15);
            col = mix(void_col, col, smoothstep(0.05, 0.8, intensity));
            
            col += vec3(1.0, 0.1, 0.5) * exp(-r * 12.0) * (0.5 + pulse * 0.5);
            
            float depth = clamp(intensity + breath * 0.5, 0.0, 1.0);
            fragColor = vec4(col, depth);
        }`;

        const fsFeedback = `#version 300 es
        precision highp float;
        uniform sampler2D u_core;
        uniform sampler2D u_prev;
        uniform float u_time;
        out vec4 fragColor;

        void main() {
            ivec2 coord = ivec2(gl_FragCoord.xy);
            vec4 core = texelFetch(u_core, coord, 0);
            vec4 prev = texelFetch(u_prev, coord, 0);
            
            float decay = 0.985; // ~4-10s linger
            
            vec3 complement = vec3(1.0) - prev.rgb;
            complement = mix(complement, vec3(0.0, 1.0, 0.8), 0.2); // Acid shift
            
            float core_lum = dot(core.rgb, vec3(0.299, 0.587, 0.114));
            vec3 ghost = complement * decay * (1.0 - smoothstep(0.0, 0.4, core_lum));
            
            vec3 final_col = max(core.rgb, prev.rgb * decay * 0.98);
            final_col = max(final_col, ghost * 0.7);
            
            float depth = max(core.a, prev.a * decay);
            fragColor = vec4(final_col, depth);
        }`;

        const fsComposite = `#version 300 es
        precision highp float;
        uniform sampler2D u_scene;
        uniform float u_time;
        uniform vec2 u_resolution;
        out vec4 fragColor;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

        vec3 enforceMaxSat(vec3 rgb) {
            float maxC = max(rgb.r, max(rgb.g, rgb.b));
            if (maxC > 0.0) rgb /= maxC;
            return rgb;
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / u_resolution;
            vec4 scene = texture(u_scene, uv);
            float depth = scene.a;
            
            vec2 dir = uv - 0.5;
            float r2 = dot(dir, dir);
            
            vec2 texel = 1.0 / u_resolution;
            float lumX = texture(u_scene, uv + vec2(texel.x, 0)).a - texture(u_scene, uv - vec2(texel.x, 0)).a;
            float lumY = texture(u_scene, uv + vec2(0, texel.y)).a - texture(u_scene, uv - vec2(0, texel.y)).a;
            float edge = smoothstep(0.0, 0.15, length(vec2(lumX, lumY)));
            
            // Chromostereopsis + Aberration
            float parallax = 0.035 * depth; 
            float ab = edge * 0.02 * r2;
            
            vec2 rOff = uv + dir * (parallax + ab);
            vec2 bOff = uv - dir * (parallax + ab * 1.5);
            
            float r = texture(u_scene, rOff).r;
            float g = texture(u_scene, uv).g;
            float b = texture(u_scene, bOff).b;
            
            vec3 col = vec3(r, g, b);
            
            col = mix(col, enforceMaxSat(col), 0.5 + 0.5 * depth);
            
            // Floating Point Dementia
            float pulse = smoothstep(0.75, 1.0, sin(u_time * 0.4));
            if (pulse > 0.0) {
                float bits = mix(48.0, 4.0, pulse * depth);
                col = floor(col * bits) / bits;
                
                float crack = hash(uv * 60.0 + floor(u_time * 12.0));
                if (crack > 0.992 && pulse > 0.6 && depth > 0.6) {
                    col = vec3(0.8, 0.0, 1.0); // NaN purple
                }
            }
            
            float vig = 1.0 - smoothstep(0.3, 1.4, length(dir));
            col *= vig;
            
            fragColor = vec4(col, 1.0);
        }`;

        gl.__phospheneEngine = {
            progCore: createProgram(vsFullscreen, fsCore),
            progFeed: createProgram(vsFullscreen, fsFeedback),
            progComp: createProgram(vsFullscreen, fsComposite),
            fboCore: createFBO(grid.width, grid.height),
            fboPing: createFBO(grid.width, grid.height),
            fboPong: createFBO(grid.width, grid.height),
            quad: gl.createVertexArray()
        };

        // Pre-fill ping buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, gl.__phospheneEngine.fboPing.fbo);
        gl.clearColor(0,0,0,0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    const eng = gl.__phospheneEngine;
    if(!eng.progCore || !eng.progFeed || !eng.progComp) return;

    // Handle resize
    if (eng.fboCore.width !== grid.width || eng.fboCore.height !== grid.height) {
        const resizeFBO = (fbo) => {
            gl.bindTexture(gl.TEXTURE_2D, fbo.tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, grid.width, grid.height, 0, gl.RGBA, gl.HALF_FLOAT, null);
            fbo.width = grid.width;
            fbo.height = grid.height;
        };
        resizeFBO(eng.fboCore);
        resizeFBO(eng.fboPing);
        resizeFBO(eng.fboPong);
        gl.bindFramebuffer(gl.FRAMEBUFFER, eng.fboPing.fbo);
        gl.clearColor(0,0,0,0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    gl.viewport(0, 0, grid.width, grid.height);
    gl.bindVertexArray(eng.quad);

    // Pass 1: Core
    gl.bindFramebuffer(gl.FRAMEBUFFER, eng.fboCore.fbo);
    gl.useProgram(eng.progCore);
    gl.uniform1f(gl.getUniformLocation(eng.progCore, "u_time"), time);
    gl.uniform2f(gl.getUniformLocation(eng.progCore, "u_resolution"), grid.width, grid.height);
    gl.uniform2f(gl.getUniformLocation(eng.progCore, "u_mouse"), mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Pass 2: Feedback
    gl.bindFramebuffer(gl.FRAMEBUFFER, eng.fboPong.fbo);
    gl.useProgram(eng.progFeed);
    gl.uniform1f(gl.getUniformLocation(eng.progFeed, "u_time"), time);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, eng.fboCore.tex);
    gl.uniform1i(gl.getUniformLocation(eng.progFeed, "u_core"), 0);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, eng.fboPing.tex);
    gl.uniform1i(gl.getUniformLocation(eng.progFeed, "u_prev"), 1);
    
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Pass 3: Composite
    gl.bindFramebuffer(gl.FRAMEBUFFER, is2D ? null : null); // If pure WebGL context, render to screen
    gl.useProgram(eng.progComp);
    gl.uniform1f(gl.getUniformLocation(eng.progComp, "u_time"), time);
    gl.uniform2f(gl.getUniformLocation(eng.progComp, "u_resolution"), grid.width, grid.height);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, eng.fboPong.tex);
    gl.uniform1i(gl.getUniformLocation(eng.progComp, "u_scene"), 0);
    
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Swap Ping/Pong
    const temp = eng.fboPing;
    eng.fboPing = eng.fboPong;
    eng.fboPong = temp;

    // Output to 2D canvas if needed
    if (is2D && ctx) {
        ctx.clearRect(0, 0, grid.width, grid.height);
        ctx.drawImage(canvas.__webglCanvas, 0, 0, grid.width, grid.height);
    }
})
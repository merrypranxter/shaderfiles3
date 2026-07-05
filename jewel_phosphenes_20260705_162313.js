/**
 * THE LUXURY OF THE FOVEA
 * An artsy phosphene-field shader integrating retinotopic mapping, 
 * complex domain coloring, temporal afterimage feedback, chromostereopsis, 
 * and floating-point dementia.
 */

function(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    // Ensure WebGL renderer and resources are only initialized once
    if (!canvas.__three) {
        try {
            if (!ctx) throw new Error("WebGL context not available");

            const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
            renderer.autoClear = false;

            // Use HalfFloatType for smooth temporal feedback without harsh 8-bit banding
            const rtParams = {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.HalfFloatType,
                depthBuffer: false,
                stencilBuffer: false
            };

            const rtCore = new THREE.WebGLRenderTarget(grid.width, grid.height, rtParams);
            const rtA = new THREE.WebGLRenderTarget(grid.width, grid.height, rtParams);
            const rtB = new THREE.WebGLRenderTarget(grid.width, grid.height, rtParams);

            const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            const planeGeom = new THREE.PlaneGeometry(2, 2);

            // ----------------------------------------------------------------
            // PASS 1: CORE PHOSPHENE GENERATOR
            // ----------------------------------------------------------------
            const matCore = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: {
                    u_time: { value: 0 },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
                },
                vertexShader: `
                    out vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    precision highp float;
                    in vec2 vUv;
                    out vec4 fragColor;
                    
                    uniform float u_time;
                    uniform vec2 u_resolution;

                    #define PI 3.14159265359

                    // Complex Math
                    vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
                    vec2 cdiv(vec2 a, vec2 b) { float d = dot(b,b)+1e-8; return vec2(dot(a,b), a.y*b.x - a.x*b.y)/d; }
                    vec2 cexp(vec2 z) { return exp(z.x) * vec2(cos(z.y), sin(z.y)); }
                    vec2 csqr(vec2 z) { return vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y); }

                    // Cosine Palette for Jewel-like Spectral Colors
                    vec3 cos_palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
                        return a + b * cos(6.28318 * (c * t + d));
                    }

                    void main() {
                        vec2 uv = (vUv - 0.5) * 2.0;
                        uv.x *= u_resolution.x / u_resolution.y;

                        // 1. Retinotopic Mapping & Tremor
                        vec2 tremor = vec2(sin(u_time * 1.3), cos(u_time * 1.7)) * 0.02;
                        vec2 fovea = tremor; 
                        vec2 d = uv - fovea;
                        float r = max(length(d), 1e-6);
                        
                        // Log-polar conversion
                        vec2 lp = vec2(log(r), atan(d.y, d.x));

                        // Breathing fovea dilation
                        float breathe = sin(u_time * 0.4) * 0.5 + 0.5;
                        lp.x += breathe * 0.3;

                        // 2. Floating Point Dementia (Triggered by pressure pulse)
                        float pulse = smoothstep(0.85, 1.0, sin(u_time * 0.8)); // Slow pressure pulse
                        float is_nan = 0.0;
                        
                        if (pulse > 0.0) {
                            // Mantissa stair-steps
                            float quant = exp2(mix(20.0, 3.0, pulse));
                            lp = floor(lp * quant) / quant;
                            
                            // NaN cracks
                            float crack = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
                            if (crack > 0.995 - pulse * 0.02) is_nan = 1.0;
                        }

                        // 3. Domain Coloring (Rational Function)
                        vec2 z = lp * 1.5;
                        vec2 z2 = csqr(z);
                        vec2 z3 = cmul(z2, z);
                        vec2 num = z3 - vec2(1.0, 0.0);
                        vec2 den = z2 + vec2(0.4, 0.3 * sin(u_time * 0.5));
                        vec2 w = cdiv(num, den);
                        
                        float phase = atan(w.y, w.x);
                        float mag = length(w);

                        // 4. Klüver Form Constants
                        float chirality = sin(u_time * 0.2) > 0.0 ? 1.0 : -1.0;
                        
                        // Tunnel / Funnel
                        float tunnel = sin(lp.x * 10.0 + lp.y * 2.0 * chirality + phase);
                        // Cobweb
                        float cobweb = sin(lp.x * 8.0) * sin(lp.y * 12.0 + u_time);
                        // Spiral
                        float spiral = sin(lp.x * 5.0 - lp.y * 6.0 * chirality + u_time * 1.5);
                        
                        // Morphing blend
                        float mix_w = sin(u_time * 0.3) * 0.5 + 0.5;
                        float form = mix(tunnel, mix(cobweb, spiral, breathe), mix_w);
                        
                        // Rectify and soften
                        float intensity = smoothstep(0.0, 0.9, abs(form));
                        
                        // 5. Chromostereopsis & False Color
                        // Depth mapped to pure saturated red/pink (near) vs blue/cyan (far)
                        float depth = smoothstep(0.0, 1.0, intensity * exp(-r * 1.5)); 
                        vec3 color_far = vec3(0.0, 0.2, 1.0); // Saturated Blue/Cyan
                        vec3 color_near = vec3(1.0, 0.0, 0.4); // Hot Pink/Red
                        
                        vec3 col = mix(color_far, color_near, depth);
                        
                        // Enforce max saturation for chromostereopsis
                        float maxC = max(col.r, max(col.g, col.b));
                        if (maxC > 0.0) col /= maxC;
                        
                        // Add phase contours (Spectral Color / Domain Coloring)
                        float contour = smoothstep(0.9, 1.0, fract(phase * 3.0 / PI));
                        vec3 spectral = cos_palette(phase / (2.0*PI), vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
                        col = mix(col, spectral, contour * 0.8 * depth);
                        
                        // NaN Corruption override
                        if (is_nan > 0.0) col = vec3(0.8, 0.0, 1.0); // Purple corruption
                        
                        // Window out the foveal abyss
                        float window = smoothstep(0.0, 0.1, r);
                        
                        fragColor = vec4(col * intensity * window, 1.0);
                    }
                `
            });

            // ----------------------------------------------------------------
            // PASS 2: AFTERIMAGE FEEDBACK
            // ----------------------------------------------------------------
            const matFeedback = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: {
                    u_core: { value: null },
                    u_history: { value: null }
                },
                vertexShader: `
                    out vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    precision highp float;
                    in vec2 vUv;
                    out vec4 fragColor;
                    
                    uniform sampler2D u_core;
                    uniform sampler2D u_history;

                    void main() {
                        vec3 core = texture(u_core, vUv).rgb;
                        vec3 history = texture(u_history, vUv).rgb;
                        
                        // Temporal adaptation: drift towards complement (retinal fatigue)
                        vec3 complement = vec3(1.0) - history;
                        history = mix(history, complement, 0.008); 
                        
                        // Slow decay (4-10s linger)
                        history *= 0.985;
                        
                        // Additive/Max composite
                        vec3 outCol = max(core, history);
                        fragColor = vec4(outCol, 1.0);
                    }
                `
            });

            // ----------------------------------------------------------------
            // PASS 3: COMPOSITE & CHROMATIC ABERRATION
            // ----------------------------------------------------------------
            const matComposite = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: {
                    u_accum: { value: null },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
                },
                vertexShader: `
                    out vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    precision highp float;
                    in vec2 vUv;
                    out vec4 fragColor;
                    
                    uniform sampler2D u_accum;
                    uniform vec2 u_resolution;

                    void main() {
                        vec3 col = texture(u_accum, vUv).rgb;
                        vec2 texel = 1.0 / u_resolution;
                        
                        // Edge detection for targeted chromatic aberration
                        float l_c = dot(col, vec3(0.299, 0.587, 0.114));
                        float l_r = dot(texture(u_accum, vUv + vec2(texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
                        float l_u = dot(texture(u_accum, vUv + vec2(0.0, texel.y)).rgb, vec3(0.299, 0.587, 0.114));
                        
                        vec2 grad = vec2(l_r - l_c, l_u - l_c);
                        float grad_mag = length(grad);
                        
                        // Apply Prism Dispersion / CA only on bright edges
                        if (grad_mag > 0.02) {
                            vec2 dir = normalize(grad) * texel * 5.0;
                            float r = texture(u_accum, vUv + dir).r;
                            float b = texture(u_accum, vUv - dir).b;
                            col.r = max(col.r, r);
                            col.b = max(col.b, b);
                        }
                        
                        // Wet light / Spectral burn
                        col = pow(col, vec3(1.1)); // Contrast boost
                        float luma = dot(col, vec3(0.299, 0.587, 0.114));
                        col += vec3(1.0, 0.9, 0.4) * smoothstep(0.7, 1.0, luma) * 0.6; // White-yellow burn
                        
                        // Deep space background instead of empty black
                        vec3 bg = vec3(0.0, 0.02, 0.08);
                        col = max(col, bg);

                        fragColor = vec4(col, 1.0);
                    }
                `
            });

            const sceneCore = new THREE.Scene();
            sceneCore.add(new THREE.Mesh(planeGeom, matCore));

            const sceneFeedback = new THREE.Scene();
            sceneFeedback.add(new THREE.Mesh(planeGeom, matFeedback));

            const sceneComposite = new THREE.Scene();
            sceneComposite.add(new THREE.Mesh(planeGeom, matComposite));

            canvas.__three = {
                renderer, camera,
                rtCore, rtA, rtB,
                sceneCore, matCore,
                sceneFeedback, matFeedback,
                sceneComposite, matComposite,
                pingPong: true
            };
        } catch (e) {
            console.error("WebGL Initialization Failed:", e);
            throw e;
        }
    }

    const t = canvas.__three;
    if (!t) return;

    // Handle Resize
    if (t.rtCore.width !== grid.width || t.rtCore.height !== grid.height) {
        t.rtCore.setSize(grid.width, grid.height);
        t.rtA.setSize(grid.width, grid.height);
        t.rtB.setSize(grid.width, grid.height);
        t.renderer.setSize(grid.width, grid.height, false);
        
        t.matCore.uniforms.u_resolution.value.set(grid.width, grid.height);
        t.matComposite.uniforms.u_resolution.value.set(grid.width, grid.height);
    }

    // 1. Render Core Phosphene Math
    t.matCore.uniforms.u_time.value = time;
    t.renderer.setRenderTarget(t.rtCore);
    t.renderer.render(t.sceneCore, t.camera);

    // 2. Render Afterimage Feedback
    t.matFeedback.uniforms.u_core.value = t.rtCore.texture;
    t.matFeedback.uniforms.u_history.value = t.pingPong ? t.rtA.texture : t.rtB.texture;
    const writeTarget = t.pingPong ? t.rtB : t.rtA;
    
    t.renderer.setRenderTarget(writeTarget);
    t.renderer.render(t.sceneFeedback, t.camera);

    // 3. Render Composite (Chromatic Aberration + Wet Light) to Screen
    t.matComposite.uniforms.u_accum.value = writeTarget.texture;
    t.renderer.setRenderTarget(null);
    t.renderer.render(t.sceneComposite, t.camera);

    // Swap buffers
    t.pingPong = !t.pingPong;
}
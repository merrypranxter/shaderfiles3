export default function(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    if (!canvas.__three) {
        try {
            if (!ctx) throw new Error("WebGL 2 context not available");
            
            const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
            const scene = new THREE.Scene();
            const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            
            const material = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: {
                    u_time: { value: 0 },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
                },
                vertexShader: `
                    out vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position.xy, 0.0, 1.0);
                    }
                `,
                fragmentShader: `
                    in vec2 vUv;
                    out vec4 fragColor;

                    uniform float u_time;
                    uniform vec2 u_resolution;

                    #define PI 3.14159265359
                    #define TAU 6.28318530718

                    // Domain Coloring Math
                    vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
                    vec2 cdiv(vec2 a, vec2 b) { float d = dot(b,b) + 1e-8; return vec2(dot(a,b), a.y*b.x - a.x*b.y)/d; }
                    vec2 cpow(vec2 z, float n) { float r = length(z); float a = atan(z.y, z.x); return pow(r, n)*vec2(cos(n*a), sin(n*a)); }

                    // Entropy Hashes
                    float hash12(vec2 p) {
                        vec3 p3  = fract(vec3(p.xyx) * .1031);
                        p3 += dot(p3, p3.yzx + 33.33);
                        return fract((p3.x + p3.y) * p3.z);
                    }
                    vec2 hash22(vec2 p) {
                        vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
                        p3 += dot(p3, p3.yxz+33.33);
                        return fract((p3.xx+p3.yz)*p3.zy);
                    }

                    // Saccadic Masking Clock
                    float getStutterTime(float t) {
                        float stepT = floor(t * 6.0);
                        float f = fract(t * 6.0);
                        return stepT * 0.1666 + smoothstep(0.9, 1.0, f) * 0.1666;
                    }

                    // Color Cycling & Spectral Metamerism
                    vec3 getAcidPalette(float x) {
                        x = fract(x);
                        vec3 hotPink = vec3(1.0, 0.0, 0.5);
                        vec3 neonYellow = vec3(1.0, 1.0, 0.0);
                        vec3 acidGreen = vec3(0.2, 1.0, 0.0);
                        vec3 cyan = vec3(0.0, 1.0, 1.0);
                        vec3 electricBlue = vec3(0.0, 0.2, 1.0);
                        vec3 violet = vec3(0.5, 0.0, 1.0);
                        vec3 orange = vec3(1.0, 0.4, 0.0);
                        
                        if (x < 0.14) return mix(hotPink, orange, x*7.0);
                        if (x < 0.28) return mix(orange, neonYellow, (x-0.14)*7.0);
                        if (x < 0.42) return mix(neonYellow, acidGreen, (x-0.28)*7.0);
                        if (x < 0.57) return mix(acidGreen, cyan, (x-0.42)*7.0);
                        if (x < 0.71) return mix(cyan, electricBlue, (x-0.57)*7.0);
                        if (x < 0.85) return mix(electricBlue, violet, (x-0.71)*7.0);
                        return mix(violet, hotPink, (x-0.85)*7.0);
                    }

                    // Plateau Foam Morphogenesis (Weaire-Phelan Voronoi)
                    vec4 foam(vec2 p, float t) {
                        vec2 n = floor(p);
                        vec2 f = fract(p);
                        float d1 = 1e9, d2 = 1e9;
                        float id = 0.0;
                        
                        for(int j=-1; j<=1; j++) {
                            for(int i=-1; i<=1; i++) {
                                vec2 g = vec2(float(i),float(j));
                                vec2 o = hash22(n + g);
                                float w = 0.2 * sin(o.x * TAU + t * 1.5); // Differential cell pressure
                                vec2 r = g + o - f;
                                float d = length(r) - w;
                                
                                if(d < d1) {
                                    d2 = d1;
                                    d1 = d;
                                    id = o.y;
                                } else if(d < d2) {
                                    d2 = d;
                                }
                            }
                        }
                        return vec4(d1, d2, d2 - d1, id); 
                    }

                    // The Core Computational Soup Evaluation
                    vec4 evaluateSoup(vec2 uv, float t) {
                        // Damage Aesthetics: Macroblocking & VHS tracking tear
                        float sTime = getStutterTime(t);
                        vec2 blockId = floor(uv * vec2(20.0, 10.0));
                        float isGlitch = step(0.97, hash12(blockId + sTime * 1.3));
                        uv.x += isGlitch * (hash12(blockId) - 0.5) * 0.1;
                        
                        float tear = step(0.98, hash12(vec2(floor(uv.y * 45.0), sTime)));
                        uv.x += tear * 0.04 * sin(t * 25.0);

                        // Domain Coloring Warp (Vascular flow logic)
                        vec2 z = (uv - 0.5) * 4.0;
                        z.x *= u_resolution.x / u_resolution.y;
                        
                        vec2 c = vec2(0.4 * cos(t*0.4), 0.5 * sin(t*0.5));
                        vec2 num = cpow(z, 3.0) - vec2(1.0, 0.0);
                        vec2 den = cpow(z, 2.0) + c;
                        vec2 w = cdiv(num, den);
                        
                        vec2 mob = cdiv(cmul(vec2(1.0, 0.0), z) + vec2(0.0, 1.0), cmul(vec2(-1.0, 0.0), z) + vec2(1.0, 0.0));
                        w = mix(w, mob, 0.5 + 0.5 * sin(t * 0.3));

                        // Acoustic Impedance Tessellation
                        vec2 fUv = w * 2.0 + vec2(t * 0.3, -t * 0.2);
                        vec4 fData = foam(fUv, t);
                        
                        float border = fData.z;
                        float depth = clamp(1.0 - fData.x, 0.0, 1.0); 
                        float cellId = fData.w;
                        
                        // Structural Color (Thin-film interference)
                        float phase = length(w) * 4.0 - t * 3.0 + cellId * TAU;
                        float interference = 0.5 + 0.5 * cos(phase + border * 12.0);
                        
                        // Color Cycling Palette
                        float colorIdx = cellId * 3.0 + interference * 0.4 + t * 0.5;
                        vec3 baseCol = getAcidPalette(colorIdx);
                        
                        // Plateau borders (White-hot highlights)
                        float edgeGlow = smoothstep(0.07, 0.0, border);
                        vec3 edgeCol = vec3(1.0) * edgeGlow * (0.5 + 0.5 * sin(t * 6.0 + cellId * 15.0));
                        
                        // Acoustic Speckle & Shadowing
                        float speckle = hash12(uv * 250.0 + t) * 0.12;
                        float shadow = smoothstep(0.8, 0.0, fData.x) * 0.8 + 0.2;
                        
                        vec3 finalCol = baseCol * shadow + edgeCol + speckle;
                        
                        // Chromostereopsis push (Enforce max saturation)
                        float maxC = max(max(finalCol.r, finalCol.g), finalCol.b);
                        if(maxC > 0.001) finalCol /= maxC; 
                        
                        return vec4(finalCol, depth);
                    }

                    void main() {
                        float t = u_time;
                        vec2 uv = vUv;
                        
                        float baseDepth = evaluateSoup(uv, t).a;
                        
                        // Autostereogram separation equation (SIRDS math)
                        float E = 0.02;
                        float mu = 0.7;
                        float sep = E * (1.0 - mu * baseDepth) / (2.0 - mu * baseDepth);
                        
                        // Chromatic Aberration & Longitudinal Shift (Red advances, Blue recedes)
                        vec2 rUv = uv + vec2(sep, 0.0);
                        vec2 bUv = uv - vec2(sep, 0.0);
                        
                        float r = evaluateSoup(rUv, t).r;
                        float g = evaluateSoup(uv, t).g;
                        float b = evaluateSoup(bUv, t).b;
                        
                        vec3 col = vec3(r, g, b);
                        
                        // Metamerism out-of-gamut neon flashing
                        float oog = step(0.99, hash12(vec2(u_time * 0.1, floor(uv.y * 10.0))));
                        if (oog > 0.5) {
                            col = mix(col, vec3(1.0, 1.0, 0.0), 0.4 * hash12(uv + t)); 
                        }
                        
                        // Post-process: Vignette & CRT Raster
                        float d = length(vUv - 0.5);
                        float vignette = smoothstep(0.85, 0.15, d);
                        float scanline = 0.96 + 0.04 * sin(uv.y * u_resolution.y * PI);
                        
                        col *= vignette * scanline;
                        
                        fragColor = vec4(col, 1.0);
                    }
                `
            });
            
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
            scene.add(mesh);
            
            canvas.__three = { renderer, scene, camera, material };
        } catch (e) {
            console.error("WebGL Initialization Failed:", e);
            throw e;
        }
    }
    
    const { renderer, scene, camera, material } = canvas.__three;
    
    if (material && material.uniforms) {
        if (material.uniforms.u_time) material.uniforms.u_time.value = time;
        if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
    
    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);
}
(function(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    // The Trap: Normal explosions expand outward from a flash, creating smoke and fading.
    // The Rejection: Explosions leave their scars *before* they happen. The flash is a redundant afterthought.
    // The Mechanism: Retrocausal timeline mapping. 10-second modulo phase-shifting where delta < 0 draws anticipation fossils and inward retrograde particles.
    // The Tandem: false_vacuum_decay_front (imploding membranes) + floating_point_dementia (NaN core quantization) + afterimage_painter (complementary feedback shift).

    if (!canvas.__three) {
        try {
            if (!ctx) throw new Error("WebGL 2 context not available");

            const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
            renderer.autoClear = false;

            // Ping-pong buffers for feedback (afterimage & layered scars)
            const fboParams = {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.HalfFloatType, // High precision for floating point dementia & smooth decay
                depthBuffer: false,
                stencilBuffer: false
            };
            const targetA = new THREE.WebGLRenderTarget(grid.width, grid.height, fboParams);
            const targetB = new THREE.WebGLRenderTarget(grid.width, grid.height, fboParams);

            const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            const sceneSim = new THREE.Scene();
            const sceneDisp = new THREE.Scene();

            // --- SIMULATION SHADER ---
            const simMaterial = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: {
                    u_time: { value: 0 },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                    u_feedback: { value: null }
                },
                vertexShader: `
                    out vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    in vec2 vUv;
                    out vec4 fragColor;
                    
                    uniform float u_time;
                    uniform vec2 u_resolution;
                    uniform sampler2D u_feedback;

                    #define PI 3.14159265359
                    #define LOOP_DUR 10.0

                    // The Alchemical Scripture: Forbidden Math & Hashes
                    float hash11(float p) {
                        p = fract(p * 0.1031);
                        p *= p + 33.33;
                        p *= p + p;
                        return fract(p);
                    }

                    float hash21(vec2 p) {
                        vec3 p3  = fract(vec3(p.xyx) * 0.1031);
                        p3 += dot(p3, p3.yzx + 33.33);
                        return fract((p3.x + p3.y) * p3.z);
                    }

                    float vnoise(vec2 p) {
                        vec2 i = floor(p);
                        vec2 f = fract(p);
                        vec2 u = f * f * (3.0 - 2.0 * f);
                        return mix(mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
                                   mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
                    }

                    float fbm(vec2 p) {
                        float sum = 0.0;
                        float amp = 0.5;
                        for(int i = 0; i < 5; i++) {
                            sum += amp * vnoise(p);
                            p = p * 2.0 + 17.0;
                            amp *= 0.5;
                        }
                        return sum;
                    }

                    // Floating Point Dementia: Quantization collapse at the core
                    vec3 quantize(vec3 c, float bits) {
                        float levels = exp2(max(bits, 1.0));
                        return floor(c * levels + 0.5) / levels;
                    }

                    void main() {
                        vec2 uv = vUv;
                        vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
                        vec2 p = (uv - 0.5) * aspect;

                        vec3 color = vec3(0.0);

                        // Deep Void (Background)
                        vec3 voidColor = vec3(0.01, 0.02, 0.06) + vec3(0.0, 0.05, 0.1) * fbm(p * 4.0 - u_time * 0.1);
                        color = voidColor;

                        // 15 Deterministic Events
                        for(int i = 0; i < 15; i++) {
                            float fi = float(i);
                            
                            // Deterministic properties
                            bool isHero = (i == 0);
                            bool isFalseCause = (hash11(fi + 13.0) > 0.65 && !isHero);
                            
                            vec2 center = vec2(hash11(fi * 7.1) * 1.6 - 0.8, hash11(fi * 11.3) * 1.0 - 0.5);
                            if (isHero) center = vec2(0.0, 0.0); // Hero always centered
                            
                            float t_event = hash11(fi * 19.7) * LOOP_DUR;
                            float size = isHero ? 0.6 : 0.15 + hash11(fi * 3.1) * 0.2;
                            
                            // Temporal Reverse-Causality mapping
                            // delta is in [-0.5, 0.5). 
                            // < 0 means Anticipation (fossil forming)
                            // > 0 means Decay (aftermath)
                            // == 0 is the Event
                            float delta = fract((u_time - t_event) / LOOP_DUR + 0.5) - 0.5;
                            
                            vec2 d = p - center;
                            
                            // Metric Competition: Blend Euclidean and Rectilinear space for unnatural shapes
                            float r_euclid = length(d);
                            float r_rect = max(abs(d.x), abs(d.y));
                            float r = mix(r_euclid, r_rect, 0.3 + 0.3 * sin(fi * 4.0));
                            float theta = atan(d.y, d.x);

                            // --- PHASE 1: ANTICIPATION & FOSSILS (delta: -0.4 to 0.0) ---
                            if (delta > -0.4 && delta <= 0.0) {
                                float env = smoothstep(-0.4, -0.05, delta) * smoothstep(0.0, -0.05, delta);
                                
                                // Branching shock scars (Lichtenberg figures)
                                float f = fbm(d * (12.0 / size) - env * 0.5);
                                float branch = smoothstep(0.03, 0.005, abs(f - 0.5));
                                float scarMask = smoothstep(size, size * 0.2, r);
                                
                                vec3 scarCol = mix(vec3(1.0, 0.0, 0.5), vec3(0.5, 1.0, 0.0), hash11(fi * 2.2)); // Hot pink / Acid green
                                color += scarCol * branch * scarMask * env * 2.5;

                                // False Vacuum Decay: Imploding membrane
                                float memb = smoothstep(0.015, 0.0, abs(r - abs(delta) * 1.5 * size));
                                color += vec3(0.0, 1.0, 1.0) * memb * env; // Cyan membrane
                            }

                            // --- PHASE 2: RETROGRADE PARTICLES (delta: -0.2 to 0.0) ---
                            if (delta > -0.2 && delta <= 0.0) {
                                float env = smoothstep(-0.2, 0.0, delta);
                                // Particles flowing INWARD
                                float pr = fract(r * (40.0 / size) + delta * 60.0);
                                float pth = sin(theta * (20.0 + hash11(fi)*10.0) + fbm(d * 15.0) * 4.0);
                                float part = smoothstep(0.85, 1.0, pr) * smoothstep(0.6, 1.0, pth);
                                
                                color += vec3(0.0, 1.0, 0.9) * part * env * smoothstep(size * 1.2, 0.0, r) * 2.0;
                            }

                            // --- PHASE 3: LATE REDUNDANT FLASH (delta: 0.0 to 0.1) ---
                            if (delta > 0.0 && delta < 0.15 && !isFalseCause) {
                                float env = smoothstep(0.15, 0.0, delta);
                                float core = smoothstep(size * 0.4, 0.0, r);
                                
                                // Floating Point Dementia: Core quantization & NaN burn
                                if (r < size * 0.15) {
                                    float bits = 2.0 + env * 3.0; // Precision loss
                                    core = quantize(vec3(core), bits).r;
                                    color += vec3(0.7, 0.0, 1.0) * core * env * 5.0; // Ultraviolet NaN
                                } else {
                                    color += vec3(1.0, 0.9, 0.5) * core * env * 3.0; // Yellow/White
                                }
                                
                                // Orange shock dust blowing OUTWARD
                                float dust = smoothstep(0.08, 0.0, abs(r - delta * 4.0 * size)) * fbm(d * 20.0 - u_time * 2.0);
                                color += vec3(1.0, 0.3, 0.0) * dust * env * 2.0;
                            }
                        }

                        // --- AUTOPHAGIC FEEDBACK (Afterimage Painter) ---
                        vec3 fb = texture(u_feedback, uv).rgb;
                        
                        // Logistic map chaos injected into the green channel (acid green decay)
                        float g_chaos = 3.57 * fb.g * (1.0 - fb.g);
                        fb.g = mix(fb.g, g_chaos, 0.04);

                        // Complementary color burn-in shift
                        vec3 comp = vec3(1.0) - fb;
                        float fbLum = dot(fb, vec3(0.333));
                        // Shift bright areas toward their complement as they decay
                        fb = mix(fb, comp, 0.03 * smoothstep(0.4, 1.0, fbLum));

                        // Decay
                        fb *= 0.92;

                        // Combine present and past (Max blending preserves scars without blowing out)
                        color = max(color, fb);

                        fragColor = vec4(color, 1.0);
                    }
                `
            });

            const dispMaterial = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: {
                    u_texture: { value: null },
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
                    in vec2 vUv;
                    out vec4 fragColor;
                    uniform sampler2D u_texture;
                    uniform vec2 u_resolution;

                    void main() {
                        vec2 uv = vUv;
                        
                        // Lensing and Chromatic Aberration for the final output
                        vec2 d = uv - 0.5;
                        float r = length(d);
                        vec2 dir = r > 0.0 ? d / r : vec2(0.0);
                        
                        float ab = 0.008 * r; // Aberration pushes outward
                        
                        vec3 col;
                        col.r = texture(u_texture, uv + dir * ab).r;
                        col.g = texture(u_texture, uv).g;
                        col.b = texture(u_texture, uv - dir * ab).b;
                        
                        // Vignette
                        col *= 1.0 - smoothstep(0.5, 1.2, r);
                        
                        // Tonemapping to handle HDR burn-ins
                        col = col / (1.0 + col);
                        col = pow(col, vec3(1.0 / 2.2)); // Gamma correct
                        
                        fragColor = vec4(col, 1.0);
                    }
                `
            });

            const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
            sceneSim.add(quad.clone().setMaterial(simMaterial));
            sceneDisp.add(quad.clone().setMaterial(dispMaterial));

            canvas.__three = {
                renderer,
                camera,
                sceneSim,
                sceneDisp,
                simMaterial,
                dispMaterial,
                targetA,
                targetB,
                pingPong: true
            };
        } catch (e) {
            console.error("WebGL Initialization Failed:", e);
            throw e;
        }
    }

    const sys = canvas.__three;
    if (!sys) return;

    // Guard uniforms
    if (sys.simMaterial.uniforms.u_time) {
        sys.simMaterial.uniforms.u_time.value = time;
        sys.simMaterial.uniforms.u_resolution.value.set(grid.width, grid.height);
        sys.dispMaterial.uniforms.u_resolution.value.set(grid.width, grid.height);
    }

    // Ping-pong feedback loop
    const readTarget = sys.pingPong ? sys.targetA : sys.targetB;
    const writeTarget = sys.pingPong ? sys.targetB : sys.targetA;

    // 1. Render Simulation
    sys.simMaterial.uniforms.u_feedback.value = readTarget.texture;
    sys.renderer.setRenderTarget(writeTarget);
    sys.renderer.render(sys.sceneSim, sys.camera);

    // 2. Render Display to Canvas
    sys.dispMaterial.uniforms.u_texture.value = writeTarget.texture;
    sys.renderer.setRenderTarget(null);
    sys.renderer.setSize(grid.width, grid.height, false);
    sys.renderer.render(sys.sceneDisp, sys.camera);

    // Swap buffers
    sys.pingPong = !sys.pingPong;
})(
    typeof ctx !== 'undefined' ? ctx : null,
    typeof grid !== 'undefined' ? grid : { width: 800, height: 600 },
    typeof time !== 'undefined' ? time : 0,
    typeof repos !== 'undefined' ? repos : [],
    typeof input !== 'undefined' ? input : "",
    typeof mouse !== 'undefined' ? mouse : { x: 0, y: 0, isPressed: false },
    typeof canvas !== 'undefined' ? canvas : null,
    typeof THREE !== 'undefined' ? THREE : null
);
/**
 * LV-426: THE MORPHOGENETIC ATTRACTOR
 * 
 * An interactive, stateful evolutionary system simulating the black mutagenic pathogen
 * converging upon xenomorphic anatomy. Uses a ping-pong reaction-diffusion compute 
 * architecture guided by a morphogenetic signed-distance field.
 * 
 * Assimilated Repo Traits:
 * - Morphogenesis: Multi-scale Turing instability & Gray-Scott reaction.
 * - Shiny: Thin-film interference, wet specular caustics, subsurface scattering.
 * - Damage Aesthetics: Chromatic aberration, halation, film grain, optical decay.
 * - Mycelial Networks: Pathogen branching and resource-seeking behavior.
 * - Lenia: Continuous state evolution and morphological memory.
 */

(function(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    // -------------------------------------------------------------------------
    // 1. ARCHITECTURE & SAFETY CHECKS
    // -------------------------------------------------------------------------
    if (!THREE) {
        console.error("The Morphogenetic Attractor requires Three.js to run.");
        return;
    }

    // Determine optimal texture precision (Float32 is best for Turing patterns, fallback to Float16)
    const isWebGL2 = ctx instanceof WebGL2RenderingContext;
    const texType = isWebGL2 ? THREE.FloatType : THREE.HalfFloatType;

    // Initialize or retrieve existing Three.js ecosystem
    if (!canvas.__three) {
        try {
            if (!ctx) throw new Error("WebGL context not available");

            const renderer = new THREE.WebGLRenderer({ 
                canvas: canvas, 
                context: ctx, 
                alpha: false, 
                antialias: false,
                preserveDrawingBuffer: false
            });
            renderer.autoClear = false;

            const scene = new THREE.Scene();
            const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

            // Ping-Pong Framebuffers for stateful memory
            const rtOptions = {
                width: grid.width,
                height: grid.height,
                type: texType,
                format: THREE.RGBAFormat,
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                wrapS: THREE.RepeatWrapping,
                wrapT: THREE.RepeatWrapping,
                depthBuffer: false,
                stencilBuffer: false
            };

            const rtA = new THREE.WebGLRenderTarget(grid.width, grid.height, rtOptions);
            const rtB = new THREE.WebGLRenderTarget(grid.width, grid.height, rtOptions);

            // -----------------------------------------------------------------
            // 2. SIMULATION SHADER (The Evolutionary Computer)
            // -----------------------------------------------------------------
            // Channel R: Pathogen Concentration (Black Goo)
            // Channel G: Anatomical Structure (Bone/Chitin)
            // Channel B: Environmental Pressure / Kinetic Disturbance
            // Channel A: Acidic Rejection / Heat
            const simShader = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: {
                    u_state: { value: null },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                    u_time: { value: 0 },
                    u_mouse_pos: { value: new THREE.Vector2(0.5, 0.5) },
                    u_mouse_vel: { value: 0 },
                    u_mouse_click: { value: 0 }
                },
                vertexShader: `
                    in vec3 position;
                    in vec2 uv;
                    out vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    precision highp float;
                    
                    uniform sampler2D u_state;
                    uniform vec2 u_resolution;
                    uniform float u_time;
                    uniform vec2 u_mouse_pos;
                    uniform float u_mouse_vel;
                    uniform float u_mouse_click;

                    in vec2 vUv;
                    out vec4 fragColor;

                    // Pseudo-random noise for mutation seeding
                    float hash(vec2 p) {
                        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
                    }

                    float noise(vec2 p) {
                        vec2 i = floor(p);
                        vec2 f = fract(p);
                        f = f * f * (3.0 - 2.0 * f);
                        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
                    }

                    void main() {
                        vec2 texel = 1.0 / u_resolution;
                        
                        // 9-Point Laplacian Stencil (Karl Sims weights)
                        vec4 c = texture(u_state, vUv);
                        vec4 n = texture(u_state, vUv + vec2(0.0, texel.y));
                        vec4 s = texture(u_state, vUv - vec2(0.0, texel.y));
                        vec4 e = texture(u_state, vUv + vec2(texel.x, 0.0));
                        vec4 w = texture(u_state, vUv - vec2(texel.x, 0.0));
                        vec4 ne = texture(u_state, vUv + vec2(texel.x, texel.y));
                        vec4 nw = texture(u_state, vUv + vec2(-texel.x, texel.y));
                        vec4 se = texture(u_state, vUv + vec2(texel.x, -texel.y));
                        vec4 sw = texture(u_state, vUv + vec2(-texel.x, -texel.y));

                        vec4 lap = (n + s + e + w) * 0.2 + (ne + nw + se + sw) * 0.05 - c;

                        float R = c.r; // Pathogen
                        float G = c.g; // Structure
                        float P = c.b; // Pressure
                        float A = c.a; // Acid

                        // -----------------------------------------------------
                        // THE MORPHOGENETIC FIELD (Macro-SDF guiding the Turing pattern)
                        // -----------------------------------------------------
                        vec2 p = vUv * 2.0 - 1.0;
                        p.x *= u_resolution.x / u_resolution.y;

                        // Cranial Dome
                        float dome = length(vec2(p.x, p.y - 0.4)) - 0.3;
                        // Spine
                        float spine = abs(p.x) - 0.04;
                        // Ribs
                        float ribs = abs(p.x) - 0.35 + sin(p.y * 24.0) * 0.12;

                        // Combine into a structural blueprint memory
                        float M = smoothstep(0.1, 0.0, dome); 
                        M += smoothstep(0.05, 0.0, spine) * smoothstep(0.5, -0.9, p.y);
                        M += smoothstep(0.08, 0.0, ribs) * smoothstep(0.2, -0.7, p.y) * abs(sin(p.y * 12.0));
                        M = clamp(M, 0.0, 1.0);

                        // -----------------------------------------------------
                        // EVOLUTIONARY CYCLE (30-second loop)
                        // -----------------------------------------------------
                        float cycle = fract(u_time / 30.0);
                        
                        // Phases
                        float phase_dormant = 1.0 - smoothstep(0.0, 0.15, cycle);
                        float phase_contaminate = smoothstep(0.15, 0.3, cycle) * (1.0 - smoothstep(0.4, 0.5, cycle));
                        float phase_converge = smoothstep(0.4, 0.6, cycle) * (1.0 - smoothstep(0.85, 0.95, cycle));
                        float phase_reject = smoothstep(0.85, 0.95, cycle);

                        // Base Feed (F) and Kill (k) rates for Gray-Scott
                        // The Morphogenetic Field (M) guides the rates to form stable structure
                        float targetF = mix(0.022, 0.045, M);
                        float targetK = mix(0.059, 0.055, M);

                        // Apply phase shifts to the rates
                        float currentF = mix(0.010, targetF, phase_converge);
                        float currentK = mix(0.065, targetK, phase_converge);

                        // Pressure (Mouse) disrupts the field, creating chaotic, sharp mutations (claws/teeth)
                        currentF -= P * 0.015;
                        currentK += P * 0.008;

                        // -----------------------------------------------------
                        // REACTION DYNAMICS
                        // -----------------------------------------------------
                        float react = R * G * G;
                        
                        // Pathogen diffuses fast, consumed by Structure, destroyed by Acid
                        float dR = 1.0 * lap.r - react + currentF * (1.0 - R) - A * R * 2.0;
                        
                        // Structure diffuses slowly, feeds on Pathogen, destroyed by Acid
                        float dG = 0.4 * lap.g + react - (currentF + currentK) * G - A * G * 3.0;

                        // Pressure diffuses and decays
                        float dP = 0.8 * lap.b - 0.04 * P;
                        
                        // Acid Generation: 
                        // Triggers massively during rejection phase, or if structure gets too dense, or on click
                        float acidGen = phase_reject * (G > 0.3 ? 0.08 : 0.0);
                        acidGen += (G > 0.95) ? 0.02 : 0.0; // Spontaneous necrosis
                        
                        float distToMouse = length(vUv - u_mouse_pos);
                        if (u_mouse_click > 0.5 && distToMouse < 0.05) {
                            acidGen += 0.5; // Rupture
                        }

                        float dA = 0.6 * lap.a + acidGen - 0.03 * A;

                        // Contamination Phase: Inject foreign genome (noise) to kickstart evolution
                        if (phase_contaminate > 0.0) {
                            float n = noise(vUv * 50.0 + u_time);
                            dR += n * 0.01 * phase_contaminate;
                            dG += n * 0.01 * phase_contaminate * (M + 0.1);
                        }

                        // Add mouse velocity disturbance to Pressure
                        if (distToMouse < 0.05) {
                            dP += u_mouse_vel * 0.5;
                        }

                        // Integrate and clamp
                        R = clamp(R + dR, 0.0, 1.0);
                        G = clamp(G + dG, 0.0, 1.0);
                        P = clamp(P + dP, 0.0, 1.0);
                        A = clamp(A + dA, 0.0, 1.0);

                        fragColor = vec4(R, G, P, A);
                    }
                `
            });

            // -----------------------------------------------------------------
            // 3. DISPLAY SHADER (Wet Biomechanics & Analog Damage)
            // -----------------------------------------------------------------
            const displayShader = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: {
                    u_state: { value: null },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                    u_time: { value: 0 }
                },
                vertexShader: `
                    in vec3 position;
                    in vec2 uv;
                    out vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    precision highp float;
                    
                    uniform sampler2D u_state;
                    uniform vec2 u_resolution;
                    uniform float u_time;

                    in vec2 vUv;
                    out vec4 fragColor;

                    // Pseudo-random for film grain
                    float hash(vec2 p) {
                        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                    }

                    // Sample state with chromatic aberration offset
                    vec4 sampleState(vec2 uv, vec2 offset) {
                        return texture(u_state, uv + offset);
                    }

                    void main() {
                        vec2 uv = vUv;
                        vec2 texel = 1.0 / u_resolution;

                        // Base State
                        vec4 st = texture(u_state, uv);
                        float R = st.r; // Pathogen
                        float G = st.g; // Structure
                        float A = st.a; // Acid

                        // Compute Heightmap & Normals (Raymarch/Bump approximation)
                        float h = R * 0.3 + G * 0.8 - A * 0.6;
                        
                        float hx = sampleState(uv + vec2(texel.x, 0.0), vec2(0)).r * 0.3 + 
                                   sampleState(uv + vec2(texel.x, 0.0), vec2(0)).g * 0.8 - 
                                   sampleState(uv + vec2(texel.x, 0.0), vec2(0)).a * 0.6;
                                   
                        float hy = sampleState(uv + vec2(0.0, texel.y), vec2(0)).r * 0.3 + 
                                   sampleState(uv + vec2(0.0, texel.y), vec2(0)).g * 0.8 - 
                                   sampleState(uv + vec2(0.0, texel.y), vec2(0)).a * 0.6;

                        vec3 normal = normalize(vec3(h - hx, h - hy, 0.015));

                        // Lighting Setup (Cinematic, harsh, wet)
                        vec3 lightDir1 = normalize(vec3(0.5, 0.8, 0.8)); // Main key
                        vec3 lightDir2 = normalize(vec3(-0.6, -0.3, 0.4)); // Rim light
                        
                        float diff1 = max(dot(normal, lightDir1), 0.0);
                        float diff2 = max(dot(normal, lightDir2), 0.0);
                        
                        // Wet Specular Highlights (Caustics/Slime)
                        vec3 viewDir = vec3(0.0, 0.0, 1.0);
                        vec3 half1 = normalize(lightDir1 + viewDir);
                        float spec1 = pow(max(dot(normal, half1), 0.0), 64.0) * 1.5;
                        float spec2 = pow(max(dot(normal, normalize(lightDir2 + viewDir)), 0.0), 32.0) * 0.5;

                        // Materials & Color
                        // 1. Pathogen (Black Goo with Thin-Film Interference)
                        float filmThickness = R * 5.0 + u_time * 0.2;
                        vec3 oilInterference = 0.5 + 0.5 * cos(6.28318 * (filmThickness + vec3(0.0, 0.33, 0.67)));
                        vec3 pathogenCol = mix(vec3(0.02, 0.03, 0.04), oilInterference, R * 0.4);
                        pathogenCol = pathogenCol * (0.1 + diff1 * 0.9) + spec1 * vec3(0.8, 0.9, 1.0);

                        // 2. Structure (Dirty Ivory / Biomechanical Gunmetal)
                        vec3 boneBase = mix(vec3(0.05, 0.06, 0.08), vec3(0.5, 0.48, 0.4), G);
                        vec3 boneCol = boneBase * (diff1 + diff2 * 0.3) + (spec1 + spec2) * vec3(0.9, 0.9, 0.8) * G;

                        // 3. Acidic Rejection (Luminous Yellow-Green)
                        vec3 acidCol = vec3(0.7, 1.0, 0.1) * A * 4.0;
                        // Acid creates an internal glow (subsurface)
                        acidCol += vec3(0.4, 0.8, 0.0) * smoothstep(0.0, 0.5, A) * (1.0 - G);

                        // Blend Materials
                        vec3 finalCol = mix(pathogenCol, boneCol, smoothstep(0.1, 0.7, G));
                        finalCol += acidCol;

                        // -----------------------------------------------------
                        // DAMAGE AESTHETICS (Post-Processing)
                        // -----------------------------------------------------
                        // Chromatic Aberration on edges
                        vec2 caOffset = normal.xy * 0.005 * G;
                        float r = finalCol.r;
                        float g = mix(pathogenCol, boneCol, smoothstep(0.1, 0.7, sampleState(uv, caOffset).g)).g;
                        float b = mix(pathogenCol, boneCol, smoothstep(0.1, 0.7, sampleState(uv, -caOffset).g)).b;
                        finalCol = vec3(r, g, b) + acidCol; // Re-add acid to ensure it stays pure

                        // Halation (Film bleed on bright spots)
                        float luma = dot(finalCol, vec3(0.299, 0.587, 0.114));
                        vec3 halation = vec3(0.8, 0.2, 0.1) * smoothstep(0.8, 1.0, luma) * 0.4;
                        finalCol += halation;

                        // Film Grain
                        float grain = hash(uv * 100.0 + u_time) * 0.1 - 0.05;
                        finalCol += grain;

                        // Heavy Vignette (Claustrophobic framing)
                        float vignette = 1.0 - smoothstep(0.3, 1.2, length(vUv - 0.5));
                        finalCol *= vignette;

                        // Black floor clamp to ensure deep shadows
                        finalCol = max(finalCol, vec3(0.0));

                        fragColor = vec4(finalCol, 1.0);
                    }
                `
            });

            const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
            scene.add(quad);

            // Store in canvas context
            canvas.__three = { 
                renderer, 
                scene, 
                camera, 
                rtA, 
                rtB, 
                simShader, 
                displayShader, 
                quad,
                frameCount: 0,
                prevMouse: { x: mouse.x, y: mouse.y }
            };

            // Initial clear
            renderer.setRenderTarget(rtA);
            renderer.clear();
            renderer.setRenderTarget(rtB);
            renderer.clear();
            renderer.setRenderTarget(null);

        } catch (e) {
            console.error("Morphogenetic Attractor Initialization Failed:", e);
            throw e;
        }
    }

    const sys = canvas.__three;
    if (!sys) return;

    // Handle Resize
    if (sys.rtA.width !== grid.width || sys.rtA.height !== grid.height) {
        sys.renderer.setSize(grid.width, grid.height, false);
        sys.rtA.setSize(grid.width, grid.height);
        sys.rtB.setSize(grid.width, grid.height);
        
        const resVec = new THREE.Vector2(grid.width, grid.height);
        if (sys.simShader?.uniforms?.u_resolution) sys.simShader.uniforms.u_resolution.value.copy(resVec);
        if (sys.displayShader?.uniforms?.u_resolution) sys.displayShader.uniforms.u_resolution.value.copy(resVec);
    }

    // Calculate Mouse Velocity / Pressure
    const dx = mouse.x - sys.prevMouse.x;
    const dy = mouse.y - sys.prevMouse.y;
    const velocity = Math.min(Math.sqrt(dx*dx + dy*dy) * 0.1, 1.0);
    sys.prevMouse.x = mouse.x;
    sys.prevMouse.y = mouse.y;

    // Update Uniforms
    if (sys.simShader && sys.simShader.uniforms) {
        sys.simShader.uniforms.u_time.value = time;
        sys.simShader.uniforms.u_mouse_pos.value.set(mouse.x / grid.width, 1.0 - (mouse.y / grid.height));
        sys.simShader.uniforms.u_mouse_vel.value = velocity;
        sys.simShader.uniforms.u_mouse_click.value = mouse.isPressed ? 1.0 : 0.0;
    }

    if (sys.displayShader && sys.displayShader.uniforms) {
        sys.displayShader.uniforms.u_time.value = time;
    }

    // -------------------------------------------------------------------------
    // 4. EVOLUTIONARY LOOP (Ping-Pong Simulation)
    // -------------------------------------------------------------------------
    // Run multiple simulation steps per frame to speed up organic growth
    const stepsPerFrame = 8; 
    
    sys.quad.material = sys.simShader;
    
    for (let i = 0; i < stepsPerFrame; i++) {
        const readRT = (sys.frameCount % 2 === 0) ? sys.rtA : sys.rtB;
        const writeRT = (sys.frameCount % 2 === 0) ? sys.rtB : sys.rtA;

        sys.simShader.uniforms.u_state.value = readRT.texture;
        
        sys.renderer.setRenderTarget(writeRT);
        sys.renderer.render(sys.scene, sys.camera);
        
        sys.frameCount++;
    }

    // -------------------------------------------------------------------------
    // 5. DISPLAY RENDER
    // -------------------------------------------------------------------------
    sys.quad.material = sys.displayShader;
    const finalReadRT = (sys.frameCount % 2 === 0) ? sys.rtA : sys.rtB;
    sys.displayShader.uniforms.u_state.value = finalReadRT.texture;

    sys.renderer.setRenderTarget(null);
    sys.renderer.render(sys.scene, sys.camera);

})(ctx, grid, time, repos, input, mouse, canvas, typeof THREE !== 'undefined' ? THREE : null);
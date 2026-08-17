export function draw(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    if (!canvas.__three) {
        try {
            if (!ctx) throw new Error("WebGL 2 context not available");
            
            const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, grid.width/grid.height, 0.1, 1000);
            
            const vertexShader = `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    // Force the plane to fill the entire NDC screen space
                    gl_Position = vec4(position.xy, 0.0, 1.0);
                }
            `;
            
            const fragmentShader = `
                precision highp float;
                out vec4 fragColor;
                
                uniform float u_time;
                uniform vec2 u_resolution;
                
                #define PI 3.14159265359
                #define TAU 6.28318530718
                
                // --- CONSCIOUSNESS TIMELINE ---
                // 0-5s: Onset (Phosphenes, Snow)
                // 5-12s: Chrysanthemum (12-fold Hyperbolic Fold)
                // 12-16s: Breakthrough (Hopf/Zeno Rupture)
                // 16-33s: Peak Complex (Crystal Palace, Entity)
                // 33-40s: Return (Temporal Desync, Fold to Black)
                
                float p_onset(float t) { return 1.0 - smoothstep(2.0, 6.0, t); }
                float p_chrys(float t) { return smoothstep(2.0, 6.0, t) * (1.0 - smoothstep(12.0, 14.0, t)); }
                float p_break(float t) { return smoothstep(11.0, 14.0, t) * (1.0 - smoothstep(15.0, 17.0, t)); }
                float p_peak(float t)  { return smoothstep(14.0, 17.0, t) * (1.0 - smoothstep(32.0, 35.0, t)); }
                float p_ret(float t)   { return smoothstep(33.0, 38.0, t); }
                
                mat2 rot(float a) { float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
                float hash(float n) { return fract(sin(n)*43758.5453); }
                
                // --- STRUCTURAL COLOR & XENOPALETTES ---
                vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
                    return a + b * cos(TAU * (c * t + d));
                }
                
                vec3 dmt_palette(float t) {
                    // Electric cyan, hot magenta, radioactive emerald, cobalt
                    return palette(t, vec3(0.5), vec3(0.5), vec3(1.0, 1.0, 1.0), vec3(0.3, 0.2, 0.8));
                }
                
                vec3 interference(float thickness, float viewAngle) {
                    // Thin-film interference simulation
                    float phase = thickness * 5.0 * viewAngle;
                    return 0.5 + 0.5 * cos(TAU * (phase + vec3(0.0, 0.33, 0.67)));
                }
                
                // --- HYPERDIMENSIONAL GEOMETRY ---
                float mapPalace(vec3 p) {
                    // Holographic boundaries and quasicrystal lattice
                    float tunnel = 4.0 - length(p.xy);
                    
                    // Aperiodic quasicrystal inflation
                    float qc = sin(dot(p, vec3(1.0, 1.618, 0.0))) + 
                               sin(dot(p, vec3(0.0, 1.0, 1.618))) + 
                               sin(dot(p, vec3(1.618, 0.0, 1.0)));
                    tunnel -= qc * 0.8;
                    
                    vec3 q = p;
                    q.z = mod(q.z, 6.0) - 3.0;
                    
                    // Octahedral pillars
                    float pillars = length(abs(q.xy) - 2.5) - 0.4;
                    pillars += sin(p.z * 10.0) * 0.05; // Growth ridges
                    
                    return min(tunnel, pillars);
                }
                
                float mapEntity(vec3 p, float t) {
                    // Autonomous Lenia-like machine elf
                    vec3 q = p;
                    
                    // 4D Stereographic Rotation
                    q.xy *= rot(t * 1.3);
                    q.xz *= rot(t * 0.8);
                    q.yz *= rot(t * 1.1);
                    
                    float r = length(q);
                    float d_sphere = r - 1.5;
                    float d_star = r - 1.5 + 0.6 * sin(5.0 * q.x) * sin(5.0 * q.y) * sin(5.0 * q.z);
                    
                    // Continuous topological morphing
                    float morph = sin(t * 4.0) * 0.5 + 0.5;
                    float d_base = mix(d_sphere, d_star, morph);
                    
                    // Recursive self-transforming folds
                    vec3 f = q;
                    float scale = 1.0;
                    for(int i=0; i<3; i++) {
                        f = abs(f) - 0.6;
                        f.xy *= rot(t * 1.5 + float(i));
                        f.xz *= rot(t * 0.9);
                        f *= 2.0;
                        scale *= 2.0;
                    }
                    float d_fractal = (length(f) - 1.5) / scale;
                    
                    // Frantic temporary appendages (ribbons)
                    vec3 a = p;
                    a.xy *= rot(t * 2.0);
                    float d_ribbon = length(vec2(length(a.xy) - (2.0 + sin(t*6.0)*0.5), a.z)) - 0.15;
                    
                    float d = min(d_base, d_fractal);
                    d = min(d, d_ribbon);
                    
                    // Xenolanguage signal apertures (subtracted voids)
                    float d_holes = length(f) - 0.7;
                    d = max(d, -d_holes / scale);
                    
                    return d * 0.6; // Scale down step size inside heavy folding
                }
                
                vec2 map(vec3 p) {
                    float t_cycle = mod(u_time, 40.0);
                    float prt = p_ret(t_cycle);
                    
                    // Temporal Desync: Time ripples outward spatially during the return phase
                    float local_time = u_time + prt * sin(length(p) * 2.0 - u_time * 5.0) * 1.5;
                    
                    float d_palace = mapPalace(p);
                    vec3 p_ent = p - vec3(0.0, 0.0, 15.0);
                    float d_entity = mapEntity(p_ent, local_time);
                    
                    // Material IDs: 1.0 = Palace, 2.0 = Entity
                    if (d_entity < d_palace) return vec2(d_entity, 2.0);
                    return vec2(d_palace, 1.0);
                }
                
                vec3 getNormal(vec3 p) {
                    vec2 e = vec2(0.01, 0.0);
                    return normalize(vec3(
                        map(p + e.xyy).x - map(p - e.xyy).x,
                        map(p + e.yxy).x - map(p - e.yxy).x,
                        map(p + e.yyx).x - map(p - e.yyx).x
                    ));
                }
                
                // --- MAIN RENDER LOOP ---
                void main() {
                    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
                    float t_cycle = mod(u_time, 40.0);
                    
                    float pon = p_onset(t_cycle);
                    float pch = p_chrys(t_cycle);
                    float pbr = p_break(t_cycle);
                    float ppk = p_peak(t_cycle);
                    float prt = p_ret(t_cycle);
                    
                    // 1. Camera Trajectory
                    vec3 ro = vec3(0.0, 0.0, 0.0);
                    // Sway and breathe
                    ro.xy += vec2(sin(u_time * 0.5), cos(u_time * 0.4)) * 0.5;
                    
                    // Forward plunge
                    ro.z += smoothstep(5.0, 12.0, t_cycle) * 5.0;
                    ro.z += smoothstep(12.0, 16.0, t_cycle) * 6.0;
                    ro.z += smoothstep(33.0, 40.0, t_cycle) * 14.0;
                    
                    // The Hum (Carrier Wave Synchronization)
                    float hum = sin(u_time * 40.0) * 0.005 * (pon + pch + pbr);
                    ro.xy += hum;
                    
                    vec3 rd = normalize(vec3(uv, 1.0 - pon * 0.5)); // Wider FOV at onset
                    rd.xy *= rot(sin(u_time * 0.2) * 0.2);
                    
                    // 2. The Chrysanthemum (12-fold Hyperbolic Gateway)
                    if (pch > 0.0 || pbr > 0.0) {
                        float a = atan(rd.y, rd.x);
                        float r = length(rd.xy);
                        
                        r *= 1.0 + 0.15 * sin(u_time * 4.0) * pch; // Autonomic breathing
                        
                        float sector = TAU / 12.0;
                        float a_fold = mod(a + u_time * 0.2, sector);
                        a_fold = min(a_fold, sector - a_fold);
                        
                        a = mix(a, a_fold, pch);
                        
                        // Hyperbolic outward bulge
                        r = r * (1.0 + r * r * 0.5 * pch);
                        
                        rd.xy = vec2(cos(a), sin(a)) * r;
                        rd = normalize(rd);
                    }
                    
                    // 3. Breakthrough (Hopf Twist & Zeno Thresholds)
                    if (pbr > 0.0) {
                        rd.xy *= rot(length(rd.xy) * 15.0 * pbr - u_time * 2.0);
                        
                        // Infinitely subdividing visual field
                        float zeno = exp2(floor(pbr * 4.0)); // 1, 2, 4, 8, 16
                        if (zeno > 1.0) {
                            rd.xy = (fract(rd.xy * zeno) - 0.5) / zeno;
                        }
                        rd = normalize(rd);
                    }
                    
                    // 4. Volumetric Raymarching
                    float t_dist = 0.0;
                    vec3 p;
                    vec2 res;
                    for(int i = 0; i < 100; i++) {
                        p = ro + rd * t_dist;
                        res = map(p);
                        if(res.x < 0.002 || t_dist > 30.0) break;
                        t_dist += res.x;
                    }
                    
                    vec3 col = vec3(0.0);
                    
                    // 5. Materials & Shading
                    if (t_dist < 30.0) {
                        vec3 n = getNormal(p);
                        vec3 v = -rd;
                        float viewAngle = max(0.0, dot(n, v));
                        
                        vec3 inter = interference(1.5, viewAngle);
                        
                        if (res.y == 1.0) {
                            // Crystal Palace
                            col = dmt_palette(p.z * 0.1 + u_time * 0.2) * inter;
                            float grid = smoothstep(0.95, 1.0, sin(p.x*15.0)*sin(p.y*15.0)*sin(p.z*15.0));
                            col += grid * vec3(0.0, 1.0, 1.0) * 2.0; // Neon web database layer
                            col += vec3(0.1, 0.0, 0.2) * (1.0 - viewAngle); // Velvet depth
                        } else if (res.y == 2.0) {
                            // Machine Elf Entity
                            vec3 chrome = palette(viewAngle + u_time, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
                            col = mix(vec3(0.9), chrome, 0.7) * (viewAngle + 0.2); // Liquid silver
                            
                            // Xenolanguage Semantic Embedded Signals
                            float local_time = u_time + prt * sin(length(p)*2.0 - u_time*5.0)*1.5;
                            float glyphs = smoothstep(0.85, 1.0, 
                                sin(p.x*25.0 + local_time*10.0) * 
                                cos(p.y*25.0 - local_time*5.0) * 
                                sin(p.z*25.0 + local_time*7.0)
                            );
                            col += glyphs * vec3(1.0, 0.0, 0.8) * 4.0; // Hot magenta logic flash
                        }
                        
                        // Abyssal Fog
                        col = mix(col, vec3(0.02, 0.0, 0.05), 1.0 - exp(-0.08 * t_dist));
                    } else {
                        col = vec3(0.02, 0.0, 0.05); // Void state
                    }
                    
                    // 6. Onset / Return (Phosphenes & Retinal Scintillation)
                    float phos_weight = max(pon, prt);
                    if (phos_weight > 0.0) {
                        // Log-polar Klüver form constants
                        vec2 lp = vec2(log(length(uv) + 0.01), atan(uv.y, uv.x));
                        
                        float grid = sin(lp.x * 40.0 - u_time * 4.0) * sin(lp.y * 24.0 + u_time * 2.0);
                        grid = smoothstep(0.8, 1.0, grid);
                        
                        float cobwebs = sin((lp.x + lp.y) * 20.0) * sin((lp.x - lp.y) * 20.0);
                        cobwebs = smoothstep(0.9, 1.0, cobwebs);
                        
                        float snow = hash(uv.x * 113.0 + uv.y * 317.0 + u_time);
                        
                        vec3 phos_col = vec3(0.0, 1.0, 0.8) * grid + vec3(1.0, 0.0, 0.5) * cobwebs + snow * 0.15;
                        col = mix(col, phos_col, phos_weight);
                    }
                    
                    // HDR Tonemapping & Vignette
                    col *= 1.0 - 0.4 * dot(uv, uv);
                    col = 1.0 - exp(-col * 1.5);
                    
                    fragColor = vec4(col, 1.0);
                }
            `;
            
            const material = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: { 
                    u_time: { value: 0 },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
                },
                vertexShader,
                fragmentShader
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
    
    if (material && material.uniforms && material.uniforms.u_time) {
        material.uniforms.u_time.value = time;
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
    
    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);
}
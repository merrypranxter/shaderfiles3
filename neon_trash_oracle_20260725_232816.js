export default function NeonTrashOracleWeatherSystem(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    if (!canvas.__three) {
        try {
            if (!ctx) throw new Error("WebGL 2 context not available");

            const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
            camera.position.z = 1;

            const material = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: {
                    u_time: { value: 0 },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                    u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
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
                    uniform vec2 u_mouse;

                    // === SHARED UTILS ===
                    // (from voronoi_systems, damage_aesthetics)
                    vec2 hash22(vec2 p) {
                        vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
                        p3 += dot(p3, p3.yzx + 33.33);
                        return fract((p3.xx + p3.yz) * p3.zy);
                    }
                    float hash12(vec2 p) {
                        vec3 p3  = fract(vec3(p.xyx) * 0.1031);
                        p3 += dot(p3, p3.yzx + 33.33);
                        return fract((p3.x + p3.y) * p3.z);
                    }
                    mat2 rot(float a) {
                        float s = sin(a), c = cos(a);
                        return mat2(c, -s, s, c);
                    }

                    // === OKLAB COLOR MIXING ===
                    // (from mesh_gradients, color_systems)
                    vec3 oklab_to_srgb(vec3 lab) {
                        float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
                        float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
                        float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
                        float l = l_*l_*l_;
                        float m = m_*m_*m_;
                        float s = s_*s_*s_;
                        return vec3(
                            4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
                        );
                    }
                    vec3 srgb_to_oklab(vec3 c) {
                        float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
                        float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
                        float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
                        return vec3(
                            0.2104542553 * pow(l,0.33333) + 0.7936177850 * pow(m,0.33333) - 0.0040720468 * pow(s,0.33333),
                            1.9779984951 * pow(l,0.33333) - 2.4285922050 * pow(m,0.33333) + 0.4505937099 * pow(s,0.33333),
                            0.0259040371 * pow(l,0.33333) + 0.7827717662 * pow(m,0.33333) - 0.8086757660 * pow(s,0.33333)
                        );
                    }

                    // === SPECTRAL COLOR ===
                    // (from metamerism, opal_play_of_color)
                    vec3 spectral(float w) {
                        float r = smoothstep(0.5, 0.0, w);
                        float g = 1.0 - abs(w - 0.5)*2.0;
                        float b = smoothstep(0.5, 1.0, w);
                        return clamp(vec3(r,g,b)*1.2, 0.0, 1.0);
                    }

                    // === SABATTIER & S-CURVE ===
                    // (from solarization, cross_processing)
                    float sabattier(float x, float t, float strength) {
                        if (x < t) return x;
                        float over = (x - t) / max(1.0 - t, 1e-4);
                        float folded = t * (1.0 - over);
                        return mix(x, folded, strength);
                    }
                    vec3 sCurve(vec3 c, float contrast, float pivot) {
                        vec3 k = vec3(max(0.01, contrast));
                        vec3 a = 1.0 / (1.0 + exp(-k * (c - pivot)));
                        vec3 lo = 1.0 / (1.0 + exp(-k * (0.0 - pivot)));
                        vec3 hi = 1.0 / (1.0 + exp(-k * (1.0 - pivot)));
                        return (a - lo) / (hi - lo);
                    }

                    // === ENGINES ===

                    // 1. Mesh Gradient Background (IDW with OKLab)
                    vec3 meshGradient(vec2 uv, float t) {
                        vec3 c1 = vec3(1.0, 0.0, 0.4); // Hot Pink
                        vec3 c2 = vec3(0.0, 0.88, 1.0); // Cyan
                        vec3 c3 = vec3(0.66, 1.0, 0.0); // Acid Green
                        vec3 c4 = vec3(1.0, 0.48, 0.0); // Orange
                        vec3 c5 = vec3(0.6, 0.36, 0.9); // Violet
                        
                        vec2 p1 = vec2(0.2+0.3*sin(t*0.7), 0.2+0.3*cos(t*0.5));
                        vec2 p2 = vec2(0.8+0.3*cos(t*0.6), 0.8+0.3*sin(t*0.8));
                        vec2 p3 = vec2(0.8+0.3*sin(t*0.9), 0.2+0.3*cos(t*0.4));
                        vec2 p4 = vec2(0.2+0.3*cos(t*0.5), 0.8+0.3*sin(t*0.7));
                        vec2 p5 = u_mouse; // Saccadic pointer integration
                        
                        float p = 1.8; // IDW power
                        float w1 = 1.0 / pow(length(uv - p1) + 0.01, p);
                        float w2 = 1.0 / pow(length(uv - p2) + 0.01, p);
                        float w3 = 1.0 / pow(length(uv - p3) + 0.01, p);
                        float w4 = 1.0 / pow(length(uv - p4) + 0.01, p);
                        float w5 = 1.0 / pow(length(uv - p5) + 0.01, p);
                        
                        vec3 lab = (srgb_to_oklab(c1)*w1 + 
                                    srgb_to_oklab(c2)*w2 + 
                                    srgb_to_oklab(c3)*w3 + 
                                    srgb_to_oklab(c4)*w4 + 
                                    srgb_to_oklab(c5)*w5) / (w1+w2+w3+w4+w5);
                        return oklab_to_srgb(lab);
                    }

                    // 2. Voronoi / Plateau Foam (from plateau_foam & voronoi_systems)
                    vec3 voronoi(vec2 x, float t) {
                        vec2 n = floor(x);
                        vec2 f = fract(x);
                        float m_dist = 8.0;
                        float m_dist2 = 8.0;
                        vec2 m_id;
                        for(int j=-1; j<=1; j++) {
                            for(int i=-1; i<=1; i++) {
                                vec2 g = vec2(float(i),float(j));
                                vec2 o = hash22(n + g);
                                o = 0.5 + 0.5*sin(t + 6.2831*o);
                                vec2 r = g + o - f;
                                float d = dot(r,r);
                                if(d < m_dist) {
                                    m_dist2 = m_dist;
                                    m_dist = d;
                                    m_id = n + g;
                                } else if(d < m_dist2) {
                                    m_dist2 = d;
                                }
                            }
                        }
                        return vec3(sqrt(m_dist), m_dist2 - m_dist, hash12(m_id));
                    }

                    // 3. Quasicrystal / Abelian Sandpile Identity
                    float quasicrystal(vec2 uv, float t) {
                        float v = 0.0;
                        const int N = 7;
                        for(int i=0; i<N; i++) {
                            float a = float(i) * 3.14159 / float(N) + t*0.05;
                            vec2 d = vec2(cos(a), sin(a));
                            v += cos(dot(uv, d) * 15.0);
                        }
                        return v / float(N);
                    }

                    // 4. Moiré Halos (from moire)
                    float moireHalo(vec2 uv, float t) {
                        float s1 = sin(length(uv)*80.0 - t*4.0);
                        float s2 = sin(length(uv - vec2(0.05*sin(t), 0.05*cos(t)))*82.0 + t*2.5);
                        return smoothstep(0.0, 1.0, s1 * s2);
                    }

                    // 5. SDF Oracle Core (from dream_physics_textbook Glyphs)
                    float sdHexagram( vec2 p, float r ) {
                        const vec4 k = vec4(-0.5,0.8660254038,0.5773502692,1.7320508076);
                        p = abs(p);
                        p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
                        p -= 2.0*min(dot(k.yx,p),0.0)*k.yx;
                        p -= vec2(clamp(p.x,r*k.z,r*k.w),r);
                        return length(p)*sign(p.y);
                    }

                    // 6. Lenia Organism Sparks (from lenia)
                    float leniaSpark(vec2 uv, vec2 center, float t, float phase) {
                        float d = length(uv - center);
                        float pulse = 0.5 + 0.5*sin(t*5.0 + phase);
                        float core = exp(-d*d*3000.0);
                        float halo = exp(-d*d*300.0) * pulse;
                        return core + halo*0.8;
                    }

                    void main() {
                        vec2 uv = vUv;
                        vec2 p = (uv - 0.5) * 2.0;
                        p.x *= u_resolution.x / u_resolution.y;
                        
                        float t = u_time * 0.4;
                        
                        // Saccadic / Strange Attractor mouse warp
                        vec2 m = (u_mouse - 0.5) * 2.0;
                        m.x *= u_resolution.x / u_resolution.y;
                        vec2 p_to_m = p - m + 1e-5; // Prevent NaN
                        float m_dist = length(p_to_m);
                        vec2 warp = normalize(p_to_m) * exp(-m_dist*m_dist*4.0) * 0.3 * sin(t*2.0);
                        
                        // Hyperbolic tunnel warp overlay
                        float r = length(p);
                        float theta = atan(p.y, p.x);
                        vec2 tunnel_warp = vec2(cos(theta), sin(theta)) / (r + 0.5) * 0.05 * sin(t);
                        
                        p += warp + tunnel_warp;
                        uv += warp * 0.1 + tunnel_warp * 0.05;
                        
                        // --- LAYER 1: Background Mesh Gradient ---
                        vec3 col = meshGradient(uv, t);
                        
                        // --- LAYER 2: Moiré Interference ---
                        float m_val = moireHalo(p, t);
                        col += vec3(m_val * 0.15);
                        
                        // --- LAYER 3: Cellular Slime Territories (Voronoi + Plateau) ---
                        vec2 v_uv = p * 2.5 + vec2(t*0.2) + warp*2.0;
                        vec3 v = voronoi(v_uv, t);
                        float plateau_border = 1.0 - smoothstep(0.0, 0.08, v.y);
                        vec3 domainColor = spectral(fract(v.z * 3.0 + t*0.2));
                        
                        col = mix(col, domainColor, plateau_border * 0.8);
                        col += domainColor * exp(-v.x*v.x*10.0) * 0.4; // Core glow
                        
                        // --- LAYER 4: Oracle Core (Center) ---
                        float qc = quasicrystal(p, t);
                        vec2 p_hex = p * rot(t * 0.5);
                        
                        // Chromatic Aberration on the core SDF
                        float r_dist = sdHexagram(p_hex + vec2(0.02*sin(t*2.0), 0.0), 0.6 + 0.05*qc);
                        float g_dist = sdHexagram(p_hex, 0.6 + 0.05*qc);
                        float b_dist = sdHexagram(p_hex - vec2(0.02*sin(t*2.0), 0.0), 0.6 + 0.05*qc);
                        
                        vec3 coreLines = vec3(
                            smoothstep(0.03, 0.0, abs(r_dist)),
                            smoothstep(0.03, 0.0, abs(g_dist)),
                            smoothstep(0.03, 0.0, abs(b_dist))
                        );
                        
                        float coreGlow = exp(-abs(g_dist) * 8.0);
                        col += coreLines * 2.5;
                        col += coreGlow * vec3(1.0, 0.2, 0.6) * 0.9;
                        
                        // --- LAYER 5: Glitch Data Ticker & Damage Aesthetics ---
                        float tear = step(0.99, hash12(vec2(floor(uv.y * 40.0), floor(t * 15.0))));
                        col.r += tear * 0.8;
                        col.b -= tear * 0.5;
                        
                        float ticker = step(0.95, sin(uv.y * 80.0 + t * 20.0)) * step(0.5, sin(uv.x * 200.0 - t * 30.0));
                        col += vec3(1.0, 0.8, 0.0) * ticker * 0.3;
                        
                        float scanline = step(0.8, sin(uv.y * 150.0 - t*10.0));
                        col += vec3(0.0, 1.0, 0.5) * scanline * 0.08;
                        
                        // --- LAYER 6: Lenia Sparks (Foreground Motifs) ---
                        vec3 sparksCol = vec3(0.0);
                        for(int i=0; i<8; i++) {
                            vec2 sp_uv = vec2(hash12(vec2(float(i),1.0)), hash12(vec2(float(i),2.0))) * 2.0 - 1.0;
                            sp_uv.x *= u_resolution.x / u_resolution.y;
                            sp_uv += vec2(sin(t*0.8+float(i)), cos(t*1.1+float(i))) * 0.6;
                            float spark = leniaSpark(p, sp_uv, t, float(i)*1.618);
                            sparksCol += spark * spectral(fract(float(i)*0.15 + t*0.1));
                        }
                        col += sparksCol * 1.5;
                        
                        // --- POST FINISHER ---
                        // Solarization / Sabattier Effect
                        float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
                        float sab = sabattier(luma, 0.8, 0.5);
                        col = mix(col, col * (sab / max(luma, 1e-4)), 0.5);
                        
                        // Cross Processing S-Curve
                        col = sCurve(col, 2.5, 0.4);
                        
                        // Impossible Colors / Hyperbolic Push
                        col = mix(vec3(luma), col, 1.3);
                        
                        // CRT Phosphor Mask
                        float triad = mod(gl_FragCoord.x, 3.0);
                        vec3 mask = vec3(
                            smoothstep(1.0, 0.0, abs(triad - 0.5)),
                            smoothstep(1.0, 0.0, abs(triad - 1.5)),
                            smoothstep(1.0, 0.0, abs(triad - 2.5))
                        );
                        col *= mix(vec3(1.0), mask, 0.2); 
                        
                        // Vignette
                        float vig = length(vUv - 0.5);
                        col *= smoothstep(0.8, 0.25, vig);
                        
                        fragColor = vec4(max(col, 0.0), 1.0);
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
        if (material.uniforms.u_time) {
            material.uniforms.u_time.value = time;
        }
        if (material.uniforms.u_resolution) {
            material.uniforms.u_resolution.value.set(grid.width, grid.height);
        }
        if (material.uniforms.u_mouse) {
            if (mouse.isPressed) {
                material.uniforms.u_mouse.value.set(
                    mouse.x / grid.width,
                    1.0 - (mouse.y / grid.height)
                );
            } else {
                // Idle wander for mouse when not pressed
                material.uniforms.u_mouse.value.set(
                    0.5 + 0.3 * Math.sin(time * 0.7),
                    0.5 + 0.3 * Math.cos(time * 0.5)
                );
            }
        }
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);
}
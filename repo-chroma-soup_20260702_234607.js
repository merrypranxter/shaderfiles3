export default function(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    if (!canvas.__three) {
        try {
            if (!ctx) throw new Error("WebGL 2 context not available");
            
            const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
            const scene = new THREE.Scene();
            const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            
            const vertexShader = `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position.xy, 0.0, 1.0);
                }
            `;
            
            const fragmentShader = `
                in vec2 vUv;
                out vec4 fragColor;
                uniform float u_time;
                uniform vec2 u_resolution;
                
                #define PI 3.14159265359
                
                // [XOR-Ghost Manifold & Cryptographic Hash]
                vec2 hash2(vec2 p) {
                    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
                    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
                }

                // [Manifold Swarms & Divergence-free Noise]
                float noise(vec2 p) {
                    const float K1 = 0.366025404; 
                    const float K2 = 0.211324865; 
                    vec2 i = floor(p + (p.x + p.y) * K1);
                    vec2 a = p - i + (i.x + i.y) * K2;
                    vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                    vec2 b = a - o + K2;
                    vec2 c = a - 1.0 + 2.0 * K2;
                    vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
                    vec3 n = h * h * h * h * vec3(dot(a, hash2(i)), dot(b, hash2(i + o)), dot(c, hash2(i + 1.0)));
                    return dot(n, vec3(70.0));
                }

                // [Mycelial Networks & Vascular Branching]
                vec2 flowField(vec2 p, float t) {
                    float n1 = noise(p * 1.5 + t * 0.2);
                    float n2 = noise(p * 1.5 - t * 0.15 + vec2(13.3, 4.1));
                    return vec2(n1, n2);
                }

                // [Quasicrystals & Chladni Vibration]
                float quasicrystal(vec2 p, float t) {
                    float sum = 0.0;
                    for(float i = 0.0; i < 5.0; i++) {
                        float theta = i * PI / 5.0; 
                        vec2 dir = vec2(cos(theta), sin(theta));
                        // Aperiodic Moiré interference
                        sum += abs(cos(dot(p, dir) * 6.0 + t)) * sin(dot(p, vec2(-dir.y, dir.x)) * 2.5 - t * 0.5);
                    }
                    return sum;
                }

                // [Plateau Foam & Lenia Cellular Automata]
                vec3 foamLenia(vec2 p, float t) {
                    vec2 n = floor(p);
                    vec2 f = fract(p);
                    float d1 = 1e9, d2 = 1e9;
                    vec2 cell = vec2(0.0);
                    
                    for(int j = -1; j <= 1; j++) {
                        for(int i = -1; i <= 1; i++) {
                            vec2 g = vec2(float(i), float(j));
                            vec2 o = hash2(n + g) * 0.5 + 0.5;
                            // Organic pulsing of cell centers
                            o = 0.5 + 0.5 * sin(t + 6.2831 * o);
                            vec2 r = g + o - f;
                            float d = dot(r, r);
                            if(d < d1) {
                                d2 = d1;
                                d1 = d;
                                cell = n + g;
                            } else if(d < d2) {
                                d2 = d;
                            }
                        }
                    }
                    float border = sqrt(d2) - sqrt(d1);
                    // Lenia continuous growth function ring
                    float lenia = 2.0 * exp(-pow(border - 0.18, 2.0) / 0.008) - 1.0;
                    return vec3(border, lenia, fract(sin(dot(cell, vec2(1.2, 3.4))) * 43758.5));
                }

                // [Color Systems & OKLab Interpolation]
                vec3 oklab_to_srgb(vec3 lab) {
                    float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
                    float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
                    float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
                    float l = l_ * l_ * l_;
                    float m = m_ * m_ * m_;
                    float s = s_ * s_ * s_;
                    return vec3(
                         4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
                    );
                }

                // [Metamerism & Spectral Color] Maximalist Candy-Acid Palette
                vec3 getPalette(float v, float phase) {
                    float L = 0.7 + 0.2 * sin(v * PI * 2.0); 
                    float a = 0.45 * cos(v * PI * 2.0 + phase); 
                    float b = 0.45 * sin(v * PI * 2.0 - phase); 
                    return clamp(oklab_to_srgb(vec3(L, a, b)), 0.0, 1.0);
                }

                void main() {
                    vec2 uv = vUv;
                    vec2 p = (uv - 0.5) * 2.0;
                    p.x *= u_resolution.x / u_resolution.y;
                    
                    float t = u_time * 0.35;
                    
                    // [Datamosh & Abelian Sandpile] Quantization & Glitch Bleed
                    float mosh = noise(p * 2.5 + t);
                    vec2 p_mosh = p;
                    if (mosh > 0.65) {
                        float bs = 0.04 + 0.08 * fract(mosh * 13.0);
                        p_mosh = floor(p / bs) * bs;
                    }
                    
                    // [Reaction Diffusion] Fluid domain warp
                    vec2 flow = flowField(p_mosh * 2.0, t);
                    vec2 pw = p_mosh + flow * 0.4;
                    
                    float qc = quasicrystal(pw * 2.5, t);
                    
                    // [Plateau Foam & Lenia]
                    vec3 fm = foamLenia(pw * 3.5 + qc * 0.12, t);
                    
                    // [Chromatic Aberration & Chromostereopsis]
                    // Stronger CA on cell boundaries to simulate purple fringing
                    float ca = 0.06 * (1.0 - fm.x); 
                    
                    float qc_r = quasicrystal(pw + vec2(ca, 0.0), t * 1.1);
                    float qc_g = quasicrystal(pw, t * 1.1);
                    float qc_b = quasicrystal(pw - vec2(ca, 0.0), t * 1.1);
                    
                    // Blend motifs: Quasicrystal texture + Lenia rings + Voronoi seed
                    float mix_r = fract(qc_r * 0.08 + fm.y * 0.4 + fm.z);
                    float mix_g = fract(qc_g * 0.08 + fm.y * 0.4 + fm.z + 0.15);
                    float mix_b = fract(qc_b * 0.08 + fm.y * 0.4 + fm.z + 0.30);
                    
                    vec3 col_r = getPalette(mix_r, 0.0);
                    vec3 col_g = getPalette(mix_g, 2.0);
                    vec3 col_b = getPalette(mix_b, 4.0);
                    
                    vec3 color = vec3(col_r.r, col_g.g, col_b.b);
                    
                    // [Cross Processing] Non-linear S-Curve
                    color = pow(color, vec3(1.3, 0.85, 1.5)); 
                    
                    // [Acoustic Impedance Speckle]
                    color += noise(p * 60.0 - t * 10.0) * 0.08;
                    
                    // [CRT Phosphor FX] Scanlines & Mask Triads
                    float scanline = mod(gl_FragCoord.y, 2.0) < 1.0 ? 0.85 : 1.0;
                    float triad = mod(gl_FragCoord.x, 3.0);
                    vec3 mask = vec3(
                        triad < 1.0 ? 1.0 : 0.0,
                        triad >= 1.0 && triad < 2.0 ? 1.0 : 0.0,
                        triad >= 2.0 ? 1.0 : 0.0
                    );
                    mask = mix(vec3(1.0), mask, 0.3);
                    color *= scanline * mask;
                    
                    // [Bloom / Halation]
                    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
                    color += color * smoothstep(0.4, 0.9, luma) * 0.7;
                    
                    // White-hot highlights
                    float hot = smoothstep(0.85, 1.0, luma);
                    color += vec3(hot * 0.9);
                    
                    // [Barrel Geometry] Tube vignette
                    float r2 = dot(uv - 0.5, uv - 0.5);
                    color *= 1.0 - r2 * 1.8;
                    
                    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
                }
            `;
            
            const material = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: { 
                    u_time: { value: 0 },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
                },
                vertexShader,
                fragmentShader,
                depthWrite: false,
                depthTest: false
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
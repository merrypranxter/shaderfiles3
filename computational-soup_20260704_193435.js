const initArt = (ctx, grid, time, repos, input, mouse, canvas, THREE) => {
    if (!canvas.__three) {
        try {
            if (!ctx) throw new Error("WebGL2 context not available");

            const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.autoClear = false;

            const scene = new THREE.Scene();
            const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

            const width = grid.width;
            const height = grid.height;

            const rtOptions = {
                type: THREE.HalfFloatType,
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                wrapS: THREE.ClampToEdgeWrapping,
                wrapT: THREE.ClampToEdgeWrapping,
                depthBuffer: false,
                stencilBuffer: false
            };

            const rtA = new THREE.WebGLRenderTarget(width, height, rtOptions);
            const rtB = new THREE.WebGLRenderTarget(width, height, rtOptions);

            const vertexShader = `
                in vec3 position;
                in vec2 uv;
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `;

            const simFragmentShader = `
                in vec2 vUv;
                out vec4 fragColor;

                uniform sampler2D u_prev;
                uniform vec2 u_res;
                uniform float u_time;
                uniform vec2 u_mouse;

                // --- Hash & Noise (Vibration / Acoustic Speckle) ---
                vec2 hash22(vec2 p) {
                    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
                    p3 += dot(p3, p3.yzx + 33.33);
                    return fract((p3.xx + p3.yz) * p3.zy);
                }

                float hash21(vec2 p) {
                    vec3 p3  = fract(vec3(p.xyx) * 0.1031);
                    p3 += dot(p3, p3.yzx + 33.33);
                    return fract((p3.x + p3.y) * p3.z);
                }

                // --- Lenia / Plateau Foam Core ---
                float foam(vec2 p, float t) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    float d1 = 1.0;
                    float d2 = 1.0;
                    for(int y = -1; y <= 1; y++) {
                        for(int x = -1; x <= 1; x++) {
                            vec2 neighbor = vec2(x, y);
                            vec2 h = hash22(i + neighbor);
                            // Temporal desync & phase drift
                            vec2 point = neighbor + 0.5 + 0.4 * sin(t * 0.5 + 6.2831 * h) - f;
                            float d = length(point);
                            if(d < d1) { d2 = d1; d1 = d; }
                            else if(d < d2) { d2 = d; }
                        }
                    }
                    // Plateau border emphasis (thickness)
                    float border = d2 - d1;
                    // Lenia growth ring
                    float ring = exp(-pow(d1 - 0.35, 2.0) / 0.02);
                    return border * 0.7 + ring * 0.5;
                }

                // --- Moire / Chladni Standing Waves ---
                float chladni(vec2 p, float t) {
                    float w1 = sin(p.x * 12.0 + t) * cos(p.y * 12.0 - t);
                    float w2 = sin(p.x * 8.0 - t * 1.5 + p.y * 8.0);
                    return (w1 + w2) * 0.5;
                }

                void main() {
                    vec2 texel = 1.0 / u_res;
                    
                    // --- Causal Inversion / Temporal Buffer Read ---
                    // Read neighborhood to calculate gradient (Acoustic Impedance)
                    vec4 n = texture(u_prev, vUv + vec2(0.0, texel.y));
                    vec4 s = texture(u_prev, vUv - vec2(0.0, texel.y));
                    vec4 e = texture(u_prev, vUv + vec2(texel.x, 0.0));
                    vec4 w = texture(u_prev, vUv - vec2(texel.x, 0.0));
                    vec4 c = texture(u_prev, vUv);

                    vec2 grad = vec2(e.r - w.r, n.r - s.r);
                    
                    // Retrocausal flow: advect backwards along gradient
                    vec2 flow = -grad * 1.5 * texel;
                    
                    // Mouse interaction (Predictive Ghost Lead)
                    vec2 mDir = vUv - u_mouse;
                    float mDist = length(mDir);
                    flow += normalize(mDir + 0.001) * exp(-mDist * 10.0) * 0.01;

                    // --- Cauchy Dispersion (Prism) ---
                    // Sample R, G, B at slightly different offsets (different IORs)
                    float r = texture(u_prev, vUv + flow * 1.0).r;
                    float g = texture(u_prev, vUv + flow * 1.05).g;
                    float b = texture(u_prev, vUv + flow * 1.1).b;

                    // --- Wet Engine / Cellular Generation ---
                    vec2 p = vUv * vec2(u_res.x/u_res.y, 1.0) * 4.0;
                    float f = foam(p - flow * 50.0, u_time);
                    float ch = chladni(p * 2.0, u_time * 0.5);
                    
                    // Reaction-Diffusion / Sandpile accumulation
                    float growth = f + ch * 0.3;
                    float laplacian = (n.a + s.a + e.a + w.a - 4.0 * c.a);
                    
                    // New state calculation
                    float newR = mix(r, growth, 0.05);
                    float newG = mix(g, growth, 0.05);
                    float newB = mix(b, growth, 0.05);
                    
                    // Alpha stores 'stress' or 'retardance' accumulating over time
                    float stress = c.a + (growth - 0.5) * 0.1 + laplacian * 0.5;
                    // Decay / Abelian topple limit
                    stress = mod(stress, 1.0); 

                    // Glitch Prophet: Forbidden Math injection (NaN prevention via clamp, but pushing extremes)
                    float instability = 0.001 / (abs(grad.x * grad.y) + 0.001);
                    stress += instability * 0.005;

                    fragColor = vec4(newR, newG, newB, clamp(stress, 0.0, 1.0));
                }
            `;

            const displayFragmentShader = `
                in vec2 vUv;
                out vec4 fragColor;

                uniform sampler2D u_sim;
                uniform vec2 u_res;
                uniform float u_time;

                // --- Color Systems: OKLCh to sRGB ---
                vec3 oklch_to_oklab(float L, float C, float h) {
                    return vec3(L, C * cos(h), C * sin(h));
                }

                vec3 oklab_to_srgb(vec3 c) {
                    float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
                    float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
                    float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;

                    float l = l_*l_*l_;
                    float m = m_*m_*m_;
                    float s = s_*s_*s_;

                    vec3 rgb = vec3(
                         4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
                    );

                    // sRGB gamma
                    vec3 srgb;
                    srgb.r = rgb.r <= 0.0031308 ? 12.92 * rgb.r : 1.055 * pow(max(rgb.r, 0.0), 1.0/2.4) - 0.055;
                    srgb.g = rgb.g <= 0.0031308 ? 12.92 * rgb.g : 1.055 * pow(max(rgb.g, 0.0), 1.0/2.4) - 0.055;
                    srgb.b = rgb.b <= 0.0031308 ? 12.92 * rgb.b : 1.055 * pow(max(rgb.b, 0.0), 1.0/2.4) - 0.055;
                    return srgb;
                }

                // --- Shoegaze / Acoustic Speckle ---
                float hash21(vec2 p) {
                    vec3 p3  = fract(vec3(p.xyx) * 0.1031);
                    p3 += dot(p3, p3.yzx + 33.33);
                    return fract((p3.x + p3.y) * p3.z);
                }

                void main() {
                    vec4 sim = texture(u_sim, vUv);
                    
                    // Calculate structural gradient for iridescence / Birefringence
                    vec2 texel = 1.0 / u_res;
                    float n = texture(u_sim, vUv + vec2(0.0, texel.y)).a;
                    float s = texture(u_sim, vUv - vec2(0.0, texel.y)).a;
                    float e = texture(u_sim, vUv + vec2(texel.x, 0.0)).a;
                    float w = texture(u_sim, vUv - vec2(texel.x, 0.0)).a;
                    float gradMag = length(vec2(e-w, n-s));

                    // --- Michel-Lévy Interference / Math Palettes ---
                    // Map stress (sim.a) and structure (sim.r) to Golden Angle OKLCh
                    float stress = sim.a;
                    float structural = sim.r;
                    
                    // Golden angle base = 2.39996 rad
                    float hueAngle = stress * 12.0 + structural * 6.0 - u_time * 0.5;
                    
                    // Candy-Acid Palette: High Lightness, High Chroma
                    // Push chroma to hyperbolic limits (Impossible Colors)
                    float L = 0.65 + 0.25 * sin(stress * 3.1415 + u_time);
                    float C = 0.2 + 0.15 * cos(gradMag * 50.0);
                    
                    // Iridescent edge highlights
                    L += gradMag * 2.0;
                    C += gradMag * 1.5;

                    vec3 oklab = oklch_to_oklab(L, C, hueAngle);
                    vec3 col = oklab_to_srgb(oklab);

                    // --- Shoegaze Haze & Bloom ---
                    // Sample neighborhood for bloom
                    vec3 bloom = vec3(0.0);
                    float wSum = 0.0;
                    for(int i=-2; i<=2; i++){
                        for(int j=-2; j<=2; j++){
                            vec2 off = vec2(i,j) * texel * 2.0;
                            float w = exp(-float(i*i+j*j)/8.0);
                            vec4 sTex = texture(u_sim, vUv + off);
                            float sHue = sTex.a * 12.0 + sTex.r * 6.0 - u_time * 0.5;
                            vec3 sCol = oklab_to_srgb(oklch_to_oklab(0.7, 0.2, sHue));
                            bloom += sCol * w;
                            wSum += w;
                        }
                    }
                    bloom /= wSum;
                    
                    // Mix base and bloom
                    col = mix(col, bloom, 0.6);

                    // Acoustic speckle / Film grain
                    float grain = hash21(vUv * u_time) - 0.5;
                    col += grain * 0.08;

                    // Vignette
                    vec2 cv = vUv - 0.5;
                    col *= 1.0 - 0.6 * dot(cv, cv);

                    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
                }
            `;

            const simMat = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                vertexShader: vertexShader,
                fragmentShader: simFragmentShader,
                uniforms: {
                    u_prev: { value: null },
                    u_res: { value: new THREE.Vector2(width, height) },
                    u_time: { value: 0 },
                    u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
                },
                depthWrite: false,
                depthTest: false
            });

            const displayMat = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                vertexShader: vertexShader,
                fragmentShader: displayFragmentShader,
                uniforms: {
                    u_sim: { value: null },
                    u_res: { value: new THREE.Vector2(width, height) },
                    u_time: { value: 0 }
                },
                depthWrite: false,
                depthTest: false
            });

            const geometry = new THREE.BufferGeometry();
            const vertices = new Float32Array([
                -1, -1, 0,  3, -1, 0,  -1, 3, 0
            ]);
            const uvs = new Float32Array([
                0, 0,  2, 0,  0, 2
            ]);
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

            const mesh = new THREE.Mesh(geometry, simMat);
            scene.add(mesh);

            canvas.__three = {
                renderer, scene, camera, mesh, simMat, displayMat, rtA, rtB, currentRT: 0
            };

            // Seed initial state
            renderer.setRenderTarget(rtA);
            renderer.clear();
            renderer.setRenderTarget(rtB);
            renderer.clear();

        } catch (e) {
            console.error("WebGL Initialization Failed:", e);
            throw e;
        }
    }

    const t = canvas.__three;
    if (!t) return;

    const { renderer, scene, camera, mesh, simMat, displayMat, rtA, rtB } = t;

    // Handle Resize
    if (rtA.width !== grid.width || rtA.height !== grid.height) {
        rtA.setSize(grid.width, grid.height);
        rtB.setSize(grid.width, grid.height);
        simMat.uniforms.u_res.value.set(grid.width, grid.height);
        displayMat.uniforms.u_res.value.set(grid.width, grid.height);
    }

    // Update Uniforms
    simMat.uniforms.u_time.value = time;
    displayMat.uniforms.u_time.value = time;
    
    // Normalize mouse
    const mx = mouse.x / grid.width;
    const my = 1.0 - (mouse.y / grid.height);
    simMat.uniforms.u_mouse.value.set(mx, my);

    // Ping-Pong Simulation Pass
    const readRT = t.currentRT === 0 ? rtA : rtB;
    const writeRT = t.currentRT === 0 ? rtB : rtA;

    mesh.material = simMat;
    simMat.uniforms.u_prev.value = readRT.texture;
    
    renderer.setRenderTarget(writeRT);
    renderer.render(scene, camera);

    // Display Pass
    mesh.material = displayMat;
    displayMat.uniforms.u_sim.value = writeRT.texture;
    
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);

    // Swap
    t.currentRT = 1 - t.currentRT;
};

return initArt;
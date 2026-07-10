// NEON TRASH ORACLE WEATHER SYSTEM
// A maximalist living interface from a cheerful broken dimension.
// 
// REPO INGREDIENTS:
// - domain_coloring & apollonian_gasket: Center 5-fold rosette oracle core & Möbius conformal warp
// - dream_physics & astral-os: Kairotempic strange-attractor flow fields & mnemonic gravity
// - plateau_foam & opal: Voronoi slime weather territories with cyan/magenta Plateau borders
// - birefringence & acoustic_impedance: Quasicrystal moiré interference patterns
// - tesselations & astral-os: SDF glyphs/sigils orbiting the field
// - false_color & abelian_sandpile: Scraped-data glitch ticker bands and avalanche rain
// - afterimage_painter: Saturated candy-acid palette with hot white bloom

export function render(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    if (!canvas.__three) {
        try {
            if (!ctx) throw new Error("WebGL 2 context not available");

            // Initialize THREE.js with the provided WebGL2 context
            const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
            camera.position.z = 5;
            
            // Trivial pass-through vertex shader
            const vertexShader = `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `;
            
            // The Maximalist Oracle Fragment Shader
            const fragmentShader = `
                #version 300 es
                precision highp float;

                in vec2 vUv;
                out vec4 fragColor;

                uniform float u_time;
                uniform vec2 u_resolution;
                uniform vec2 u_mouse;

                #define PI 3.14159265359
                #define TAU 6.28318530718

                // ---- COMPLEX MATH (domain_coloring, apollonian_gasket) ----
                vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
                vec2 cdiv(vec2 a, vec2 b) { float d = dot(b,b)+1e-8; return vec2(dot(a,b), a.y*b.x - a.x*b.y)/d; }
                vec2 cpow(vec2 z, float n) { float r=length(z); float th=atan(z.y, z.x); return pow(r,n)*vec2(cos(n*th), sin(n*th)); }

                // ---- HASH & NOISE ----
                float hash12(vec2 p) {
                    p = fract(p * vec2(123.34, 456.21));
                    p += dot(p, p + 45.32);
                    return fract(p.x * p.y);
                }
                vec2 hash22(vec2 p) {
                    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
                    p3 += dot(p3, p3.yzx+33.33);
                    return fract((p3.xx+p3.yz)*p3.zy);
                }
                float noise(vec2 p) {
                    vec2 i = floor(p), f = fract(p);
                    vec2 u = f*f*(3.0-2.0*f);
                    return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x),
                               mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y);
                }
                float fbm(vec2 p) {
                    float v = 0.0, a = 0.5;
                    for(int i=0; i<5; i++) { v += a*noise(p); p *= 2.0; a *= 0.5; }
                    return v;
                }

                // ---- PALETTES (afterimage_painter, false_color, birefringence) ----
                vec3 candyAcid(float t) {
                    vec3 col = 0.5 + 0.5 * cos(TAU * (t + vec3(0.0, 0.15, 0.35)));
                    col = smoothstep(0.1, 0.9, col); 
                    col += vec3(1.0, 0.0, 0.6) * pow(sin(TAU * t * 2.0) * 0.5 + 0.5, 4.0); // Hot pink
                    col += vec3(0.2, 1.0, 0.0) * pow(cos(TAU * t * 3.0) * 0.5 + 0.5, 4.0); // Acid green
                    col += vec3(0.0, 0.8, 1.0) * pow(sin(TAU * t * 5.0) * 0.5 + 0.5, 4.0); // Electric blue
                    return col;
                }

                // ---- SDFs & GEOMETRY (astral-os, dream_physics) ----
                float sdGlyph(vec2 p) {
                    p = abs(p) - 0.15;
                    float d1 = length(p - clamp(p, -0.05, 0.05)) - 0.01;
                    float d2 = abs(length(p) - 0.08) - 0.005;
                    return min(d1, d2);
                }

                // Plateau Foam / Opal Voronoi domains
                vec3 voronoi(vec2 x, float t) {
                    vec2 n = floor(x), f = fract(x), mr;
                    float md = 8.0, m = 0.0;
                    for(int j=-1; j<=1; j++)
                    for(int i=-1; i<=1; i++) {
                        vec2 g = vec2(float(i), float(j));
                        vec2 o = hash22(n + g);
                        o = 0.5 + 0.5*sin(t + TAU*o); 
                        vec2 r = g + o - f;
                        float d = dot(r,r);
                        if(d < md) { md = d; mr = r; m = hash12(n+g); }
                    }
                    return vec3(md, mr.x, mr.y);
                }

                // Kairotempic Strange Attractor Flow
                vec2 flow(vec2 p, float t) {
                    float n = fbm(p * 1.5 + t * 0.2);
                    float a = n * TAU * 2.0;
                    return vec2(cos(a), sin(a));
                }

                void main() {
                    vec2 uv = (vUv - 0.5) * 2.0;
                    uv.x *= u_resolution.x / u_resolution.y;
                    
                    vec2 m = (u_mouse / u_resolution) * 2.0 - 1.0;
                    m.x *= u_resolution.x / u_resolution.y;
                    
                    float t = u_time * 0.5;
                    vec3 color = vec3(0.0);
                    
                    // 1. STRANGE-ATTRACTOR FLOW FIELD (Dream Physics Kairotempics)
                    vec2 z = uv;
                    float mouseDist = length(z - m);
                    // Mnemonic Gravity / Affective Field bends space towards the cursor
                    z -= normalize(z - m + 1e-5) * exp(-mouseDist * 3.0) * 0.3 * sin(t);
                    z += flow(z, t) * 0.15;
                    
                    // 2. MÖBIUS WARP / HYPERBOLIC LENS (apollonian_gasket, hyperbolic_tilings)
                    vec2 a = vec2(cos(t*0.7), sin(t*0.8));
                    vec2 b = vec2(0.3*sin(t), 0.3*cos(t*1.1));
                    vec2 c = vec2(-0.3*cos(t*0.9), 0.3*sin(t*0.6));
                    vec2 d = vec2(cos(t*0.5), -sin(t*0.5));
                    vec2 wM = cdiv(cmul(a, z) + b, cmul(c, z) + d);
                    
                    // 3. VORONOI SLIME WEATHER (plateau_foam, opal)
                    vec2 slimeUV = wM * 2.0 + fbm(wM * 3.0 - t) * 1.5;
                    vec3 vor = voronoi(slimeUV, t * 1.5);
                    float plateauEdge = smoothstep(0.08, 0.0, vor.x);
                    
                    // 4. QUASICRYSTAL INTERFERENCE (birefringence, acoustic_impedance)
                    float qc = 0.0;
                    for(float i=0.0; i<5.0; i++) {
                        float ang = i * PI / 5.0;
                        vec2 dir = vec2(cos(ang), sin(ang));
                        qc += cos(dot(wM * 8.0, dir) + t * 3.0);
                    }
                    float interference = sin(qc * 2.0 + t * 4.0) * 0.5 + 0.5;
                    
                    // 5. ORACLE CORE (domain_coloring, apollonian_gasket)
                    vec2 coreUV = uv;
                    coreUV -= m * exp(-length(coreUV - m) * 2.0) * 0.5;
                    vec2 wCore = cpow(coreUV * 1.2, 5.0); // 5-fold rosette
                    float corePhase = atan(wCore.y, wCore.x) / TAU + 0.5;
                    float coreMag = length(wCore);
                    float corePulse = exp(-coreMag * 2.0);
                    float coreRings = abs(sin(log(coreMag + 0.001) * 12.0 - t * 10.0));
                    
                    // 6. SIGILS & GLYPHS (astral-os, tesselations)
                    vec2 glyphUV = fract(wM * 4.0 + t) - 0.5;
                    float glyphDist = sdGlyph(glyphUV);
                    float glyphGlow = exp(-glyphDist * 20.0) * pow(sin(t * 5.0 + vor.z * TAU)*0.5+0.5, 2.0);
                    
                    // 7. GLITCH TICKER / SCANLINES (false_color, abelian_sandpile)
                    float ticker = step(0.9, fract(uv.y * 30.0 + t * 8.0 + noise(vec2(uv.y * 50.0, t))));
                    ticker *= step(0.5, hash12(vec2(floor(uv.y * 30.0), floor(uv.x * 20.0 - t * 15.0))));
                    float scanline = sin(uv.y * 150.0 - t * 20.0) * 0.5 + 0.5;
                    
                    // --- MIXING & COMPOSITING ---
                    
                    // Base slime color
                    color = candyAcid(vor.z * 1.5 + interference * 0.5 - t * 0.2);
                    
                    // Plateau foam borders (Cyan/Magenta glow)
                    color = mix(color, vec3(0.0, 1.0, 1.0), plateauEdge * 0.8);
                    
                    // Quasicrystal Moiré bands
                    color += candyAcid(interference + t) * 0.3 * smoothstep(0.4, 0.8, vor.x);
                    
                    // Add Glyphs
                    color += candyAcid(corePhase + 0.5) * glyphGlow * 1.5;
                    
                    // Overlay Oracle Core (with Astral OS permission ring layers)
                    float permissions = step(0.1, fract(coreMag * 5.0 - t));
                    vec3 coreColor = candyAcid(corePhase * 2.0 - t) * (1.0 - smoothstep(0.0, 0.1, coreRings)) * 2.0;
                    coreColor *= 0.5 + 0.5 * permissions;
                    color = mix(color, coreColor, corePulse * 0.8);
                    
                    // Glitch Ticker Overlay
                    color = mix(color, vec3(1.0, 0.9, 0.0), ticker * 0.7);
                    
                    // Sandpile Avalanche Rain (abelian_sandpile)
                    float rain = pow(hash12(uv * 100.0 + t), 50.0);
                    color += vec3(0.0, 1.0, 0.8) * rain * 5.0;
                    
                    // Scanline pulse
                    color *= 0.9 + 0.1 * scanline;
                    
                    // Vignette & Attenuation
                    float vignette = 1.0 - smoothstep(0.5, 2.0, length(uv));
                    color *= vignette;
                    
                    // Post-Process Bloom (afterimage_painter)
                    float luma = dot(color, vec3(0.299, 0.587, 0.114));
                    color += pow(luma, 2.5) * vec3(1.0, 0.5, 1.0) * 1.2;
                    
                    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
                }
            `;
            
            const material = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: {
                    u_time: { value: 0 },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                    u_mouse: { value: new THREE.Vector2(mouse.x, mouse.y) }
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
    
    // Update uniforms and render
    const { renderer, scene, camera, material } = canvas.__three;
    
    if (material && material.uniforms) {
        material.uniforms.u_time.value = time;
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
        material.uniforms.u_mouse.value.set(mouse.x, mouse.y);
    }
    
    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);
}
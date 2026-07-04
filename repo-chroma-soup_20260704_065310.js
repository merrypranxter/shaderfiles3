export function run(ctx, grid, time, repos, input, mouse, canvas, THREE) {
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
          u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
          u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
        },
        vertexShader: `
          out vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: `
          #version 300 es
          precision highp float;

          in vec2 vUv;
          out vec4 fragColor;

          uniform float u_time;
          uniform vec2 u_resolution;
          uniform vec2 u_mouse;

          #define PI 3.14159265359
          #define TAU 6.28318530718

          // 1. Hash & Noise (Vibration, Fungi, Mycelial Networks)
          float hash(vec2 p) {
              return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          vec2 hash22(vec2 p) {
              vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
              p3 += dot(p3, p3.yzx + 33.33);
              return fract((p3.xx + p3.yz) * p3.zy);
          }

          float noise(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              f = f * f * (3.0 - 2.0 * f);
              float a = hash(i);
              float b = hash(i + vec2(1.0, 0.0));
              float c = hash(i + vec2(0.0, 1.0));
              float d = hash(i + vec2(1.0, 1.0));
              return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
          }

          float fbm(vec2 p) {
              float v = 0.0, a = 0.5;
              mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
              for (int i = 0; i < 5; i++) {
                  v += a * noise(p);
                  p = rot * p * 2.0 + vec2(100.0);
                  a *= 0.5;
              }
              return v;
          }

          // 2. Plateau Foam / Voronoi Cells
          float cellular(vec2 p) {
              vec2 n = floor(p);
              vec2 f = fract(p);
              float minDist = 1.0;
              for(int y = -1; y <= 1; y++) {
                  for(int x = -1; x <= 1; x++) {
                      vec2 g = vec2(float(x), float(y));
                      vec2 o = hash22(n + g);
                      o = 0.5 + 0.5 * sin(u_time * 0.5 + TAU * o);
                      vec2 r = g + o - f;
                      minDist = min(minDist, length(r));
                  }
              }
              return minDist;
          }

          // 3. Quasicrystal / Moire Interference
          float quasi(vec2 p, float t) {
              vec2 n1 = vec2(1.0, 0.0);
              vec2 n2 = vec2(0.80901699, 0.58778525);
              vec2 n3 = vec2(0.30901699, 0.95105651);
              vec2 n4 = vec2(-0.30901699, 0.95105651);
              vec2 n5 = vec2(-0.80901699, 0.58778525);
              
              float scale = 12.0;
              float f = 0.0;
              f += sin(dot(p, n1) * scale + t);
              f += sin(dot(p, n2) * scale + t * 1.618); // Golden ratio
              f += sin(dot(p, n3) * scale - t * 2.414); // Silver ratio
              f += sin(dot(p, n4) * scale + t * 1.375);
              f += sin(dot(p, n5) * scale - t);
              return f * 0.2; 
          }

          // 4. The Computational Soup Map
          float map(vec2 pos, float t_offset) {
              float t = u_time * 0.4 + t_offset;
              
              // Datamosh block quantization & motion vector prediction
              vec2 block = floor(pos * 12.0) / 12.0;
              float mosh = hash(block + floor(t * 1.5));
              vec2 mv = vec2(sin(mosh * TAU), cos(mosh * TAU)) * 0.06;
              
              // Saccadic glitch gate (mutates state only during "fast flick" intervals)
              float saccade = step(0.92, fract(t * 1.2));
              vec2 p_warp = pos + mv * saccade;
              
              // Quasicrystal interference field
              float q = quasi(p_warp, t);
              
              // Fluid / Mycelial anastomosis domain warp
              vec2 warp = vec2(fbm(p_warp * 2.5 + q), fbm(p_warp * 2.5 - q + 10.0));
              vec2 p_fluid = p_warp + warp * 0.35;
              
              // Reaction-Diffusion gray-scott substrate
              float v = fbm(p_fluid * 3.0 - t * 0.5);
              
              // Vascular / Hyphal branching (ridged noise)
              float veins = 1.0 - abs(v * 2.0 - 1.0);
              veins = pow(veins, 3.0);
              
              // Weaire-Phelan / Plateau Foam cells
              float foam = 1.0 - cellular(p_fluid * 6.0 + t * 0.5);
              foam = pow(foam, 3.0);
              
              // Chladni acoustic resonance pattern
              float chladni = sin(length(p_fluid) * 18.0 - t * 2.0) * cos(atan(p_fluid.y, p_fluid.x) * 5.0);
              
              return veins * 0.4 + q * 0.3 + foam * 0.3 + chladni * 0.1;
          }

          void main() {
              vec2 uv = gl_FragCoord.xy / u_resolution.xy;
              vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
              
              // Datamosh horizontal tear / cross-prediction bleed
              float tear = step(0.98, hash(vec2(floor(uv.y * 30.0), floor(u_time * 3.0))));
              p.x += tear * 0.05 * sin(u_time * 15.0);
              
              // 5. Chromatic Aberration & Chromostereopsis
              vec2 dir = normalize(p + 0.001);
              float dist = length(p);
              float aberration = 0.035 * dist; // Radial lateral CA
              
              // Sample channels with offsets (Red advances, Blue recedes)
              float r = map(p - dir * aberration, 0.0);
              float g = map(p, 0.1);
              float b = map(p + dir * aberration, 0.2);
              
              // 6. Cross-Processing (S-Curve for extreme contrast)
              r = 1.0 / (1.0 + exp(-9.0 * (r - 0.5)));
              g = 1.0 / (1.0 + exp(-9.0 * (g - 0.5)));
              b = 1.0 / (1.0 + exp(-9.0 * (b - 0.5)));
              
              // 7. Abelian Sandpile Quantization (Morphogenesis)
              float q_r = floor(r * 6.0) / 5.0;
              float q_g = floor(g * 6.0) / 5.0;
              float q_b = floor(b * 6.0) / 5.0;
              
              // Toppling highlights at cell boundaries
              float topple = smoothstep(0.0, 0.05, fract(r * 6.0)) - smoothstep(0.05, 0.1, fract(r * 6.0));
              topple += smoothstep(0.0, 0.05, fract(g * 6.0)) - smoothstep(0.05, 0.1, fract(g * 6.0));
              
              // 8. Color Systems & Acid Palette Mapping
              vec3 acid_pink   = vec3(1.0, 0.05, 0.55);
              vec3 acid_cyan   = vec3(0.0, 0.95, 0.85);
              vec3 acid_yellow = vec3(1.0, 0.90, 0.0);
              vec3 acid_violet = vec3(0.35, 0.0, 0.95);
              
              vec3 color = vec3(0.03, 0.01, 0.08); // Deep space background
              
              // Layer compositing
              color = mix(color, acid_violet, q_b);
              color = mix(color, acid_cyan, q_g * 0.85);
              color = mix(color, acid_pink, q_r * 0.9);
              
              // Yellow highlights for anastomosis fusions
              color += acid_yellow * topple * 1.5;
              
              // Expired film fading / substrate decay
              float fade = smoothstep(0.5, 1.0, fbm(uv * 2.0 + 19.0 + u_time * 0.1));
              color = mix(color, color * 0.4 + 0.15, fade * 0.6);
              
              // 9. Temporal Moire (Kinegram Cinema interlacing)
              float stripWidth = 4.0 / u_resolution.x;
              float strip = step(0.5, fract(uv.x / stripWidth + u_time * 0.5));
              color *= mix(0.9, 1.0, strip);
              
              // 10. CRT Phosphor FX (Arcade Slot Mask)
              float slotH = 6.0;
              float row = floor(gl_FragCoord.y / slotH);
              float stagger = mod(row, 2.0) * 1.5;
              float col_triad = mod(gl_FragCoord.x + stagger, 3.0);
              
              vec3 mask = vec3(
                  smoothstep(1.0, 0.0, abs(col_triad - 0.5)),
                  smoothstep(1.0, 0.0, abs(col_triad - 1.5)),
                  smoothstep(1.0, 0.0, abs(col_triad - 2.5))
              );
              
              float yPhase = fract(gl_FragCoord.y / slotH);
              float slot = smoothstep(0.0, 0.15, yPhase) * smoothstep(1.0, 0.85, yPhase);
              mask *= mix(1.0, slot, 0.6);
              
              // Apply CRT mask
              color *= mix(vec3(1.0), mask, 0.35);
              
              // 11. Bloom / Halation
              float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
              vec3 bloom = color * smoothstep(0.5, 1.0, luma);
              color += bloom * 0.7;
              
              // Acoustic impedance / Ultrasound vignette
              float vig = smoothstep(1.2, 0.3, length(p * vec2(1.0, 1.2)));
              color *= vig;
              
              fragColor = vec4(color, 1.0);
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
    if (material.uniforms.u_mouse) {
      const mx = mouse.isPressed ? mouse.x / grid.width : 0.5;
      const my = mouse.isPressed ? 1.0 - (mouse.y / grid.height) : 0.5;
      material.uniforms.u_mouse.value.set(mx, my);
    }
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);
}
/**
 * REPO-CHROMA COHERENT SOUP ENGINE
 * A maximalist, liquefied amalgamation of 18 distinct repositories.
 * 
 * DNA Signatures:
 * - Lenia / Reaction-Diffusion: Gaussian growth functions, continuous cellular forms
 * - Vascular / Mycelial: FBM domain warping, hyphal branching paths
 * - Plateau Foam: Absolute-value zero-crossings for thin membrane walls
 * - Quasicrystals / Chladni: 5-fold aperiodic radial interference patterns
 * - Datamosh / Sandpile: Macroblock quantization, discrete cascading states
 * - Chromostereopsis / Aberration: Radial channel divergence (LCA)
 * - Cross-Processing / Spectral: Non-linear tone mapping, extreme color shifts
 * - CRT Phosphor / Moiré: Aperture grille, barrel distortion, scanline interference
 */

try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Balance quality and performance
    
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;

      #define PI 3.14159265359
      #define GOLDEN_RATIO 1.6180339887

      // Hash function (Quasicrystal/Noise foundation)
      float hash21(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 43.21);
          return fract(p.x * p.y);
      }

      // Value Noise (Vascular/Mycelial drift)
      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
                     mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      // FBM for organic structures
      float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
              v += a * noise(p);
              p *= 2.0;
              a *= 0.5;
          }
          return v;
      }

      // Voronoi cellular metric (Plateau Foam / Reaction-Diffusion spots)
      float voronoi(vec2 x, float t) {
          vec2 p = floor(x);
          vec2 f = fract(x);
          float res = 8.0;
          for(int j = -1; j <= 1; j++) {
              for(int i = -1; i <= 1; i++) {
                  vec2 b = vec2(i, j);
                  vec2 r = vec2(b) - f + hash21(p + b);
                  // Cellular motion
                  r += 0.5 * sin(t * 1.5 + hash21(p + b) * PI * 2.0);
                  float d = dot(r, r);
                  res = min(res, d);
              }
          }
          return res;
      }

      // 5-Fold Aperiodic Interference (Quasicrystal / Chladni vibration)
      float quasicrystal(vec2 p, float t) {
          float sum = 0.0;
          for(float i = 1.0; i <= 5.0; i++) {
              float theta = i * PI * 0.2;
              vec2 dir = vec2(cos(theta), sin(theta));
              sum += sin(dot(p, dir) * 15.0 + t * i * 0.3);
          }
          return sum * 0.2;
      }

      // Lenia Continuous CA Growth Function
      float leniaGrowth(float u) {
          float mu = 0.28;
          float sigma = 0.04;
          return 2.0 * exp(-pow(u - mu, 2.0) / (2.0 * sigma * sigma)) - 1.0;
      }

      // The Unified Computational Soup
      float sampleSoup(vec2 uv, float t) {
          // Vascular/Mycelial domain warp
          vec2 warp = uv;
          warp.x += fbm(uv * 3.0 + t * 0.2) * 0.2;
          warp.y += fbm(uv * 3.0 - t * 0.15 + 10.0) * 0.2;
          
          // Datamosh / Block Bleed Quantization (Glitchcore)
          float moshTrigger = step(0.8, noise(uv * 2.0 + t));
          vec2 blockUv = floor(warp * 40.0) / 40.0;
          warp = mix(warp, blockUv, moshUv * 0.3 * moshTrigger);
          
          // Structural layers
          float v1 = voronoi(warp * 6.0, t);
          float v2 = voronoi(warp * 12.0 - v1, t * 1.2);
          float q = quasicrystal(warp, t);
          
          // Lenia + Reaction Diffusion blending
          float field = v1 * 0.5 + v2 * 0.3 + q * 0.2;
          float growth = leniaGrowth(field);
          
          // Plateau foam borders (absolute value zero-crossings)
          float foam = smoothstep(0.0, 0.15, abs(growth));
          
          // Abelian Sandpile discrete states
          float sandpile = floor(foam * 5.0) / 5.0;
          
          // Combine continuous and discrete logic
          return mix(foam, sandpile, 0.4 + 0.3 * sin(t));
      }

      void main() {
          vec2 uv = vUv;
          
          // CRT Barrel Distortion
          vec2 centered = uv - 0.5;
          float r2 = dot(centered, centered);
          vec2 warpedUv = centered * (1.0 + 0.12 * r2 + 0.02 * r2 * r2) + 0.5;
          
          // Tube boundary mask
          if (warpedUv.x < 0.0 || warpedUv.x > 1.0 || warpedUv.y < 0.0 || warpedUv.y > 1.0) {
              fragColor = vec4(0.0, 0.0, 0.0, 1.0);
              return;
          }

          float t = u_time * 0.5;

          // Chromostereopsis & Chromatic Aberration (LCA)
          // Red advances, Blue recedes
          vec2 dir = normalize(warpedUv - 0.5);
          float dist = length(warpedUv - 0.5);
          float caShift = 0.015 * dist * (1.0 + 0.5 * sin(t * 2.0)); 
          
          float r = sampleSoup(warpedUv + dir * caShift, t);
          float g = sampleSoup(warpedUv, t);
          float b = sampleSoup(warpedUv - dir * caShift, t);

          // Maximalist Candy-Acid Palette Mapping (Spectral / Metamerism)
          vec3 col = vec3(0.0);
          
          // Base Primaries
          col += vec3(1.0, 0.1, 0.5) * smoothstep(0.2, 0.8, r); // Hot Pink
          col += vec3(0.5, 1.0, 0.0) * smoothstep(0.2, 0.8, g); // Acid Green
          col += vec3(0.0, 0.8, 1.0) * smoothstep(0.2, 0.8, b); // Electric Cyan
          
          // Cross-Processing / Moiré Intersections
          float overlapRG = r * g;
          float overlapGB = g * b;
          float overlapBR = b * r;
          
          col += vec3(1.0, 0.9, 0.0) * smoothstep(0.1, 0.4, overlapRG) * 1.5; // Neon Yellow
          col += vec3(0.6, 0.0, 1.0) * smoothstep(0.1, 0.4, overlapGB) * 1.5; // Ultraviolet
          col += vec3(1.0, 0.4, 0.0) * smoothstep(0.1, 0.4, overlapBR) * 1.5; // Hot Orange
          
          // Lenia / Chladni White-Hot Cores
          float density = (r + g + b) / 3.0;
          col += vec3(1.0, 0.95, 0.9) * smoothstep(0.75, 1.0, density) * 2.0;

          // Cross-Processing Contrast (Non-linear S-Curve)
          col = clamp(col, 0.0, 1.0);
          col = col * col * (3.0 - 2.0 * col); 

          // CRT Phosphor Aperture Grille & Moiré
          float maskCol = mod(gl_FragCoord.x, 3.0);
          vec3 triad = vec3(
              smoothstep(1.0, 0.0, abs(maskCol - 0.5)),
              smoothstep(1.0, 0.0, abs(maskCol - 1.5)),
              smoothstep(1.0, 0.0, abs(maskCol - 2.5))
          );
          col *= mix(vec3(1.0), triad, 0.25); // Subtle phosphor triad
          
          // CRT Scanlines
          float scanline = sin(warpedUv.y * u_resolution.y * PI) * 0.04 + 0.96;
          col *= scanline;
          
          // Damper Wires (Trinitron signature)
          float w1 = exp(-pow(warpedUv.y - 0.33, 2.0) / 0.0001);
          float w2 = exp(-pow(warpedUv.y - 0.66, 2.0) / 0.0001);
          col *= 1.0 - 0.15 * (w1 + w2);

          // Tube Vignette
          float vig = smoothstep(1.15, 0.35, length((warpedUv - 0.5) * vec2(1.1, 1.0)));
          col *= mix(1.0, vig, 0.6);

          fragColor = vec4(col, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
      },
      depthWrite: false,
      depthTest: false
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  // Update uniforms
  if (material && material.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) {
      material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
  }

  // Render
  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL Initialization or Render Failed:", e);
  throw e;
}
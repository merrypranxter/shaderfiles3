if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
    camera.position.z = 1;
    
    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;
    
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

      // --- MATH / COMPLEX / HYPERBOLIC (Domain Coloring, Apollonian, Hyperbolic Tilings) ---
      vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
      vec2 cdiv(vec2 a, vec2 b) { float d = dot(b,b)+1e-9; return vec2(dot(a,b), a.y*b.x - a.x*b.y)/d; }
      vec2 cpow(vec2 z, float n) { float r = length(z); float th = atan(z.y, z.x); return pow(r, n) * vec2(cos(n*th), sin(n*th)); }
      vec2 mobius(vec2 z, vec2 a, vec2 b, vec2 c, vec2 d) { return cdiv(cmul(a,z)+b, cmul(c,z)+d); }
      
      vec2 foldToDomain(vec2 z) {
          for(int i=0; i<5; i++) {
              z.x = abs(z.x); z.y = abs(z.y);
              float d2 = dot(z,z);
              if(d2 < 1.0) z = z / d2;
          }
          return z;
      }

      // --- HASH & NOISE (Astral OS / Dream Physics) ---
      float hash12(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      vec2 hash22(vec2 p) { 
          vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.xx+p3.yz)*p3.zy);
      }
      
      float fbm(vec2 p) {
          float f = 0.0, a = 0.5;
          for(int i=0; i<4; i++) {
              vec2 i_p = floor(p); vec2 f_p = fract(p);
              vec2 u = f_p*f_p*(3.0-2.0*f_p);
              float n = mix(mix(hash12(i_p), hash12(i_p+vec2(1,0)), u.x),
                            mix(hash12(i_p+vec2(0,1)), hash12(i_p+vec2(1,1)), u.x), u.y);
              f += a * n; p *= 2.0; a *= 0.5;
          }
          return f;
      }

      // --- VORONOI FOAM (Plateau Foam / Tessellations) ---
      vec3 voronoi(vec2 x) {
          vec2 n = floor(x); vec2 f = fract(x);
          float md = 8.0; vec2 mr; vec2 id;
          for(int j=-1; j<=1; j++)
          for(int i=-1; i<=1; i++) {
              vec2 g = vec2(float(i), float(j));
              vec2 o = hash22(n + g);
              o = 0.5 + 0.5*sin(u_time*0.5 + TAU*o); // Living cell pulsation
              vec2 r = g + o - f;
              float d = dot(r,r);
              if(d < md) { md = d; mr = r; id = n + g; }
          }
          return vec3(sqrt(md), id);
      }

      // --- SPECTRAL COLOR (Opal / Birefringence / False Color) ---
      vec3 spectral(float t) {
          // Candy-Acid / Neon Trash Oracle Palette
          vec3 a = vec3(0.6, 0.4, 0.6);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(1.0, 1.0, 1.0);
          vec3 d = vec3(0.00, 0.33, 0.67);
          vec3 col = a + b * cos(TAU * (c * t + d));
          
          col = pow(col, vec3(0.7));
          // Psychedelic overrides based on phase
          col = mix(col, vec3(1.0, 0.0, 0.7), smoothstep(0.5, 1.0, sin(t*TAU*2.0))); // Hot Pink
          col = mix(col, vec3(0.0, 1.0, 0.9), smoothstep(0.5, 1.0, cos(t*TAU*3.0))); // Cyan
          col = mix(col, vec3(0.8, 1.0, 0.0), smoothstep(0.5, 1.0, sin(t*TAU*1.5))); // Acid Green
          
          return col;
      }

      // --- QUASICRYSTAL (Tessellations / Opal) ---
      float quasicrystal(vec2 p) {
          float sum = 0.0;
          for(int i=0; i<5; i++) {
              float a = float(i) * PI / 5.0;
              vec2 d = vec2(cos(a), sin(a));
              sum += cos(dot(p, d) * 10.0 + u_time);
          }
          return sum / 5.0;
      }

      // --- SDF GLYPHS (Astral OS / Dream Physics) ---
      float sdHeart(vec2 p) {
          p.x = abs(p.x);
          if(p.y+p.x > 1.0) return sqrt(dot(p-vec2(0.25,0.75),p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;
          return sqrt(min(dot(p-vec2(0.00,1.00),p-vec2(0.00,1.00)), dot(p-0.5*max(p.x+p.y,0.0),p-0.5*max(p.x+p.y,0.0)))) * sign(p.x-p.y);
      }
      
      float sdHexagram(vec2 p, float r) {
          const vec4 k = vec4(-0.5,0.8660254038,0.5773502692,1.7320508076);
          p = abs(p);
          p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
          p -= 2.0*min(dot(k.yx,p),0.0)*k.yx;
          p -= vec2(clamp(p.x,r*k.z,r*k.w),r);
          return length(p)*sign(p.y);
      }

      void main() {
          vec2 uv = vUv;
          vec2 p = (uv - 0.5) * 2.0;
          p.x *= u_resolution.x / u_resolution.y;
          
          vec2 m = (u_mouse - 0.5) * 2.0;
          m.x *= u_resolution.x / u_resolution.y;

          // 1. EMOTIONAL FIELD / MNEMONIC GRAVITY (Dream Physics)
          // Mouse acts as a gravitational attractor warping the coordinate space
          float mouse_dist = length(p - m);
          vec2 warp = p + normalize(p - m) * sin(mouse_dist * 12.0 - u_time * 2.5) * 0.2 * exp(-mouse_dist * 1.5);
          
          // 2. COMPLEX RATIONAL FUNCTION + MÖBIUS (Domain Coloring)
          vec2 z = warp * 1.2;
          vec2 num = cpow(z, 3.0) - vec2(1.0, 0.0);
          vec2 den = cpow(z, 2.0) + vec2(0.5 * cos(u_time*0.4), 0.4 * sin(u_time*0.4));
          z = cdiv(num, den);
          z = mobius(z, vec2(cos(u_time*0.1), sin(u_time*0.1)), vec2(0.6, 0.0), vec2(0.0, 0.6), vec2(1.0, 0.0));
          
          // 3. HYPERBOLIC FOLDING (Hyperbolic Tilings / Apollonian)
          vec2 fz = foldToDomain(z);
          
          // 4. VORONOI SLIME TERRITORIES (Plateau Foam)
          // Reaction-diffusion-like warping applied to the cellular seeds
          vec2 slime_warp = vec2(fbm(fz * 4.0 + u_time*0.5), fbm(fz * 4.0 - u_time*0.5));
          vec3 v = voronoi(fz * 2.5 + slime_warp * 1.5 + u_time * 0.2);
          float edge = v.x;
          float cell_hash = hash12(v.yz);
          
          // 5. ABELIAN SANDPILE / CELLULAR AUTOMATA
          float sandpile = mod(floor(cell_hash * 77.77 + u_time * 4.0), 4.0) / 3.0;
          
          // 6. QUASICRYSTAL INTERFERENCE (Opal / Tessellations)
          float qc = quasicrystal(p * 12.0 + warp * 4.0);
          float moire = sin(length(z) * 45.0 - u_time * 8.0 + qc * 6.0) * 0.5 + 0.5;
          
          // --- COLOR ASSIGNMENT ---
          float phase = atan(fz.y, fz.x) / TAU + 0.5;
          float mag = log(length(fz) + 1.0);
          float phase_contour = smoothstep(0.85, 1.0, sin(phase * TAU * 12.0));
          moire = max(moire, phase_contour);
          
          vec3 col = spectral(phase + mag*0.3 - u_time*0.15 + cell_hash*0.4);
          
          // Apply moire, sandpile and slime borders
          col *= mix(0.4, 1.2, moire);
          col = mix(col, vec3(1.0, 0.8, 0.1), sandpile * 0.5); // Amber/gold sandpile
          col = mix(col, vec3(0.0, 1.0, 0.9), smoothstep(0.15, 0.0, edge)); // Cyan slime borders
          
          // 7. ORACLE CORE (Astral OS / Dream Physics)
          float core_d = length(warp);
          float core_rings = sin(core_d * 25.0 - u_time * 10.0 + qc * 2.0);
          core_rings = smoothstep(0.7, 1.0, core_rings);
          vec3 core_col = spectral(u_time * 0.3 + core_d) * core_rings * 2.5;
          
          // Rotating Sigils
          float t_rot = u_time * 0.6;
          mat2 rot = mat2(cos(t_rot), -sin(t_rot), sin(t_rot), cos(t_rot));
          vec2 sigil_p = rot * warp * 3.5;
          float hex_d = sdHexagram(sigil_p, 0.7);
          float heart_d = sdHeart(sigil_p * 1.5 - vec2(0.0, 0.2));
          
          float sigil_glow = exp(-abs(heart_d) * 25.0) + exp(-abs(hex_d) * 25.0);
          core_col += vec3(1.0, 0.0, 0.6) * sigil_glow * 2.0; // Hot magenta sigil
          
          col = mix(col, core_col, exp(-core_d * 3.5));
          
          // 8. GLITCH SCRAPED-DATA TICKER (False Color / Astral OS)
          float ticker_y = floor(uv.y * 80.0);
          float ticker_speed = (hash12(vec2(ticker_y, 1.0)) - 0.5) * 8.0;
          float ticker = step(0.97, hash12(vec2(ticker_y, floor(u_time * 6.0))));
          float glitch_ribbon = ticker * step(0.5, hash12(vec2(floor(uv.x * 40.0 + u_time * ticker_speed), ticker_y)));
          col = mix(col, vec3(0.1, 1.0, 0.2), glitch_ribbon * 0.9); // Acid green glitch
          
          // 9. ACOUSTIC IMPEDANCE SCANLINES & SPECKLE (Ultrasound)
          float scanline = sin(uv.y * 400.0 + u_time * 15.0) * 0.5 + 0.5;
          float beam = exp(-abs(uv.x - 0.5 - sin(u_time*0.7)*0.4) * 3.0);
          float speckle = hash12(uv * u_resolution + u_time);
          col += speckle * 0.2 * vec3(0.0, 0.8, 1.0) * beam * scanline;
          
          // Chromatic Aberration / Bloom (Afterimage painter)
          float r_shift = fbm(uv * 15.0 - u_time) * 0.03;
          col.r += spectral(phase + r_shift).r * 0.3;
          col += col * col * 0.35; // Additive bloom
          
          // Vignette
          col *= 1.0 - 0.4 * dot(p, p);
          
          fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `;
    
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
      },
      vertexShader,
      fragmentShader,
      depthWrite: false,
      depthTest: false
    });
    
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);
    canvas.__three = { renderer, scene, camera, material, smoothedMouse: new THREE.Vector2(0.5, 0.5) };
  } catch (e) {
    console.error("WebGL Initialization Failed:", e);
    throw e;
  }
}

const { renderer, scene, camera, material, smoothedMouse } = canvas.__three;

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  const targetX = mouse.x / grid.width;
  const targetY = 1.0 - (mouse.y / grid.height);
  smoothedMouse.lerp(new THREE.Vector2(targetX, targetY), 0.05);
  material.uniforms.u_mouse.value.copy(smoothedMouse);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);
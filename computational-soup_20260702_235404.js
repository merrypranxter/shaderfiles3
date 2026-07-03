export function run(ctx, grid, time, repos, input, mouse, canvas, THREE) {
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
        in vec2 vUv;
        out vec4 fragColor;

        uniform float u_time;
        uniform vec2 u_resolution;

        // --- Core Math & Noise (Lenia / Reaction-Diffusion Engine) ---
        vec2 hash22(vec2 p) {
            vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
            p3 += dot(p3, p3.yzx+33.33);
            return fract((p3.xx+p3.yz)*p3.zy);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f*f*(3.0-2.0*f);
            
            float n00 = dot(hash22(i + vec2(0.0,0.0))*2.0-1.0, f - vec2(0.0,0.0));
            float n10 = dot(hash22(i + vec2(1.0,0.0))*2.0-1.0, f - vec2(1.0,0.0));
            float n01 = dot(hash22(i + vec2(0.0,1.0))*2.0-1.0, f - vec2(0.0,1.0));
            float n11 = dot(hash22(i + vec2(1.0,1.0))*2.0-1.0, f - vec2(1.0,1.0));
            
            return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y) * 0.5 + 0.5;
        }

        // Domain Warping / Mycelial Veins
        float fbm(vec2 p) {
            float f = 0.0;
            float amp = 0.5;
            vec2 shift = vec2(100.0);
            mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
            for(int i=0; i<5; i++) {
                f += amp * noise(p);
                p = rot * p * 2.0 + shift;
                amp *= 0.5;
            }
            return f;
        }

        // Quasicrystal Aperiodic Interference
        float quasicrystal(vec2 p, float t) {
            float v = 0.0;
            for(int i=0; i<5; i++) {
                float angle = 3.14159265 * float(i) / 5.0;
                vec2 dir = vec2(cos(angle), sin(angle));
                v += cos(dot(p, dir) * 12.0 + t);
            }
            v /= 5.0;
            return 1.0 - smoothstep(0.0, 0.15, abs(v));
        }

        // --- Integrated Field Evaluation ---
        float getField(vec2 p, float t) {
            // 1. Chladni Modal Vibration + Lenia Fluid Warp
            float chladni = sin(p.x * 8.0) * sin(p.y * 8.0) * cos(t * 0.5);
            vec2 p_warp = p + vec2(fbm(p + t*0.2), fbm(p - t*0.2)) * (1.0 + chladni * 0.5);
            
            // Background: Reaction-Diffusion / Lenia Base
            float bg = fbm(p_warp * 1.5 + t * 0.2);
            bg = smoothstep(0.2, 0.8, bg);
            
            // 2. Midground: Quasicrystal + Plateau Foam / Mycelial Anastomosis
            float qc = quasicrystal(p_warp, t);
            
            vec2 i = floor(p_warp * 3.0);
            vec2 f = fract(p_warp * 3.0);
            float d1 = 1.0; float d2 = 1.0;
            for(int y=-1; y<=1; y++) {
                for(int x=-1; x<=1; x++) {
                    vec2 n = vec2(float(x), float(y));
                    vec2 pt = hash22(i + n);
                    // Acoustic vibration jitter
                    pt = 0.5 + 0.5 * sin(t * 1.5 + 6.28318 * pt);
                    float dist = length(n + pt - f);
                    if(dist < d1) { d2 = d1; d1 = dist; }
                    else if(dist < d2) { d2 = dist; }
                }
            }
            float foam = 1.0 - smoothstep(0.0, 0.15, d2 - d1);
            float midground = max(qc * 0.8, foam);
            
            // 3. Foreground: Datamosh Block Bleed + Moiré + Abelian Sandpile
            vec2 p_mosh = floor(p * 20.0) / 20.0;
            vec2 p_fg = mix(p, p_mosh, step(0.6, bg)); 
            
            float moire = sin(p_fg.x * 60.0 + t*3.0) * sin(p_fg.y * 62.0 - t*2.5);
            moire = moire * 0.5 + 0.5;
            
            float sandpile = step(0.8, fract(d1 * 8.0 - t));
            float foreground = moire * sandpile;
            
            return bg * 0.3 + midground * 0.5 + foreground * 0.2;
        }

        // Gradient extraction for Chromatic Aberration & Edge Highlighting
        vec2 getGrad(vec2 p, float t) {
            float eps = 0.005;
            float hx = getField(p + vec2(eps, 0.0), t) - getField(p - vec2(eps, 0.0), t);
            float hy = getField(p + vec2(0.0, eps), t) - getField(p - vec2(0.0, eps), t);
            return vec2(hx, hy) / (2.0 * eps);
        }

        // Color Systems: Maximalist Candy-Acid Palette
        vec3 candyAcid(float t) {
            t = fract(t);
            vec3 c1 = vec3(0.0, 1.0, 0.8); // Cyan
            vec3 c2 = vec3(0.6, 1.0, 0.0); // Acid Green
            vec3 c3 = vec3(1.0, 0.9, 0.0); // Neon Yellow
            vec3 c4 = vec3(1.0, 0.1, 0.5); // Hot Pink
            vec3 c5 = vec3(0.5, 0.0, 1.0); // Ultraviolet
            vec3 c6 = vec3(0.1, 0.3, 1.0); // Electric Blue
            
            if (t < 0.1666) return mix(c1, c2, t/0.1666);
            if (t < 0.3333) return mix(c2, c3, (t-0.1666)/0.1666);
            if (t < 0.5000) return mix(c3, c4, (t-0.3333)/0.1666);
            if (t < 0.6666) return mix(c4, c5, (t-0.5)/0.1666);
            if (t < 0.8333) return mix(c5, c6, (t-0.6666)/0.1666);
            return mix(c6, c1, (t-0.8333)/0.1666);
        }

        void main() {
            vec2 uv = vUv;
            vec2 p = uv * 2.0 - 1.0;
            p.x *= u_resolution.x / u_resolution.y;
            
            float t = u_time * 0.3;
            
            // Datamosh Glitch Strata
            float glitch = step(0.95, sin(p.y * 50.0 + t * 20.0)) * step(0.95, sin(t * 15.0));
            p.x += glitch * 0.1 * sin(t * 50.0);
            
            float v = getField(p, t);
            vec2 grad = getGrad(p, t);
            
            // Chromatic Aberration & Chromostereopsis (Red advances, Blue recedes)
            float ca = 0.015 + 0.02 * length(p);
            vec2 radial = normalize(p + 0.0001);
            
            float r = getField(p + grad * ca + radial * 0.005, t);
            float b = getField(p - grad * ca - radial * 0.005, t);
            
            vec3 col = candyAcid(v * 2.0 - t * 0.3);
            
            // Spectral fringe separation
            col.r += (r - v) * 2.0;
            col.b += (b - v) * 2.0;
            
            // Halation / Bloom (Reaction-Diffusion & Ultrasound Artefact)
            float luma = dot(col, vec3(0.299, 0.587, 0.114));
            col += col * smoothstep(0.5, 1.0, luma) * 0.8;
            
            // White-hot highlights (Metameric Cores)
            float highlight = smoothstep(0.8, 1.0, v);
            col += vec3(1.0, 0.9, 0.8) * highlight * 1.5;
            
            // Cross-Processing S-Curve
            col = clamp(col, 0.0, 1.0);
            col = col * col * (3.0 - 2.0 * col);
            
            // CRT Phosphor Aperture Grille & Scanlines
            vec2 px = vUv * u_resolution;
            float grille = sin(px.x * 2.094) * 0.15 + 0.85; 
            float scanline = sin(px.y * 3.1415) * 0.1 + 0.9;
            col *= grille * scanline;
            
            // Vignette
            float vig = 1.0 - smoothstep(0.5, 1.5, length(vUv - 0.5));
            col *= mix(0.4, 1.0, vig);
            
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
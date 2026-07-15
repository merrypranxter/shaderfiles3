if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const fragmentShader = `
      #version 300 es
      precision highp float;

      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;

      out vec4 fragColor;

      #define PI 3.14159265359
      #define TAU 6.28318530718

      // --- Complex Math (domain_coloring) ---
      vec2 cdiv(vec2 a, vec2 b) { 
          float d = dot(b,b) + 1e-9; 
          return vec2(dot(a,b), a.y*b.x - a.x*b.y) / d; 
      }
      vec2 cpow(vec2 z, float n) { 
          float r = length(z), a = atan(z.y, z.x); 
          return pow(r,n) * vec2(cos(n*a), sin(n*a)); 
      }

      // --- Noise & Hash (acoustic_impedance, astral-os) ---
      float hash12(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }
      vec2 hash22(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.xx + p3.yz) * p3.zy);
      }

      // --- Voronoi Foam (opal, plateau_foam) ---
      vec4 voronoi(vec2 p, float jitter) {
          vec2 n = floor(p);
          vec2 f = fract(p);
          float f1 = 8.0, f2 = 8.0;
          vec2 bestId = n;
          for(int j=-1; j<=1; j++) {
              for(int i=-1; i<=1; i++) {
                  vec2 g = vec2(float(i), float(j));
                  vec2 o = hash22(n + g) * jitter;
                  vec2 c = g + o;
                  float d = dot(c - f, c - f);
                  if(d < f1) {
                      f2 = f1; f1 = d; bestId = n + g;
                  } else if(d < f2) {
                      f2 = d;
                  }
              }
          }
          return vec4(sqrt(f1), sqrt(f2) - sqrt(f1), bestId);
      }

      // --- Hyperbolic {7,3} Fold (hyperbolic_tilings) ---
      vec2 fold73(vec2 z, out int tp) {
          float acx = 2.012420, acy = 3.618034, aR2 = 16.12867;
          tp = 0;
          for(int i=0; i<24; i++) {
              bool ch = false;
              if(z.y < 0.0) { z.y = -z.y; ch = true; }
              if(z.x < 0.0) { z.x = -z.x; ch = true; }
              vec2 dv = z - vec2(acx, acy);
              float d2 = dot(dv, dv);
              if(d2 < aR2 - 1e-5) {
                  z = vec2(acx, acy) + (aR2 / d2) * dv;
                  tp ^= 1; ch = true;
              }
              if(!ch) break;
          }
          return z;
      }

      // --- Spectral Palette (birefringence, false_color) ---
      vec3 spectral(float t) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(1.0, 1.0, 1.0);
          vec3 d = vec3(0.00, 0.33, 0.67);
          vec3 col = a + b * cos(TAU * (c * t + d));
          
          // Candy-acid shift
          col = mix(col, vec3(1.0, 0.0, 0.6), smoothstep(0.8, 1.0, sin(t * TAU * 2.0))); // Hot pink
          col = mix(col, vec3(0.5, 1.0, 0.0), smoothstep(0.8, 1.0, sin(t * TAU * 2.0 + PI))); // Acid green
          col = mix(col, vec3(0.0, 1.0, 0.8), smoothstep(0.9, 1.0, sin(t * TAU * 3.0))); // Turquoise
          return clamp(col, 0.0, 1.0);
      }

      // --- Anu Heart SDF (astral-os) ---
      float sdHeart(vec2 p) {
          p.x = abs(p.x);
          if(p.y + p.x > 1.0) return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0)/4.0;
          return sqrt(min(dot(p, p), dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)))) * sign(p.x - p.y); 
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
          vec2 mouse = (u_mouse - 0.5) * 2.0;
          float time = u_time * 0.25;

          // --- 1. Background: Domain Coloring / Rational Function ---
          // Mnemonic gravity warp (dream_physics)
          vec2 warp = vec2(sin(uv.y*4.0 + time), cos(uv.x*4.0 - time)) * 0.05;
          vec2 z = (uv + warp + mouse * 0.1) * 2.5;
          
          vec2 num = cpow(z, 3.0) - vec2(1.0, 0.0);
          vec2 den = cpow(z, 2.0) + vec2(0.4 * cos(time), 0.3 * sin(time));
          vec2 w = cdiv(num, den);
          
          float phase = atan(w.y, w.x) / TAU + 0.5;
          float mag = length(w);
          float logmag = log2(mag + 1.0);
          float magContour = 0.85 + 0.15 * smoothstep(0.0, 0.5, abs(fract(logmag*3.0) - 0.5) * 2.0);
          
          vec3 bg = spectral(phase + time*0.5) * magContour;
          bg *= smoothstep(0.0, 2.0, mag); // Darken poles

          // --- 2. Midground: Plateau Foam / Opal Domains ---
          vec2 foamP = uv * 4.0 - vec2(time);
          float fa = time * 0.3;
          foamP = vec2(cos(fa)*foamP.x - sin(fa)*foamP.y, sin(fa)*foamP.x + cos(fa)*foamP.y);
          
          vec4 v = voronoi(foamP, 0.7 + 0.3*sin(time*2.0));
          float edge = smoothstep(0.0, 0.08, v.y); // F2-F1 boundary
          
          float latticeD = 200.0 + 100.0 * sin(v.z * 10.0 + v.w * 20.0);
          float theta = clamp(0.5 + 0.5 * dot(normalize(uv), vec2(cos(time), sin(time))), 0.0, 1.0);
          float lambda = 2.0 * latticeD * 1.44 * sin(theta * PI / 2.0); 
          vec3 flash = spectral(lambda / 700.0) * (1.0 - edge);
          
          float domainPulse = smoothstep(0.7, 1.0, sin(v.z*4.0 + time*5.0));
          bg = mix(bg, flash * 1.5, domainPulse * 0.7);
          bg += vec3(0.0, 1.0, 0.8) * (1.0 - smoothstep(0.0, 0.03, v.y)) * 0.6; // Wet foam borders

          // --- 3. Oracle Core: Hyperbolic {7,3} Fold + Anu Heart ---
          vec2 zH = uv * 1.8;
          float ha = -time * 0.5;
          zH = vec2(cos(ha)*zH.x - sin(ha)*zH.y, sin(ha)*zH.x + cos(ha)*zH.y);
          
          int parity;
          vec2 fd = fold73(zH, parity);
          float dArc = abs(length(fd - vec2(2.01242, 3.61803)) - 4.01605);
          
          vec2 heartUV = (fd - vec2(0.15, 0.05)) * 3.5;
          float heartD = sdHeart(heartUV);
          float heartGlow = exp(-max(heartD, 0.0) * 8.0);
          
          vec3 coreCol = (parity == 0) ? vec3(1.0, 0.0, 0.6) : vec3(0.1, 0.9, 1.0);
          coreCol += vec3(1.0, 0.9, 0.1) * smoothstep(0.8, 1.0, sin(heartD * 40.0 - time*10.0)) * heartGlow;
          coreCol *= 1.0 + heartGlow * 1.5;
          
          float edgeLine = smoothstep(0.02, 0.0, dArc);
          coreCol = mix(coreCol, vec3(1.0), edgeLine);

          float invD = abs(length(uv) - 0.4 - 0.05*sin(time*3.0));
          float moire = sin(invD * 120.0 - time*8.0);
          coreCol += vec3(0.6, 0.0, 1.0) * smoothstep(0.8, 1.0, moire) * exp(-invD * 5.0);

          float coreMask = smoothstep(1.0, 0.2, length(uv * 1.5)) * (1.0 - smoothstep(0.05, 0.0, dArc-0.05));
          bg = mix(bg, coreCol, clamp(coreMask + heartGlow, 0.0, 1.0));

          // --- 4. Foreground: Glitch, Speckle & Sandpile ---
          // Acoustic speckle
          float spk = 0.0;
          for(int i=0; i<3; i++) {
              vec2 j = (hash22(uv * 15.0 + float(i)) - 0.5) * 0.1;
              spk += cos(TAU * hash12(floor(uv * 15.0 + j + time)));
          }
          bg += vec3(0.2, 1.0, 0.6) * abs(spk)/3.0 * 0.15;
          
          // Abelian Sandpile identity ticker
          vec2 gridUV = fract(uv * 12.0 + vec2(0.0, time));
          float sandpile = step(0.85, hash12(floor(uv * 12.0 + vec2(0.0, time))));
          vec3 tickerCol = vec3(1.0, 0.6, 0.0) * sandpile * smoothstep(0.3, 0.5, gridUV.x) * smoothstep(0.3, 0.5, gridUV.y);
          bg += tickerCol * 0.4 * smoothstep(0.3, 0.6, length(uv));

          // Scraper collector lines
          float lineDist = abs(fract(uv.x * 5.0 + uv.y * 5.0 - time) - 0.5);
          float lineGlow = smoothstep(0.1, 0.0, lineDist) * smoothstep(0.8, 0.9, hash12(floor(uv * 5.0 - time)));
          bg += vec3(0.0, 1.0, 0.8) * lineGlow * 0.5;

          // Chromatic Aberration & Vignette
          vec3 finalCol = bg;
          float vig = length(uv);
          finalCol *= 1.0 - pow(vig, 2.0) * 0.4;
          finalCol += bg * 0.2; // Additive bloom

          fragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
      }
    `;

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

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  let mx = mouse.x / grid.width;
  let my = 1.0 - (mouse.y / grid.height);
  material.uniforms.u_mouse.value.set(mx, my);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);
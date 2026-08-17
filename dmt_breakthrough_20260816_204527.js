try {
  if (!ctx) throw new Error("WebGL 2 context not available");

  // --- INITIALIZATION & STATE GUARD ---
  if (!canvas.__three) {
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.autoClear = false;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const w = grid.width;
    const h = grid.height;

    // Ping-pong FBOs for Temporal Desync & Lenia-style Feedback
    const fboOptions = {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false
    };
    const rtSim = new THREE.WebGLRenderTarget(w, h, fboOptions);
    const rtFeedbackA = new THREE.WebGLRenderTarget(w, h, fboOptions);
    const rtFeedbackB = new THREE.WebGLRenderTarget(w, h, fboOptions);

    // --- PASS 1: RAYMARCHING SIMULATION (THE 40s JOURNEY) ---
    const simShader = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(w, h) }
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
        uniform float u_time;
        uniform vec2 u_resolution;
        out vec4 fragColor;

        #define PI 3.14159265359
        #define TAU 6.28318530718

        mat2 rot(float a) {
            float c = cos(a), s = sin(a);
            return mat2(c, -s, s, c);
        }

        // Structural Color / Thin Film Iridescence
        vec3 iridescent(vec3 n, vec3 v, float tRad) {
            float ndotv = max(dot(n, v), 0.0);
            float phase = ndotv * 4.0 + tRad * 2.0;
            vec3 col = 0.5 + 0.5 * cos(phase + vec3(0.0, 2.1, 4.2));
            return col * col; 
        }

        // Phase 1 & 2: Chrysanthemum Tunnel
        float sdChrysanthemum(vec3 p, float tRad) {
            vec3 q = p;
            float a = atan(q.y, q.x);
            float r = length(q.xy);
            
            // 12-fold Dihedral Symmetry
            float aFold = mod(a + p.z * (PI / 24.0) + tRad * 2.0, PI / 6.0) - PI / 12.0;
            vec2 pFold = vec2(cos(aFold), sin(aFold)) * r;
            
            // Apollonian/Hyperbolic recursive folding
            float scale = 1.0;
            for(int i=0; i<3; i++) {
                pFold = abs(pFold) - 0.8;
                float k = 1.6 / max(dot(pFold, pFold), 0.2);
                pFold *= k;
                scale *= k;
            }
            
            float d = (length(pFold) - 0.5) / scale;
            
            // Ribbed biological texture
            d -= 0.02 * sin(q.z * PI * 2.0) * sin(a * 12.0);
            return d;
        }

        // Phase 4: Peak Complex Entities (Self-transforming Lenia/Machine Elves)
        float sdEntities(vec3 p, float tRad, float seed) {
            vec3 q = p;
            q.xy *= rot(tRad * 4.0 + seed);
            q.yz *= rot(tRad * 6.0 - seed);
            
            float scale = 1.0;
            for(int i=0; i<4; i++) {
                q = abs(q) - vec3(1.2, 0.8, 1.2);
                q.xy *= rot(0.5 + sin(tRad*2.0)*0.2);
                q.yz *= rot(0.3 - cos(tRad*2.0)*0.2);
                q *= 1.4;
                scale *= 1.4;
            }
            float d = (length(q) - 1.5) / scale;
            
            // Xenolanguage Surface Displacement
            d += 0.02 * sin(20.0*p.x + tRad*10.0) * sin(20.0*p.y) * sin(20.0*p.z);
            return d;
        }

        // Phase 4: Crystal Palace Architecture
        float sdPalace(vec3 p, float tRad) {
            // Massive spherical chamber
            float dRoom = -(length(p) - 22.0);
            dRoom = max(dRoom, abs(p.y) - 12.0); // Flatten floor/ceiling
            
            // Central Entity
            float dEnt = sdEntities(p, 0.0);
            
            // Orbiting Entities
            vec3 qOrb = p;
            qOrb.xz *= rot(tRad * 2.0);
            qOrb.x = abs(qOrb.x) - 6.0;
            qOrb.xy *= rot(tRad * -4.0);
            float dOrb = sdEntities(qOrb, 1.0);
            
            return min(dRoom, min(dEnt, dOrb));
        }

        // Phase 3: Rupture / Zeno Threshold / Hopf Fibration
        float sdRupture(vec3 p, float tRad) {
            // Infinite Zeno subdivision
            float zeno = fract(log2(length(p.xy) + 1.0) - tRad * 10.0);
            float dRings = length(vec2(length(p.xy) - 5.0 * zeno, p.z)) - 0.05;
            
            // Hopf-linked fibers
            vec3 q = p;
            q.xy *= rot(p.z * 0.5 + tRad * 4.0);
            float dHopf = length(vec2(length(q.xy) - 3.0, q.z)) - 0.2;
            
            return min(dRings, dHopf);
        }

        // Global Map
        vec2 map(vec3 p, float tRad) {
            // Z ranges from 0 to -120 over 40 seconds
            float d1 = sdChrysanthemum(p, tRad);
            
            vec3 pRup = p - vec3(0.0, 0.0, -42.0);
            float d2 = sdRupture(pRup, tRad);
            
            vec3 pPal = p - vec3(0.0, 0.0, -75.0);
            float d3 = sdPalace(pPal, tRad);
            
            vec3 pT2 = p - vec3(0.0, 0.0, -120.0);
            float d4 = sdChrysanthemum(pT2, tRad);
            
            // Smooth transitions based on Z
            float d = d1;
            d = smin(d, d2, 4.0);
            d = smin(d, d3, 6.0);
            d = smin(d, d4, 6.0);
            
            // Material ID tracking (0 = Chrysanthemum/Tunnel, 1 = Rupture, 2 = Palace/Entities)
            float mat = 0.0;
            if (d == d2) mat = 1.0;
            if (d == d3) mat = 2.0;
            
            return vec2(d * 0.6, mat);
        }

        float smin(float a, float b, float k) {
            float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
            return mix(b, a, h) - k*h*(1.0-h);
        }

        vec3 calcNormal(vec3 p, float tRad) {
            vec2 e = vec2(0.005, 0.0);
            return normalize(vec3(
                map(p + e.xyy, tRad).x - map(p - e.xyy, tRad).x,
                map(p + e.yxy, tRad).x - map(p - e.yxy, tRad).x,
                map(p + e.yyx, tRad).x - map(p - e.yyx, tRad).x
            ));
        }

        void main() {
            vec2 uv = (vUv - 0.5) * 2.0;
            uv.x *= u_resolution.x / u_resolution.y;
            
            float modTime = mod(u_time, 40.0);
            float tNorm = modTime / 40.0;
            float tRad = tNorm * TAU;
            
            // Camera Path
            float camZ = -tNorm * 120.0;
            vec3 ro = vec3(0.0, 0.0, camZ);
            
            // The Hum / Carrier Wave Vibration (0-12s)
            float hum = smoothstep(2.0, 12.0, modTime) * smoothstep(16.0, 12.0, modTime);
            ro.x += sin(u_time * 60.0) * 0.02 * hum;
            ro.y += cos(u_time * 63.0) * 0.02 * hum;
            
            vec3 rd = normalize(vec3(uv, -1.0));
            
            // Rupture Camera Twist (12-16s)
            float rupTwist = smoothstep(11.0, 13.0, modTime) * smoothstep(17.0, 15.0, modTime);
            rd.xy *= rot(sin(tRad * 8.0) * 0.5 * rupTwist);
            
            float t = 0.0;
            vec2 res;
            float glow = 0.0;
            vec3 p;
            
            for(int i=0; i<75; i++) {
                p = ro + rd * t;
                res = map(p, tRad);
                if(res.x < 0.002 || t > 60.0) break;
                t += res.x;
                glow += 0.005 / (1.0 + abs(res.x)*20.0);
            }
            
            vec3 col = vec3(0.0);
            
            if(t < 60.0) {
                vec3 n = calcNormal(p, tRad);
                vec3 v = -rd;
                
                if (res.y == 0.0) {
                    // Chrysanthemum: Electric Cyan & Hot Magenta
                    vec3 base = 0.5 + 0.5 * cos(p.z * 0.5 + atan(p.y, p.x) * 6.0 + vec3(0.0, 0.3, 0.6) * TAU);
                    col = base * max(dot(n, vec3(0.0, 0.0, 1.0)), 0.2);
                } else if (res.y == 1.0) {
                    // Rupture: Liquid Silver & Opal
                    col = vec3(0.9) * max(dot(n, vec3(0,1,1)), 0.1) + iridescent(n, v, tRad);
                } else {
                    // Peak Entities: Rainbow Chrome & Radioactive Emerald
                    vec3 chrome = iridescent(n, v, tRad * 3.0);
                    float xeno = step(0.9, sin(p.x*30.0)*sin(p.y*30.0)*sin(p.z*30.0));
                    col = mix(chrome, vec3(0.0, 1.0, 0.3), xeno);
                }
                
                // Fog
                col = mix(col, vec3(0.01, 0.0, 0.03), 1.0 - exp(-0.02 * t));
            } else {
                col = vec3(0.01, 0.0, 0.03); // Ultraviolet-black ground
            }
            
            // Add volumetric glow
            vec3 glowCol = mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 0.0, 1.0), sin(tRad*4.0)*0.5+0.5);
            col += glowCol * glow * 1.5;
            
            fragColor = vec4(col, 1.0);
        }
      `
    });

    // --- PASS 2: TEMPORAL DESYNC & FEEDBACK (LENIA/RETROCAUSALITY) ---
    const feedbackShader = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        tCurrent: { value: null },
        tPrev: { value: null },
        u_time: { value: 0 }
      },
      vertexShader: `
        out vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tCurrent;
        uniform sampler2D tPrev;
        uniform float u_time;
        in vec2 vUv;
        out vec4 fragColor;

        void main() {
            vec4 curr = texture(tCurrent, vUv);
            
            // Anticipatory Echoes / Reversed Causal Ripples
            vec2 dir = vUv - 0.5;
            float dist = length(dir);
            float modTime = mod(u_time, 40.0);
            float tRad = (modTime / 40.0) * 6.28318;
            
            // Ripple pulls inward (effect before cause)
            float ripple = sin(dist * 60.0 + tRad * 20.0) * 0.003;
            vec2 uvEcho = vUv - dir * 0.015 + dir * ripple;
            
            vec4 prev = texture(tPrev, uvEcho);
            
            // Additive blending for ghostly trails
            vec3 col = curr.rgb + prev.rgb * 0.85;
            
            // Slight chromatic shift to trails (Lenia-like chemical channels)
            col *= vec3(0.97, 0.92, 0.99); 
            
            fragColor = vec4(clamp(col, 0.0, 2.5), 1.0);
        }
      `
    });

    // --- PASS 3: OUTPUT & PHOSPHENE OVERLAY ---
    const outputShader = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        tFeedback: { value: null },
        u_time: { value: 0 }
      },
      vertexShader: `
        out vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tFeedback;
        uniform float u_time;
        in vec2 vUv;
        out vec4 fragColor;

        void main() {
            vec3 col = texture(tFeedback, vUv).rgb;
            float modTime = mod(u_time, 40.0);
            float tRad = (modTime / 40.0) * 6.28318;
            
            // Phosphene Field (Kluver form constants)
            vec2 cUv = vUv - 0.5;
            float r = length(cUv);
            float a = atan(cUv.y, cUv.x);
            
            // Log-polar cobwebs and spirals
            float logR = log(r + 0.01);
            float spiral = sin(logR * 30.0 + a * 8.0 - u_time * 2.0);
            float grid = sin(logR * 40.0) * cos(a * 16.0);
            float phosphene = smoothstep(0.85, 1.0, spiral * grid);
            
            // Fade phosphenes in during onset (0-5) and return (35-40)
            float phosWeight = smoothstep(6.0, 2.0, modTime) + smoothstep(34.0, 38.0, modTime);
            vec3 phosCol = vec3(0.0, 0.8, 1.0) * phosphene * phosWeight;
            
            col += phosCol;
            
            // Chromatic Aberration
            float ca = 0.005 * r;
            col.r = texture(tFeedback, vUv + vec2(ca, 0.0)).r + phosCol.r;
            col.b = texture(tFeedback, vUv - vec2(ca, 0.0)).b + phosCol.b;
            
            // Tonemapping & Vignette
            col = col / (1.0 + col);
            col *= 1.0 - smoothstep(0.5, 1.5, r);
            
            fragColor = vec4(col, 1.0);
        }
      `
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    scene.add(mesh);

    canvas.__three = {
      renderer, scene, camera, mesh,
      simShader, feedbackShader, outputShader,
      rtSim, rtFeedbackA, rtFeedbackB,
      pingPong: true
    };
  }

  const { renderer, scene, camera, mesh, simShader, feedbackShader, outputShader, rtSim, rtFeedbackA, rtFeedbackB } = canvas.__three;

  // Resize handling
  if (renderer.getSize(new THREE.Vector2()).width !== grid.width || renderer.getSize(new THREE.Vector2()).height !== grid.height) {
    renderer.setSize(grid.width, grid.height, false);
    rtSim.setSize(grid.width, grid.height);
    rtFeedbackA.setSize(grid.width, grid.height);
    rtFeedbackB.setSize(grid.width, grid.height);
  }

  const t = time;

  // 1. Render Simulation
  mesh.material = simShader;
  simShader.uniforms.u_time.value = t;
  renderer.setRenderTarget(rtSim);
  renderer.render(scene, camera);

  // 2. Render Feedback (Temporal Desync)
  mesh.material = feedbackShader;
  feedbackShader.uniforms.u_time.value = t;
  feedbackShader.uniforms.tCurrent.value = rtSim.texture;
  
  const readBuffer = canvas.__three.pingPong ? rtFeedbackA : rtFeedbackB;
  const writeBuffer = canvas.__three.pingPong ? rtFeedbackB : rtFeedbackA;
  
  feedbackShader.uniforms.tPrev.value = readBuffer.texture;
  renderer.setRenderTarget(writeBuffer);
  renderer.render(scene, camera);

  // 3. Render Output to Screen
  mesh.material = outputShader;
  outputShader.uniforms.u_time.value = t;
  outputShader.uniforms.tFeedback.value = writeBuffer.texture;
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);

  // Swap buffers
  canvas.__three.pingPong = !canvas.__three.pingPong;

} catch (e) {
  console.error("WebGL Initialization or Render Failed:", e);
  throw e;
}
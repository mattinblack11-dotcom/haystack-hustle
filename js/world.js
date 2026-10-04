HH.World = (function () {
  let shadowTick = 0, renderer, scene, camera, hemi, sun, vmScene, vmCamera;
  let envGroup = null, skyMat = null, clouds = [], windmill = null, starPts = null;
  const npc = { buyer: null, wizard: null, shop: null };
  const spots = { sell: new THREE.Vector3(), wizard: new THREE.Vector3(), spawn: new THREE.Vector3(), shop: new THREE.Vector3(), gems: new THREE.Vector3(), anvil: new THREE.Vector3() };
  let parts = null;
  const pState = [];
  const PMAX = 600;
  const pickups = [];
  const chars = [];
  let targetMesh = null, fenceR = 24, time = 0;
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpV = new THREE.Vector3();
  const modelCache = {};

  function mat(c, o) { return new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {})); }
  function box(w, h, d, c) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.castShadow = true; m.receiveShadow = true; return m; }
  function sph(r, c, ws) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws || 14, ws ? Math.max(6, Math.floor(ws * 0.7)) : 10), mat(c)); m.castShadow = true; return m; }
  function cyl(rt, rb, h, c, s) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s || 12), mat(c)); m.castShadow = true; m.receiveShadow = true; return m; }

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function label(text, color, bg, scale) {
    const font = "900 54px \"Lilita One\", \"Arial Black\", Arial, sans-serif";
    const c = document.createElement("canvas");
    const m = c.getContext("2d");
    m.font = font;
    const W = Math.max(512, Math.ceil(m.measureText(text).width + 110)), H = 128;
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = bg || "rgba(60,36,12,0.85)";
    g.beginPath();
    g.moveTo(40, 10); g.lineTo(W - 40, 10); g.quadraticCurveTo(W - 10, 10, W - 10, 64); g.quadraticCurveTo(W - 10, 118, W - 40, 118);
    g.lineTo(40, 118); g.quadraticCurveTo(10, 118, 10, 64); g.quadraticCurveTo(10, 10, 40, 10);
    g.fill();
    g.strokeStyle = "#f2c94c"; g.lineWidth = 6; g.stroke();
    g.font = font;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 10; g.strokeStyle = "#2a1606"; g.strokeText(text, W / 2, 68);
    g.fillStyle = color || "#ffffff"; g.fillText(text, W / 2, 68);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
    s.renderOrder = 10;
    s.userData.label = true;
    const k = scale || 1;
    s.scale.set(3.2 * k * (W / 512), 0.8 * k, 1);
    return s;
  }

  function base64ToBuffer(b64) {
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  function loadModel(name, fresh) {
    if (modelCache[name] && !fresh) return modelCache[name];
    const pr = new Promise(function (resolve, reject) {
      const manager = new THREE.LoadingManager();
      manager.setURLModifier(function (url) {
        const key = Object.keys(HH.MODEL_DATA).find(function (k) { return k.indexOf("/") >= 0 && url.slice(-k.length) === k; });
        return key ? HH.MODEL_DATA[key] : url;
      });
      const loader = new THREE.GLTFLoader(manager);
      const data = (HH.MODEL_DATA && HH.MODEL_DATA[name]) || (HH.EXTRA_MODELS && HH.EXTRA_MODELS[name]);
      if (!data) { reject(new Error("model missing " + name)); return; }
      loader.parse(typeof data === "string" ? base64ToBuffer(data) : data, "", resolve, reject);
    });
    if (!fresh) { modelCache[name] = pr; pr.catch(function () { if (modelCache[name] === pr) delete modelCache[name]; }); }
    return pr;
  }

  function character(name, height, keep, fresh) {
    return loadModel(name, fresh).then(function (gltf) {
      const root = gltf.scene;
      root.traverse(function (o) {
        if (o.isMesh) {
          const n = o.name;
          const body = /(_Hat|_Cape|_Arm|_Body|_Head|_Leg|_Helmet)/.test(n) || (keep && keep.test(n));
          o.visible = body;
          o.castShadow = true;
          o.receiveShadow = false;
          o.frustumCulled = false;
          if (o.material && o.material.map) { o.material.map.encoding = THREE.LinearEncoding; o.material.needsUpdate = true; }
        }
      });
      const bb = new THREE.Box3().setFromObject(root);
      const h = bb.max.y - bb.min.y || 1;
      const holder = new THREE.Group();
      root.scale.setScalar(height / h);
      holder.add(root);
      const mixer = new THREE.AnimationMixer(root);
      const actions = {};
      gltf.animations.forEach(function (clip) { actions[clip.name] = mixer.clipAction(clip); });
      const ch = {
        root: holder, model: root, mixer: mixer, actions: actions, current: null,
        hand: root.getObjectByName("handslot.r") || root.getObjectByName("arm-right"),
        play: function (n, fade, once) {
          const a = actions[n];
          if (!a) return;
          if (once) {
            a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; a.fadeIn(0.08).play();
            const prev = ch.current;
            const back = function (e) {
              if (e.action !== a) return;
              mixer.removeEventListener("finished", back);
              a.fadeOut(0.15);
              if (prev && actions[prev]) actions[prev].reset().fadeIn(0.15).play();
            };
            mixer.addEventListener("finished", back);
            return;
          }
          if (ch.current === n) return;
          if (ch.current && actions[ch.current]) actions[ch.current].fadeOut(fade || 0.2);
          a.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(fade || 0.2).play();
          ch.current = n;
        }
      };
      ch.play(actions.Idle ? "Idle" : "idle", 0);
      chars.push(ch);
      return ch;
    });
  }

  function skyDome(top, mid, bottom) {
    const g = new THREE.SphereGeometry(400, 32, 16);
    skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, bottom: { value: new THREE.Color(bottom) } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h*1.6,0.0,1.0),0.7)) : mix(mid, bottom, clamp(-h*4.0,0.0,1.0)); gl_FragColor = vec4(c,1.0); }"
    });
    const m = new THREE.Mesh(g, skyMat);
    m.renderOrder = -10;
    return m;
  }

  function glowTex(inner, outer) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(0.25, inner); gr.addColorStop(0.5, outer); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function cloud(r) {
    const g = new THREE.Group();
    const m = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x666666 });
    const n = 4 + Math.floor(r() * 4);
    for (let q = 0; q < n; q++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(2 + r() * 2.5, 10, 8), m);
      s.position.set((q - n / 2) * 2.4 + r(), r() * 1.5, (r() - 0.5) * 2.5);
      s.scale.y = 0.7;
      g.add(s);
    }
    return g;
  }

  function tree(x, z, r, night) {
    const g = new THREE.Group();
    const t = cyl(0.3, 0.45, 2.2, 0x7a4a24, 7); t.position.y = 1.1; g.add(t);
    if (r() < 0.5) {
      const c = sph(1.7 + r() * 0.6, night ? 0x2f6a4a : [0x4caf50, 0x5cbf4f, 0x3f9d4a][Math.floor(r() * 3)], 9);
      c.position.y = 3.3; g.add(c);
      const c2 = sph(1.2, night ? 0x3a7a56 : 0x66c95a, 8); c2.position.set(0.8, 3.9, 0.3); g.add(c2);
      if (!night && r() < 0.4) for (let q = 0; q < 4; q++) { const ap = sph(0.18, 0xe8413a, 6); const a = r() * 6.28; ap.position.set(Math.cos(a) * 1.6, 3 + r(), Math.sin(a) * 1.6); g.add(ap); }
    } else {
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3, 8), mat(night ? 0x24533c : 0x2f8a46)); c1.position.y = 3; c1.castShadow = true; g.add(c1);
      const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.4, 8), mat(night ? 0x2c6248 : 0x3aa357)); c2.position.y = 4.4; c2.castShadow = true; g.add(c2);
    }
    const s = 0.8 + r() * 0.6;
    g.scale.setScalar(s);
    g.position.set(x, 0, z);
    return g;
  }

  function barn(x, z, rot) {
    const g = new THREE.Group();
    const body = box(10, 6, 8, 0xc0392b); body.position.y = 3; g.add(body);
    const trim = box(10.2, 0.4, 8.2, 0xf5e6c8); trim.position.y = 6; g.add(trim);
    const roofL = box(10.6, 0.35, 5.4, 0x5b2a1f); roofL.position.set(0, 7.6, -2.1); roofL.rotation.x = 0.62; g.add(roofL);
    const roofR = roofL.clone(); roofR.position.z = 2.1; roofR.rotation.x = -0.62; g.add(roofR);
    const gable = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 4.2, 3.2, 3), mat(0xc0392b)); gable.rotation.set(0, 0, Math.PI / 2); gable.rotation.y = Math.PI / 2; gable.position.y = 7.4; gable.scale.set(1, 3.1, 1); g.add(gable);
    const door = box(3.4, 4.4, 0.15, 0xf5e6c8); door.position.set(0, 2.2, 4.05); g.add(door);
    const d1 = box(0.25, 5.4, 0.1, 0xc0392b); d1.rotation.z = 0.64; d1.position.set(0, 2.2, 4.15); g.add(d1);
    const d2 = d1.clone(); d2.rotation.z = -0.64; g.add(d2);
    const loft = box(1.8, 1.6, 0.15, 0xf5e6c8); loft.position.set(0, 7, 4.05); g.add(loft);
    const hay = box(1.4, 0.7, 0.3, 0xf2c94c); hay.position.set(0, 6.6, 4.1); g.add(hay);
    g.position.set(x, 0, z); g.rotation.y = rot || 0;
    return g;
  }

  let balloons = [], birds = [];

  function mountains(night, sunset, r) {
    const g = new THREE.Group();
    const rock = mat(night ? 0x2a3050 : sunset ? 0x8a6a8a : 0x7f93b8);
    const rock2 = mat(night ? 0x323a62 : sunset ? 0x9a7a96 : 0x95a8c8);
    const snow = mat(night ? 0xc8d0ee : 0xffffff);
    for (let q = 0; q < 26; q++) {
      const a = (q / 26) * Math.PI * 2 + r() * 0.15;
      const d = 290 + r() * 50;
      const h = 55 + r() * 70, w = 45 + r() * 40;
      const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, 6 + Math.floor(r() * 3)), q % 2 ? rock : rock2);
      m.position.set(Math.cos(a) * d, h / 2 - 4, Math.sin(a) * d);
      m.rotation.y = r() * 3;
      g.add(m);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.33, h * 0.33, 6), snow);
      cap.position.set(m.position.x, h - 4 - h * 0.165 + 0.5, m.position.z);
      cap.rotation.y = m.rotation.y;
      g.add(cap);
    }
    return g;
  }

  function balloon(r) {
    const g = new THREE.Group();
    const cols = [[0xff5c5c, 0xffd23f], [0x5cc8ff, 0xffffff], [0x9b5cff, 0xff8ae2], [0x3aa84a, 0xffd23f]][Math.floor(r() * 4)];
    for (let s = 0; s < 8; s++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(4, 6, 10, (s / 8) * Math.PI * 2, Math.PI / 4), mat(cols[s % 2]));
      seg.scale.y = 1.2;
      g.add(seg);
    }
    const basket = box(1.6, 1.2, 1.6, 0x8b5a2b); basket.position.y = -7; g.add(basket);
    [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].forEach(function (p) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 3), mat(0x553311)); rope.position.set(p[0], -5, p[1]); g.add(rope);
    });
    g.scale.setScalar(1.3);
    return g;
  }

  function bird() {
    const g = new THREE.Group();
    const m = mat(0x2a2a3a);
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.25), m); w1.geometry.translate(0.45, 0, 0); g.add(w1);
    const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.25), m); w2.geometry.translate(-0.45, 0, 0); g.add(w2);
    return g;
  }

  function setQuality(mode) {
    const fast = mode === "fast";
    renderer.setPixelRatio(fast ? 0.75 : 1);
    sun.castShadow = !fast;
    HH.Voxels.setTufts(!fast);
    resize();
  }

  let extras = null;

  function setLevelExtras(opts) {
    if (extras) scene.remove(extras);
    extras = new THREE.Group();
    (opts.mud || []).forEach(function (m) {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(m.r, 28), new THREE.MeshLambertMaterial({ color: 0x5a3d22 }));
      puddle.rotation.x = -Math.PI / 2; puddle.position.set(m.x, 0.025, m.z); puddle.scale.set(1, 0.8 + (m.r % 0.3), 1);
      extras.add(puddle);
      const shine = new THREE.Mesh(new THREE.CircleGeometry(m.r * 0.55, 20), new THREE.MeshBasicMaterial({ color: 0x8a6a48, transparent: true, opacity: 0.5 }));
      shine.rotation.x = -Math.PI / 2; shine.position.set(m.x + m.r * 0.15, 0.03, m.z - m.r * 0.1);
      extras.add(shine);
    });
    if (opts.wind) {
      const sock = new THREE.Group();
      const pole = cyl(0.06, 0.06, 4, 0x8a8f99, 6); pole.position.y = 2; sock.add(pole);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xff6b3d, side: THREE.DoubleSide }));
      cone.rotation.z = Math.PI / 2; cone.position.set(0.8, 3.8, 0); sock.add(cone);
      sock.position.set(spots.spawn.x + 4, 0, spots.spawn.z - 2);
      sock.userData.spin = 0;
      extras.add(sock);
      extras.userData.sock = sock;
    }
    scene.add(extras);
    if (opts.fog) { scene.fog.near = 8; scene.fog.far = 60; }
  }

  function setWind(dir, strength) {
    if (!extras || !extras.userData.sock) return;
    extras.userData.sock.rotation.y = Math.atan2(-dir.z, dir.x);
    extras.userData.sock.children[1].scale.set(1, 0.5 + strength * 0.5, 1);
  }
  function makeWindmill(x, z) {
    const g = new THREE.Group();
    const tower = cyl(1.2, 2.2, 10, 0xf2efe6, 10); tower.position.y = 5; g.add(tower);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2, 10), mat(0x8b3a2b)); cap.position.y = 11; cap.castShadow = true; g.add(cap);
    const hub = new THREE.Group(); hub.position.set(0, 9.6, 1.5); g.add(hub);
    for (let q = 0; q < 4; q++) {
      const blade = box(0.9, 5.5, 0.1, 0xf5e6c8); blade.position.y = 2.9;
      const arm = new THREE.Group(); arm.rotation.z = q * Math.PI / 2; arm.add(blade); hub.add(arm);
    }
    g.position.set(x, 0, z);
    g.userData.hub = hub;
    return g;
  }

  function silo(x, z) {
    const g = new THREE.Group();
    const body = cyl(2.6, 2.6, 13, 0x9aa3ad, 20); body.position.y = 6.5; g.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x6b737d)); dome.position.y = 13; g.add(dome);
    for (let n = 0; n < 5; n++) { const b = cyl(2.65, 2.65, 0.18, 0x6b737d, 20); b.position.y = 1.5 + n * 2.6; g.add(b); }
    g.position.set(x, 0, z);
    return g;
  }

  function hills(color, far, r) {
    const g = new THREE.Group();
    for (let q = 0; q < 22; q++) {
      const a = (q / 22) * Math.PI * 2 + r() * 0.2;
      const d = far + r() * 40;
      const s = 25 + r() * 30;
      const h = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(color));
      h.scale.set(s, 6 + r() * 12, s);
      h.position.set(Math.cos(a) * d, -1, Math.sin(a) * d);
      g.add(h);
    }
    return g;
  }

  function fields(r, night) {
    const g = new THREE.Group();
    const cols = night ? [0x3d5a3a, 0x4a5e34, 0x5a5236] : [0x9bc94a, 0xd8c24a, 0x7fb84a, 0xc9a74a];
    for (let q = 0; q < 10; q++) {
      const a = (q / 10) * Math.PI * 2 + 0.3;
      const d = fenceR + 26 + r() * 12;
      const w = 18 + r() * 10, l = 14 + r() * 8;
      const f = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat(cols[q % cols.length]));
      f.rotation.x = -Math.PI / 2; f.rotation.z = a; f.position.set(Math.cos(a) * d, 0.02, Math.sin(a) * d); f.receiveShadow = true;
      g.add(f);
      for (let s = 0; s < 6; s++) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.6), mat(0x000000, { transparent: true, opacity: 0.12 }));
        stripe.rotation.x = -Math.PI / 2; stripe.rotation.z = a;
        const off = (s - 2.5) * (l / 6);
        stripe.position.set(Math.cos(a) * d - Math.sin(a) * off, 0.03, Math.sin(a) * d + Math.cos(a) * off);
        g.add(stripe);
      }
    }
    return g;
  }

  function flowers(r, n, radius) {
    const geo = new THREE.SphereGeometry(0.12, 5, 4);
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const inst = new THREE.InstancedMesh(geo, m, n);
    const pal = [0xff6b9a, 0xffd23f, 0xffffff, 0xb07bff, 0xff8a3d];
    for (let q = 0; q < n; q++) {
      const a = r() * Math.PI * 2, d = radius[0] + r() * (radius[1] - radius[0]);
      tmpM.makeTranslation(Math.cos(a) * d, 0.12, Math.sin(a) * d);
      inst.setMatrixAt(q, tmpM);
      inst.setColorAt(q, new THREE.Color(pal[q % pal.length]));
    }
    return inst;
  }

  function stall() {
    const g = new THREE.Group();
    const counter = box(3.6, 1.1, 1.2, 0x8b5a2b); counter.position.set(0, 0.55, 1.2); g.add(counter);
    const top = box(3.8, 0.15, 1.4, 0xc58b52); top.position.set(0, 1.15, 1.2); g.add(top);
    [-1.7, 1.7].forEach(function (x) { const p = box(0.18, 3.2, 0.18, 0x6b4020); p.position.set(x, 1.6, 1.8); g.add(p); const p2 = p.clone(); p2.position.z = -0.6; g.add(p2); });
    for (let s = 0; s < 6; s++) {
      const st = box(0.66, 0.08, 2.8, s % 2 ? 0xffffff : 0xe74c3c);
      st.position.set(-1.65 + s * 0.66, 3.3, 0.6); st.rotation.x = 0.25; g.add(st);
    }
    for (let n = 0; n < 9; n++) { const coin = cyl(0.16, 0.16, 0.06, 0xffd23f, 14); coin.position.set(0.6 + (n % 3) * 0.3, 1.25 + Math.floor(n / 3) * 0.06, 1.2 + (n % 2) * 0.1); g.add(coin); }
    const sack = sph(0.5, 0xc9a26a); sack.scale.y = 1.2; sack.position.set(-1.1, 1.6, 1.2); g.add(sack);
    const sign = label("SELL HAY $$$", "#ffe14d", "rgba(40,90,30,0.92)", 1.15); sign.position.set(0, 4.4, 1); g.add(sign);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.45, 48), new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.04, 3.4); g.add(ring);
    g.userData.ring = ring;
    return g;
  }

  function altar() {
    const g = new THREE.Group();
    const base = cyl(1.6, 1.9, 0.5, 0x6b5a8a, 8); base.position.y = 0.25; g.add(base);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 6, 32), new THREE.MeshBasicMaterial({ color: 0xc58bff }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.55; g.add(ring);
    const spool = cyl(0.35, 0.35, 0.6, 0xff6bd5, 12); spool.position.set(1.2, 0.85, -0.6); g.add(spool);
    const sock = box(0.6, 1.4, 0.35, 0x6bd5ff); sock.position.set(-1.1, 1.2, -0.6); sock.rotation.z = 0.3; g.add(sock);
    const sign = label("RETURN THE NEEDLE", "#ffb3f0", "rgba(70,30,90,0.92)", 1.15); sign.position.set(0, 4.3, 0); g.add(sign);
    g.userData.ring = ring;
    return g;
  }

  const buildTpl = {};
  let villageSpots = [], bakerCh = null, bakerGen = 0;
  function loadBuildings() {
    if (!HH.BUILD_DATA) return Promise.resolve();
    const files = HH.BUILD_DATA.files;
    const jobs = Object.keys(HH.BUILD_DATA.gltf).map(function (name) {
      return new Promise(function (resolve) {
        const manager = new THREE.LoadingManager();
        manager.setURLModifier(function (url) {
          const k = Object.keys(files).find(function (f) { return url.slice(-f.length) === f; });
          return k ? files[k] : url;
        });
        new THREE.GLTFLoader(manager).parse(JSON.stringify(HH.BUILD_DATA.gltf[name]), "", function (g) {
          g.scene.traverse(function (o) {
            if (o.isMesh) {
              o.castShadow = true; o.receiveShadow = true;
              if (o.material && o.material.map) { o.material.map.encoding = THREE.LinearEncoding; o.material.needsUpdate = true; }
            }
          });
          buildTpl[name] = g.scene;
          resolve();
        }, function () { resolve(); });
      });
    });
    return Promise.all(jobs);
  }

  function building(name, height, x, z, faceCenter, extraRot) {
    const tpl = buildTpl[name];
    if (!tpl) return null;
    const m = tpl.clone(true);
    const bb = new THREE.Box3().setFromObject(m);
    const h = Math.max(0.01, bb.max.y - bb.min.y);
    const holder = new THREE.Group();
    m.scale.setScalar(height / h);
    m.position.set(-(bb.min.x + bb.max.x) / 2 * height / h, -bb.min.y * height / h, -(bb.min.z + bb.max.z) / 2 * height / h);
    holder.add(m);
    holder.position.set(x, 0, z);
    holder.rotation.y = (faceCenter ? Math.atan2(-x, -z) : 0) + (extraRot || 0);
    return holder;
  }

  let villagers = [], villagerGen = 0, villagerR = 0;
  const VILLAGER_LOOKS = [
    { char: "female-b", hat: "straw" }, { char: "male-a", hat: "cap" }, { char: "male-b", hat: "cowboy" },
    { char: "male-f", hat: "chef" }, { char: "female-a", hat: "party" }, { char: "male-d", hat: "tophat" }
  ];
  function clearVillagers() {
    villagerGen++;
    villagers.forEach(function (v) { scene.remove(v.ch.root); const q = chars.indexOf(v.ch); if (q >= 0) chars.splice(q, 1); });
    villagers = [];
  }
  function spawnVillagers(fr) {
    clearVillagers();
    villagerR = fr;
    if (!HH.Looks || !HH.EXTRA_MODELS || !HH.EXTRA_MODELS["character-female-b"]) { HH.charsReady = function () { spawnVillagers(villagerR); }; return; }
    const gen = villagerGen;
    VILLAGER_LOOKS.forEach(function (look, i) {
      HH.Looks.build(look, 1.65).then(function (ch) {
        if (gen !== villagerGen) { const q = chars.indexOf(ch); if (q >= 0) chars.splice(q, 1); return; }
        const v = { ch: ch, a: (i / VILLAGER_LOOKS.length) * Math.PI * 2 + Math.random() * 0.4, r: fr + 2.6 + (i % 3) * 1.1, dir: i % 2 ? 1 : -1, t: Math.random() * 4, walking: Math.random() < 0.6, cheer: 0 };
        ch.root.traverse(function (o) { if (o.isMesh) o.castShadow = false; });
        scene.add(ch.root);
        villagers.push(v);
        placeVillager(v);
      }).catch(function () {});
    });
  }
  function placeVillager(v) {
    v.ch.root.position.set(Math.cos(v.a) * v.r, 0, Math.sin(v.a) * v.r);
    const tx = -Math.sin(v.a) * v.dir, tz = Math.cos(v.a) * v.dir;
    v.ch.root.rotation.y = v.walking ? Math.atan2(tx, tz) : Math.atan2(-Math.cos(v.a), -Math.sin(v.a));
  }
  function updateVillagers(dt) {
    villagers.forEach(function (v) {
      v.t -= dt;
      if (v.t <= 0) {
        v.walking = !v.walking;
        v.t = v.walking ? 4 + Math.random() * 6 : 2 + Math.random() * 4;
        if (v.walking && Math.random() < 0.4) v.dir = -v.dir;
        v.anim = Math.random() < 0.3 ? "emote-yes" : "idle";
      }
      if (v.walking) v.a += v.dir * 1.25 / v.r * dt;
      v.ch.play(v.walking ? "walk" : (v.anim || "idle"), 0.3);
      placeVillager(v);
      if (v.ch.spin) v.ch.spin.rotation.y += dt * 10;
    });
  }

  function village(fr, r) {
    if (!buildTpl.building_windmill_red) return false;
    const plan = [
      ["building_windmill_red", 15, 0.62, 18],
      ["building_home_A_red", 7, -1.2, 14],
      ["building_home_B_red", 8.5, -1.62, 16],
      ["building_tavern_red", 9.5, 2.3, 17],
      ["building_lumbermill_red", 8, 2.75, 20],
      ["building_blacksmith_red", 7.5, -2.15, 15],
      ["building_market_red", 6, 1.35, 13],
      ["building_home_A_red", 7, 3.6, 15],
      ["building_home_B_red", 8, -0.55, 20],
      ["building_well_red", 3.2, 0.95, 9]
    ];
    plan.forEach(function (p) {
      const a = p[2], d = fr + p[3];
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const b = building(p[0], p[1], x, z, true, (r() - 0.5) * 0.5);
      if (!b) return;
      villageSpots.push([x, z, p[1] * 0.75 + 3]);
      envGroup.add(b);
      if (p[0] === "building_windmill_red") {
        const fan = b.getObjectByName("building_windmill_top_fan_red");
        if (fan) { windmill = b; windmill.userData.hub = fan; }
      }
    });
    for (let q = 0; q < 9; q++) {
      const a = -0.35 + q * 0.11 + (r() - 0.5) * 0.04, d = fr + 9 + (q % 3) * 5.2;
      const g = building("building_grain", 1.4, Math.cos(a) * d, Math.sin(a) * d, false, r() * 6);
      if (g) { g.scale.x = g.scale.z = 2.2; envGroup.add(g); }
    }
    const outer = [
      ["building_home_B_red", 8, 0.25, 34], ["building_home_A_red", 7, -0.9, 33], ["building_tavern_red", 9, 1.85, 35],
      ["building_home_A_red", 7, 2.95, 33], ["building_blacksmith_red", 7.5, -2.6, 34], ["building_home_B_red", 8, 4.2, 34],
      ["building_market_red", 6, -1.9, 31], ["building_home_A_red", 7, 5.1, 32], ["building_lumbermill_red", 8, -0.35, 37]
    ];
    outer.forEach(function (p) {
      const d = fr + p[3], x = Math.cos(p[2]) * d, z = Math.sin(p[2]) * d;
      if (villageSpots.some(function (s) { return Math.hypot(s[0] - x, s[1] - z) < s[2] + p[1] * 0.6; })) return;
      const b = building(p[0], p[1], x, z, true, (r() - 0.5) * 0.6);
      if (!b) return;
      villageSpots.push([x, z, p[1] * 0.75 + 3]);
      envGroup.add(b);
    });
    const townKinds = ["building_home_A_blue", "building_tavern_blue", "building_church_yellow", "building_market_yellow", "building_home_B_yellow", "building_home_A_green", "building_tower_A_green", "building_market_blue", "building_home_B_green", "building_home_A_red", "building_home_B_red", "building_blacksmith_red"];
    const townH = { building_church_yellow: 11, building_tower_A_green: 12, building_tavern_blue: 9.5, building_market_yellow: 6, building_market_blue: 6 };
    for (let q = 0; q < 22; q++) {
      const a = q / 22 * Math.PI * 2 + (r() - 0.5) * 0.12, d = fr + 50 + (q % 3) * 7 + r() * 4;
      const x = Math.cos(a) * d, z = Math.sin(a) * d, kind = townKinds[q % townKinds.length], h = townH[kind] || (7 + r() * 1.5);
      if (villageSpots.some(function (s) { return Math.hypot(s[0] - x, s[1] - z) < s[2] + h * 0.6; })) continue;
      const b = building(kind, h, x, z, true, (r() - 0.5) * 0.5);
      if (!b) continue;
      villageSpots.push([x, z, h * 0.75 + 3]);
      envGroup.add(b);
    }
    const ba = 1.85, bd = fr + 9;
    const bx = Math.cos(ba) * bd, bz = Math.sin(ba) * bd;
    const bakery = building("building_home_B_yellow", 8, bx, bz, true);
    if (bakery) {
      envGroup.add(bakery);
      villageSpots.push([bx, bz, 9]);
      const sign = label("BAKERY", "#ffd0a8", "rgba(110,50,20,0.92)", 1.3);
      sign.material.depthTest = true;
      sign.position.set(bx * 0.93, 8.6, bz * 0.93);
      envGroup.add(sign);
      const cx = Math.cos(ba) * (fr + 4), cz = Math.sin(ba) * (fr + 4);
      spots.bakery = new THREE.Vector3(cx, 0, cz);
      const gen = ++bakerGen;
      if (bakerCh) { scene.remove(bakerCh.root); bakerCh = null; }
      if (HH.Looks) HH.Looks.build({ char: "male-f", hat: "chef" }, 1.7).then(function (ch) {
        if (gen !== bakerGen) return;
        bakerCh = ch;
        ch.root.position.set(cx, 0, cz);
        ch.root.rotation.y = Math.atan2(-cx, -cz);
        ch.play(ch.actions["emote-yes"] && Math.random() < 0.5 ? "emote-yes" : "idle", 0.2);
        scene.add(ch.root);
      }).catch(function () {});
    }
    const sa = 3.25, sd = fr + 13;
    const stage = building("building_stage_A", 3.2, Math.cos(sa) * sd, Math.sin(sa) * sd, true);
    if (stage) { stage.scale.x = stage.scale.z = stage.scale.y * 1.6; envGroup.add(stage); villageSpots.push([Math.cos(sa) * sd, Math.sin(sa) * sd, 7]); }
    for (let q = 0; q < 16; q++) {
      const a = -0.42 + q * 0.064, d = fr + 23.5;
      const f = building("fence_wood_straight", 1.3, Math.cos(a) * d, Math.sin(a) * d, true, Math.PI / 2);
      if (f) { f.scale.z *= 1.9; envGroup.add(f); }
    }
    for (let q = 0; q < 7; q++) {
      const a = -0.42 + q * (0.96 / 6), d = fr + 6;
      const f = building("fence_wood_straight", 1.3, Math.cos(a) * d, Math.sin(a) * d, true, Math.PI / 2);
      if (f) { f.scale.z *= 1.9; envGroup.add(f); }
    }
    return true;
  }

  function buildEnv(mapDef) {
    if (envGroup) scene.remove(envGroup);
    envGroup = new THREE.Group();
    clouds = [];
    const r = rng(mapDef.id.length * 977 + 13);
    const ext = HH.Voxels.extent;
    fenceR = ext + 13;
    const night = mapDef.night;
    const skyTop = night ? 0x0b0d2e : mapDef.id === "mega" ? 0x5a7fd6 : 0x3d8fe8;
    const skyMid = night ? new THREE.Color(mapDef.sky).getHex() : mapDef.id === "mega" ? 0xffb27a : 0xbfe6ff;
    const skyBot = mapDef.ground;
    envGroup.add(skyDome(skyTop, skyMid, skyBot));
    scene.background = null;
    scene.fog = new THREE.Fog(skyMid, 90, 420);
    hemi.color.setHex(night ? 0x9aa6ff : 0xfff6e8);
    hemi.groundColor.setHex(night ? 0x2a2440 : 0x6a8a4a);
    hemi.intensity = night ? 0.55 : 0.72;
    sun.intensity = night ? 0.5 : 0.95;
    sun.color.setHex(night ? 0xc8d0ff : mapDef.id === "mega" ? 0xffd2a0 : 0xfff2d8);

    const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(night ? "rgba(240,244,255,1)" : "rgba(255,250,220,1)", night ? "rgba(160,180,255,0.35)" : "rgba(255,220,120,0.35)"), fog: false, depthWrite: false, transparent: true }));
    orb.scale.set(70, 70, 1);
    orb.position.set(140, night ? 120 : 110, -230);
    envGroup.add(orb);
    if (night) {
      const pts = [];
      for (let q = 0; q < 700; q++) {
        const a = r() * Math.PI * 2, e = 0.15 + r() * 1.3;
        pts.push(Math.cos(a) * Math.cos(e) * 350, Math.sin(e) * 350, Math.sin(a) * Math.cos(e) * 350);
      }
      const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      starPts = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, fog: false }));
      envGroup.add(starPts);
    }
    for (let q = 0; q < 16; q++) {
      const c = cloud(r);
      const a = r() * Math.PI * 2, d = 90 + r() * 120;
      c.position.set(Math.cos(a) * d, 45 + r() * 35, Math.sin(a) * d);
      c.scale.setScalar(1.5 + r() * 2);
      if (night) c.children.forEach(function (s) { s.material = new THREE.MeshLambertMaterial({ color: 0x8890c0 }); });
      clouds.push(c);
      envGroup.add(c);
    }
    envGroup.add(mountains(night, mapDef.id === "mega", r));
    balloons = []; birds = [];
    if (!night) {
      for (let q = 0; q < 4; q++) {
        const b = balloon(r);
        b.userData.a = r() * Math.PI * 2; b.userData.rad = 70 + r() * 60; b.userData.h = 28 + r() * 26; b.userData.sp = 0.01 + r() * 0.015;
        balloons.push(b); envGroup.add(b);
      }
      for (let q = 0; q < 9; q++) {
        const bd = bird();
        bd.userData.a = (q / 9) * Math.PI * 2; bd.userData.rad = 34 + (q % 3) * 5; bd.userData.h = 22 + (q % 4) * 2; bd.userData.ph = r() * 6;
        birds.push(bd); envGroup.add(bd);
      }
    } else {
      for (let q = 0; q < 40; q++) {
        const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("rgba(255,255,170,1)", "rgba(200,255,120,0.4)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        f.scale.setScalar(0.6);
        const a = r() * Math.PI * 2, d = HH.Voxels.extent + 3 + r() * 30;
        f.userData.base = new THREE.Vector3(Math.cos(a) * d, 1 + r() * 3, Math.sin(a) * d); f.userData.ph = r() * 6;
        f.position.copy(f.userData.base);
        birds.push(f); envGroup.add(f);
      }
    }
    envGroup.add(hills(night ? 0x2c4a3a : 0x6fb04a, 150, r));
    envGroup.add(hills(night ? 0x223a30 : 0x5a9a44, 210, r));

    const ground = new THREE.Mesh(new THREE.CircleGeometry(260, 64), mat(mapDef.ground));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; envGroup.add(ground);
    const dirt = new THREE.Mesh(new THREE.CircleGeometry(ext + 3, 48), mat(night ? 0x5a4a38 : 0xc9a066));
    dirt.rotation.x = -Math.PI / 2; dirt.position.y = 0.015; dirt.receiveShadow = true; envGroup.add(dirt);
    const straw = new THREE.Mesh(new THREE.RingGeometry(ext - 1, ext + 3.5, 48), mat(0xe8c25a, { transparent: true, opacity: 0.55 }));
    straw.rotation.x = -Math.PI / 2; straw.position.y = 0.02; envGroup.add(straw);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3, fenceR), mat(night ? 0x5a4a38 : 0xc9a066));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.016, -(ext + fenceR) / 2 + 2); envGroup.add(path);

    const pole = cyl(0.12, 0.16, HH.Voxels.height + 2.5, 0x7a4a24, 8);
    pole.position.set(0, (HH.Voxels.height + 2.5) / 2, 0);
    envGroup.add(pole);

    const postGeo = new THREE.BoxGeometry(0.28, 1.4, 0.28);
    const postMat = mat(0xa0703f);
    const N = 80;
    const posts = new THREE.InstancedMesh(postGeo, postMat, N);
    for (let n = 0; n < N; n++) {
      const a = (n / N) * Math.PI * 2;
      tmpM.makeTranslation(Math.cos(a) * fenceR, 0.7, Math.sin(a) * fenceR);
      posts.setMatrixAt(n, tmpM);
    }
    posts.castShadow = true;
    envGroup.add(posts);
    [0.5, 1.05].forEach(function (y) {
      const rail = new THREE.Mesh(new THREE.TorusGeometry(fenceR, 0.07, 4, 128), postMat);
      rail.rotation.x = Math.PI / 2; rail.position.y = y; envGroup.add(rail);
    });
    envGroup.add(fields(r, night));
    windmill = null;
    villageSpots = [];
    const hasVillage = village(fenceR, r);
    if (!hasVillage) {
      envGroup.add(barn(-fenceR - 12, -8, Math.PI / 2));
      windmill = makeWindmill(fenceR + 16, -18);
      envGroup.add(windmill);
      envGroup.add(silo(fenceR + 10, 12));
      if (mapDef.id === "silo") { const s2 = silo(-fenceR - 6, 18); s2.scale.set(1.4, 1.6, 1.4); envGroup.add(s2); }
    }
    for (let n = 0; n < 40; n++) {
      const a = r() * Math.PI * 2;
      const d = fenceR + 6 + r() * 60;
      if (Math.abs(Math.sin(a - 0.3)) < 0.1) continue;
      const tx = Math.cos(a) * d, tz = Math.sin(a) * d;
      if (villageSpots.some(function (s) { return Math.hypot(s[0] - tx, s[1] - tz) < s[2]; })) continue;
      envGroup.add(tree(tx, tz, r, night));
    }
    for (let n = 0; n < 14; n++) {
      const a = r() * Math.PI * 2, d = ext + 5 + r() * (fenceR - ext - 7);
      if (Math.abs(Math.cos(a) * d) < 4 && Math.sin(a) * d < 0) continue;
      const b = cyl(0.9, 0.9, 1.3, 0xe8c25a, 16);
      b.rotation.z = Math.PI / 2; b.rotation.y = r() * 3;
      b.position.set(Math.cos(a) * d, 0.9, Math.sin(a) * d);
      envGroup.add(b);
    }
    envGroup.add(flowers(r, 400, [fenceR + 1, fenceR + 30]));
    envGroup.add(flowers(r, 120, [ext + 4, fenceR - 1]));

    spots.sell.set(0, 0, -(ext + 7));
    spots.wizard.set(ext + 7, 0, 4);
    spots.spawn.set(0, 0, ext + 6);
    spots.shop.set(-(ext + 7), 0, -3.5);
    spots.gems.set(-(ext + 7), 0, 4.5);
    spots.anvil.set(-(ext + 7), 0, 12.5);
    envGroup.add(anvilMesh(spots.anvil));
    [["shop", spots.shop], ["gems", spots.gems]].forEach(function (b) {
      const booth = shopBooth(b[0]);
      booth.position.set(b[1].x - 3.4, 0, b[1].z);
      booth.rotation.y = Math.PI / 2;
      envGroup.add(booth);
      envGroup.userData[b[0] + "Ring"] = booth.userData.ring;
    });
    const st = stall();
    st.position.set(spots.sell.x, 0, spots.sell.z - 3.4);
    envGroup.add(st);
    envGroup.userData.sellRing = st.userData.ring;
    const al = altar();
    al.position.copy(spots.wizard);
    envGroup.add(al);
    envGroup.userData.altarRing = al.userData.ring;
    const dynamic = new Set();
    clouds.concat(balloons, birds).forEach(function (o) { dynamic.add(o); });
    if (windmill) dynamic.add(windmill.userData.hub);
    if (envGroup.userData.altarRing) dynamic.add(envGroup.userData.altarRing);
    envGroup.traverse(function (o) {
      let p = o, dyn = false;
      while (p && p !== envGroup) { if (dynamic.has(p)) { dyn = true; break; } p = p.parent; }
      o.updateMatrix();
      if (!dyn && o !== envGroup) o.matrixAutoUpdate = false;
    });
    scene.add(envGroup);
    spawnVillagers(fenceR);
    if (HH.Parkour) HH.Parkour.build(scene, ext);

    pickups.forEach(function (p) { scene.remove(p.mesh); });
    pickups.length = 0;
    if (npc.buyer) { npc.buyer.root.position.set(spots.sell.x, 0, spots.sell.z - 4.4); npc.buyer.root.rotation.y = 0; }
    if (npc.wizard) { npc.wizard.root.position.set(spots.wizard.x + 0.2, 0.5, spots.wizard.z); npc.wizard.root.rotation.y = -Math.PI / 2; }
    if (npc.shop) { npc.shop.root.position.set(spots.shop.x - 3.6, 0, spots.shop.z); npc.shop.root.rotation.y = Math.PI / 2; }
  }

  function anvilMesh(at) {
    const g = new THREE.Group();
    const iron = mat(0x4a4f58), dark = mat(0x2e3138);
    const stump = cyl(0.55, 0.65, 0.8, 0x7a4a24, 12); stump.position.y = 0.4; g.add(stump);
    const base = box(0.9, 0.25, 0.6, 0x3a3e46); base.material = dark; base.position.y = 0.92; g.add(base);
    const waist = box(0.45, 0.35, 0.4, 0x4a4f58); waist.material = iron; waist.position.y = 1.2; g.add(waist);
    const top = box(1.2, 0.28, 0.55, 0x5a606a); top.position.y = 1.5; g.add(top);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 10), mat(0x5a606a)); horn.rotation.z = Math.PI / 2; horn.position.set(0.88, 1.5, 0); g.add(horn);
    const hammer = box(0.12, 0.12, 0.6, 0x7a4a24); hammer.position.set(-0.2, 1.72, 0.05); hammer.rotation.y = 0.6; g.add(hammer);
    const head = box(0.22, 0.18, 0.18, 0x2e3138); head.position.set(-0.36, 1.72, 0.28); head.rotation.y = 0.6; g.add(head);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.0, 40), new THREE.MeshBasicMaterial({ color: 0xc9ced8, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.04, 2.2); g.add(ring);
    const sign = label("ANVIL", "#e8eef6", "rgba(40,44,52,0.92)", 0.9); sign.position.y = 2.6; g.add(sign);
    g.position.set(at.x - 2.2, 0, at.z);
    g.rotation.y = Math.PI / 2;
    return g;
  }

  function shopBooth(kind) {
    const g = new THREE.Group();
    const gem = kind === "gems";
    const counter = box(3.4, 1.1, 1.1, gem ? 0x4a5a8a : 0x8b5a2b); counter.position.set(0, 0.55, 1.2); g.add(counter);
    const top = box(3.6, 0.15, 1.3, gem ? 0x8aa6e8 : 0xc58b52); top.position.set(0, 1.15, 1.2); g.add(top);
    [-1.6, 1.6].forEach(function (x) { const p = box(0.18, 3.2, 0.18, 0x6b4020); p.position.set(x, 1.6, 1.75); g.add(p); const p2 = p.clone(); p2.position.z = -0.6; g.add(p2); });
    for (let s = 0; s < 6; s++) {
      const st = box(0.62, 0.08, 2.8, s % 2 ? 0xffffff : gem ? 0x2d9cdb : 0x3aa84a);
      st.position.set(-1.55 + s * 0.62, 3.3, 0.6); st.rotation.x = 0.25; g.add(st);
    }
    if (gem) {
      for (let q = 0; q < 5; q++) {
        const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.16 + (q % 2) * 0.06), new THREE.MeshLambertMaterial({ color: [0x7ff7ff, 0xb38cff, 0xff8ae2][q % 3], emissive: 0x223344 }));
        cr.position.set(-1.1 + q * 0.55, 1.4, 1.2); g.add(cr);
      }
    } else {
      [[-1.1, 0xe05cb0], [-0.4, 0xd63031], [0.3, 0x9a6634], [1.0, 0xaaddff]].forEach(function (it) {
        const b = box(0.3, 0.3, 0.3, it[1]); b.position.set(it[0], 1.38, 1.2); b.rotation.y = 0.4; g.add(b);
      });
      const fork = cyl(0.03, 0.03, 2.2, 0x9a6634, 6); fork.position.set(1.75, 1.3, 2.0); fork.rotation.z = 0.15; g.add(fork);
    }
    const sign = label(gem ? "GEM SHOP" : "HAY SHOP", gem ? "#7ff7ff" : "#ffe14d", gem ? "rgba(20,60,110,0.92)" : "rgba(40,90,30,0.92)", 1.15);
    sign.position.set(0, 4.4, 1); g.add(sign);
    const hint = label("walk in to shop", "#ffffff", "rgba(0,0,0,0.55)", 0.6);
    hint.position.set(0, 0.6, 3.4); g.add(hint);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.0, 48), new THREE.MeshBasicMaterial({ color: gem ? 0x7ff7ff : 0x8aff8a, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.04, 3.4); g.add(ring);
    g.userData.ring = ring;
    return g;
  }

  function initParticles() {
    const geo = new THREE.BoxGeometry(0.05, 0.05, 0.3);
    parts = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), PMAX);
    parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parts.frustumCulled = false;
    for (let n = 0; n < PMAX; n++) {
      pState.push({ on: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler() });
      parts.setMatrixAt(n, new THREE.Matrix4().makeScale(0, 0, 0));
      parts.setColorAt(n, new THREE.Color(0xf2c94c));
    }
    scene.add(parts);
  }

  let pCursor = 0;
  function spawn(pos, vel, color, mode, life, target, size) {
    for (let q = 0; q < PMAX; q++) {
      const n = (pCursor + q) % PMAX;
      const p = pState[n];
      if (p.on) continue;
      pCursor = n + 1;
      p.on = true; p.pos.copy(pos); p.vel.copy(vel); p.mode = mode; p.life = life; p.max = life; p.target = target || null; p.size = size || 1;
      p.rot.set(Math.random() * 6, Math.random() * 6, 0);
      parts.setColorAt(n, new THREE.Color(color));
      parts.instanceColor.needsUpdate = true;
      return;
    }
  }

  function updateParticles(dt, playerPos) {
    let any = false;
    for (let n = 0; n < PMAX; n++) {
      const p = pState[n];
      if (!p.on) continue;
      any = true;
      p.life -= dt;
      if (p.mode === "suck") {
        const tgt = p.target || playerPos;
        tmpV.set(tgt.x, tgt.y + 1.1, tgt.z).sub(p.pos);
        const d = tmpV.length();
        if (d < 0.45 || p.life <= 0) { p.on = false; parts.setMatrixAt(n, tmpM.makeScale(0, 0, 0)); continue; }
        p.vel.lerp(tmpV.multiplyScalar(16 / Math.max(d, 0.5)), Math.min(1, dt * 7));
      } else if (p.mode === "rain") {
        if (p.pos.y < 0.1 || p.life <= 0) { p.on = false; parts.setMatrixAt(n, tmpM.makeScale(0, 0, 0)); continue; }
      } else {
        p.vel.y -= 14 * dt;
        if (p.pos.y < 0.05) { p.pos.y = 0.05; p.vel.multiplyScalar(0.5); p.vel.y = Math.abs(p.vel.y) * 0.3; }
        if (p.life <= 0) { p.on = false; parts.setMatrixAt(n, tmpM.makeScale(0, 0, 0)); continue; }
      }
      p.pos.addScaledVector(p.vel, dt);
      p.rot.x += dt * 8; p.rot.y += dt * 6;
      tmpQ.setFromEuler(p.rot);
      const s = (p.mode === "debris" ? Math.min(1, (p.life / p.max) * 2) : 1) * p.size;
      tmpS.set(s, s, s);
      tmpM.compose(p.pos, tmpQ, tmpS);
      parts.setMatrixAt(n, tmpM);
    }
    if (any) parts.instanceMatrix.needsUpdate = true;
  }

  function makeNeedle(big) {
    const g = new THREE.Group();
    const m = new THREE.MeshPhongMaterial({ color: 0xb9c3d1, shininess: 200, emissive: 0x1c2534, specular: 0xffffff });
    const prof = [[0, -0.95], [0.004, -0.9], [0.012, -0.78], [0.022, -0.6], [0.03, -0.38], [0.034, -0.1], [0.035, 0.45], [0.032, 0.52], [0.024, 0.56], [0, 0.565]].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 14), m); g.add(body);
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 8, 20), m);
    eye.scale.set(0.62, 1.9, 0.9); eye.position.y = 0.64; g.add(eye);
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.15), new THREE.MeshBasicMaterial({ color: 0x1a1d24, side: THREE.DoubleSide }));
    hole.position.y = 0.64; g.add(hole);
    const shine = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.position.set(0.026, 0.05, 0.016); g.add(shine);
    const curve = new THREE.CatmullRomCurve3([[0, 0.64, -0.06], [0, 0.64, 0.06], [0.12, 0.5, 0.1], [0.24, 0.22, 0.02], [0.2, -0.08, -0.08], [0.3, -0.36, 0.02], [0.24, -0.6, 0.1]].map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }));
    const thread = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.012, 6, false), mat(0xff3b6b)); g.add(thread);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.64, -0.06), new THREE.Vector3(-0.08, 0.55, -0.1), new THREE.Vector3(-0.12, 0.42, -0.04)]), 12, 0.012, 6, false), mat(0xff3b6b)); g.add(tail);
    g.scale.setScalar(1.15);
    if (big) {
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("rgba(255,255,255,1)", "rgba(180,220,255,0.5)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.set(2.6, 2.6, 1); g.add(glow);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 30; g.add(beam);
      g.userData.beam = beam;
    }
    g.rotation.z = 0.5;
    return g;
  }

  let beam = null;
  const BEAM_COL = { hay: 0xffe14d, sell: 0x8aff8a, shop: 0x5cd6ff, needle: 0xff8ae2 };
  function setBeam(base, kind) {
    if (!base) { if (beam) beam.visible = false; return; }
    if (!beam) {
      beam = new THREE.Group();
      const m = new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 40, 18, 1, true), m);
      col.position.y = 20;
      beam.add(col);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 32), m.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      ring.material.opacity = 0.7;
      beam.add(ring);
      beam.userData.ring = ring;
      beam.renderOrder = 5;
      scene.add(beam);
    }
    beam.visible = true;
    beam.position.set(base.x, base.y || 0, base.z);
    const c = BEAM_COL[kind] || 0xffe14d;
    beam.children.forEach(function (o) { o.material.color.setHex(c); });
    const t = performance.now() / 1000;
    const s = 1 + Math.sin(t * 4) * 0.12;
    beam.userData.ring.scale.set(s, s, s);
  }

  let strawTex = null;
  function baleTex() {
    if (strawTex) return strawTex;
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    x.fillStyle = "#e8c050"; x.fillRect(0, 0, 64, 64);
    for (let q = 0; q < 140; q++) {
      x.strokeStyle = ["#fff0a8", "#c99a2e", "#f7d774", "#b8862a"][q % 4];
      x.lineWidth = 1 + (q % 3) * 0.5;
      const y = Math.random() * 64, sx = Math.random() * 64;
      x.beginPath(); x.moveTo(sx, y); x.lineTo(sx + 10 + Math.random() * 18, y + (Math.random() - 0.5) * 5); x.stroke();
    }
    strawTex = new THREE.CanvasTexture(c);
    return strawTex;
  }
  const baleCache = {};
  function makeBale(gold) {
    const key = gold ? "g" : "r";
    if (!baleCache[key]) {
      const c = document.createElement("canvas");
      c.width = 128; c.height = 64;
      const x = c.getContext("2d");
      x.drawImage(baleTex().image, 0, 0, 128, 64);
      x.fillStyle = gold ? "#8a3a12" : "#5a2a8a";
      x.fillRect(30, 0, 8, 64); x.fillRect(90, 0, 8, 64);
      const tex = new THREE.CanvasTexture(c);
      baleCache[key] = {
        geo: new THREE.BoxGeometry(0.62, 0.38, 0.4),
        mat: new THREE.MeshLambertMaterial({ map: tex, color: gold ? 0xffd84a : 0xff9ae6, emissive: gold ? 0x6a4800 : 0x4a1a46 })
      };
    }
    const b = baleCache[key];
    const m = new THREE.Mesh(b.geo, gold ? b.mat : b.mat.clone());
    m.castShadow = false;
    m.scale.setScalar(gold ? 1 : 0.85);
    m.userData.mat = m.material;
    return m;
  }

  function addPickup(kind, pos) {
    let mesh;
    if (kind === "needle") mesh = makeNeedle(true);
    else if (kind === "gold") mesh = makeBale(true);
    else mesh = makeBale(false);
    mesh.position.copy(pos);
    scene.add(mesh);
    const p = { kind: kind, mesh: mesh, vel: new THREE.Vector3((Math.random() - 0.5) * 3, 4 + Math.random() * 2, (Math.random() - 0.5) * 3), t: Math.random() * 5, rest: false };
    if (kind === "needle") p.vel.set(0, 4, 0);
    if (kind === "gold") p.vel.set(0, -6, 0);
    if (kind !== "needle") {
      let n = 0;
      for (let q = pickups.length - 1; q >= 0; q--) if (pickups[q].kind !== "needle" && ++n >= 30) { scene.remove(pickups[q].mesh); pickups.splice(q, 1); }
    }
    pickups.push(p);
    return p;
  }

  function updatePickups(dt) {
    for (let n = 0; n < pickups.length; n++) {
      const p = pickups[n];
      p.t += dt;
      const floor = Math.max(HH.Voxels.topAt(p.mesh.position.x, p.mesh.position.z), 0) + (p.kind === "needle" ? 1 : 0.25);
      if (!p.rest) {
        p.vel.y -= 12 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        if (p.mesh.position.y <= floor) { p.mesh.position.y = floor; p.rest = true; }
      } else {
        const target = floor + Math.sin(p.t * 3) * 0.14;
        p.mesh.position.y += (target - p.mesh.position.y) * Math.min(1, dt * 6);
      }
      p.mesh.rotation.y += dt * 2;
      p.mesh.visible = !(p.rest && HH.Voxels.fallingAt(p.mesh.position.x, p.mesh.position.z));
      if (p.kind === "rainbow" && p.mesh.userData.mat) p.mesh.userData.mat.color.setHSL((p.t * 0.5) % 1, 0.9, 0.7);
      if (p.mesh.userData.beam) p.mesh.userData.beam.material.opacity = 0.2 + Math.sin(p.t * 4) * 0.08;
    }
  }

  function removePickup(p) {
    scene.remove(p.mesh);
    const i = pickups.indexOf(p);
    if (i >= 0) pickups.splice(i, 1);
  }

  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.autoClear = false;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.08, 600);
    hemi = new THREE.HemisphereLight(0xffffff, 0x6a8a4a, 0.75);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff2d8, 0.95);
    sun.position.set(22, 40, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 110;
    sun.shadow.bias = -0.0006;
    scene.add(sun);
    scene.add(sun.target);
    initParticles();
    targetMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false }));
    targetMesh.visible = false;
    scene.add(targetMesh);
    vmScene = new THREE.Scene();
    vmCamera = new THREE.PerspectiveCamera(66, 1, 0.01, 10);
    vmScene.add(new THREE.HemisphereLight(0xffffff, 0x886644, 0.9));
    const vd = new THREE.DirectionalLight(0xffffff, 0.6); vd.position.set(1, 2, 1); vmScene.add(vd);
    vmScene.add(vmCamera);
    resize();
    window.addEventListener("resize", resize);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = vmCamera.aspect = w / h;
    camera.updateProjectionMatrix();
    vmCamera.updateProjectionMatrix();
  }

  function loadNPCs() {
    return Promise.all([
      character(HH.NPC.buyer.model, 2.2, /Mug/),
      character(HH.NPC.wizard.model, 2.0),
      character(HH.NPC.shop.model, 1.7, /mesh/)
    ]).then(function (r) {
      npc.buyer = r[0]; npc.wizard = r[1]; npc.shop = r[2];
      const b = label(HH.NPC.buyer.name, "#b6ff8a", null, 0.8); b.position.y = 3.1; npc.buyer.root.add(b);
      const w = label(HH.NPC.wizard.name, "#ffd0f0", null, 0.8); w.position.y = 2.9; npc.wizard.root.add(w);
      const s = label(HH.NPC.shop.name, "#ffe14d", null, 0.8); s.position.y = 2.4; npc.shop.root.add(s);
      npc.wizard.play("Spellcasting", 0);
      scene.add(npc.buyer.root); scene.add(npc.wizard.root); scene.add(npc.shop.root);
    });
  }

  function frame(dt, playerPos, fp, vm) {
    time += dt;
    chars.forEach(function (c) { c.mixer.update(dt); });
    if (windmill) windmill.userData.hub.rotation.z += dt * 0.8;
    updateVillagers(dt);
    clouds.forEach(function (c, q) { c.position.x += dt * (0.6 + (q % 3) * 0.2); if (c.position.x > 220) c.position.x = -220; });
    balloons.forEach(function (b) {
      const u = b.userData;
      u.a += dt * u.sp;
      b.position.set(Math.cos(u.a) * u.rad, u.h + Math.sin(time * 0.3 + u.rad) * 2, Math.sin(u.a) * u.rad);
    });
    birds.forEach(function (b) {
      const u = b.userData;
      if (u.base) {
        b.position.set(u.base.x + Math.sin(time * 0.7 + u.ph) * 0.8, u.base.y + Math.sin(time * 1.3 + u.ph) * 0.5, u.base.z + Math.cos(time * 0.6 + u.ph) * 0.8);
        b.material.opacity = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.5 + u.ph));
        return;
      }
      u.a += dt * 0.25;
      b.position.set(Math.cos(u.a) * u.rad, u.h + Math.sin(time + u.ph) * 0.8, Math.sin(u.a) * u.rad);
      b.rotation.y = -u.a;
      const f = Math.sin(time * 9 + u.ph) * 0.6;
      b.children[0].rotation.z = f; b.children[1].rotation.z = -f;
    });
    if (envGroup) ["sellRing", "shopRing", "gemsRing"].forEach(function (k) { const r = envGroup.userData[k]; if (r) r.material.opacity = 0.45 + Math.sin(time * 4) * 0.25; });
    if (envGroup && envGroup.userData.altarRing) envGroup.userData.altarRing.rotation.z += dt;
    sun.position.set(playerPos.x + 22, 40, playerPos.z + 14);
    sun.target.position.set(playerPos.x, 0, playerPos.z);
    updateParticles(dt, playerPos);
    updatePickups(dt);
    if (HH.Remote) HH.Remote.frame(dt);
    camera.getWorldDirection(tmpV);
    HH.Voxels.setViewer(camera.position, tmpV);
    if (extras) extras.children.forEach(function (o) { if (o.userData.spin) o.rotation.y += dt * o.userData.spin; });
    HH.Voxels.update(time, dt);
    shadowTick = (shadowTick + 1) % 4;
    if (shadowTick === 0) renderer.shadowMap.needsUpdate = true;
    renderer.clear();
    renderer.render(scene, camera);
    if (fp && vm) {
      renderer.clearDepth();
      renderer.render(vmScene, vmCamera);
    }
  }

  return {
    init: init, buildEnv: buildEnv, frame: frame, spawn: spawn, addPickup: addPickup, removePickup: removePickup, setQuality: setQuality, setLevelExtras: setLevelExtras, setWind: setWind,
    label: label, sph: sph, cyl: cyl, box: box, mat: mat, character: character, loadModel: loadModel, loadBuildings: loadBuildings, setBeam: setBeam, forget: function (ch) { const q = chars.indexOf(ch); if (q >= 0) chars.splice(q, 1); }, loadNPCs: loadNPCs, makeNeedle: makeNeedle,
    get scene() { return scene; }, get camera() { return camera; }, get renderer() { return renderer; },
    get vmScene() { return vmScene; }, get vmCamera() { return vmCamera; },
    get spots() { return spots; }, get pickups() { return pickups; }, get fenceR() { return fenceR; },
    get target() { return targetMesh; }, get npc() { return npc; },
    project: function (v) {
      tmpV.copy(v).project(camera);
      return { x: (tmpV.x * 0.5 + 0.5) * window.innerWidth, y: (-tmpV.y * 0.5 + 0.5) * window.innerHeight, vis: tmpV.z < 1 && tmpV.z > -1 };
    }
  };
})();

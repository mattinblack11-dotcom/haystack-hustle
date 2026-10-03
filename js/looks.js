HH.Looks = (function () {
  const CATS = ["chars", "hats", "faces", "gloves", "paints"];
  const KEY = { chars: "char", hats: "hat", faces: "face", gloves: "gloves", paints: "paint" };
  const DEF = { char: "male-e", hat: "none", face: "none", gloves: "none", paint: "classic" };

  function S() { return HH.Save.data; }
  function get() { return Object.assign({}, DEF, S().look || {}); }
  function item(cat, id) { return (HH.WARDROBE[cat] || []).find(function (x) { return x.id === id; }); }
  function owned(cat, id) {
    const it = item(cat, id);
    if (!it) return false;
    if (!it.cost) return true;
    return (S().owned || []).indexOf(cat + ":" + id) >= 0;
  }
  function sanitize(l) {
    const out = Object.assign({}, DEF);
    if (!l) return out;
    CATS.forEach(function (c) { const k = KEY[c]; if (l[k] && item(c, l[k])) out[k] = l[k]; });
    return out;
  }

  function lam(c, extra) { return new THREE.MeshLambertMaterial(Object.assign({ color: c }, extra || {})); }
  function mesh(geo, c, x, y, z) { const m = new THREE.Mesh(geo, typeof c === "number" ? lam(c) : c); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; return m; }

  function hatMesh(id) {
    const g = new THREE.Group();
    if (id === "straw") {
      g.add(mesh(new THREE.CylinderGeometry(0.85, 0.88, 0.06, 20), 0xe8c860, 0, 0.03));
      g.add(mesh(new THREE.CylinderGeometry(0.44, 0.5, 0.36, 16), 0xdcb850, 0, 0.22));
      g.add(mesh(new THREE.CylinderGeometry(0.505, 0.505, 0.09, 16), 0xc0392b, 0, 0.1));
    } else if (id === "cap") {
      const dome = mesh(new THREE.SphereGeometry(0.56, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0xd63031, 0, 0);
      dome.scale.y = 0.62; g.add(dome);
      const visor = mesh(new THREE.BoxGeometry(0.62, 0.05, 0.42), 0xb82424, 0, 0.02, 0.62); g.add(visor);
      g.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), 0xffffff, 0, 0.35));
    } else if (id === "cowboy") {
      const brim = mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.05, 20), 0x7a4a22, 0, 0.03); brim.scale.z = 0.85; g.add(brim);
      g.add(mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.48, 14), 0x8a5a2b, 0, 0.29));
      g.add(mesh(new THREE.CylinderGeometry(0.505, 0.505, 0.08, 14), 0x3b2412, 0, 0.11));
    } else if (id === "party") {
      g.add(mesh(new THREE.ConeGeometry(0.36, 0.9, 16), 0xff5cc8, 0, 0.45));
      g.add(mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.08, 16), 0x5cd6ff, 0, 0.36));
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.08, 16), 0xffe14d, 0, 0.64));
      g.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), 0xffe14d, 0, 0.92));
    } else if (id === "chef") {
      g.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.42, 16), 0xffffff, 0, 0.21));
      const puff = mesh(new THREE.SphereGeometry(0.6, 16, 10), 0xffffff, 0, 0.58); puff.scale.y = 0.55; g.add(puff);
    } else if (id === "beanie") {
      const dome = mesh(new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x3a7bd5, 0, 0); dome.scale.y = 0.7; g.add(dome);
      for (let q = 0; q < 4; q++) { const s = mesh(new THREE.SphereGeometry(0.555, 16, 10, q * Math.PI / 2, Math.PI / 4, 0, Math.PI / 2), 0xffd23f); s.scale.y = 0.7; g.add(s); }
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6), 0x333333, 0, 0.48));
      const prop = new THREE.Group(); prop.position.y = 0.6;
      prop.add(mesh(new THREE.BoxGeometry(0.8, 0.02, 0.12), 0xff3b6b));
      prop.add(mesh(new THREE.BoxGeometry(0.12, 0.02, 0.8), 0x5cd65c));
      g.add(prop);
      g.userData.spin = prop;
    } else if (id === "tophat") {
      g.add(mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.05, 20), 0x1c1c22, 0, 0.03));
      g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.72, 18), 0x1c1c22, 0, 0.4));
      g.add(mesh(new THREE.CylinderGeometry(0.425, 0.425, 0.1, 18), 0x8e2a2a, 0, 0.12));
    } else if (id === "viking") {
      const dome = mesh(new THREE.SphereGeometry(0.58, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x9aa0a8, 0, -0.04); dome.scale.y = 0.8; g.add(dome);
      g.add(mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 18), 0x6d4a2a, 0, 0.0));
      [-1, 1].forEach(function (s) {
        const horn = mesh(new THREE.ConeGeometry(0.11, 0.55, 10), 0xf4ead2, s * 0.62, 0.3);
        horn.rotation.z = -s * 0.9;
        g.add(horn);
      });
    } else if (id === "crown") {
      const gold = lam(0xffd23f, { emissive: 0x553800 });
      g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.26, 10, 1, true), gold, 0, 0.13));
      for (let q = 0; q < 5; q++) {
        const a = q / 5 * Math.PI * 2;
        const sp = mesh(new THREE.ConeGeometry(0.11, 0.26, 6), gold, Math.sin(a) * 0.46, 0.38, Math.cos(a) * 0.46);
        g.add(sp);
        g.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), [0xff3b6b, 0x5cd6ff, 0x5cd65c, 0xb36bff, 0xff9a3d][q], Math.sin(a) * 0.5, 0.14, Math.cos(a) * 0.5));
      }
    } else return null;
    return g;
  }

  function dress(ch, look) {
    look = sanitize(look);
    const model = ch.model;
    const head = model.getObjectByName("head");
    const headMesh = model.getObjectByName("head-mesh");
    if (!head || !headMesh) return Promise.resolve(ch);
    if (ch.extras) ch.extras.forEach(function (o) { if (o.parent) o.parent.remove(o); });
    ch.extras = [];
    ch.root.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(headMesh);
    const inv = new THREE.Matrix4().copy(ch.root.matrixWorld).invert();
    bb.applyMatrix4(inv);
    const w = Math.max(0.2, bb.max.x - bb.min.x);
    const hat = hatMesh(look.hat);
    if (hat) {
      hat.scale.setScalar(w * 0.92);
      hat.position.set((bb.min.x + bb.max.x) / 2, bb.max.y - w * 0.2, (bb.min.z + bb.max.z) / 2);
      ch.root.add(hat);
      ch.root.updateMatrixWorld(true);
      head.attach(hat);
      ch.extras.push(hat);
      ch.spin = hat.userData.spin || null;
    } else ch.spin = null;
    const face = item("faces", look.face);
    if (face && face.model) {
      return HH.World.loadModel(face.model).then(function (gltf) {
        const g = gltf.scene.clone(true);
        g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; if (o.material && o.material.map) { o.material.map.encoding = THREE.LinearEncoding; } } });
        const gb = new THREE.Box3().setFromObject(g);
        const gw = Math.max(0.001, gb.max.x - gb.min.x);
        const k = w * 0.86 / gw;
        const gc = gb.getCenter(new THREE.Vector3());
        g.scale.setScalar(k);
        g.position.set((bb.min.x + bb.max.x) / 2 - gc.x * k, bb.min.y + (bb.max.y - bb.min.y) * 0.4 - gc.y * k, bb.max.z + (gb.max.z - gb.min.z) * k * 0.15 - gc.z * k);
        ch.root.add(g);
        ch.root.updateMatrixWorld(true);
        head.attach(g);
        ch.extras.push(g);
        return ch;
      }).catch(function () { return ch; });
    }
    return Promise.resolve(ch);
  }

  function build(look, height) {
    look = sanitize(look);
    const c = item("chars", look.char) || HH.WARDROBE.chars[0];
    return HH.World.character(c.model, height || 1.75, /mesh/, true)
      .catch(function () { return HH.World.character("Guy", height || 1.75, /mesh/, true); })
      .then(function (ch) { return dress(ch, look); });
  }

  let pv = null;
  function preview(canvas) {
    stopPreview();
    if (!canvas) return;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); } catch (e) { return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(canvas.clientWidth || 220, canvas.clientHeight || 280, false);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6a3a, 1.0));
    const d = new THREE.DirectionalLight(0xffffff, 0.7); d.position.set(2, 3, 2); scene.add(d);
    const cam = new THREE.PerspectiveCamera(32, (canvas.clientWidth || 220) / (canvas.clientHeight || 280), 0.1, 30);
    cam.position.set(0, 1.25, 4.4);
    cam.lookAt(0, 0.95, 0);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.08, 28), new THREE.MeshLambertMaterial({ color: 0xe8c860 }));
    disc.position.y = -0.04;
    scene.add(disc);
    const state = { renderer: renderer, scene: scene, cam: cam, ch: null, raf: 0, t: 0, key: "", alive: true, last: performance.now() };
    pv = state;
    function loop() {
      if (!state.alive) return;
      const now = performance.now(), dt = Math.min(0.05, (now - state.last) / 1000);
      state.last = now;
      state.t += dt;
      if (state.ch) {
        state.ch.root.rotation.y = Math.sin(state.t * 0.6) * 0.7;
        state.ch.mixer.update(dt);
        if (state.ch.spin) state.ch.spin.rotation.y += dt * 10;
      }
      renderer.render(scene, cam);
      state.raf = requestAnimationFrame(loop);
    }
    loop();
  }
  function showOnPreview(look) {
    if (!pv) return;
    const st = pv;
    const key = JSON.stringify(sanitize(look));
    if (key === st.key) return;
    st.key = key;
    build(look, 1.7).then(function (ch) {
      HH.World.forget(ch);
      if (!st.alive || st.key !== key) return;
      if (st.ch) st.scene.remove(st.ch.root);
      st.ch = ch;
      st.scene.add(ch.root);
      ch.play("idle");
    }).catch(function () {});
  }
  function stopPreview() {
    if (!pv) return;
    pv.alive = false;
    cancelAnimationFrame(pv.raf);
    try { pv.renderer.dispose(); if (pv.renderer.forceContextLoss) pv.renderer.forceContextLoss(); } catch (e) {}
    pv = null;
  }

  return {
    CATS: CATS, KEY: KEY, get: get, item: item, owned: owned, sanitize: sanitize, build: build, dress: dress, hatMesh: hatMesh,
    preview: preview, showOnPreview: showOnPreview, stopPreview: stopPreview,
    get previewing() { return !!pv; }
  };
})();

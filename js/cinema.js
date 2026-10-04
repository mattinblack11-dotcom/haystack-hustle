HH.Cinema = (function () {
  const SIZES = { landscape: [1920, 1080], portrait: [1080, 1620] };
  const LEN = 20;
  let on = false, mode = "landscape", record = false, t = 0, bots = [], s = null, out = null, octx = null, rec = null, chunks = [], digT = 0, needleShown = false, done = false;

  function V3(x, y, z) { return new THREE.Vector3(x, y, z); }

  function setup() {
    const G = HH.Game, W = HH.World, V = HH.Voxels;
    HH.Save.data.tutorial = 5;
    HH.Save.data.settings.tutorial = false;
    document.body.classList.add("cinema");
    HH.Audio.setHidden(true);
    G.startLevel(2);
    W.setBeam(null);
    W.vmScene.visible = false;
    V.setTufts(false);
    W.pickups.slice().forEach(function (p) { W.removePickup(p); });
    const ext = V.extent, top = V.topAt(0, 0);
    [[2.2, 1.5], [-2.6, 2.4], [1.2, -2.8], [-1.4, 4.2], [3.4, 3.6], [-3, -2]].forEach(function (q) {
      W.addPickup("gold", V3(q[0], V.topAt(q[0], q[1]) + 0.5, q[1]));
    });
    const looks = [{ char: "male-e", hat: "straw" }, { char: "female-b", hat: "cap" }, { char: "male-a", hat: "cowboy" }, { char: "female-c", hat: "none" }];
    const tools = ["fork", "vac", "fork", "tnt"];
    bots = looks.map(function (look, i) {
      const id = "cine" + i;
      HH.Remote.setLook(id, look);
      const a = HH.Remote.ensure(id, "");
      a.root.scale.setScalar(1.35);
      a.root.traverse(function (o) { if (o.isMesh && o.geometry && o.geometry.type === "RingGeometry") o.visible = false; });
      return { id: id, a: a, ang: Math.PI * 0.5 + (i - 1.5) * 0.32, tool: tools[i], sw: 0 };
    });
    W.scene.traverse(function (o) {
      if (o.isSprite && o.material && (o.material.depthTest === false || o.userData.label)) o.visible = false;
      if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.radiusTop === 0.12 && o.geometry.parameters.radiusBottom === 0.16) o.visible = false;
    });
    s = { ext: ext, top: top };
    const path = [
      V3(ext * 2.6, top * 1.6 + 6, ext * 2.6), V3(ext * 0.4, top * 1.0 + 3, ext * 2.3), V3(ext * 0.15, 2.4, ext * 1.55),
      V3(-ext * 1.7, top * 0.7 + 2, -ext * 0.2), V3(-ext * 0.9, top * 0.9 + 3, -ext * 1.7), V3(ext * 1.2, top * 1.0 + 3, -ext * 1.5),
      V3(ext * 1.5, top * 0.8 + 2, ext * 0.6), V3(ext * 0.7, top * 1.25 + 2, ext * 0.7)
    ];
    const look = [
      V3(0, top * 0.5, 0), V3(0, top * 0.4, 0), V3(0, 1.2, ext * 0.9),
      V3(0, top * 0.4, 0), V3(0, top * 0.5, 0), V3(0, top * 0.45, 0),
      V3(0, top * 0.7, 0), V3(0, top + 1.5, 0)
    ];
    s.cam = new THREE.CatmullRomCurve3(path, false, "centripetal");
    s.tgt = new THREE.CatmullRomCurve3(look, false, "centripetal");
  }

  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  function botTick(dt) {
    const V = HH.Voxels, W = HH.World, G = HH.Game;
    digT -= dt;
    bots.forEach(function (b, i) {
      b.ang += dt * 0.02 * (i % 2 ? -1 : 1);
      const r = s.ext * 0.97;
      const x = Math.cos(b.ang) * r, z = Math.sin(b.ang) * r;
      const y = 0;
      if (digT <= 0) {
        b.sw++;
        const tp = V3(x * 0.86, Math.max(0.6, Math.min(2.2, V.topAt(x * 0.86, z * 0.86) * 0.5)), z * 0.86);
        const cells = V.nearest(tp, 0.9, 26).map(function (c) { return c.c; });
        if (cells.length) {
          V.removeCells(cells);
          for (let q = 0; q < 14; q++) W.spawn(tp.clone().add(V3((Math.random() - 0.5) * 0.8, Math.random() * 0.6, (Math.random() - 0.5) * 0.8)), V3((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3), q % 4 ? 0xf2c94c : 0xffe08a, "suck", 1.6, b.a.root.position);
        }
      }
      HH.Remote.setState(b.id, { p: [x, y, z], y: Math.atan2(-x, -z) + Math.PI, tl: b.tool, v: b.tool === "vac" ? 1 : 0, sw: b.sw, c: 0, n: G.run.nonce }, "");
    });
    if (digT <= 0) digT = 0.32;
  }

  function title(ctx, w, h, alpha) {
    if (alpha <= 0) return;
    const port = mode === "portrait";
    const lines = port ? ["HAYSTACK", "HUSTLE"] : ["HAYSTACK HUSTLE"];
    const size = port ? 170 : 160;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = size + "px \"Lilita One\", \"Arial Black\", sans-serif";
    lines.forEach(function (tx, i) {
      const y = h * (port ? 0.12 : 0.16) + i * size * 0.98;
      ctx.save();
      ctx.translate(w / 2, y);
      ctx.rotate(-0.035);
      ctx.lineJoin = "round";
      ctx.fillStyle = "rgba(60,30,8,0.55)";
      ctx.fillText(tx, 7, 12);
      ctx.lineWidth = size * 0.16;
      ctx.strokeStyle = "#5e3412";
      ctx.strokeText(tx, 0, 0);
      const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
      g.addColorStop(0, "#fff7d1"); g.addColorStop(0.55, "#ffd95e"); g.addColorStop(1, "#f0a830");
      ctx.fillStyle = g;
      ctx.fillText(tx, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }

  function startRecording() {
    if (!out.captureStream || !window.MediaRecorder) { record = false; return; }
    const stream = out.captureStream(30);
    const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const type = types.find(function (x) { return MediaRecorder.isTypeSupported(x); }) || "";
    rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 14000000 } : undefined);
    chunks = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = function () {
      const blob = new Blob(chunks, { type: "video/webm" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "haystack-hustle-" + mode + ".webm";
      document.body.appendChild(a);
      a.click();
      const n = document.getElementById("cinema-note");
      if (n) n.textContent = "Saved " + a.download + " to your Downloads folder.";
    };
    rec.start(500);
  }

  function tick(dt) {
    if (!on || done) return;
    const W = HH.World, r = W.renderer, cam = W.camera;
    if (!s) return;
    t += dt;
    const k = Math.min(1, t / LEN), e = ease(k);
    const size = SIZES[mode];
    r.setPixelRatio(1);
    r.setSize(size[0], size[1], false);
    cam.aspect = size[0] / size[1];
    cam.fov = mode === "portrait" ? 66 : 55;
    cam.updateProjectionMatrix();
    cam.position.copy(s.cam.getPoint(e));
    cam.lookAt(s.tgt.getPoint(e));
    botTick(dt);
    if (!needleShown && t > LEN - 4.5) {
      needleShown = true;
      const p = V3(0, HH.Voxels.topAt(0, 0) + 1.2, 0);
      const nd = W.addPickup("needle", p);
      if (nd && nd.mesh) nd.mesh.scale.setScalar(2.4);
      for (let q = 0; q < 60; q++) W.spawn(p.clone(), V3((Math.random() - 0.5) * 9, 4 + Math.random() * 6, (Math.random() - 0.5) * 9), q % 3 ? 0xf2c94c : 0xff8ae2, "debris", 2.2);
    }
    W.frame(dt, cam.position, false, false);
    octx.drawImage(r.domElement, 0, 0, size[0], size[1]);
    title(octx, size[0], size[1], t < 2.2 ? 1 : 1 - (t - 2.2) / 0.6);
    if (t >= LEN) {
      done = true;
      if (rec && rec.state === "recording") setTimeout(function () { rec.stop(); }, 300);
    }
  }

  function start(m, rc) {
    mode = SIZES[m] ? m : "landscape";
    record = !!rc;
    on = true;
    setup();
    const size = SIZES[mode];
    out = document.createElement("canvas");
    out.width = size[0]; out.height = size[1];
    out.id = "cinema-out";
    document.body.appendChild(out);
    octx = out.getContext("2d");
    const note = document.createElement("div");
    note.id = "cinema-note";
    note.textContent = record ? "Recording a " + LEN + "s " + mode + " video... keep this tab open." : "Cinematic mode";
    document.body.appendChild(note);
    t = 0;
    if (record) startRecording();
  }

  return { start: start, tick: tick, get active() { return on; } };
})();

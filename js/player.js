HH.Player = (function () {
  const HW = 0.3, HT = 1.75, BASE_SPEED = 6.2, BASE_JUMP = 8, GRAV = 24;
  const pos = new THREE.Vector3(), vel = new THREE.Vector3();
  let onGround = false, yaw = 0, pitch = -0.15;
  let vm = null, arms = null, vmTools = {}, vmNeedle = null, fistStraw = null, fallback = null;
  let bobT = 0, swingT = 0, swingKind = "", swingSide = 1, curTool = "hand", sprinting = false, vacOn = false, carrying = false, lifeT = 0;
  const V = HH.Voxels;
  const cur = { R: null, L: null };

  function hits(x, y, z) { return V.boxHits(x - HW, y, z - HW, x + HW, y + HT, z + HW); }

  function v3(x, y, z) { return new THREE.Vector3(x, y, z); }
  function nrm(x, y, z) { return new THREE.Vector3(x, y, z).normalize(); }

  function toolMesh(id) {
    const W = HH.World;
    const g = new THREE.Group();
    const metal = 0xc9ced8;
    if (id === "fork") {
      const handle = W.cyl(0.017, 0.019, 0.9, 0x9a6634, 10); handle.position.y = 0.39; handle.userData.role = "wood"; g.add(handle);
      const cap = W.cyl(0.022, 0.022, 0.03, 0x5a3a1c, 10); cap.position.y = -0.07; g.add(cap);
      const ferrule = W.cyl(0.024, 0.02, 0.08, metal, 10); ferrule.position.y = 0.84; ferrule.userData.role = "metal"; g.add(ferrule);
      const bar = W.box(0.3, 0.032, 0.032, metal); bar.position.y = 0.885; bar.userData.role = "metal"; g.add(bar);
      [-0.11, -0.037, 0.037, 0.11].forEach(function (x, n) {
        const t = W.cyl(0.007, 0.013, 0.36, metal, 6);
        t.position.set(x, 1.06, -0.06);
        t.rotation.x = -0.32;
        t.rotation.z = (n - 1.5) * -0.03;
        t.userData.role = "metal";
        g.add(t);
      });
    } else if (id === "tnt") {
      [[0, 0], [-0.064, 0], [-0.032, -0.052]].forEach(function (q) { const s = W.cyl(0.031, 0.031, 0.27, 0xd63031, 10); s.position.set(q[0], 0.03, q[1]); g.add(s); });
      const band = W.box(0.13, 0.04, 0.115, 0x2b2b2b); band.position.set(-0.032, 0.11, -0.022); g.add(band);
      const fuse = W.cyl(0.006, 0.006, 0.12, 0x333333, 4); fuse.position.set(-0.032, 0.22, -0.022); fuse.rotation.z = 0.25; g.add(fuse);
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd23f })); spark.position.set(-0.048, 0.28, -0.022); g.add(spark);
      g.userData.spark = spark;
    } else if (id === "vac") {
      const grip = W.cyl(0.019, 0.019, 0.17, 0x2d2d33, 8); grip.position.y = 0.0; g.add(grip);
      const brace = W.box(0.03, 0.03, 0.09, 0x2d2d33); brace.position.set(0, 0.09, 0.045); g.add(brace);
      const tank = W.cyl(0.07, 0.07, 0.3, 0xe05cb0, 16); tank.position.set(0, 0.26, 0.085); tank.userData.role = "body"; g.add(tank);
      const stripe = W.cyl(0.073, 0.073, 0.045, 0xffffff, 16); stripe.position.set(0, 0.26, 0.085); g.add(stripe);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), W.mat(0xe05cb0)); dome.rotation.x = Math.PI; dome.position.set(0, 0.11, 0.085); dome.userData.role = "body"; g.add(dome);
      const nozzle = W.cyl(0.035, 0.06, 0.34, 0x55575e, 12); nozzle.position.set(0, 0.58, 0.085); g.add(nozzle);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.033, 14), new THREE.MeshBasicMaterial({ color: 0x66ccff })); glow.position.set(0, 0.752, 0.085); glow.rotation.x = -Math.PI / 2; g.add(glow);
      g.userData.glow = glow;
    } else if (id === "tornado") {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.2, 14), new THREE.MeshPhongMaterial({ color: 0xaaddff, transparent: true, opacity: 0.45, shininess: 100 })); jar.position.y = 0.07; g.add(jar);
      const lid = W.cyl(0.062, 0.062, 0.035, 0x8b5a2b, 14); lid.position.y = 0.185; g.add(lid);
      const swirl = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xf2e6c0, wireframe: true })); swirl.rotation.x = Math.PI; swirl.position.y = 0.08; g.add(swirl);
      g.userData.swirl = swirl;
    } else if (id === "hole") {
      const stick = W.cyl(0.016, 0.018, 0.26, 0x3a2a4a, 8); stick.position.y = 0.04; g.add(stick);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: 0x000000 })); orb.position.y = 0.23; g.add(orb);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 6, 28), new THREE.MeshBasicMaterial({ color: 0xb36bff })); ring.rotation.x = Math.PI / 2.3; ring.position.y = 0.23; g.add(ring);
      g.userData.swirl = ring;
    }
    g.visible = false;
    return g;
  }

  function hold(p, f, s, c, extra) {
    return Object.assign({ p: p, f: f, s: s, c: c }, extra || {});
  }

  function shaftPose(G, T, lt, kind) {
    const dir = T.clone().sub(G).normalize();
    const back = dir.clone().negate();
    const out = { tool: { p: G, a: dir } };
    out.R = hold(G, nrm(-1, -0.2, 0), back, 1);
    if (kind === "vac") {
      const side = new THREE.Vector3(1, 0, 0).sub(dir.clone().multiplyScalar(dir.x)).normalize();
      const up = new THREE.Vector3().crossVectors(side, dir);
      const under = G.clone().add(dir.clone().multiplyScalar(0.27)).add(up.multiplyScalar(0.012));
      out.L = hold(under, nrm(1, 0.35, 0), dir.clone(), 0.55, { lift: 0.01, reach: 0.6, thumb: 0.15 });
    } else {
      out.L = hold(G.clone().add(dir.clone().multiplyScalar(lt)), nrm(1, 0, 0), back.clone(), 1);
    }
    return out;
  }

  function target() {
    const s = Math.sin(Math.min(1, swingT) * Math.PI);
    const breathe = Math.sin(lifeT * 1.7) * 0.004;
    let o;
    if (curTool === "fork") {
      const k = swingKind === "fork" ? s : 0;
      o = shaftPose(v3(0.2 - 0.03 * k, -0.21 - 0.01 * k + breathe, -0.4 - 0.22 * k), v3(-0.04, -0.33 - 0.1 * k, -1.2 - 0.25 * k), 0.25);
    } else if (curTool === "vac") {
      const j = vacOn ? (Math.random() - 0.5) * 0.004 : 0;
      o = shaftPose(v3(0.2 + j, -0.21 + j + breathe, -0.4), v3(0.02, -0.28, -1.6), 0, "vac");
    } else if (curTool === "tnt" || curTool === "tornado" || curTool === "hole") {
      const k = (swingKind === "tnt" || swingKind === "tornado") ? s : 0;
      const a = nrm(0.12 - 0.1 * k, 1, 0.22 - 0.9 * k);
      const P = v3(0.19 - 0.05 * k, -0.17 + 0.12 * k + breathe, -0.45 - 0.16 * k);
      const lift = curTool === "tornado" ? 0.05 : curTool === "tnt" ? 0.045 : 0.034;
      o = { tool: { p: P, a: a } };
      o.R = hold(P, nrm(-0.35, 0, -1), a.clone(), 0.95, { lift: lift });
      o.L = hold(v3(-0.21, -0.3 + breathe, -0.5), nrm(0.25, 0.2, -1), nrm(0, 1, 0), 0.35);
    } else if (curTool === "hand") {
      o = { tool: null };
      ["R", "L"].forEach(function (S) {
        const sd = S === "R" ? 1 : -1;
        const active = swingKind === "hand" && (swingSide > 0) === (S === "R") && !(S === "L" && carrying);
        const k = active ? s : 0;
        const p = v3(0.2 * sd - 0.07 * sd * k, -0.24 + 0.06 * k + breathe, -0.48 - 0.24 * k);
        o[S] = hold(p, nrm(-0.12 * sd, 0.12, -1), nrm(0, 1, 0), active ? 0.4 + 0.6 * Math.min(1, (1 - swingT) * 3 + s) : 0.42, { lift: 0.025 });
      });
    } else {
      o = { tool: null };
      o.R = hold(v3(0.22, -0.31 + breathe, -0.5), nrm(-0.1, -0.1, -1), nrm(0, 1, 0), 0.3);
      o.L = hold(v3(-0.22, -0.31 + breathe, -0.5), nrm(0.1, -0.1, -1), nrm(0, 1, 0), 0.3);
    }
    if (carrying) o.L = hold(v3(-0.17, -0.18 + breathe, -0.5), nrm(0.3, 0, -1), nrm(0.25, 1, -0.2), 0.95, { lift: 0.03 });
    return o;
  }

  function copyHold(h) { return { p: h.p.clone(), f: h.f.clone(), s: h.s.clone(), c: h.c, lift: h.lift, reach: h.reach, thumb: h.thumb }; }

  function blend(a, b, k) {
    a.p.lerp(b.p, k);
    a.f.lerp(b.f, k).normalize();
    a.s.lerp(b.s, k).normalize();
    a.c += (b.c - a.c) * k;
    a.lift = a.lift === undefined || b.lift === undefined ? b.lift : a.lift + (b.lift - a.lift) * k;
    a.reach = b.reach;
    a.thumb = b.thumb;
  }

  function placeTool(m, p, a) {
    const y = a.clone().normalize();
    let x = new THREE.Vector3(1, 0, 0);
    x.sub(y.clone().multiplyScalar(x.dot(y)));
    if (x.lengthSq() < 1e-4) x.set(0, 0, 1);
    x.normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    m.position.copy(p);
  }

  function applyPose(k) {
    const t = target();
    ["R", "L"].forEach(function (S) {
      if (!cur[S]) cur[S] = copyHold(t[S]);
      else blend(cur[S], t[S], k);
    });
    if (arms) arms.pose({ R: cur.R, L: cur.L });
    else if (fallback) fallback.children.forEach(function (f) { f.position.copy(cur[f.userData.side].p); });
    const m = vmTools[curTool];
    if (m && t.tool) {
      const p = cur.R.p.clone();
      const a = curTool === "fork" || curTool === "vac" ? cur.R.s.clone().negate() : cur.R.s.clone();
      placeTool(m, p, a);
    }
    if (vmNeedle) placeTool(vmNeedle, cur.L.p, cur.L.s);
  }

  function makeFallback() {
    const g = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: 0xe8b090 });
    ["R", "L"].forEach(function (S) {
      const fist = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), skin);
      fist.scale.set(1, 0.85, 1.25);
      fist.userData.side = S;
      g.add(fist);
    });
    return g;
  }

  function build(scene) {
    vm = new THREE.Group();
    try {
      arms = HH.Arms.create();
      vm.add(arms.root);
    } catch (e) {
      console.warn("arms", e);
      arms = null;
      fallback = makeFallback();
      vm.add(fallback);
    }
    ["fork", "tnt", "vac", "tornado", "hole"].forEach(function (id) {
      const m = toolMesh(id);
      vmTools[id] = m;
      vm.add(m);
    });
    vmNeedle = new THREE.Group();
    const nd = HH.World.makeNeedle(false);
    nd.rotation.set(0, 0, 0);
    nd.scale.setScalar(0.28);
    vmNeedle.add(nd);
    vmNeedle.visible = false;
    vm.add(vmNeedle);
    fistStraw = new THREE.Group();
    for (let q = 0; q < 7; q++) {
      const s = HH.World.box(0.008, 0.008, 0.09, q % 2 ? 0xf2c94c : 0xffe08a);
      s.rotation.set((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2, 0);
      s.position.set((Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.03);
      fistStraw.add(s);
    }
    fistStraw.visible = false;
    vm.add(fistStraw);
    HH.World.vmScene.add(vm);
    applyLook();
    applyPose(1);
    return Promise.resolve();
  }

  function applyLook() {
    const L = HH.Looks.get();
    const c = HH.Looks.item("chars", L.char) || {};
    const gl = HH.Looks.item("gloves", L.gloves) || {};
    const pt = HH.Looks.item("paints", L.paint) || HH.WARDROBE.paints[0];
    if (arms) arms.setLook({ skin: c.skin || null, sleeve: c.sleeve || null, glove: gl.color || null });
    Object.keys(vmTools).forEach(function (k) {
      vmTools[k].traverse(function (o) {
        if (o.isMesh && o.userData.role && pt[o.userData.role] !== undefined) o.material.color.setHex(pt[o.userData.role]);
      });
    });
  }

  function spawn(p) {
    pos.copy(p); vel.set(0, 0, 0);
    yaw = Math.atan2(p.x, p.z);
    pitch = -0.12;
  }

  function moveAxis(axis, amt) {
    if (amt === 0) return;
    const nx = axis === "x" ? pos.x + amt : pos.x;
    const nz = axis === "z" ? pos.z + amt : pos.z;
    if (!hits(nx, pos.y, nz)) { pos.x = nx; pos.z = nz; return; }
    const step = HH.VS * 1.05;
    if (onGround || vel.y <= 0) {
      const h = hits(nx, pos.y, nz);
      const ny = h ? (h.j + 1) * HH.VS : pos.y + step;
      if (ny - pos.y <= step + 0.01 && !hits(nx, ny, nz)) { pos.x = nx; pos.z = nz; pos.y = ny; return; }
    }
    if (axis === "x") vel.x = 0; else vel.z = 0;
  }

  function update(dt, I, frozen, mods) {
    const m = I.takeMouse();
    const st = HH.Save.data.settings;
    const sens = 0.0022 * (st.sens || 1);
    yaw -= m.dx * sens;
    pitch -= m.dy * sens * (st.invertY ? -1 : 1);
    pitch = Math.max(-1.5, Math.min(1.45, pitch));

    let fx = 0, fz = 0;
    if (!frozen) {
      if (I.down("KeyW") || I.down("ArrowUp")) fz += 1;
      if (I.down("KeyS") || I.down("ArrowDown")) fz -= 1;
      if (I.down("KeyA") || I.down("ArrowLeft")) fx -= 1;
      if (I.down("KeyD") || I.down("ArrowRight")) fx += 1;
    }
    const len = Math.hypot(fx, fz) || 1;
    const sy = Math.sin(yaw), cy = Math.cos(yaw);
    const wx = (-sy * fz + cy * fx) / len, wz = (-cy * fz - sy * fx) / len;
    const moving = fx !== 0 || fz !== 0;
    sprinting = moving && mods.sprint > 0 && (I.down("ShiftLeft") || I.down("ShiftRight"));
    const speed = BASE_SPEED * mods.speed * (sprinting ? 1.25 + 0.15 * mods.sprint : 1);
    const k = Math.min(1, dt * (onGround ? 14 : 5));
    vel.x += ((moving ? wx * speed : 0) - vel.x) * k;
    vel.z += ((moving ? wz * speed : 0) - vel.z) * k;

    if (!frozen && onGround && I.consume("Space")) { vel.y = BASE_JUMP * mods.jump; onGround = false; HH.Audio.play("jump"); }
    const hovering = !frozen && mods.hover && !onGround && vel.y < 0 && I.down("Space");

    let rem = dt;
    while (rem > 0) {
      const h = Math.min(rem, 1 / 120);
      rem -= h;
      vel.y = Math.max(vel.y - GRAV * h, hovering ? -2 : -30);
      moveAxis("x", vel.x * h);
      moveAxis("z", vel.z * h);
      const ny = pos.y + vel.y * h;
      onGround = false;
      if (vel.y <= 0) {
        if (ny <= 0) { pos.y = 0; vel.y = 0; onGround = true; }
        else {
          const hit = hits(pos.x, ny, pos.z);
          if (hit) { pos.y = (hit.j + 1) * HH.VS; vel.y = 0; onGround = true; }
          else pos.y = ny;
        }
      } else if (hits(pos.x, ny, pos.z)) vel.y = 0; else pos.y = ny;
      if (hits(pos.x, pos.y, pos.z)) pos.y += HH.VS * 0.5;
      const r = Math.hypot(pos.x, pos.z), lim = HH.World.fenceR - 0.6;
      if (r > lim) { pos.x *= lim / r; pos.z *= lim / r; }
    }
    if (pos.y < -5) pos.copy(HH.World.spots.spawn).setY(2);

    const sp = Math.hypot(vel.x, vel.z);
    const dir = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const cam = HH.World.camera;
    bobT += dt * sp * (onGround ? 1.6 : 0);
    const bob = Math.sin(bobT * 2) * 0.04 * Math.min(1, sp / 6);
    cam.position.set(pos.x, pos.y + 1.62 + bob, pos.z);
    cam.lookAt(cam.position.clone().add(dir));
    const fov = sprinting ? 84 : 75;
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 8); cam.updateProjectionMatrix(); }

    swingT = Math.max(0, swingT - dt * 4.5);
    vm.position.set(Math.sin(bobT) * 0.012, Math.abs(Math.cos(bobT)) * 0.012 - (sprinting ? 0.03 : 0), 0);
    vm.rotation.set(pitch * 0.04, 0, Math.sin(bobT) * 0.01);
    applyPose(Math.min(1, dt * 14));
    lifeT += dt;
    const sideHold = swingSide > 0 ? cur.R : cur.L;
    fistStraw.visible = curTool === "hand" && swingKind === "hand" && swingT > 0.05;
    if (fistStraw.visible && sideHold) fistStraw.position.copy(sideHold.p);
    const t = vmTools[curTool];
    if (t && t.userData.spark) t.userData.spark.visible = Math.random() < 0.7;
    if (t && t.userData.swirl) t.userData.swirl.rotation.y += dt * 12;
  }

  function aimRay(I) {
    const ndc = new THREE.Vector2(0, 0);
    if (!I.locked) {
      ndc.x = (I.mouse.x / innerWidth) * 2 - 1;
      ndc.y = -(I.mouse.y / innerHeight) * 2 + 1;
    }
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, HH.World.camera);
    return rc.ray;
  }

  function setVisual(tool, fill, carry, vac) {
    curTool = tool;
    carrying = !!carry;
    vacOn = !!vac;
    Object.keys(vmTools).forEach(function (k) { vmTools[k].visible = k === tool; });
    if (vmTools.vac) vmTools.vac.userData.glow.material.color.setHex(vacOn ? 0xff66cc : 0x66ccff);
    vmNeedle.visible = carrying;
  }

  function swing(kind) {
    swingT = 1;
    swingKind = kind;
    if (kind === "hand") {
      swingSide = -swingSide;
      if (carrying && swingSide < 0) swingSide = 1;
    }
  }

  return {
    build: build, spawn: spawn, update: update, aimRay: aimRay, setVisual: setVisual, swing: swing, applyLook: applyLook,
    get pos() { return pos; },
    get yaw() { return yaw; },
    push: function (dx, dz) { moveAxis("x", dx); moveAxis("z", dz); },
    get head() { return new THREE.Vector3(pos.x, pos.y + 1.55, pos.z); },
    get fp() { return true; },
    get onGround() { return onGround; },
    cheer: function () { swing("tnt"); }
  };
})();

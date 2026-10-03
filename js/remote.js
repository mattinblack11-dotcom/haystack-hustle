HH.Remote = (function () {
  const avatars = new Map();
  const pendingLook = new Map();
  const COLORS = [0x5cc8ff, 0xff7a8a, 0x8aff8a, 0xffd23f, 0xb38cff, 0xff9a3d, 0x7ff7ff];

  function toolProp(id) {
    const W = HH.World;
    const g = new THREE.Group();
    if (id === "fork") {
      const h = W.cyl(0.03, 0.03, 1.4, 0x9a6634, 6); h.rotation.x = Math.PI / 2; h.position.z = 0.5; h.userData.role = "wood"; g.add(h);
      const t = W.box(0.3, 0.04, 0.3, 0xc0c4cc); t.position.z = 1.2; t.userData.role = "metal"; g.add(t);
    } else if (id === "vac") {
      const t = W.cyl(0.12, 0.12, 0.4, 0xe05cb0, 10); t.rotation.x = Math.PI / 2; t.userData.role = "body"; g.add(t);
      const n = W.cyl(0.05, 0.09, 0.45, 0x555555, 8); n.rotation.x = Math.PI / 2; n.position.z = 0.4; g.add(n);
    } else if (id === "tnt") {
      g.add(W.cyl(0.07, 0.07, 0.35, 0xd63031, 8));
    } else if (id === "tornado") {
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.25, 10), new THREE.MeshPhongMaterial({ color: 0xaaddff, transparent: true, opacity: 0.5 })));
    } else if (id === "hole") {
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0x000000 })));
    }
    return g;
  }

  function paintProps(a) {
    const p = HH.Looks.item("paints", a.look && a.look.paint) || HH.WARDROBE.paints[0];
    Object.keys(a.props).forEach(function (k) {
      a.props[k].traverse(function (o) {
        if (o.isMesh && o.userData.role && p[o.userData.role] !== undefined) o.material.color.setHex(p[o.userData.role]);
      });
    });
  }

  function dressAvatar(a) {
    const id = a.id, gen = (a.gen = (a.gen || 0) + 1);
    HH.Looks.build(a.look, 1.75).then(function (c) {
      if (avatars.get(id) !== a || a.gen !== gen) { HH.World.forget(c); return; }
      if (a.ch) { a.root.remove(a.ch.root); HH.World.forget(a.ch); }
      a.ch = c;
      a.root.add(c.root);
      a.props = {};
      ["fork", "vac", "tnt", "tornado", "hole"].forEach(function (t) {
        const p = toolProp(t);
        p.visible = false;
        p.scale.setScalar(1 / c.model.scale.x);
        (c.hand || c.root).add(p);
        a.props[t] = p;
      });
      paintProps(a);
      a.ready = true;
    }).catch(function () {});
  }

  function setLook(id, look) {
    look = HH.Looks.sanitize(look);
    pendingLook.set(String(id), look);
    const a = avatars.get(id) || avatars.get(Number(id)) || avatars.get(String(id));
    if (!a) return;
    const was = JSON.stringify(a.look || {});
    a.look = look;
    if (was === JSON.stringify(look)) return;
    const prev = HH.Looks.sanitize(JSON.parse(was || "{}"));
    if (a.ch && prev.char === look.char && prev.hat === look.hat && prev.face === look.face) paintProps(a);
    else dressAvatar(a);
  }

  function ensure(id, name) {
    if (avatars.has(id)) return avatars.get(id);
    const a = { id: id, name: name || "Player", root: new THREE.Group(), ch: null, target: new THREE.Vector3(), yaw: 0, tool: "", props: {}, carry: false, sw: 0, vac: false, speed: 0, last: new THREE.Vector3(), ready: false };
    const col = COLORS[Math.abs(String(id).split("").reduce(function (s, c) { return s + c.charCodeAt(0); }, 0)) % COLORS.length];
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 24), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; a.root.add(ring);
    a.label = HH.World.label(a.name, "#" + col.toString(16).padStart(6, "0"), null, 0.7);
    a.label.position.y = 2.3; a.root.add(a.label);
    a.needle = HH.World.makeNeedle(true);
    a.needle.position.y = 3.2; a.needle.scale.setScalar(0.8); a.needle.visible = false;
    if (a.needle.userData.beam) a.needle.userData.beam.visible = false;
    a.root.add(a.needle);
    a.carryLabel = HH.World.label("HAS THE NEEDLE!", "#ff8ae2", "rgba(80,20,70,0.9)", 0.75);
    a.carryLabel.position.y = 2.85; a.carryLabel.visible = false; a.root.add(a.carryLabel);
    HH.World.scene.add(a.root);
    avatars.set(id, a);
    a.look = pendingLook.get(String(id)) || HH.Looks.sanitize(null);
    dressAvatar(a);
    return a;
  }

  function setState(id, s, name) {
    const a = ensure(id, name);
    if (name && name !== a.name) rename(id, name);
    a.target.set(s.p[0], s.p[1], s.p[2]);
    if (!a.seen) { a.root.position.copy(a.target); a.seen = true; }
    a.yaw = s.y;
    a.tool = s.tl;
    a.vac = !!s.v;
    if (s.sw !== a.sw) { a.sw = s.sw; if (a.ch) a.ch.play(s.tl === "tnt" || s.tl === "tornado" || s.tl === "hole" ? "attack-melee-right" : "interact-right", 0.05, true); }
    a.carry = !!s.c;
  }

  function rename(id, name) {
    const a = avatars.get(id);
    if (!a) return;
    a.name = name;
    a.root.remove(a.label);
    a.label = HH.World.label(name, "#ffffff", null, 0.7);
    a.label.position.y = 2.3;
    a.root.add(a.label);
  }

  function remove(id) {
    const a = avatars.get(id);
    if (!a) return;
    HH.World.scene.remove(a.root);
    if (a.ch) HH.World.forget(a.ch);
    avatars.delete(id);
  }

  function frame(dt) {
    avatars.forEach(function (a) {
      a.last.copy(a.root.position);
      a.root.position.lerp(a.target, Math.min(1, dt * 10));
      const sp = a.last.distanceTo(a.root.position) / Math.max(dt, 0.001);
      a.speed += (sp - a.speed) * Math.min(1, dt * 6);
      let dr = a.yaw + Math.PI - a.root.rotation.y;
      while (dr > Math.PI) dr -= Math.PI * 2;
      while (dr < -Math.PI) dr += Math.PI * 2;
      a.root.rotation.y += dr * Math.min(1, dt * 10);
      Object.keys(a.props).forEach(function (k) { a.props[k].visible = k === a.tool; });
      a.needle.visible = a.carry;
      a.carryLabel.visible = a.carry;
      if (a.carry) a.needle.rotation.y += dt * 2;
      if (a.ch && a.ch.spin) a.ch.spin.rotation.y += dt * 10;
      if (a.ch) {
        if (a.vac) a.ch.play("holding-right-shoot", 0.15);
        else if (a.speed > 4) a.ch.play("sprint", 0.15);
        else if (a.speed > 0.6) a.ch.play("walk", 0.15);
        else a.ch.play(a.tool && a.tool !== "hand" && a.tool !== "none" ? "holding-right" : "idle", 0.25);
      }
    });
  }

  return {
    ensure: ensure, setState: setState, setLook: setLook, remove: remove, rename: rename, frame: frame,
    get: function (id) { return avatars.get(id); },
    clear: function () { Array.from(avatars.keys()).forEach(remove); },
    get count() { return avatars.size; },
    positions: function () { const out = []; avatars.forEach(function (a) { out.push({ id: a.id, p: a.root.position, name: a.name, carry: a.carry }); }); return out; }
  };
})();

HH.Parkour = (function () {
  let group = null, boxes = [], chest = null, unlocked = false, lid = null, opened = false, sign = null;

  function S() { return HH.Save.data; }

  function build(scene, ext) {
    if (group) scene.remove(group);
    group = new THREE.Group();
    boxes = [];
    opened = false;
    unlocked = (S().rebirths || 0) >= 1;
    const W = HH.World;
    const wood = new THREE.MeshLambertMaterial({ color: 0x9a6634, transparent: !unlocked, opacity: unlocked ? 1 : 0.35 });
    const hay = new THREE.MeshLambertMaterial({ color: 0xf2c94c, transparent: !unlocked, opacity: unlocked ? 1 : 0.35 });
    const r0 = ext + 7.5, a0 = -0.95, N = 16;
    let a = a0;
    for (let q = 0; q < N; q++) {
      const size = q < 5 ? 1.8 : q < 11 ? 1.4 : 1.1;
      const r = r0 + Math.sin(q * 0.9) * 1.2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, top = 0.9 + q * 1.0;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, size), wood);
      plank.position.set(x, top - 0.15, z);
      plank.castShadow = unlocked;
      group.add(plank);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(size * 0.92, 0.08, size * 0.92), hay);
      cap.position.set(x, top + 0.02, z);
      group.add(cap);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, top - 0.3, 6), wood);
      post.position.set(x, (top - 0.3) / 2, z);
      group.add(post);
      boxes.push({ minX: x - size / 2, maxX: x + size / 2, minZ: z - size / 2, maxZ: z + size / 2, minY: top - 0.3, maxY: top });
      a += 3.3 / r;
      if (q === N - 1) {
        chest = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.55), new THREE.MeshLambertMaterial({ color: 0x8a5426, transparent: !unlocked, opacity: unlocked ? 1 : 0.35 }));
        body.position.y = 0.25; chest.add(body);
        lid = new THREE.Group(); lid.position.set(0, 0.5, -0.27);
        const lm = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.18, 0.57), new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x553800, transparent: !unlocked, opacity: unlocked ? 1 : 0.35 }));
        lm.position.set(0, 0.09, 0.27); lid.add(lm); chest.add(lid);
        chest.position.set(x, top + 0.06, z);
        chest.rotation.y = Math.atan2(-x, -z);
        group.add(chest);
      }
    }
    const sx = Math.cos(a0) * r0, sz = Math.sin(a0) * r0;
    sign = W.label(unlocked ? "PARKOUR" : "PARKOUR (Rebirth 1)", unlocked ? "#ffe14d" : "#c9ced8", "rgba(60,36,12,0.9)", 1);
    sign.material.depthTest = true;
    sign.position.set(sx, 3.2, sz);
    group.add(sign);
    scene.add(group);
  }

  function boxHits(minX, minY, minZ, maxX, maxY, maxZ) {
    if (!unlocked) return null;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (maxX > b.minX && minX < b.maxX && maxZ > b.minZ && minZ < b.maxZ && maxY > b.minY && minY < b.maxY) return { j: b.maxY / HH.VS - 1 };
    }
    return null;
  }

  function update(dt) {
    if (!chest || !unlocked) return;
    if (opened) { if (lid.rotation.x > -1.9) lid.rotation.x -= dt * 4; return; }
    const p = HH.Player.pos, c = chest.position;
    if (Math.hypot(p.x - c.x, p.z - c.z) < 1.4 && Math.abs(p.y - c.y) < 1.2) {
      opened = true;
      const R = HH.Game.run, s = S();
      if (R.parkourDone) { HH.UI.toast("You already opened this chest. A new one appears on the next level!", 2500); return; }
      R.parkourDone = true;
      const st = HH.Game.stats();
      const gems = Math.round(25 * (1 + (R.levelIndex || 0) * 0.5) * st.gemMul);
      s.gems += gems;
      s.tokens = (s.tokens || 0) + 1;
      HH.Save.save();
      HH.Audio.play("levelup");
      HH.UI.confetti(90);
      HH.UI.flyIcons("gem", 10);
      HH.UI.toast(HH.icon("trophy", 20) + " <b>Parkour complete!</b> +" + gems + " gems and +1 Rebirth Token", 4000);
    }
  }

  return { build: build, boxHits: boxHits, update: update, get unlocked() { return unlocked; }, get chestPos() { return chest ? chest.position.clone() : null; } };
})();

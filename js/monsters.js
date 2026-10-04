HH.TALISMANS = [
  { id: "greed", name: "Talisman of Greed", desc: "+15% hay money", fx: ["cash", 0.15], rare: false },
  { id: "mole", name: "Talisman of the Mole", desc: "Hand grabs take +20% hay", fx: ["grab", 0.2], rare: false },
  { id: "gale", name: "Talisman of the Gale", desc: "+8% walk speed", fx: ["speed", 0.08], rare: false },
  { id: "gems", name: "Talisman of Gems", desc: "+20% gems", fx: ["gems", 0.2], rare: false },
  { id: "mule", name: "Talisman of the Pack Mule", desc: "+25% bag space", fx: ["bag", 0.25], rare: false },
  { id: "thunder", name: "Talisman of Thunder", desc: "+15% dynamite blast size", fx: ["tnt", 0.15], rare: false },
  { id: "whirl", name: "Talisman of the Whirlwind", desc: "+20% vacuum suction", fx: ["vac", 0.2], rare: false },
  { id: "reaper", name: "Talisman of the Reaper", desc: "Pitchfork scoops +20% hay", fx: ["fork", 0.2], rare: false },
  { id: "time", name: "Talisman of Time", desc: "All tool cooldowns -8%", fx: ["cd", 0.08], rare: false },
  { id: "sun", name: "Talisman of the Sun", desc: "Packed hay is 8% looser", fx: ["density", 0.08], rare: false },
  { id: "bonecrown", name: "Skull Crown", desc: "+30% hay money (Warrior drop)", fx: ["cash", 0.3], rare: true },
  { id: "amulet", name: "Bone Amulet", desc: "Deal double damage to monsters (Warrior drop)", fx: ["dmg", 1], rare: true }
];

HH.Monsters = (function () {
  const list = [];
  let raidT = 120, models = { minion: null, warrior: null }, loading = false, warned = false;
  const DMG = { hand: 1, fork: 2, tnt: 4, vac: 1, tornado: 2, hole: 3, none: 1 };

  function S() { return HH.Save.data; }

  function loadModels() {
    if (loading) return;
    loading = true;
    const web = location.protocol.indexOf("http") === 0;
    const pairs = [["minion", "Skeleton_Minion", "Mage"], ["warrior", "Skeleton_Warrior", "Barbarian"]];
    pairs.forEach(function (p) {
      if (!web) { models[p[0]] = p[2]; return; }
      fetch("assets/" + p[1] + ".glb").then(function (r) { if (!r.ok) throw new Error(); return r.arrayBuffer(); }).then(function (buf) {
        HH.EXTRA_MODELS = HH.EXTRA_MODELS || {};
        HH.EXTRA_MODELS[p[1]] = buf;
        models[p[0]] = p[1];
      }).catch(function () { models[p[0]] = p[2]; });
    });
  }

  function hpBar() {
    const c = document.createElement("canvas");
    c.width = 128; c.height = 20;
    const tex = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    s.scale.set(1.2, 0.19, 1);
    s.renderOrder = 9;
    s.userData.c = c; s.userData.tex = tex;
    return s;
  }

  function drawHp(m) {
    const c = m.bar.userData.c, x = c.getContext("2d"), f = Math.max(0, m.hp / m.max);
    x.clearRect(0, 0, 128, 20);
    x.fillStyle = "rgba(0,0,0,0.7)"; x.fillRect(0, 0, 128, 20);
    x.fillStyle = f > 0.5 ? "#6cff6c" : f > 0.25 ? "#ffd23f" : "#ff4b4b";
    x.fillRect(3, 3, 122 * f, 14);
    m.bar.userData.tex.needsUpdate = true;
  }

  function spawn(kind, pos) {
    const name = models[kind];
    if (!name) return;
    const lvl = HH.Game.run.levelIndex || 0, hard = (HH.Game.run.level && HH.Game.run.level.hard) || 0;
    const max = Math.round((kind === "warrior" ? 9 : 4) * (1 + 0.08 * lvl + 0.35 * hard));
    const m = { kind: kind, hp: max, max: max, pos: pos.clone(), ch: null, state: "rise", t: 0, root: new THREE.Group(), speed: kind === "warrior" ? 2.7 : 3.3 };
    m.root.position.copy(pos);
    m.bar = hpBar();
    m.bar.position.y = kind === "warrior" ? 2.6 : 2.2;
    m.root.add(m.bar);
    drawHp(m);
    HH.World.scene.add(m.root);
    list.push(m);
    HH.World.character(name, kind === "warrior" ? 2.0 : 1.7, /Skeleton_|mesh/, true).then(function (ch) {
      if (list.indexOf(m) < 0) { HH.World.forget(ch); return; }
      m.ch = ch;
      ch.root.traverse(function (o) { if (o.isMesh) o.castShadow = false; });
      m.root.add(ch.root);
      if (ch.actions.Death_C_Skeletons_Resurrect) ch.play("Death_C_Skeletons_Resurrect", 0.05, true); else ch.play("Idle", 0.1);
    }).catch(function () {});
  }

  function remove(m) {
    HH.World.scene.remove(m.root);
    if (m.ch) HH.World.forget(m.ch);
    const i = list.indexOf(m);
    if (i >= 0) list.splice(i, 1);
  }

  function reward(m) {
    const st = HH.Game.stats(), s = S();
    const g = Math.max(1, Math.round((m.kind === "warrior" ? 8 : 3) * st.gemMul));
    s.gems += g;
    HH.UI.popup("+" + g + " gems", m.root.position.clone().add(new THREE.Vector3(0, 2, 0)), "#7ff7ff", false);
    HH.UI.flyIcons("gem", 4);
    s.talis = s.talis || {};
    const pool = HH.TALISMANS.filter(function (t) { return !s.talis[t.id] && (!t.rare || m.kind === "warrior"); });
    if (pool.length && Math.random() < (m.kind === "warrior" ? 0.35 : 0.12)) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      s.talis[t.id] = true;
      HH.Audio.play("levelup");
      HH.UI.confetti(50);
      HH.UI.toast(HH.icon("star", 20) + " <b>" + t.name + "!</b> " + t.desc + " (permanent)", 4000);
    }
    s.stats.kills = (s.stats.kills || 0) + 1;
    HH.Save.save();
  }

  function damage(m, d) {
    if (m.state === "dead" || m.state === "rise") return;
    m.hp -= d;
    drawHp(m);
    HH.UI.popup("-" + d, m.root.position.clone().add(new THREE.Vector3(0, 2.2, 0)), "#ff8a8a", false);
    HH.Audio.play("grab");
    if (m.hp <= 0) {
      m.state = "dead"; m.t = 0;
      m.bar.visible = false;
      if (m.ch) m.ch.play(m.ch.actions.Death_A ? "Death_A" : "Idle", 0.05, true);
      reward(m);
    } else if (m.ch && m.ch.actions.Hit_A) m.ch.play("Hit_A", 0.05, true);
  }

  function hit(ray, tool) {
    if (!list.length) return false;
    const mul = 1 + (HH.Game.rbfx ? HH.Game.rbfx("dmg") : 0);
    let best = null, bestD = 9;
    const tmp = new THREE.Vector3();
    list.forEach(function (m) {
      if (m.state === "dead" || m.state === "rise") return;
      tmp.copy(m.root.position); tmp.y += 1;
      const toC = tmp.clone().sub(ray.origin), along = toC.dot(ray.direction);
      if (along < 0 || along > bestD) return;
      const perp = toC.sub(ray.direction.clone().multiplyScalar(along)).length();
      if (perp < 0.85) { best = m; bestD = along; }
    });
    if (!best) return false;
    damage(best, Math.max(1, Math.round((DMG[tool] || 1) * mul)));
    return true;
  }

  function blast(p, r) {
    list.slice().forEach(function (m) {
      if (m.root.position.distanceTo(p) < r + 1) damage(m, Math.round(4 * (1 + (HH.Game.rbfx ? HH.Game.rbfx("dmg") : 0))));
    });
  }

  function startRaid() {
    const R = HH.Game.run, lvl = R.levelIndex || 0, hard = (R.level && R.level.hard) || 0;
    const n = Math.min(7, 2 + Math.floor(lvl / 4) + hard);
    const fr = HH.World.fenceR - 2;
    for (let q = 0; q < n; q++) {
      const a = Math.random() * Math.PI * 2;
      const kind = lvl >= 6 && Math.random() < 0.3 + 0.08 * hard ? "warrior" : "minion";
      spawn(kind, new THREE.Vector3(Math.cos(a) * fr, 0, Math.sin(a) * fr));
    }
    HH.Audio.play("warn");
    HH.UI.toast(HH.icon("star", 20) + " <b>Skeleton raid!</b> Click them with any tool before they steal your hay!", 3500);
  }

  function update(dt) {
    const R = HH.Game.run;
    if (!R) return;
    const active = !HH.Net.active && (R.levelIndex || 0) >= 2 && !R.done;
    if (active) {
      loadModels();
      raidT -= dt;
      if (raidT <= 0 && list.length === 0 && models.minion) {
        raidT = 150 + Math.random() * 90;
        startRaid();
      }
    }
    const pp = HH.Player.pos;
    list.slice().forEach(function (m) {
      m.t += dt;
      const p = m.root.position;
      if (m.state === "rise") { if (m.t > 1.4) { m.state = "chase"; if (m.ch) m.ch.play("Running_A", 0.2); } return; }
      if (m.state === "dead") { if (m.t > 1.8) remove(m); return; }
      if (m.state === "flee") { p.y -= dt * 2; if (m.t > 1.2) remove(m); return; }
      const dx = pp.x - p.x, dz = pp.z - p.z, d = Math.hypot(dx, dz);
      if (d < 1.1 && Math.abs(pp.y - p.y) < 2.2) {
        const lost = Math.min(R.bag, Math.max(5, Math.floor(R.bag * 0.15)));
        if (lost > 0) {
          const v = R.bag > 0 ? R.bagValue * lost / R.bag : 0;
          R.bag -= lost; R.bagValue -= v;
          HH.UI.popup("-" + lost + " hay!", p.clone().add(new THREE.Vector3(0, 2.2, 0)), "#ff5c5c", true);
        }
        HH.Audio.play("deny");
        if (m.ch) m.ch.play(m.ch.actions.Cheer ? "Cheer" : "Idle", 0.1);
        m.state = "flee"; m.t = 0; m.bar.visible = false;
        return;
      }
      if (d > 0.01) {
        const sp = Math.min(d, m.speed * dt);
        p.x += dx / d * sp; p.z += dz / d * sp;
        p.y += ((HH.Voxels.topAt(p.x, p.z) || 0) - p.y) * Math.min(1, dt * 8);
        m.root.rotation.y = Math.atan2(dx, dz);
      }
    });
  }

  function clear() { list.slice().forEach(remove); raidT = 120; }

  return { update: update, hit: hit, blast: blast, clear: clear, raid: function () { loadModels(); if (models.minion) startRaid(); }, get list() { return list; }, get count() { return list.length; } };
})();

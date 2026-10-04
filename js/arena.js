HH.Arena = (function () {
  const RAD = 5.4, MAXHP = 100;
  const DMG = { hand: 10, none: 10, fork: 16, vac: 8, tnt: 30, tornado: 20, hole: 25 };
  const center = new THREE.Vector3(), gate = new THREE.Vector3();
  let group = null, inside = false, hp = MAXHP, wave = 0, waveT = 0, fighting = false, atkT = 0, kos = 0, hookedNet = false, hudT = 0;
  const remote = {};

  function S() { return HH.Save.data; }
  function N() { return HH.Net; }
  function others() { return N().active ? HH.Remote.positions() : []; }
  function inRing(p) { return Math.hypot(p.x - center.x, p.z - center.z) < RAD - 0.3 && p.y < 4; }

  function build(scene, ext) {
    if (group) scene.remove(group);
    group = new THREE.Group();
    const a0 = -2.36, r0 = ext + 7.6;
    center.set(Math.cos(a0) * r0, 0, Math.sin(a0) * r0);
    const ga = Math.atan2(-center.z, -center.x);
    gate.set(center.x + Math.cos(ga) * (RAD + 1.6), 0, center.z + Math.sin(ga) * (RAD + 1.6));
    const floor = new THREE.Mesh(new THREE.CircleGeometry(RAD, 40), new THREE.MeshLambertMaterial({ color: 0xd8b273 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(center.x, 0.03, center.z);
    floor.receiveShadow = true;
    group.add(floor);
    const ringM = new THREE.Mesh(new THREE.RingGeometry(RAD - 0.25, RAD, 48), new THREE.MeshLambertMaterial({ color: 0x8a5a2b }));
    ringM.rotation.x = -Math.PI / 2;
    ringM.position.set(center.x, 0.04, center.z);
    group.add(ringM);
    const stone = new THREE.MeshLambertMaterial({ color: 0x8d8f99 });
    const wood = new THREE.MeshLambertMaterial({ color: 0x7a4a22 });
    const slots = [];
    for (let q = 0; q < 28; q++) {
      const a = q / 28 * Math.PI * 2;
      let da = Math.abs(a - ((ga + Math.PI * 2) % (Math.PI * 2)));
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da < 0.32) continue;
      slots.push(a);
    }
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 1.5, 0.42), stone, slots.length);
    const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.16, 1), wood, slots.length);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(1, 1, 1), p4 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    let nr = 0;
    slots.forEach(function (a, i) {
      p4.set(center.x + Math.cos(a) * RAD, 0.75, center.z + Math.sin(a) * RAD);
      m4.makeTranslation(p4.x, p4.y, p4.z);
      posts.setMatrixAt(i, m4);
      const b = a + Math.PI * 2 / 28;
      const nx = i + 1 < slots.length ? slots[i + 1] : slots[0] + Math.PI * 2;
      if (Math.abs(nx - b) > 0.01) return;
      const mid = (a + b) / 2, len = 2 * RAD * Math.sin(Math.PI / 28);
      p4.set(center.x + Math.cos(mid) * RAD, 1.25, center.z + Math.sin(mid) * RAD);
      q4.setFromAxisAngle(up, -mid);
      s4.set(1, 1, len);
      m4.compose(p4, q4, s4);
      rails.setMatrixAt(nr++, m4);
    });
    rails.count = nr;
    posts.castShadow = true;
    group.add(posts, rails);
    const flagM = new THREE.MeshLambertMaterial({ color: 0xc62828, side: THREE.DoubleSide });
    [-1, 1].forEach(function (sd) {
      const pa = ga + sd * 0.36, px = center.x + Math.cos(pa) * (RAD + 0.2), pz = center.z + Math.sin(pa) * (RAD + 0.2);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 4, 6), wood);
      pole.position.set(px, 2, pz);
      group.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), flagM);
      flag.position.set(px, 3.5, pz);
      flag.rotation.y = -ga;
      flag.translateX(0.55);
      group.add(flag);
    });
    const sign = HH.World.label("PVP ARENA", "#ff6b6b", "rgba(50,14,14,0.92)", 1.1);
    sign.material.depthTest = true;
    sign.position.set(center.x + Math.cos(ga) * (RAD + 0.3), 4.3, center.z + Math.sin(ga) * (RAD + 0.3));
    group.add(sign);
    scene.add(group);
    reset();
    hookNet();
  }

  function reset() {
    if (fighting && HH.Monsters) HH.Monsters.clearArena();
    inside = false; fighting = false; wave = 0; hp = MAXHP;
    hud(false);
  }

  function hud(on) {
    const el = document.getElementById("arenahud");
    if (!el) return;
    el.classList.toggle("hidden", !on);
    if (!on) return;
    document.getElementById("arenafill").style.width = Math.max(0, hp / MAXHP * 100) + "%";
    const info = document.getElementById("arenainfo");
    const t = N().active ? "KOs " + kos : wave > 0 ? "Wave " + wave : "";
    if (info.textContent !== t) info.textContent = HH.I18N.tr(t);
  }

  function grantTalisman(force, chance) {
    const s = S();
    s.talis = s.talis || {};
    const pool = HH.TALISMANS.filter(function (t) { return t.arena && !s.talis[t.id]; });
    if (!pool.length || (!force && Math.random() > chance)) return false;
    const t = pool[Math.floor(Math.random() * pool.length)];
    s.talis[t.id] = true;
    HH.Save.save();
    HH.Audio.play("levelup");
    HH.UI.confetti(80);
    HH.UI.toast(HH.icon("star", 20) + " <b>" + t.name + "!</b> " + t.desc + " (permanent)", 4500);
    return true;
  }

  function gemsFor(base) {
    const lvl = (HH.Game.run && HH.Game.run.levelIndex) || 0;
    return Math.max(1, Math.round(base * (1 + lvl * 0.3) * HH.Game.stats().gemMul));
  }

  function spawnWave() {
    wave++;
    const n = Math.min(8, 1 + wave), warriors = Math.min(n - 1, Math.floor(wave / 2));
    for (let q = 0; q < n; q++) {
      const a = Math.random() * Math.PI * 2;
      HH.Monsters.spawn(q < warriors ? "warrior" : "minion", new THREE.Vector3(center.x + Math.cos(a) * (RAD - 0.9), 0, center.z + Math.sin(a) * (RAD - 0.9)), wave);
    }
    HH.Audio.play("warn");
    HH.UI.toast(HH.icon("star", 20) + " <b>Wave " + wave + "!</b> " + n + " gladiators", 1800);
  }

  function waveCleared() {
    const g = gemsFor(4 + wave * 3), s = S();
    s.gems += g;
    s.stats.arenaBest = Math.max(s.stats.arenaBest || 0, wave);
    HH.Save.save();
    HH.UI.flyIcons("gem", 6);
    HH.UI.toast(HH.icon("trophy", 20) + " <b>Wave " + wave + " cleared!</b> +" + g + " gems", 2200);
    if (wave % 5 === 0) grantTalisman(true);
    else if (wave === 3) grantTalisman(false, 0.25);
    waveT = 3;
  }

  function knockout(msg) {
    hp = MAXHP;
    if (fighting) { HH.Monsters.clearArena(); fighting = false; }
    HH.Player.spawn(gate.clone().setY(0.2));
    inside = false;
    HH.Audio.play("deny");
    HH.UI.flash();
    HH.UI.toast(msg, 3200);
    hud(false);
  }

  function hurt(d) {
    if (!inside || hp <= 0) return;
    hp -= d;
    HH.UI.flash();
    HH.Audio.play("deny");
    if (N().active) N().send("pvphp", { hp: Math.max(0, hp) });
    if (hp <= 0) {
      if (N().active) return;
      const best = wave;
      wave = 0;
      knockout("<b>Knocked out!</b> You reached wave " + best + ". Walk back in to try again.");
    }
    hud(true);
  }

  function enter() {
    inside = true;
    hp = MAXHP;
    if (N().active) {
      N().send("pvphp", { hp: hp });
      HH.UI.toast(HH.icon("star", 20) + " <b>PvP Arena!</b> Hit other players with your tools. Knock them out to win talismans!", 3600);
    } else {
      if (!HH.Monsters.ready()) { HH.UI.toast("The gladiators are getting ready... try again in a moment.", 2000); inside = false; return; }
      fighting = true; wave = 0; waveT = 2.5;
      HH.UI.toast(HH.icon("star", 20) + " <b>Gladiator Arena!</b> Survive the waves. Every 5th wave wins an Arena talisman!", 3600);
    }
    hud(true);
  }

  function exit() {
    inside = false;
    if (fighting) {
      HH.Monsters.clearArena();
      fighting = false;
      if (wave > 0) HH.UI.toast("You left the arena on wave " + wave + ".", 2000);
      wave = 0;
    }
    hp = MAXHP;
    if (N().active) N().send("pvphp", { hp: -1 });
    hud(false);
  }

  function bar(id) {
    const a = HH.Remote.get(id);
    if (!a) return null;
    if (!a.pvpBar) {
      const c = document.createElement("canvas");
      c.width = 128; c.height = 20;
      const tex = new THREE.CanvasTexture(c);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
      s.scale.set(1.2, 0.19, 1);
      s.position.y = 2.45;
      s.renderOrder = 9;
      s.userData = { c: c, tex: tex };
      a.root.add(s);
      a.pvpBar = s;
    }
    return a.pvpBar;
  }

  function drawRemote(id) {
    const b = bar(id), v = remote[id];
    if (!b) return;
    b.visible = v !== undefined && v >= 0;
    if (!b.visible) return;
    const x = b.userData.c.getContext("2d"), f = Math.max(0, v / MAXHP);
    x.clearRect(0, 0, 128, 20);
    x.fillStyle = "rgba(0,0,0,0.7)"; x.fillRect(0, 0, 128, 20);
    x.fillStyle = f > 0.5 ? "#6cff6c" : f > 0.25 ? "#ffd23f" : "#ff4b4b";
    x.fillRect(3, 3, 122 * f, 14);
    b.userData.tex.needsUpdate = true;
  }

  function hookNet() {
    if (hookedNet) return;
    hookedNet = true;
    const net = N();
    net.on("pvphp", function (d, from) {
      if (String(from) === String(net.id)) return;
      remote[from] = d.hp;
      drawRemote(from);
    });
    net.on("pvphit", function (d, from) {
      if (String(d.to) !== String(net.id) || !inside || hp <= 0) return;
      hurt(d.dmg);
      if (hp <= 0) {
        net.send("pvpko", { victim: net.id, by: from }, "all");
        knockout("<b>Knocked out by " + net.playerName(from) + "!</b> Walk back in for a rematch.");
        net.send("pvphp", { hp: -1 });
      }
    });
    net.on("pvpko", function (d) {
      const me = String(net.id);
      if (String(d.by) === me) {
        kos++;
        const g = gemsFor(12), s = S();
        s.gems += g;
        s.stats.pvpKos = (s.stats.pvpKos || 0) + 1;
        HH.Save.save();
        HH.UI.flyIcons("gem", 8);
        HH.UI.toast(HH.icon("trophy", 20) + " <b>You knocked out " + net.playerName(d.victim) + "!</b> +" + g + " gems", 3000);
        if (!grantTalisman(kos % 3 === 0, 0.3) && kos % 3 === 0) { s.gems += g * 2; HH.Save.save(); }
        hud(true);
      } else if (String(d.victim) !== me) {
        HH.UI.toast("<b>" + net.playerName(d.by) + "</b> knocked out <b>" + net.playerName(d.victim) + "</b> in the arena!", 2200);
      }
    });
    net.on("left", function () { Object.keys(remote).forEach(function (k) { delete remote[k]; }); });
  }

  function hit(ray, tool) {
    if (!inside || !N().active || atkT > 0) return false;
    let best = null, bestD = tool === "tnt" || tool === "tornado" || tool === "hole" ? 14 : 4.5;
    const tmp = new THREE.Vector3();
    others().forEach(function (o) {
      if (!inRing(o.p)) return;
      tmp.copy(o.p); tmp.y += 1;
      const toC = tmp.clone().sub(ray.origin), along = toC.dot(ray.direction);
      if (along < 0 || along > bestD) return;
      if (toC.sub(ray.direction.clone().multiplyScalar(along)).length() < 0.8) { best = o; bestD = along; }
    });
    if (!best) return false;
    atkT = 0.45;
    const dmg = Math.round((DMG[tool] || 10) * (1 + 0.25 * HH.Game.rbfx("dmg")));
    N().send("pvphit", { to: best.id, dmg: dmg }, best.id);
    HH.UI.popup("-" + dmg, best.p.clone().add(new THREE.Vector3(0, 2.3, 0)), "#ff8a8a", false);
    HH.Audio.play("grab");
    return true;
  }

  function update(dt) {
    if (!group || !HH.Game.run) return;
    atkT -= dt;
    const now = inRing(HH.Player.pos);
    if (now && !inside) enter();
    else if (!now && inside) exit();
    if (fighting) {
      if (waveT > 0) { waveT -= dt; if (waveT <= 0) spawnWave(); }
      else if (wave > 0 && HH.Monsters.arenaLeft() === 0) waveCleared();
    }
    hudT -= dt;
    if (inside && hudT <= 0) { hudT = 0.15; hud(true); }
  }

  return {
    build: build, update: update, hit: hit, hurt: hurt, reset: reset,
    get center() { return center; }, get radius() { return RAD; }, get inside() { return inside; }, get hp() { return hp; }, get wave() { return wave; }
  };
})();

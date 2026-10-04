HH.Game = (function () {
  const V = HH.Voxels;
  let R = null;
  let emit = function () {};
  let needleCache = { t: 0, p: null };
  let beepT = 0, fullMsgT = 0, saveT = 0, buyerT = 0, blockedT = 0;
  const bombs = [], tornados = [], drones = [], holes = [];
  let hamster = null, goose = null;
  const MP = { expected: 1, last: 0, buf: {}, cbs: {}, oid: 0, carrier: null, stateT: 0, sw: 0, synced: true, grabT: 0, delivered: false, fx: {}, pendingLevel: null };

  function S() { return HH.Save.data; }
  function mapDef(id) { return HH.MAPS.find(function (m) { return m.id === id; }) || HH.MAPS[0]; }
  function has(c) { const e = S().cls; return e === c || e === "barnaby"; }
  function lvl(id) { return (R && R.up[id]) || 0; }
  function rb(id) { return !!(S().rb && S().rb[id]); }
  let rbfxN = -1, rbfxSum = {};
  function rbfx(k) {
    const own = S().rb || {}, tal = S().talis || {}, keys = Object.keys(own).concat(Object.keys(tal));
    if (keys.length !== rbfxN) {
      rbfxN = keys.length; rbfxSum = {};
      HH.REBIRTH_ITEMS.forEach(function (it) { if (it.fx && own[it.id]) rbfxSum[it.fx[0]] = (rbfxSum[it.fx[0]] || 0) + it.fx[1]; });
      (HH.TALISMANS || []).forEach(function (t) { if (tal[t.id]) rbfxSum[t.fx[0]] = (rbfxSum[t.fx[0]] || 0) + t.fx[1]; });
    }
    return rbfxSum[k] || 0;
  }
  function level() { return S().needles || 0; }
  function toolAvailable(t) { return !!t && (S().rebirths || 0) >= (t.rb || 0); }
  function me() { return HH.Net.active ? HH.Net.id : "me"; }
  function isMe(id) { return String(id) === String(me()); }
  function boostOn(id) { return ((S().boost || {})[id] || 0) > Date.now(); }

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function levelDef(i) {
    const L = HH.LEVELS;
    if (i < L.length) return Object.assign({ index: i }, L[i]);
    const n = i - L.length;
    const base = L[3 + (n % (L.length - 3))];
    return Object.assign({}, base, {
      index: i,
      name: "Endless " + (n + 1) + ": " + base.name,
      size: Math.min(1.6, base.size + 0.05 + n * 0.02),
      mud: (base.mud || 0) + (n % 3 === 0 ? 3 : 0),
      wind: base.wind || n % 4 === 1,
      deep: true,
      tip: "Endless level " + (n + 1) + ". Every level gets a little tougher!"
    });
  }

  function stats() {
    const P = S().perks, m = mapDef(R.map), rbs = S().rebirths || 0;
    const comboMul = 1 + Math.min(R.combo || 0, 100) * 0.01 * (1 + 0.2 * lvl("combo"));
    const zone = R.zoneMul || 1;
    return {
      basePrice: (boostOn("p_roll") ? 1.5 : 1) * (1 + rbfx("cash")) * (HH.Quests && HH.Quests.boostOn ? 2 : 1) * (rb("midas") ? 2 : 1) * (1 + 0.1 * lvl("baler")) * (1 + 0.08 * lvl("vip")) * (1 + 0.1 * lvl("tycoon")) * m.hayValue * (1 + 0.1 * P.hayValue) * (has("haggler") ? 1.2 : 1) * (1 + 0.05 * lvl("tip")) * (lvl("goose") ? 1.15 : 1) * (1 + 0.25 * rbs) * (1 + 0.25 * lvl("harvest")) * (1 + 0.05 * Math.min(R.levelIndex || 0, 30)),
      mul: comboMul * (R.storm > 0 ? 2 : 1),
      cap: Math.floor((boostOn("p_bread") ? 1.5 : 1) * (1 + rbfx("bag")) * (rb("superbag") ? 2 : 1) * (1 + 0.2 * lvl("megabag")) * (1 + 0.5 * lvl("pockets")) * (HH.BAG_TIERS[R.tier].cap + 40 * P.bagSize) * (has("baggoblin") ? 1.5 : 1) * (1 + 0.25 * lvl("compress")) * (boostOn("bagboost") ? 1.5 : 1)),
      grab: Math.round((1 + rbfx("grab")) * (3 + lvl("grasp") + P.grab) * (rb("goldgloves") ? 2 : 1) * (1 + 0.3 * lvl("qgrab"))),
      drill: 0.04 * lvl("drill"),
      autosell: rb("autosell") ? 1 : lvl("autosell") ? 0.9 : 0,
      forkHaul: (1 + rbfx("fork")) * (rb("titanfork") ? 2 : 1) * (has("forklord") ? 1.25 : 1) * (1 + 0.4 * lvl("megafork")) * (1 + 0.25 * lvl("goldfork")),
      stormFreq: (lvl("stormcall") ? 2 : 1) * (rb("rainbowrain") ? 2 : 1),
      stormLen: (rb("rainbowrain") ? 45 : 30) * (1 + 0.3 * lvl("stormmag")),
      nuke: lvl("nuke") > 0,
      nmagnet: lvl("nmagnet") > 0,
      holeR: (2.2 + 0.4 * lvl("hsize")) * (1 + 0.25 * lvl("cosmic")),
      holeCd: 45 * Math.pow(0.85, lvl("hcool")) * Math.pow(0.95, lvl("warp")) * (rb("timelord") ? 0.5 : 1) * Math.max(0.4, 1 - rbfx("cd")) * (boostOn("p_donut") ? 0.7 : 1),
      handCd: 0.38 * Math.pow(0.9, lvl("speed")) * Math.pow(0.95, lvl("warp")) * (rb("timelord") ? 0.5 : 1) * Math.max(0.4, 1 - rbfx("cd")) * (boostOn("p_donut") ? 0.7 : 1),
      handR: 0.9 + 0.15 * lvl("glove"),
      reach: 4.5 + 0.6 * lvl("reach"),
      golden: 0.05 * lvl("golden"),
      forkR: (0.8 + 0.14 * lvl("fsweep")) * (has("forklord") ? 1.08 : 1),
      forkCd: 1.0 * Math.pow(0.88, lvl("fcool")) * Math.pow(0.95, lvl("warp")) * (rb("timelord") ? 0.5 : 1) * Math.max(0.4, 1 - rbfx("cd")) * (boostOn("p_donut") ? 0.7 : 1),
      fgold: 0.08 * lvl("fgold"),
      tntR: (1 + rbfx("tnt")) * (1.5 + 0.32 * lvl("tpower")) * (has("boomuncle") ? 1.2 : 1) * (1 + 0.15 * lvl("thermite")),
      tntCd: 8 * Math.pow(0.85, lvl("tcool")) * Math.pow(0.95, lvl("warp")) * (rb("timelord") ? 0.5 : 1) * Math.max(0.4, 1 - rbfx("cd")) * (boostOn("p_donut") ? 0.7 : 1),
      tntFuse: 1.6,
      lucky: 0.04 * lvl("tlucky"),
      cluster: 0.1 * lvl("tcluster") + (has("boomuncle") ? 0.1 : 0),
      vacRate: (1 + rbfx("vac")) * 30 * (1 + 0.45 * lvl("vpower")) * (1 + 0.5 * lvl("turbovac")) * (1 + 0.2 * lvl("ovac")) * (boostOn("vacboost") ? 2 : 1),
      vacMax: 6 + 1.8 * lvl("vrun") + 0.25 * lvl("vrun") * lvl("vrun"),
      vacR: 1.4 + 0.3 * lvl("vwide") + 0.03 * lvl("vwide") * lvl("vwide"),
      vacReach: 4.5 + 0.6 * lvl("reach") + 5 + 1.5 * lvl("vrange"),
      vacTick: 0.07 * Math.pow(0.85, lvl("vtick")),
      vacCool: (1 + lvl("turbovac")) * (1 + 0.5 * lvl("vcool")),
      vacMove: 0.85 + 0.09 * lvl("vmove"),
      vacItem: lvl("vitem") ? 4 + 2.5 * lvl("vitem") : 0,
      torR: 1.1 + 0.28 * lvl("tsize"),
      torLife: 6 + 1.5 * lvl("tlast"),
      torCd: 30 * Math.pow(0.88, lvl("tcd")) * Math.pow(0.95, lvl("warp")) * (rb("timelord") ? 0.5 : 1) * Math.max(0.4, 1 - rbfx("cd")) * (boostOn("p_donut") ? 0.7 : 1),
      torN: 1 + lvl("ttwin"),
      drones: (lvl("drone") || has("dronewhisper") || rb("dronearmy")) ? 1 + lvl("dfleet") + (rb("dronearmy") ? 2 : 0) : 0,
      droneSpeed: (5 + 1.2 * lvl("dspeed")) * (has("dronewhisper") ? 1.3 : 1),
      droneCap: Math.floor((20 + 10 * lvl("dcap")) * (has("dronewhisper") ? 1.4 : 1)),
      magnet: lvl("magnet") ? 3 + 1.5 * lvl("magnet") : 0,
      radar: lvl("radar") > 0 || rb("needlesense"),
      radarRange: (2.2 + 1.1 * lvl("rrange") + (rb("needlesense") ? 2 : 0)) * (has("sniffer") ? 1.15 : 1),
      hamster: lvl("hamster") > 0 || rb("hamking"),
      hamRate: 1.2 * (1 + 1.2 * lvl("hamlvl")) * (rb("hamking") ? 2 : 1),
      bulk: 0.03 * lvl("bulk"),
      gemMul: (boostOn("p_cake") ? 2 : 1) * (1 + rbfx("gems")) * (1 + 0.1 * lvl("gemmag")) * (1 + 0.1 * P.gemValue) * (1 + 0.25 * rbs) * (rb("gemfountain") ? 1.5 : 1),
      move: {
        speed: (boostOn("p_croissant") ? 1.3 : 1) * (1 + rbfx("speed")) * (1 + 0.08 * lvl("walk")) * (has("speedy") ? 1.25 : 1) * zone * (R.vacOn ? 0.85 + 0.09 * lvl("vmove") : 1),
        jump: (1 + 0.1 * lvl("jump")) * (has("speedy") ? 1.2 : 1),
        sprint: lvl("sprint") + lvl("hayboard") * 1.35,
        hover: lvl("hover") > 0,
        dbl: lvl("dblj") > 0,
        jet: lvl("jetpack") > 0 || rb("infjet"),
        jetFuel: rb("infjet") ? 9999 : 1.6 * (1 + 0.4 * lvl("jfuel")),
        jetThrust: 1 + 0.15 * lvl("jthrust"),
        jetRefuel: 0.5 * (1 + 0.3 * lvl("jrefuel"))
      }
    };
  }

  function upCost(u) {
    const k = Math.max(0, u.grow - 1) * lvl(u.id);
    let c = u.base * 3.9 * (1 + k + 0.35 * k * k + 0.08 * k * k * k) * Math.pow(1.45, lvl(u.id));
    if (u.group === "Pitchfork" && has("forklord")) c *= 0.75;
    return Math.round(c * 100) / 100;
  }

  function freshRun(mapId) {
    const m = mapDef(mapId);
    const r = {
      map: m.id, seed: (Date.now() & 0x7fffffff) ^ 0x5bd1e995, cash: 5 * (S().perks.startCash || 0), bag: 0, bagValue: 0, up: {}, tier: 0,
      tools: { hand: true }, tool: "hand", lastTool: "hand", time: 0, carrying: false, needleOut: null, done: false, found: false, total: 0,
      cd: { hand: 0, fork: 0, tnt: 0, tornado: 0, hole: 0 }, heat: 0, overheated: false, vacAcc: 0, vacTick: 0, tntCount: 0, vacOn: false,
      combo: 0, comboT: 0, storm: 0, stormNext: 150 + Math.random() * 90, compassOff: [(Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3], radar: 0,
      scale: HH.stackScale(S().needles || 0, S().rebirths || 0, m.id), levelIndex: 0, level: null, nonce: 0, mud: [], wind: null, zoneMul: 1, bagState: 0
    };
    if (rb("kitgrab")) r.up.hold = 1;
    if (rb("kitbag")) r.tier = 2;
    if (rb("kitfork")) r.tools.fork = true;
    return r;
  }

  function scaledDef(id, scale, L) {
    const m = mapDef(id);
    const d = Object.assign({}, m, { radius: Math.round(m.radius * scale), height: Math.round(m.height * scale) });
    if (L) {
      d.layout = L.layout;
      d.stones = 0;
      d.deep = !!L.deep || (L.index || 0) >= 5;
      const f = 1 - Math.min(0.28, (densityFor(L.index) - 1) * 0.09);
      d.hay = m.hay.map(function (c) { const col = new THREE.Color(c); col.multiplyScalar(f); col.g *= 0.98; return col.getHex(); });
      if (L.layout === "tower") d.tall = true;
      if (L.layout === "wall") d.radius = Math.round(d.radius * 1.1);
      if (L.layout === "maze") d.radius = Math.round(Math.min(d.radius, 44) * 0.95);
    }
    return d;
  }

  function levelScale(L, mapId) {
    const grow = 1 + 0.045 * Math.min(L.index || 0, 16);
    return Math.min(2.2, HH.stackScale(S().needles || 0, S().rebirths || 0, mapId) * (L.size || 1) * grow);
  }

  function setupLevelExtras(L, seed) {
    const r = rng(seed ^ 0x9e3779b9);
    R.mud = [];
    const ext = V.extent;
    for (let q = 0; q < (L.mud || 0); q++) {
      const a = r() * Math.PI * 2, d = ext * (0.25 + r() * 0.85);
      R.mud.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: 1.6 + r() * 1.8 });
    }
    R.wind = L.wind ? { next: 6 + r() * 6, t: 0, dir: new THREE.Vector3(1, 0, 0), str: 0 } : null;
    HH.World.setLevelExtras({ mud: R.mud, wind: !!L.wind, fog: !!L.fog });
  }

  const CARRY = ["cash", "bag", "bagValue", "up", "tier", "tools", "tool", "lastTool", "tntCount"];

  function carryOf(r) {
    const o = {};
    CARRY.forEach(function (k) { if (r[k] !== undefined) o[k] = JSON.parse(JSON.stringify(r[k])); });
    return o;
  }

  function startLevel(index, seed, scale, snap) {
    const L = levelDef(index);
    const prev = R && !R.wiped ? carryOf(R) : (!R && S().carry ? S().carry : null);
    R = freshRun(L.map);
    if (prev) {
      CARRY.forEach(function (k) { if (prev[k] !== undefined) R[k] = prev[k]; });
      if (R.tool !== "none" && !R.tools[R.tool]) R.tool = "hand";
    }
    R.levelIndex = index;
    R.density = densityFor(index);
    R.level = L;
    R.seed = seed || ((Date.now() & 0x7fffffff) ^ (index * 7919));
    R.nonce = R.seed;
    R.scale = scale || levelScale(L, L.map);
    const def = scaledDef(L.map, R.scale, L);
    let grid = null;
    if (snap && snap.grid) grid = V.decode(snap.grid, V.sizeFor(def));
    V.build(HH.World.scene, def, R.seed, { diamondMul: (has("sniffer") ? 1.5 : 1) * (rb("clover") ? 1.5 : 1), lucky: (S().perks.lucky || 0) + (rb("clover") ? 3.4 : 0), total: snap ? snap.total : 0 }, grid);
    R.total = snap && snap.total ? snap.total : V.total;
    afterBuild();
    setupLevelExtras(L, R.seed);
    MP.carrier = null;
    MP.delivered = false;
    Object.keys(MP.fx).forEach(function (k) { HH.World.scene.remove(MP.fx[k].mesh); });
    MP.fx = {};
    if (snap && snap.needle) {
      R.found = !!snap.needle.found;
      if (snap.needle.carrier !== null && snap.needle.carrier !== undefined) {
        MP.carrier = snap.needle.carrier;
        if (isMe(MP.carrier)) R.carrying = true;
      } else if (snap.needle.out) R.needleOut = HH.World.addPickup("needle", new THREE.Vector3(snap.needle.out[0], snap.needle.out[1], snap.needle.out[2]));
    }
    HH.Player.spawn(HH.World.spots.spawn.clone());
    S().current = index;
    if (!HH.Net.active) persist();
    emit("run", { level: L, index: index });
  }

  function newRun() {
    startLevel(S().current !== undefined ? S().current : (S().campaign || 0));
  }

  function clearEntities() {
    const sc = HH.World.scene;
    bombs.forEach(function (b) { sc.remove(b.mesh); }); bombs.length = 0;
    tornados.forEach(function (t) { sc.remove(t.mesh); }); tornados.length = 0;
    holes.forEach(function (h) { sc.remove(h.mesh); }); holes.length = 0;
    drones.forEach(function (d) { sc.remove(d.mesh); }); drones.length = 0;
    if (hamster) { sc.remove(hamster.mesh); hamster = null; }
    if (goose) { sc.remove(goose); goose = null; }
    if (HH.Monsters) HH.Monsters.clear();
  }

  function afterBuild() {
    HH.World.buildEnv(mapDef(R.map));
    clearEntities();
    needleCache = { t: 0, p: null };
  }

  function restore() {
    const sv = S().run;
    if (!sv || sv.levelIndex === undefined) return false;
    const L = levelDef(sv.levelIndex);
    const def = scaledDef(L.map, sv.scale || 1, L);
    const g = V.decode(sv.grid, V.sizeFor(def));
    if (!g) return false;
    R = Object.assign(freshRun(L.map), sv);
    R.level = L;
    R.density = densityFor(R.levelIndex);
    delete R.grid; delete R.needleAt;
    R.cd = { hand: 0, fork: 0, tnt: 0, tornado: 0, hole: 0 };
    R.heat = 0; R.overheated = false; R.vacAcc = 0; R.done = false; R.needleOut = null; R.combo = 0; R.storm = 0; R.vacOn = false;
    V.build(HH.World.scene, def, R.seed, { total: sv.total }, g);
    afterBuild();
    setupLevelExtras(L, R.seed);
    if (sv.needleAt) R.needleOut = HH.World.addPickup("needle", new THREE.Vector3(sv.needleAt[0], sv.needleAt[1], sv.needleAt[2]));
    HH.Player.spawn(HH.World.spots.spawn.clone());
    emit("run", { restored: true, level: L, index: R.levelIndex });
    return true;
  }

  function persist() {
    if (HH.Net.active) return;
    if (R && !R.wiped) S().carry = carryOf(R);
    if (!R || R.done) { S().run = null; HH.Save.save(); return; }
    const np = R.needleOut ? R.needleOut.mesh.position : null;
    S().run = {
      map: R.map, seed: R.seed, nonce: R.nonce, cash: R.cash, bag: R.bag, bagValue: R.bagValue, up: R.up, tier: R.tier, tools: R.tools, total: R.total,
      needlesDone: R.needlesDone || 0, tool: R.tool, lastTool: R.lastTool, time: R.time, carrying: R.carrying, found: R.found, grid: V.encode(), stormNext: R.stormNext, scale: R.scale, tntCount: R.tntCount,
      levelIndex: R.levelIndex, needleAt: np ? [np.x, np.y, np.z] : null
    };
    HH.Save.save();
  }

  function bumpCombo() {
    R.combo = Math.min(999, R.combo + 1 + Math.floor(lvl("combo") / 2));
    R.comboT = 1.6 + 0.35 * lvl("combo");
  }

  function collect(res, st, from, target, toBag, bonusMul) {
    const flakes = res.hay + res.rainbow * 3;
    const value = st.basePrice * st.mul * (res.hay + res.rainbow * 6) * (bonusMul || 1);
    if (toBag) { R.bag += flakes; R.bagValue += value; }
    if (res.diamond) {
      const g = Math.max(1, Math.round(3 * res.diamond * st.gemMul));
      S().gems += g; S().stats.diamonds += res.diamond;
      HH.Audio.play("diamond");
      emit("popup", { text: "+" + g + " gems", pos: from, color: "#7ff7ff" });
    }
    if (res.rainbow) { HH.Audio.play("rainbow"); emit("popup", { text: "RAINBOW HAY!", pos: from, color: "#ff8ae2" }); }
    S().stats.hay += res.hay + res.rainbow;
    if (toBag && flakes) HH.Audio.collect(flakes);
    return { flakes: flakes, value: value };
  }

  function digParticles(res, op) {
    let target = null;
    if (!isMe(op.by)) {
      const av = HH.Remote.get(op.by);
      target = av ? av.root.position : null;
    }
    const n = Math.min(res.points.length, op.mode === "destroy" ? 18 : 10);
    for (let q = 0; q < n; q++) {
      const pt = res.points[q];
      const col = pt.t === 2 ? new THREE.Color().setHSL(Math.random(), 0.9, 0.6).getHex() : pt.t === 3 ? 0x7ff7ff : pt.t === 5 ? 0x8a8d93 : (q % 3 ? 0xf2c94c : 0xfff0b0);
      if (op.mode === "destroy" || (target === null && !isMe(op.by))) {
        const c = new THREE.Vector3(op.p[0], op.p[1], op.p[2]);
        HH.World.spawn(pt.p, pt.p.clone().sub(c).normalize().multiplyScalar(4 + Math.random() * 6).add(new THREE.Vector3(0, 4, 0)), col, "debris", 1.3);
      } else HH.World.spawn(pt.p, new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3), col, "suck", 1.5, op.dest === "drone" ? null : target);
    }
  }

  function needlesFor(i) {
    if (HH.Net.active) return 1;
    const L = levelDef(i || 0);
    return Math.min(Math.min(8, 6 + Math.ceil((L.hard || 0) / 2)), 1 + Math.floor((i || 0) / 2));
  }

  function nextNeedle(st) {
    R.needlesDone = (R.needlesDone || 0) + 1;
    R.carrying = false;
    R.found = false;
    R.radarOff = null;
    if (!V.hideNeedle()) { finish(st, me()); return; }
    needleCache = { t: 0, p: null };
    const g = Math.max(1, Math.round(mapDef(R.map).gems * 0.15 * st.gemMul));
    S().gems += g;
    HH.Audio.play("levelup");
    emit("popup", { text: "+" + g + " gems", pos: HH.World.spots.wizard.clone().add(new THREE.Vector3(0, 2.5, 0)), color: "#7ff7ff", big: true });
    emit("needlepart", { done: R.needlesDone, need: needlesFor(R.levelIndex) });
    persist();
  }

  function releaseNeedle(p) {
    if (R.found) return;
    R.found = true;
    R.needleOut = HH.World.addPickup("needle", p);
    HH.Audio.play("needle");
    emit("needle", { pos: p });
  }

  function densityFor(i) { return 1 + 0.14 * Math.min(i || 0, 25) + 0.25 * (levelDef(i || 0).hard || 0); }

  function dig(op, cb) {
    const cut = Math.min(0.92, 0.1 * lvl("sharp") + 0.08 * lvl("loosen") + 0.06 * lvl("lore") + rbfx("density"));
    const D = 1 + ((R.density || 1) - 1) * (1 - cut);
    if (D > 1 && op.lim !== 1) { op.r = op.r / Math.cbrt(D); if (op.lim) op.lim = Math.max(1, Math.round(op.lim / D)); }
    op.by = me();
    op.oid = ++MP.oid;
    op.n = R.nonce;
    if (cb) MP.cbs[op.oid] = cb;
    if (!HH.Net.active) { applyOp(op); return; }
    if (!MP.synced) { delete MP.cbs[op.oid]; return; }
    HH.Net.send("req", op, "master");
  }

  function applyOp(op) {
    if (!R || op.n !== R.nonce) return;
    const point = new THREE.Vector3(op.p[0], op.p[1], op.p[2]);
    const cands = V.nearest(point, op.r, 0, !!op.st);
    const pick = [];
    let used = 0;
    if (op.mode === "take") {
      for (let q = 0; q < cands.length && pick.length < op.lim; q++) {
        const c = cands[q];
        const need = c.t === V.RAINBOW ? 3 : c.t === V.DIAMOND ? 0 : 1;
        if (used + need > op.sp) continue;
        used += need;
        pick.push(c.c);
      }
    } else {
      for (let q = 0; q < cands.length && (!op.lim || pick.length < op.lim); q++) pick.push(cands[q].c);
    }
    const res = pick.length ? V.removeCells(pick) : { hay: 0, rainbow: 0, diamond: 0, needle: null, points: [] };
    res.used = used;
    res.cands = cands.length;
    if (res.needle) releaseNeedle(res.needle);
    if (op.fx === "boom") boomFx(point, op);
    if (op.tid && MP.fx[op.tid]) MP.fx[op.tid].target = point;
    if (pick.length) digParticles(res, op);
    if (isMe(op.by)) {
      const cb = MP.cbs[op.oid];
      delete MP.cbs[op.oid];
      if (cb) cb(res);
    } else if (op.fx === "boom") {
      for (let n = bombs.length - 1; n >= 0; n--) if (bombs[n].remote && bombs[n].bid === op.bid) { HH.World.scene.remove(bombs[n].mesh); bombs.splice(n, 1); }
    }
  }

  function take(point, radius, limit, st, quietFull, bonusMul, after) {
    const space = st.cap - R.bag;
    if (space <= 0) {
      if (st.autosell && R.bag > 0) { sell(st.autosell, true); return take(point, radius, limit, stats(), quietFull, bonusMul, after); }
      if (!quietFull) bagBlocked(point);
      return false;
    }
    dig({ p: [point.x, point.y, point.z], r: radius, lim: limit, mode: "take", sp: space }, function (res) {
      const s2 = stats();
      if (res.hay + res.rainbow + res.diamond > 0) {
        collect(res, s2, point, null, true, bonusMul);
        bumpCombo();
        if (s2.drill && Math.random() < s2.drill) {
          const g = Math.max(1, Math.round(s2.gemMul));
          S().gems += g;
          HH.Audio.play("gem");
          emit("popup", { text: "DRILL +" + g + " gems", pos: point, color: "#7ff7ff" });
        }
        emit("grabbed", {});
      }
      if (R.bag >= s2.cap && s2.autosell) sell(s2.autosell, true);
      else if (res.used >= space && res.cands > res.used && !quietFull) bagBlocked(point);
      if (after) after(res);
    });
    return true;
  }

  function bagBlocked(point) {
    if (blockedT > 0) return;
    blockedT = 1.2;
    emit("bagblocked", { pos: point });
    if (fullMsgT > 0) return;
    fullMsgT = 3;
    HH.Audio.play("fullBig");
    emit("toast", { text: "<b>BAG FULL!</b>" });
  }

  function sell(rate, auto) {
    if (R.bag <= 0) return;
    const st = stats();
    const bulk = 1 + st.bulk * Math.floor(R.bag / 100);
    const v = R.bagValue * bulk * rate * (boostOn("sellboost") ? 2 : 1);
    R.cash += v; S().stats.cash += v; S().stats.sells = (S().stats.sells || 0) + 1;
    const pp = HH.Player.pos;
    emit("popup", { text: (auto ? "AUTO-SOLD +$" : "+$") + HH.cash(v) + (bulk > 1 ? "  BULK x" + bulk.toFixed(2) : ""), pos: pp.clone().add(new THREE.Vector3(0, 2.4, 0)), color: "#8aff8a", big: true });
    HH.Audio.play("sell", R.bag > 100);
    if (buyerT <= 0 && !auto) {
      buyerT = 3;
      emit("say", { who: HH.NPC.buyer.name, text: HH.BUYER_LINES[Math.floor(Math.random() * HH.BUYER_LINES.length)], color: "#b6ff8a" });
      const b = HH.World.npc.buyer;
      if (b) b.play("Cheer", 0.1, true);
    }
    const sp = HH.World.spots.sell;
    const stall = new THREE.Vector3(sp.x, 0.4, sp.z - 3.4);
    const from = HH.Player.head.clone().add(new THREE.Vector3(0, -0.5, 0));
    const flakes = Math.min(70, 12 + Math.floor(R.bag / 6));
    const near = !auto && from.distanceTo(stall) < 14;
    for (let q = 0; q < flakes; q++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 4, 3 + Math.random() * 4, (Math.random() - 0.5) * 4);
      if (near) HH.World.spawn(from, v, q % 5 ? 0xf2c94c : 0xffe08a, "suck", 2.2, stall);
      else HH.World.spawn(from, v, q % 5 ? 0xf2c94c : 0xffe08a, "debris", 1.2);
    }
    const coins = Math.min(30, 6 + Math.floor(Math.log2(1 + v) * 2));
    setTimeout(function () {
      const src = near ? stall.clone().add(new THREE.Vector3(0, 1.2, 0)) : HH.Player.head.clone().add(new THREE.Vector3(0, 1.5, 0));
      for (let q = 0; q < coins; q++) HH.World.spawn(src, new THREE.Vector3((Math.random() - 0.5) * 5, 4 + Math.random() * 3, (Math.random() - 0.5) * 5), q % 3 ? 0xffd23f : 0xfff1a0, "suck", 2.4, null, 1.5);
    }, near ? 450 : 120);
    R.bag = 0; R.bagValue = 0;
    emit("sold", { value: v });
  }

  function bombMesh(mega) {
    const g = new THREE.Group();
    for (let q = 0; q < 3; q++) { const s = HH.World.cyl(0.07, 0.07, 0.42, 0xd63031, 8); s.position.x = (q - 1) * 0.13; g.add(s); }
    const band = HH.World.box(0.42, 0.08, 0.16, 0x333333); g.add(band);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    spark.position.y = 0.3; g.add(spark);
    g.userData.spark = spark;
    if (mega) g.scale.setScalar(2);
    return g;
  }

  function throwTnt(target, st, mega) {
    const from = HH.Player.head.add(new THREE.Vector3(0, 0.2, 0));
    const T = Math.max(0.45, Math.min(1.1, from.distanceTo(target) / 15));
    const vel = new THREE.Vector3((target.x - from.x) / T, (target.y - from.y) / T + 0.5 * 18 * T, (target.z - from.z) / T);
    const mesh = bombMesh(mega);
    mesh.position.copy(from);
    HH.World.scene.add(mesh);
    const bid = me() + ":" + (++MP.oid);
    bombs.push({ mesh: mesh, vel: vel, landed: false, fuse: st.tntFuse, life: 0, mega: !!mega, st: st, bid: bid, tickT: 0 });
    if (HH.Net.active) HH.Net.send("tnt", { f: [from.x, from.y, from.z], v: [vel.x, vel.y, vel.z], m: !!mega, bid: bid, fuse: st.tntFuse, n: R.nonce });
    HH.Audio.play("throw");
  }

  function boomFx(p, op) {
    const r = op.r;
    for (let n = 0; n < 30; n++) HH.World.spawn(p, new THREE.Vector3((Math.random() - 0.5) * 14, Math.random() * 12, (Math.random() - 0.5) * 14), n % 3 === 0 ? 0x444444 : n % 3 === 1 ? 0xff7a2a : 0xffd23f, "debris", 0.9, null, 1.6);
    HH.Audio.play("boom");
    emit("shake", { amt: Math.max(0.12, (op.big ? 1 : 0.7) - HH.Player.pos.distanceTo(p) * 0.03) });
    emit("flash", {});
    if (op.big) emit("popup", { text: "NUKE-A-MITE!!", pos: p.clone().add(new THREE.Vector3(0, 2, 0)), color: "#ff3b3b", big: true });
    S().stats.blasts += isMe(op.by) ? 1 : 0;
    return r;
  }

  function explode(p, st, small, mega, bid) {
    const r = mega ? st.tntR * 2.3 : small ? st.tntR * 0.7 : st.tntR;
    if (HH.Monsters) HH.Monsters.blast(p, r);
    dig({ p: [p.x, p.y, p.z], r: r, lim: 0, mode: "destroy", st: 1, fx: "boom", bid: bid, big: !!mega }, function (res) {
      let lucky = 0;
      res.points.forEach(function (pt) {
        if (st.lucky > 0 && lucky < 20 && pt.t === V.HAY && Math.random() < st.lucky * 0.3) { HH.World.addPickup("rainbow", pt.p); lucky++; }
      });
      for (let n = 0; n < Math.min(res.rainbow, 10); n++) HH.World.addPickup("rainbow", p.clone().add(new THREE.Vector3(0, 0.5, 0)));
      if (res.diamond) {
        const g = Math.max(1, Math.round(3 * res.diamond * st.gemMul));
        S().gems += g; S().stats.diamonds += res.diamond;
        emit("popup", { text: "+" + g + " gems", pos: p, color: "#7ff7ff" });
      }
      if (lucky) emit("popup", { text: "LUCKY BLAST x" + lucky, pos: p, color: "#ff8ae2" });
      const s2 = stats();
      const got = Math.min(Math.max(0, s2.cap - R.bag), Math.floor(res.hay * 0.7));
      if (got > 0) {
        R.bag += got;
        R.bagValue += got * s2.basePrice * s2.mul;
        for (let q = 0; q < Math.min(30, got); q++) HH.World.spawn(p.clone().add(new THREE.Vector3((Math.random() - 0.5) * r, Math.random() * r * 0.6, (Math.random() - 0.5) * r)), new THREE.Vector3((Math.random() - 0.5) * 4, 4 + Math.random() * 3, (Math.random() - 0.5) * 4), 0xf2c94c, "suck", 2);
        emit("popup", { text: "+" + got + " hay", pos: p.clone().add(new THREE.Vector3(0, 1.5, 0)), color: "#ffe08a" });
        updateBagState(s2);
      }
    });
  }

  function updateBombs(dt) {
    for (let n = bombs.length - 1; n >= 0; n--) {
      const b = bombs[n];
      b.life += dt;
      const pos = b.mesh.position;
      const supported = pos.y <= 0.16 || V.solidAt(pos.x, pos.y - 0.2, pos.z);
      if (!b.landed || !supported) {
        b.vel.y -= 18 * dt;
        const next = pos.clone().addScaledVector(b.vel, dt);
        if (next.y <= 0.12) { next.y = 0.12; b.landed = true; b.vel.set(0, 0, 0); pos.copy(next); }
        else if (V.solidAt(next.x, next.y, next.z)) {
          if (b.vel.y < 0 || b.landed) {
            const top = V.topAt(next.x, next.z);
            pos.set(next.x, Math.max(pos.y, top + 0.12), next.z);
          }
          b.landed = true;
          b.vel.set(0, 0, 0);
        } else pos.copy(next);
        b.mesh.rotation.x += dt * (b.landed ? 0 : 10);
      }
      if (b.landed) {
        b.fuse -= dt;
        b.tickT -= dt;
        const k = 1 - Math.max(0, b.fuse) / b.st.tntFuse;
        const pulse = (b.mega ? 2 : 1) * (1 + Math.sin(b.life * (12 + k * 30)) * 0.08 * (1 + k));
        b.mesh.scale.setScalar(pulse);
        if (b.tickT <= 0) { b.tickT = 0.32 - k * 0.22; HH.Audio.play("tick", k); }
      }
      if (b.mesh.userData.spark) b.mesh.userData.spark.visible = Math.random() < 0.75;
      if (Math.random() < 0.6) HH.World.spawn(pos, new THREE.Vector3(Math.random() - 0.5, 1.5, Math.random() - 0.5), 0xffd23f, "debris", 0.3);
      const expire = (b.landed && b.fuse <= 0) || b.life > 8;
      if (b.remote) {
        if (b.life > b.fuseTotal + 4) { HH.World.scene.remove(b.mesh); bombs.splice(n, 1); }
        continue;
      }
      if (expire) {
        HH.World.scene.remove(b.mesh);
        bombs.splice(n, 1);
        const p = pos.clone();
        explode(p, b.st, false, b.mega, b.bid);
        if (Math.random() < b.st.cluster) {
          for (let q = 0; q < 2; q++) explode(p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3.5, 0, (Math.random() - 0.5) * 3.5)), b.st, true, false, b.bid + "c" + q);
          emit("popup", { text: "CLUSTER BOOM!", pos: p, color: "#ff7a2a", big: true });
        }
      }
    }
  }

  function tornadoMesh() {
    const g = new THREE.Group();
    const m = new THREE.MeshLambertMaterial({ color: 0xe8d9a8, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    for (let q = 0; q < 4; q++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(1.2 - q * 0.22, 0.25, 4.5 - q * 0.6, 14, 1, true), m);
      c.position.y = 2.2 + q * 0.2;
      c.rotation.y = q;
      g.add(c);
    }
    return g;
  }

  function holeMesh() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0x000000 })));
    const ringM = new THREE.MeshBasicMaterial({ color: 0xb36bff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.18, 8, 48), ringM); ring.rotation.x = Math.PI / 2.4; g.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.08, 6, 48), ringM.clone()); ring2.material.color.setHex(0xff7ae0); ring2.rotation.x = Math.PI / 2.1; g.add(ring2);
    g.userData.rings = [ring, ring2];
    return g;
  }

  function summonTornado(point, st) {
    for (let q = 0; q < st.torN; q++) {
      const mesh = tornadoMesh();
      const p = point.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2 * q, 0, (Math.random() - 0.5) * 2 * q));
      mesh.position.copy(p);
      HH.World.scene.add(mesh);
      const a = Math.random() * Math.PI * 2;
      const tid = me() + "t" + (++MP.oid);
      tornados.push({ mesh: mesh, pos: p, dir: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), life: st.torLife, t: 0, acc: 0, tid: tid });
      if (HH.Net.active) HH.Net.send("fx", { k: "tor", id: tid, p: [p.x, p.y, p.z], life: st.torLife, r: st.torR, n: R.nonce });
    }
    HH.Audio.play("boom");
    emit("popup", { text: "HAY TORNADO!", pos: point, color: "#fff0b0", big: true });
  }

  function updateTornados(dt, st) {
    const ext = V.extent * 0.9;
    for (let n = tornados.length - 1; n >= 0; n--) {
      const t = tornados[n];
      t.life -= dt; t.t += dt;
      t.dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * dt * 3);
      t.pos.addScaledVector(t.dir, dt * 2.2);
      const r = Math.hypot(t.pos.x, t.pos.z);
      if (r > ext) t.dir.set(-t.pos.x, 0, -t.pos.z).normalize();
      const top = V.topAt(t.pos.x, t.pos.z);
      t.pos.y += (top - t.pos.y) * Math.min(1, dt * 4);
      t.mesh.position.copy(t.pos);
      t.mesh.children.forEach(function (c, q) { c.rotation.y += dt * (8 + q * 3); });
      const s = Math.min(1, t.t * 3, t.life * 2) * (st.torR / 1.1);
      t.mesh.scale.set(s, Math.min(1, t.t * 3, t.life * 2), s);
      t.acc += dt;
      if (t.acc >= 0.12) {
        t.acc = 0;
        const pt = t.pos.clone().add(new THREE.Vector3(0, -0.3, 0));
        if (st.cap - R.bag > 0) dig({ p: [pt.x, pt.y, pt.z], r: st.torR, lim: 14, mode: "take", sp: st.cap - R.bag, tid: t.tid }, function (res) { if (res.hay + res.rainbow + res.diamond) { collect(res, stats(), pt, null, true); bumpCombo(); } });
        else dig({ p: [pt.x, pt.y, pt.z], r: st.torR * 0.8, lim: 8, mode: "destroy", tid: t.tid });
        for (let q = 0; q < 3; q++) {
          const a = Math.random() * Math.PI * 2;
          HH.World.spawn(t.pos.clone().add(new THREE.Vector3(Math.cos(a) * st.torR, Math.random() * 3, Math.sin(a) * st.torR)), new THREE.Vector3(-Math.sin(a) * 6, 3, Math.cos(a) * 6), 0xf2c94c, "debris", 0.6);
        }
      }
      if (t.life <= 0) { HH.World.scene.remove(t.mesh); tornados.splice(n, 1); }
    }
  }

  function summonHole(point, st) {
    const g = holeMesh();
    g.position.copy(point).add(new THREE.Vector3(0, 0.8, 0));
    g.scale.setScalar(0.01);
    HH.World.scene.add(g);
    const tid = me() + "h" + (++MP.oid);
    holes.push({ mesh: g, pos: g.position.clone(), t: 0, life: 4.5, acc: 0, rings: g.userData.rings, tid: tid });
    if (HH.Net.active) HH.Net.send("fx", { k: "hole", id: tid, p: [g.position.x, g.position.y, g.position.z], life: 4.5, r: st.holeR, n: R.nonce });
    HH.Audio.play("boom");
    emit("popup", { text: "BLACK HOLE!", pos: point, color: "#d9a6ff", big: true });
    emit("shake", { amt: 0.35 });
  }

  function updateHoles(dt, st) {
    for (let n = holes.length - 1; n >= 0; n--) {
      const h = holes[n];
      h.t += dt; h.life -= dt;
      const grow = Math.min(1, h.t / 1.2) * Math.min(1, h.life * 2);
      const r = st.holeR * (0.5 + 0.5 * Math.min(1, h.t / 2.5));
      h.mesh.scale.setScalar(Math.max(0.01, grow * r * 0.35));
      h.rings[0].rotation.z += dt * 4; h.rings[1].rotation.z -= dt * 6;
      h.acc += dt;
      if (h.acc >= 0.09 && h.life > 0.3) {
        h.acc = 0;
        if (st.cap - R.bag > 0) dig({ p: [h.pos.x, h.pos.y, h.pos.z], r: r, lim: 60, mode: "take", sp: st.cap - R.bag, st: 0 }, function (res) { if (res.hay + res.rainbow + res.diamond) { collect(res, stats(), h.pos, null, true); bumpCombo(); } });
        else dig({ p: [h.pos.x, h.pos.y, h.pos.z], r: r, lim: 40, mode: "destroy", st: 1 });
        for (let q = 0; q < 6; q++) {
          const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.5) * 2;
          const p = h.pos.clone().add(new THREE.Vector3(Math.cos(a) * r * 1.3, e * r * 0.6, Math.sin(a) * r * 1.3));
          HH.World.spawn(p, new THREE.Vector3(-Math.sin(a) * 5, 0, Math.cos(a) * 5), q % 2 ? 0xb36bff : 0xf2c94c, "suck", 1.2, h.pos);
        }
        if (Math.random() < 0.3) emit("shake", { amt: 0.08 });
      }
      if (h.life <= 0) { HH.World.scene.remove(h.mesh); holes.splice(n, 1); }
    }
  }

  function updateRemoteFx(dt) {
    Object.keys(MP.fx).forEach(function (id) {
      const f = MP.fx[id];
      f.life -= dt;
      f.t += dt;
      if (f.target) f.mesh.position.lerp(f.target, Math.min(1, dt * 5));
      if (f.kind === "tor") {
        f.mesh.children.forEach(function (c, q) { c.rotation.y += dt * (8 + q * 3); });
        const s = Math.min(1, f.t * 3, Math.max(0, f.life) * 2) * (f.r / 1.1);
        f.mesh.scale.set(s, Math.min(1, f.t * 3, Math.max(0, f.life) * 2), s);
      } else {
        const g = Math.min(1, f.t / 1.2) * Math.min(1, Math.max(0, f.life) * 2);
        f.mesh.scale.setScalar(Math.max(0.01, g * f.r * 0.35));
        f.mesh.userData.rings[0].rotation.z += dt * 4;
      }
      if (f.life <= -0.5) { HH.World.scene.remove(f.mesh); delete MP.fx[id]; }
    });
  }

  function makeDrone() {
    const g = new THREE.Group();
    g.add(HH.World.box(0.7, 0.25, 0.7, 0x2d9cdb));
    const eye = HH.World.sph(0.12, 0x111111, 8); eye.position.set(0, 0, 0.36); g.add(eye);
    const basket = HH.World.box(0.5, 0.3, 0.5, 0x9a6b3f); basket.position.y = -0.3; g.add(basket);
    const rotors = [];
    [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]].forEach(function (p) {
      const r = HH.World.box(0.55, 0.02, 0.07, 0xdddddd); r.position.set(p[0], 0.18, p[1]); g.add(r); rotors.push(r);
    });
    g.userData.rotors = rotors;
    g.position.set(HH.World.spots.sell.x, 5, HH.World.spots.sell.z);
    HH.World.scene.add(g);
    return { mesh: g, phase: "toPile", target: null, value: 0, wait: Math.random(), busy: false };
  }

  function updateDrones(dt, st) {
    while (drones.length < st.drones) drones.push(makeDrone());
    drones.forEach(function (d) {
      const m = d.mesh;
      m.userData.rotors.forEach(function (r, i) { r.rotation.y += dt * 40 * (i % 2 ? 1 : -1); });
      if (d.wait > 0 || d.busy) { d.wait -= dt; return; }
      if (d.phase === "toPile" && !d.target) {
        const s = V.randomSurface(Math.random);
        if (!s) { d.wait = 2; return; }
        d.target = s.p.clone().add(new THREE.Vector3(0, 1.3, 0));
      }
      const tgt = d.phase === "toPile" ? d.target : new THREE.Vector3(HH.World.spots.sell.x, 3.5, HH.World.spots.sell.z);
      const dv = tgt.clone().sub(m.position);
      const dist = dv.length();
      if (dist > 0.2) { m.position.addScaledVector(dv.normalize(), Math.min(dist, st.droneSpeed * dt)); m.rotation.y = Math.atan2(dv.x, dv.z); return; }
      if (d.phase === "toPile") {
        const c = d.target.clone().add(new THREE.Vector3(0, -1.3, 0));
        d.busy = true;
        dig({ p: [c.x, c.y, c.z], r: 1.3, lim: st.droneCap, mode: "take", sp: 99999, dest: "drone" }, function (res) {
          d.busy = false;
          const got = collect(res, stats(), m.position.clone(), m.position, false);
          d.value = got.value; d.phase = "toSell"; d.target = null; d.wait = 0.4;
          HH.Audio.play("drone");
        });
        setTimeout(function () { d.busy = false; }, 1500);
      } else {
        if (d.value > 0) { R.cash += d.value; S().stats.cash += d.value; emit("popup", { text: "+$" + HH.cash(d.value), pos: m.position.clone(), color: "#8aff8a" }); }
        d.value = 0; d.phase = "toPile"; d.wait = 0.3;
      }
    });
  }

  function updatePets(dt, st) {
    const sc = HH.World.scene;
    if (st.hamster && !hamster) {
      const g = new THREE.Group();
      const body = HH.World.sph(0.25, 0xd9a066); body.scale.set(1, 0.85, 1.2); body.position.y = 0.25; g.add(body);
      const belly = HH.World.sph(0.17, 0xffe6c8); belly.position.set(0, 0.2, 0.15); g.add(belly);
      [-0.12, 0.12].forEach(function (x) { const e = HH.World.sph(0.07, 0xd9a066, 6); e.position.set(x, 0.48, -0.05); g.add(e); const ey = HH.World.sph(0.035, 0x111111, 6); ey.position.set(x * 0.8, 0.33, 0.25); g.add(ey); });
      const hat = HH.World.cyl(0.1, 0.12, 0.12, 0xf2c94c, 10); hat.position.y = 0.52; g.add(hat);
      sc.add(g);
      hamster = { mesh: g, acc: 0, hop: 0 };
    }
    if (hamster) {
      const pp = HH.Player.pos;
      const want = new THREE.Vector3(pp.x + 0.9, 0, pp.z + 0.6);
      const hm = hamster.mesh;
      hm.position.x += (want.x - hm.position.x) * Math.min(1, dt * 4);
      hm.position.z += (want.z - hm.position.z) * Math.min(1, dt * 4);
      hamster.hop += dt * 10;
      const ground = Math.max(V.topAt(hm.position.x, hm.position.z), 0);
      hm.position.y = ground + Math.abs(Math.sin(hamster.hop)) * 0.15;
      hm.rotation.y = Math.atan2(pp.x - hm.position.x, pp.z - hm.position.z);
      hamster.acc += dt * st.hamRate;
      if (hamster.acc >= 1 && Math.hypot(pp.x, pp.z) < V.extent + 2.5 && R.bag + 3 <= st.cap) {
        hamster.acc = 0;
        const c = hm.position.clone().add(new THREE.Vector3(0, 0.3, 0));
        dig({ p: [c.x, c.y, c.z], r: 1.6, lim: 3, mode: "take", sp: st.cap - R.bag }, function (res) { collect(res, stats(), c, null, true); });
      }
      hamster.acc = Math.min(hamster.acc, 1.5);
    }
    if (lvl("goose") && !goose) {
      const g = new THREE.Group();
      const body = HH.World.sph(0.35, 0xffffff); body.scale.set(1, 0.8, 1.4); body.position.y = 0.4; g.add(body);
      const neck = HH.World.cyl(0.08, 0.1, 0.5, 0xffffff, 8); neck.position.set(0, 0.75, 0.35); g.add(neck);
      const head = HH.World.sph(0.13, 0xffffff, 8); head.position.set(0, 1.02, 0.4); g.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), HH.World.mat(0xff9a1f)); beak.rotation.x = Math.PI / 2; beak.position.set(0, 1.0, 0.58); g.add(beak);
      const crown = HH.World.cyl(0.08, 0.1, 0.08, 0xffd23f, 6); crown.position.set(0, 1.15, 0.4); g.add(crown);
      g.position.set(HH.World.spots.sell.x + 2.6, 0, HH.World.spots.sell.z - 2.6);
      sc.add(g);
      goose = g;
    }
    if (goose) goose.rotation.y = Math.sin(Date.now() / 600) * 0.5;
  }

  function tutorialDone() { return S().tutorial >= 3 || S().settings.tutorial === false; }

  function updateStorm(dt, st) {
    if (R.storm > 0) {
      R.storm -= dt;
      if (Math.random() < dt * 2.2) {
        const s = V.randomSurface(Math.random);
        if (s) HH.World.addPickup("gold", s.p.clone().add(new THREE.Vector3(0, 18, 0)));
      }
      const pp = HH.Player.pos;
      for (let q = 0; q < 3; q++) HH.World.spawn(new THREE.Vector3(pp.x + (Math.random() - 0.5) * 30, 14 + Math.random() * 6, pp.z + (Math.random() - 0.5) * 30), new THREE.Vector3(1, -6, 0.5), 0xffd23f, "rain", 4);
      if (R.storm <= 0) { emit("storm", { on: false }); R.stormNext = (150 + Math.random() * 120) / st.stormFreq; }
    } else if (tutorialDone()) {
      R.stormNext -= dt;
      if (R.stormNext <= 0) { R.storm = st.stormLen; emit("storm", { on: true }); HH.Audio.play("win"); }
    }
  }

  function updateHazards(dt) {
    const pp = HH.Player.pos;
    let mul = 1;
    if (pp.y < 0.3) R.mud.forEach(function (m) { if (Math.hypot(pp.x - m.x, pp.z - m.z) < m.r) mul = 0.5; });
    if (mul < 1 && !R.inMud) emit("toast", { text: "Stuck in the mud! You're slowed down." });
    R.inMud = mul < 1;
    R.zoneMul = mul;
    if (R.wind) {
      const w = R.wind;
      if (w.t > 0) {
        w.t -= dt;
        const k = Math.min(1, w.t, 3 - w.t);
        HH.Player.push(w.dir.x * w.str * k * dt, w.dir.z * w.str * k * dt);
        if (Math.random() < 0.5) HH.World.spawn(pp.clone().add(new THREE.Vector3(-w.dir.x * 8 + (Math.random() - 0.5) * 8, 0.5 + Math.random() * 3, -w.dir.z * 8 + (Math.random() - 0.5) * 8)), w.dir.clone().multiplyScalar(14), 0xf2e6c0, "rain", 1.2);
        HH.World.setWind(w.dir, k);
        if (w.t <= 0) w.next = 7 + Math.random() * 7;
      } else {
        w.next -= dt;
        HH.World.setWind(w.dir, 0.1);
        if (w.next <= 0) {
          const a = Math.random() * Math.PI * 2;
          w.dir.set(Math.cos(a), 0, Math.sin(a));
          w.str = 3.5 + Math.min(3, (R.levelIndex || 0) * 0.2);
          w.t = 3;
          emit("toast", { text: "<b>Wind gust!</b> Hold your ground!" });
          HH.Audio.play("throw");
        }
      }
    }
  }

  function aimPoint(ray, maxDist) {
    const hit = V.raycast(ray.origin, ray.direction, maxDist);
    if (hit) return { point: hit.point, hay: true, dist: hit.dist };
    if (ray.direction.y < -0.01) {
      const t = -ray.origin.y / ray.direction.y;
      if (t < maxDist) return { point: ray.origin.clone().addScaledVector(ray.direction, t), hay: false, dist: t };
    }
    return null;
  }

  function toggleEquip() {
    if (!R) return;
    if (R.tool === "none") { R.tool = R.lastTool || "hand"; HH.Audio.play("click"); }
    else { R.lastTool = R.tool; R.tool = "none"; HH.Audio.play("unequip"); emit("toast", { text: "Tools put away. Press <kbd>Q</kbd> or a number to equip." }); }
  }

  function updateBagState(st) {
    const f = R.bag / st.cap;
    const s = f >= 1 ? 2 : f >= 0.8 ? 1 : 0;
    if (s > R.bagState) {
      if (s === 1) { HH.Audio.play("warn"); emit("toast", { text: "<b>Bag almost full!</b>" }); }
      if (s === 2 && !st.autosell) { HH.Audio.play("fullBig"); emit("bagfull", {}); }
    }
    R.bagState = s;
  }

  function update(dt, I, allowTools) {
    if (!R || R.done) { updateRemoteFx(dt); return; }
    const st = stats();
    R.time += dt;
    fullMsgT -= dt; buyerT -= dt; blockedT -= dt; MP.grabT -= dt;
    Object.keys(R.cd).forEach(function (k) { R.cd[k] -= dt; });
    R.comboT -= dt;
    if (R.comboT <= 0 && R.combo > 0) { if (R.combo >= 20) emit("comboEnd", { n: R.combo }); R.combo = 0; }

    for (let n = 1; n <= HH.TOOLS.length; n++) if (I.consume("Digit" + n)) {
      const t = HH.TOOLS[n - 1];
      if (R.tool === t.id) toggleEquip(); else selectTool(t.id);
    }
    if (I.consume("KeyQ")) toggleEquip();
    if (I.consume("KeyF")) { if (lvl("teleport")) sell(0.8); }

    const ray = HH.Player.aimRay(I);
    const aim = aimPoint(ray, 60);
    const head = HH.Player.head;
    const tgt = HH.World.target;
    tgt.visible = false;
    let usingVac = false;
    let click = I.takeClick();
    const tool = R.tool;
    if (click && allowTools && HH.Monsters && HH.Monsters.count && HH.Monsters.hit(HH.Player.aimRay(I), tool)) { click = false; HH.Player.swing(tool === "fork" ? "fork" : "hand"); }
    if (allowTools && aim && tool !== "none" && MP.synced) {
      const reach = tool === "vac" ? st.vacReach : tool === "tnt" || tool === "tornado" || tool === "hole" ? 30 : st.reach;
      const inReach = aim.point.distanceTo(head) <= reach;
      const rad = tool === "hand" ? st.handR * 0.6 : tool === "fork" ? st.forkR : tool === "tnt" ? st.tntR : tool === "tornado" ? st.torR : tool === "hole" ? st.holeR : st.vacR;
      if (inReach && (aim.hay || tool === "tnt")) {
        tgt.visible = true;
        tgt.position.copy(aim.point);
        tgt.scale.setScalar(rad);
        const cdOn = (tool === "tnt" && R.cd.tnt > 0) || (tool === "tornado" && R.cd.tornado > 0) || (tool === "hole" && R.cd.hole > 0);
        tgt.material.color.setHex(cdOn ? 0x888888 : tool === "tnt" ? 0xff5533 : R.bag >= st.cap && !st.autosell ? 0xff4444 : 0xffffff);
      }
      const held = I.mouse.left;
      if (inReach && aim.hay) {
        if (tool === "hand" && R.cd.hand <= 0 && (click || (held && lvl("hold")))) {
          R.cd.hand = st.handCd;
          const gold = Math.random() < st.golden;
          if (take(aim.point, st.handR, st.grab * (gold ? 3 : 1), st)) {
            HH.Audio.play("grab"); HH.Player.swing("hand"); MP.sw++;
            if (gold) emit("popup", { text: "GOLDEN GRAB x3!", pos: aim.point, color: "#ffd23f" });
          }
        } else if (tool === "fork" && R.cd.fork <= 0 && (click || held)) {
          R.cd.fork = st.forkCd;
          const n = Math.floor(Math.pow(st.forkR / HH.VS, 3) * 2.1 * st.forkHaul);
          const gold = Math.random() < st.fgold;
          if (take(aim.point, st.forkR, n, st, false, gold ? 3 : 1)) {
            HH.Audio.play("fork"); HH.Player.swing("fork"); MP.sw++;
            if (gold) { HH.Audio.play("rainbow"); emit("popup", { text: "GOLDEN SCOOP x3!", pos: aim.point, color: "#ffd23f" }); }
          }
        } else if (tool === "vac" && held && !R.overheated) {
          usingVac = true;
          R.vacAcc += st.vacRate * dt;
          R.vacTick += dt;
          const n = Math.floor(R.vacAcc);
          if (n > 0 && R.vacTick >= st.vacTick) { R.vacTick = 0; R.vacAcc -= n; take(aim.point, st.vacR, n, st, fullMsgT > 0); }
        } else if (tool === "tornado" && click && R.cd.tornado <= 0) {
          R.cd.tornado = st.torCd;
          summonTornado(aim.point, st);
          HH.Player.swing("tornado"); MP.sw++;
        } else if (tool === "hole" && click && R.cd.hole <= 0) {
          R.cd.hole = st.holeCd;
          summonHole(aim.point, st);
          HH.Player.swing("tornado"); MP.sw++;
        }
      }
      if (tool === "tnt" && click && R.cd.tnt <= 0 && inReach) {
        R.cd.tnt = st.tntCd;
        R.tntCount = (R.tntCount || 0) + 1;
        throwTnt(aim.point, st, st.nuke && R.tntCount % 4 === 0);
        HH.Player.swing("tnt"); MP.sw++;
      }
      if (tool === "vac" && held && st.vacItem) {
        HH.World.pickups.forEach(function (p) {
          if (p.kind === "needle") return;
          const d = p.mesh.position.distanceTo(head);
          if (d < st.vacItem) { p.mesh.position.lerp(head, Math.min(1, dt * 5)); p.rest = true; }
        });
      }
    }
    if (tool === "vac" && I.mouse.left && allowTools && !R.overheated) usingVac = true;
    R.vacOn = usingVac;
    if (usingVac) {
      R.heat += dt;
      if (R.heat >= st.vacMax) { R.overheated = true; HH.Audio.play("overheat"); emit("toast", { text: "Vacuum overheated! Let it cool down." }); }
    } else {
      R.heat = Math.max(0, R.heat - dt * (R.overheated ? 1.2 : 1.6) * st.vacCool);
      if (R.overheated && R.heat <= 0) R.overheated = false;
    }
    HH.Audio.vacuum(usingVac, R.heat / st.vacMax);

    updateBombs(dt);
    updateTornados(dt, st);
    updateHoles(dt, st);
    updateRemoteFx(dt);
    updateDrones(dt, st);
    updatePets(dt, st);
    updateStorm(dt, st);
    updateHazards(dt);
    updateBagState(st);
    if (R.done) return;

    const pp = HH.Player.pos;
    const sellP = HH.World.spots.sell;
    if (R.bag > 0 && Math.hypot(pp.x - sellP.x, pp.z - sellP.z) < 2.7) sell(1);

    const pk = HH.World.pickups;
    const body = new THREE.Vector3(pp.x, pp.y + 0.9, pp.z);
    for (let n = pk.length - 1; n >= 0; n--) {
      const p = pk[n];
      const d = p.mesh.position.distanceTo(body);
      if (st.magnet && p.kind !== "needle" && d < st.magnet && p.rest) p.mesh.position.lerp(body, Math.min(1, dt * 6));
      if (d > 1.4) continue;
      if (p.kind === "needle") {
        if (HH.Net.active) {
          if (MP.grabT <= 0) { MP.grabT = 0.5; HH.Net.send("grab", { n: R.nonce }, "master"); }
        } else {
          HH.World.removePickup(p);
          R.needleOut = null;
          R.carrying = true;
          HH.Audio.play("needle");
          emit("picked", {});
        }
      } else if (p.kind === "rainbow" && R.bag + 3 <= st.cap) {
        HH.World.removePickup(p);
        R.bag += 3; R.bagValue += st.basePrice * st.mul * 6;
        HH.Audio.play("rainbow");
      } else if (p.kind === "gold") {
        HH.World.removePickup(p);
        const v = st.basePrice * 2 * 40;
        R.cash += v; S().stats.cash += v;
        HH.Audio.play("gem");
        emit("popup", { text: "+$" + HH.cash(v), pos: p.mesh.position.clone(), color: "#ffd23f" });
      }
    }

    const wz = HH.World.spots.wizard;
    if (R.carrying && Math.hypot(pp.x - wz.x, pp.z - wz.z) < 3) {
      if (HH.Net.active) { if (!MP.delivered) { MP.delivered = true; HH.Net.send("deliver", { n: R.nonce }, "master"); setTimeout(function () { MP.delivered = false; }, 3000); } }
      else if ((R.needlesDone || 0) + 1 < needlesFor(R.levelIndex)) nextNeedle(st);
      else finish(st, me());
    }

    needleCache.t -= dt;
    if (needleCache.t <= 0) { needleCache.t = 0.5; needleCache.p = R.found ? null : V.needlePos(); }
    if (st.nmagnet && !R.found && needleCache.p && needleCache.p.distanceTo(new THREE.Vector3(pp.x, pp.y + 1, pp.z)) < 3 && MP.grabT <= 0) {
      MP.grabT = 1;
      const np = needleCache.p;
      dig({ p: [np.x, np.y, np.z], r: 0.2, lim: 1, mode: "destroy", st: 1 }, function (res) { if (res.needle) emit("popup", { text: "NEEDLE MAGNET!", pos: res.needle, color: "#ff8ae2", big: true }); });
    }
    R.radar = 0;
    if (st.radar && !R.found && needleCache.p) {
      if (!R.radarOff) { const a = Math.random() * Math.PI * 2; R.radarOff = [Math.cos(a) * (1 + Math.random()), (Math.random() - 0.5) * 1.2, Math.sin(a) * (1 + Math.random())]; }
      const fuzzy = needleCache.p.clone().add(new THREE.Vector3(R.radarOff[0], R.radarOff[1], R.radarOff[2]));
      const d = fuzzy.distanceTo(new THREE.Vector3(pp.x, pp.y + 1, pp.z));
      R.radar = d < st.radarRange ? Math.ceil((1 - d / st.radarRange) * 3) / 3 : 0;
      if (R.radar > 0) {
        beepT -= dt;
        if (beepT <= 0) { beepT = R.radar > 0.9 ? 0.45 : R.radar > 0.5 ? 0.9 : 1.6; HH.Audio.play("beep", R.radar); }
      }
    }

    HH.Player.setVisual(R.tool, R.bag / st.cap, R.carrying, usingVac);
    if (HH.Net.active) {
      MP.stateT -= dt;
      if (MP.stateT <= 0) {
        MP.stateT = 0.1;
        HH.Net.send("st", { p: [+pp.x.toFixed(2), +pp.y.toFixed(2), +pp.z.toFixed(2)], y: +HH.Player.yaw.toFixed(3), tl: R.tool, v: usingVac ? 1 : 0, sw: MP.sw, c: R.carrying ? 1 : 0, n: R.nonce });
      }
    }
    saveT -= dt;
    if (saveT <= 0) { saveT = 8; persist(); }
  }

  function finish(st, by) {
    R.done = true;
    R.carrying = false;
    const m = mapDef(R.map);
    const L = R.level || levelDef(R.levelIndex);
    const par = m.par * (L.size || 1);
    const base = m.gems * (1 + 0.15 * (R.levelIndex || 0));
    const bonus = Math.max(0, (par - R.time) / par) * base;
    const dbl = S().doubleNext ? 2 : 1;
    S().doubleNext = false;
    const gems = Math.round((base + bonus) * st.gemMul * dbl);
    const key = "lvl" + R.levelIndex;
    const prevBest = S().best[key] || 0;
    const newBest = !prevBest || R.time < prevBest;
    if (newBest) S().best[key] = R.time;
    S().gems += gems;
    S().needles++;
    S().sinceRebirth = (S().sinceRebirth || 0) + 1;
    S().campaign = Math.max(S().campaign || 0, R.levelIndex + 1);
    S().current = R.levelIndex + 1;
    S().run = null;
    HH.Save.save();
    HH.Audio.vacuum(false);
    HH.Audio.play("levelup");
    HH.Platform.happytime();
    HH.Player.cheer();
    const wz = HH.World.npc.wizard;
    if (wz) wz.play("Cheer", 0.1, true);
    emit("say", { who: HH.NPC.wizard.name, text: HH.WIZARD_LINES[Math.floor(Math.random() * HH.WIZARD_LINES.length)], color: "#ffd0f0" });
    emit("win", { gems: gems, bonus: Math.round(bonus * st.gemMul), doubled: dbl > 1, time: R.time, newBest: newBest, map: m, level: L, index: R.levelIndex, next: levelDef(R.levelIndex + 1), cleared: 1 - V.remaining / Math.max(1, R.total), by: by, byMe: isMe(by) });
  }

  function selectTool(id) {
    if (!R) return;
    const t = HH.TOOLS.find(function (x) { return x.id === id; });
    if (!toolAvailable(t)) return;
    if (!R.tools[id]) { emit("toast", { text: "Buy the <b>" + t.name + "</b> in the shop first <kbd>Tab</kbd>" }); HH.Audio.play("deny"); return; }
    R.tool = id;
    R.lastTool = id;
    HH.Audio.play("click");
  }

  function buyTool(id) {
    const t = HH.TOOLS.find(function (x) { return x.id === id; });
    if (!toolAvailable(t)) { HH.Audio.play("deny"); return false; }
    if (R.tools[id]) { selectTool(id); return true; }
    if (t.minLevel && level() < t.minLevel) { HH.Audio.play("deny"); emit("toast", { text: "Reach <b>Level " + (t.minLevel + 1) + "</b> to unlock the " + t.name + "." }); return false; }
    if (R.cash < t.unlock) { HH.Audio.play("deny"); return false; }
    R.cash -= t.unlock;
    R.tools[id] = true;
    R.tool = id;
    R.lastTool = id;
    HH.Audio.play("buy");
    return true;
  }

  function upgradeVisible(u) {
    if (!u.tool) return true;
    return toolAvailable(HH.TOOLS.find(function (t) { return t.id === u.tool; }));
  }

  function canBuy(u) {
    if (!upgradeVisible(u)) return false;
    if (lvl(u.id) >= u.max) return false;
    if (u.minLevel && level() < u.minLevel) return false;
    if (u.tool && !R.tools[u.tool]) return false;
    if (u.req && !lvl(u.req)) return false;
    return true;
  }

  function canRebirth() { return (S().sinceRebirth || 0) >= HH.rebirthNeed(S().rebirths || 0); }
  function rebirthReward() { return 5 + 3 * (S().rebirths || 0); }

  function rebirth() {
    if (!canRebirth()) return false;
    const s = S();
    s.tokens = (s.tokens || 0) + rebirthReward();
    s.rebirths = (s.rebirths || 0) + 1;
    s.sinceRebirth = 0;
    s.gems = 0;
    Object.keys(s.perks).forEach(function (k) { s.perks[k] = 0; });
    s.run = null;
    s.map = "barnyard";
    if (R) R.wiped = true;
    s.carry = null;
    HH.Save.save();
    return true;
  }

  function buyRebirthItem(id) {
    const it = HH.REBIRTH_ITEMS.find(function (x) { return x.id === id; });
    const s = S();
    s.rb = s.rb || {};
    if (!it || s.rb[id] || (s.tokens || 0) < it.cost || (it.tier && (s.rebirths || 0) < it.tier)) { HH.Audio.play("deny"); return false; }
    s.tokens -= it.cost;
    s.rb[id] = true;
    HH.Save.save();
    HH.Audio.play("buy");
    return true;
  }

  function cheat(kind) {
    const s = S();
    if (kind === "cash" && R) R.cash += 100000;
    else if (kind === "gems") s.gems += 10000;
    else if (kind === "level") { s.needles += 5; s.sinceRebirth = (s.sinceRebirth || 0) + 5; }
    else if (kind === "rebirth") { s.sinceRebirth = HH.rebirthNeed(s.rebirths || 0); }
    else if (kind === "tokens") s.tokens = (s.tokens || 0) + 10;
    else if (kind === "needle" && R && !R.found) {
      const p = V.needlePos();
      if (p) dig({ p: [p.x, p.y, p.z], r: 0.2, lim: 1, mode: "destroy", st: 1 });
    } else if (kind === "maxall" && R) {
      HH.TOOLS.forEach(function (t) { if (toolAvailable(t)) R.tools[t.id] = true; });
      HH.UPGRADES.forEach(function (u) { if (upgradeVisible(u)) R.up[u.id] = u.max; });
      R.tier = HH.BAG_TIERS.length - 1;
    } else if (kind === "skiplevel" && R && !R.done) {
      finish(stats(), me());
    }
    HH.Save.save();
    HH.Audio.play("buy");
    return true;
  }

  function buyUpgrade(id) {
    const u = HH.UPGRADES.find(function (x) { return x.id === id; });
    if (!canBuy(u)) { HH.Audio.play("deny"); return false; }
    const c = upCost(u);
    if (R.cash < c) { HH.Audio.play("deny"); return false; }
    R.cash -= c;
    R.up[id] = lvl(id) + 1;
    HH.Audio.play("buy");
    return true;
  }

  function buyMax() {
    if (!R) return 0;
    let n = 0;
    for (let it = 0; it < 500; it++) {
      let best = null;
      HH.UPGRADES.forEach(function (u) {
        if (!canBuy(u)) return;
        const c = upCost(u);
        if (!best || c < best.c) best = { c: c, kind: "up", id: u.id };
      });
      const nb = HH.BAG_TIERS[R.tier + 1];
      if (nb && (!best || nb.cost < best.c)) best = { c: nb.cost, kind: "bag" };
      HH.TOOLS.forEach(function (t) {
        if (!toolAvailable(t) || R.tools[t.id] || !t.unlock || (t.minLevel && level() < t.minLevel)) return;
        if (!best || t.unlock < best.c) best = { c: t.unlock, kind: "tool", id: t.id };
      });
      if (!best || best.c > R.cash) break;
      R.cash -= best.c;
      if (best.kind === "up") R.up[best.id] = lvl(best.id) + 1;
      else if (best.kind === "bag") R.tier++;
      else R.tools[best.id] = true;
      n++;
    }
    HH.Audio.play(n ? "buy" : "deny");
    if (n) {
      const pp = HH.Player.pos;
      for (let q = 0; q < Math.min(40, 8 + n * 3); q++) HH.World.spawn(pp.clone().add(new THREE.Vector3(0, 1.4, 0)), new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 4, (Math.random() - 0.5) * 6), q % 2 ? 0xffd23f : 0x8aff8a, "debris", 1.1, null, 1.2);
      persist();
    }
    return n;
  }

  function buyBag() {
    const next = HH.BAG_TIERS[R.tier + 1];
    if (!next || R.cash < next.cost) { HH.Audio.play("deny"); return false; }
    R.cash -= next.cost;
    R.tier++;
    HH.Audio.play("buy");
    return true;
  }

  function buyPastry(id) {
    const p = (HH.PASTRIES || []).find(function (x) { return x.id === id; });
    if (!p || !R) return false;
    const s = S(), st = stats();
    const cost = pastryCost(p, st);
    if (p.gems) { if (s.gems < cost) { HH.Audio.play("deny"); return false; } s.gems -= cost; }
    else { if (R.cash < cost) { HH.Audio.play("deny"); return false; } R.cash -= cost; }
    grantBoost(id);
    return true;
  }

  function pastryCost(p, st) {
    if (p.gems) return p.gems;
    st = st || stats();
    return Math.max(2, Math.round(st.basePrice * HH.BAG_TIERS[R.tier].cap * p.bags * 100) / 100);
  }

  function grantBoost(id) {
    const b = HH.BOOSTS.concat(HH.PASTRIES || []).find(function (x) { return x.id === id; });
    if (!b) return false;
    const s = S();
    s.boost = s.boost || {};
    if (b.dur) s.boost[id] = Math.max(Date.now(), s.boost[id] || 0) + b.dur * 1000;
    else if (id === "cashboost" && R) { const st0 = stats(); const v = Math.max(25, st0.basePrice * st0.cap * 3); R.cash += v; emit("popup", { text: "+$" + HH.cash(v), pos: HH.Player.pos.clone().add(new THREE.Vector3(0, 2, 0)), color: "#8aff8a", big: true }); }
    else if (id === "doubleboost" || id === "p_pie") s.doubleNext = true;
    HH.Save.save();
    HH.Audio.play("boost");
    return true;
  }

  function boostLeft(id) { return Math.max(0, Math.ceil(((((S().boost || {})[id]) || 0) - Date.now()) / 1000)); }

  function snapshot() {
    const np = R.needleOut ? R.needleOut.mesh.position : null;
    return { lvl: R.levelIndex, seed: R.seed, scale: R.scale, grid: V.encode(), total: R.total, seq: MP.expected - 1, needle: { found: R.found, out: np ? [np.x, np.y, np.z] : null, carrier: MP.carrier !== null ? MP.carrier : (R.carrying ? me() : null) } };
  }

  function shareLook() { if (HH.Net.active) HH.Net.send("look", HH.Looks.get()); }

  function mpInit() {
    const N = HH.Net;
    N.on("connected", function (d) {
      shareLook();
      MP.buf = {};
      if (d.master) {
        MP.synced = true;
        MP.expected = 1; MP.last = 0;
        if (R && R.carrying) MP.carrier = me();
        emit("mp", { kind: "hosting" });
      } else {
        MP.synced = false;
        N.send("need", {}, "master");
        emit("mp", { kind: "joining" });
        setTimeout(function () { if (!MP.synced && N.active) N.send("need", {}, "master"); }, 2500);
      }
    });
    N.on("need", function (d, from) {
      if (!N.isMaster || !R) return;
      N.send("snap", snapshot(), from);
    });
    N.on("snap", function (s) {
      if (MP.synced && R && s.seed === R.seed) return;
      MP.expected = s.seq + 1;
      MP.last = s.seq;
      MP.buf = {};
      startLevel(s.lvl, s.seed, s.scale, s);
      MP.synced = true;
      emit("mp", { kind: "synced" });
    });
    N.on("req", function (op) {
      if (!N.isMaster) return;
      op.seq = ++MP.last;
      N.send("op", op, "all");
    });
    N.on("op", function (op) {
      if (!MP.synced) { MP.buf[op.seq] = op; return; }
      if (op.seq < MP.expected) return;
      MP.buf[op.seq] = op;
      while (MP.buf[MP.expected]) {
        const o = MP.buf[MP.expected];
        delete MP.buf[MP.expected];
        MP.expected++;
        MP.last = Math.max(MP.last, o.seq);
        applyOp(o);
      }
      const keys = Object.keys(MP.buf);
      if (keys.length > 60) {
        const min = Math.min.apply(null, keys.map(Number));
        MP.expected = min;
        while (MP.buf[MP.expected]) { const o = MP.buf[MP.expected]; delete MP.buf[MP.expected]; MP.expected++; applyOp(o); }
      }
    });
    N.on("master", function () {
      if (N.isMaster) MP.last = Math.max(MP.last, MP.expected - 1);
    });
    N.on("st", function (s, from) {
      if (!R || s.n !== R.nonce) return;
      HH.Remote.setState(from, s, N.playerName(from));
    });
    N.on("join", function (d) { emit("toast", { text: "<b>" + d.name + "</b> joined the farm!" }); shareLook(); });
    N.on("look", function (l, from) { HH.Remote.setLook(from, l); });
    N.on("leave", function (d) {
      HH.Remote.remove(d.id);
      emit("toast", { text: "<b>" + d.name + "</b> left." });
      if (N.isMaster && R && String(MP.carrier) === String(d.id)) {
        const av = HH.Remote.get(d.id);
        const p = av ? av.root.position : HH.World.spots.spawn;
        N.send("drop", { p: [p.x, p.y + 1, p.z], n: R.nonce }, "all");
      }
    });
    N.on("rename", function (d) { HH.Remote.rename(d.id, d.name); });
    N.on("grab", function (d, from) {
      if (!N.isMaster || !R || d.n !== R.nonce) return;
      if (MP.carrier !== null || !R.found) return;
      MP.carrier = from;
      N.send("carrier", { id: from, n: R.nonce }, "all");
    });
    N.on("carrier", function (d) {
      if (!R || d.n !== R.nonce) return;
      MP.carrier = d.id;
      if (R.needleOut) { HH.World.removePickup(R.needleOut); R.needleOut = null; }
      if (isMe(d.id)) { R.carrying = true; HH.Audio.play("needle"); emit("picked", {}); }
      else emit("toast", { text: "<b>" + N.playerName(d.id) + "</b> grabbed the needle! Help them get it to " + HH.NPC.wizard.name + "!" });
    });
    N.on("drop", function (d) {
      if (!R || d.n !== R.nonce) return;
      MP.carrier = null;
      R.carrying = false;
      if (!R.needleOut) R.needleOut = HH.World.addPickup("needle", new THREE.Vector3(d.p[0], d.p[1], d.p[2]));
      emit("toast", { text: "The needle was dropped! Grab it!" });
    });
    N.on("deliver", function (d, from) {
      if (!N.isMaster || !R || d.n !== R.nonce || R.done) return;
      if (String(MP.carrier) !== String(from)) return;
      const next = R.levelIndex + 1;
      const seed = (Date.now() & 0x7fffffff) ^ (next * 7919);
      N.send("complete", { n: R.nonce, by: from, next: next, seed: seed, scale: levelScale(levelDef(next), levelDef(next).map) }, "all");
    });
    N.on("complete", function (d) {
      if (!R || d.n !== R.nonce || R.done) return;
      MP.pendingLevel = { index: d.next, seed: d.seed, scale: d.scale };
      finish(stats(), d.by);
    });
    N.on("tnt", function (d) {
      if (!R || d.n !== R.nonce) return;
      const mesh = bombMesh(d.m);
      mesh.position.set(d.f[0], d.f[1], d.f[2]);
      HH.World.scene.add(mesh);
      bombs.push({ mesh: mesh, vel: new THREE.Vector3(d.v[0], d.v[1], d.v[2]), landed: false, fuse: d.fuse, fuseTotal: d.fuse, life: 0, mega: d.m, st: { tntFuse: d.fuse }, bid: d.bid, tickT: 0, remote: true });
    });
    N.on("fx", function (d) {
      if (!R || d.n !== R.nonce) return;
      const mesh = d.k === "tor" ? tornadoMesh() : holeMesh();
      mesh.position.set(d.p[0], d.p[1], d.p[2]);
      HH.World.scene.add(mesh);
      MP.fx[d.id] = { mesh: mesh, kind: d.k, life: d.life, t: 0, r: d.r, target: null };
      if (d.k === "hole") mesh.scale.setScalar(0.01);
    });
    N.on("left", function () {
      HH.Remote.clear();
      MP.synced = true;
      MP.carrier = null;
      Object.keys(MP.fx).forEach(function (k) { HH.World.scene.remove(MP.fx[k].mesh); });
      MP.fx = {};
      emit("mp", { kind: "left" });
    });
  }

  function nextLevel() {
    if (HH.Net.active) {
      const p = MP.pendingLevel;
      MP.pendingLevel = null;
      if (p) startLevel(p.index, p.seed, p.scale);
      return;
    }
    startLevel(S().current || 0);
  }

  return {
    needlesFor: needlesFor, shareLook: shareLook, newRun: newRun, startLevel: startLevel, nextLevel: nextLevel, restore: restore, update: update, persist: persist, stats: stats, upCost: upCost, lvl: lvl, canBuy: canBuy,
    buyTool: buyTool, buyUpgrade: buyUpgrade, buyBag: buyBag, selectTool: selectTool, toggleEquip: toggleEquip, mapDef: mapDef, has: has, levelDef: levelDef,
    level: level, rb: rb, toolAvailable: toolAvailable, upgradeVisible: upgradeVisible, tutorialDone: tutorialDone,
    canRebirth: canRebirth, rebirthReward: rebirthReward, rebirth: rebirth, buyRebirthItem: buyRebirthItem, cheat: cheat,
    buyPastry: buyPastry, pastryCost: pastryCost, rbfx: rbfx, buyMax: buyMax, grantBoost: grantBoost, boostOn: boostOn, boostLeft: boostLeft, mpInit: mpInit,
    get run() { return R; },
    get needleGuess() { return needleCache.p; },
    get carrier() { return MP.carrier; },
    get synced() { return MP.synced; },
    onEvent: function (fn) { emit = fn; }
  };
})();

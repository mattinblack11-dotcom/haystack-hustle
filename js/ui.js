HH.UI = (function () {
  const $ = function (id) { return document.getElementById(id); };
  const I = function (n, s) { return HH.icon(n, s); };
  const cache = {};
  let toastT = null, sayT = null, winCountdown = 0;
  let lastCash = 0, panel = null, handlers = {}, shopTab = "start", gemTab = "Perks", styleTab = "chars", winData = null;

  function set(id, v, prop) {
    const key = id + (prop || "");
    if (cache[key] === v) return;
    cache[key] = v;
    const el = $(id);
    if (!el) return;
    if (prop) el.style[prop] = v; else el.innerHTML = v;
  }

  function objective(R) {
    const t = HH.Save.data.tutorial;
    const tut = HH.Save.data.settings.tutorial !== false;
    const W = HH.NPC.wizard.name;
    const car = HH.Game.carrier;
    if (R.carrying) return I("needle", 20) + " You have the needle! Carry it to <b>" + W + "</b> (follow the arrow)";
    if (HH.Net.active && car !== null && car !== undefined) return I("needle", 20) + " <b>" + HH.Net.playerName(car) + "</b> has the needle. Help them reach " + W + "!";
    if (R.found) return I("needle", 20) + " The needle popped out! <b>Grab it</b>, then bring it to " + W + "!";
    if (tut && t === 0) return "<b>Step 1:</b> Click the haystack to <b>grab hay</b> (" + Math.min(R.bag, 5) + "/5). Somewhere inside is a hidden <b>needle</b>!";
    if (tut && t === 1) return "<b>Step 2:</b> Sell your hay to <b>" + HH.NPC.buyer.name + "</b>. Walk into the yellow ring!";
    if (tut && t === 2) return "<b>Step 3:</b> Walk into <b>Hank's Hay Shop</b> (or press <kbd>Tab</kbd>) and buy <b>Auto-Grab</b>";
    return "Dig to find the hidden <b>needle</b>, then carry it back to <b>" + W + "</b>!";
  }

  function marker(id, worldPos, text) {
    const el = $(id);
    if (!worldPos) { el.classList.add("hidden"); return; }
    const p = HH.World.project(worldPos);
    let x = p.x, y = p.y;
    if (!p.vis) { x = innerWidth - x; y = innerHeight - 80; }
    x = Math.max(50, Math.min(innerWidth - 50, x));
    const topBox = $("center-top").getBoundingClientRect(), botBox = $("bottomstack").getBoundingClientRect();
    const lo = Math.max(100, topBox.bottom + 40), hi = Math.min(innerHeight - 160, botBox.top - 30);
    y = hi > lo ? Math.max(lo, Math.min(hi, y)) : (lo + hi) / 2;
    el.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px) translate(-50%,-50%)";
    el.querySelector(".wp-text").textContent = text;
    el.classList.remove("hidden");
  }

  function stackPoint() {
    const pp = HH.Player.pos;
    const ext = HH.Voxels.extent;
    const d = Math.hypot(pp.x, pp.z) || 1;
    const r = Math.max(1, ext * 0.55);
    const x = pp.x / d * r, z = pp.z / d * r;
    const top = HH.Voxels.topAt ? HH.Voxels.topAt(x, z) : 2;
    return new THREE.Vector3(x, Math.max(1.2, (top || 1) + 0.6), z);
  }

  function objectiveTarget(R, st) {
    const sp = HH.World.spots;
    const tut = HH.Save.data.settings.tutorial !== false;
    const t = HH.Save.data.tutorial;
    function at(p, h, text, kind, extra) { return Object.assign({ p: p.clone().add(new THREE.Vector3(0, h, 0)), base: new THREE.Vector3(p.x, 0, p.z), text: text, kind: kind, beam: true }, extra || {}); }
    if (R.carrying) return at(sp.wizard, 3, HH.NPC.wizard.name, "needle");
    if (R.needleOut) return { p: R.needleOut.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), text: "NEEDLE!", kind: "needle" };
    if (HH.Net.active && HH.Game.carrier !== null && HH.Game.carrier !== undefined) {
      const av = HH.Remote.get(HH.Game.carrier);
      if (av) return { p: av.root.position.clone().add(new THREE.Vector3(0, 2.4, 0)), text: HH.Net.playerName(HH.Game.carrier), kind: "needle" };
    }
    if (tut && t === 0) { const sp0 = stackPoint(); return { p: sp0, base: new THREE.Vector3(sp0.x, 0, sp0.z), text: "Grab hay here", kind: "hay", beam: true }; }
    if (tut && t === 1) {
      if (R.bag > 0) return at(sp.sell, 3.5, "Sell to " + HH.NPC.buyer.name, "sell");
      const sp1 = stackPoint();
      return { p: sp1, base: new THREE.Vector3(sp1.x, 0, sp1.z), text: "Grab hay here", kind: "hay", beam: true };
    }
    if (tut && t === 2) return at(sp.shop, 3, "Hank's Shop", "shop");
    const pp = HH.Player.pos;
    if (Math.hypot(pp.x, pp.z) > HH.Voxels.extent * 0.8) return { p: new THREE.Vector3(0, 2, 0), text: "Haystack", kind: "hay", noMarker: true };
    return null;
  }

  function arrow(target) {
    const el = $("objarrow");
    if (!target) { el.classList.add("hidden"); return; }
    const pp = HH.Player.pos;
    const fwd = new THREE.Vector3();
    HH.World.camera.getWorldDirection(fwd);
    const a = Math.atan2(target.p.x - pp.x, target.p.z - pp.z) - Math.atan2(fwd.x, fwd.z);
    const d = Math.hypot(target.p.x - pp.x, target.p.z - pp.z);
    el.classList.remove("hidden");
    el.className = "objarrow k-" + target.kind;
    $("objarrow-icon").style.transform = "rotate(" + (-a * 180 / Math.PI).toFixed(1) + "deg)";
    set("objarrow-text", target.text + " &middot; " + Math.round(d) + "m");
  }

  function bagMeter(R, st) {
    const f = Math.min(1, R.bag / st.cap);
    set("bigbag-num", HH.fmtInt(R.bag) + " <small>/ " + HH.fmtInt(st.cap) + "</small>");
    set("bigbag-fill", (f * 100).toFixed(1) + "%", "width");
    const state = f >= 1 ? 2 : f >= 0.8 ? 1 : 0;
    const el = $("bigbag");
    el.classList.toggle("near", state === 1);
    el.classList.toggle("full", state === 2);
    set("bigbag-label", state === 2 ? (st.autosell ? "FULL &middot; AUTO-SELLING" : "BAG FULL!") : state === 1 ? "ALMOST FULL" : "BAG");
    document.body.classList.toggle("bagfull", state === 2 && !st.autosell);
  }

  function boostsHud() {
    let h = "";
    HH.BOOSTS.forEach(function (b) {
      if (!b.dur) return;
      const left = HH.Game.boostLeft(b.id);
      if (left > 0) h += '<span class="boostchip">' + I(b.icon, 18) + " " + b.name + " " + Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0") + "</span>";
    });
    if (HH.Save.data.doubleNext) h += '<span class="boostchip">' + I("gem", 18) + " Next needle x2</span>";
    set("boosts", h);
  }

  function mpHud() {
    const N = HH.Net;
    $("mphud").classList.toggle("hidden", !N.active);
    if (!N.active) return;
    let h = '<div class="mp-title">' + I("users", 18) + " Room <b>" + N.room + "</b>" + (N.mode === "local" ? " <small>(local)</small>" : "") + (N.isMaster ? " <small>host</small>" : "") + "</div>";
    const car = HH.Game.carrier;
    h += '<div class="mp-p me">' + N.name + " (you)" + (HH.Game.run && HH.Game.run.carrying ? " " + I("needle", 14) : "") + "</div>";
    N.players.forEach(function (p) {
      h += '<div class="mp-p">' + p.name + (String(car) === String(p.id) ? " " + I("needle", 14) : "") + "</div>";
    });
    if (!HH.Game.synced) h += '<div class="mp-p wait">Syncing with host...</div>';
    set("mphud", h);
  }

  function hud() {
    const R = HH.Game.run;
    if (!R) return;
    const st = HH.Game.stats();
    const S0 = HH.Save.data;
    set("cash", HH.cash(R.cash));
    if (R.cash > lastCash + 0.001) { const cc = document.querySelector(".chip.cash"); if (cc) { cc.classList.remove("gain"); void cc.offsetWidth; cc.classList.add("gain"); } }
    lastCash = R.cash;
    set("gems", HH.fmtInt(S0.gems));
    set("bagtxt", HH.fmtInt(R.bag) + "/" + HH.fmtInt(st.cap));
    set("bagfill", Math.min(100, (R.bag / st.cap) * 100).toFixed(1) + "%", "width");
    $("bagfill").classList.toggle("full", R.bag >= st.cap);
    set("objective", objective(R));
    set("timer", HH.fmtTime(R.time));
    set("cleared", Math.floor((1 - HH.Voxels.remaining / Math.max(1, R.total)) * 100) + "%");
    set("mapname", "Level " + (R.levelIndex + 1) + ": " + (R.level ? R.level.name : ""));
    set("lvlchip", I("star", 18) + " Level " + (((HH.Game.run && HH.Game.run.levelIndex) || 0) + 1) + (S0.rebirths ? " &middot; " + I("rebirth", 18) + " " + S0.rebirths : ""));
    let hb = "";
    HH.TOOLS.forEach(function (t) {
      if (!HH.Game.toolAvailable(t)) return;
      const owned = R.tools[t.id];
      let cd = 0;
      if (t.id === "hand") cd = Math.max(0, R.cd.hand) / st.handCd;
      if (t.id === "fork") cd = Math.max(0, R.cd.fork) / st.forkCd;
      if (t.id === "tnt") cd = Math.max(0, R.cd.tnt) / st.tntCd;
      if (t.id === "tornado") cd = Math.max(0, R.cd.tornado) / st.torCd;
      if (t.id === "hole") cd = Math.max(0, R.cd.hole) / st.holeCd;
      if (t.id === "vac") cd = R.overheated ? R.heat / st.vacMax : 0;
      cd = Math.round(cd * 20) / 20;
      hb += '<div class="slot' + (R.tool === t.id ? " sel" : "") + '"><span class="key">' + t.key + '</span><span class="em">' + I(t.id, 34) + '</span><span class="nm">' + t.name + "</span>" +
        (cd > 0.01 ? '<div class="cd" style="height:' + Math.round(cd * 100) + '%"></div>' : "") +
        (owned ? "" : '<div class="lock">$' + HH.cash(t.unlock) + "</div>") + "</div>";
    });
    hb += '<div class="slot mini' + (R.tool === "none" ? " sel" : "") + '"><span class="key">Q</span><span class="nm">' + (R.tool === "none" ? "Equip" : "Put away") + "</span></div>";
    set("hotbar", hb);
    $("radar").classList.toggle("hidden", !st.radar || R.found);
    if (st.radar) set("radarfill", Math.round((R.radar || 0) * 100) + "%", "width");
    const showHeat = R.tool === "vac" && R.tools.vac && R.heat > 0.05;
    $("heat").classList.toggle("hidden", !showHeat);
    if (showHeat) set("heatfill", Math.round(R.heat / st.vacMax * 100) + "%", "width");
    document.body.classList.toggle("locked", HH.Input.locked);
    document.body.classList.toggle("fp", HH.Player.fp);
    document.body.classList.toggle("storm", R.storm > 0);
    set("storm", R.storm > 0 ? I("bolt", 20) + " HAY STORM! All hay x2 &middot; catch the golden bales! " + Math.ceil(R.storm) + "s" : "");
    $("combo").classList.toggle("hidden", R.combo < 5);
    if (R.combo >= 5) set("combo", "COMBO x" + R.combo + "<small>+" + Math.round((st.mul / (R.storm > 0 ? 2 : 1) - 1) * 100) + "% cash</small>");
    $("combo").classList.toggle("hot", R.combo >= 50);
    bagMeter(R, st);
    boostsHud();
    mpHud();

    const target = objectiveTarget(R, st);
    marker("waypoint", target && !target.noMarker ? target.p : null, target ? target.text : "");
    HH.World.setBeam(target && target.beam ? target.base : null, target ? target.kind : "");
    arrow(target);

    const cleared = 1 - HH.Voxels.remaining / Math.max(1, R.total);
    const showCompass = HH.Game.lvl("compass") && !R.found && cleared >= 0.55 && HH.Game.needleGuess;
    $("compass").classList.toggle("hidden", !showCompass);
    if (showCompass) {
      const np = HH.Game.needleGuess, pp = HH.Player.pos;
      const fwd = new THREE.Vector3(); HH.World.camera.getWorldDirection(fwd);
      const a = Math.atan2(np.x + R.compassOff[0] - pp.x, np.z + R.compassOff[1] - pp.z) - Math.atan2(fwd.x, fwd.z);
      $("compass-needle").style.transform = "rotate(" + (-a * 180 / Math.PI) + "deg)";
    }
    if (panel === "win" && winCountdown > 0) {
      const el = $("wincount");
      if (el) el.textContent = Math.ceil(winCountdown);
    }
  }

  function popup(text, pos, color, big) {
    const p = HH.World.project(pos);
    if (!p.vis) return;
    const el = document.createElement("div");
    el.className = "pop" + (big ? " big" : "");
    el.style.left = p.x + "px"; el.style.top = p.y + "px"; el.style.color = color || "#fff";
    el.textContent = text;
    $("popups").appendChild(el);
    setTimeout(function () { el.remove(); }, 1250);
  }

  function bagBlocked(pos) {
    popup("BAG FULL!", pos, "#ff5c5c", true);
    const el = $("bigbag");
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  }

  function confetti(n) {
    const cols = ["#ffd23f", "#ff5cc8", "#5cd6ff", "#8aff8a", "#ff7a2a", "#b38cff", "#ffffff"];
    const box = document.createElement("div");
    box.className = "confetti";
    for (let q = 0; q < (n || 90); q++) {
      const p = document.createElement("i");
      p.style.left = (Math.random() * 100) + "vw";
      p.style.background = cols[q % cols.length];
      p.style.animationDelay = (Math.random() * 0.8) + "s";
      p.style.animationDuration = (2 + Math.random() * 1.6) + "s";
      p.style.setProperty("--dx", ((Math.random() - 0.5) * 30) + "vw");
      p.style.setProperty("--rot", (Math.random() * 1440 - 720) + "deg");
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 4600);
  }

  function flyIcons(kind, n) {
    const target = $(kind === "gem" ? "gemic" : "cashic");
    if (!target) return;
    const r = target.getBoundingClientRect();
    const tx = r.left + r.width / 2 - 13, ty = r.top + r.height / 2 - 13;
    for (let q = 0; q < n; q++) {
      const el = document.createElement("div");
      el.className = "flyico";
      el.innerHTML = I(kind === "gem" ? "gem" : "cash", 26);
      const sx = innerWidth / 2 + (Math.random() - 0.5) * 160, sy = innerHeight * 0.6 + (Math.random() - 0.5) * 80;
      el.style.transform = "translate(" + sx + "px," + sy + "px) scale(0.6)";
      document.body.appendChild(el);
      setTimeout(function () {
        el.style.transform = "translate(" + tx + "px," + ty + "px) scale(1)";
        el.style.opacity = "0.4";
      }, 30 + q * 45);
      setTimeout(function () {
        el.remove();
        const chip = target.closest(".chip");
        if (chip) { chip.classList.remove("pop"); void chip.offsetWidth; chip.classList.add("pop"); }
      }, 800 + q * 45);
    }
  }

  function toast(html, ms) {
    const el = $("toast");
    el.innerHTML = html;
    el.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove("show"); }, ms || 2800);
  }

  function say(who, text, color) {
    const el = $("say");
    el.innerHTML = '<b style="color:' + (color || "#fff") + '">' + who + ":</b> " + text;
    el.classList.add("show");
    clearTimeout(sayT);
    sayT = setTimeout(function () { el.classList.remove("show"); }, 3000);
  }

  function flash() {
    const el = $("flash");
    el.classList.remove("on");
    void el.offsetWidth;
    el.classList.add("on");
  }

  function open(name, h) {
    panel = name;
    handlers = h || {};
    $("overlay").classList.remove("hidden");
    HH.Input.setEnabled(false);
    render();
  }

  function close() {
    panel = null;
    dropPreview();
    winCountdown = 0;
    $("overlay").classList.add("hidden");
    $("panel").innerHTML = "";
    HH.Input.setEnabled(true);
    HH.Input.clear();
    queueMicrotask(function () { if (!panel) HH.Input.lock(); });
  }

  function money() {
    const R = HH.Game.run;
    const tk = HH.Save.data.tokens || 0;
    return '<div class="money"><span class="m-cash">' + I("cash", 20) + ' $<span id="p-cash">' + HH.cash(R ? R.cash : 0) + '</span></span><span class="m-gem">' + I("gem", 20) + ' <span id="p-gems">' + HH.fmtInt(HH.Save.data.gems) + "</span></span>" +
      (tk || HH.Save.data.rebirths ? '<span class="m-tok">' + I("rebirth", 20) + ' <span id="p-tok">' + tk + "</span></span>" : "") + "</div>";
  }

  function card(o) {
    const attrs = o.action ? ' data-a="' + o.action + '" data-v="' + (o.value || "") + '"' + (o.cost !== undefined ? ' data-cost="' + o.cost + '" data-cur="' + (o.cur || "cash") + '"' : "") : "";
    return '<div class="card ' + (o.cls || "") + (o.action ? " clickable" : "") + '"' + attrs + '>' +
      (o.tag ? '<div class="c-tag">' + o.tag + "</div>" : "") +
      '<div class="c-icon">' + (o.icon || I("star", 30)) + "</div>" +
      '<div class="c-body"><div class="c-title">' + o.title + (o.lv ? '<span class="c-lv">' + o.lv + "</span>" : "") + "</div>" +
      '<div class="c-desc">' + o.desc + "</div>" +
      (o.fx ? '<div class="c-fx">' + o.fx + "</div>" : "") +
      (o.pips ? '<div class="pips">' + o.pips + "</div>" : "") + "</div>" +
      '<div class="c-price ' + (o.cur === "gems" ? "gem" : o.cur === "ad" ? "ad" : "") + '">' + o.price + "</div></div>";
  }

  function pips(l, max) {
    if (max <= 1 || max > 15) return "";
    let s = "";
    for (let q = 0; q < max; q++) s += '<i class="' + (q < l ? "on" : "") + '"></i>';
    return s;
  }

  function uicon(id) { return I(HH.UPGRADE_ICON[id] || "star", 30); }

  function p1(x) { return (Math.round(x * 10) / 10).toString(); }

  const FX = {
    hold: function (l) { return l ? "hold to dig" : "click every grab"; },
    grasp: function (l) { return (3 + l + (HH.Save.data.perks.grab || 0)) + " hay per grab"; },
    speed: function (l) { return p1(1 / (0.38 * Math.pow(0.9, l))) + " grabs/sec"; },
    reach: function (l) { return p1(4.5 + 0.6 * l) + "m reach"; },
    golden: function (l) { return 5 * l + "% triple-grab"; },
    glove: function (l) { return p1((0.9 + 0.15 * l) * 2) + "m grab size"; },
    walk: function (l) { return "+" + 8 * l + "% speed"; },
    jump: function (l) { return "+" + 10 * l + "% jump"; },
    combo: function (l) { return "+" + 20 * l + "% combo bonus"; },
    sprint: function (l) { return l ? "+" + (25 + 15 * l) + "% sprint" : "no sprint"; },
    hover: function (l) { return l ? "glide on" : "no glide"; },
    tip: function (l) { return "+" + 5 * l + "% sell price"; },
    bulk: function (l) { return "+" + 3 * l + "% per 100 hay"; },
    goose: function (l) { return l ? "+15% sell price" : "no goose"; },
    fsweep: function (l) { return p1((0.8 + 0.14 * l) * 2) + "m scoop"; },
    fcool: function (l) { return p1(Math.pow(0.88, l)) + "s per swing"; },
    fgold: function (l) { return 8 * l + "% golden scoop"; },
    tpower: function (l) { return p1((1.5 + 0.32 * l) * 2) + "m blast"; },
    tcool: function (l) { return p1(8 * Math.pow(0.85, l)) + "s cooldown"; },
    tlucky: function (l) { return 4 * l + "% lucky hay"; },
    tcluster: function (l) { return 10 * l + "% split chance"; },
    vpower: function (l) { return Math.round(30 * Math.pow(1.3, l)) + " hay/sec"; },
    vrun: function (l) { return p1(6 + 1.8 * l + 0.25 * l * l) + "s until overheat"; },
    vwide: function (l) { return p1((1.4 + 0.3 * l + 0.03 * l * l) * 2) + "m pickup"; },
    vrange: function (l) { return p1(9.5 + 1.5 * l) + "m range"; },
    vtick: function (l) { return Math.round(1 / (0.07 * Math.pow(0.85, l))) + " pulls/sec"; },
    vmove: function (l) { return Math.round((0.85 + 0.09 * l) * 100) + "% speed while vacuuming"; },
    vcool: function (l) { return "x" + p1(1 + 0.5 * l) + " cooldown speed"; },
    vitem: function (l) { return l ? p1(4 + 2.5 * l) + "m item pull" : "hay only"; },
    tsize: function (l) { return p1((1.1 + 0.28 * l) * 2) + "m twister"; },
    tlast: function (l) { return p1(6 + 1.5 * l) + "s twister"; },
    tcd: function (l) { return Math.round(30 * Math.pow(0.88, l)) + "s cooldown"; },
    ttwin: function (l) { return (1 + l) + " tornado" + (l ? "es" : ""); },
    hsize: function (l) { return p1((2.2 + 0.4 * l) * 2) + "m swallow"; },
    hcool: function (l) { return Math.round(45 * Math.pow(0.85, l)) + "s cooldown"; },
    drone: function (l) { return l ? "1 drone" : "no drone"; },
    dspeed: function (l) { return p1(5 + 1.2 * l) + "m/s"; },
    dcap: function (l) { return (20 + 10 * l) + " hay per trip"; },
    dfleet: function (l) { return (1 + l) + " drones"; },
    magnet: function (l) { return l ? p1(3 + 1.5 * l) + "m pull" : "no magnet"; },
    teleport: function (l) { return l ? "F = sell anywhere" : "walk to Bjorn"; },
    radar: function (l) { return l ? "radar on" : "no radar"; },
    rrange: function (l) { return (2.2 + 1.1 * l).toFixed(1) + "m range (rough)"; },
    compass: function (l) { return l ? "compass on" : "no compass"; },
    hamster: function (l) { return l ? "hamster helps" : "no hamster"; },
    hamlvl: function (l) { return p1(1.2 * Math.pow(2, l) * 3) + " hay/sec"; },
    compress: function (l) { return "+" + 25 * l + "% bag space"; },
    drill: function (l) { return 4 * l + "% gem chance"; },
    megafork: function (l) { return "+" + 40 * l + "% scoop"; },
    turbovac: function (l) { return "+" + 50 * l + "% suction"; },
    harvest: function (l) { return "+" + 25 * l + "% hay value"; }
  };

  function fxLine(u, l) {
    const f = FX[u.id];
    if (!f) return "";
    if (l >= u.max) return "<b>" + f(l) + "</b> <span class='mx'>MAXED</span>";
    return "<span class='now'>" + f(l) + "</span> &#10140; <b>" + f(l + 1) + "</b>";
  }

  const SHOP_CATS = [
    { id: "start", name: "Start Here", icon: "star", blurb: "Not sure what to buy? These are the best next upgrades for you right now." },
    { id: "tools", name: "Tools", icon: "fork", blurb: "New ways to dig. Buy a tool, then press its number key to hold it. Press Q to put tools away. Rebirthing unlocks even more tools!" },
    { id: "bag", name: "Backpack", icon: "bag", blurb: "A bigger bag means more hay per trip, so you walk to Bjorn less often." },
    { id: "hands", name: "Hands", icon: "hand", groups: ["Hands"], blurb: "Upgrades for grabbing with your bare hands (tool 1)." },
    { id: "gear", name: "Tool Upgrades", icon: "gear", groups: ["Pitchfork", "Dynamite", "Vacuum", "Tornado", "Black Hole"], blurb: "Make your tools stronger. You need to own a tool before you can upgrade it." },
    { id: "body", name: "Movement", icon: "speed", groups: ["Body"], blurb: "Run faster, jump higher and keep bigger combos going." },
    { id: "money", name: "Money & Helpers", icon: "cash", groups: ["Selling", "Helpers"], blurb: "Earn more for every sale, and get helpers that dig and sell for you." },
    { id: "needle", name: "Needle Finders", icon: "compass", groups: ["Needle Hunting"], blurb: "Gadgets that help you track down the needle." },
    { id: "late", name: "Late Game", icon: "crown", groups: ["Late Game"], blurb: "Powerful upgrades that unlock as your Farm Level goes up. You gain 1 level for every needle you return." }
  ];

  const TOOL_DESC = { hand: "Grab hay by hand. Always free.", fork: "Scoop a big chunk of hay with every swing.", tnt: "Throw dynamite: it lands, the fuse burns, then BOOM. Digs deep fast, and most of the blasted hay lands in your bag.", vac: "Hold the mouse to suck up hay nonstop. Let it cool down when it overheats.", tornado: "Summon a twister that wanders the stack and sucks hay into your bag.", hole: "Open a black hole that swallows a huge chunk of the stack." };
  const WHY = { hold: "Hold the mouse instead of clicking. Huge time saver!", bag: "Fewer trips to Bjorn = more digging.", fork: "Digs about 10x faster than your hands.", grasp: "More hay from every grab.", speed: "Grab faster.", tnt: "Blast deep holes to hunt for the needle.", vac: "Suck up hay nonstop.", radar: "Beeps when you're close to the needle.", drone: "Free money while you dig.", tornado: "A twister that digs for you.", tip: "Every sale pays more.", reach: "Grab from further away.", fsweep: "Bigger pitchfork scoops.", vpower: "Much faster vacuum.", walk: "Get around faster." };

  function upgradeCard(u, tag) {
    const R = HH.Game.run, G = HH.Game;
    const l = G.lvl(u.id), maxed = l >= u.max;
    const lockTool = u.tool && !R.tools[u.tool], lockReq = u.req && !G.lvl(u.req);
    const c = G.upCost(u);
    let price = "$" + HH.cash(c), cls = "", action = "up";
    if (maxed) { price = "MAXED"; cls = "owned"; action = null; }
    else if (u.minLevel && G.level() < u.minLevel) { price = I("lock", 16) + " Reach Level " + u.minLevel; cls = "locked"; action = null; }
    else if (lockTool) { price = I("lock", 16) + " Buy " + HH.TOOLS.find(function (t) { return t.id === u.tool; }).name + " first"; cls = "locked"; action = null; }
    else if (lockReq) { price = I("lock", 16) + " Buy " + HH.UPGRADES.find(function (x) { return x.id === u.req; }).name + " first"; cls = "locked"; action = null; }
    return card({ icon: uicon(u.id), title: u.name, lv: u.max > 1 ? "Lv " + l + "/" + u.max : "", desc: tag ? WHY[u.id] || u.desc : u.desc, fx: fxLine(u, l), pips: pips(l, u.max),
      action: action, value: u.id, cost: action ? c : undefined, price: price, cls: cls + (tag ? " suggest" : ""), tag: tag });
  }

  function toolCard(t, tag) {
    const R = HH.Game.run;
    const owned = R.tools[t.id];
    return card({ icon: I(t.id, 30), title: t.name, lv: "key " + t.key, desc: tag ? WHY[t.id] || TOOL_DESC[t.id] : TOOL_DESC[t.id], action: "tool", value: t.id, cost: owned ? undefined : t.unlock,
      price: owned ? (R.tool === t.id ? "IN HAND" : "HOLD IT") : "$" + HH.cash(t.unlock), cls: (owned ? (R.tool === t.id ? "eq" : "owned") : "") + (tag ? " suggest" : ""), tag: tag });
  }

  function bagCard(i, tag) {
    const R = HH.Game.run, st = HH.Game.stats();
    const b = HH.BAG_TIERS[i];
    const owned = R.tier >= i, next = R.tier + 1 === i;
    const fx = next ? "<span class='now'>" + HH.BAG_TIERS[R.tier].cap + " hay</span> &#10140; <b>" + b.cap + " hay</b>" : owned ? "<b>" + b.cap + " hay</b>" : b.cap + " hay";
    return card({ icon: I("bag", 30), title: "Bag " + i, desc: tag ? WHY.bag : owned ? (R.tier === i ? "Your current bag. With bonuses you carry " + st.cap + " hay." : "Already upgraded past this.") : next ? "Next bag size up." : "Buy the bag before this one first.", fx: fx,
      action: next ? "bag" : null, cost: next ? b.cost : undefined, price: owned ? "OWNED" : next ? "$" + HH.cash(b.cost) : I("lock", 16) + " Locked", cls: (owned ? "owned" : next ? "" : "locked") + (tag ? " suggest" : ""), tag: tag });
  }

  function suggestions() {
    const R = HH.Game.run, G = HH.Game;
    const out = [];
    const order = ["hold", "bag", "fork", "grasp", "speed", "tnt", "radar", "vac", "reach", "fsweep", "vpower", "drone", "tip", "walk", "tornado"];
    order.forEach(function (id) {
      if (out.length >= 4) return;
      if (id === "bag") { if (HH.BAG_TIERS[R.tier + 1]) out.push({ k: "bag", cost: HH.BAG_TIERS[R.tier + 1].cost }); return; }
      const t = HH.TOOLS.find(function (x) { return x.id === id; });
      if (t) { if (G.toolAvailable(t) && !R.tools[id]) out.push({ k: "tool", t: t, cost: t.unlock }); return; }
      const u = HH.UPGRADES.find(function (x) { return x.id === id; });
      if (u && G.canBuy(u)) out.push({ k: "up", u: u, cost: G.upCost(u) });
    });
    const cheap = HH.UPGRADES.filter(function (u) { return G.canBuy(u) && !out.some(function (o) { return o.u === u; }); })
      .map(function (u) { return { k: "up", u: u, cost: G.upCost(u) }; }).sort(function (a, b) { return a.cost - b.cost; }).slice(0, 4);
    return { top: out, cheap: cheap };
  }

  function shopHtml() {
    const R = HH.Game.run;
    const cat = SHOP_CATS.find(function (c) { return c.id === shopTab; }) || SHOP_CATS[0];
    let h = '<div class="ptop"><div class="sign">' + I("shop", 30) + " HANK'S HAY SHOP</div>" + money() + '<button class="btn buymax" data-a="buymax">' + I("bolt", 20) + ' BUY MAX <kbd>U</kbd></button></div>';
    h += '<div class="note">' + I("star", 18) + " Your shop upgrades carry over to every new level. Gems <kbd>G</kbd> buy <b>permanent</b> perks. Click outside to close.</div>";
    h += '<div class="shopwrap"><div class="cats">' + SHOP_CATS.map(function (c) {
      return '<button class="cat' + (c.id === cat.id ? " on" : "") + '" data-a="tab" data-v="' + c.id + '"><span>' + I(c.icon, 22) + "</span>" + c.name + "</button>";
    }).join("") + '</div><div class="pane"><div class="blurb">' + I(cat.icon, 20) + " " + cat.blurb + '</div><div class="grid">';
    if (cat.id === "start") {
      const s = suggestions();
      s.top.forEach(function (o, i) {
        const tag = i === 0 ? "BEST NEXT BUY" : "GOOD PICK";
        if (o.k === "bag") h += bagCard(R.tier + 1, tag);
        else if (o.k === "tool") h += toolCard(o.t, tag);
        else h += upgradeCard(o.u, tag);
      });
      if (s.cheap.length) h += '<div class="subhead">Cheap upgrades</div>';
      s.cheap.forEach(function (o) { h += upgradeCard(o.u); });
    } else if (cat.id === "tools") {
      HH.TOOLS.forEach(function (t) { if (HH.Game.toolAvailable(t)) h += toolCard(t); });
    } else if (cat.id === "bag") {
      for (let i = 1; i < HH.BAG_TIERS.length; i++) h += bagCard(i);
    } else {
      cat.groups.forEach(function (g) {
        const list = HH.UPGRADES.filter(function (u) { return u.group === g && HH.Game.upgradeVisible(u); });
        if (!list.length) return;
        if (cat.groups.length > 1) h += '<div class="subhead">' + g + "</div>";
        list.forEach(function (u) { h += upgradeCard(u); });
      });
    }
    h += '</div></div></div><div class="row"><button class="btn go" data-a="close">Back to digging <kbd>Tab</kbd></button></div>';
    return h;
  }

  function perkCost(p) { return Math.round(p.base * Math.pow(p.grow, HH.Save.data.perks[p.id] || 0)); }

  const GEM_CATS = [
    { id: "Perks", icon: "star", blurb: "Upgrades that last across every haystack (until you Rebirth)." },
    { id: "Rebirth", icon: "rebirth", blurb: "Start over stronger! Rebirthing resets your gems, perks and shop upgrades, but gives you a permanent cash boost, unlocks new tools and earns Rebirth Tokens for permanent items." },
    { id: "Classes", icon: "crown", blurb: "Pick one class to equip. Each one gives you a special bonus." },
    { id: "Levels", icon: "map", blurb: "Your level progress. New levels load automatically when you return the needle. You can replay levels you've already beaten." },
    { id: "Stats", icon: "trophy", blurb: "Your lifetime records." }
  ];

  function gemsHtml() {
    const S = HH.Save.data;
    const cat = GEM_CATS.find(function (c) { return c.id === gemTab; }) || GEM_CATS[0];
    let h = '<div class="ptop"><div class="sign gem">' + I("gem", 30) + " GEM SHOP</div>" + money() + "</div>";
    h += '<div class="note">' + I("gem", 18) + " Get gems by returning the needle to Wizzo, digging up diamonds, and from daily rewards. Click outside to close.</div>";
    h += '<div class="shopwrap"><div class="cats">' + GEM_CATS.map(function (c) {
      return '<button class="cat' + (c.id === cat.id ? " on" : "") + '" data-a="gtab" data-v="' + c.id + '"><span>' + I(c.icon, 22) + "</span>" + c.id + "</button>";
    }).join("") + '</div><div class="pane"><div class="blurb">' + I(cat.icon, 20) + " " + cat.blurb + '</div><div class="grid">';
    if (cat.id === "Perks") {
      HH.PERKS.forEach(function (p) {
        const l = S.perks[p.id] || 0, c = perkCost(p), max = l >= p.max;
        h += card({ icon: I("star", 30), title: p.name, lv: "Lv " + l + "/" + p.max, desc: p.desc, action: max ? null : "perk", value: p.id, cost: max ? undefined : c, cur: "gems", price: max ? "MAXED" : I("gem", 16) + " " + c, cls: max ? "owned" : "" });
      });
    } else if (cat.id === "Rebirth") {
      const rbs = S.rebirths || 0, need = HH.rebirthNeed(rbs), have = S.sinceRebirth || 0, ready = HH.Game.canRebirth();
      const nextTool = HH.TOOLS.find(function (t) { return (t.rb || 0) === rbs + 1; });
      h += '<div class="rebirth-box"><div class="rb-title">' + I("rebirth", 28) + " REBIRTH " + (rbs + 1) + "</div>" +
        '<div class="rb-bar"><div style="width:' + Math.min(100, have / need * 100) + '%"></div><span>' + Math.min(have, need) + " / " + need + " needles returned</span></div>" +
        '<div class="rb-list"><b>You get:</b> +' + HH.Game.rebirthReward() + " Rebirth Tokens &middot; +25% cash forever &middot; +25% gems forever &middot; bigger haystacks" + (nextTool ? " &middot; <b>unlocks the " + nextTool.name + "</b>" : "") + "</div>" +
        '<div class="rb-list"><b>You lose:</b> your gems and perks. Classes, levels and Rebirth items stay.</div>' +
        '<button class="btn rb-btn" data-a="rebirth"' + (ready ? "" : " disabled") + ">" + (ready ? "REBIRTH NOW" : "Return " + (need - have) + " more needle" + (need - have > 1 ? "s" : "")) + "</button></div>";
      h += '<div class="subhead">Rebirth Shop (permanent forever)</div>';
      HH.REBIRTH_ITEMS.forEach(function (it) {
        const own = S.rb && S.rb[it.id];
        h += card({ icon: I(({ kitgrab: "hand", kitbag: "bag", kitfork: "fork", goldgloves: "hand", autosell: "cash", rainbowrain: "rainbow", clover: "star", hamking: "hamster", needlesense: "radar", gemfountain: "gem" })[it.id] || "star", 30), title: it.name, desc: it.desc, action: own ? null : "rbitem", value: it.id, cost: own ? undefined : it.cost, cur: "tokens", price: own ? "OWNED" : I("rebirth", 16) + " " + it.cost, cls: own ? "owned" : "" });
      });
    } else if (cat.id === "Classes") {
      HH.CLASSES.forEach(function (c) {
        const owned = S.classes.indexOf(c.id) >= 0, eq = S.cls === c.id;
        h += card({ icon: I("crown", 30), title: c.name, desc: c.desc, action: eq ? null : "cls", value: c.id, cost: owned ? undefined : c.cost, cur: "gems", price: eq ? "EQUIPPED" : owned ? "EQUIP" : I("gem", 16) + " " + c.cost, cls: eq ? "eq" : owned ? "owned" : "" });
      });
    } else if (cat.id === "Levels") {
      const cur = HH.Game.run ? HH.Game.run.levelIndex : 0;
      const top = Math.max(S.campaign || 0, cur);
      for (let i = 0; i <= Math.max(top, HH.LEVELS.length - 1); i++) {
        const L = HH.Game.levelDef(i);
        const done = i < (S.campaign || 0);
        const locked = i > top;
        const best = S.best["lvl" + i] ? " Best: " + HH.fmtTime(S.best["lvl" + i]) + "." : "";
        const extra = [L.mud ? "mud" : "", L.wind ? "wind" : "", L.fog ? "fog" : "", L.deep ? "deep needle" : ""].filter(Boolean).join(", ");
        h += card({ icon: I(done ? "trophy" : locked ? "lock" : "map", 30), title: "Level " + (i + 1) + ": " + L.name, desc: L.tip + (extra ? " <i>(" + extra + ")</i>" : "") + best,
          action: !locked && !HH.Net.active && i !== cur ? "replay" : null, value: String(i),
          price: i === cur ? "PLAYING" : locked ? I("lock", 16) + " Locked" : done ? "REPLAY" : "PLAY", cls: i === cur ? "eq" : done ? "owned" : locked ? "locked" : "" });
      }
    } else {
      const s = S.stats;
      [["needle", "Needles returned", S.needles], ["map", "Highest level", (S.campaign || 0) + 1], ["bag", "Hay collected", HH.fmtInt(s.hay)], ["cash", "Cash earned", "$" + HH.cash(s.cash)], ["diamond", "Diamonds found", s.diamonds], ["tnt", "Dynamite blasts", s.blasts]].forEach(function (r) {
        h += card({ icon: I(r[0], 30), title: r[1], desc: String(r[2]), price: "" });
      });
    }
    h += '</div></div></div><div class="row"><button class="btn go" data-a="close">Back <kbd>G</kbd></button></div>';
    return h;
  }

  const STYLE_CATS = [
    { id: "chars", name: "Characters", icon: "users" },
    { id: "hats", name: "Hats", icon: "crown" },
    { id: "faces", name: "Glasses", icon: "star" },
    { id: "gloves", name: "Gloves", icon: "hand" },
    { id: "paints", name: "Tool Paint", icon: "fork" }
  ];
  const HAT_COL = { none: "#cfc6b0", straw: "#e8c860", cap: "#d63031", cowboy: "#8a5a2b", party: "#ff5cc8", chef: "#ffffff", beanie: "#3a7bd5", tophat: "#1c1c22", viking: "#9aa0a8", crown: "#ffd23f" };

  function hex(n) { return "#" + n.toString(16).padStart(6, "0"); }

  function styleIcon(cat, it) {
    if (cat === "chars") return '<img class="pv-img" src="assets/previews/character-' + it.id + '.png" alt="">';
    if (cat === "hats") {
      if (it.id === "none") return '<svg viewBox="0 0 24 24" width="34" height="34"><circle cx="12" cy="12" r="9" fill="none" stroke="#b9ab8c" stroke-width="2"/><path d="M6 18L18 6" stroke="#b9ab8c" stroke-width="2"/></svg>';
      const c = HAT_COL[it.id] || "#e8c860";
      return '<svg viewBox="0 0 24 24" width="34" height="34"><ellipse cx="12" cy="17" rx="10" ry="2.6" fill="' + c + '" stroke="#3b2a12" stroke-width="1"/><path d="M6.5 16.5 Q7 6 12 6 Q17 6 17.5 16.5Z" fill="' + c + '" stroke="#3b2a12" stroke-width="1"/><rect x="6.6" y="13.4" width="10.8" height="2" fill="rgba(0,0,0,0.25)"/></svg>';
    }
    if (cat === "faces") {
      if (it.id === "none") return '<svg viewBox="0 0 24 24" width="34" height="34"><circle cx="12" cy="12" r="9" fill="none" stroke="#b9ab8c" stroke-width="2"/><path d="M6 18L18 6" stroke="#b9ab8c" stroke-width="2"/></svg>';
      const dark = it.id === "sunglasses";
      return '<svg viewBox="0 0 24 24" width="34" height="34"><circle cx="7" cy="13" r="4.2" fill="' + (dark ? "#222" : "rgba(200,230,255,0.6)") + '" stroke="#333" stroke-width="1.4"/><circle cx="17" cy="13" r="4.2" fill="' + (dark ? "#222" : "rgba(200,230,255,0.6)") + '" stroke="#333" stroke-width="1.4"/><path d="M11 13h2" stroke="#333" stroke-width="1.4"/></svg>';
    }
    if (cat === "gloves") return '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M7 21V11l-2-4 2-1 2 3V4h2v7-8h2v8-7h2v8-6h2v11c0 3-2 5-5 5z" fill="' + (it.color || "#f2b98c") + '" stroke="#3b2a12" stroke-width="1"/></svg>';
    if (cat === "paints") return '<svg viewBox="0 0 24 24" width="34" height="34"><circle cx="12" cy="12" r="10" fill="' + hex(it.body) + '" stroke="#3b2a12" stroke-width="1"/><path d="M12 2a10 10 0 0 1 0 20z" fill="' + hex(it.wood) + '"/><circle cx="12" cy="12" r="4" fill="' + hex(it.metal) + '" stroke="#3b2a12" stroke-width="1"/></svg>';
    return I("star", 30);
  }

  function styleHtml() {
    const look = HH.Looks.get();
    const cat = STYLE_CATS.find(function (c) { return c.id === styleTab; }) || STYLE_CATS[0];
    let h = '<div class="ptop"><div class="sign style">' + I("users", 30) + " WARDROBE</div>" + money() + "</div>";
    h += '<div class="stylewrap"><div class="pvbox"><canvas id="pvcanvas"></canvas><div class="pvname">' + (HH.Looks.item("chars", look.char) || {}).name + "</div></div>";
    h += '<div class="shopwrap"><div class="cats">' + STYLE_CATS.map(function (c) {
      return '<button class="cat' + (c.id === cat.id ? " on" : "") + '" data-a="stab" data-v="' + c.id + '"><span>' + I(c.icon, 22) + "</span>" + c.name + "</button>";
    }).join("") + '</div><div class="pane"><div class="grid">';
    HH.WARDROBE[cat.id].forEach(function (it) {
      const own = HH.Looks.owned(cat.id, it.id), eq = look[HH.Looks.KEY[cat.id]] === it.id;
      h += card({
        icon: styleIcon(cat.id, it), title: it.name, desc: "",
        action: eq ? null : "wear", value: cat.id + ":" + it.id,
        cost: own ? undefined : it.cost, cur: "gems",
        price: eq ? "WEARING" : own ? "WEAR" : I("gem", 16) + " " + it.cost,
        cls: "style-card " + (eq ? "eq" : own ? "owned" : "")
      });
    });
    h += "</div></div></div></div>";
    h += '<div class="note">' + I("gem", 18) + " Buy looks with gems. Other players see your character, hat and glasses. Your gloves and tool paint show in your own hands.</div>";
    return h;
  }

  function boostsHtml() {
    const ad = HH.Platform.sdkReady ? "" : (HH.CONFIG.rewardedTestMode ? "<p class='big-p'><i>Test mode: no real ad plays here. On CrazyGames a short video ad plays first.</i></p>" : "");
    let h = '<div class="ptop"><div class="sign">' + I("boost", 30) + " FREE BOOSTS</div>" + money() + "</div>";
    h += '<div class="note">' + I("play", 18) + " Watch a short ad to get a boost. <b>Totally optional</b>, you never need boosts to win! Press <kbd>V</kbd> anytime to grab the boost shown under the buttons. Click outside to close.</div>" + ad;
    h += '<div class="grid">';
    HH.BOOSTS.forEach(function (b) {
      const left = b.dur ? HH.Game.boostLeft(b.id) : 0;
      const active = left > 0 || (b.id === "doubleboost" && HH.Save.data.doubleNext);
      h += card({ icon: I(b.icon, 30), title: b.name, desc: "<b>Reward:</b> " + b.desc, fx: active ? "<b>Active" + (left ? ": " + Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0") + " left" : "") + "</b> (watching again adds more)" : "",
        action: "ad", value: b.id, price: I("play", 16) + " WATCH AD", cur: "ad", cls: active ? "owned" : "" });
    });
    h += '</div><div class="row"><button class="btn go" data-a="close">Back to digging</button></div>';
    return h;
  }

  function mpHtml() {
    const N = HH.Net;
    let h = '<div class="ptop"><div class="sign">' + I("users", 30) + " PLAY WITH FRIENDS</div></div>";
    const online = N.PHOTON_READY();
    h += '<div class="note">' + (online ? "Online multiplayer is ready (Photon)." : "<b>Local test mode:</b> rooms work between browser tabs on this computer. Add a Photon App ID to play online.") + "</div>";
    if (N.active) {
      const link = HH.Platform.inviteLink(N.room);
      h += '<div class="mpbox"><div class="mp-code">Room code: <b>' + N.room + "</b></div>" +
        "<p class='big-p'>Players: <b>" + (N.players.size + 1) + "</b> " + (N.isMaster ? "(you are the host)" : "") + "</p>" +
        "<div class='mp-list'>" + "<div>" + N.name + " (you)</div>" + Array.from(N.players.values()).map(function (p) { return "<div>" + p.name + "</div>"; }).join("") + "</div>" +
        '<input id="mplink" class="mplink" readonly value="' + link.replace(/"/g, "&quot;") + '">' +
        '<div class="row"><button class="btn go" data-a="mpcopy">Copy invite link</button><button class="btn ghost" data-a="mpleave">Leave room</button></div></div>';
    } else {
      h += '<div class="mpbox"><div class="setting"><span>Your name</span><input id="mpname" class="mpinput" maxlength="16" value="' + (HH.Save.data.playerName || "").replace(/"/g, "") + '" placeholder="Farmer"></div>' +
        '<div class="row"><button class="btn go" data-a="mphost">' + I("users", 20) + " Create a room</button></div>" +
        '<div class="setting"><span>Join with a code</span><span class="codebox"><input id="mpcode" class="mpinput" maxlength="8" placeholder="ROOM CODE" autocomplete="off" spellcheck="false"><button class="tog on" data-a="mpjoin">Join</button></span></div>' +
        "<p class='big-p'>Everyone digs the same haystack together. Whoever finds the needle carries it to Wizzo, and the whole room moves on to the next level together.</p></div>";
    }
    h += '<div class="row"><button class="btn go" data-a="close">Back</button></div>';
    return h;
  }

  function pauseHtml() {
    const st = HH.Save.data.settings;
    return '<div class="ptop"><div class="sign">PAUSED' + (HH.Net.active ? " <small>(game keeps running in multiplayer)</small>" : "") + "</div>" + money() + "</div>" +
      '<div class="row"><button class="btn go" data-a="close">Resume</button><button class="btn" data-a="boosts">' + I("boost", 20) + ' Free Boosts</button><button class="btn" data-a="mp">' + I("users", 20) + " Multiplayer</button></div>" +
      '<div class="settings">' +
      '<div class="setting"><span>Tutorial tips</span><button class="tog' + (st.tutorial !== false ? " on" : "") + '" data-a="tut">' + (st.tutorial !== false ? "On" : "Off") + "</button></div>" +
      '<div class="setting"><span>Sound effects</span><button class="tog' + (st.sfx ? " on" : "") + '" data-a="sfx">' + (st.sfx ? "On" : "Off") + "</button></div>" +
      '<div class="setting"><span>Music</span><button class="tog' + (st.music ? " on" : "") + '" data-a="music">' + (st.music ? "On" : "Off") + "</button></div>" +
      '<div class="setting"><span>Song <small style="opacity:.7">(press M to skip)</small></span><span class="trackpick"><button class="tog" data-a="trackprev">&#9664;</button><span class="trackname">' + I("music", 16) + " " + HH.Music.current.name + "<small>" + HH.Music.current.by + '</small></span><button class="tog" data-a="tracknext">&#9654;</button></span></div>' +
      '<div class="setting"><span>Mouse sensitivity</span><input type="range" min="0.3" max="2.5" step="0.1" value="' + st.sens + '" data-a="sens"></div>' +
      '<div class="setting"><span>Invert look Y</span><button class="tog' + (st.invertY ? " on" : "") + '" data-a="inv">' + (st.invertY ? "On" : "Off") + "</button></div>" +
      '<div class="setting"><span>Graphics</span><button class="tog on" data-a="gfx">' + ({ auto: "Auto", high: "Pretty", fast: "Fast" })[st.gfx || "auto"] + "</button></div>" +
      '<div class="setting"><span>Secret code</span><span class="codebox"><input id="codein" type="text" maxlength="80" placeholder="Enter code..." autocomplete="off" spellcheck="false"><button class="tog" data-a="redeem">Redeem</button></span></div>' +
      (HH.Save.data.cheats ? '<div class="cheats"><b>CHEATS</b>' +
        [["cash", "+$10M cash"], ["gems", "+10K gems"], ["level", "+5 levels"], ["rebirth", "Ready to rebirth"], ["tokens", "+10 tokens"], ["needle", "Pop out needle"], ["maxall", "Max this run"], ["skiplevel", "Skip level"]].map(function (c) { return '<button class="tog on" data-a="cheat" data-v="' + c[0] + '">' + c[1] + "</button>"; }).join("") + "</div>" : "") +
      "</div><div class=\"controls\">WASD move &middot; Space jump (hold against hay to climb) &middot; R back to start if stuck &middot; Shift sprint &middot; Mouse look &middot; Click use tool &middot; 1-6 tools &middot; Q put away / equip &middot; F remote sell &middot; Tab shop &middot; U buy max &middot; G gems &middot; C style &middot; V watch ad for a boost &middot; B all boosts &middot; M next song &middot; Esc pause</div>" +
      '<div class="row"><button class="btn ghost" data-a="restart">Restart level</button><button class="btn ghost" data-a="wipe">Erase save</button></div>';
  }

  function winHtml(d) {
    const who = d.byMe ? "" : (HH.Net.active ? "<b>" + HH.Net.playerName(d.by) + "</b> delivered the needle for everyone! " : "");
    return '<div class="ptop"><div class="sign">' + I("needle", 30) + " LEVEL " + (d.index + 1) + " COMPLETE!</div></div><p class=\"big-p\">" + who + HH.NPC.wizard.name + ': "' + HH.WIZARD_LINES[Math.floor(Math.random() * HH.WIZARD_LINES.length)] + '"</p>' +
      '<div class="bigstats"><div class="bs"><b style="color:#7ff7ff">+' + d.gems + "</b><span>GEMS" + (d.doubled ? " (x2!)" : "") + '</span></div><div class="bs"><b>' + HH.fmtTime(d.time) + "</b><span>" + (d.newBest ? "NEW BEST!" : "TIME") + '</span></div><div class="bs"><b>' + Math.round(d.cleared * 100) + '%</b><span>HAY CLEARED</span></div><div class="bs"><b>' + HH.Save.data.needles + "</b><span>NEEDLES</span></div></div>" +
      (d.bonus > 0 ? '<p class="big-p">Speed bonus: +' + d.bonus + " gems!</p>" : "") +
      '<div class="nextlvl">' + I("map", 26) + ' <div><b>Next: Level ' + (d.index + 2) + " &middot; " + d.next.name + "</b><br><small>" + d.next.tip + '</small></div><div class="count"><span id="wincount">' + Math.ceil(winCountdown) + "</span><small>sec</small></div></div>" +
      '<div class="row"><button class="btn go" data-a="next">' + "Next level now <kbd>Enter</kbd>" + '</button><button class="btn ghost" data-a="gems">' + I("gem", 20) + " Gem shop (pauses timer)</button></div>";
  }

  let pvCanvas = null;
  function mountPreview() {
    const slot = $("pvcanvas");
    if (!slot) return;
    if (!pvCanvas) {
      pvCanvas = document.createElement("canvas");
      pvCanvas.id = "pvcanvas";
      slot.replaceWith(pvCanvas);
      HH.Looks.preview(pvCanvas);
    } else slot.replaceWith(pvCanvas);
    HH.Looks.showOnPreview(HH.Looks.get());
  }
  function dropPreview() {
    if (!pvCanvas) return;
    HH.Looks.stopPreview();
    pvCanvas = null;
  }

  function render() {
    let h = "";
    if (panel === "shop") h = shopHtml();
    else if (panel === "gems") h = gemsHtml();
    else if (panel === "pause") h = pauseHtml();
    else if (panel === "win") h = winHtml(winData);
    else if (panel === "boosts") h = boostsHtml();
    else if (panel === "mp") h = mpHtml();
    else if (panel === "style") h = styleHtml();
    const grid = $("panel").querySelector(".grid");
    const sc = grid ? grid.scrollTop : 0;
    $("panel").innerHTML = h;
    const g2 = $("panel").querySelector(".grid");
    if (g2) g2.scrollTop = sc;
    if (panel === "style") mountPreview(); else dropPreview();
    refreshAfford();
  }

  function refreshAfford() {
    if (!panel) return;
    const R = HH.Game.run;
    const cash = R ? R.cash : 0, gems = HH.Save.data.gems;
    const pc = $("p-cash"), pg = $("p-gems");
    if (pc) pc.textContent = HH.cash(cash);
    if (pg) pg.textContent = HH.fmtInt(gems);
    const tok = HH.Save.data.tokens || 0;
    const pt = $("p-tok");
    if (pt) pt.textContent = tok;
    $("panel").querySelectorAll(".card[data-cost]").forEach(function (el) {
      const have = el.dataset.cur === "gems" ? gems : el.dataset.cur === "tokens" ? tok : cash;
      el.classList.toggle("poor", have < parseFloat(el.dataset.cost));
    });
  }

  function bump(el, ok) {
    if (!el) return;
    el.classList.remove("bought", "nope");
    void el.offsetWidth;
    el.classList.add(ok ? "bought" : "nope");
  }

  function init() {
    $("panel").addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      const el = e.target.closest("[data-a]");
      if (!el || el.disabled || el.tagName === "INPUT") return;
      e.preventDefault();
      const a = el.dataset.a, v = el.dataset.v;
      if (a === "close") { HH.Audio.play("click"); if (handlers.close) handlers.close(); else close(); return; }
      if (a === "tab") { HH.Audio.play("click"); shopTab = v; render(); return; }
      if (a === "gtab") { HH.Audio.play("click"); gemTab = v; render(); return; }
      if (a === "stab") { HH.Audio.play("click"); styleTab = v; render(); return; }
      if (handlers[a]) {
        const ok = handlers[a](v, el);
        if (panel) {
          if (el.classList.contains("card")) { render(); bump($("panel").querySelector('.card[data-a="' + a + '"][data-v="' + v + '"]') || null, ok !== false); }
          else render();
        }
      }
    });
    $("overlay").addEventListener("pointerdown", function (e) {
      if (e.target !== $("overlay") || e.button !== 0) return;
      if (panel === "win") return;
      e.preventDefault();
      HH.Audio.play("click");
      if (handlers.close) handlers.close(); else close();
    });
    $("panel").addEventListener("keydown", function (e) {
      if (e.target.id === "codein" && e.key === "Enter" && handlers.redeem) { e.preventDefault(); handlers.redeem(); }
      if (e.target.id === "mpcode" && e.key === "Enter" && handlers.mpjoin) { e.preventDefault(); handlers.mpjoin(); }
    });
    $("panel").addEventListener("input", function (e) {
      if (e.target.dataset.a === "sens" && handlers.sens) handlers.sens(parseFloat(e.target.value));
    });
    document.querySelectorAll(".hbtn").forEach(function (b) {
      b.addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); HH.App.openPanel(b.dataset.open); });
    });
    $("cashic").innerHTML = I("cash", 26);
    $("gemic").innerHTML = I("gem", 26);
    $("bigbag-ic").innerHTML = I("bag", 30);
    $("objarrow-icon").innerHTML = I("arrow", 34);
  }

  const LOAD_TIPS = ["Tip: hold Space against hay to climb out of holes.", "Tip: press U in the shop to buy the cheapest upgrades.", "Tip: bigger bags mean fewer trips to Bjorn.", "Tip: the needle hides deep in the thickest part of the stack.", "Tip: press C to dress up your farmer.", "Tip: press V for a free boost from a short ad."];
  const load = { shown: 0, target: 0, raf: 0, tipT: 0, tip: 0, last: 0 };
  function loadTick(t) {
    const el = $("loading");
    if (!el) return;
    const dt = load.last ? Math.min(0.1, (t - load.last) / 1000) : 0;
    load.last = t;
    const cap = Math.min(0.99, load.target + 0.12);
    if (load.shown < load.target) load.shown += Math.max(0.004, (load.target - load.shown) * dt * 6);
    else if (load.shown < cap) load.shown += (cap - load.shown) * dt * 0.35;
    $("load-fill").style.width = (load.shown * 100).toFixed(1) + "%";
    const pct = $("load-pct");
    if (pct) pct.textContent = Math.floor(load.shown * 100) + "%";
    load.tipT -= dt;
    if (load.tipT <= 0 && $("load-tip")) { load.tipT = 2.6; $("load-tip").textContent = LOAD_TIPS[load.tip++ % LOAD_TIPS.length]; }
    load.raf = requestAnimationFrame(loadTick);
  }
  function loading(p, text) {
    const el = $("loading");
    if (!el) return;
    if (p >= 1) { load.target = 1; load.shown = 1; $("load-fill").style.width = "100%"; cancelAnimationFrame(load.raf); el.classList.add("done"); setTimeout(function () { el.remove(); }, 600); return; }
    if (!window.__loadTaken) { window.__loadTaken = true; load.shown = Math.max(load.shown, window.__load || 0); }
    load.target = Math.max(load.target, p);
    if (!load.raf) load.raf = requestAnimationFrame(loadTick);
    if (text) $("load-text").textContent = text;
  }

  return {
    init: init, hud: hud, popup: popup, toast: toast, flyIcons: flyIcons, confetti: confetti, say: say, flash: flash, open: open, close: close, render: render, refreshAfford: refreshAfford, loading: loading, bagBlocked: bagBlocked,
    get panel() { return panel; },
    showWin: function (d, h, secs) { winData = d; winCountdown = secs; open("win", h); },
    tickWin: function (dt) { if (panel === "win" && winCountdown > 0) { winCountdown -= dt; return winCountdown <= 0; } return false; },
    pauseWin: function () { winCountdown = 0; },
    perkCost: perkCost
  };
})();

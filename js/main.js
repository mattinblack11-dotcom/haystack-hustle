HH.App = (function () {
  const G = HH.Game, UI = HH.UI, I = HH.Input;
  let last = 0, winAt = 0, paused = false, shake = 0, affordT = 0, ready = false;
  const zoneLatch = { shop: false, gems: false };
  const CODE_HASH = "33367ff41fe04e1a2629327f9086e510dd90c24fb4bbeb24a859135be283da7f";
  const fpsLog = [];
  let autoDowngraded = false, fpsT = 0, adBusy = false;

  function S() { return HH.Save.data; }

  function changeTrack(dir) {
    HH.Audio.unlock();
    const t = HH.Music.next(dir);
    S().settings.track = t.id;
    HH.Save.save();
    if (!S().settings.music) { S().settings.music = true; HH.Audio.setMusic(true); }
    UI.toast(HH.icon("music", 18) + " <b>" + t.name + "</b> &middot; " + t.by, 1800);
  }

  function checkCode(code) {
    if (code.length < 30 || !window.crypto || !crypto.subtle) return Promise.resolve(false);
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(code)).then(function (buf) {
      const hex = Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      return hex === CODE_HASH;
    }).catch(function () { return false; });
  }

  let fpsStage = 0;
  function watchFps(dt) {
    if (S().settings.gfx !== "auto" || autoDowngraded || paused || UI.panel) return;
    fpsLog.push(dt);
    if (fpsLog.length > 120) fpsLog.shift();
    fpsT += dt;
    if (fpsT < 3 || fpsLog.length < 120) return;
    fpsT = 0;
    const avg = fpsLog.reduce(function (a, b) { return a + b; }, 0) / fpsLog.length;
    if (fpsStage === 0 && avg > 1 / 45) {
      fpsStage = 1;
      fpsLog.length = 0;
      HH.Voxels.setTufts(false);
    } else if (fpsStage === 1 && avg > 1 / 32) {
      autoDowngraded = true;
      HH.World.setQuality("fast");
      UI.toast("Switched to <b>Fast</b> graphics for smoother play (change it in the pause menu).", 3500);
    }
  }

  function tutOn() { return S().settings.tutorial !== false; }

  function onEvent(name, d) {
    const S0 = S();
    if (name === "popup") UI.popup(d.text, d.pos, d.color, d.big);
    else if (name === "toast") UI.toast(d.text);
    else if (name === "say") UI.say(d.who, d.text, d.color);
    else if (name === "shake") shake = Math.max(shake, d.amt);
    else if (name === "flash") UI.flash();
    else if (name === "bagblocked") UI.bagBlocked(d.pos);
    else if (name === "bagfull") UI.toast("<b>BAG FULL!</b>", 1800);
    else if (name === "grabbed") {
      if (S0.tutorial === 0 && G.run.bag >= 5) { S0.tutorial = 1; HH.Save.save(); if (tutOn()) UI.toast("Nice! Now walk to <b>" + HH.NPC.buyer.name + "</b> and sell it. Follow the arrow!"); }
    } else if (name === "sold") {
      UI.flyIcons("cash", Math.min(14, 4 + Math.floor(Math.log2(1 + (d.value || 0)))));
      if (S0.tutorial === 1) { S0.tutorial = 2; HH.Save.save(); if (tutOn()) UI.toast("Cha-ching! Walk into <b>Hank's Hay Shop</b> or press <kbd>Tab</kbd> to spend it."); }
    } else if (name === "needle") {
      UI.toast(HH.icon("needle", 20) + " <b>THE NEEDLE!</b> Grab it, then carry it to <b>" + HH.NPC.wizard.name + "</b>!", 3500);
      UI.popup("THE NEEDLE!", d.pos, "#ff8ae2", true);
      UI.flash();
      shake = Math.max(shake, 0.3);
      HH.Platform.happytime();
    } else if (name === "picked") {
      UI.toast("You've got the needle! Carry it to <b>" + HH.NPC.wizard.name + "</b> (follow the arrow).", 3200);
    } else if (name === "storm") {
      if (d.on) { UI.toast(HH.icon("bolt", 18) + " <b>HAY STORM!</b> All hay is worth DOUBLE for a while!", 3500); shake = 0.25; }
      else UI.toast("The Hay Storm passed.", 2000);
    } else if (name === "comboEnd") {
      UI.toast("Combo ended at <b>x" + d.n + "</b>!", 1500);
    } else if (name === "needlepart") {
      UI.toast(HH.icon("needle", 20) + " <b>Needle " + d.done + " of " + d.need + " delivered!</b> Another needle is hidden deep in the stack.", 3500);
      UI.confetti(40);
      UI.flyIcons("gem", 6);
    } else if (name === "win") {
      if (!HH.Net.active) paused = true;
      winAt = performance.now();
      HH.Platform.gameplayStop();
      HH.Audio.vacuum(false);
      UI.confetti(110);
      UI.flyIcons("gem", 12);
      setTimeout(function () {
        UI.showWin(d, {
          next: function () { goNext(); },
          gems: function () { UI.pauseWin(); UI.close(); openPanel("gems"); }
        }, 8);
      }, 900);
    } else if (name === "run") {
      const L = d.level;
      if (d.restored) UI.toast("Welcome back! Your level was saved.", 2500);
      else if (L) UI.toast("<b>Level " + (d.index + 1) + ": " + L.name + "</b><br>" + L.tip + (G.needlesFor(d.index) > 1 ? "<br><b>Find " + G.needlesFor(d.index) + " needles</b> to finish this level." : "") + (G.run && G.run.density > 1 ? "<br><small>Hay here is packed " + Math.round((G.run.density - 1) * 100) + "% tighter.</small>" : ""), 5000);
    } else if (name === "mp") {
      if (d.kind === "hosting") UI.toast("Room <b>" + HH.Net.room + "</b> is open! Share the code or invite link.", 3500);
      if (d.kind === "joining") UI.toast("Joining room <b>" + HH.Net.room + "</b>...", 2500);
      if (d.kind === "synced") UI.toast("Joined! You're digging the same haystack together.", 3000);
      if (d.kind === "left") UI.toast("You left the room. Back to single player.", 2500);
    }
  }

  function goNext() {
    if (UI.panel === "win") UI.close();
    if (HH.Net.active && G.run && G.run.done && !HH.Net.isMaster && !G.run.nextReady) {
      G.run.nextReady = true;
    }
    paused = false;
    HH.Platform.midgameAd({
      pause: function () { HH.Audio.setHidden(true); },
      resume: function () { HH.Audio.setHidden(document.hidden); },
      done: function () {
        if (G.run && G.run.done) G.nextLevel();
        HH.Platform.gameplayStart();
      }
    });
  }

  function restartLevel() {
    UI.close();
    paused = false;
    G.startLevel(G.run.levelIndex);
    HH.Platform.gameplayStart();
  }

  function shopHandlers() {
    return {
      buymax: function () { const n = G.buyMax(); UI.toast(n ? "<b>Bought " + n + " upgrade" + (n > 1 ? "s" : "") + "!</b>" : "Can't afford anything yet.", 1500); return n > 0; },
      tool: function (id) { return G.buyTool(id); },
      bag: function () { return G.buyBag(); },
      up: function (id) {
        const ok = G.buyUpgrade(id);
        if (ok && id === "hold" && S().tutorial === 2) {
          S().tutorial = 3; HH.Save.save();
          if (tutOn()) UI.toast("Auto-Grab! Hold the mouse to dig. Now <b>find the needle</b> and bring it to Wizzo!", 3500);
        }
        return ok;
      },
      close: closePanel
    };
  }

  function gemHandlers() {
    return {
      perk: function (id) {
        const p = HH.PERKS.find(function (x) { return x.id === id; });
        const c = UI.perkCost(p);
        if ((S().perks[id] || 0) >= p.max || S().gems < c) { HH.Audio.play("deny"); return false; }
        S().gems -= c; S().perks[id] = (S().perks[id] || 0) + 1;
        HH.Audio.play("buy"); HH.Save.save();
        return true;
      },
      cls: function (id) {
        const c = HH.CLASSES.find(function (x) { return x.id === id; });
        if (S().classes.indexOf(id) < 0) {
          if (S().gems < c.cost) { HH.Audio.play("deny"); return false; }
          S().gems -= c.cost; S().classes.push(id);
        }
        S().cls = id;
        HH.Audio.play("buy"); HH.Save.save();
        return true;
      },
      rebirth: function () {
        if (!G.canRebirth()) return false;
        if (!confirm("Rebirth now? You'll lose your gems and perks, but keep classes and levels, and get permanent boosts + Rebirth Tokens.")) return false;
        const reward = G.rebirthReward();
        G.rebirth();
        HH.Audio.play("win");
        UI.close();
        UI.flash();
        if (!HH.Net.active) G.startLevel(G.run.levelIndex);
        const nt = HH.TOOLS.find(function (t) { return (t.rb || 0) === S().rebirths; });
        setTimeout(function () { UI.toast("<b>REBIRTH " + S().rebirths + "!</b> +" + reward + " tokens, +25% cash forever" + (nt ? ". New tool unlocked: <b>" + nt.name + "</b>!" : "!"), 5000); }, 400);
        return true;
      },
      rbitem: function (id) { return G.buyRebirthItem(id); },
      replay: function (v) {
        const R = G.run;
        if (HH.Net.active) return false;
        if (R && !R.done && R.cash > 5 && !confirm("Leave this level? This level's cash and cash upgrades will be lost.")) return false;
        UI.close();
        paused = false;
        G.startLevel(parseInt(v, 10));
        return true;
      },
      close: closePanel
    };
  }

  const AD_ROTA = ["doubleboost", "sellboost", "cashboost", "bagboost", "vacboost"];
  let adIdx = 0, adT = 0, adShown = "";

  function adGood(id) {
    const R = G.run, s = S();
    if (id === "doubleboost" && s.doubleNext) return false;
    if (id === "vacboost" && !(R && R.tools && R.tools.vac)) return false;
    if (id === "cashboost" && !R) return false;
    const b = HH.BOOSTS.find(function (x) { return x.id === id; });
    if (b && b.dur && G.boostLeft(id) > 30) return false;
    return true;
  }

  function adOffer() {
    for (let q = 0; q < AD_ROTA.length; q++) {
      const id = AD_ROTA[(adIdx + q) % AD_ROTA.length];
      if (adGood(id)) { adIdx = (adIdx + q) % AD_ROTA.length; return id; }
    }
    return null;
  }

  function nextAdOffer() { adIdx = (adIdx + 1) % AD_ROTA.length; adT = 0; }

  function adHud(dt) {
    adT += dt;
    if (adT > 14 && !adBusy) nextAdOffer();
    const id = adOffer();
    const el = document.getElementById("adoffer");
    if (!el) return;
    const on = !!id && HH.CONFIG.rewardedEnabled !== false;
    el.classList.toggle("hidden", !on);
    el.classList.toggle("busy", adBusy);
    if (!on || id === adShown) return;
    adShown = id;
    const b = HH.BOOSTS.find(function (x) { return x.id === id; });
    document.getElementById("adoffer-ic").innerHTML = HH.icon(b.icon, 28);
    document.getElementById("adoffer-name").textContent = b.name;
    el.title = b.desc;
    el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap");
  }

  function watchAd(id) {
    if (adBusy || !id) return false;
    adBusy = true;
    HH.Platform.rewardedAd({
      pause: function () { HH.Audio.setHidden(true); HH.Platform.gameplayStop(); },
      resume: function () { HH.Audio.setHidden(document.hidden); HH.Platform.gameplayStart(); },
      reward: function (test) {
        adBusy = false;
        G.grantBoost(id);
        UI.flash();
        if (UI.panel === "boosts") UI.render();
        nextAdOffer();
      },
      error: function (msg) { adBusy = false; UI.toast(msg, 2500); }
    });
    return true;
  }

  function boostHandlers() {
    return {
      ad: function (id) { return watchAd(id); },
      close: closePanel
    };
  }

  function mpHandlers() {
    function name() {
      const el = document.getElementById("mpname");
      const n = (el && el.value.trim()) || S().playerName || ("Farmer" + Math.floor(Math.random() * 900 + 100));
      S().playerName = n.slice(0, 16);
      HH.Save.save();
      return S().playerName;
    }
    return {
      mphost: function () {
        const room = HH.Net.newRoomCode();
        HH.Net.connect(room, name());
        HH.Platform.showInvite(room);
        setTimeout(function () { if (UI.panel === "mp") UI.render(); }, 900);
      },
      mpjoin: function () {
        const el = document.getElementById("mpcode");
        const code = (el ? el.value : "").trim().toUpperCase();
        if (code.length < 4) { UI.toast("Type the room code first.", 1800); return false; }
        HH.Net.connect(code, name());
        setTimeout(function () { if (UI.panel === "mp") UI.render(); }, 900);
      },
      mpleave: function () { HH.Net.leave(); HH.Platform.hideInvite(); },
      mpcopy: function () {
        const el = document.getElementById("mplink");
        if (!el) return;
        el.select();
        try { navigator.clipboard.writeText(el.value).then(function () { UI.toast("Invite link copied!", 1500); }, function () { document.execCommand("copy"); UI.toast("Invite link copied!", 1500); }); } catch (e) { document.execCommand("copy"); }
      },
      close: closePanel
    };
  }

  function pauseHandlers() {
    const st = S().settings;
    return {
      sfx: function () { st.sfx = !st.sfx; HH.Audio.setSfx(st.sfx); HH.Save.save(); },
      music: function () { st.music = !st.music; HH.Audio.setMusic(st.music); HH.Save.save(); },
      tut: function () { st.tutorial = st.tutorial === false; HH.Save.save(); UI.toast("Tutorial tips " + (st.tutorial ? "on" : "off") + ".", 1400); },
      inv: function () { st.invertY = !st.invertY; HH.Save.save(); },
      sens: function (v) { st.sens = v; HH.Save.save(); },
      trackprev: function () { changeTrack(-1); },
      tracknext: function () { changeTrack(1); },
      boosts: function () { UI.close(); paused = false; openPanel("boosts"); },
      mp: function () { UI.close(); paused = false; openPanel("mp"); },
      gfx: function () {
        st.gfx = st.gfx === "auto" ? "high" : st.gfx === "high" ? "fast" : "auto";
        HH.World.setQuality(st.gfx === "fast" ? "fast" : "high");
        fpsLog.length = 0; autoDowngraded = false; fpsStage = 0;
        HH.Save.save();
      },
      redeem: function () {
        const el = document.getElementById("codein");
        const code = (el ? el.value : "").trim().toUpperCase().replace(/\s+/g, "");
        if (!code) return false;
        checkCode(code).then(function (ok) {
          if (ok) {
            S().cheats = true; HH.Save.save();
            HH.Audio.play("win");
            UI.toast("<b>Cheats unlocked!</b> Use the buttons in this menu.", 3000);
          } else {
            HH.Audio.play("deny");
            UI.toast("That code doesn't work.", 1800);
          }
          UI.render();
        });
        return true;
      },
      cheat: function (v) { if (!S().cheats) return false; G.cheat(v); if (v === "skiplevel") UI.close(); UI.toast("Cheat applied!", 900); return true; },
      restart: function () { if (HH.Net.active) { UI.toast("Can't restart during multiplayer.", 1800); return false; } if (confirm("Restart this level with a fresh haystack? You keep your upgrades.")) restartLevel(); },
      wipe: function () {
        if (!confirm("Erase ALL progress (gems, perks, classes, levels)?")) return;
        HH.Net.leave();
        HH.Save.reset();
        UI.close();
        paused = false;
        if (G.run) G.run.wiped = true;
        G.startLevel(0);
      },
      close: closePanel
    };
  }

  function styleHandlers() {
    return {
      wear: function (v) {
        const p = v.split(":"), cat = p[0], id = p[1];
        const it = HH.Looks.item(cat, id);
        if (!it) return false;
        const s = HH.Save.data;
        if (!HH.Looks.owned(cat, id)) {
          if ((s.gems || 0) < it.cost) { HH.Audio.play("deny"); UI.toast("Not enough gems!", 1400); return false; }
          s.gems -= it.cost;
          s.owned = s.owned || [];
          s.owned.push(cat + ":" + id);
          HH.Audio.play("buy");
        } else HH.Audio.play("click");
        s.look = HH.Looks.get();
        s.look[HH.Looks.KEY[cat]] = id;
        HH.Save.save();
        HH.Player.applyLook();
        G.shareLook();
        return true;
      },
      close: closePanel
    };
  }

  function openPanel(name) {
    if (name === "adoffer") { if (ready && UI.panel !== "win") watchAd(adOffer()); return; }
    if (name === "gift") { if (ready && UI.panel !== "win") HH.Quests.openGift(); return; }
    if (!ready || UI.panel === "win") return;
    if (UI.panel === name) { closePanel(); return; }
    if (UI.panel === "pause") { paused = false; HH.Platform.gameplayStart(); }
    if (UI.panel) UI.close();
    HH.Audio.play("click");
    if (name === "shop") UI.open("shop", shopHandlers());
    else if (name === "gems") UI.open("gems", gemHandlers());
    else if (name === "boosts") UI.open("boosts", boostHandlers());
    else if (name === "mp") UI.open("mp", mpHandlers());
    else if (name === "style") UI.open("style", styleHandlers());
    else if (name === "pause") { if (!HH.Net.active) { paused = true; HH.Platform.gameplayStop(); } UI.open("pause", pauseHandlers()); }
  }

  function closePanel() {
    if (UI.panel === "pause") { paused = false; HH.Platform.gameplayStart(); }
    UI.close();
    G.persist();
    if (G.run && G.run.done) goNext();
  }

  function keyHook(code) {
    if (!ready) return false;
    if (code === "Tab") { openPanel("shop"); return true; }
    if (code === "KeyG") { openPanel("gems"); return true; }
    if (code === "KeyC") { openPanel("style"); return true; }
    if (code === "KeyV" && !UI.panel) { watchAd(adOffer()); return true; }
    if (code === "KeyJ" && !UI.panel) { HH.Quests.openGift(); return true; }
    if (code === "KeyR" && !UI.panel && G.run) { HH.Player.spawn(HH.World.spots.spawn.clone()); HH.Audio.play("boost"); UI.flash(); return true; }
    if (code === "KeyU") { if (G.run) { const n = G.buyMax(); if (UI.panel) UI.render(); UI.toast(n ? "<b>Bought " + n + " upgrade" + (n > 1 ? "s" : "") + "!</b>" : "Can't afford anything yet.", 1500); } return true; }
    if (code === "KeyB" && !UI.panel) { openPanel("boosts"); return true; }
    if (code === "KeyM") { changeTrack(1); if (UI.panel === "pause") UI.render(); return true; }
    if (code === "Escape" || code === "KeyP") {
      if (UI.panel && UI.panel !== "win") closePanel();
      else if (!UI.panel) openPanel("pause");
      return true;
    }
    if (code === "Enter" && UI.panel === "win") { goNext(); return true; }
    return false;
  }

  function dailyReward() {
    const S0 = S();
    const today = new Date().toISOString().slice(0, 10);
    if (S0.lastDaily === today) return;
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    S0.streak = S0.lastDaily === y ? Math.min(7, S0.streak + 1) : 1;
    S0.lastDaily = today;
    const g = 10 * S0.streak;
    S0.gems += g;
    HH.Save.save();
    if (S0.needles > 0 || S0.tutorial >= 3) setTimeout(function () { UI.toast("Daily reward: <b>+" + g + " gems</b> (day " + S0.streak + " streak)", 3500); }, 1500);
  }

  let pitT = 0, pitTold = false;
  function pitCheck(dt) {
    if (pitTold || !G.run || UI.panel) return;
    const p = HH.Player.pos, V = HH.Voxels, d = 1.5;
    const around = Math.min(V.topAt(p.x + d, p.z), V.topAt(p.x - d, p.z), V.topAt(p.x, p.z + d), V.topAt(p.x, p.z - d));
    if (around - p.y > 2.2) pitT += dt; else pitT = 0;
    if (pitT > 4) { pitTold = true; UI.toast("Deep hole! <b>Hold Space</b> against the hay to climb out, or press <kbd>R</kbd> to go back to the start.", 4500); }
  }

  function loop(t) {
    const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
    last = t;
    if (HH.Cinema && HH.Cinema.active) { HH.Cinema.tick(dt); requestAnimationFrame(loop); return; }
    HH.Net.tick(dt);
    adHud(dt);
    pitCheck(dt);
    HH.Quests.update(dt, !paused);
    if (UI.tickWin(dt)) goNext();
    if (paused && !UI.panel && G.run && G.run.done && !HH.Net.active && performance.now() - winAt > 2500) goNext();
    const frozen = !!UI.panel;
    let mods = { speed: 1, jump: 1, sprint: 0, hover: false };
    if (G.run) mods = G.stats().move;
    if (!paused) {
      HH.Player.update(dt, I, frozen, mods);
      G.update(dt, I, !frozen);
      affordT -= dt;
      if (UI.panel && affordT <= 0) { affordT = 0.1; UI.refreshAfford(); }
      const pp = HH.Player.pos, sp = HH.World.spots;
      ["shop", "gems"].forEach(function (z) {
        const inside = Math.hypot(pp.x - sp[z].x, pp.z - sp[z].z) < 2.0 && pp.y < 1;
        if (inside && !zoneLatch[z] && !UI.panel) { zoneLatch[z] = true; openPanel(z); if (z === "shop") UI.say(HH.NPC.shop.name, "Howdy! What can I getcha?", "#ffe14d"); }
        if (!inside) zoneLatch[z] = false;
      });
    }
    if (shake > 0) {
      const c = HH.World.camera;
      c.position.x += (Math.random() - 0.5) * shake;
      c.position.y += (Math.random() - 0.5) * shake;
      shake = Math.max(0, shake - dt * 1.5);
    }
    watchFps(dt);
    HH.World.frame(paused ? 0 : dt, HH.Player.pos, HH.Player.fp, true);
    UI.hud();
    requestAnimationFrame(loop);
  }

  function breathe() { return new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 16); }); }); }

  async function boot() {
    UI.loading(0.05, "Loading the barn...");
    try { if (document.fonts) await document.fonts.load("54px \"Lilita One\""); } catch (e) {}
    await breathe();
    HH.World.init(document.getElementById("game"));
    await HH.Platform.init();
    HH.Platform.loadingStart();
    HH.Save.load();
    const S0 = S();
    if (!S0.migratedLevels) {
      S0.migratedLevels = true;
      if (S0.needles > 0 && !S0.campaign) { S0.campaign = Math.min(S0.needles, HH.LEVELS.length - 1); S0.current = S0.campaign; S0.run = null; }
      HH.Save.save();
    }
    const st = S0.settings;
    HH.World.setQuality(st.gfx === "fast" ? "fast" : "high");
    HH.Audio.setSfx(st.sfx);
    HH.Audio.setMusic(st.music);
    HH.Audio.setMuted(HH.Platform.isMuted());
    HH.Platform.onMuteChange(function (m) { HH.Audio.setMuted(m); });
    I.init(document.getElementById("game"));
    I.onAnyInput(function () { HH.Audio.unlock(); });
    I.setKeyHook(keyHook);
    UI.init();
    G.onEvent(onEvent);
    G.mpInit();
    UI.loading(0.2, "Waking up the characters...");
    await breathe();
    await new Promise(function (r) { if (HH.MODEL_DATA) r(); else HH.modelsReady = r; });
    UI.loading(0.45, "Teaching Bjorn to count coins...");
    await breathe();
    try { await HH.World.loadNPCs(); } catch (e) { console.warn(e); }
    UI.loading(0.6, "Building the village...");
    await breathe();
    try { await HH.World.loadBuildings(); } catch (e) { console.warn(e); }
    UI.loading(0.7, "Washing the hands...");
    await breathe();
    try { await HH.Player.build(HH.World.scene); } catch (e) { console.warn(e); }
    UI.loading(0.85, "Stacking a LOT of hay...");
    await breathe();
    await new Promise(function (r) { setTimeout(r, 30); });
    if (!G.restore()) G.newRun();
    const cq = new URLSearchParams(location.search);
    if (cq.has("cinematic")) setTimeout(function () { HH.Cinema.start(cq.get("cinematic") || "landscape", cq.has("record")); }, 600);
    dailyReward();
    document.addEventListener("visibilitychange", function () {
      HH.Audio.setHidden(document.hidden);
      if (document.hidden) { G.persist(); if (!UI.panel) openPanel("pause"); }
    });
    window.addEventListener("beforeunload", function () { G.persist(); if (HH.Net.active) HH.Net.leave(); });
    ready = true;
    UI.loading(1);
    HH.Platform.loadingStop();
    HH.Platform.gameplayStart();
    const inviteRoom = HH.Platform.inviteRoom();
    if (inviteRoom) {
      HH.Platform.username().then(function (u) {
        HH.Net.connect(inviteRoom.toUpperCase(), u || S().playerName || ("Farmer" + Math.floor(Math.random() * 900 + 100)));
      });
    }
    last = performance.now();
    requestAnimationFrame(loop);
  }

  return { boot: boot, openPanel: openPanel };
})();

window.addEventListener("load", function () { HH.App.boot(); });

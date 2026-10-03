HH.Audio = (function () {
  let ctx = null, master, sfxBus, musicBus, noiseBuf;
  let sfxOn = true, musicOn = true, muted = false, hidden = false;
  let timer = null, seed = 7;
  let vacNode = null, vacGain = null, vacFilter = null;

  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    apply();
    return true;
  }

  function apply() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(muted || hidden ? 0 : 0.8, t, 0.05);
    sfxBus.gain.setTargetAtTime(sfxOn ? 1 : 0, t, 0.05);
    musicBus.gain.setTargetAtTime(musicOn ? 0.3 : 0, t, 0.1);
  }

  function tone(f, dur, type, vol, slide, when, bus) {
    const t = when || ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, freq, q, type, sweep, when) {
    const t = when || ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || "bandpass"; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  const S = {
    grab: function () { noise(0.09, 0.25, 2500 + Math.random() * 1500, 1.2, "bandpass"); },
    fork: function () { noise(0.22, 0.3, 900, 0.8, "bandpass", 3500); tone(260, 0.1, "triangle", 0.05, 180); },
    full: function () { tone(180, 0.15, "square", 0.06, 140); },
    sell: function (n) {
      const t = ctx.currentTime;
      tone(1320, 0.12, "square", 0.05, null, t); tone(1760, 0.3, "square", 0.05, null, t + 0.07);
      noise(0.15, 0.1, 6000, 2, "highpass", null, t + 0.05);
      if (n) tone(90, 0.25, "sine", 0.18, 60, t + 0.02);
    },
    croak: function () { tone(140, 0.18, "sawtooth", 0.07, 90); tone(120, 0.2, "sawtooth", 0.06, 80, ctx.currentTime + 0.16); },
    buy: function () { const t = ctx.currentTime; [0, 4, 7, 12].forEach(function (s, i) { tone(mtof(72 + s), 0.18, "triangle", 0.1, null, t + i * 0.05); }); },
    deny: function () { tone(200, 0.12, "square", 0.06, 150); },
    throw: function () { noise(0.2, 0.15, 800, 1, "bandpass", 2400); },
    fuse: function () { noise(0.3, 0.05, 5000, 3, "bandpass"); },
    boom: function () {
      noise(0.9, 0.9, 400, 0.5, "lowpass", 60);
      tone(80, 0.6, "sine", 0.5, 30);
      noise(0.4, 0.3, 3000, 0.7, "bandpass", 500);
    },
    rainbow: function () { const t = ctx.currentTime; [0, 3, 7, 10, 14].forEach(function (s, i) { tone(mtof(79 + s), 0.15, "sine", 0.07, null, t + i * 0.03); }); },
    diamond: function () { tone(1568, 0.3, "sine", 0.1); tone(2093, 0.4, "sine", 0.07, null, ctx.currentTime + 0.06); },
    beep: function (p) { tone(900 + (p || 0) * 700, 0.07, "sine", 0.08); },
    needle: function () { const t = ctx.currentTime; [0, 4, 7, 12, 16, 19, 24].forEach(function (s, i) { tone(mtof(67 + s), 0.4, "triangle", 0.12, null, t + i * 0.07); }); },
    win: function () { const t = ctx.currentTime; [0, 4, 7, 12, 7, 12, 16, 24].forEach(function (s, i) { tone(mtof(60 + s), 0.35, "square", 0.06, null, t + i * 0.09); tone(mtof(48 + s), 0.35, "triangle", 0.08, null, t + i * 0.09); }); },
    overheat: function () { tone(600, 0.5, "sawtooth", 0.06, 200); noise(0.6, 0.15, 3000, 1, "highpass"); },
    jump: function () { tone(300, 0.12, "sine", 0.08, 560); },
    click: function () { tone(700, 0.05, "triangle", 0.08); },
    drone: function () { tone(520, 0.1, "square", 0.03, 700); },
    gem: function () { tone(1760, 0.15, "sine", 0.08); tone(2637, 0.2, "sine", 0.05, null, ctx.currentTime + 0.05); },
    tick: function (p) { tone(1400 + (p || 0) * 600, 0.05, "square", 0.05); },
    warn: function () { const t = ctx.currentTime; tone(880, 0.1, "triangle", 0.08, null, t); tone(660, 0.14, "triangle", 0.08, null, t + 0.12); },
    fullBig: function () { const t = ctx.currentTime; tone(220, 0.22, "square", 0.08, 160, t); tone(196, 0.3, "square", 0.08, 130, t + 0.2); noise(0.2, 0.12, 400, 1, "lowpass", null, t); },
    levelup: function () { const t = ctx.currentTime; [0, 4, 7, 12, 16, 19, 24, 28].forEach(function (s, i) { tone(mtof(60 + s), 0.5, "triangle", 0.1, null, t + i * 0.08); tone(mtof(72 + s), 0.3, "sine", 0.04, null, t + i * 0.08); }); },
    unequip: function () { tone(500, 0.08, "triangle", 0.06, 300); },
    boost: function () { const t = ctx.currentTime; [0, 7, 12, 19].forEach(function (s, i) { tone(mtof(67 + s), 0.25, "sine", 0.09, null, t + i * 0.06); }); }
  };

  let streak = 0, lastCollect = -10, lastPlay = -10, quiet = false;
  function collectSound(n) {
    const now = ctx.currentTime;
    if (now - lastCollect > 0.9) { streak = 0; quiet = false; }
    lastCollect = now;
    streak += Math.min(4, Math.max(1, Math.ceil((n || 1) / 6)));
    if (streak > 170) quiet = true;
    if (quiet || now - lastPlay < 0.05) return;
    lastPlay = now;
    const pitch = 1 + Math.min(streak, 80) / 80 * 0.85;
    const vol = Math.min(0.2, 0.08 + (n || 1) * 0.004);
    noise(0.07, vol, 1800 * pitch, 1.3, "bandpass");
    tone(420 * pitch, 0.06, "triangle", 0.035);
  }

  return {
    unlock: function () {
      if (!ensure()) return;
      if (ctx.state === "suspended") ctx.resume();
      if (!timer) { timer = true; if (HH.Music) HH.Music.start({ ctx: ctx, bus: musicBus, noise: noiseBuf }, (HH.Save.data.settings || {}).track || "bop"); }
    },
    play: function (n, p) { if (!ctx || !sfxOn || muted || hidden) return; try { S[n] && S[n](p); } catch (e) {} },
    collect: function (n) { if (!ctx || !sfxOn || muted || hidden) return; try { collectSound(n); } catch (e) {} },
    vacuum: function (on, heat) {
      if (!ctx) return;
      if (on && !vacNode) {
        vacNode = ctx.createBufferSource(); vacNode.buffer = noiseBuf; vacNode.loop = true;
        vacFilter = ctx.createBiquadFilter(); vacFilter.type = "bandpass"; vacFilter.Q.value = 0.7;
        vacGain = ctx.createGain(); vacGain.gain.value = 0.0001;
        vacNode.connect(vacFilter); vacFilter.connect(vacGain); vacGain.connect(sfxBus);
        vacNode.start();
        vacGain.gain.setTargetAtTime(0.18, ctx.currentTime, 0.05);
      }
      if (vacNode && on) vacFilter.frequency.setTargetAtTime(700 + (heat || 0) * 1800, ctx.currentTime, 0.1);
      if (!on && vacNode) {
        const n = vacNode, g = vacGain;
        g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
        setTimeout(function () { try { n.stop(); } catch (e) {} }, 300);
        vacNode = null;
      }
    },
    setSfx: function (v) { sfxOn = v; apply(); },
    setMusic: function (v) { musicOn = v; apply(); },
    setMuted: function (v) { muted = v; apply(); },
    setHidden: function (v) { hidden = v; apply(); if (ctx) { if (v) ctx.suspend(); else ctx.resume(); } }
  };
})();

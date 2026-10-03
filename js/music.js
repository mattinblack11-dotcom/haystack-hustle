HH.Music = (function () {
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function midi(n) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
    if (!m) return null;
    return 12 * (parseInt(m[3], 10) + 1) + NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  }

  function parse(str) {
    const out = [];
    let t = 0;
    str.trim().split(/\s+/).forEach(function (tok) {
      const parts = tok.split(":");
      const dur = parseFloat(parts[1] || "1");
      if (parts[0] !== "R") out.push({ t: t, d: dur, n: parts[0].split("+").map(midi) });
      t += dur;
    });
    return { ev: out, len: t };
  }

  function rep(s, n) { return new Array(n).fill(s).join(" "); }

  const TRACKS = [
    {
      id: "ode", name: "Ode to Joy", by: "Beethoven (1824)", bpm: 116, unit: 2,
      voices: [
        { inst: "flute", vol: 0.5, notes: "E5:2 E5:2 F5:2 G5:2 G5:2 F5:2 E5:2 D5:2 C5:2 C5:2 D5:2 E5:2 E5:3 D5:1 D5:4 E5:2 E5:2 F5:2 G5:2 G5:2 F5:2 E5:2 D5:2 C5:2 C5:2 D5:2 E5:2 D5:3 C5:1 C5:4 D5:2 D5:2 E5:2 C5:2 D5:2 E5:1 F5:1 E5:2 C5:2 D5:2 E5:1 F5:1 E5:2 D5:2 C5:2 D5:2 G4:4 E5:2 E5:2 F5:2 G5:2 G5:2 F5:2 E5:2 D5:2 C5:2 C5:2 D5:2 E5:2 D5:3 C5:1 C5:4" },
        { inst: "strings", vol: 0.28, notes: "C3+G3+E4:8 G2+D3+B3:8 C3+G3+E4:8 G2+D3+B3:8 C3+G3+E4:8 G2+D3+B3:8 G2+D3+B3:8 C3+G3+E4:8 G2+D3+B3:8 C3+G3+E4:8 G2+D3+B3:8 G2+D3+B3:8 C3+G3+E4:8 G2+D3+B3:8 G2+D3+B3:8 C3+G3+E4:8" }
      ]
    },
    {
      id: "elise", name: "Fur Elise", by: "Beethoven (1810)", bpm: 66, unit: 4,
      voices: [
        { inst: "piano", vol: 0.55, notes: "E5:1 D#5:1 E5:1 D#5:1 E5:1 B4:1 D5:1 C5:1 A4:3 C4:1 E4:1 A4:1 B4:3 E4:1 G#4:1 B4:1 C5:3 E4:1 E5:1 D#5:1 E5:1 D#5:1 E5:1 B4:1 D5:1 C5:1 A4:3 C4:1 E4:1 A4:1 B4:3 E4:1 C5:1 B4:1 A4:6 R:2" },
        { inst: "piano", vol: 0.35, notes: "R:8 A2:6 E2:6 A2:6 R:6 A2:6 E2:6 A2:6 R:2" }
      ]
    },
    {
      id: "nacht", name: "Eine kleine Nachtmusik", by: "Mozart (1787)", bpm: 132, unit: 2,
      voices: [
        { inst: "strings", vol: 0.42, notes: "G4:2 R:1 D4:1 G4:2 R:1 D4:1 G4:1 D4:1 G4:1 B4:1 D5:2 R:2 C5:2 R:1 A4:1 C5:2 R:1 A4:1 C5:1 A4:1 F#4:1 A4:1 D4:2 R:2 G4:1 G4:1 G4:1 B4:1 A4:1 G4:1 G4:1 F#4:1 F#4:1 F#4:1 A4:1 C5:1 F#4:1 A4:1 G4:2 G4:1 G4:1 G4:1 B4:1 A4:1 G4:1 G4:1 F#4:1 F#4:2 A4:1 C5:1 F#4:1 A4:1 G4:2" },
        { inst: "pluck", vol: 0.35, notes: rep("G2:2 G3:2 D3:2 G3:2 D2:2 D3:2 A2:2 D3:2", 4) }
      ]
    },
    {
      id: "mountain", name: "In the Hall of the Mountain King", by: "Grieg (1875)", bpm: 100, unit: 2, accel: 0.18, maxAccel: 2.4,
      voices: [
        { inst: "bassoon", vol: 0.45, notes: "B3:1 C#4:1 D4:1 E4:1 F#4:1 D4:1 F#4:2 F4:1 C#4:1 F4:2 E4:1 C4:1 E4:2 B3:1 C#4:1 D4:1 E4:1 F#4:1 D4:1 F#4:1 B4:1 A4:1 F#4:1 D4:1 F#4:1 A4:4 F#4:1 G#4:1 A#4:1 B4:1 C#5:1 A#4:1 C#5:2 D5:1 A#4:1 D5:2 C#5:1 A#4:1 C#5:2 F#4:1 G#4:1 A#4:1 B4:1 C#5:1 A#4:1 C#5:2 D5:1 A#4:1 D5:2 C#5:4" },
        { inst: "pluck", vol: 0.4, notes: rep("B2:1 R:1 F#2:1 R:1", 8) + " " + rep("F#2:1 R:1 C#3:1 R:1", 8) }
      ]
    },
    {
      id: "canon", name: "Canon in D", by: "Pachelbel (c. 1680)", bpm: 64, unit: 2,
      voices: [
        { inst: "strings", vol: 0.32, notes: rep("D3:4 A2:4 B2:4 F#2:4 G2:4 D2:4 G2:4 A2:4", 3) },
        { inst: "strings", vol: 0.38, notes: "F#5:4 E5:4 D5:4 C#5:4 B4:4 A4:4 B4:4 C#5:4 D5:2 C#5:2 B4:2 A4:2 G4:2 F#4:2 G4:2 E4:2 D4:2 F#4:2 A4:2 G4:2 F#4:2 D4:2 F#4:2 E4:2 D4:1 B3:1 D4:1 A4:1 G4:1 B4:1 A4:1 G4:1 F#4:1 D4:1 F#4:1 A4:1 G4:1 B4:1 A4:1 G4:1 F#4:1 D4:1 E4:1 C#5:1 D5:1 F#5:1 A5:1 A4:1 B4:1 G4:1 A4:1 F#4:1 D4:1 D5:1 D5:2" }
      ]
    },
    {
      id: "gymno", name: "Gymnopedie No. 1", by: "Satie (1888)", bpm: 70, unit: 1,
      voices: [
        { inst: "piano", vol: 0.32, notes: rep("G2:1 B3+D4+F#4:2 D2:1 A3+C#4+F#4:2", 10) },
        { inst: "piano", vol: 0.5, notes: "R:12 R:1 F#5:1 A5:1 G5:1 F#5:1 C#5:1 B4:1 C#5:1 D5:1 A4:3 F#4:9 R:3 R:1 F#5:1 A5:1 G5:1 F#5:1 C#5:1 B4:1 C#5:1 D5:1 A4:3 C#5:3 F#5:3 E5:6" }
      ]
    },
    {
      id: "minuet", name: "Minuet in G", by: "Petzold / Bach (1725)", bpm: 120, unit: 2,
      voices: [
        { inst: "harpsi", vol: 0.42, notes: "D5:2 G4:1 A4:1 B4:1 C5:1 D5:2 G4:2 G4:2 E5:2 C5:1 D5:1 E5:1 F#5:1 G5:2 G4:2 G4:2 C5:2 D5:1 C5:1 B4:1 A4:1 B4:2 C5:1 B4:1 A4:1 G4:1 F#4:2 G4:1 A4:1 B4:1 G4:1 A4:6 D5:2 G4:1 A4:1 B4:1 C5:1 D5:2 G4:2 G4:2 E5:2 C5:1 D5:1 E5:1 F#5:1 G5:2 G4:2 G4:2 C5:2 D5:1 C5:1 B4:1 A4:1 B4:2 C5:1 B4:1 A4:1 G4:1 A4:2 B4:1 A4:1 G4:1 F#4:1 G4:6" },
        { inst: "harpsi", vol: 0.3, notes: "G3+B3:6 A3:6 B3:6 C4:6 B3:6 A3:6 B3:6 D3:6 G3+B3:6 A3:6 B3:6 C4:6 B3:6 D4:6 D3:6 G2:6" }
      ]
    },
    { id: "bop", name: "Barnyard Bop", by: "Original", gen: "bop", bpm: 118 },
    { id: "lofi", name: "Moonlit Lo-Fi", by: "Original", gen: "lofi", bpm: 78 },
    { id: "rush", name: "Hay Rush", by: "Original", gen: "rush", bpm: 140 },
    { id: "obby", name: "Obby Groove", by: "Original", gen: "obby", bpm: 128 }
  ];

  let A = null, timer = null, cur = null, idx = 0, loopStart = 0, loops = 0, flat = null, loopLen = 0, step = 0, nextT = 0, seed = 11, on = false;

  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function env(g, t, a, peak, d, sus, rel, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * sus), t + a + d);
    g.gain.setValueAtTime(Math.max(0.0002, peak * sus), end);
    g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
  }

  function voice(inst, m, t, dur, vol) {
    const ctx = A.ctx, bus = A.bus;
    const f = hz(m);
    const end = t + Math.max(0.05, dur);
    const g = ctx.createGain();
    g.connect(bus);
    const oscs = [];
    function osc(type, freq, gain, det) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; if (det) o.detune.value = det;
      const og = ctx.createGain(); og.gain.value = gain; o.connect(og); og.connect(g); oscs.push(o); return o;
    }
    let stop = end + 0.4;
    if (inst === "piano") {
      osc("triangle", f, 1); osc("sine", f * 2, 0.25); osc("sine", f * 3, 0.06);
      env(g, t, 0.005, vol, 1.4, 0.15, 0.25, end); stop = end + 0.3;
    } else if (inst === "strings") {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800; lp.connect(bus); g.disconnect(); g.connect(lp);
      osc("sawtooth", f, 0.5, -6); osc("sawtooth", f, 0.5, 6);
      env(g, t, 0.09, vol * 0.5, 0.2, 0.85, 0.25, end); stop = end + 0.3;
    } else if (inst === "flute") {
      const o = osc("sine", f, 1); osc("triangle", f * 2, 0.08);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 5; const lg = ctx.createGain(); lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(o.frequency); oscs.push(lfo);
      env(g, t, 0.05, vol, 0.1, 0.8, 0.12, end); stop = end + 0.2;
    } else if (inst === "pluck" || inst === "harpsi") {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = inst === "harpsi" ? 4200 : 1400; lp.connect(bus); g.disconnect(); g.connect(lp);
      osc(inst === "harpsi" ? "sawtooth" : "triangle", f, 1); if (inst === "harpsi") osc("square", f * 2, 0.15);
      env(g, t, 0.003, vol * (inst === "harpsi" ? 0.45 : 1), inst === "harpsi" ? 0.6 : 0.3, 0.05, 0.08, Math.min(end, t + 0.7)); stop = Math.min(end, t + 0.7) + 0.1;
    } else if (inst === "bassoon") {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = 3; lp.connect(bus); g.disconnect(); g.connect(lp);
      osc("square", f, 0.6); osc("sawtooth", f, 0.4);
      env(g, t, 0.02, vol * 0.6, 0.1, 0.7, 0.06, end); stop = end + 0.1;
    } else if (inst === "epiano") {
      osc("sine", f, 1); osc("sine", f * 2, 0.2); osc("triangle", f, 0.3);
      env(g, t, 0.02, vol, 0.8, 0.35, 0.4, end); stop = end + 0.45;
    } else if (inst === "lead") {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600; lp.connect(bus); g.disconnect(); g.connect(lp);
      osc("square", f, 0.5); osc("square", f * 1.005, 0.4);
      env(g, t, 0.005, vol * 0.5, 0.15, 0.4, 0.05, end); stop = end + 0.1;
    } else {
      osc("triangle", f, 1);
      env(g, t, 0.005, vol, 0.25, 0.3, 0.1, end); stop = end + 0.15;
    }
    oscs.forEach(function (o) { o.start(t); o.stop(stop); });
  }

  function drum(kind, t, vol) {
    const ctx = A.ctx, bus = A.bus;
    if (kind === "kick") {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.3);
      return;
    }
    const s = ctx.createBufferSource(); s.buffer = A.noise;
    const f = ctx.createBiquadFilter();
    f.type = kind === "hat" ? "highpass" : "bandpass";
    f.frequency.value = kind === "hat" ? 7000 : 1800;
    const g = ctx.createGain();
    const len = kind === "hat" ? 0.04 : 0.16;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
  }

  function buildFlat(tr) {
    const spb = 60 / tr.bpm / tr.unit;
    const evs = [];
    let len = 0;
    tr.voices.forEach(function (v) {
      const p = parse(v.notes);
      len = Math.max(len, p.len);
      p.ev.forEach(function (e) { evs.push({ t: e.t * spb, d: e.d * spb, n: e.n, inst: v.inst, vol: v.vol }); });
    });
    evs.sort(function (a, b) { return a.t - b.t; });
    return { ev: evs, len: len * spb };
  }

  const CHORDS = {
    bop: [[48, 52, 55], [53, 57, 60], [55, 59, 62], [53, 57, 60]],
    lofi: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
    rush: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 44, 47]],
    obby: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]]
  };
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];

  function genStep(tr, t) {
    const spb = 60 / tr.bpm / 2;
    const bar = Math.floor(step / 8) % 4;
    const ch = CHORDS[tr.gen][bar];
    const s8 = step % 8;
    if (tr.gen === "bop") {
      if (s8 % 2 === 0) voice("pluck", ch[0] - 12 + (s8 === 4 ? 7 : 0), t, spb * 1.5, 0.45);
      if (s8 === 0) ch.forEach(function (n) { voice("epiano", n + 12, t, spb * 7, 0.12); });
      if (rnd() < 0.5) voice("lead", 72 + PENTA[Math.floor(rnd() * PENTA.length)] + (ch[0] - 48), t, spb * 0.9, 0.12);
      if (s8 % 4 === 0) drum("kick", t, 0.5);
      if (s8 % 4 === 2) drum("hat", t, 0.08);
      if (s8 === 4) drum("snare", t, 0.15);
    } else if (tr.gen === "lofi") {
      const sw = s8 % 2 === 1 ? spb * 0.2 : 0;
      if (s8 === 0) ch.forEach(function (n) { voice("epiano", n, t, spb * 7.5, 0.13); });
      if (s8 === 0 || s8 === 5) drum("kick", t + sw, 0.45);
      if (s8 === 4) drum("snare", t + sw, 0.1);
      drum("hat", t + sw, s8 % 2 ? 0.04 : 0.06);
      if (s8 % 2 === 0 && rnd() < 0.35) voice("epiano", 72 + PENTA[Math.floor(rnd() * 6)] - 7 + (ch[0] - 48), t + sw, spb * 2, 0.14);
      if (s8 === 0) voice("pluck", ch[0] - 12, t, spb * 6, 0.3);
    } else if (tr.gen === "obby") {
      const sw = s8 % 2 === 1 ? spb * 0.12 : 0;
      if (s8 % 2 === 0) voice("pluck", ch[0] - 12 + (s8 === 6 ? 7 : 0), t, spb * 1.4, 0.4);
      if (s8 === 0 || s8 === 4) ch.forEach(function (n) { voice("epiano", n + 12, t, spb * 3.5, 0.08); });
      const mel = [0, 4, 7, 12, 7, 4, 9, 7][(step + bar) % 8];
      if (s8 !== 7 && rnd() < 0.75) voice("lead", 60 + mel + (ch[0] - 48) + 12, t + sw, spb * 0.7, 0.09);
      if (s8 === 0 || s8 === 3 || s8 === 4) drum("kick", t, 0.5);
      if (s8 === 2 || s8 === 6) drum("snare", t, 0.17);
      drum("hat", t + sw, s8 % 2 ? 0.05 : 0.08);
    } else {
      voice("pluck", ch[0] - (s8 % 2 ? 0 : 12), t, spb * 0.9, 0.35);
      voice("lead", ch[s8 % 3] + 24 + (s8 >= 4 ? 12 : 0), t, spb * 0.8, 0.1);
      if (s8 % 2 === 0) drum("kick", t, 0.55);
      drum("hat", t + spb * 0.5, 0.07);
      if (s8 === 2 || s8 === 6) drum("snare", t, 0.16);
    }
    step++;
    return spb;
  }

  function tick() {
    if (!A || !cur || !on) return;
    const now = A.ctx.currentTime;
    if (cur.gen) {
      while (nextT < now + 0.25) nextT += genStep(cur, nextT);
      return;
    }
    let k = 1;
    if (cur.accel) k = 1 / Math.min(cur.maxAccel, 1 + cur.accel * loops);
    let guard = 0;
    while (flat.ev.length && loopStart + flat.ev[idx].t * k < now + 0.3 && guard++ < 200) {
      const e = flat.ev[idx];
      const t = loopStart + e.t * k;
      if (t > now - 0.05) e.n.forEach(function (m) { voice(e.inst, m, t, e.d * k * 0.95, e.vol); });
      idx++;
      if (idx >= flat.ev.length) {
        idx = 0;
        loopStart += flat.len * k;
        loops++;
        if (cur.accel && 1 + cur.accel * loops > cur.maxAccel) loops = 0;
        k = cur.accel ? 1 / Math.min(cur.maxAccel, 1 + cur.accel * loops) : 1;
        loopStart += 0.25;
      }
    }
  }

  function play(id) {
    cur = TRACKS.find(function (t) { return t.id === id; }) || TRACKS[0];
    idx = 0; loops = 0; step = 0; seed = 11 + cur.id.length * 7;
    if (A) {
      loopStart = A.ctx.currentTime + 0.15;
      nextT = loopStart;
    }
    flat = cur.gen ? null : buildFlat(cur);
  }

  return {
    TRACKS: TRACKS,
    start: function (audio, id) {
      A = audio;
      on = true;
      play(id || (cur && cur.id) || "bop");
      if (!timer) timer = setInterval(tick, 60);
    },
    setTrack: function (id) { play(id); },
    next: function (dir) {
      const i = TRACKS.indexOf(cur || TRACKS[0]);
      const n = TRACKS[(i + (dir || 1) + TRACKS.length) % TRACKS.length];
      play(n.id);
      return n;
    },
    get current() { return cur || TRACKS[0]; }
  };
})();

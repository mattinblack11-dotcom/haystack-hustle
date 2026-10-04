HH.Voxels = (function () {
  const VS = HH.VS;
  const EMPTY = 0, HAY = 1, RAINBOW = 2, DIAMOND = 3, NEEDLE = 4, STONE = 5;
  const falls = new Map();
  const fallCols = new Map();
  const viewer = { p: new THREE.Vector3(), d: new THREE.Vector3(0, 0, -1) };
  let tuftsOn = true;
  let NX = 0, NY = 0, NZ = 0, OX = 0, OZ = 0;
  let grid = null, instIndex = null, tuftIndex = null, instType = null, filled = 0, total = 0, needleC = -1;
  let coreMat = null, tuftMat = null, coreGeo = null, tuftGeo = null;
  const CH = 20;
  let chunks = [], CX = 0, CZ = 0, sceneRef = null, tuftCap = 12000, tuftUsed = 0;
  const rainbow = new Set();
  let rainbowT = 0;
  const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  let palette = [0xf2c94c];

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function idx(i, j, k) { return (j * NZ + k) * NX + i; }
  function inb(i, j, k) { return i >= 0 && i < NX && j >= 0 && j < NY && k >= 0 && k < NZ; }
  function get(i, j, k) { return inb(i, j, k) ? grid[idx(i, j, k)] : EMPTY; }
  function mark(d, n) { if (n < d[0]) d[0] = n; if (n > d[1]) d[1] = n; }

  function strawCanvas(alpha) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    if (!alpha) { g.fillStyle = "#e9e0c8"; g.fillRect(0, 0, 128, 128); }
    const r = rng(alpha ? 7 : 99);
    const n = alpha ? 60 : 160;
    for (let q = 0; q < n; q++) {
      const x = r() * 128, y = alpha ? 128 : r() * 128, len = alpha ? 50 + r() * 70 : 20 + r() * 40;
      const a = alpha ? -Math.PI / 2 + (r() - 0.5) * 1.1 : (r() - 0.5) * 1.2;
      const shade = r();
      g.strokeStyle = shade < 0.4 ? "rgba(170,125,40,1)" : shade < 0.8 ? "rgba(255,245,210,1)" : "rgba(220,180,90,1)";
      g.lineWidth = alpha ? 2 + r() * 2 : 1.5 + r() * 2;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (r() - 0.5) * 12, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  function makeTuftGeo() {
    const s = VS * 1.7, h = VS * 1.1;
    const pos = [], uv = [], index = [];
    for (let p = 0; p < 2; p++) {
      const a = (p / 2) * Math.PI + 0.4;
      const dx = Math.cos(a) * s / 2, dz = Math.sin(a) * s / 2;
      const b = pos.length / 3;
      pos.push(-dx, VS * 0.3, -dz, dx, VS * 0.3, dz, dx, VS * 0.3 + h, dz, -dx, VS * 0.3 + h, -dz);
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      index.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0).flatMap(function () { return [0, 1, 0]; }), 3));
    g.setIndex(index);
    return g;
  }

  function cellCenter(i, j, k, out) {
    out.x = (i - OX + 0.5) * VS;
    out.y = (j + 0.5) * VS;
    out.z = (k - OZ + 0.5) * VS;
    return out;
  }

  function cellIJK(c) { return [c % NX, Math.floor(c / (NX * NZ)), Math.floor(c / NX) % NZ]; }

  function exposed(i, j, k) {
    return !get(i, j + 1, k) || !get(i + 1, j, k) || !get(i - 1, j, k) || !get(i, j, k + 1) || !get(i, j, k - 1) || (j > 0 && !get(i, j - 1, k));
  }

  function hash3(a, b, c) {
    let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  const TINTS = [new THREE.Color(0xc8d46a), new THREE.Color(0xfff0b8), new THREE.Color(0xb88a3c), new THREE.Color(0xe0b048)];
  const tmpC2 = new THREE.Color();

  function colorFor(c, t) {
    if (t === DIAMOND) return tmpC.setHex(0x8ffcff);
    if (t === RAINBOW) return tmpC.setHSL(Math.random(), 0.95, 0.62);
    const h = (c * 2654435761) >>> 0;
    if (t === STONE) {
      tmpC.setHex([0x8a8d93, 0x7a7d82, 0x9a9ca0, 0x6f7276][h % 4]);
      return tmpC;
    }
    tmpC.setHex(palette[h % palette.length]);
    const ijk = cellIJK(c);
    const patch = hash3(ijk[0] >> 3, ijk[1] >> 2, ijk[2] >> 3);
    if (patch < 0.45) {
      tmpC2.copy(TINTS[Math.floor(patch * 8.9) % TINTS.length]);
      tmpC.lerp(tmpC2, 0.18 + (patch % 0.1) * 1.5);
    }
    const v = 0.86 + ((h >>> 9) % 28) / 100;
    tmpC.r *= v; tmpC.g *= v; tmpC.b *= v;
    return tmpC;
  }

  function cellMatrix(c, i, j, k, tuftOnly, yOff) {
    const h = (c * 2246822519) >>> 0;
    cellCenter(i, j, k, tmpP);
    if (yOff) tmpP.y += yOff;
    if (tuftOnly) tmpE.set(0, ((h >>> 8) & 1023) / 1023 * Math.PI * 2, 0);
    else tmpE.set(0, ((h >>> 8) & 3) * Math.PI / 2, 0);
    tmpQ.setFromEuler(tmpE);
    const s = tuftOnly ? 1.02 + ((h >>> 26) & 15) / 100 : 1.045;
    tmpS.set(s, s, s);
    return tmpM.compose(tmpP, tmpQ, tmpS);
  }

  function chunkAt(i, k) { return chunks[Math.floor(i / CH) + Math.floor(k / CH) * CX]; }
  function chunkOf(c) { return chunkAt(c % NX, Math.floor(c / NX) % NZ); }

  function setupMesh(m, cap) {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, tmpC.setHex(0xffffff));
    m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    m.castShadow = false;
    m.receiveShadow = true;
    m.frustumCulled = true;
    return m;
  }

  function meshFor(ch, kind) {
    if (ch[kind]) return ch[kind];
    const geo = (kind === "core" ? coreGeo : tuftGeo).clone();
    geo.boundingSphere = ch.sphere.clone();
    const m = setupMesh(new THREE.InstancedMesh(geo, kind === "core" ? coreMat : tuftMat, kind === "core" ? 768 : 96), 0);
    m.count = 0;
    m.visible = false;
    ch[kind] = m;
    sceneRef.add(m);
    return m;
  }

  function grow(ch, kind) {
    const old = ch[kind], cap = old.instanceMatrix.count;
    const m = setupMesh(new THREE.InstancedMesh(old.geometry, old.material, cap * 2), 0);
    m.instanceMatrix.array.set(old.instanceMatrix.array);
    m.instanceColor.array.set(old.instanceColor.array);
    m.count = old.count;
    m.visible = old.visible;
    sceneRef.remove(old);
    old.dispose();
    sceneRef.add(m);
    ch[kind] = m;
    const d = ch.d;
    if (kind === "core") { d.cm[0] = d.cc[0] = Infinity; d.cm[1] = d.cc[1] = -1; } else { d.tm[0] = d.tc[0] = Infinity; d.tm[1] = d.tc[1] = -1; }
    return m;
  }

  function alloc(ch, kind) {
    const p = ch.p[kind];
    if (p.free.length) return p.free.pop();
    const m = meshFor(ch, kind);
    if (p.high >= m.instanceMatrix.count) grow(ch, kind);
    return p.high++;
  }

  function addCore(c, i, j, k) {
    const ch = chunkAt(i, k);
    const n = alloc(ch, "core");
    const m = ch.core;
    instIndex[c] = n;
    instType[c] = grid[c];
    const f = falls.get(c);
    m.setMatrixAt(n, cellMatrix(c, i, j, k, false, f ? f.off : 0));
    m.setColorAt(n, colorFor(c, grid[c]));
    if (grid[c] === RAINBOW) rainbow.add(c);
    mark(ch.d.cm, n); mark(ch.d.cc, n);
    ch.touched = true;
  }

  function dropCore(c) {
    const ch = chunkOf(c), n = instIndex[c];
    ch.core.setMatrixAt(n, ZERO);
    instIndex[c] = -1;
    rainbow.delete(c);
    ch.p.core.free.push(n);
    mark(ch.d.cm, n);
  }

  function addTuft(c, i, j, k) {
    if (tuftUsed >= tuftCap) return;
    const ch = chunkAt(i, k);
    const n = alloc(ch, "tuft");
    const m = ch.tuft;
    tuftIndex[c] = n;
    tuftUsed++;
    const f = falls.get(c);
    m.setMatrixAt(n, cellMatrix(c, i, j, k, true, f ? f.off : 0));
    m.setColorAt(n, colorFor(c, grid[c] === RAINBOW || grid[c] === DIAMOND ? HAY : grid[c]));
    mark(ch.d.tm, n); mark(ch.d.tc, n);
    ch.touched = true;
  }

  function dropTuft(c) {
    const ch = chunkOf(c), n = tuftIndex[c];
    ch.tuft.setMatrixAt(n, ZERO);
    tuftIndex[c] = -1;
    tuftUsed--;
    ch.p.tuft.free.push(n);
    mark(ch.d.tm, n);
  }

  function syncCounts(i0, i1, k0, k1) {
    for (let cz = Math.floor(k0 / CH); cz <= Math.floor(k1 / CH); cz++) for (let cx = Math.floor(i0 / CH); cx <= Math.floor(i1 / CH); cx++) {
      const ch = chunks[cx + cz * CX];
      if (!ch) continue;
      if (ch.core) { ch.core.count = ch.p.core.high; ch.core.visible = ch.p.core.high > ch.p.core.free.length; }
      if (ch.tuft) { ch.tuft.count = ch.p.tuft.high; ch.tuft.visible = tuftsOn && ch.p.tuft.high > ch.p.tuft.free.length; }
    }
  }

  function forcedFrom(i, k) {
    let lo = Infinity;
    for (let dk = -1; dk <= 1; dk++) for (let di = -1; di <= 1; di++) {
      const f = fallCols.get((i + di) + (k + dk) * NX);
      if (f !== undefined && f < lo) lo = f;
    }
    return lo;
  }

  function refresh(i0, i1, k0, k1) {
    i0 = Math.max(0, i0); k0 = Math.max(0, k0); i1 = Math.min(NX - 1, i1); k1 = Math.min(NZ - 1, k1);
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
      const lo = fallCols.size ? forcedFrom(i, k) : Infinity;
      for (let j = 0; j < NY; j++) {
        const c = idx(i, j, k);
        const t = grid[c];
        const wantCore = t !== EMPTY && (j >= lo || exposed(i, j, k));
        const wantTuft = t !== EMPTY && t !== STONE && !get(i, j + 1, k);
        if (t === EMPTY) falls.delete(c);
        const n = instIndex[c];
        if (n >= 0 && !wantCore) dropCore(c);
        else if (n < 0 && wantCore) addCore(c, i, j, k);
        else if (n >= 0 && instType[c] !== t) {
          const ch = chunkAt(i, k);
          instType[c] = t;
          ch.core.setColorAt(n, colorFor(c, t));
          if (t === RAINBOW) rainbow.add(c); else rainbow.delete(c);
          mark(ch.d.cc, n);
        }
        if (tuftIndex[c] >= 0 && !wantTuft) dropTuft(c);
        else if (tuftIndex[c] < 0 && wantTuft) addTuft(c, i, j, k);
      }
    }
    syncCounts(i0, i1, k0, k1);
  }

  function filledCount(tops) {
    let n = 0;
    for (let q = 0; q < tops.length; q++) n += tops[q];
    return n;
  }

  function blobTop(dx, dz, cx, cz, rad, H, r0) {
    const ex = dx - cx, ez = dz - cz;
    const d = Math.sqrt(ex * ex + ez * ez);
    const a = Math.atan2(ez, ex);
    const rr = rad * (1 + Math.sin(a * 3 + r0) * 0.05 + Math.sin(a * 7 + r0 * 2) * 0.03);
    if (d > rr) return 0;
    const x = d / rr;
    let h = H * Math.pow(1 - x * x, 0.62);
    h += Math.sin(dx * 0.45 + r0) * Math.cos(dz * 0.4 + r0) * 0.9 * (1 - x);
    return Math.min(h, (rr - d) + 1);
  }

  function layoutTops(def, r) {
    const R = def.radius, H = def.height;
    const tops = new Int16Array(NX * NZ);
    const lay = def.layout || (def.tall ? "tower" : "dome");
    const rot = r() * Math.PI * 2, cr = Math.cos(rot), sr = Math.sin(rot);
    const p0 = r() * 6.28;
    const blobs = [];
    if (lay === "dome") blobs.push([0, 0, R, H]);
    else if (lay === "twin") { blobs.push([R * 0.44, 0, R * 0.6, H * 0.92]); blobs.push([-R * 0.44, 0, R * 0.58, H * 0.88]); }
    else if (lay === "cluster") {
      blobs.push([0, 0, R * 0.48, H * 0.9]);
      for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + r() * 0.5; blobs.push([Math.cos(a) * R * 0.64, Math.sin(a) * R * 0.64, R * (0.4 + r() * 0.08), H * (0.7 + r() * 0.25)]); }
    }
    let maze = null, mc = 9;
    if (lay === "maze") {
      const m = Math.max(3, Math.floor((R * 2) / mc));
      maze = { m: m, h: [], v: [] };
      for (let q = 0; q < m * (m + 1); q++) { maze.h.push(1); maze.v.push(1); }
      const seen = new Uint8Array(m * m), stack = [0];
      seen[0] = 1;
      while (stack.length) {
        const cell = stack[stack.length - 1], cx = cell % m, cz = Math.floor(cell / m);
        const nb = [];
        if (cx > 0 && !seen[cell - 1]) nb.push([cell - 1, "v", cz * (m + 1) + cx]);
        if (cx < m - 1 && !seen[cell + 1]) nb.push([cell + 1, "v", cz * (m + 1) + cx + 1]);
        if (cz > 0 && !seen[cell - m]) nb.push([cell - m, "h", cz * m + cx]);
        if (cz < m - 1 && !seen[cell + m]) nb.push([cell + m, "h", (cz + 1) * m + cx]);
        if (!nb.length) { stack.pop(); continue; }
        const pick = nb[Math.floor(r() * nb.length)];
        maze[pick[1]][pick[2]] = 0;
        seen[pick[0]] = 1;
        stack.push(pick[0]);
      }
      maze.h[0] = 0;
      maze.h[m * m + m - 1] = 0;
    }
    for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
      const dx0 = i - OX + 0.5, dz0 = k - OZ + 0.5;
      const dx = dx0 * cr - dz0 * sr, dz = dx0 * sr + dz0 * cr;
      let h = 0;
      if (blobs.length) {
        for (let b = 0; b < blobs.length; b++) h = Math.max(h, blobTop(dx, dz, blobs[b][0], blobs[b][1], blobs[b][2], blobs[b][3], p0 + b));
      } else if (lay === "tower") {
        const d = Math.sqrt(dx * dx + dz * dz), x = d / R;
        if (x < 1) h = Math.min(H * Math.pow(1 - Math.pow(x, 3), 0.45) + Math.sin(dx * 0.45 + p0) * 0.8, (R - d) * 1.6 + 1);
      } else if (lay === "ring") {
        const d = Math.sqrt(dx * dx + dz * dz), w = R * 0.34, dr = Math.abs(d - R * 0.62) / w;
        if (dr < 1) h = Math.min(H * 0.75 * Math.pow(1 - dr * dr, 0.62), (1 - dr) * w + 1);
      } else if (lay === "wall") {
        if (Math.abs(dx) < R * 0.92) {
          for (let w = -1; w <= 1; w++) {
            const off = Math.abs(dz - w * R * 0.55), half = R * 0.13;
            if (off < half) h = Math.max(h, Math.min(H * 0.62, (half - off) * 1.4 + H * 0.35, (R * 0.92 - Math.abs(dx)) + 1));
          }
        }
      } else if (lay === "pyramid") {
        const e = Math.max(Math.abs(dx), Math.abs(dz)) / R;
        if (e < 1) h = Math.floor(H * (1 - e) / 3) * 3 + 3;
      } else if (lay === "maze" && maze) {
        const gx = dx + maze.m * mc / 2, gz = dz + maze.m * mc / 2;
        if (gx >= 0 && gz >= 0 && gx < maze.m * mc + 1 && gz < maze.m * mc + 1) {
          const cx = Math.floor(gx / mc), cz = Math.floor(gz / mc), fx = gx - cx * mc, fz = gz - cz * mc;
          let wall = false;
          if (fx < 3 && cz < maze.m && maze.v[cz * (maze.m + 1) + cx]) wall = true;
          if (fz < 3 && cx < maze.m && maze.h[cz * maze.m + cx]) wall = true;
          if (fx < 3 && fz < 3) wall = true;
          if (wall) h = Math.min(H * 0.42, 14);
        }
      }
      tops[k * NX + i] = Math.max(0, Math.min(NY - 2, Math.round(h)));
    }
    return tops;
  }

  function build(scene, mapDef, seed, opts, savedGrid) {
    falls.clear();
    chunks.forEach(function (ch) { ["core", "tuft"].forEach(function (kind) { const m = ch[kind]; if (m) { scene.remove(m); m.geometry.dispose(); m.dispose(); } }); });
    chunks = [];
    fallCols.clear();
    const R = mapDef.radius, H = mapDef.height;
    NX = NZ = R * 2 + 5;
    NY = H + 4;
    OX = OZ = Math.floor(NX / 2);
    const N = NX * NY * NZ;
    grid = new Uint8Array(N);
    instIndex = new Int32Array(N).fill(-1);
    tuftIndex = new Int32Array(N).fill(-1);
    instType = new Uint8Array(N);
    palette = mapDef.hay;
    rainbow.clear();
    needleC = -1;
    if (savedGrid && savedGrid.length === N) {
      grid.set(savedGrid);
    } else {
      const r = rng(seed);
      const tops = layoutTops(mapDef, r);
      const rainChance = 0.008 * (1 + 0.15 * (opts.lucky || 0));
      const diaChance = 0.0016 * (opts.diamondMul || 1);
      for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
        const top = tops[k * NX + i];
        for (let j = 0; j < top; j++) {
          const roll = r();
          grid[idx(i, j, k)] = roll < diaChance ? DIAMOND : roll < diaChance + rainChance ? RAINBOW : HAY;
        }
      }
      if (mapDef.stones) {
        const clumps = Math.floor(filledCount(tops) * mapDef.stones / 18);
        for (let q = 0; q < clumps; q++) {
          const i0 = Math.floor(r() * NX), k0 = Math.floor(r() * NZ);
          const top = tops[k0 * NX + i0];
          if (top < 4) continue;
          const j0 = Math.floor(r() * (top - 2));
          for (let di = 0; di < 3; di++) for (let dk = 0; dk < 3; dk++) for (let dj = 0; dj < 2; dj++) {
            const ii = i0 + di, kk = k0 + dk, jj = j0 + dj;
            if (inb(ii, jj, kk) && grid[idx(ii, jj, kk)] && r() < 0.8) grid[idx(ii, jj, kk)] = STONE;
          }
        }
      }
      const cand = [];
      let maxTop = 0;
      for (let q = 0; q < tops.length; q++) if (tops[q] > maxTop) maxTop = tops[q];
      const minTop = Math.max(4, Math.floor(maxTop * 0.28));
      for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) if (tops[k * NX + i] >= minTop) cand.push(k * NX + i);
      let placed = false;
      for (let tries = 0; tries < 60 && !placed && cand.length; tries++) {
        const col = cand[Math.floor(r() * cand.length)];
        const ci = col % NX, ck = Math.floor(col / NX), top = tops[col];
        const nj = mapDef.deep ? Math.floor(r() * Math.max(1, top * 0.35)) : Math.floor(r() * Math.max(1, top * 0.65));
        const c = idx(ci, nj, ck);
        if (grid[c] === STONE) continue;
        grid[c] = NEEDLE;
        placed = true;
      }
    }
    filled = 0;
    for (let c = 0; c < N; c++) {
      if (!grid[c]) continue;
      filled++;
      if (grid[c] === NEEDLE) needleC = c;
    }
    total = savedGrid ? Math.max(filled, opts.total || filled) : filled;
    if (!coreMat) {
      coreMat = new THREE.MeshLambertMaterial({ map: strawCanvas(false) });
      tuftMat = new THREE.MeshLambertMaterial({ map: strawCanvas(true), alphaTest: 0.5, side: THREE.DoubleSide });
      coreGeo = new THREE.BoxGeometry(VS, VS, VS);
      tuftGeo = makeTuftGeo();
    }
    sceneRef = scene;
    tuftUsed = 0;
    CX = Math.ceil(NX / CH); CZ = Math.ceil(NZ / CH);
    chunks = [];
    const hy = NY * VS / 2, half = CH * VS / 2;
    for (let cz = 0; cz < CZ; cz++) for (let cx = 0; cx < CX; cx++) {
      const center = new THREE.Vector3((cx * CH - OX) * VS + half, hy, (cz * CH - OZ) * VS + half);
      chunks.push({
        sphere: new THREE.Sphere(center, Math.sqrt(half * half * 2 + hy * hy) + VS * 3),
        core: null, tuft: null,
        p: { core: { free: [], high: 0 }, tuft: { free: [], high: 0 } },
        d: { cm: [Infinity, -1], cc: [Infinity, -1], tm: [Infinity, -1], tc: [Infinity, -1] }
      });
    }
    refresh(0, NX - 1, 0, NZ - 1);
    chunks.forEach(function (ch) {
      ["core", "tuft"].forEach(function (kind) { if (ch[kind]) { ch[kind].instanceMatrix.needsUpdate = true; ch[kind].instanceColor.needsUpdate = true; } });
      Object.keys(ch.d).forEach(function (k) { ch.d[k][0] = Infinity; ch.d[k][1] = -1; });
    });
    return null;
  }

  function visibleFrom(i, k) {
    const x = (i - OX + 0.5) * VS - viewer.p.x, z = (k - OZ + 0.5) * VS - viewer.p.z;
    const d = Math.sqrt(x * x + z * z);
    if (d > 42) return false;
    if (d < 4) return true;
    return (x * viewer.d.x + z * viewer.d.z) / d > 0.2;
  }

  function compact(i, k) {
    let w = 0;
    const animate = falls.size < 2500 && visibleFrom(i, k);
    for (let j = 0; j < NY; j++) {
      const c = idx(i, j, k);
      const t = grid[c];
      if (!t) continue;
      if (j !== w) {
        const dst = idx(i, w, k);
        grid[dst] = t;
        grid[c] = EMPTY;
        if (t === NEEDLE) needleC = dst;
        const prev = falls.get(c);
        falls.delete(c);
        if (animate) {
          const off = (j - w) * VS + (prev ? prev.off : 0);
          falls.set(dst, { off: off, start: off, v: 0, i: i, j: w, k: k });
          const col = i + k * NX, lo = Math.max(0, w - 2), was = fallCols.get(col);
          if (was === undefined || lo < was) fallCols.set(col, lo);
        }
      }
      w++;
    }
  }

  function settleCols() {
    if (!fallCols.size) return;
    const live = new Set();
    falls.forEach(function (f) { live.add(f.i + f.k * NX); });
    const done = [];
    fallCols.forEach(function (lo, col) { if (!live.has(col)) done.push(col); });
    done.forEach(function (col) {
      fallCols.delete(col);
      const i = col % NX, k = Math.floor(col / NX);
      refresh(i - 1, i + 1, k - 1, k + 1);
    });
  }

  function updateFalls(dt) {
    if (!falls.size) { settleCols(); return; }
    falls.forEach(function (f, c) {
      f.v += 34 * dt;
      f.off -= f.v * dt;
      if (f.off <= 0 || grid[c] === EMPTY) {
        f.off = 0;
        falls.delete(c);
      }
      const n = instIndex[c];
      const fch = chunkAt(f.i, f.k);
      if (n >= 0) { fch.core.setMatrixAt(n, cellMatrix(c, f.i, f.j, f.k, false, f.off)); mark(fch.d.cm, n); }
      const tn = tuftIndex[c];
      if (tn >= 0) { fch.tuft.setMatrixAt(tn, cellMatrix(c, f.i, f.j, f.k, true, f.off)); mark(fch.d.tm, tn); }
    });
    settleCols();
  }

  function removeCells(cells) {
    const res = { hay: 0, rainbow: 0, diamond: 0, needle: null, points: [] };
    let i0 = 1e9, i1 = -1, k0 = 1e9, k1 = -1;
    const cols = new Set();
    for (let q = 0; q < cells.length; q++) {
      const c = cells[q];
      const t = grid[c];
      if (!t) continue;
      const ijk = cellIJK(c);
      const p = cellCenter(ijk[0], ijk[1], ijk[2], new THREE.Vector3());
      if (t === HAY) res.hay++;
      else if (t === RAINBOW) res.rainbow++;
      else if (t === DIAMOND) res.diamond++;
      else if (t === NEEDLE) { res.hay++; res.needle = p.clone(); needleC = -1; }
      else if (t === STONE) res.stone = (res.stone || 0) + 1;
      if (res.points.length < 60) res.points.push({ p: p, t: t });
      grid[c] = EMPTY;
      filled--;
      cols.add(ijk[0] + ijk[2] * NX);
      if (ijk[0] < i0) i0 = ijk[0];
      if (ijk[0] > i1) i1 = ijk[0];
      if (ijk[2] < k0) k0 = ijk[2];
      if (ijk[2] > k1) k1 = ijk[2];
    }
    cols.forEach(function (key) { compact(key % NX, Math.floor(key / NX)); });
    if (i1 >= 0) refresh(i0 - 2, i1 + 2, k0 - 2, k1 + 2);
    return res;
  }

  function worldToCell(x, y, z) { return [Math.floor(x / VS + OX), Math.floor(y / VS), Math.floor(z / VS + OZ)]; }

  function solidAt(x, y, z) { const c = worldToCell(x, y, z); return get(c[0], c[1], c[2]) !== EMPTY; }

  function boxHits(minX, minY, minZ, maxX, maxY, maxZ) {
    const a = worldToCell(minX + 1e-4, minY + 1e-4, minZ + 1e-4), b = worldToCell(maxX - 1e-4, maxY - 1e-4, maxZ - 1e-4);
    for (let j = Math.min(NY - 1, b[1]); j >= Math.max(0, a[1]); j--)
      for (let k = Math.max(0, a[2]); k <= Math.min(NZ - 1, b[2]); k++)
        for (let i = Math.max(0, a[0]); i <= Math.min(NX - 1, b[0]); i++)
          if (grid[idx(i, j, k)]) return { i: i, j: j, k: k };
    return null;
  }

  function topAt(x, z) {
    const c = worldToCell(x, 0, z);
    if (c[0] < 0 || c[0] >= NX || c[2] < 0 || c[2] >= NZ) return 0;
    for (let j = NY - 1; j >= 0; j--) if (grid[idx(c[0], j, c[2])]) return (j + 1) * VS;
    return 0;
  }

  function raycast(o, d, maxDist) {
    const x = o.x / VS + OX, y = o.y / VS, z = o.z / VS + OZ;
    let i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
    const si = d.x > 0 ? 1 : -1, sj = d.y > 0 ? 1 : -1, sk = d.z > 0 ? 1 : -1;
    const tdx = Math.abs(1 / (d.x || 1e-9)), tdy = Math.abs(1 / (d.y || 1e-9)), tdz = Math.abs(1 / (d.z || 1e-9));
    let tmx = (si > 0 ? (i + 1 - x) : (x - i)) * tdx;
    let tmy = (sj > 0 ? (j + 1 - y) : (y - j)) * tdy;
    let tmz = (sk > 0 ? (k + 1 - z) : (z - k)) * tdz;
    const maxT = maxDist / VS;
    let t = 0, guard = 0;
    while (t <= maxT && guard++ < 2000) {
      if (inb(i, j, k) && grid[idx(i, j, k)]) {
        const dist = t * VS;
        return { cell: idx(i, j, k), i: i, j: j, k: k, dist: dist, point: new THREE.Vector3(o.x + d.x * dist, o.y + d.y * dist, o.z + d.z * dist) };
      }
      if (tmx < tmy && tmx < tmz) { i += si; t = tmx; tmx += tdx; }
      else if (tmy < tmz) { j += sj; t = tmy; tmy += tdy; }
      else { k += sk; t = tmz; tmz += tdz; }
      if (j < -1 && sj < 0) break;
    }
    return null;
  }

  function nearest(point, radius, limit, allowStone) {
    const r = radius / VS;
    const cx = point.x / VS + OX, cy = point.y / VS, cz = point.z / VS + OZ;
    const out = [];
    for (let j = Math.max(0, Math.floor(cy - r)); j <= Math.min(NY - 1, Math.floor(cy + r)); j++)
      for (let k = Math.max(0, Math.floor(cz - r)); k <= Math.min(NZ - 1, Math.floor(cz + r)); k++)
        for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(NX - 1, Math.floor(cx + r)); i++) {
          const c = idx(i, j, k);
          if (!grid[c] || (grid[c] === STONE && !allowStone)) continue;
          const dx = i + 0.5 - cx, dy = j + 0.5 - cy, dz = k + 0.5 - cz;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 <= r * r) out.push({ c: c, d: d2, t: grid[c] });
        }
    out.sort(function (a, b) { return a.d - b.d; });
    return limit ? out.slice(0, limit) : out;
  }

  function hideNeedle() {
    let maxTop = 0;
    const tops = new Int16Array(NX * NZ);
    for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
      let t = 0;
      for (let j = NY - 1; j >= 0; j--) if (grid[idx(i, j, k)]) { t = j + 1; break; }
      tops[k * NX + i] = t;
      if (t > maxTop) maxTop = t;
    }
    for (let tries = 0; tries < 400; tries++) {
      const i = Math.floor(Math.random() * NX), k = Math.floor(Math.random() * NZ), top = tops[k * NX + i];
      if (top < Math.max(3, maxTop * (tries < 300 ? 0.28 : 0.1))) continue;
      const j = Math.floor(Math.random() * Math.max(1, top * 0.6));
      const c = idx(i, j, k);
      if (grid[c] !== HAY) continue;
      grid[c] = NEEDLE;
      needleC = c;
      return true;
    }
    return false;
  }

  function needlePos() {
    if (needleC < 0 || grid[needleC] !== NEEDLE) return null;
    const ijk = cellIJK(needleC);
    return cellCenter(ijk[0], ijk[1], ijk[2], new THREE.Vector3());
  }

  function randomSurface(r) {
    for (let tries = 0; tries < 40; tries++) {
      const i = Math.floor(r() * NX), k = Math.floor(r() * NZ);
      for (let j = NY - 1; j >= 0; j--) {
        const c = idx(i, j, k);
        if (grid[c]) return { c: c, p: cellCenter(i, j, k, new THREE.Vector3()) };
      }
    }
    return null;
  }

  function encode() {
    const parts = [];
    let s = "", n = 0;
    while (n < grid.length) {
      const v = grid[n];
      let run = 1;
      while (n + run < grid.length && grid[n + run] === v && run < 255) run++;
      s += String.fromCharCode(v, run);
      if (s.length > 8192) { parts.push(s); s = ""; }
      n += run;
    }
    parts.push(s);
    return btoa(parts.join(""));
  }

  function decode(str, size) {
    try {
      const s = atob(str);
      const g = new Uint8Array(size);
      let p = 0;
      for (let q = 0; q + 1 < s.length; q += 2) {
        const v = s.charCodeAt(q), run = s.charCodeAt(q + 1);
        for (let r = 0; r < run && p < size; r++) g[p++] = v;
      }
      return p === size ? g : null;
    } catch (e) { return null; }
  }

  function sizeFor(mapDef) { const nx = mapDef.radius * 2 + 5; return nx * nx * (mapDef.height + 4); }

  function flush(attr, d, stride) {
    if (d[1] < d[0]) return;
    attr.updateRange.offset = d[0] * stride;
    attr.updateRange.count = (d[1] - d[0] + 1) * stride;
    attr.needsUpdate = true;
    d[0] = Infinity; d[1] = -1;
  }

  function update(time, dt) {
    if (!chunks.length) return;
    updateFalls(Math.min(dt || 0.016, 0.05));
    rainbowT -= dt || 0.016;
    if (rainbowT <= 0 && rainbow.size) {
      rainbowT = 0.12;
      let q = 0;
      rainbow.forEach(function (c) {
        const n = instIndex[c];
        if (n < 0) return;
        const ch = chunkOf(c);
        ch.core.setColorAt(n, tmpC.setHSL((time * 0.4 + q * 0.13) % 1, 0.95, 0.62));
        mark(ch.d.cc, n);
        q++;
      });
    }
    for (let q = 0; q < chunks.length; q++) {
      const ch = chunks[q];
      if (ch.core) { flush(ch.core.instanceMatrix, ch.d.cm, 16); flush(ch.core.instanceColor, ch.d.cc, 3); }
      if (ch.tuft) { flush(ch.tuft.instanceMatrix, ch.d.tm, 16); flush(ch.tuft.instanceColor, ch.d.tc, 3); }
    }
  }

  return {
    EMPTY: EMPTY, HAY: HAY, RAINBOW: RAINBOW, DIAMOND: DIAMOND, NEEDLE: NEEDLE, STONE: STONE,
    setTufts: function (on) { tuftsOn = on; chunks.forEach(function (ch) { if (ch.tuft) ch.tuft.visible = on && ch.p.tuft.high > ch.p.tuft.free.length; }); },
    setViewer: function (p, d) { viewer.p.copy(p); viewer.d.set(d.x, 0, d.z).normalize(); },
    get gridSize() { return grid ? grid.length : 0; },
    build: build, removeCells: removeCells, raycast: raycast, nearest: nearest,
    solidAt: solidAt, boxHits: boxHits, topAt: topAt, needlePos: needlePos, hideNeedle: hideNeedle,
    fallingAt: function (x, z) { if (!fallCols.size) return false; const c = worldToCell(x, 0, z); return forcedFrom(c[0], c[2]) !== Infinity; }, randomSurface: randomSurface,
    encode: encode, decode: decode, sizeFor: sizeFor, update: update,
    get remaining() { return filled; },
    get total() { return total; },
    get extent() { return (NX / 2) * VS; },
    get height() { return NY * VS; }
  };
})();

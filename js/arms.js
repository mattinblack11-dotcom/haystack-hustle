HH.Arms = (function () {
  const V3 = THREE.Vector3, Q = THREE.Quaternion;
  const FING = ["index", "middle", "ring", "pinky"];

  function buf(b64) {
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }

  function orth(v, axis) { return v.clone().sub(axis.clone().multiplyScalar(v.dot(axis))).normalize(); }

  function create(opt) {
    opt = opt || {};
    const obj = new THREE.FBXLoader().parse(buf(HH.ARMS_FBX), "");
    const img = new Image();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshLambertMaterial({ map: tex, skinning: true });
    let look = { skin: null, sleeve: null, glove: null };
    function paint() {
      if (!img.complete || !img.naturalWidth) return;
      const c = canvas.getContext("2d");
      c.globalCompositeOperation = "source-over";
      c.drawImage(img, 0, 0, 512, 512);
      if (look.skin) {
        c.globalCompositeOperation = "multiply";
        c.fillStyle = look.skin;
        c.fillRect(0, 0, 512, 512);
      }
      if (look.sleeve) {
        c.globalCompositeOperation = "source-atop";
        c.fillStyle = look.sleeve;
        c.fillRect(0, 0, 512, look.cuff || 175);
        c.globalCompositeOperation = "multiply";
        c.fillStyle = "rgba(0,0,0,0.25)";
        c.fillRect(0, (look.cuff || 175) - 10, 512, 10);
      }
      if (look.glove) {
        c.globalCompositeOperation = "source-atop";
        c.fillStyle = look.glove;
        c.fillRect(0, 240, 512, 272);
      }
      c.globalCompositeOperation = "source-over";
      tex.needsUpdate = true;
    }
    img.onload = paint;
    img.src = HH.ARMS_TEX;
    obj.traverse(function (o) { if (o.isMesh) { o.material = mat; o.frustumCulled = false; } });
    const B = {};
    obj.traverse(function (o) { if (o.isBone) B[o.name] = o; });
    const rest = [];
    Object.keys(B).forEach(function (k) { rest.push([B[k], B[k].position.clone(), B[k].quaternion.clone()]); });
    const root = new THREE.Group();
    root.add(obj);
    const off = opt.offset || new V3(0, -0.26, -0.2);
    const sc = opt.scale || 1.1;
    obj.scale.setScalar(sc);
    obj.position.copy(off);

    const inv = new THREE.Matrix4(), objQi = new Q();
    const _a = new V3(), _b = new V3(), _q = new Q(), _s = new V3();
    function upd() {
      root.updateMatrixWorld(true);
      inv.copy(obj.matrixWorld).invert();
      obj.matrixWorld.decompose(_a, objQi, _s);
      objQi.invert();
    }
    function P(b, out) { return out.setFromMatrixPosition(b.matrixWorld).applyMatrix4(inv); }
    function WQ(b, out) { b.matrixWorld.decompose(_a, out, _s); return out.premultiply(objQi); }
    function setWQ(b, q) {
      const pq = WQ(b.parent, new Q()).invert();
      b.quaternion.copy(pq.multiply(q));
      b.updateMatrixWorld(true);
    }
    function aim(bone, child, target) {
      const p = P(bone, new V3());
      const cur = P(child, new V3()).sub(p).normalize();
      const want = target.clone().sub(p).normalize();
      const qd = new Q().setFromUnitVectors(cur, want);
      setWQ(bone, WQ(bone, new Q()).premultiply(qd));
    }
    function reset() { rest.forEach(function (r) { r[0].position.copy(r[1]); r[0].quaternion.copy(r[2]); }); }

    reset();
    upd();
    const frame = {};
    ["R", "L"].forEach(function (S) {
      const W = P(B["hand" + S], new V3());
      const K = P(B["f_middle01" + S], new V3());
      const tip = P(B["f_middle03" + S + "_end"], new V3());
      const f = K.clone().sub(W);
      const len = f.length();
      f.normalize();
      const g = orth(P(B["f_index01" + S], new V3()).sub(P(B["f_pinky01" + S], new V3())), f);
      const n = new V3().crossVectors(f, g);
      const dev = orth(tip.clone().sub(K), f);
      const sign = dev.dot(n) >= 0 ? 1 : -1;
      const A = P(B["upper_arm" + S], new V3()), E = P(B["forearm" + S], new V3()), C = P(B["forearm" + S + "_end"], new V3());
      frame[S] = {
        M: new THREE.Matrix4().makeBasis(f, g, n), sign: sign, len: len,
        q: WQ(B["hand" + S], new Q()),
        a: E.distanceTo(A), b: C.distanceTo(E),
        thumb: ["thumb01", "thumb02", "thumb03"].map(function (t) { return B[t + S]; }),
        fingers: FING.map(function (fn) { return [1, 2, 3].map(function (k) { return B["f_" + fn + "0" + k + S]; }); })
      };
    });

    function solveSide(S, spec) {
      const fr = frame[S];
      const s = spec.s.clone().normalize();
      const fp = orth(spec.f, s);
      const np = new V3().crossVectors(fp, s);
      const palm = np.clone().multiplyScalar(fr.sign);
      const R = new THREE.Matrix4().makeBasis(fp, s, np).multiply(fr.M.clone().transpose());
      const hq = new Q().setFromRotationMatrix(R).multiply(fr.q);
      const reach = spec.reach === undefined ? 0.9 : spec.reach;
      const lift = spec.lift === undefined ? 0.032 : spec.lift;
      const want = spec.p.clone().sub(fp.clone().multiplyScalar(fr.len * reach)).sub(palm.clone().multiplyScalar(lift));
      const up = B["upper_arm" + S], fo = B["forearm" + S], end = B["forearm" + S + "_end"];
      const A = P(up, new V3());
      const d0 = want.distanceTo(A);
      const dir = want.clone().sub(A).normalize();
      const d = Math.max(0.08, Math.min(fr.a + fr.b - 0.002, d0));
      const T = A.clone().add(dir.clone().multiplyScalar(d));
      const x = (fr.a * fr.a - fr.b * fr.b + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(0, fr.a * fr.a - x * x));
      const pole = spec.pole || new V3(S === "R" ? 0.7 : -0.7, -1, 0.35);
      const perp = orth(pole.clone(), dir);
      const Eb = A.clone().add(dir.clone().multiplyScalar(x)).add(perp.multiplyScalar(h));
      aim(up, fo, Eb);
      aim(fo, end, T);
      const hb = B["hand" + S];
      const twist = spec.twist || 0;
      if (twist) {
        const ax = T.clone().sub(Eb).normalize();
        setWQ(fo, WQ(fo, new Q()).premultiply(new Q().setFromAxisAngle(ax, twist)));
      }
      const wp = T.clone().applyMatrix4(obj.matrixWorld);
      hb.parent.worldToLocal(wp);
      hb.position.copy(wp);
      hb.updateMatrixWorld(true);
      setWQ(hb, hq);
      const axis = new V3().crossVectors(fp, palm).normalize();
      const c = spec.curl === undefined ? 1 : spec.curl;
      const ang = [1.15 * c, 1.45 * c, 0.95 * c];
      fr.fingers.forEach(function (ch, fi) {
        const extra = fi * (spec.fan || 0.06) * c;
        ch.forEach(function (bone, k) {
          setWQ(bone, WQ(bone, new Q()).premultiply(new Q().setFromAxisAngle(axis, ang[k] + (k === 0 ? extra : 0))));
        });
      });
      const tc = spec.thumb === undefined ? c : spec.thumb;
      if (tc) {
        const tb = fr.thumb;
        const taxis = new V3().crossVectors(s, palm).normalize();
        setWQ(tb[0], WQ(tb[0], new Q()).premultiply(new Q().setFromAxisAngle(palm.clone().cross(fp).normalize(), -0.35 * tc)));
        setWQ(tb[1], WQ(tb[1], new Q()).premultiply(new Q().setFromAxisAngle(taxis, 0.5 * tc)));
        setWQ(tb[2], WQ(tb[2], new Q()).premultiply(new Q().setFromAxisAngle(taxis, 0.6 * tc)));
      }
      return { wrist: T.clone().multiplyScalar(sc).add(obj.position), reached: d0 <= fr.a + fr.b };
    }

    function pose(spec) {
      reset();
      upd();
      const out = {};
      ["R", "L"].forEach(function (S) {
        if (!spec[S]) return;
        const sp = Object.assign({}, spec[S]);
        sp.p = spec[S].p.clone().sub(obj.position).divideScalar(sc);
        out[S] = solveSide(S, sp);
      });
      return out;
    }

    return {
      root: root, bones: B, pose: pose,
      setLook: function (l) { look = Object.assign({}, look, l); paint(); }
    };
  }

  return { create: create };
})();

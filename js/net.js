HH.Net = (function () {
  const handlers = {};
  const players = new Map();
  let mode = "off", myId = null, roomId = null, joinedAt = 0, masterId = null;
  let bc = null, lsKey = null, hbT = 0, pc = null, seen = new Set(), chunks = {};
  let myName = "";

  function emit(t, d, from) {
    const list = handlers[t];
    if (list) list.forEach(function (fn) { try { fn(d, from); } catch (e) { console.warn("net handler", t, e); } });
  }

  function randId(n) {
    const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let q = 0; q < n; q++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }

  function electMaster() {
    if (mode === "photon" && pc) {
      const m = pc.myRoomMasterActorNr();
      masterId = m;
      return;
    }
    let best = { id: myId, at: joinedAt };
    players.forEach(function (p) {
      if (p.at < best.at || (p.at === best.at && String(p.id) < String(best.id))) best = { id: p.id, at: p.at };
    });
    const changed = masterId !== best.id;
    masterId = best.id;
    if (changed) emit("master", { id: masterId });
  }

  function deliver(msg) {
    if (!msg || msg.f === myId) return;
    if (msg.n) { if (seen.has(msg.n)) return; seen.add(msg.n); if (seen.size > 4000) seen = new Set(); }
    if (msg.to !== undefined && msg.to !== "all" && msg.to !== "others" && String(msg.to) !== String(myId) && !(msg.to === "master" && isMaster())) return;
    if (msg.t === "_chunk") {
      const c = chunks[msg.d.id] || (chunks[msg.d.id] = { parts: [], got: 0 });
      if (!c.parts[msg.d.i]) { c.parts[msg.d.i] = msg.d.s; c.got++; }
      if (c.got === msg.d.n) {
        delete chunks[msg.d.id];
        let inner = null;
        try { inner = JSON.parse(c.parts.join("")); } catch (e) { return; }
        inner.f = msg.f;
        deliver(inner);
      }
      return;
    }
    if (mode === "local") {
      const p = players.get(msg.f);
      if (msg.t === "_hi" || msg.t === "_hb") {
        const isNew = !p;
        players.set(msg.f, { id: msg.f, at: msg.d.at, name: msg.d.name, last: performance.now(), state: p ? p.state : null });
        if (isNew) { electMaster(); emit("join", { id: msg.f, name: msg.d.name }); if (msg.t === "_hi") rawSend({ t: "_hb", d: { at: joinedAt, name: myName } }); }
        return;
      }
      if (msg.t === "_bye") { removePlayer(msg.f); return; }
      if (p) p.last = performance.now();
    }
    emit(msg.t, msg.d, msg.f);
  }

  function removePlayer(id) {
    if (!players.has(id)) return;
    const p = players.get(id);
    players.delete(id);
    electMaster();
    emit("leave", { id: id, name: p.name });
  }

  function rawSend(msg) {
    msg.f = myId;
    msg.n = myId + ":" + Math.random().toString(36).slice(2, 10);
    const s = JSON.stringify(msg);
    if (mode === "local") {
      if (bc) { try { bc.postMessage(s); } catch (e) {} }
      try { localStorage.setItem(lsKey, s); localStorage.removeItem(lsKey); } catch (e) {}
    } else if (mode === "photon" && pc) {
      const RG = Photon.LoadBalancing.Constants.ReceiverGroup;
      const opts = {};
      if (msg.to === "master" && isMaster()) return;
      if (String(msg.to) === String(myId)) return;
      if (msg.to === "master") opts.receivers = RG.MasterClient;
      else if (msg.to === "all") opts.receivers = RG.Others;
      else if (msg.to !== undefined && msg.to !== "others") opts.targetActors = [msg.to];
      else opts.receivers = RG.Others;
      try { pc.raiseEvent(1, msg, opts); } catch (e) { console.warn("photon send", e); }
    }
  }

  function send(t, d, to) {
    const msg = { t: t, d: d, to: to === undefined ? "others" : to };
    const s = JSON.stringify(d || null);
    if (s.length > 90000) {
      const id = randId(8), n = Math.ceil(s.length / 90000);
      const full = JSON.stringify({ t: t, d: d, to: msg.to });
      const per = Math.ceil(full.length / n);
      for (let q = 0; q < n; q++) rawSend({ t: "_chunk", d: { id: id, i: q, n: n, s: full.slice(q * per, (q + 1) * per) }, to: msg.to });
    } else rawSend(msg);
    if (msg.to === "all" || (msg.to === "master" && isMaster()) || String(msg.to) === String(myId)) emit(t, d, myId);
  }

  function isMaster() {
    if (mode === "off") return true;
    return String(masterId) === String(myId);
  }

  function startLocal(room) {
    mode = "local";
    myId = randId(6);
    roomId = room;
    joinedAt = Date.now();
    lsKey = "hhnet-" + room;
    try { bc = new BroadcastChannel("hhnet-" + room); bc.onmessage = function (e) { try { deliver(JSON.parse(e.data)); } catch (er) {} }; } catch (e) { bc = null; }
    window.addEventListener("storage", onStorage);
    masterId = myId;
    rawSend({ t: "_hi", d: { at: joinedAt, name: myName } });
    setTimeout(function () { electMaster(); emit("connected", { id: myId, room: room, mode: mode, master: isMaster() }); }, 600);
  }

  function onStorage(e) {
    if (e.key !== lsKey || !e.newValue) return;
    try { deliver(JSON.parse(e.newValue)); } catch (er) {}
  }

  function startPhoton(room) {
    const LBC = Photon.LoadBalancing.LoadBalancingClient;
    mode = "photon";
    roomId = room;
    pc = new LBC(Photon.ConnectionProtocol.Wss, HH.CONFIG.photonAppId, HH.CONFIG.photonVersion || "1.0");
    let requested = false;
    pc.onStateChange = function (state) {
      if ((state === LBC.State.JoinedLobby || state === LBC.State.ConnectedToMaster) && !requested) {
        requested = true;
        pc.joinRoom(room, { createIfNotExists: true }, { maxPlayers: HH.CONFIG.maxPlayers || 8, emptyRoomLiveTime: 30000 });
      }
      if (state === LBC.State.Disconnected && mode === "photon") emit("disconnected", {});
    };
    pc.onError = function (code, msg) { emit("error", { code: code, msg: msg }); };
    pc.onJoinRoom = function () {
      myId = pc.myActor().actorNr;
      joinedAt = Date.now();
      const actors = pc.myRoomActors();
      Object.keys(actors).forEach(function (k) {
        const a = actors[k];
        if (a.actorNr !== myId) players.set(a.actorNr, { id: a.actorNr, at: 0, name: "Player " + a.actorNr, last: performance.now(), state: null });
      });
      electMaster();
      emit("connected", { id: myId, room: room, mode: mode, master: isMaster() });
      rawSend({ t: "_name", d: { name: myName } });
    };
    pc.onActorJoin = function (actor) {
      if (actor.actorNr === myId) return;
      players.set(actor.actorNr, { id: actor.actorNr, at: 0, name: "Player " + actor.actorNr, last: performance.now(), state: null });
      electMaster();
      emit("join", { id: actor.actorNr, name: "Player " + actor.actorNr });
      rawSend({ t: "_name", d: { name: myName }, to: actor.actorNr });
    };
    pc.onActorLeave = function (actor) {
      removePlayer(actor.actorNr);
      electMaster();
      emit("master", { id: masterId });
    };
    pc.onEvent = function (code, content, actorNr) {
      if (code !== 1 || !content) return;
      content.f = actorNr;
      if (content.t === "_name") {
        const p = players.get(actorNr);
        if (p) { p.name = content.d.name; emit("rename", { id: actorNr, name: p.name }); }
        return;
      }
      deliver(content);
    };
    pc.connectToRegionMaster(HH.CONFIG.photonRegion || "us");
  }

  return {
    PHOTON_READY: function () { return !!(window.Photon && HH.CONFIG.photonAppId); },
    connect: function (room, name) {
      if (mode !== "off") this.leave();
      myName = name || ("Farmer" + Math.floor(Math.random() * 900 + 100));
      players.clear();
      seen = new Set();
      chunks = {};
      if (HH.CONFIG.photonAppId && !window.Photon) {
        const s = document.createElement("script");
        s.src = "lib/Photon-Javascript_SDK.min.js";
        s.onload = function () { if (window.Photon) startPhoton(room); else startLocal(room); };
        s.onerror = function () { emit("error", { msg: "Photon SDK file missing (lib/Photon-Javascript_SDK.min.js). Using local mode." }); startLocal(room); };
        document.head.appendChild(s);
        return;
      }
      if (this.PHOTON_READY()) startPhoton(room);
      else startLocal(room);
    },
    leave: function () {
      if (mode === "local") {
        rawSend({ t: "_bye", d: {} });
        if (bc) { try { bc.close(); } catch (e) {} bc = null; }
        window.removeEventListener("storage", onStorage);
      } else if (mode === "photon" && pc) {
        try { pc.leaveRoom(); pc.disconnect(); } catch (e) {}
        pc = null;
      }
      mode = "off"; myId = null; roomId = null; masterId = null;
      players.clear();
      emit("left", {});
    },
    send: send,
    on: function (t, fn) { (handlers[t] = handlers[t] || []).push(fn); },
    tick: function (dt) {
      if (mode !== "local") return;
      hbT -= dt;
      if (hbT <= 0) {
        hbT = 1;
        rawSend({ t: "_hb", d: { at: joinedAt, name: myName } });
        const now = performance.now();
        players.forEach(function (p, id) { if (now - p.last > 5000) removePlayer(id); });
      }
    },
    newRoomCode: function () { return randId(6); },
    get active() { return mode !== "off"; },
    get mode() { return mode; },
    get id() { return myId; },
    get room() { return roomId; },
    get name() { return myName; },
    get master() { return masterId; },
    get players() { return players; },
    get isMaster() { return isMaster(); },
    playerName: function (id) { if (String(id) === String(myId)) return myName; const p = players.get(id) || players.get(Number(id)) || players.get(String(id)); return p ? p.name : "Player"; }
  };
})();

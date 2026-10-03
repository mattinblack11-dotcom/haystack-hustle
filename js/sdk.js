HH.CONFIG = {
  sdkUrl: "https://sdk.crazygames.com/crazygames-sdk-v3.js",
  useSdk: true,
  adsEnabled: false,
  rewardedEnabled: true,
  rewardedTestMode: true,
  photonAppId: "",
  photonVersion: "1.0",
  photonRegion: "us",
  maxPlayers: 6,
  saveKey: "haystack-hustle-v1"
};

HH.Platform = (function () {
  let sdk = null, ready = false, inGameplay = false, muteListener = null;

  function isLocal() {
    const h = location.hostname;
    return location.protocol === "file:" || h === "localhost" || h === "127.0.0.1" || h === "";
  }

  function loadScript(url, ms) {
    return new Promise(function (resolve) {
      const s = document.createElement("script");
      let done = false;
      const fin = function (ok) { if (!done) { done = true; resolve(ok); } };
      s.src = url; s.async = true;
      s.onload = function () { fin(true); };
      s.onerror = function () { fin(false); };
      setTimeout(function () { fin(false); }, ms);
      document.head.appendChild(s);
    });
  }

  function call(fn) { if (ready && sdk) { try { fn(sdk); } catch (e) {} } }

  return {
    init: async function () {
      if (!HH.CONFIG.useSdk || isLocal()) return false;
      const ok = await loadScript(HH.CONFIG.sdkUrl, 4000);
      if (!ok || !window.CrazyGames || !window.CrazyGames.SDK) return false;
      try {
        await window.CrazyGames.SDK.init();
        sdk = window.CrazyGames.SDK;
        ready = sdk.environment !== "disabled";
        if (ready && sdk.game.addSettingsChangeListener) {
          sdk.game.addSettingsChangeListener(function (s) { if (muteListener && s) muteListener(!!s.muteAudio); });
        }
      } catch (e) { sdk = null; ready = false; }
      return ready;
    },
    loadingStart: function () { call(function (s) { s.game.loadingStart(); }); },
    loadingStop: function () { call(function (s) { s.game.loadingStop(); }); },
    gameplayStart: function () { if (inGameplay) return; inGameplay = true; call(function (s) { s.game.gameplayStart(); }); },
    gameplayStop: function () { if (!inGameplay) return; inGameplay = false; call(function (s) { s.game.gameplayStop(); }); },
    happytime: function () { call(function (s) { s.game.happytime(); }); },
    isMuted: function () { return !!(ready && sdk && sdk.game.settings && sdk.game.settings.muteAudio); },
    onMuteChange: function (fn) { muteListener = fn; },
    rewardedAd: function (hooks) {
      if (!HH.CONFIG.rewardedEnabled) { hooks.error("Rewards are turned off."); return; }
      if (!ready || !sdk) {
        if (HH.CONFIG.rewardedTestMode) { hooks.pause(); setTimeout(function () { hooks.resume(); hooks.reward(true); }, 600); }
        else hooks.error("Ads aren't available right now.");
        return;
      }
      let fin = false;
      try {
        sdk.ad.requestAd("rewarded", {
          adStarted: function () { hooks.pause(); },
          adFinished: function () { if (fin) return; fin = true; hooks.resume(); hooks.reward(false); },
          adError: function (err) { if (fin) return; fin = true; hooks.resume(); hooks.error("No ad available right now. Try again later!"); }
        });
      } catch (e) { hooks.resume(); hooks.error("No ad available right now."); }
    },
    inviteLink: function (roomId) {
      if (ready && sdk && sdk.game.inviteLink) { try { return sdk.game.inviteLink({ roomId: roomId }); } catch (e) {} }
      const u = new URL(location.href);
      u.searchParams.set("room", roomId);
      return u.toString();
    },
    showInvite: function (roomId) {
      if (ready && sdk && sdk.game.showInviteButton) { try { sdk.game.showInviteButton({ roomId: roomId }); } catch (e) {} }
    },
    hideInvite: function () {
      if (ready && sdk && sdk.game.hideInviteButton) { try { sdk.game.hideInviteButton(); } catch (e) {} }
    },
    inviteRoom: function () {
      if (ready && sdk && sdk.game.getInviteParam) { try { const r = sdk.game.getInviteParam("roomId"); if (r) return String(r); } catch (e) {} }
      try { return new URL(location.href).searchParams.get("room"); } catch (e) { return null; }
    },
    username: function () {
      return new Promise(function (resolve) {
        if (!ready || !sdk || !sdk.user || !sdk.user.getUser) { resolve(null); return; }
        try { sdk.user.getUser().then(function (u) { resolve(u && u.username ? u.username : null); }).catch(function () { resolve(null); }); } catch (e) { resolve(null); }
      });
    },
    get sdkReady() { return ready; },
    midgameAd: function (hooks) {
      if (!HH.CONFIG.adsEnabled || !ready) { hooks.done(); return; }
      let fin = false;
      const end = function () { if (fin) return; fin = true; hooks.resume(); hooks.done(); };
      try {
        sdk.ad.requestAd("midgame", { adStarted: hooks.pause, adFinished: end, adError: end });
      } catch (e) { end(); }
    },
    get: function (k) {
      try { if (ready && sdk.data) return sdk.data.getItem(k); } catch (e) {}
      try { return localStorage.getItem(k); } catch (e) { return null; }
    },
    set: function (k, v) {
      try { if (ready && sdk.data) { sdk.data.setItem(k, v); return; } } catch (e) {}
      try { localStorage.setItem(k, v); } catch (e) {}
    }
  };
})();

HH.Save = (function () {
  function defaults() {
    return {
      v: 1,
      gems: 0,
      needles: 0,
      perks: { hayValue: 0, bagSize: 0, grab: 0, gemValue: 0 },
      classes: ["farmhand"],
      cls: "farmhand",
      map: "barnyard",
      best: {},
      stats: { hay: 0, cash: 0, diamonds: 0, blasts: 0 },
      settings: { sfx: true, music: true, sens: 1, invertY: false, gfx: "auto", tutorial: true },
      campaign: 0,
      current: 0,
      boost: {},
      doubleNext: false,
      playerName: "",
      rebirths: 0,
      tokens: 0,
      sinceRebirth: 0,
      rb: {},
      tutorial: 0,
      lastDaily: "",
      streak: 0,
      run: null
    };
  }
  let data = defaults();
  function merge(a, b) {
    if (!b || typeof b !== "object") return a;
    Object.keys(b).forEach(function (k) {
      if (a[k] && typeof a[k] === "object" && !Array.isArray(a[k]) && b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) a[k] = merge(a[k], b[k]);
      else a[k] = b[k];
    });
    return a;
  }
  return {
    load: function () {
      data = defaults();
      const raw = HH.Platform.get(HH.CONFIG.saveKey);
      if (raw) { try { data = merge(defaults(), JSON.parse(raw)); } catch (e) { data = defaults(); } }
      return data;
    },
    get data() { return data; },
    save: function () { HH.Platform.set(HH.CONFIG.saveKey, JSON.stringify(data)); },
    reset: function () { data = defaults(); this.save(); return data; }
  };
})();

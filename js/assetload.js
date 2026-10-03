(function () {
  const web = location.protocol === "http:" || location.protocol === "https:";
  const CORE = { Barbarian: "assets/Barbarian.glb", Mage: "assets/Mage.glb", Guy: "assets/Guy.glb" };
  const EXTRA = ["character-female-a", "character-female-b", "character-female-c", "character-female-d", "character-female-e", "character-female-f",
    "character-male-a", "character-male-b", "character-male-c", "character-male-d", "character-male-f", "aid-glasses", "aid-sunglasses"];

  function addScript(src, cb) {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    if (cb) s.onload = cb;
    document.head.appendChild(s);
  }

  function fallback() {
    addScript("js/models.js", function () { if (HH.modelsReady) HH.modelsReady(); });
    addScript("js/chars.js");
  }

  function bin(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.arrayBuffer(); });
  }

  if (!web || !window.fetch) { fallback(); return; }

  const names = Object.keys(CORE);
  Promise.all(names.map(function (n) { return bin(CORE[n]); })).then(function (bufs) {
    const data = { "Textures/colormap.png": "assets/guy_colormap.png" };
    names.forEach(function (n, i) { data[n] = bufs[i]; });
    HH.MODEL_DATA = data;
    if (HH.modelsReady) HH.modelsReady();
    return Promise.all(EXTRA.map(function (n) { return bin("assets/" + n + ".glb"); })).then(function (list) {
      HH.EXTRA_MODELS = HH.EXTRA_MODELS || {};
      EXTRA.forEach(function (n, i) { HH.EXTRA_MODELS[n] = list[i]; });
      if (HH.charsReady) HH.charsReady();
    });
  }).catch(function (e) {
    console.warn("model fetch failed, using embedded copies", e);
    HH.MODEL_DATA = null;
    fallback();
  });
})();

HH.I18N = (function () {
  const COLS = ["en", "es", "pt", "hi", "fr", "de"];
  const NAMES = { en: "English", es: "Español", pt: "Português", hi: "हिन्दी", fr: "Français", de: "Deutsch" };
  const dict = {};
  let lang = "en", touched = false;

  function add(rows) {
    rows.forEach(function (r) {
      for (let c = 1; c < COLS.length; c++) {
        if (!r[c]) continue;
        const d = dict[COLS[c]] || (dict[COLS[c]] = {});
        d[r[0]] = r[c];
      }
    });
  }

  function tr(s) {
    if (lang === "en" || !s) return s;
    const d = dict[lang];
    if (!d) return s;
    if (d[s]) return d[s];
    const lv = /^Level (\d+): (.+)$/.exec(s);
    if (lv) return (d.Level || "Level") + " " + lv[1] + ": " + (d[lv[2]] || lv[2]);
    const nums = [];
    const tpl = s.replace(/[0-9][0-9,.:]*(?:[KMBT]\b)?/g, function (m) { nums.push(m); return "#"; });
    const t = d[tpl];
    if (!t) return s;
    let i = 0;
    return t.replace(/#/g, function () { return nums[i++] || ""; });
  }

  function walk(root) {
    if ((lang === "en" && !touched) || !root) return;
    touched = true;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = w.nextNode())) {
      const v = n.__hh && n.nodeValue === n.__hh[1] ? n.__hh[0] : n.nodeValue, t = v.trim();
      if (t.length < 2) continue;
      const x = tr(t);
      const out = x !== t ? v.replace(t, x) : v;
      if (out !== n.nodeValue) n.nodeValue = out;
      n.__hh = [v, out];
    }
  }

  function detect() {
    const s = HH.Save && HH.Save.data && HH.Save.data.settings;
    if (s && s.lang && NAMES[s.lang]) return s.lang;
    const nav = ((navigator.languages && navigator.languages[0]) || navigator.language || "en").slice(0, 2).toLowerCase();
    return NAMES[nav] ? nav : "en";
  }

  function set(l) {
    lang = NAMES[l] ? l : "en";
    document.documentElement.lang = lang;
    document.body.classList.toggle("lang-hi", lang === "hi");
  }

  function next() {
    const i = COLS.indexOf(lang);
    return COLS[(i + 1) % COLS.length];
  }

  return { add: add, tr: tr, walk: walk, set: set, detect: detect, next: next, NAMES: NAMES, get lang() { return lang; } };
})();

HH.Quests = (function () {
  const BOOST_TIME = 900;
  const LIST = [
    { text: "Grab 25 hay", icon: "hand", get: function (S) { return [S.stats.hay, 25]; }, cash: 3 },
    { text: "Sell your hay to Bjorn", icon: "cash", get: function (S) { return [S.stats.sells || 0, 1]; }, cash: 5 },
    { text: "Buy Auto-Grab in the shop", icon: "shop", get: function (S, R, G) { return [G.lvl("hold"), 1]; }, gems: 5 },
    { text: "Collect 300 hay", icon: "bag", get: function (S) { return [S.stats.hay, 300]; }, cash: 10 },
    { text: "Buy the Pitchfork", icon: "fork", get: function (S, R) { return [R.tools.fork ? 1 : 0, 1]; }, cash: 15 },
    { text: "Get a bigger bag", icon: "bag", get: function (S, R) { return [Math.min(R.tier, 2), 2]; }, gems: 10 },
    { text: "Find the hidden needle", icon: "needle", get: function (S, R) { return [(R.found || R.carrying || S.needles > 0) ? 1 : 0, 1]; }, cash: 25 },
    { text: "Return the needle to Wizzo", icon: "needle", get: function (S) { return [S.needles, 1]; }, gems: 25 },
    { text: "Earn $10,000", icon: "cash", get: function (S) { return [Math.floor(S.stats.cash * 100), 10000]; }, cash: 50 },
    { text: "Reach Level 3", icon: "star", get: function (S) { return [S.needles, 2]; }, gems: 40 },
    { text: "Buy Dynamite", icon: "tnt", get: function (S, R) { return [R.tools.tnt ? 1 : 0, 1]; }, cash: 150 },
    { text: "Collect 10,000 hay", icon: "bag", get: function (S) { return [S.stats.hay, 10000]; }, gems: 75 },
    { text: "Reach Level 5", icon: "star", get: function (S) { return [S.needles, 4]; }, cash: 500 },
    { text: "Buy the Vacuum", icon: "vac", get: function (S, R) { return [R.tools.vac ? 1 : 0, 1]; }, gems: 100 },
    { text: "Earn $1,000,000", icon: "cash", get: function (S) { return [Math.floor(S.stats.cash * 100), 1000000]; }, gems: 150 },
    { text: "Return 10 needles", icon: "needle", get: function (S) { return [S.needles, 10]; }, gems: 250 }
  ];
  let cool = 0, lastHtml = "", giftShown = "";

  function S() { return HH.Save.data; }

  function giftDue() {
    const s = S();
    const n = s.gifts || 0;
    if (n >= 12) return Infinity;
    if (s.giftAt === undefined) s.giftAt = (s.playTime || 0) + 180;
    return s.giftAt;
  }

  function giftValue() {
    const G = HH.Game, st = G.stats();
    return Math.max(5, st.basePrice * st.cap * 2);
  }

  function openGift() {
    const s = S(), R = HH.Game.run;
    if (!R || (s.playTime || 0) < giftDue()) return false;
    const cash = giftValue(), gems = 5 + 3 * (s.gifts || 0);
    R.cash += cash;
    s.gems += gems;
    s.gifts = (s.gifts || 0) + 1;
    s.giftAt = (s.playTime || 0) + (s.gifts < 6 ? 240 : 600);
    HH.Save.save();
    HH.Audio.play("levelup");
    HH.UI.confetti(60);
    HH.UI.flyIcons("cash", 10);
    HH.UI.flyIcons("gem", 6);
    HH.UI.toast(HH.icon("star", 20) + " <b>Gift opened!</b> +$" + HH.cash(cash) + " and +" + gems + " gems", 3000);
    giftShown = "";
    return true;
  }

  function complete(q) {
    const s = S(), R = HH.Game.run;
    if (q.cash && R) R.cash += q.cash;
    if (q.gems) s.gems += q.gems;
    s.quest = (s.quest || 0) + 1;
    HH.Save.save();
    HH.Audio.play("levelup");
    HH.UI.confetti(45);
    if (q.cash) HH.UI.flyIcons("cash", 8);
    if (q.gems) HH.UI.flyIcons("gem", 6);
    const el = document.getElementById("quest");
    if (el) { el.classList.remove("done"); void el.offsetWidth; el.classList.add("done"); }
  }

  function rewardHtml(q) {
    return q.cash ? HH.icon("cash", 16) + " $" + HH.cash(q.cash) : HH.icon("gem", 16) + " " + q.gems;
  }

  function update(dt, active) {
    const s = S(), R = HH.Game.run;
    if (!R) return;
    if (active) s.playTime = (s.playTime || 0) + dt;
    cool -= dt;
    const q = LIST[s.quest || 0];
    const el = document.getElementById("quest");
    if (el) {
      if (!q) { el.classList.add("hidden"); }
      else {
        const p = q.get(s, R, HH.Game);
        const cur = Math.min(p[0], p[1]);
        if (p[0] >= p[1] && cool <= 0) { cool = 1.4; complete(q); }
        const html = '<div class="q-ic">' + HH.icon(q.icon, 26) + '</div><div class="q-main"><div class="q-top"><span class="q-title">' + q.text + '</span><span class="q-rew">' + rewardHtml(q) + '</span></div><div class="q-bar"><div style="width:' + (cur / p[1] * 100).toFixed(1) + '%"></div></div><div class="q-num">' + HH.fmtInt(cur) + " / " + HH.fmtInt(p[1]) + "</div></div>";
        if (html !== lastHtml) { el.innerHTML = html; lastHtml = html; }
        el.classList.remove("hidden");
      }
    }
    const bb = document.getElementById("beginner");
    if (bb) {
      const left = BOOST_TIME - (s.playTime || 0);
      bb.classList.toggle("hidden", left <= 0);
      if (left > 0) bb.innerHTML = HH.icon("boost", 20) + " <b>BEGINNER BOOST</b> 2x hay money &middot; " + HH.fmtTime(left);
    }
    const gb = document.getElementById("gift");
    if (gb) {
      const due = giftDue();
      gb.classList.toggle("hidden", due === Infinity);
      if (due !== Infinity) {
        const left = due - (s.playTime || 0);
        const ready = left <= 0;
        const txt = ready ? "ready" : HH.fmtTime(left);
        if (txt !== giftShown) {
          giftShown = txt;
          gb.classList.toggle("ready", ready);
          gb.innerHTML = HH.icon("star", 24) + (ready ? "<b>OPEN GIFT</b> <kbd>J</kbd>" : "<span>Free gift in <b>" + txt + "</b></span>");
        }
      }
    }
  }

  return {
    update: update, openGift: openGift,
    get boostOn() { return (S().playTime || 0) < BOOST_TIME; }
  };
})();

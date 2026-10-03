HH.Input = (function () {
  const keys = {};
  const pressed = {};
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, dx: 0, dy: 0, left: false, right: false, leftPressed: false, wheel: 0 };
  let locked = false, canvas = null, onAny = null, enabled = true, keyHook = null;

  function lockNow() {
    if (!canvas || locked || !canvas.requestPointerLock) return;
    try {
      const r = canvas.requestPointerLock();
      if (r && r.catch) r.catch(function () {});
    } catch (e) {}
  }

  return {
    init: function (cv) {
      canvas = cv;
      window.addEventListener("keydown", function (e) {
        if (e.target && e.target.tagName === "INPUT" && e.code !== "Escape") return;
        if (["Space", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) >= 0 && !(e.target && e.target.tagName === "INPUT")) e.preventDefault();
        if (onAny) onAny();
        if (!e.repeat && keyHook && keyHook(e.code)) { e.preventDefault(); return; }
        if (!e.repeat) pressed[e.code] = true;
        keys[e.code] = true;
      });
      window.addEventListener("keyup", function (e) { keys[e.code] = false; });
      window.addEventListener("blur", function () { Object.keys(keys).forEach(function (k) { keys[k] = false; }); mouse.left = mouse.right = false; });
      canvas.addEventListener("mousedown", function (e) {
        if (onAny) onAny();
        if (!enabled) return;
        if (e.button === 0) {
          if (!locked) lockNow();
          mouse.left = true; mouse.leftPressed = true;
        }
        if (e.button === 2) mouse.right = true;
      });
      window.addEventListener("mouseup", function (e) {
        if (e.button === 0) mouse.left = false;
        if (e.button === 2) mouse.right = false;
      });
      window.addEventListener("mousemove", function (e) {
        mouse.x = e.clientX; mouse.y = e.clientY;
        if (locked || mouse.right) { mouse.dx += e.movementX || 0; mouse.dy += e.movementY || 0; }
      });
      canvas.addEventListener("wheel", function (e) { mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
      canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      document.addEventListener("pointerlockchange", function () { locked = document.pointerLockElement === canvas; if (locked && !enabled && document.exitPointerLock) document.exitPointerLock(); });
    },
    down: function (c) { return !!keys[c]; },
    consume: function (c) { const v = !!pressed[c]; pressed[c] = false; return v; },
    clear: function () { Object.keys(pressed).forEach(function (k) { pressed[k] = false; }); mouse.leftPressed = false; mouse.dx = mouse.dy = 0; mouse.wheel = 0; },
    takeMouse: function () { const d = { dx: mouse.dx, dy: mouse.dy, wheel: mouse.wheel }; mouse.dx = mouse.dy = 0; mouse.wheel = 0; return d; },
    takeClick: function () { const v = mouse.leftPressed; mouse.leftPressed = false; return v; },
    get mouse() { return mouse; },
    get locked() { return locked; },
    unlock: function () { if (locked && document.exitPointerLock) document.exitPointerLock(); },
    lock: lockNow,
    setEnabled: function (v) { enabled = v; if (!v) { mouse.left = false; this.unlock(); } },
    onAnyInput: function (fn) { onAny = fn; },
    setKeyHook: function (fn) { keyHook = fn; }
  };
})();

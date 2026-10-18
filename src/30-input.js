/* =========================================================
   30 — input: keyboard, mouse, touch joystick, rebinding
   ========================================================= */

var keys = new Set();
var pressed = new Set();
var pointer = { x: 0, y: 0, down: false, active: false, type: 'mouse' };
var stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0, mag: 0 };
var wasTouch = false;
var dashQueued = false;
var rebindAction = null;

var IS_TOUCH = (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
  (typeof window !== 'undefined' && 'ontouchstart' in window);

function act(name) {
  var c = settings.bindings[name];
  if (name === 'up') return keys.has(c) || keys.has('ArrowUp');
  if (name === 'down') return keys.has(c) || keys.has('ArrowDown');
  if (name === 'left') return keys.has(c) || keys.has('ArrowLeft');
  if (name === 'right') return keys.has(c) || keys.has('ArrowRight');
  if (name === 'shoot') return keys.has(c);
  if (name === 'dash') return keys.has(c) || keys.has('ShiftRight');
  if (name === 'pause') return keys.has(c) || keys.has('Escape');
  return keys.has(c);
}

function actPressed(name) {
  var c = settings.bindings[name];
  if (name === 'up') return pressed.has(c) || pressed.has('ArrowUp');
  if (name === 'down') return pressed.has(c) || pressed.has('ArrowDown');
  if (name === 'left') return pressed.has(c) || pressed.has('ArrowLeft');
  if (name === 'right') return pressed.has(c) || pressed.has('ArrowRight');
  if (name === 'shoot') return pressed.has(c);
  if (name === 'dash') return pressed.has(c) || pressed.has('ShiftRight');
  if (name === 'pause') return pressed.has(c) || pressed.has('Escape');
  return pressed.has(c);
}

function isTypingTarget(el) {
  if (!el) return false;
  var tag = (el.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

function clearInput() {
  keys.clear();
  pressed.clear();
  pointer.down = false;
  stick.active = false;
  stick.mag = 0;
  stick.dx = stick.dy = 0;
}

window.addEventListener('keydown', function (e) {
  if (rebindAction) {
    e.preventDefault();
    if (e.code === 'Escape') {
      rebindAction = null;
      refreshSettings();
      return;
    }
    settings.bindings[rebindAction] = e.code;
    rebindAction = null;
    saveSettings();
    refreshSettings();
    return;
  }
  if (isTypingTarget(e.target)) return;

  var gameKey = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'ShiftLeft', 'ShiftRight'].indexOf(e.code) >= 0;
  if (gameKey && e.preventDefault) e.preventDefault();

  if (!keys.has(e.code)) pressed.add(e.code);
  keys.add(e.code);
}, { passive: false });

window.addEventListener('keyup', function (e) {
  keys.delete(e.code);
});

window.addEventListener('blur', function () {
  clearInput();
});

function updatePointerFromEvent(e) {
  var r = canvas.getBoundingClientRect();
  pointer.x = e.clientX - r.left;
  pointer.y = e.clientY - r.top;
  pointer.active = true;
}

function stickFromEvent(e) {
  var r = canvas.getBoundingClientRect();
  var x = e.clientX - r.left;
  var y = e.clientY - r.top;
  var dx = x - stick.ox;
  var dy = y - stick.oy;
  var m = hlen(dx, dy);
  var max = 62;
  if (m > max) { dx = dx / m * max; dy = dy / m * max; m = max; }
  stick.x = x;
  stick.y = y;
  stick.dx = dx / max;
  stick.dy = dy / max;
  stick.mag = clamp(m / max, 0, 1);
}

canvas.addEventListener('pointerdown', function (e) {
  if (uiModal) return;
  updatePointerFromEvent(e);
  if (e.pointerType === 'touch') {
    wasTouch = true;
    if (state === 'play') {
      if (!stick.active) {
        stick.active = true;
        stick.id = e.pointerId;
        stick.ox = pointer.x;
        stick.oy = pointer.y;
        stick.x = pointer.x;
        stick.y = pointer.y;
        stick.dx = 0; stick.dy = 0; stick.mag = 0;
      } else {
        dashQueued = true;
      }
    }
  } else {
    pointer.type = 'mouse';
    pointer.down = true;
    if (e.button === 2) dashQueued = true;
  }

  if (state === 'title') {
    menuPointer(pointer.x, pointer.y);
  } else if (state === 'clear') {
    if (clearTimer > 0.8) goMenu();
  } else if (state === 'dead') {
    if (deadTimer > 0.6) goMenu();
  } else if (state === 'pause' && !uiModal) {
    state = 'play';
  }
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
});

canvas.addEventListener('pointermove', function (e) {
  updatePointerFromEvent(e);
  if (e.pointerType !== 'touch') pointer.aimLock = false;
  if (e.pointerType === 'touch') {
    wasTouch = true;
    if (stick.active && e.pointerId === stick.id) stickFromEvent(e);
  } else {
    pointer.type = 'mouse';
  }
});

window.addEventListener('pointerup', function (e) {
  if (e.pointerType === 'touch') {
    if (stick.active && e.pointerId === stick.id) {
      stick.active = false;
      stick.id = null;
      stick.mag = 0;
      stick.dx = stick.dy = 0;
    }
  } else {
    pointer.down = false;
  }
});

window.addEventListener('pointercancel', function () {
  pointer.down = false;
  stick.active = false;
  stick.id = null;
  stick.mag = 0;
  stick.dx = stick.dy = 0;
});

canvas.addEventListener('contextmenu', function (e) {
  if (e.preventDefault) e.preventDefault();
});


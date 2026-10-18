/* =========================================================
   10 — util: math, drawing helpers, pools, key labels
   ========================================================= */

function rand(a, b) { return a + Math.random() * (b - a); }
function randi(a, b) { return Math.floor(rand(a, b + 1)); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function hlen(x, y) { return Math.hypot(x, y); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function pad(n) { return String(Math.max(0, Math.floor(n))).padStart(6, '0'); }
function pad2(n) { return String(Math.max(0, Math.floor(n))).padStart(2, '0'); }

function poly(g, x, y, r, sides, rot) {
  g.beginPath();
  for (var i = 0; i < sides; i++) {
    var a = rot + (i / sides) * TAU;
    var px = x + Math.cos(a) * r;
    var py = y + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
}

function glowOn(g, color, blur) { g.shadowColor = color; g.shadowBlur = blur; }
function glowOff(g) { g.shadowBlur = 0; }

var KEY_NAMES = {
  Space: '空格',
  ShiftLeft: '左 Shift',
  ShiftRight: '右 Shift',
  ControlLeft: '左 Ctrl',
  ControlRight: '右 Ctrl',
  AltLeft: '左 Alt',
  AltRight: '右 Alt',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  CapsLock: 'CapsLock',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backslash: '\\',
  BracketLeft: '[',
  BracketRight: ']',
  Minus: '-',
  Equal: '=',
  Backquote: '`'
};

function keyLabel(code) {
  if (!code) return '—';
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.indexOf('Key') === 0) return code.slice(3);
  if (code.indexOf('Digit') === 0) return code.slice(5);
  if (code.indexOf('Numpad') === 0) return 'Num ' + code.slice(6);
  return code;
}

/* simple object pool: take() returns a recycled object or a new one */
function Pool() { this.free = []; }
Pool.prototype.take = function () { return this.free.length ? this.free.pop() : {}; };
Pool.prototype.give = function (o) { if (this.free.length < 600) this.free.push(o); };

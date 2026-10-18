/*
 * 冒烟测试：不启动浏览器，用 vm + Canvas 桩加载 index.html 里的游戏脚本，
 * 模拟点击开始、按住射击、跑 900 帧，确认没有异常且关键界面有渲染。
 *
 * 运行：node test/smoke.mjs
 */

import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'index.html');

function fail(msg) {
  console.error('✗ ' + msg);
  process.exit(1);
}

if (!fs.existsSync(htmlPath)) fail('找不到 index.html，先运行 node build.mjs');

const html = fs.readFileSync(htmlPath, 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) fail('index.html 里没有找到 <script> 块');

const texts = [];
const gradient = { addColorStop() {} };

function makeCtx() {
  const target = {
    canvas: { width: 0, height: 0 },
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    createPattern: () => ({}),
    measureText: () => ({ width: 40 }),
    fillText: (t) => { texts.push(String(t)); },
  };
  return new Proxy(target, {
    get(t, k) { return k in t ? t[k] : (t[k] = function () {}); },
    set(t, k, v) { t[k] = v; return true; },
  });
}

const canvasHandlers = new Map();
const winHandlers = new Map();
const docHandlers = new Map();

function pushHandler(map, key, fn) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(fn);
}

function makeCanvas() {
  let ctx = null;
  return {
    width: 0, height: 0, style: {},
    getContext() { if (!ctx) ctx = makeCtx(); return ctx; },
    addEventListener(type, fn) { pushHandler(canvasHandlers, type, fn); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; },
    setPointerCapture() {},
  };
}

function makeEl(id) {
  const classes = new Set();
  return {
    id, style: {}, innerHTML: '', textContent: '',
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    addEventListener(type, fn) { pushHandler(canvasHandlers, id + ':' + type, fn); },
    setAttribute() {},
    getAttribute() { return null; },
    querySelectorAll() { return []; },
  };
}

const gameCanvas = makeCanvas();
const elements = new Map();

const win = {
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  addEventListener(type, fn) { pushHandler(winHandlers, type, fn); },
  requestAnimationFrame(cb) { rafCb = cb; },
};

let rafCb = null;

const sandbox = {
  window: win,
  document: {
    hidden: false,
    getElementById(id) {
      if (id === 'game') return gameCanvas;
      if (!elements.has(id)) elements.set(id, makeEl(id));
      return elements.get(id);
    },
    createElement(tag) {
      return tag === 'canvas' ? makeCanvas() : makeEl('created');
    },
    addEventListener(type, fn) { pushHandler(docHandlers, type, fn); },
  },
  localStorage: {
    store: {},
    getItem(k) { return k in this.store ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; },
  },
  setTimeout: () => 0,
  clearTimeout: () => {},
  console,
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(match[1], sandbox, { filename: 'index.html<script>' });

let now = 0;
function frame(n = 1) {
  for (let i = 0; i < n; i++) {
    if (!rafCb) throw new Error('游戏没有调度下一帧');
    const cb = rafCb;
    rafCb = null;
    now += 16.7;
    cb(now);
  }
}

function fire(map, type, ev) {
  (map.get(type) || []).forEach((fn) => fn(Object.assign({ preventDefault() {}, stopPropagation() {} }, ev)));
}

let step = '启动';
try {
  frame(20);

  const bootText = texts.join('|');
  if (!bootText.includes('NEON RIFT')) fail('标题没有渲染');
  if (!bootText.includes('边境')) fail('关卡选择没有渲染');

  step = '进入游戏';
  fire(winHandlers, 'keydown', { code: 'Space' });
  frame(2);
  fire(winHandlers, 'keyup', { code: 'Space' });
  fire(winHandlers, 'keydown', { code: 'Space' });

  frame(900);

  const all = texts.join('|');
  if (!all.includes('HULL')) fail('游戏 HUD 没有渲染');
  if (!/\d{6}/.test(all)) fail('没有出现分数');
  if (/\bundefined\b/.test(all)) fail('界面里出现了 undefined');

  console.log('✓ 冒烟测试通过');
  console.log('  · 标题、关卡选择、HUD 均已渲染');
  console.log('  · 模拟开始游戏 + 按住射击 900 帧，无异常');
} catch (err) {
  console.error(`✗ 在「${step}」阶段失败`);
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}

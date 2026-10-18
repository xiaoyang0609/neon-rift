/*
 * 冒烟测试：不启动浏览器，用 vm + Canvas 桩加载 index.html 里的游戏脚本。
 * 覆盖两条路径：
 *   1. 标准关卡：进游戏、按住射击、跑 900 帧
 *   2. 无尽模式：菜单选到第 4 关、进游戏、跑 1200 帧
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
const code = match[1];

function boot() {
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
  let rafCb = null;

  const win = {
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    addEventListener(type, fn) { pushHandler(winHandlers, type, fn); },
    requestAnimationFrame(cb) { rafCb = cb; },
  };

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
      addEventListener() {},
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
  vm.runInContext(code, sandbox, { filename: 'index.html<script>' });

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

  return { texts, winHandlers, frame, fire };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function run(name, fn) {
  try {
    fn();
    console.log('✓ ' + name);
  } catch (err) {
    console.error('✗ ' + name);
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

run('标准关卡：标题 → 开局 → 射击 900 帧', () => {
  const g = boot();
  g.frame(20);
  const bootText = g.texts.join('|');
  assert(bootText.includes('NEON RIFT'), '标题没有渲染');
  assert(bootText.includes('边境'), '关卡选择没有渲染');

  g.fire(g.winHandlers, 'keydown', { code: 'Space' });
  g.frame(2);
  g.fire(g.winHandlers, 'keyup', { code: 'Space' });
  g.fire(g.winHandlers, 'keydown', { code: 'Space' });
  g.frame(900);

  const all = g.texts.join('|');
  assert(all.includes('HULL'), '游戏 HUD 没有渲染');
  assert(/\d{6}/.test(all), '没有出现分数');
  assert(!/\bundefined\b/.test(all), '界面里出现了 undefined');
});

run('无尽模式：菜单选第 4 关 → 开局 → 1200 帧', () => {
  const g = boot();
  g.frame(20);

  for (let i = 0; i < 3; i++) {
    g.fire(g.winHandlers, 'keydown', { code: 'ArrowRight' });
    g.frame(1);
    g.fire(g.winHandlers, 'keyup', { code: 'ArrowRight' });
  }
  g.frame(2);

  g.fire(g.winHandlers, 'keydown', { code: 'Space' });
  g.frame(2);
  g.fire(g.winHandlers, 'keyup', { code: 'Space' });
  g.fire(g.winHandlers, 'keydown', { code: 'Space' });
  g.frame(1200);

  const all = g.texts.join('|');
  assert(/无尽 \d{2}/.test(all), '无尽模式 HUD 没有出现');
  assert(all.includes('HULL'), '游戏 HUD 没有渲染');
  assert(!all.includes('STAGE CLEAR'), '无尽模式不应触发通关');
  assert(!/\bundefined\b/.test(all), '界面里出现了 undefined');
});

console.log('全部冒烟测试通过');

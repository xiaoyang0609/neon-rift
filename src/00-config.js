/* =========================================================
   NEON RIFT · 霓虹裂隙
   00 — config: constants, palettes, persistent settings
   ========================================================= */

var TAU = Math.PI * 2;
var APP_VERSION = 'v3.4.4';
var SIM_HZ = 120;
var STEP = 1 / SIM_HZ;
var MAX_STEPS = 8;
var FONT = '"Bahnschrift","Segoe UI","Microsoft YaHei",system-ui,sans-serif';
var SAVE_BEST_KEY = 'neonrift.best.v2';
var SAVE_SET_KEY = 'neonrift.settings.v2';
var SAVE_LOADOUT_KEY = 'neonrift.loadout.v1';
var SAVE_STAGEBEST_KEY = 'neonrift.stagebest.v1';
var SAVE_PROGRESS_KEY = 'neonrift.progress.v1';
var SAVE_UPGRADE_KEY = 'neonrift.upgrades.v1';

/* 战役关卡：数字顺序，通关前一关解锁下一关；无尽是常驻模式 */
var STAGES = [
  {
    num: 1, name: '边境', en: 'OUTER RIM', waves: 3,
    hp: 1, speed: 1, dmg: 1, spawn: 1,
    bossHp: 1, bossVariant: 0, bossName: 'DREADNOUGHT',
    tint: '#3fe6ff', reward: 30,
    desc: '标准节奏 · 3 波 + 守卫'
  },
  {
    num: 2, name: '深空', en: 'DEEP FIELD', waves: 4,
    hp: 1.25, speed: 1.05, dmg: 1.08, spawn: 1.15,
    bossHp: 1.2, bossVariant: 1, bossName: 'SENTINEL',
    tint: '#9d6bff', reward: 45,
    desc: '更硬更快 · 4 波 + 哨兵'
  },
  {
    num: 3, name: '裂隙核心', en: 'RIFT CORE', waves: 5,
    hp: 1.55, speed: 1.1, dmg: 1.16, spawn: 1.3,
    bossHp: 1.45, bossVariant: 2, bossName: 'RIFT CORE',
    tint: '#ff4d5e', reward: 65,
    desc: '高压弹幕 · 5 波 + 核心'
  },
  {
    num: 4, name: '熔火要塞', en: 'EMBER FORT', waves: 6,
    hp: 1.95, speed: 1.15, dmg: 1.24, spawn: 1.45,
    bossHp: 1.7, bossVariant: 0, bossName: 'WARFORGE',
    tint: '#ff9f43', reward: 90,
    desc: '重装火力 · 6 波 + 熔炉'
  },
  {
    num: 5, name: '静默星云', en: 'SILENT NEBULA', waves: 7,
    hp: 2.4, speed: 1.2, dmg: 1.32, spawn: 1.6,
    bossHp: 2.0, bossVariant: 1, bossName: 'VOID EYE',
    tint: '#54ffa8', reward: 120,
    desc: '视野压制 · 7 波 + 虚空之眼'
  },
  {
    num: 6, name: '终焉之环', en: 'FINAL RING', waves: 8,
    hp: 2.9, speed: 1.25, dmg: 1.4, spawn: 1.75,
    bossHp: 2.3, bossVariant: 2, bossName: 'OMEGA',
    tint: '#ffd166', reward: 160,
    desc: '最终决战 · 8 波 + OMEGA'
  },
  {
    num: 0, name: '无尽', en: 'ENDLESS', waves: 0, endless: true,
    hp: 1.5, speed: 1.15, dmg: 1.25, spawn: 1.4,
    bossHp: 1.9, bossVariant: 2, bossName: 'RIFT CORE',
    tint: '#ff7ad9', reward: 0,
    desc: '无限波次 · 每 5 波 Boss'
  }
];

/* 强化：用通关获得的结晶永久升级 */
var UPGRADES = [
  { id: 'damage', name: '火力强化', en: 'DAMAGE', desc: '每级 +8% 子弹伤害', max: 10, cost: 40, growth: 1.35 },
  { id: 'rate', name: '射速强化', en: 'FIRE RATE', desc: '每级 -3% 射击间隔', max: 8, cost: 50, growth: 1.35 },
  { id: 'hull', name: '船体强化', en: 'HULL', desc: '每级 +10 最大结构', max: 8, cost: 45, growth: 1.35 },
  { id: 'shield', name: '护盾单元', en: 'SHIELD', desc: '开局多 1 层护盾', max: 3, cost: 90, growth: 2.0 },
  { id: 'armor', name: '装甲镀层', en: 'ARMOR', desc: '每级 -4% 受到伤害', max: 5, cost: 75, growth: 1.6 }
];

/* 射击模式：单发 / 重炮 / 散射 / 双流 */
var WEAPONS = [
  {
    id: 'pulse', name: '脉冲', en: 'PULSE', desc: '均衡 · 射速快',
    interval: 0.1, dmg: 1, speed: 940, r: 3.4, life: 0.9,
    count: 1, spread: 0, pierce: 0, color: '#7fe7ff',
    stats: [3, 4, 3]
  },
  {
    id: 'cannon', name: '重炮', en: 'CANNON', desc: '慢弹 · 高伤 · 穿透',
    interval: 0.3, dmg: 3.5, speed: 640, r: 6.5, life: 1.2,
    count: 1, spread: 0, pierce: 2, color: '#ffd166',
    stats: [5, 2, 2]
  },
  {
    id: 'scatter', name: '散射', en: 'SCATTER', desc: '5 发霰弹 · 近战强',
    interval: 0.36, dmg: 0.85, speed: 790, r: 3, life: 0.55,
    count: 5, spread: 0.42, pierce: 0, color: '#c3b6ff',
    stats: [4, 2, 1]
  },
  {
    id: 'twin', name: '双流', en: 'TWIN', desc: '双管 · 持续输出',
    interval: 0.13, dmg: 0.7, speed: 980, r: 3, life: 0.85,
    count: 2, spread: 0.05, pierce: 0, color: '#3fe6ff',
    stats: [3, 3, 4]
  }
];

var PALETTES = {
  normal: {
    player: '#3fe6ff',
    drone: '#ff3d8b',
    weaver: '#ffd166',
    splitter: '#9d6bff',
    sniper: '#ff9f43',
    bomber: '#ff5d3d',
    boss: '#ff4d5e',
    heal: '#54ffa8',
    rapid: '#ffd166',
    triple: '#9d6bff',
    shield: '#7fe7ff',
    white: '#eaf6ff',
    cyan: '#3fe6ff',
    gold: '#ffd166',
    green: '#54ffa8',
    red: '#ff4d5e',
    violet: '#9d6bff',
    pink: '#ff3d8b',
    orange: '#ff9f43'
  },
  cb: {
    player: '#00e5ff',
    drone: '#ffb000',
    weaver: '#4d7cff',
    splitter: '#ffffff',
    sniper: '#ff44ff',
    bomber: '#ff3030',
    boss: '#ff3030',
    heal: '#54ffa8',
    rapid: '#ffb000',
    triple: '#4d7cff',
    shield: '#00e5ff',
    white: '#f2f7ff',
    cyan: '#00e5ff',
    gold: '#ffb000',
    green: '#54ffa8',
    red: '#ff3030',
    violet: '#4d7cff',
    pink: '#ffb000',
    orange: '#ff44ff'
  }
};

var BIND_ACTIONS = [
  { id: 'up', label: '上移', hint: '默认 W' },
  { id: 'down', label: '下移', hint: '默认 S' },
  { id: 'left', label: '左移', hint: '默认 A' },
  { id: 'right', label: '右移', hint: '默认 D' },
  { id: 'shoot', label: '射击', hint: '默认 空格 / 鼠标左键' },
  { id: 'dash', label: '冲刺', hint: '默认 Shift / 鼠标右键' },
  { id: 'pause', label: '暂停', hint: '默认 P / Esc' }
];

function defaultSettings() {
  return {
    volume: 0.8,
    shake: 1,
    flashes: true,
    colorblind: false,
    autoaim: false,
    bloom: true,
    sim120: true,
    showFps: false,
    bindings: {
      up: 'KeyW',
      down: 'KeyS',
      left: 'KeyA',
      right: 'KeyD',
      shoot: 'Space',
      dash: 'ShiftLeft',
      pause: 'KeyP'
    }
  };
}

function loadSettings() {
  var s = defaultSettings();
  try {
    var raw = localStorage.getItem(SAVE_SET_KEY);
    if (raw) {
      var o = JSON.parse(raw) || {};
      for (var k in s) {
        if (k === 'bindings') continue;
        if (k in o) s[k] = o[k];
      }
      if (o.bindings) {
        for (var b in s.bindings) {
          if (typeof o.bindings[b] === 'string' && o.bindings[b]) s.bindings[b] = o.bindings[b];
        }
      }
    }
  } catch (e) {}
  return s;
}

function saveSettings() {
  try { localStorage.setItem(SAVE_SET_KEY, JSON.stringify(settings)); } catch (e) {}
}

var settings = loadSettings();
var COL = settings.colorblind ? PALETTES.cb : PALETTES.normal;

function applyPalette() {
  COL = settings.colorblind ? PALETTES.cb : PALETTES.normal;
}

function applySimRate() {
  var fast = settings.sim120 !== false;
  SIM_HZ = fast ? 120 : 60;
  STEP = 1 / SIM_HZ;
  MAX_STEPS = fast ? 8 : 5;
}

applySimRate();


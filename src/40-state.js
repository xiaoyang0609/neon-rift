/* =========================================================
   40 — state: score, player, wave director, entity factories
   ========================================================= */

var state = 'title';
var time = 0;
var score = 0;
var best = loadBest();
var bestByStage = loadStageBest();
var menuStage = 0;
var menuWeapon = 0;
var stageIndex = 0;
var stageCfg = STAGES[0];
var weaponCfg = WEAPONS[0];
var menuRects = [];
var clearTimer = 0;
var clearNewBest = false;
var wave = 0;
var combo = 0;
var comboTimer = 0;
var shakeMag = 0;
var shakeX = 0;
var shakeY = 0;
var hitstop = 0;
var hitFlash = 0;
var banner = 0;
var bannerText = '';
var deadTimer = 0;
var waveActive = false;
var waveGap = 0;
var waveStartTime = 0;
var waveSpawn = { left: 0, timer: 0, interval: 0.9, boss: false };
var boss = null;
var muted = false;

var player = {
  x: 0, y: 0, vx: 0, vy: 0, r: 14,
  hp: 100, maxHp: 100,
  aim: -Math.PI / 2,
  fireCd: 0, dashCd: 0, dashT: 0, ddx: 0, ddy: 0,
  invuln: 0, rapid: 0, triple: 0, thrust: 0,
  shield: 0, shots: 0, hitDirs: []
};

var bullets = [];
var ebullets = [];
var enemies = [];
var particles = [];
var pickups = [];
var rings = [];
var floats = [];
var spawns = [];

var bulletPool = new Pool();
var ebPool = new Pool();
var partPool = new Pool();
var floatPool = new Pool();
var ringPool = new Pool();

function loadBest() {
  try { return parseInt(localStorage.getItem(SAVE_BEST_KEY) || '0', 10) || 0; } catch (e) { return 0; }
}

function saveBest(v) {
  try { localStorage.setItem(SAVE_BEST_KEY, String(v)); } catch (e) {}
}

function loadStageBest() {
  var zeros = STAGES.map(function () { return 0; });
  try {
    var raw = localStorage.getItem(SAVE_STAGEBEST_KEY);
    if (!raw) return zeros;
    var arr = JSON.parse(raw);
    if (!arr || !arr.length) return zeros;
    return STAGES.map(function (_, i) { return Math.max(0, (arr[i] | 0)); });
  } catch (e) { return zeros; }
}

function saveStageBest() {
  try { localStorage.setItem(SAVE_STAGEBEST_KEY, JSON.stringify(bestByStage)); } catch (e) {}
}

function loadLoadout() {
  try {
    var o = JSON.parse(localStorage.getItem(SAVE_LOADOUT_KEY) || '{}');
    if (o && typeof o.stage === 'number') menuStage = clamp(o.stage | 0, 0, STAGES.length - 1);
    if (o && typeof o.weapon === 'number') menuWeapon = clamp(o.weapon | 0, 0, WEAPONS.length - 1);
  } catch (e) {}
}

function saveLoadout() {
  try { localStorage.setItem(SAVE_LOADOUT_KEY, JSON.stringify({ stage: menuStage, weapon: menuWeapon })); } catch (e) {}
}

loadLoadout();
stageCfg = STAGES[menuStage];
weaponCfg = WEAPONS[menuWeapon];

/* ---------------- effects ---------------- */

function addParticles(x, y, n, color, speed, size, life) {
  for (var i = 0; i < n; i++) {
    var a = rand(0, TAU);
    var s = rand(speed * 0.2, speed);
    var l = rand(life * 0.45, life);
    var p = partPool.take();
    p.x = x; p.y = y;
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s;
    p.r = rand(size * 0.45, size);
    p.life = l; p.max = l;
    p.color = color;
    particles.push(p);
  }
  if (particles.length > 1000) {
    for (var k = 0; k < 60; k++) partPool.give(particles.shift());
  }
}

function addRing(x, y, color, r, life, w) {
  var o = ringPool.take();
  o.x = x; o.y = y; o.color = color;
  o.r0 = r * 0.35; o.r1 = r * 1.8;
  o.t = 0; o.max = life; o.w = w || 2;
  rings.push(o);
}

function addFloat(x, y, text, color, size) {
  var f = floatPool.take();
  f.x = x; f.y = y; f.text = text; f.color = color; f.size = size;
  f.t = 0; f.max = 0.95;
  floats.push(f);
}

function addShake(amount, angle) {
  shakeMag = Math.min(34, shakeMag + amount * settings.shake);
  if (angle != null) {
    shakeX += Math.cos(angle) * amount * 0.55 * settings.shake;
    shakeY += Math.sin(angle) * amount * 0.55 * settings.shake;
  }
}

/* ---------------- flow ---------------- */

function recycleAll() {
  var i;
  for (i = 0; i < bullets.length; i++) bulletPool.give(bullets[i]);
  bullets.length = 0;
  for (i = 0; i < ebullets.length; i++) ebPool.give(ebullets[i]);
  ebullets.length = 0;
  for (i = 0; i < particles.length; i++) partPool.give(particles[i]);
  particles.length = 0;
  for (i = 0; i < floats.length; i++) floatPool.give(floats[i]);
  floats.length = 0;
  for (i = 0; i < rings.length; i++) ringPool.give(rings[i]);
  rings.length = 0;
  enemies.length = 0;
  pickups.length = 0;
  spawns.length = 0;
}

function startGame(si, wi) {
  if (typeof si === 'number') menuStage = clamp(si | 0, 0, STAGES.length - 1);
  if (typeof wi === 'number') menuWeapon = clamp(wi | 0, 0, WEAPONS.length - 1);
  stageIndex = menuStage;
  stageCfg = STAGES[stageIndex];
  weaponCfg = WEAPONS[menuWeapon];
  saveLoadout();

  recycleAll();
  score = 0; combo = 0; comboTimer = 0;
  boss = null;
  shakeMag = 0; shakeX = 0; shakeY = 0;
  hitstop = 0; hitFlash = 0;
  deadTimer = 0;
  clearTimer = 0;
  clearNewBest = false;
  banner = 0; bannerText = '';
  player.x = VW / 2;
  player.y = VH * 0.72;
  player.vx = 0; player.vy = 0;
  player.hp = player.maxHp = 100;
  player.aim = -Math.PI / 2;
  player.fireCd = 0.35;
  player.dashCd = 0; player.dashT = 0;
  player.invuln = 1.4;
  player.rapid = 0; player.triple = 0;
  player.shield = 0;
  player.shots = 0;
  player.hitDirs.length = 0;
  pointer.aimLock = true;
  state = 'play';
  waveActive = false;
  waveGap = 0;
  startWave(1);
  sfx('wave');
}

function goMenu() {
  state = 'title';
  recycleAll();
  boss = null;
  banner = 0;
  clearTimer = 0;
  deadTimer = 0;
  player.x = VW / 2;
  player.y = VH * 0.72;
  player.hp = player.maxHp;
  player.shield = 0;
  player.hitDirs.length = 0;
  clearInput();
}

function stageClear() {
  state = 'clear';
  clearTimer = 0;
  clearNewBest = score > (bestByStage[stageIndex] || 0);
  if (score > bestByStage[stageIndex]) bestByStage[stageIndex] = score;
  if (score > best) { best = score; saveBest(best); }
  saveStageBest();

  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    addParticles(e.x, e.y, 10, ecolOf(e), 180, 3, 0.6);
  }
  enemies.length = 0;
  ebullets.length = 0;
  pickups.length = 0;
  addRing(player.x, player.y, COL.gold, 90, 1.1, 5);
  sfx('bigkill');
}

function startWave(n) {
  wave = n;
  waveActive = true;
  waveStartTime = time;
  var isBoss = n > stageCfg.waves;
  bannerText = isBoss ? ('BOSS · ' + stageCfg.bossName) : ('WAVE ' + n + ' / ' + (stageCfg.waves + 1));
  banner = 2.4;
  var count;
  if (n === 1) count = 2;
  else if (isBoss) count = 1;
  else count = Math.round(Math.min(26, 2 + Math.floor(n * 1.5)) * stageCfg.spawn);
  waveSpawn.left = count;
  waveSpawn.timer = isBoss ? 1.8 : 0.9;
  waveSpawn.interval = Math.max(0.26, (0.95 - n * 0.04) / (1 + stageIndex * 0.08));
  waveSpawn.boss = isBoss;
  if (isBoss) addShake(5);
}

function die() {
  state = 'dead';
  deadTimer = 0;
  addShake(30);
  addRing(player.x, player.y, COL.cyan, 76, 0.9, 4);
  addParticles(player.x, player.y, 50, COL.cyan, 340, 4, 1.2);
  addParticles(player.x, player.y, 26, COL.white, 240, 3, 1);
  if (score > best) { best = score; saveBest(best); }
  if (score > (bestByStage[stageIndex] || 0)) {
    bestByStage[stageIndex] = score;
    saveStageBest();
  }
  sfx('death');
}

function damagePlayer(amount, sx, sy) {
  if (player.invuln > 0 || state !== 'play') return;
  if (player.shield > 0) {
    player.shield--;
    player.invuln = 0.85;
    addRing(player.x, player.y, COL.shield, 40, 0.5, 3);
    sfx('shieldBreak');
    addShake(6);
    return;
  }
  player.hp -= amount * stageCfg.dmg;
  player.invuln = 1.05;
  hitFlash = 1;
  var ang = (sx == null) ? rand(0, TAU) : Math.atan2(player.y - sy, player.x - sx);
  player.hitDirs.push({ a: ang, t: 0 });
  if (player.hitDirs.length > 6) player.hitDirs.shift();
  addShake(9, ang);
  sfx('hurt');
  addParticles(player.x, player.y, 16, COL.red, 190, 3, 0.5);
  if (player.hp <= 0) { player.hp = 0; die(); }
}

/* ---------------- spawning ---------------- */

function chooseType() {
  var r = Math.random();
  if (wave >= 4 && r < 0.10) return 'bomber';
  if (wave >= 3 && r < 0.24) return 'sniper';
  if (wave >= 4 && r < 0.36) return 'splitter';
  if (wave >= 2 && r < 0.62) return 'weaver';
  return 'drone';
}

function spawnEnemy(type) {
  var x = 0, y = 0, m = 70;
  for (var i = 0; i < 24; i++) {
    var side = randi(0, 3);
    if (side === 0) { x = rand(m, VW - m); y = -40; }
    else if (side === 1) { x = VW + 40; y = rand(m, VH - m); }
    else if (side === 2) { x = rand(m, VW - m); y = VH + 40; }
    else { x = -40; y = rand(m, VH - m); }
    if (dist(x, y, player.x, player.y) > 210) break;
  }
  if (type === 'warden') { x = VW / 2; y = -70; }
  var t = type === 'warden' ? 1.5 : 0.65;
  spawns.push({ x: x, y: y, t: t, max: t, type: type });
}

function makeEnemy(type, x, y) {
  var k = (1 + Math.max(0, wave - 1) * 0.05) * stageCfg.hp;
  var spd = stageCfg.speed;
  var e;

  if (type === 'drone') {
    e = {
      type: type, x: x, y: y, vx: 0, vy: 0, r: 13,
      hp: 2.2 * k, speed: (wave === 1 ? 58 : Math.min(200, 70 + wave * 4.5)) * spd,
      score: 10, ang: 0, fire: 0, hit: 0, phase: rand(0, TAU)
    };
  } else if (type === 'weaver') {
    e = {
      type: type, x: x, y: y, vx: 0, vy: 0, r: 15,
      hp: 3.2 * k, speed: Math.min(150, 52 + wave * 3) * spd,
      score: 16, ang: 0, fire: rand(0.8, 1.6), hit: 0, phase: rand(0, TAU)
    };
  } else if (type === 'splitter') {
    e = {
      type: type, x: x, y: y, vx: 0, vy: 0, r: 24,
      hp: 7 * k, speed: Math.min(120, 38 + wave * 2) * spd,
      score: 26, ang: 0, fire: 0, hit: 0, phase: rand(0, TAU)
    };
  } else if (type === 'sniper') {
    e = {
      type: type, x: x, y: y, vx: 0, vy: 0, r: 14,
      hp: 4 * k, speed: 62 * spd, score: 24,
      ang: 0, fire: rand(1.4, 2.4), charge: 0, aimAngle: 0, hit: 0, phase: rand(0, TAU)
    };
  } else if (type === 'bomber') {
    e = {
      type: type, x: x, y: y, vx: 0, vy: 0, r: 16,
      hp: 5.5 * k, speed: 150 * spd, score: 22,
      ang: 0, fire: 0, fuse: -1, hit: 0, phase: rand(0, TAU)
    };
  } else if (type === 'mini') {
    e = {
      type: type, x: x, y: y, vx: rand(-90, 90), vy: rand(-90, 90), r: 9,
      hp: 1.2 * stageCfg.hp, speed: 195 * Math.min(1.15, spd), score: 6,
      ang: 0, fire: 0, hit: 0, phase: 0
    };
  } else {
    var variant = stageCfg.bossVariant;
    var hp = (55 + wave * 5) * stageCfg.bossHp;
    e = {
      type: 'warden', x: x, y: y, vx: 0, vy: 0, r: 46,
      hp: hp, speed: variant === 1 ? 58 : (variant === 2 ? 50 : 46),
      score: 220 + stageIndex * 180, ang: 0,
      fire: 1.8, fire2: 2.4, spawnT: 5,
      spiralT: 0.8, spiralAngle: 0,
      variant: variant,
      hit: 0, phase: 0, enraged: false
    };
  }

  e.maxHp = e.hp;
  e.vx = e.vx || 0;
  e.vy = e.vy || 0;
  if (wave >= 3 && type !== 'mini' && type !== 'warden' && Math.random() < 0.12) applyElite(e);
  return e;
}

function applyElite(e) {
  var affix = pick(['shield', 'swift', 'split', 'volatile']);
  e.affix = affix;
  e.elite = true;
  e.hp *= 1.7;
  e.maxHp = e.hp;
  e.r *= 1.1;
  e.score = Math.round(e.score * 3);
  if (affix === 'shield') e.shield = 3;
  if (affix === 'swift') e.speed *= 1.5;
}

function enemyShoot(x, y, a, speed, r) {
  var b = ebPool.take();
  b.x = x; b.y = y;
  b.px = x; b.py = y;
  b.vx = Math.cos(a) * speed;
  b.vy = Math.sin(a) * speed;
  b.r = r || 5;
  b.life = 7;
  ebullets.push(b);
}

function dropPickup(x, y, type) {
  if (!type) {
    var r = Math.random();
    type = r < 0.44 ? 'heal' : (r < 0.7 ? 'rapid' : (r < 0.9 ? 'triple' : 'shield'));
  }
  pickups.push({
    x: x, y: y, vx: rand(-30, 30), vy: rand(-30, 30),
    r: 13, type: type, life: 17, t: rand(0, TAU)
  });
}

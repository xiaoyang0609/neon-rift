/* =========================================================
   70 — ui: DOM settings, overlays, canvas screens
   ========================================================= */

var uiModal = false;
var settingsWasPlaying = false;
var elSettings = document.getElementById('settings');
var elSettingsBody = document.getElementById('settings-body');
var elRotate = document.getElementById('rotate');
var elToast = document.getElementById('toast');
var elPauseBtn = document.getElementById('btn-pause');
var elSettingsBtn = document.getElementById('btn-settings');
var elUpgradesBtn = document.getElementById('btn-upgrades');
var elUpgrades = document.getElementById('upgrades');
var elUpgradeBody = document.getElementById('upgrade-body');
var elShardCount = document.getElementById('shard-count');
var elInstall = document.getElementById('install');
var elInstallBtn = document.getElementById('btn-install');
var elInstallBody = document.getElementById('install-body');
var toastTimer = null;
var deferredInstall = null;

function showToast(msg) {
  if (!elToast) return;
  elToast.textContent = msg;
  elToast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { elToast.classList.add('hidden'); }, 2400);
}

function togglePause() {
  if (state === 'play') state = 'pause';
  else if (state === 'pause' && !uiModal) state = 'play';
}

function settingRow(label, hint, control) {
  return '<div class="row"><div class="label">' + label +
    (hint ? '<small>' + hint + '</small>' : '') +
    '</div>' + control + '</div>';
}

function toggleHtml(key, on) {
  return '<div class="switch' + (on ? ' on' : '') + '" data-toggle="' + key + '"></div>';
}

function buildSettingsPanel() {
  if (!elSettingsBody) return;
  var h = '';

  h += '<div class="section-title">手感 / FEEL</div>';
  h += settingRow('音量', '0 – 100', '<input type="range" min="0" max="1" step="0.05" data-range="volume" value="' + settings.volume + '">');
  h += settingRow('屏幕震动', '关闭可减少眩晕', '<input type="range" min="0" max="1" step="0.1" data-range="shake" value="' + settings.shake + '">');

  h += '<div class="section-title">辅助 / ACCESSIBILITY</div>';
  h += settingRow('减弱闪光', '受击红闪与低血量脉动变弱', toggleHtml('flashes', settings.flashes));
  h += settingRow('色盲配色', '敌人改用高对比色板', toggleHtml('colorblind', settings.colorblind));
  h += settingRow('自动瞄准', '始终瞄准最近的敌人', toggleHtml('autoaim', settings.autoaim));

  h += '<div class="section-title">画面 / VIDEO</div>';
  h += settingRow('泛光效果', '关闭可提升低端机帧率', toggleHtml('bloom', settings.bloom));
  h += settingRow('高刷新模拟', '120Hz 逻辑步进；低端机可关', toggleHtml('sim120', settings.sim120));
  h += settingRow('显示帧率', '右下角实时 FPS', toggleHtml('showFps', settings.showFps));

  h += '<div class="section-title">按键 / CONTROLS</div>';
  for (var i = 0; i < BIND_ACTIONS.length; i++) {
    var a = BIND_ACTIONS[i];
    var waiting = rebindAction === a.id;
    h += '<div class="row"><div class="label">' + a.label + '<small>' + a.hint + '</small></div>' +
      '<button class="bind' + (waiting ? ' waiting' : '') + '" data-bind="' + a.id + '">' +
      (waiting ? '按一个键…' : keyLabel(settings.bindings[a.id])) + '</button></div>';
  }

  elSettingsBody.innerHTML = h;
}

function syncSettingsUI() {
  if (!elSettingsBody) return;
  var ranges = elSettingsBody.querySelectorAll('[data-range]');
  for (var i = 0; i < ranges.length; i++) {
    var k = ranges[i].getAttribute('data-range');
    if (k && k in settings) ranges[i].value = settings[k];
  }
  var toggles = elSettingsBody.querySelectorAll('[data-toggle]');
  for (var j = 0; j < toggles.length; j++) {
    var key = toggles[j].getAttribute('data-toggle');
    if (settings[key]) toggles[j].classList.add('on');
    else toggles[j].classList.remove('on');
  }
}

function buildUpgradePanel() {
  if (!elUpgradeBody) return;
  if (elShardCount) elShardCount.textContent = String(progress.shards);
  var h = '';
  for (var i = 0; i < UPGRADES.length; i++) {
    var def = UPGRADES[i];
    var lv = upgrades[def.id] || 0;
    var maxed = lv >= def.max;
    var cost = upgradeCost(def);
    var poor = progress.shards < cost;
    h += '<div class="row"><div class="label">' + def.name +
      '<small>' + def.desc + ' · Lv ' + lv + '/' + def.max + '</small></div>' +
      '<button class="bind" data-upgrade="' + def.id + '"' +
      (maxed || poor ? ' disabled' : '') + '>' +
      (maxed ? '已满级' : cost + ' 结晶') + '</button></div>';
  }
  elUpgradeBody.innerHTML = h;
}

function isStandalone() {
  try {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  } catch (e) {}
  return typeof navigator !== 'undefined' && navigator.standalone === true;
}

function isIOS() {
  var ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  return /iPad|iPhone|iPod/.test(ua) ||
    (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroid() {
  var ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  return /Android/i.test(ua);
}

function buildInstallGuide() {
  if (!elInstallBody) return;
  var h = '';
  if (isStandalone()) {
    h = '<p>你已经在独立窗口里运行了，不需要再安装。</p>';
  } else if (isIOS()) {
    h = '<p>iPhone / iPad 请用 <b>Safari</b> 打开本页：</p>' +
      '<ol><li>点底部「分享」按钮</li><li>选择「添加到主屏幕」</li><li>确认名称后点「添加」</li></ol>' +
      '<p class="muted">首次打开需要联网缓存，之后可以离线启动。</p>';
  } else if (isAndroid()) {
    h = '<p>Android 请用 <b>Chrome / Edge</b> 打开本页：</p>' +
      '<ol><li>点右上角 <b>⋮</b> 菜单</li><li>选「安装应用」或「添加到主屏幕」</li><li>确认安装</li></ol>' +
      '<p class="muted">如果菜单里没有安装项，说明当前是微信 / QQ 等内置浏览器，请点右上角「在浏览器打开」后再试。</p>';
  } else {
    h = '<p>桌面浏览器：</p>' +
      '<ol><li>看地址栏右侧有没有 <b>安装图标</b>（显示器 + 向下箭头）</li><li>或打开浏览器菜单 →「应用」→「安装此站点」</li><li>Chrome 也可以 ⋮ →「保存并分享」→「安装页面为应用」</li></ol>' +
      '<p class="muted">安装后会出现在开始菜单 / 应用程序里，以独立窗口运行。</p>';
  }
  elInstallBody.innerHTML = h;
}

function updateInstallEntry() {
  if (elInstallBtn) elInstallBtn.style.display = isStandalone() ? 'none' : '';
}

function promptInstall() {
  if (isStandalone()) {
    showToast('已经在独立窗口中运行');
    return;
  }
  if (deferredInstall && typeof deferredInstall.prompt === 'function') {
    deferredInstall.prompt();
    var choice = deferredInstall.userChoice;
    deferredInstall = null;
    if (choice && choice.then) choice.then(function () { updateInstallEntry(); });
    return;
  }
  openPanel('install');
}

function openPanel(kind) {
  settingsWasPlaying = state === 'play';
  uiModal = true;
  if (state === 'play') state = 'pause';
  if (kind === 'settings') {
    if (elSettings) elSettings.classList.remove('hidden');
    buildSettingsPanel();
  } else if (kind === 'install') {
    if (elInstall) elInstall.classList.remove('hidden');
    buildInstallGuide();
  } else {
    if (elUpgrades) elUpgrades.classList.remove('hidden');
    buildUpgradePanel();
  }
  clearInput();
}

function openSettings() { openPanel('settings'); }
function openUpgrades() { openPanel('upgrades'); }

function closeModal() {
  if (!uiModal) return;
  uiModal = false;
  rebindAction = null;
  if (elSettings) elSettings.classList.add('hidden');
  if (elUpgrades) elUpgrades.classList.add('hidden');
  if (elInstall) elInstall.classList.add('hidden');
  if (settingsWasPlaying && state === 'pause') state = 'play';
  settingsWasPlaying = false;
  clearInput();
}

function closeSettings() { closeModal(); }

function onUpgradeClick(e) {
  var t = e.target;
  if (!t || !t.getAttribute) return;
  var id = t.getAttribute('data-upgrade');
  if (!id) return;
  if (buyUpgrade(id)) {
    sfx('pickup');
    buildUpgradePanel();
    showToast('强化成功');
  } else {
    sfx('hurt');
  }
}

function refreshSettings() {
  buildSettingsPanel();
}

function onPanelClick(e) {
  var t = e.target;
  if (!t || !t.getAttribute) return;
  var toggle = t.getAttribute('data-toggle');
  if (toggle) {
    settings[toggle] = !settings[toggle];
    if (toggle === 'colorblind') applyPalette();
    if (toggle === 'bloom') bloomEnabled = true;
    if (toggle === 'sim120') applySimRate();
    saveSettings();
    syncSettingsUI();
    if (toggle === 'autoaim' || toggle === 'flashes' || toggle === 'colorblind') sfx('pickup');
    return;
  }
  var bind = t.getAttribute('data-bind');
  if (bind) {
    rebindAction = bind;
    buildSettingsPanel();
    return;
  }
}

function onPanelInput(e) {
  var t = e.target;
  if (!t || !t.getAttribute) return;
  var range = t.getAttribute('data-range');
  if (!range) return;
  var v = parseFloat(t.value);
  settings[range] = v;
  if (range === 'volume') applyVolume();
  if (range === 'shake' && v > 0) addShake(3);
  saveSettings();
}

function updateOrientationHint() {
  if (!elRotate) return;
  if (IS_TOUCH && window.innerHeight > window.innerWidth * 1.02) elRotate.classList.remove('hidden');
  else elRotate.classList.add('hidden');
}

function initUI() {
  if (elPauseBtn) elPauseBtn.addEventListener('click', function () {
    if (uiModal) return;
    togglePause();
    sfx('pickup');
  });
  if (elSettingsBtn) elSettingsBtn.addEventListener('click', function () { openSettings(); });
  if (elInstallBtn) elInstallBtn.addEventListener('click', function () {
    if (uiModal) return;
    promptInstall();
  });
  var btnInstallClose = document.getElementById('btn-install-close');
  if (btnInstallClose) btnInstallClose.addEventListener('click', function () { closeModal(); });

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredInstall = event;
    updateInstallEntry();
  });
  window.addEventListener('appinstalled', function () {
    deferredInstall = null;
    updateInstallEntry();
    showToast('安装完成，可以从桌面图标启动');
  });
  updateInstallEntry();

  if (elUpgradesBtn) elUpgradesBtn.addEventListener('click', function () {
    if (uiModal) return;
    openUpgrades();
  });
  if (elUpgradeBody) elUpgradeBody.addEventListener('click', onUpgradeClick);
  var btnUpgradeClose = document.getElementById('btn-upgrade-close');
  if (btnUpgradeClose) btnUpgradeClose.addEventListener('click', function () { closeModal(); });
  if (elSettingsBody) {
    elSettingsBody.addEventListener('click', onPanelClick);
    elSettingsBody.addEventListener('input', onPanelInput);
  }
  var btnClose = document.getElementById('btn-close');
  if (btnClose) btnClose.addEventListener('click', function () { closeSettings(); });
  var btnReset = document.getElementById('btn-reset');
  if (btnReset) btnReset.addEventListener('click', function () {
    settings = defaultSettings();
    applyPalette();
    applyVolume();
    applySimRate();
    bloomEnabled = true;
    saveSettings();
    buildSettingsPanel();
    showToast('已恢复默认设置');
  });
}

/* ---------------- canvas screens ---------------- */

function pointIn(x, y, rx, ry, rw, rh) {
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

function roundRectPath(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function menuPointer(x, y) {
  for (var i = 0; i < menuRects.length; i++) {
    var r = menuRects[i];
    if (!pointIn(x, y, r.x, r.y, r.w, r.h)) continue;
    if (r.kind === 'stage') {
      if (!isStageUnlocked(r.i)) {
        showToast('先通关上一关才能解锁');
        sfx('hurt');
        return;
      }
      menuStage = r.i;
      saveLoadout();
      sfx('pickup');
    } else if (r.kind === 'weapon') {
      menuWeapon = r.i;
      saveLoadout();
      sfx('pickup');
    } else if (r.kind === 'start') {
      startGame(menuStage, menuWeapon);
    } else if (r.kind === 'install') {
      promptInstall();
    }
    return;
  }
}

function drawLock(cx, cy, s, color) {
  g.strokeStyle = color;
  g.lineWidth = Math.max(1.2, s * 0.16);
  g.beginPath();
  g.arc(cx, cy - s * 0.18, s * 0.34, Math.PI, 0);
  g.stroke();
  g.fillStyle = color;
  g.fillRect(cx - s * 0.48, cy - s * 0.02, s * 0.96, s * 0.72);
  g.fillStyle = 'rgba(6,12,20,0.9)';
  g.beginPath();
  g.arc(cx, cy + s * 0.26, s * 0.11, 0, TAU);
  g.fill();
}

function drawCheck(cx, cy, s, color) {
  g.strokeStyle = color;
  g.lineWidth = Math.max(1.6, s * 0.22);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - s * 0.45, cy);
  g.lineTo(cx - s * 0.1, cy + s * 0.34);
  g.lineTo(cx + s * 0.5, cy - s * 0.36);
  g.stroke();
}

function drawStageCard(x, y, w, h, i, sc) {
  var st = STAGES[i];
  var sel = menuStage === i;
  var unlocked = isStageUnlocked(i);
  var cleared = !st.endless && isStageCleared(i);
  var hov = pointer.active && pointIn(pointer.x, pointer.y, x, y, w, h);

  roundRectPath(g, x, y, w, h, 10);
  g.fillStyle = sel ? 'rgba(26,62,98,0.6)' : 'rgba(9,22,38,0.6)';
  g.fill();

  g.save();
  roundRectPath(g, x, y, w, h, 10);
  g.clip();
  g.globalAlpha = unlocked ? 1 : 0.45;

  // 编号 / ∞
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillStyle = st.tint;
  g.font = '700 ' + Math.round(clamp(h * 0.2, 11, 17)) + 'px ' + FONT;
  g.fillText(st.endless ? '∞' : pad2(st.num), x + 10, y + h * 0.24);

  // 名称
  g.fillStyle = sel ? COL.white : 'rgba(220,240,255,0.82)';
  g.font = '700 ' + Math.round(clamp(h * 0.19, 10, 16)) + 'px ' + FONT;
  g.fillText(st.name, x + 10, y + h * 0.53);

  // 波次 / 状态
  g.fillStyle = 'rgba(150,205,235,0.5)';
  g.font = '600 ' + Math.round(clamp(h * 0.105, 6.5, 9.5)) + 'px ' + FONT;
  g.fillText(st.endless ? '无限波次' : (unlocked ? ((st.waves + 1) + ' 波') : '未解锁'),
    x + 10, y + h * 0.79);

  // 右上角状态标
  if (!unlocked) drawLock(x + w - 15, y + 15, 8, 'rgba(190,225,245,0.75)');
  else if (cleared) drawCheck(x + w - 15, y + 15, 8, COL.green);

  g.restore();

  roundRectPath(g, x, y, w, h, 10);
  g.lineWidth = sel ? 2 : 1;
  g.strokeStyle = sel ? st.tint : (hov ? 'rgba(120,200,235,0.55)' : 'rgba(80,150,190,0.22)');
  if (sel) glowOn(g, st.tint, 16);
  g.stroke();
  glowOff(g);
}

function drawWeaponCard(x, y, w, h, i, sc) {
  var wp = WEAPONS[i];
  var sel = menuWeapon === i;
  var hov = pointer.active && pointIn(pointer.x, pointer.y, x, y, w, h);

  roundRectPath(g, x, y, w, h, 10);
  g.fillStyle = sel ? 'rgba(26,62,98,0.6)' : 'rgba(9,22,38,0.6)';
  g.fill();

  g.save();
  roundRectPath(g, x, y, w, h, 10);
  g.clip();

  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillStyle = sel ? COL.white : 'rgba(220,240,255,0.78)';
  g.font = '700 ' + Math.round(clamp(h * 0.2, 12, 19)) + 'px ' + FONT;
  g.fillText(wp.name, x + 10, y + h * 0.25);

  g.fillStyle = 'rgba(150,205,235,0.55)';
  g.font = '500 ' + Math.round(clamp(h * 0.105, 7.5, 10.5)) + 'px ' + FONT;
  g.fillText(wp.desc, x + 10, y + h * 0.52);

  var s = wp.stats;
  g.fillStyle = 'rgba(150,205,235,0.38)';
  g.font = '600 ' + Math.round(clamp(h * 0.1, 7, 10)) + 'px ' + FONT;
  g.fillText('伤 ' + s[0] + ' · 速 ' + s[1] + ' · 覆 ' + s[2], x + 10, y + h * 0.79);
  g.restore();

  roundRectPath(g, x, y, w, h, 10);
  g.lineWidth = sel ? 2 : 1;
  g.strokeStyle = sel ? COL.cyan : (hov ? 'rgba(120,200,235,0.55)' : 'rgba(80,150,190,0.22)');
  if (sel) glowOn(g, COL.cyan, 16);
  g.stroke();
  glowOff(g);
}

function drawStartButton(x, y, w, h, sc) {
  var hov = pointer.active && pointIn(pointer.x, pointer.y, x, y, w, h);
  var pulse = 0.75 + 0.25 * Math.sin(time * 3);
  roundRectPath(g, x, y, w, h, 12);
  g.fillStyle = hov ? 'rgba(40,190,255,0.3)' : 'rgba(40,190,255,0.13)';
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = 'rgba(90,220,255,' + (hov ? 0.95 : 0.55 + 0.2 * pulse) + ')';
  glowOn(g, COL.cyan, hov ? 20 : 10);
  g.stroke();
  glowOff(g);

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = COL.white;
  g.font = '700 ' + Math.round(16 * sc) + 'px ' + FONT;
  g.fillText('开始任务  ▶', x + w / 2, y + h / 2 + 1);
}

function drawTitle() {
  var W = VW;
  var H = VH;
  var sc = clamp(Math.min(W / 1280, H / 800), 0.6, 1.15);
  menuRects.length = 0;

  g.save();
  g.fillStyle = 'rgba(3,6,13,0.62)';
  g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  var cy = H * 0.105;
  g.font = '800 ' + Math.round(68 * sc) + 'px ' + FONT;
  glowOn(g, COL.cyan, 28);
  g.fillStyle = COL.white;
  g.fillText('NEON RIFT', W / 2, cy);
  glowOff(g);
  g.font = '700 ' + Math.round(13 * sc) + 'px ' + FONT;
  g.fillStyle = COL.pink;
  g.fillText('霓 虹 裂 隙', W / 2, cy + 34 * sc);

  // ----- stage row -----
  var labelY = H * 0.225;
  g.font = '600 ' + Math.round(10.5 * sc) + 'px ' + FONT;
  g.fillStyle = 'rgba(130,200,235,0.55)';
  g.fillText('选择关卡 · STAGE', W / 2, labelY);

  var cardH = clamp(H * 0.13, 46, 86);
  var gap = Math.min(12, W * 0.01);
  var stageCount = STAGES.length;
  var cardW = Math.min(150, (W - 100) / stageCount - gap);
  var stageX = W / 2 - (cardW * stageCount + gap * (stageCount - 1)) / 2;
  var stageY = labelY + 15 * sc;
  for (var i = 0; i < STAGES.length; i++) {
    var sx = stageX + i * (cardW + gap);
    drawStageCard(sx, stageY, cardW, cardH, i, sc);
    menuRects.push({ kind: 'stage', i: i, x: sx, y: stageY, w: cardW, h: cardH });
  }

  // ----- weapon row -----
  var wLabelY = stageY + cardH + H * 0.05;
  g.font = '600 ' + Math.round(10.5 * sc) + 'px ' + FONT;
  g.fillStyle = 'rgba(130,200,235,0.55)';
  g.fillText('射击模式 · WEAPON', W / 2, wLabelY);

  var wH = clamp(H * 0.165, 54, 108);
  var wgap = Math.min(12, W * 0.01);
  var wW = Math.min(172, (W - 100) / 4 - wgap);
  var wepX = W / 2 - (wW * 4 + wgap * 3) / 2;
  var wepY = wLabelY + 15 * sc;
  for (var j = 0; j < WEAPONS.length; j++) {
    var wx = wepX + j * (wW + wgap);
    drawWeaponCard(wx, wepY, wW, wH, j, sc);
    menuRects.push({ kind: 'weapon', i: j, x: wx, y: wepY, w: wW, h: wH });
  }

  // ----- start button -----
  var bw = Math.max(180, Math.min(270, W * 0.27));
  var bh = clamp(H * 0.062, 38, 50);
  var bx = W / 2 - bw / 2;
  var by = Math.max(wepY + wH + H * 0.045, H * 0.7);
  drawStartButton(bx, by, bw, bh, sc);
  menuRects.push({ kind: 'start', x: bx, y: by, w: bw, h: bh });

  g.font = '600 ' + Math.round(11 * sc) + 'px ' + FONT;
  g.fillStyle = 'rgba(160,220,245,0.5)';
  var selStage = STAGES[menuStage];
  var selMeta = selStage.endless
    ? '∞ 波'
    : ((selStage.waves + 1) + ' 波 · 最佳 ' + pad(bestByStage[menuStage] || 0));
  g.fillText((selStage.num ? pad2(selStage.num) + ' ' : '∞ ') + selStage.name + ' · ' + selMeta +
    '   →   ' + (selStage.endless ? '活下去' : '目标 ' + selStage.bossName) +
    '   ·   结晶 ' + progress.shards,
    W / 2, by + bh + 24 * sc);

  // 安装入口（独立窗口运行时隐藏）
  if (!isStandalone()) {
    var installY = by + bh + 48 * sc;
    g.font = '600 ' + Math.round(10.5 * sc) + 'px ' + FONT;
    g.fillStyle = 'rgba(120,220,255,0.62)';
    g.fillText('安装到桌面 / 手机  ⤓', W / 2, installY);
    menuRects.push({ kind: 'install', x: W / 2 - 90, y: installY - 12 * sc, w: 180, h: 22 * sc });
  }

  // ----- footer -----
  g.fillStyle = 'rgba(150,210,240,0.45)';
  g.font = '500 ' + Math.round(10 * sc) + 'px ' + FONT;
  g.fillText(IS_TOUCH ? '点选关卡与射击模式，然后点「开始任务」' : 'WASD 移动 · 鼠标瞄准 / 左键射击 · Shift 冲刺 · 方向键选择',
    W / 2, H - 30 * sc);
  g.fillStyle = 'rgba(150,210,240,0.32)';
  g.font = '500 ' + Math.round(9 * sc) + 'px ' + FONT;
  g.fillText('BEST ' + pad(best) + '   ·   ' + (IS_TOUCH ? '触屏自动瞄准' : '← → 关卡 · ↑ ↓ 射击模式 · 空格 开始'),
    W / 2, H - 15 * sc);

  g.restore();
}

function drawPause() {
  g.save();
  g.fillStyle = 'rgba(3,6,13,0.66)';
  g.fillRect(0, 0, VW, VH);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '800 58px ' + FONT;
  glowOn(g, COL.cyan, 24);
  g.fillStyle = COL.white;
  g.fillText('PAUSED', VW / 2, VH * 0.4);
  glowOff(g);
  g.font = '500 14px ' + FONT;
  g.fillStyle = 'rgba(170,225,250,0.75)';
  g.fillText(IS_TOUCH ? '点击继续' : 'P / Esc 或点击继续  ·  ⚙ 进入设置', VW / 2, VH * 0.4 + 56);
  g.restore();
}

function drawDead() {
  var a = clamp((deadTimer - 0.45) / 0.35, 0, 1);
  g.save();
  g.globalAlpha = a;
  g.fillStyle = 'rgba(3,6,13,0.74)';
  g.fillRect(0, 0, VW, VH);
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  g.font = '800 ' + Math.round(Math.min(56, VW * 0.05)) + 'px ' + FONT;
  glowOn(g, COL.pink, 26);
  g.fillStyle = COL.pink;
  g.fillText('GAME OVER', VW / 2, VH * 0.3);
  glowOff(g);

  g.font = '700 44px ' + FONT;
  g.fillStyle = COL.white;
  g.fillText(pad(score), VW / 2, VH * 0.43);

  g.font = '600 14px ' + FONT;
  g.fillStyle = 'rgba(170,225,250,0.7)';
  g.fillText(stageCfg.name + ' · WAVE ' + wave + (stageCfg.endless ? '' : '/' + (stageCfg.waves + 1)) + ' · BEST ' + pad(best), VW / 2, VH * 0.43 + 42);

  g.font = '600 12px ' + FONT;
  g.fillStyle = 'rgba(150,205,235,0.5)';
  g.fillText('本关最佳 ' + pad(bestByStage[stageIndex] || 0), VW / 2, VH * 0.43 + 66);

  if (Math.sin(time * 3.2) > -0.35) {
    g.font = '700 16px ' + FONT;
    g.fillStyle = COL.cyan;
    g.fillText('R 重试  ·  点击 / 空格 返回主界面', VW / 2, VH * 0.6);
  }
  g.restore();
}

function drawClear() {
  var a = clamp((clearTimer - 0.35) / 0.4, 0, 1);
  g.save();
  g.globalAlpha = a;
  g.fillStyle = 'rgba(3,6,13,0.74)';
  g.fillRect(0, 0, VW, VH);

  g.textAlign = 'center';
  g.textBaseline = 'middle';

  g.font = '800 ' + Math.round(Math.min(58, VW * 0.055)) + 'px ' + FONT;
  glowOn(g, COL.gold, 30);
  g.fillStyle = COL.white;
  g.fillText('STAGE CLEAR', VW / 2, VH * 0.27);
  glowOff(g);

  g.font = '700 16px ' + FONT;
  g.fillStyle = stageCfg.tint;
  g.fillText(pad2(stageCfg.num) + ' · ' + stageCfg.name + ' · ' + stageCfg.en, VW / 2, VH * 0.27 + 42);

  g.font = '700 42px ' + FONT;
  g.fillStyle = COL.white;
  g.fillText(pad(score), VW / 2, VH * 0.42);

  g.font = '600 13px ' + FONT;
  g.fillStyle = clearNewBest ? COL.gold : 'rgba(170,225,250,0.65)';
  g.fillText(clearNewBest ? 'NEW RECORD' : ('本关最佳 ' + pad(bestByStage[stageIndex] || 0)), VW / 2, VH * 0.42 + 34);

  g.font = '700 18px ' + FONT;
  g.fillStyle = COL.gold;
  g.fillText('+' + clearReward + ' 结晶', VW / 2, VH * 0.42 + 68);

  var next = null;
  if (stageIndex + 1 < STAGES.length && !STAGES[stageIndex + 1].endless) next = STAGES[stageIndex + 1];
  if (clearFirst && next) {
    g.font = '600 13px ' + FONT;
    g.fillStyle = COL.cyan;
    g.fillText('已解锁 ' + pad2(next.num) + ' · ' + next.name, VW / 2, VH * 0.42 + 94);
  }

  g.font = '600 14px ' + FONT;
  g.fillStyle = COL.cyan;
  g.fillText(next ? 'N 下一关  ·  空格 / 点击 返回主界面' : '空格 / 点击 返回主界面', VW / 2, VH * 0.63);
  g.restore();
}

function drawTutorial() {
  if (state !== 'play' || wave !== 1 || stageIndex !== 0) return;
  var t = time - waveStartTime;
  if (score > 0 || t > 7.5) return;
  var a = clamp((7.5 - t) / 1.2, 0, 1) * clamp(t / 0.4, 0, 1);
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a * 0.9;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '700 15px ' + FONT;
  g.fillStyle = 'rgba(190,235,255,0.85)';
  g.fillText('按住 左键 / 空格 射击', VW / 2, VH * 0.55);
  g.font = '500 12px ' + FONT;
  g.fillStyle = 'rgba(150,205,235,0.6)';
  g.fillText('WASD 移动 · Shift 冲刺', VW / 2, VH * 0.55 + 24);
  g.restore();
}

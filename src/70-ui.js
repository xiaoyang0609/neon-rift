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
var toastTimer = null;

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

function openSettings() {
  settingsWasPlaying = state === 'play';
  uiModal = true;
  if (state === 'play') state = 'pause';
  if (elSettings) elSettings.classList.remove('hidden');
  buildSettingsPanel();
  clearInput();
}

function closeSettings() {
  uiModal = false;
  rebindAction = null;
  if (elSettings) elSettings.classList.add('hidden');
  if (settingsWasPlaying && state === 'pause') state = 'play';
  settingsWasPlaying = false;
  clearInput();
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
      menuStage = r.i;
      saveLoadout();
      sfx('pickup');
    } else if (r.kind === 'weapon') {
      menuWeapon = r.i;
      saveLoadout();
      sfx('pickup');
    } else if (r.kind === 'start') {
      startGame(menuStage, menuWeapon);
    }
    return;
  }
}

function drawStageCard(x, y, w, h, i, sc) {
  var st = STAGES[i];
  var sel = menuStage === i;
  var hov = pointer.active && pointIn(pointer.x, pointer.y, x, y, w, h);

  roundRectPath(g, x, y, w, h, 10);
  g.fillStyle = sel ? 'rgba(26,62,98,0.6)' : 'rgba(9,22,38,0.6)';
  g.fill();

  g.save();
  roundRectPath(g, x, y, w, h, 10);
  g.clip();

  // difficulty pips
  for (var p = 0; p < 3; p++) {
    g.fillStyle = p <= i ? st.tint : 'rgba(255,255,255,0.12)';
    g.fillRect(x + w - 14 - (2 - p) * 8, y + 9, 5, 5);
  }

  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillStyle = sel ? COL.white : 'rgba(220,240,255,0.78)';
  g.font = '700 ' + Math.round(clamp(h * 0.22, 12, 21)) + 'px ' + FONT;
  g.fillText(st.name, x + 12, y + h * 0.28);

  g.fillStyle = 'rgba(150,205,235,0.55)';
  g.font = '600 ' + Math.round(clamp(h * 0.115, 7.5, 11)) + 'px ' + FONT;
  g.fillText(st.en + ' · ' + (st.waves + 1) + ' WAVES', x + 12, y + h * 0.55);

  g.fillStyle = 'rgba(150,205,235,0.4)';
  g.font = '500 ' + Math.round(clamp(h * 0.11, 7, 10.5)) + 'px ' + FONT;
  g.fillText(bestByStage[i] ? ('最佳 ' + bestByStage[i]) : '未挑战', x + 12, y + h * 0.8);
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

  var cardH = clamp(H * 0.155, 52, 104);
  var gap = Math.min(14, W * 0.012);
  var cardW = Math.min(210, (W - 100) / 3 - gap);
  var stageX = W / 2 - (cardW * 3 + gap * 2) / 2;
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
  g.fillText(STAGES[menuStage].name + ' · ' + WEAPONS[menuWeapon].name + '   →   目标 ' + STAGES[menuStage].bossName,
    W / 2, by + bh + 24 * sc);

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
  g.fillText(stageCfg.name + ' · WAVE ' + wave + '/' + (stageCfg.waves + 1) + ' · BEST ' + pad(best), VW / 2, VH * 0.43 + 42);

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
  g.fillText('STAGE CLEAR', VW / 2, VH * 0.3);
  glowOff(g);

  g.font = '700 16px ' + FONT;
  g.fillStyle = stageCfg.tint;
  g.fillText(stageCfg.name + ' · ' + stageCfg.en, VW / 2, VH * 0.3 + 44);

  g.font = '700 42px ' + FONT;
  g.fillStyle = COL.white;
  g.fillText(pad(score), VW / 2, VH * 0.46);

  g.font = '600 13px ' + FONT;
  g.fillStyle = clearNewBest ? COL.gold : 'rgba(170,225,250,0.65)';
  g.fillText(clearNewBest ? 'NEW RECORD' : ('本关最佳 ' + pad(bestByStage[stageIndex] || 0)), VW / 2, VH * 0.46 + 38);

  g.font = '600 14px ' + FONT;
  g.fillStyle = COL.cyan;
  var hint = stageIndex < STAGES.length - 1 ? 'N 下一关  ·  空格 / 点击 返回主界面' : '空格 / 点击 返回主界面';
  g.fillText(hint, VW / 2, VH * 0.6);
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

/* =========================================================
   60 — render: world, bloom composite, HUD
   ========================================================= */

function ecolOf(e) {
  if (e.type === 'warden') return bossCol(e);
  if (e.affix === 'volatile') return COL.orange;
  if (e.affix === 'shield') return COL.shield;
  if (e.affix === 'swift') return COL.gold;
  if (e.affix === 'split') return COL.violet;
  return COL[e.type] || COL.pink;
}

function bossCol(e) {
  if (e.variant === 1) return COL.violet;
  if (e.variant === 2) return COL.orange;
  return COL.red;
}

function affixColor(a) {
  if (a === 'shield') return COL.shield;
  if (a === 'swift') return COL.gold;
  if (a === 'split') return COL.violet;
  if (a === 'volatile') return COL.orange;
  return COL.gold;
}

function render() {
  var useBloom = settings.bloom && bloomEnabled && sceneCtx && bloomCtx;
  var t = useBloom ? sceneCtx : ctx;

  t.setTransform(1, 0, 0, 1, 0, 0);
  t.clearRect(0, 0, canvas.width, canvas.height);
  if (bgCanvas) t.drawImage(bgCanvas, 0, 0);
  else { t.fillStyle = '#04070e'; t.fillRect(0, 0, canvas.width, canvas.height); }
  t.setTransform(DPR, 0, 0, DPR, 0, 0);

  g = t;

  drawStars();
  drawGrid();

  var sx = shakeX + (Math.random() * 2 - 1) * shakeMag * 0.55;
  var sy = shakeY + (Math.random() * 2 - 1) * shakeMag * 0.55;

  g.save();
  g.translate(sx, sy);
  drawRings();
  drawPickups();
  drawSpawns();
  drawEnemies();
  drawBullets();
  if (state === 'play' || state === 'pause' || (state === 'dead' && deadTimer < 0.35)) drawPlayer();
  drawParticles();
  drawFloats();
  g.restore();

  if (useBloom) compositeBloom();

  g = ctx;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawVignette();
  drawHUD();
  drawStick();
  drawTutorial();
  if (state === 'title') drawTitle();
  if (state === 'pause') drawPause();
  if (state === 'dead' && deadTimer > 0.45) drawDead();
  if (state === 'clear' && clearTimer > 0.35) drawClear();
}

function compositeBloom() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(sceneCanvas, 0, 0);

  bloomCtx.setTransform(1, 0, 0, 1, 0, 0);
  bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
  bloomCtx.filter = 'blur(2.5px)';
  bloomCtx.drawImage(sceneCanvas, 0, 0, bloomCanvas.width, bloomCanvas.height);
  bloomCtx.filter = 'none';

  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.52;
  ctx.drawImage(bloomCanvas, 0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/* ---------------- background ---------------- */

function drawStars() {
  g.save();
  for (var i = 0; i < stars.length; i++) {
    var s = stars[i];
    var a = 0.22 + 0.4 * (0.5 + 0.5 * Math.sin(s.tw)) * s.z;
    g.fillStyle = 'rgba(190,230,255,' + a.toFixed(3) + ')';
    g.fillRect(s.x, s.y, s.z * 1.8, s.z * 1.8);
  }
  g.restore();
}

function drawGrid() {
  var step = 64;
  var off = (time * 7) % step;
  g.save();
  g.strokeStyle = 'rgba(80,190,255,0.055)';
  g.lineWidth = 1;
  g.beginPath();
  for (var x = -step; x < VW + step; x += step) { g.moveTo(x, 0); g.lineTo(x, VH); }
  for (var y = -step + off; y < VH + step; y += step) { g.moveTo(0, y); g.lineTo(VW, y); }
  g.stroke();
  g.restore();
}

/* ---------------- effects ---------------- */

function drawRings() {
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (var i = 0; i < rings.length; i++) {
    var r = rings[i];
    var t = clamp(r.t / r.max, 0, 1);
    var rad = r.r0 + (r.r1 - r.r0) * t;
    g.globalAlpha = (1 - t) * 0.8;
    g.strokeStyle = r.color;
    g.lineWidth = r.w * (1 - t * 0.7);
    g.beginPath();
    g.arc(r.x, r.y, rad, 0, TAU);
    g.stroke();
  }
  g.restore();
}

function drawParticles() {
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    var a = clamp(p.life / p.max, 0, 1);
    g.globalAlpha = a * 0.9;
    g.fillStyle = p.color;
    g.beginPath();
    g.arc(p.x, p.y, p.r * (0.4 + a * 0.8), 0, TAU);
    g.fill();
  }
  g.restore();
}

function drawFloats() {
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (var i = 0; i < floats.length; i++) {
    var f = floats[i];
    var t = f.t / f.max;
    g.globalAlpha = 1 - t;
    g.fillStyle = f.color;
    g.font = '700 ' + f.size + 'px ' + FONT;
    g.fillText(f.text, f.x, f.y - t * 36);
  }
  g.restore();
}

function drawSpawns() {
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (var i = 0; i < spawns.length; i++) {
    var s = spawns[i];
    var p = 1 - s.t / s.max;
    var sz = 18 + Math.sin(time * 12) * 3;
    g.globalAlpha = 0.35 + p * 0.5;
    g.strokeStyle = s.type === 'warden' ? COL.red : COL.pink;
    g.lineWidth = 2;
    g.beginPath(); g.arc(s.x, s.y, sz, 0, TAU); g.stroke();
    g.beginPath(); g.arc(s.x, s.y, sz * 1.6, 0, TAU); g.stroke();
    g.globalAlpha = 0.12 + p * 0.28;
    g.beginPath(); g.arc(s.x, s.y, sz * 2.4, 0, TAU); g.stroke();
  }
  g.restore();
}

/* ---------------- pickups ---------------- */

function pickupColor(type) {
  if (type === 'heal') return COL.heal;
  if (type === 'rapid') return COL.rapid;
  if (type === 'triple') return COL.triple;
  return COL.shield;
}

function drawPickups() {
  for (var i = 0; i < pickups.length; i++) {
    var p = pickups[i];
    var col = pickupColor(p.type);
    var s = 10 + Math.sin(p.t * 4) * 1.5;
    var alpha = p.life < 3 ? (0.35 + 0.65 * Math.abs(Math.sin(p.t * 8))) : 1;
    g.save();
    g.globalAlpha = alpha;
    g.translate(p.x, p.y);
    g.rotate(p.t * 1.2);
    g.strokeStyle = col;
    g.lineWidth = 2;
    glowOn(g, col, 12);
    poly(g, 0, 0, s + 4, 4, 0);
    g.stroke();
    glowOff(g);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    poly(g, 0, 0, s + 4, 4, 0);
    g.fill();
    g.rotate(-p.t * 1.2);

    g.fillStyle = col;
    if (p.type === 'heal') {
      g.fillRect(-5, -1.6, 10, 3.2);
      g.fillRect(-1.6, -5, 3.2, 10);
    } else if (p.type === 'rapid') {
      g.beginPath();
      g.moveTo(2, -7); g.lineTo(-4, 1); g.lineTo(0, 1); g.lineTo(-2, 7); g.lineTo(5, -1); g.lineTo(1, -1);
      g.closePath();
      g.fill();
    } else if (p.type === 'triple') {
      g.beginPath(); g.arc(-4.5, 2, 2, 0, TAU); g.fill();
      g.beginPath(); g.arc(0, -4, 2, 0, TAU); g.fill();
      g.beginPath(); g.arc(4.5, 2, 2, 0, TAU); g.fill();
    } else {
      poly(g, 0, 0, 6, 6, Math.PI / 6);
      g.strokeStyle = col;
      g.lineWidth = 2;
      g.stroke();
      g.beginPath(); g.arc(0, 0, 2, 0, TAU); g.fill();
    }
    g.restore();
  }
}

/* ---------------- enemies ---------------- */

function drawEnemies() {
  for (var i = 0; i < enemies.length; i++) drawEnemy(enemies[i]);
}

function drawEnemy(e) {
  var col = e.hit > 0 ? COL.white : ecolOf(e);
  g.save();
  g.translate(e.x, e.y);
  g.lineWidth = 2;

  if (e.type === 'drone' || e.type === 'mini') {
    g.rotate(e.ang);
    g.fillStyle = 'rgba(255,61,139,0.10)';
    poly(g, 0, 0, e.r, 3, 0); g.fill();
    g.strokeStyle = col;
    glowOn(g, col, 10);
    poly(g, 0, 0, e.r, 3, 0); g.stroke();
    glowOff(g);
    g.fillStyle = col;
    g.beginPath(); g.arc(e.r * 0.25, 0, e.r * 0.16, 0, TAU); g.fill();

  } else if (e.type === 'weaver') {
    g.rotate(e.ang);
    g.fillStyle = 'rgba(255,209,102,0.09)';
    poly(g, 0, 0, e.r, 6, 0); g.fill();
    g.strokeStyle = col;
    glowOn(g, col, 10);
    poly(g, 0, 0, e.r, 6, 0); g.stroke();
    poly(g, 0, 0, e.r * 0.5, 6, Math.PI / 6); g.stroke();
    glowOff(g);

  } else if (e.type === 'splitter') {
    g.rotate(e.ang);
    g.fillStyle = 'rgba(157,107,255,0.11)';
    poly(g, 0, 0, e.r, 8, 0); g.fill();
    g.strokeStyle = col;
    glowOn(g, col, 12);
    poly(g, 0, 0, e.r, 8, 0); g.stroke();
    poly(g, 0, 0, e.r * 0.55, 8, Math.PI / 8); g.stroke();
    glowOff(g);

  } else if (e.type === 'sniper') {
    g.rotate(e.ang);
    g.fillStyle = 'rgba(255,159,67,0.10)';
    poly(g, 0, 0, e.r, 4, 0); g.fill();
    g.strokeStyle = col;
    glowOn(g, col, 12);
    poly(g, 0, 0, e.r, 4, 0); g.stroke();
    glowOff(g);
    g.strokeStyle = col;
    g.beginPath();
    g.arc(0, 0, e.r * 0.42, 0, TAU);
    g.stroke();

  } else if (e.type === 'bomber') {
    var pulse = e.fuse >= 0 ? (0.5 + 0.5 * Math.sin(time * 30)) : 0.4;
    g.fillStyle = 'rgba(255,93,61,' + (0.1 + pulse * 0.18) + ')';
    g.beginPath(); g.arc(0, 0, e.r, 0, TAU); g.fill();
    g.strokeStyle = e.fuse >= 0 ? COL.white : col;
    g.lineWidth = 2;
    glowOn(g, col, 12);
    g.beginPath(); g.arc(0, 0, e.r, 0, TAU); g.stroke();
    for (var k = 0; k < 4; k++) {
      var a = e.ang + k * Math.PI / 2;
      g.beginPath();
      g.moveTo(Math.cos(a) * e.r * 0.6, Math.sin(a) * e.r * 0.6);
      g.lineTo(Math.cos(a) * (e.r + 6), Math.sin(a) * (e.r + 6));
      g.stroke();
    }
    glowOff(g);
    if (e.fuse >= 0) {
      g.strokeStyle = 'rgba(255,255,255,' + (0.35 + pulse * 0.5) + ')';
      g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, e.r + 10 + (1 - e.fuse / 0.75) * 22, 0, TAU); g.stroke();
    }

  } else if (e.type === 'warden') {
    var wc = e.hit > 0 ? COL.white : (e.enraged ? '#ff8fa0' : bossCol(e));
    g.fillStyle = e.enraged ? 'rgba(255,77,94,0.18)' : 'rgba(255,77,94,0.1)';
    poly(g, 0, 0, e.r, 6, e.ang); g.fill();
    g.strokeStyle = wc;
    g.lineWidth = 3;
    glowOn(g, wc, 18);
    poly(g, 0, 0, e.r, 6, e.ang); g.stroke();
    poly(g, 0, 0, e.r * 0.72, 6, -e.ang * 1.4); g.stroke();
    glowOff(g);
    var core = 0.6 + 0.4 * Math.sin(time * (e.enraged ? 9 : 5));
    g.fillStyle = 'rgba(255,77,94,' + (0.4 + core * 0.4) + ')';
    g.beginPath(); g.arc(0, 0, e.r * 0.3 * core + 6, 0, TAU); g.fill();
    g.fillStyle = COL.white;
    g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill();
  }

  g.restore();

  // sniper laser telegraph (drawn in world space)
  if (e.type === 'sniper' && e.charge > 0) {
    var p2 = 1 - e.charge / 0.85;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(255,159,67,' + (0.1 + p2 * 0.5) + ')';
    g.lineWidth = 1 + p2 * 2;
    g.setLineDash([10, 9]);
    g.lineDashOffset = -time * 60;
    g.beginPath();
    g.moveTo(e.x, e.y);
    g.lineTo(e.x + Math.cos(e.aimAngle) * 900, e.y + Math.sin(e.aimAngle) * 900);
    g.stroke();
    g.setLineDash([]);
    g.restore();
  }

  if (e.elite) drawEliteMarks(e);
}

function drawEliteMarks(e) {
  g.save();
  g.translate(e.x, e.y);
  g.globalAlpha = 0.9;
  g.strokeStyle = COL.gold;
  g.lineWidth = 1.4;
  g.setLineDash([4, 6]);
  g.beginPath();
  g.arc(0, 0, e.r + 9, time * 1.6, time * 1.6 + TAU);
  g.stroke();
  g.setLineDash([]);

  g.fillStyle = affixColor(e.affix);
  g.beginPath();
  g.arc(0, -e.r - 12, 2.6, 0, TAU);
  g.fill();

  if (e.shield > 0) {
    g.strokeStyle = COL.shield;
    g.lineWidth = 2;
    for (var i = 0; i < e.shield; i++) {
      g.beginPath();
      g.arc(0, 0, e.r + 16 + i * 3, time * 2 + i * (TAU / 3), time * 2 + i * (TAU / 3) + 0.8);
      g.stroke();
    }
  }
  g.restore();
}

/* ---------------- bullets ---------------- */

function drawBullets() {
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (var i = 0; i < bullets.length; i++) {
    var b = bullets[i];
    var tx = b.x - b.vx * 0.02;
    var ty = b.y - b.vy * 0.02;
    g.strokeStyle = b.color || 'rgba(63,230,255,0.85)';
    g.lineWidth = b.r > 5 ? 5 : 3;
    g.beginPath(); g.moveTo(tx, ty); g.lineTo(b.x, b.y); g.stroke();
    g.fillStyle = COL.white;
    g.beginPath(); g.arc(b.x, b.y, Math.max(2.2, b.r * 0.55), 0, TAU); g.fill();
  }
  for (var j = 0; j < ebullets.length; j++) {
    var eb = ebullets[j];
    g.strokeStyle = 'rgba(255,80,110,0.35)';
    g.lineWidth = eb.r * 1.6;
    g.beginPath(); g.moveTo(eb.px, eb.py); g.lineTo(eb.x, eb.y); g.stroke();

    g.fillStyle = 'rgba(20,0,8,0.85)';
    g.beginPath(); g.arc(eb.x, eb.y, eb.r + 1.6, 0, TAU); g.fill();

    g.fillStyle = 'rgba(255,110,140,0.95)';
    g.beginPath(); g.arc(eb.x, eb.y, eb.r, 0, TAU); g.fill();

    g.fillStyle = 'rgba(255,235,245,0.95)';
    g.beginPath(); g.arc(eb.x, eb.y, eb.r * 0.45, 0, TAU); g.fill();
  }
  g.restore();
}

/* ---------------- player ---------------- */

function drawPlayer() {
  var p = player;
  g.save();
  var blink = p.invuln > 0 && Math.floor(time * 18) % 2 === 0;
  g.globalAlpha = blink ? 0.4 : 1;

  // under-glow
  g.save();
  g.globalCompositeOperation = 'lighter';
  var pg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, 50);
  pg.addColorStop(0, 'rgba(63,230,255,0.15)');
  pg.addColorStop(1, 'rgba(63,230,255,0)');
  g.fillStyle = pg;
  g.beginPath(); g.arc(p.x, p.y, 50, 0, TAU); g.fill();
  g.restore();

  // engine trail
  if (p.thrust > 0.12) {
    var back = p.aim + Math.PI;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 3; i++) {
      var o = rand(-6, 6);
      g.fillStyle = 'rgba(63,230,255,' + (0.1 + p.thrust * 0.18) + ')';
      g.beginPath();
      g.arc(p.x + Math.cos(back) * 16 + Math.cos(back + Math.PI / 2) * o,
        p.y + Math.sin(back) * 16 + Math.sin(back + Math.PI / 2) * o,
        5 + Math.random() * 4, 0, TAU);
      g.fill();
    }
    g.restore();
  }

  g.translate(p.x, p.y);
  g.rotate(p.aim);

  g.beginPath();
  g.moveTo(20, 0);
  g.lineTo(-12, -11);
  g.lineTo(-6, 0);
  g.lineTo(-12, 11);
  g.closePath();
  g.fillStyle = 'rgba(30,200,255,0.18)';
  g.fill();
  g.strokeStyle = p.invuln > 0 ? COL.white : COL.cyan;
  g.lineWidth = 2;
  glowOn(g, COL.cyan, 18);
  g.stroke();
  glowOff(g);

  g.fillStyle = COL.white;
  g.beginPath(); g.arc(2, 0, 3, 0, TAU); g.fill();
  g.restore();

  // shield bubble
  if (p.shield > 0) {
    g.save();
    g.strokeStyle = COL.shield;
    g.globalAlpha = 0.55 + 0.2 * Math.sin(time * 5);
    g.lineWidth = 1.5;
    g.beginPath(); g.arc(p.x, p.y, p.r + 20, 0, TAU); g.stroke();
    g.globalAlpha = 0.12;
    g.fillStyle = COL.shield;
    g.beginPath(); g.arc(p.x, p.y, p.r + 20, 0, TAU); g.fill();
    g.restore();
  }

  // dash indicator
  g.save();
  var rr = p.r + 14;
  if (p.dashCd > 0) {
    var frac = 1 - clamp(p.dashCd / 1.25, 0, 1);
    g.strokeStyle = 'rgba(120,200,235,0.3)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(p.x, p.y, rr, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
    g.stroke();
  } else {
    g.fillStyle = 'rgba(63,230,255,0.5)';
    for (var q = 0; q < 4; q++) {
      var aq = -Math.PI / 2 + q * Math.PI / 2;
      g.beginPath();
      g.arc(p.x + Math.cos(aq) * rr, p.y + Math.sin(aq) * rr, 1.8, 0, TAU);
      g.fill();
    }
  }
  g.restore();

  // damage direction arcs
  for (var h = 0; h < p.hitDirs.length; h++) {
    var hd = p.hitDirs[h];
    var a = clamp(1 - hd.t / 1.1, 0, 1);
    g.save();
    g.strokeStyle = 'rgba(255,70,90,' + (a * 0.8) + ')';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(p.x, p.y, p.r + 26 + hd.t * 10, hd.a - 0.32, hd.a + 0.32);
    g.stroke();
    g.restore();
  }
}

/* ---------------- HUD ---------------- */

function drawBossBar() {
  if (!boss) return;
  var w = Math.min(520, VW * 0.6);
  var h = 8;
  var x = (VW - w) / 2;
  var y = 26;
  g.save();
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.fillRect(x, y, w, h);
  var ratio = clamp(boss.hp / boss.maxHp, 0, 1);
  var grad = g.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, bossCol(boss));
  grad.addColorStop(1, COL.orange);
  g.fillStyle = grad;
  g.fillRect(x, y, w * ratio, h);
  g.strokeStyle = 'rgba(255,255,255,0.18)';
  g.lineWidth = 1;
  g.strokeRect(x, y, w, h);
  g.fillStyle = boss.enraged ? COL.orange : 'rgba(255,140,160,0.9)';
  g.font = '700 10px ' + FONT;
  g.textAlign = 'center';
  g.fillText(stageCfg.bossName + (boss.enraged ? ' · ENRAGED' : ''), VW / 2, y - 8);
  g.restore();
}

function drawBanner() {
  if (banner <= 0 || !bannerText) return;
  var a = clamp(banner / 1.0, 0, 1) * clamp((2.4 - banner) / 0.3, 0, 1);
  g.save();
  g.globalAlpha = a;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '800 44px ' + FONT;
  glowOn(g, COL.cyan, 26);
  g.fillStyle = COL.white;
  g.fillText(bannerText, VW / 2, VH * 0.28);
  glowOff(g);
  g.font = '600 12px ' + FONT;
  g.fillStyle = 'rgba(160,220,255,0.7)';
  g.fillText('INCOMING', VW / 2, VH * 0.28 + 40);
  g.restore();
}

function drawReticle() {
  if (!pointer.active || pointer.type === 'touch' || state !== 'play' || uiModal || pointer.aimLock) return;
  if (wasTouch && stick.active) return;
  g.save();
  g.translate(pointer.x, pointer.y);
  var r = 13 + Math.sin(time * 8) * 1.5;
  g.strokeStyle = 'rgba(63,230,255,0.65)';
  g.lineWidth = 1.5;
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  g.beginPath();
  g.moveTo(-r - 4, 0); g.lineTo(-r + 3, 0);
  g.moveTo(r - 3, 0); g.lineTo(r + 4, 0);
  g.moveTo(0, -r - 4); g.lineTo(0, -r + 3);
  g.moveTo(0, r - 3); g.lineTo(0, r + 4);
  g.stroke();
  g.restore();
}

function drawStick() {
  if (!stick.active || state !== 'play') return;
  g.save();
  g.globalAlpha = 0.4;
  g.strokeStyle = COL.cyan;
  g.lineWidth = 1.5;
  g.beginPath(); g.arc(stick.ox, stick.oy, 62, 0, TAU); g.stroke();
  g.globalAlpha = 0.55;
  g.fillStyle = 'rgba(63,230,255,0.18)';
  g.beginPath();
  g.arc(stick.ox + stick.dx * 62, stick.oy + stick.dy * 62, 24, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(63,230,255,0.7)';
  g.stroke();
  g.restore();
}

function drawHUD() {
  if (state === 'title') return;

  g.save();
  g.textBaseline = 'top';
  g.textAlign = 'left';

  g.fillStyle = 'rgba(140,200,230,0.55)';
  g.font = '600 11px ' + FONT;
  g.fillText('SCORE', 26, 22);

  g.fillStyle = COL.white;
  g.font = '700 34px ' + FONT;
  glowOn(g, COL.cyan, 12);
  g.fillText(pad(score), 24, 36);
  glowOff(g);

  g.fillStyle = 'rgba(140,200,230,0.55)';
  g.font = '600 11px ' + FONT;
  g.fillText('WAVE', 26, 88);
  g.fillStyle = COL.cyan;
  g.font = '700 18px ' + FONT;
  g.fillText((stageCfg.num ? pad2(stageCfg.num) + ' · ' : '') + stageCfg.name + ' ' +
    (stageCfg.endless ? pad2(wave) : pad2(wave) + '/' + pad2(stageCfg.waves + 1)), 24, 102);

  g.fillStyle = 'rgba(140,200,230,0.45)';
  g.font = '600 10px ' + FONT;
  g.fillText(weaponCfg.name + ' · ' + weaponCfg.en, 26, 126);

  if (combo >= 4) {
    var mult = 1 + Math.min(4, Math.floor(combo / 4) * 0.25);
    g.globalAlpha = clamp(comboTimer / 3 + 0.25, 0, 1);
    g.fillStyle = COL.gold;
    g.font = '700 22px ' + FONT;
    g.fillText('x' + mult.toFixed(2), 26, 148);
    g.globalAlpha = 1;
  }

  g.textAlign = 'right';
  g.fillStyle = 'rgba(140,200,230,0.55)';
  g.font = '600 11px ' + FONT;
  g.fillText('BEST', VW - 26, 68);
  g.fillStyle = 'rgba(234,246,255,0.78)';
  g.font = '700 22px ' + FONT;
  g.fillText(pad(best), VW - 24, 82);

  // hull
  var hx = 26, hy = VH - 42, hw = 220, hh = 10;
  g.textAlign = 'left';
  g.fillStyle = 'rgba(140,200,230,0.55)';
  g.font = '600 11px ' + FONT;
  g.fillText('HULL ' + Math.ceil(player.hp) + '%', hx, hy - 17);
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.fillRect(hx, hy, hw, hh);

  var ratio = clamp(player.hp / player.maxHp, 0, 1);
  var grad = g.createLinearGradient(hx, 0, hx + hw, 0);
  grad.addColorStop(0, ratio > 0.35 ? COL.cyan : COL.red);
  grad.addColorStop(1, ratio > 0.35 ? COL.green : COL.orange);
  g.fillStyle = grad;
  g.fillRect(hx, hy, hw * ratio, hh);

  g.strokeStyle = 'rgba(255,255,255,0.14)';
  g.lineWidth = 1;
  g.strokeRect(hx, hy, hw, hh);

  // dash pips
  g.fillStyle = 'rgba(140,200,230,0.55)';
  g.fillText('DASH', hx, hy - 40);
  var pips = 10;
  var filled = player.dashCd <= 0 ? pips : Math.floor((1 - clamp(player.dashCd / 1.25, 0, 1)) * pips);
  for (var i = 0; i < pips; i++) {
    g.fillStyle = i < filled ? COL.cyan : 'rgba(255,255,255,0.12)';
    g.fillRect(hx + i * 15, hy - 25, 11, 4);
  }

  // shield pips
  for (var s = 0; s < player.shield; s++) {
    g.fillStyle = COL.shield;
    g.beginPath();
    g.arc(hx + hw + 12 + s * 14, hy - 31, 4, 0, TAU);
    g.fill();
  }

  // buffs
  g.textAlign = 'right';
  var by = VH - 42;
  if (player.rapid > 0) {
    g.fillStyle = COL.gold;
    g.font = '700 12px ' + FONT;
    g.fillText('RAPID ' + player.rapid.toFixed(1) + 's', VW - 26, by - 20);
  }
  if (player.triple > 0) {
    g.fillStyle = COL.violet;
    g.font = '700 12px ' + FONT;
    g.fillText('TRIPLE ' + player.triple.toFixed(1) + 's', VW - 26, by);
  }

  if (settings.autoaim || wasTouch) {
    g.fillStyle = 'rgba(120,220,255,0.5)';
    g.font = '600 10px ' + FONT;
    g.fillText('AUTO AIM', VW - 26, by - 40);
  }
  if (settings.volume <= 0.001) {
    g.fillStyle = 'rgba(200,220,235,0.45)';
    g.font = '600 10px ' + FONT;
    g.fillText('MUTED (M)', VW - 26, by - 56);
  }
  if (settings.showFps) {
    g.fillStyle = 'rgba(150,220,250,0.55)';
    g.font = '600 11px ' + FONT;
    g.textAlign = 'right';
    g.fillText(fpsDisplay + ' FPS · ' + SIM_HZ + 'Hz', VW - 26, VH - 24);
  }

  g.restore();

  drawBossBar();
  drawBanner();
  drawReticle();
}

function drawVignette() {
  if (hitFlash > 0 && settings.flashes) {
    g.save();
    g.globalAlpha = hitFlash * (settings.flashes ? 0.45 : 0.2);
    var grd = g.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.25, VW / 2, VH / 2, Math.max(VW, VH) * 0.7);
    grd.addColorStop(0, 'rgba(255,0,40,0)');
    grd.addColorStop(1, 'rgba(255,0,40,0.55)');
    g.fillStyle = grd;
    g.fillRect(0, 0, VW, VH);
    g.restore();
  }
  var ratio = player.hp / player.maxHp;
  if (state === 'play' && ratio < 0.35) {
    var pulse = 0.5 + 0.5 * Math.sin(time * 5);
    var strength = (0.35 - ratio) * (settings.flashes ? 0.9 : 0.35) * pulse;
    g.save();
    g.globalAlpha = strength;
    var grd2 = g.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.2, VW / 2, VH / 2, Math.max(VW, VH) * 0.72);
    grd2.addColorStop(0, 'rgba(255,0,40,0)');
    grd2.addColorStop(1, 'rgba(255,0,40,0.6)');
    g.fillStyle = grd2;
    g.fillRect(0, 0, VW, VH);
    g.restore();
  }
}

/* =========================================================
   50 — update: simulation
   ========================================================= */

var lastVolume = 0.8;

function toggleMute() {
  if (settings.volume > 0.001) {
    lastVolume = settings.volume;
    settings.volume = 0;
  } else {
    settings.volume = lastVolume || 0.8;
  }
  applyVolume();
  saveSettings();
  if (typeof syncSettingsUI === 'function') syncSettingsUI();
}

function update(dt) {
  time += dt;

  for (var i = 0; i < stars.length; i++) {
    var s = stars[i];
    s.y += s.z * 16 * dt;
    s.tw += dt * (0.6 + s.z);
    if (s.y > VH + 4) { s.y = -4; s.x = Math.random() * VW; }
  }

  shakeMag *= Math.exp(-7 * dt);
  shakeX *= Math.exp(-9 * dt);
  shakeY *= Math.exp(-9 * dt);
  if (shakeMag < 0.05) shakeMag = 0;
  hitFlash = Math.max(0, hitFlash - dt * 2.4);
  banner = Math.max(0, banner - dt);

  if (pressed.has('KeyM')) toggleMute();

  if (hitstop > 0) {
    hitstop -= dt;
    pressed.clear();
    return;
  }

  if (state === 'title') {
    if (actPressed('left')) menuStage = (menuStage + STAGES.length - 1) % STAGES.length;
    if (actPressed('right')) menuStage = (menuStage + 1) % STAGES.length;
    if (actPressed('up')) menuWeapon = (menuWeapon + WEAPONS.length - 1) % WEAPONS.length;
    if (actPressed('down')) menuWeapon = (menuWeapon + 1) % WEAPONS.length;
    if (actPressed('shoot') || pressed.has('Enter')) startGame(menuStage, menuWeapon);
    pressed.clear();
    return;
  }

  if (state === 'pause') {
    if (uiModal) {
      if (pressed.has('Escape')) closeSettings();
      pressed.clear();
      return;
    }
    if (actPressed('pause')) state = 'play';
    pressed.clear();
    return;
  }

  if (state === 'dead') {
    deadTimer += dt;
    updateParticles(dt);
    updateRings(dt);
    updateFloats(dt);
    updateBullets(dt);
    updateEnemyBullets(dt);
    if (deadTimer > 0.6) {
      if (pressed.has('KeyR')) startGame(stageIndex, menuWeapon);
      else if (actPressed('shoot') || pressed.has('Enter') || actPressed('pause')) goMenu();
    }
    pressed.clear();
    return;
  }

  if (state === 'clear') {
    clearTimer += dt;
    updateParticles(dt);
    updateRings(dt);
    updateFloats(dt);
    updateBullets(dt);
    updateEnemyBullets(dt);
    if (clearTimer > 0.8) {
      if (pressed.has('KeyN') && stageIndex < STAGES.length - 1) {
        startGame(stageIndex + 1, menuWeapon);
      } else if (actPressed('shoot') || pressed.has('Enter') || actPressed('pause') || pressed.has('KeyR')) {
        goMenu();
      }
    }
    pressed.clear();
    return;
  }

  if (uiModal) { pressed.clear(); return; }

  if (actPressed('pause')) {
    state = 'pause';
    pressed.clear();
    return;
  }

  updatePlayer(dt);
  updateSpawns(dt);
  updateWave(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateEnemyBullets(dt);
  updatePickups(dt);
  updateParticles(dt);
  updateRings(dt);
  updateFloats(dt);

  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) { comboTimer = 0; combo = 0; }
  }
  if (player.invuln > 0) player.invuln -= dt;
  if (player.rapid > 0) player.rapid -= dt;
  if (player.triple > 0) player.triple -= dt;
  if (player.dashCd > 0) player.dashCd -= dt;

  for (var h = player.hitDirs.length - 1; h >= 0; h--) {
    player.hitDirs[h].t += dt;
    if (player.hitDirs[h].t > 1.1) player.hitDirs.splice(h, 1);
  }

  pressed.clear();
}

function updatePlayer(dt) {
  var ax = 0, ay = 0;
  if (act('left')) ax -= 1;
  if (act('right')) ax += 1;
  if (act('up')) ay -= 1;
  if (act('down')) ay += 1;

  if (stick.active && stick.mag > 0.14) {
    ax += stick.dx;
    ay += stick.dy;
  }

  var m = hlen(ax, ay);
  if (m > 0) { ax /= m; ay /= m; }

  var autoAim = settings.autoaim || wasTouch || !pointer.active || pointer.aimLock;
  if (autoAim) {
    var bd = 1e9, ba = player.aim;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      var dd = (e.x - player.x) * (e.x - player.x) + (e.y - player.y) * (e.y - player.y);
      if (dd < bd) { bd = dd; ba = Math.atan2(e.y - player.y, e.x - player.x); }
    }
    player.aim = ba;
  } else if (pointer.active) {
    player.aim = Math.atan2(pointer.y - player.y, pointer.x - player.x);
  }

  // dash (edge triggered)
  if ((actPressed('dash') || dashQueued) && player.dashCd <= 0 && player.dashT <= 0) {
    var ddx = ax, ddy = ay;
    if (m === 0) { ddx = Math.cos(player.aim); ddy = Math.sin(player.aim); }
    player.ddx = ddx;
    player.ddy = ddy;
    player.dashT = 0.16;
    player.dashCd = 1.25;
    player.invuln = Math.max(player.invuln, 0.36);
    addRing(player.x, player.y, COL.cyan, 26, 0.45, 3);
    sfx('dash');
  }
  dashQueued = false;

  if (player.dashT > 0) {
    player.dashT -= dt;
    player.x += player.ddx * 1150 * dt;
    player.y += player.ddy * 1150 * dt;
    addParticles(player.x, player.y, 1, COL.cyan, 60, 2.4, 0.28);
  } else {
    var SPEED = 330;
    var k = 1 - Math.exp(-12 * dt);
    player.vx += (ax * SPEED - player.vx) * k;
    player.vy += (ay * SPEED - player.vy) * k;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
  }

  player.x = clamp(player.x, 22, VW - 22);
  player.y = clamp(player.y, 22, VH - 22);
  player.thrust = clamp(hlen(player.vx, player.vy) / 330, 0, 1);

  player.fireCd -= dt;
  var wantsFire = pointer.down || act('shoot') || (wasTouch && stick.active);
  if (wantsFire && player.fireCd <= 0 && player.dashT <= 0) shoot();
}

function shoot() {
  var w = weaponCfg;
  var rapid = player.rapid > 0;
  player.fireCd = w.interval * (rapid ? 0.55 : 1);
  var extra = player.triple > 0 ? 2 : 0;
  var count = w.count + extra;
  var spread = w.spread;
  if (extra > 0) spread = Math.max(spread, 0.13 * extra + (w.count > 1 ? 0.1 : 0));
  var step = count > 1 ? spread / (count - 1) : 0;

  for (var i = 0; i < count; i++) {
    var a = player.aim + (i - (count - 1) / 2) * step;
    var b = bulletPool.take();
    b.x = player.x + Math.cos(a) * 18;
    b.y = player.y + Math.sin(a) * 18;
    b.vx = Math.cos(a) * w.speed;
    b.vy = Math.sin(a) * w.speed;
    b.r = w.r;
    b.dmg = w.dmg;
    b.life = w.life;
    b.color = w.color;
    b.pierceLeft = w.pierce;
    if (!b.hitList) b.hitList = [];
    b.hitList.length = 0;
    bullets.push(b);
  }

  player.shots++;
  addParticles(player.x + Math.cos(player.aim) * 20, player.y + Math.sin(player.aim) * 20, 3, w.color, 100, 2, 0.18);
  if (w.id === 'cannon') addShake(2.2);
  sfx('shoot', { pitch: w.id === 'cannon' ? 0.55 : (w.id === 'scatter' ? 1.3 : (w.id === 'twin' ? 1.15 : 1)) });
}

function updateWave(dt) {
  if (!waveActive) {
    waveGap -= dt;
    if (waveGap <= 0) startWave(wave + 1);
    return;
  }
  if (waveSpawn.left > 0) {
    waveSpawn.timer -= dt;
    if (waveSpawn.timer <= 0) {
      waveSpawn.timer = waveSpawn.interval;
      waveSpawn.left--;
      spawnEnemy(waveSpawn.boss ? 'warden' : chooseType());
    }
  } else if (enemies.length === 0 && spawns.length === 0) {
    waveActive = false;
    waveGap = 1.7;
    if (player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + 10);
      addFloat(player.x, player.y - 34, '+10 HULL', COL.green, 16);
    }
  }
}

function updateSpawns(dt) {
  for (var i = spawns.length - 1; i >= 0; i--) {
    var s = spawns[i];
    s.t -= dt;
    if (s.t <= 0) {
      var e = makeEnemy(s.type, s.x, s.y);
      enemies.push(e);
      if (s.type === 'warden') {
        boss = e;
        addShake(10);
        sfx('bossSpawn');
      }
      addRing(s.x, s.y, ecolOf(e), e.r + 20, 0.4, 2);
      spawns.splice(i, 1);
    }
  }
}

function updateEnemies(dt) {
  for (var i = enemies.length - 1; i >= 0; i--) {
    var e = enemies[i];
    e.hit = Math.max(0, e.hit - dt);
    var dx = player.x - e.x;
    var dy = player.y - e.y;
    var d = Math.max(1, Math.hypot(dx, dy));

    if (e.type === 'drone' || e.type === 'mini') {
      var acc = e.type === 'mini' ? 420 : 260;
      e.vx += (dx / d) * acc * dt;
      e.vy += (dy / d) * acc * dt;
      var sp = Math.hypot(e.vx, e.vy);
      if (sp > e.speed) { e.vx = e.vx / sp * e.speed; e.vy = e.vy / sp * e.speed; }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.ang = Math.atan2(e.vy, e.vx);

    } else if (e.type === 'weaver') {
      var perp = Math.sin(time * 2.2 + e.phase) * 130;
      e.x += ((dx / d) * e.speed + (-dy / d) * perp) * dt;
      e.y += ((dy / d) * e.speed + (dx / d) * perp) * dt;
      e.ang += dt * 1.6;
      e.fire -= dt;
      if (e.fire <= 0 && d < 640) {
        e.fire = rand(1.5, 2.3);
        enemyShoot(e.x, e.y, Math.atan2(dy, dx), 235);
      }

    } else if (e.type === 'splitter') {
      e.x += (dx / d) * e.speed * dt;
      e.y += (dy / d) * e.speed * dt;
      e.ang += dt * 0.8;

    } else if (e.type === 'sniper') {
      var want = 330;
      var moveDir = d > want + 60 ? 1 : (d < want - 60 ? -1 : 0);
      e.x += (dx / d) * e.speed * moveDir * dt;
      e.y += (dy / d) * e.speed * moveDir * dt;
      var strafe = Math.sin(time * 1.3 + e.phase) * 46;
      e.x += (-dy / d) * strafe * dt;
      e.y += (dx / d) * strafe * dt;
      e.ang += dt * 0.9;

      if (e.charge > 0) {
        e.charge -= dt;
        if (e.charge <= 0) {
          enemyShoot(e.x, e.y, e.aimAngle, 760, 4);
          sfx('snipe');
          e.fire = rand(2.4, 3.2);
        }
      } else {
        e.fire -= dt;
        if (e.fire <= 0 && d < 720) {
          e.charge = 0.85;
          e.aimAngle = Math.atan2(dy, dx);
          sfx('charge');
        }
      }

    } else if (e.type === 'bomber') {
      if (e.fuse >= 0) {
        e.fuse -= dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vx *= Math.exp(-2.2 * dt);
        e.vy *= Math.exp(-2.2 * dt);
        if (e.fuse <= 0) { explodeBomber(e); continue; }
      } else {
        e.vx += (dx / d) * 320 * dt;
        e.vy += (dy / d) * 320 * dt;
        var bs = Math.hypot(e.vx, e.vy);
        if (bs > e.speed) { e.vx = e.vx / bs * e.speed; e.vy = e.vy / bs * e.speed; }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.ang = Math.atan2(e.vy, e.vx);
        if (d < 118) {
          e.fuse = 0.75;
          e.vx *= 0.2;
          e.vy *= 0.2;
          sfx('fuse');
        }
      }

    } else if (e.type === 'warden') {
      updateWarden(e, dt, dx, dy, d);
    }

    if (player.invuln <= 0 && !(e.type === 'bomber' && e.fuse >= 0)) {
      var pr = Math.hypot(player.x - e.x, player.y - e.y);
      if (pr < player.r + e.r) {
        damagePlayer(e.type === 'warden' ? 30 : e.type === 'splitter' ? 22 : 16, e.x, e.y);
        var nx = (player.x - e.x) / (pr || 1);
        var ny = (player.y - e.y) / (pr || 1);
        player.vx += nx * 320;
        player.vy += ny * 320;
        if (e.type !== 'warden') { e.vx -= nx * 220; e.vy -= ny * 220; }
      }
    }
  }
}

function updateWarden(e, dt, dx, dy, d) {
  e.phase += dt;
  e.ang += dt * 0.5;

  if (!e.enraged && e.hp < e.maxHp * 0.5) {
    e.enraged = true;
    e.speed *= 1.3;
    e.fire = 0.7;
    e.fire2 = 0.7;
    e.spawnT = 1.2;
    addRing(e.x, e.y, COL.red, e.r + 60, 0.9, 5);
    addShake(16);
    addFloat(e.x, e.y - 70, 'ENRAGED', COL.red, 24);
    sfx('enrage');
  }

  var want = e.enraged ? 200 : 230;
  var dir = d > want ? 1 : -0.5;
  e.x += (dx / d) * e.speed * dir * dt;
  e.y += (dy / d) * e.speed * dir * dt;
  e.x = clamp(e.x, e.r, VW - e.r);
  e.y = clamp(e.y, e.r, VH - e.r);

  if (e.variant === 1) {
    // SENTINEL — twin spiral + aimed burst
    e.spiralT -= dt;
    if (e.spiralT <= 0) {
      e.spiralT = e.enraged ? 0.09 : 0.12;
      e.spiralAngle += e.enraged ? 0.44 : 0.34;
      var sp1 = e.enraged ? 250 : 215;
      enemyShoot(e.x, e.y, e.spiralAngle, sp1, 5);
      enemyShoot(e.x, e.y, e.spiralAngle + Math.PI, sp1, 5);
    }
    e.fire2 -= dt;
    if (e.fire2 <= 0) {
      e.fire2 = e.enraged ? 0.9 : 1.4;
      var b1 = Math.atan2(dy, dx);
      var n1 = e.enraged ? 7 : 5;
      for (var i1 = 0; i1 < n1; i1++) {
        enemyShoot(e.x, e.y, b1 + (i1 - (n1 - 1) / 2) * 0.12, e.enraged ? 330 : 290, 5);
      }
    }

  } else if (e.variant === 2) {
    // RIFT CORE — three-arm spiral + radial burst
    e.spiralT -= dt;
    if (e.spiralT <= 0) {
      e.spiralT = e.enraged ? 0.1 : 0.14;
      e.spiralAngle += e.enraged ? 0.36 : 0.28;
      for (var s2 = 0; s2 < 3; s2++) {
        enemyShoot(e.x, e.y, e.spiralAngle + s2 * TAU / 3, e.enraged ? 235 : 205, 5);
      }
    }
    e.fire -= dt;
    if (e.fire <= 0) {
      e.fire = e.enraged ? 2.1 : 3.0;
      var n2 = e.enraged ? 22 : 18;
      for (var k2b = 0; k2b < n2; k2b++) {
        enemyShoot(e.x, e.y, (k2b / n2) * TAU + e.ang, e.enraged ? 190 : 165, 6);
      }
      addRing(e.x, e.y, COL.red, e.r + 14, 0.5, 3);
      addShake(5);
      sfx('bossShot');
    }

  } else {
    // DREADNOUGHT — radial ring + aimed spread
    e.fire -= dt;
    if (e.fire <= 0) {
      e.fire = e.enraged ? 1.7 : 2.5;
      var n = e.enraged ? 18 : 14;
      var speed = e.enraged ? 200 : 170;
      for (var k = 0; k < n; k++) {
        enemyShoot(e.x, e.y, (k / n) * TAU + e.ang, speed, 6);
      }
      addRing(e.x, e.y, COL.red, e.r + 12, 0.45, 3);
      addShake(4);
      sfx('bossShot');
    }

    e.fire2 -= dt;
    if (e.fire2 <= 0) {
      e.fire2 = e.enraged ? 1.0 : 1.5;
      var base = Math.atan2(dy, dx);
      var spread = e.enraged ? 5 : 3;
      for (var k2 = 0; k2 < spread; k2++) {
        enemyShoot(e.x, e.y, base + (k2 - (spread - 1) / 2) * 0.15, e.enraged ? 320 : 285, 5);
      }
    }
  }

  e.spawnT -= dt;
  if (e.spawnT <= 0) {
    e.spawnT = e.enraged ? 5 : 7;
    var count = (e.variant === 2 ? 3 : 2) + (e.enraged ? 1 : 0);
    for (var k3 = 0; k3 < count; k3++) {
      var a3 = rand(0, TAU);
      enemies.push(makeEnemy('drone', e.x + Math.cos(a3) * 64, e.y + Math.sin(a3) * 64));
    }
  }
}

function explodeBomber(e) {
  addRing(e.x, e.y, COL.bomber, 74, 0.55, 4);
  addParticles(e.x, e.y, 28, COL.bomber, 300, 4, 0.6);
  addShake(13);
  sfx('boom');
  if (dist(player.x, player.y, e.x, e.y) < 96) damagePlayer(18, e.x, e.y);
  for (var k = 0; k < 10; k++) {
    enemyShoot(e.x, e.y, (k / 10) * TAU + rand(-0.1, 0.1), 195, 5);
  }
  killEnemy(e, { quiet: true, noBurst: true });
}

function killEnemy(e, opts) {
  opts = opts || {};
  var idx = enemies.indexOf(e);
  if (idx < 0) return;
  enemies.splice(idx, 1);

  var scoring = state === 'play';

  if (scoring) {
    combo++;
    comboTimer = 3;
    var mult = 1 + Math.min(4, Math.floor(combo / 4) * 0.25);
    var pts = Math.round(e.score * mult);
    score += pts;
    addFloat(e.x, e.y, '+' + pts, e.type === 'warden' ? COL.gold : COL.white, e.type === 'warden' ? 30 : 14);
  }

  addParticles(e.x, e.y, e.type === 'warden' ? 70 : e.type === 'splitter' ? 26 : 14,
    ecolOf(e), e.type === 'warden' ? 380 : 210, e.type === 'warden' ? 5 : 3, 0.8);
  addRing(e.x, e.y, ecolOf(e), e.r + 6, 0.6, 3);

  if (e.type === 'splitter' || e.affix === 'split') {
    var nSplit = e.type === 'splitter' ? 2 : 2;
    for (var k = 0; k < nSplit; k++) {
      var m = makeEnemy('mini', e.x + rand(-16, 16), e.y + rand(-16, 16));
      m.vx = rand(-160, 160);
      m.vy = rand(-160, 160);
      enemies.push(m);
    }
  }

  if (e.affix === 'volatile' && !opts.noBurst) {
    for (var v = 0; v < 8; v++) enemyShoot(e.x, e.y, (v / 8) * TAU, 180, 5);
    addRing(e.x, e.y, COL.orange, 60, 0.45, 3);
  }

  if (e.type === 'warden') {
    boss = null;
    hitstop = 0.12;
    addShake(30);
    addRing(e.x, e.y, COL.gold, e.r + 50, 1, 6);
    dropPickup(e.x - 40, e.y, 'heal');
    dropPickup(e.x, e.y + 30, null);
    dropPickup(e.x + 40, e.y, 'shield');
    sfx('bigkill');
    if (wave > stageCfg.waves) {
      stageClear();
      return;
    }
  } else {
    hitstop = Math.max(hitstop, e.affix ? 0.035 : 0.02);
    addShake(e.affix ? 7 : (e.type === 'splitter' ? 5 : 2.5));
    if (e.elite) dropPickup(e.x, e.y, null);
    else if (Math.random() < 0.13) dropPickup(e.x, e.y, null);
    if (!opts.quiet) sfx('kill', { pitch: 1 + Math.min(1.3, combo * 0.035) });
  }
}

function updateBullets(dt) {
  for (var i = bullets.length - 1; i >= 0; i--) {
    var b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -30 || b.y < -30 || b.x > VW + 30 || b.y > VH + 30) {
      bulletPool.give(b);
      bullets.splice(i, 1);
      continue;
    }
    var hit = false;
    if (state !== 'play') continue;
    if (!b.hitList) b.hitList = [];
    for (var j = enemies.length - 1; j >= 0; j--) {
      var e = enemies[j];
      if (b.hitList.indexOf(e) >= 0) continue;
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r) {
        hit = true;
        b.hitList.push(e);
        if (e.shield > 0) {
          e.shield--;
          e.hit = 0.12;
          addParticles(b.x, b.y, 5, COL.shield, 150, 2, 0.3);
          sfx('shield');
        } else {
          e.hp -= b.dmg;
          e.hit = 0.12;
          addParticles(b.x, b.y, 3, b.color || COL.white, 140, 2, 0.25);
          sfx('hit');
          if (e.hp <= 0) killEnemy(e);
        }
        if (b.pierceLeft > 0) {
          b.pierceLeft--;
        } else {
          bulletPool.give(b);
          bullets.splice(i, 1);
        }
        break;
      }
    }
    if (hit) continue;
  }
}

function updateEnemyBullets(dt) {
  for (var i = ebullets.length - 1; i >= 0; i--) {
    var b = ebullets[i];
    b.px = b.x;
    b.py = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -60 || b.y < -60 || b.x > VW + 60 || b.y > VH + 60) {
      ebPool.give(b);
      ebullets.splice(i, 1);
      continue;
    }
    if (state === 'play' && Math.hypot(b.x - player.x, b.y - player.y) < player.r + b.r) {
      damagePlayer(10, b.x, b.y);
      addParticles(b.x, b.y, 6, COL.red, 150, 2.5, 0.35);
      ebPool.give(b);
      ebullets.splice(i, 1);
    }
  }
}

function updatePickups(dt) {
  for (var i = pickups.length - 1; i >= 0; i--) {
    var p = pickups[i];
    p.t += dt;
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.exp(-2 * dt);
    p.vy *= Math.exp(-2 * dt);

    var dx = player.x - p.x;
    var dy = player.y - p.y;
    var d = Math.hypot(dx, dy);
    if (d < 150) {
      var pull = (1 - d / 150) * 900;
      p.x += (dx / (d || 1)) * pull * dt;
      p.y += (dy / (d || 1)) * pull * dt;
    }
    if (d < player.r + p.r + 6) {
      collectPickup(p);
      pickups.splice(i, 1);
      continue;
    }
    if (p.life <= 0) pickups.splice(i, 1);
  }
}

function collectPickup(p) {
  if (p.type === 'heal') {
    player.hp = Math.min(player.maxHp, player.hp + 28);
    addFloat(player.x, player.y - 26, 'HULL +28', COL.green, 16);
    sfx('pickup');
  } else if (p.type === 'rapid') {
    player.rapid = 9;
    addFloat(player.x, player.y - 26, 'RAPID FIRE', COL.gold, 16);
    sfx('pickup');
  } else if (p.type === 'triple') {
    player.triple = 9;
    addFloat(player.x, player.y - 26, 'TRIPLE SHOT', COL.violet, 16);
    sfx('pickup');
  } else {
    player.shield = Math.min(2, player.shield + 1);
    addFloat(player.x, player.y - 26, 'SHIELD +1', COL.shield, 16);
    sfx('shield');
  }
  addRing(p.x, p.y, COL.green, 26, 0.4, 3);
}

function updateParticles(dt) {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      partPool.give(p);
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.exp(-3 * dt);
    p.vy *= Math.exp(-3 * dt);
  }
}

function updateRings(dt) {
  for (var i = rings.length - 1; i >= 0; i--) {
    var r = rings[i];
    r.t += dt;
    if (r.t >= r.max) {
      ringPool.give(r);
      rings.splice(i, 1);
    }
  }
}

function updateFloats(dt) {
  for (var i = floats.length - 1; i >= 0; i--) {
    var f = floats[i];
    f.t += dt;
    if (f.t >= f.max) {
      floatPool.give(f);
      floats.splice(i, 1);
    }
  }
}

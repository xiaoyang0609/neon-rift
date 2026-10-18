/* =========================================================
   80 — main: surfaces, resize, fixed-step loop, boot
   ========================================================= */

var lastFrame = 0;
var acc = 0;
var fpsDisplay = 0;
var fpsAcc = 0;
var fpsFrames = 0;
var lowFpsStreak = 0;

function makeStars() {
  var n = Math.round((VW * VH) / 11000);
  stars = [];
  for (var i = 0; i < n; i++) {
    stars.push({ x: Math.random() * VW, y: Math.random() * VH, z: rand(0.25, 1), tw: Math.random() * TAU });
  }
}

function buildBackground() {
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = canvas.width;
  bgCanvas.height = canvas.height;
  bgCtx = bgCanvas.getContext('2d');
  var w = bgCanvas.width;
  var h = bgCanvas.height;
  bgCtx.fillStyle = '#02040a';
  bgCtx.fillRect(0, 0, w, h);
  var grd = bgCtx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.8);
  grd.addColorStop(0, '#0b1a2e');
  grd.addColorStop(0.55, '#050b16');
  grd.addColorStop(1, '#02040a');
  bgCtx.fillStyle = grd;
  bgCtx.fillRect(0, 0, w, h);
}

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = Math.max(320, window.innerWidth);
  VH = Math.max(320, window.innerHeight);

  canvas.width = Math.round(VW * DPR);
  canvas.height = Math.round(VH * DPR);
  canvas.style.width = VW + 'px';
  canvas.style.height = VH + 'px';

  if (!sceneCanvas) {
    sceneCanvas = document.createElement('canvas');
    sceneCtx = sceneCanvas.getContext('2d');
  }
  sceneCanvas.width = canvas.width;
  sceneCanvas.height = canvas.height;

  if (!bloomCanvas) {
    bloomCanvas = document.createElement('canvas');
    bloomCtx = bloomCanvas.getContext('2d');
  }
  bloomCanvas.width = Math.max(1, Math.round(canvas.width / 4));
  bloomCanvas.height = Math.max(1, Math.round(canvas.height / 4));

  buildBackground();
  makeStars();
  updateOrientationHint();

  if (state === 'play' || state === 'pause') {
    player.x = clamp(player.x, 22, VW - 22);
    player.y = clamp(player.y, 22, VH - 22);
  }
}

function loop(now) {
  if (!lastFrame) lastFrame = now;
  var raw = (now - lastFrame) / 1000;
  lastFrame = now;
  if (!(raw > 0)) raw = STEP;
  var dt = Math.min(0.1, raw);

  acc += dt;
  var steps = 0;
  while (acc >= STEP && steps < MAX_STEPS) {
    update(STEP);
    acc -= STEP;
    steps++;
  }
  if (steps >= MAX_STEPS) acc = 0;

  render();

  fpsFrames++;
  fpsAcc += dt;
  if (fpsAcc >= 0.5) {
    fpsDisplay = Math.round(fpsFrames / fpsAcc);
    if (fpsDisplay < 45) lowFpsStreak++;
    else lowFpsStreak = 0;

    if (lowFpsStreak >= 2 && settings.bloom && bloomEnabled) {
      bloomEnabled = false;
      showToast('帧率偏低，已暂时关闭泛光（可在设置里重新开启）');
      lowFpsStreak = 0;
    }
    fpsFrames = 0;
    fpsAcc = 0;
  }

  window.requestAnimationFrame(loop);
}

function boot() {
  resize();
  initUI();
  applyVolume();
  updateOrientationHint();

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'play') state = 'pause';
  });

  window.requestAnimationFrame(loop);
}

boot();

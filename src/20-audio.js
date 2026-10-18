/* =========================================================
   20 — audio: tiny WebAudio synth, no assets
   ========================================================= */

var AC = null;
var masterGain = null;
var noiseBuf = null;

function audio() {
  if (AC) {
    if (AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
    return AC;
  }
  var Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try { AC = new Ctor(); } catch (e) { return null; }
  masterGain = AC.createGain();
  masterGain.gain.value = settings.volume;
  masterGain.connect(AC.destination);
  return AC;
}

function applyVolume() {
  if (masterGain) masterGain.gain.value = clamp(settings.volume, 0, 1);
}

function getNoise(a) {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, Math.floor(a.sampleRate * 0.5), a.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function tone(f1, f2, dur, type, vol, delay) {
  if (settings.volume <= 0.001) return;
  var a = audio(); if (!a) return;
  var t = a.currentTime + (delay || 0);
  var o = a.createOscillator();
  var gn = a.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(Math.max(20, f1), t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.008);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn);
  gn.connect(masterGain);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function noiseHit(dur, vol, freq, q, delay) {
  if (settings.volume <= 0.001) return;
  var a = audio(); if (!a) return;
  var t = a.currentTime + (delay || 0);
  var src = a.createBufferSource();
  src.buffer = getNoise(a);
  var flt = a.createBiquadFilter();
  flt.type = 'bandpass';
  flt.frequency.value = freq;
  flt.Q.value = q || 1;
  var gn = a.createGain();
  gn.gain.setValueAtTime(vol, t);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt);
  flt.connect(gn);
  gn.connect(masterGain);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function sfx(name, opts) {
  opts = opts || {};
  var p = opts.pitch || 1;
  switch (name) {
    case 'shoot':
      tone(880 * p, 260 * p, 0.055, 'square', 0.016);
      break;
    case 'hit':
      tone(340 * p, 190 * p, 0.045, 'triangle', 0.024);
      break;
    case 'kill':
      noiseHit(0.2, 0.06, 900 * p, 0.8);
      tone(220 * p, 80 * p, 0.16, 'triangle', 0.03);
      break;
    case 'bigkill':
      noiseHit(0.5, 0.1, 400, 0.6);
      tone(120, 40, 0.6, 'sawtooth', 0.06);
      break;
    case 'hurt':
      tone(180, 60, 0.28, 'sawtooth', 0.06);
      noiseHit(0.18, 0.05, 300, 0.7);
      break;
    case 'dash':
      noiseHit(0.16, 0.045, 1600, 1.4);
      break;
    case 'pickup':
      tone(660, 660, 0.08, 'sine', 0.045);
      tone(990, 990, 0.12, 'sine', 0.045, 0.08);
      break;
    case 'wave':
      tone(220, 220, 0.16, 'triangle', 0.045);
      tone(330, 330, 0.22, 'triangle', 0.045, 0.12);
      break;
    case 'death':
      noiseHit(0.9, 0.1, 500, 0.6);
      tone(140, 40, 0.9, 'sawtooth', 0.08);
      break;
    case 'bossSpawn':
      tone(70, 45, 1.0, 'sawtooth', 0.085);
      noiseHit(0.8, 0.07, 220, 0.6);
      break;
    case 'bossShot':
      tone(130, 80, 0.25, 'square', 0.026);
      break;
    case 'enrage':
      tone(90, 200, 0.5, 'sawtooth', 0.08);
      noiseHit(0.6, 0.08, 260, 0.7);
      break;
    case 'shield':
      tone(520, 780, 0.14, 'sine', 0.05);
      break;
    case 'shieldBreak':
      tone(700, 200, 0.3, 'square', 0.05);
      noiseHit(0.2, 0.05, 1200, 1.2);
      break;
    case 'snipe':
      tone(1400, 300, 0.12, 'sawtooth', 0.035);
      break;
    case 'charge':
      tone(300, 900, 0.5, 'sine', 0.025);
      break;
    case 'fuse':
      tone(900, 900, 0.06, 'square', 0.03);
      break;
    case 'boom':
      noiseHit(0.45, 0.11, 300, 0.7);
      tone(90, 40, 0.45, 'sawtooth', 0.07);
      break;
    default:
      break;
  }
}

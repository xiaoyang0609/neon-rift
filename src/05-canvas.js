/* =========================================================
   05 — canvas handles & render surfaces
   ========================================================= */

var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');

var sceneCanvas = null;
var sceneCtx = null;
var bloomCanvas = null;
var bloomCtx = null;
var bgCanvas = null;
var bgCtx = null;
var stars = [];

var g = null; // current world render target

var VW = 1, VH = 1, DPR = 1;
var bloomEnabled = true;
var fpsSamples = [];
var lowFpsTime = 0;

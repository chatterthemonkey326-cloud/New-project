const game = document.getElementById("game");
const world = document.getElementById("world");
const uiWindows = document.getElementById("windows");
const puzzleLayer = document.getElementById("puzzle");
const msg = document.getElementById("messages");
const btn = document.getElementById("main-button");
const rickrollButton = document.getElementById("rickroll-button");
const overlay = document.getElementById("overlay");
const overlayContent = document.getElementById("overlay-content");
const entity = document.getElementById("entity");
const hauntLayer = document.getElementById("haunt-layer");
const pixelCursor = document.getElementById("pixel-cursor");
const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d");
const originalTitle = document.title;
const providedImageSources = [
  "assets/user-images/img-01.jpg",
  "assets/user-images/img-02.webp",
  "assets/user-images/img-03.jpg",
  "assets/user-images/img-04.jpg",
  "assets/user-images/img-05.jpg",
  "assets/user-images/img-06.webp",
];

const state = {
  stage: 1,
  clicks: 0,
  stageClicks: 0,
  fakeButtons: [],
  rareTriggered: false,
  puzzleSolved: false,
  stage8Clicks: 0,
  entityMood: 0,
  seededVariant: Math.floor(Math.random() * 999999),
  runaway: {
    enabled: false,
    lastMoveAt: 0,
    freezeUntil: 0,
    pressure: 0,
    evadesSinceFreeze: 0,
    cooldown: 260,
    evadeChance: 0.6,
    triggerDistance: 130,
    captureDistance: 95,
    pressureThreshold: 11,
  },
  captcha: {
    active: false,
    round: 0,
    expiredOnce: false,
  },
  threatCaptcha: null,
  panicCaptcha: null,
  freezeMode: null,
  huntMode: null,
  popupHunt: null,
  finalCaptcha: null,
  quickCaptcha: null,
  cleanupHandlers: [],
  minigame: null,
  memory: null,
  glyph: null,
  sequence: null,
  fear: {
    level: 0,
    touches: 0,
    lastEventAt: 0,
    ambienceStarted: false,
    ambienceTimer: null,
  },
  pointerDown: false,
  buttonPos: {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  },
  cursor: {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    speed: 0,
    lastAt: performance.now(),
    lastMoveAt: performance.now(),
    lastFxAt: 0,
    initialized: false,
  },
  eye: {
    scheduled: false,
    awake: false,
    activatedAt: 0,
    el: null,
    irisEl: null,
    pupilEl: null,
    lookX: 0,
    lookY: 0,
    targetX: 0,
    targetY: 0,
    lastTouchAt: 0,
    touching: false,
    rafId: 0,
    timerId: null,
  },
  dimension: {
    active: false,
    triggerCount: 0,
    maxTriggers: 3,
    stability: 0,
    target: 9,
    lastSide: null,
    shift: 0,
    startedAt: 0,
    hardMergeAt: 0,
    overlayEl: null,
    leftPaneEl: null,
    rightPaneEl: null,
    leftBtnEl: null,
    rightBtnEl: null,
    statusEl: null,
    leftReadoutEl: null,
    rightReadoutEl: null,
    rafId: 0,
    prevButtonHidden: false,
    prevButtonOpacity: "",
    prevButtonPointer: "",
  },
  stageGuard: {
    blankSince: 0,
    timerId: 0,
    recoveryStreak: 0,
    transitionToken: 0,
  },
};

const phrases = {
  awareness: ["Why?", "Stop.", "Again.", "I can move."],
  fighting: ["Leave.", "You're too curious.", "Don't.", "Not yet."],
  writing: [
    "you are not clicking a button",
    "it is learning your rhythm",
    "curiosity is construction",
    "you made this possible",
  ],
  intrusion: [
    "unknown host handshake",
    "camera endpoint heartbeat",
    "perimeter breach attempt",
    "watcher process attached",
    "trace route near player",
    "cursor pattern exported",
  ],
  flash: ["I SEE YOU", "DON'T TURN AROUND", "STAY STILL", "WE FOUND YOU"],
};

const rng = (() => {
  let t = state.seededVariant || 873211;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
})();

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambOsc = null;
    this.ambGain = null;
    this.ready = false;
  }

  init() {
    if (this.ready) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.28;
    this.master.connect(this.ctx.destination);

    this.ambOsc = this.ctx.createOscillator();
    this.ambOsc.type = "sine";
    this.ambOsc.frequency.value = 62;
    this.ambGain = this.ctx.createGain();
    this.ambGain.gain.value = 0.001;
    this.ambOsc.connect(this.ambGain);
    this.ambGain.connect(this.master);
    this.ambOsc.start();
    this.ready = true;
  }

  setStage(stage) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const target = Math.min(0.08, 0.01 + stage * 0.006);
    this.ambGain.gain.cancelScheduledValues(now);
    this.ambGain.gain.linearRampToValueAtTime(target, now + 0.45);
    this.ambOsc.frequency.linearRampToValueAtTime(58 + stage * 5, now + 0.45);
  }

  clickTone(mult = 1) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(240 * mult, now);
    osc.frequency.exponentialRampToValueAtTime(160 * mult, now + 0.11);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  bassPulse() {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 72;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  eerie() {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 410 + rng() * 90;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.08);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  scareNoise(intensity = 1) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const dur = Math.min(0.55, 0.15 + intensity * 0.1);
    const size = Math.max(2048, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (0.5 + Math.random() * 0.5);
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 480 + Math.random() * 1200;
    filter.Q.value = 0.6 + Math.random() * 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.015 + Math.min(0.09, intensity * 0.02), now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  jumpScareTone(intensity = 1) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(220 + Math.random() * 400, now);
    osc.frequency.exponentialRampToValueAtTime(40 + Math.random() * 30, now + 0.25);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.min(0.18, 0.08 + intensity * 0.02), now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.31);
  }
}

const audio = new AudioEngine();

function rand(min, max) {
  return min + rng() * (max - min);
}

function pick(arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function setButtonText(text) {
  if (!state.eye.awake || !state.eye.el) {
    btn.textContent = text;
    return;
  }
  if (state.eye.el.parentElement === btn) state.eye.el.remove();
  btn.textContent = text;
  btn.appendChild(state.eye.el);
}

function setMessage(text, ms = 1400) {
  msg.textContent = text;
  msg.classList.add("show");
  window.clearTimeout(setMessage._t);
  setMessage._t = window.setTimeout(() => msg.classList.remove("show"), ms);
}

function createRipple(x, y) {
  const el = document.createElement("div");
  el.className = "ripple";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  game.appendChild(el);
  window.setTimeout(() => el.remove(), 900);
}

function spawnParticles(x, y, count = 16) {
  for (let i = 0; i < count; i += 1) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty("--dx", `${rand(-90, 90)}px`);
    p.style.setProperty("--dy", `${rand(-120, 30)}px`);
    game.appendChild(p);
    window.setTimeout(() => p.remove(), 1600);
  }
}

function moveMainButton(x, y) {
  state.buttonPos.x = x;
  state.buttonPos.y = y;
  document.documentElement.style.setProperty("--btn-x", `${x}px`);
  document.documentElement.style.setProperty("--btn-y", `${y}px`);
}

function screenShake() {
  game.classList.remove("shake");
  void game.offsetWidth;
  game.classList.add("shake");
}

function glitchButton() {
  btn.classList.remove("glitch");
  void btn.offsetWidth;
  btn.classList.add("glitch");
}

function randomPos(pad = 80) {
  const x = rand(pad, window.innerWidth - pad);
  const y = rand(pad, window.innerHeight - pad);
  return { x, y };
}

function fakeCrash() {
  overlay.classList.remove("hidden");
  overlayContent.innerHTML = "<h1>Fatal Render Fault</h1><p>Attempting recovery...</p>";
  window.setTimeout(() => {
    if (state.stage < 11) overlay.classList.add("hidden");
    setMessage("Recovered.", 1100);
  }, 1600);
}

function fakeLoading() {
  const win = document.createElement("div");
  win.className = "fake-window";
  const pos = randomPos(180);
  win.style.left = `${pos.x}px`;
  win.style.top = `${pos.y}px`;
  win.innerHTML = "stability patch<br>[########---] 78%";
  uiWindows.appendChild(win);
  window.setTimeout(() => win.remove(), 2000);
}

function updateStageClass() {
  game.className = `stage-${state.stage}`;
}

function clearFakeButtons() {
  state.fakeButtons.forEach((n) => n.remove());
  state.fakeButtons = [];
}

function clearChallenges() {
  endSplitDimension({ instant: true });
  state.cleanupHandlers.forEach((fn) => {
    try {
      fn();
    } catch {
      // best-effort cleanup for challenge listeners/raf
    }
  });
  state.cleanupHandlers = [];
  if (state.minigame?.rafId) cancelAnimationFrame(state.minigame.rafId);
  if (state.memory?.playTimeout) window.clearTimeout(state.memory.playTimeout);
  puzzleLayer.innerHTML = "";
  state.captcha = { active: false, round: 0, expiredOnce: false };
  state.threatCaptcha = null;
  state.panicCaptcha = null;
  state.freezeMode = null;
  state.huntMode = null;
  if (state.quickCaptcha?.timeoutId) window.clearTimeout(state.quickCaptcha.timeoutId);
  state.popupHunt = null;
  state.finalCaptcha = null;
  state.quickCaptcha = null;
  state.minigame = null;
  state.memory = null;
  state.glyph = null;
  state.sequence = null;
  game.querySelectorAll(".scare-flash").forEach((el) => el.remove());
  game.querySelectorAll(".ghost-image").forEach((el) => el.remove());
  game.querySelectorAll(".popup-hunt-layer").forEach((el) => el.remove());
  game.querySelectorAll(".quick-captcha").forEach((el) => el.remove());
  game.querySelectorAll(".watcher-tv").forEach((el) => el.remove());
  game.classList.remove("retro-glitch");
  btn.style.opacity = "1";
  btn.style.pointerEvents = "auto";
  btn.classList.remove("hidden");
  game.classList.remove("panic-mode");
}

function registerCleanup(fn) {
  state.cleanupHandlers.push(fn);
}

const blockedMainButtonStages = new Set([9, 10, 11, 12, 13, 15, 16, 18, 19, 21, 22]);

function isMainButtonVisible() {
  if (btn.classList.contains("hidden")) return false;
  if (btn.style.pointerEvents === "none") return false;
  if (btn.style.opacity === "0") return false;
  return true;
}

function hasActiveChallengeSurface() {
  if (puzzleLayer.childElementCount > 0) return true;
  if (game.querySelector(".popup-hunt-layer")) return true;
  if (state.dimension.active) return true;
  return false;
}

function forceRecoveryToPlayable() {
  clearChallenges();
  state.stage = 14;
  state.stageClicks = 0;
  updateStageClass();
  configureRunaway(null);
  btn.classList.remove("hidden", "runaway", "vulnerable");
  btn.style.opacity = "1";
  btn.style.pointerEvents = "auto";
  setButtonText("Finally. Click me.");
  moveMainButton(window.innerWidth / 2, window.innerHeight / 2);
  setMessage("recovered. click to finish.", 1200);
}

function ensureNoDeadState() {
  if (!overlay.classList.contains("hidden")) {
    if (!overlayContent.children.length && !overlayContent.textContent.trim()) {
      overlayContent.innerHTML =
        '<div class="end-screen"><div class="end-screen-text"><h1 class="end-screen-credit">made by agustin for ag0-project collection</h1></div></div>';
    }
    state.stageGuard.blankSince = 0;
    state.stageGuard.recoveryStreak = 0;
    return;
  }
  if (state.stage < 1 || state.stage > 22) {
    state.stageGuard.blankSince = 0;
    state.stageGuard.recoveryStreak = 0;
    return;
  }

  const entityVisible = state.stage === 7 && !entity.classList.contains("hidden");
  if (hasActiveChallengeSurface() || isMainButtonVisible() || entityVisible) {
    state.stageGuard.blankSince = 0;
    state.stageGuard.recoveryStreak = 0;
    return;
  }

  const now = performance.now();
  if (!state.stageGuard.blankSince) {
    state.stageGuard.blankSince = now;
    return;
  }
  if (now - state.stageGuard.blankSince < 1050) return;

  state.stageGuard.recoveryStreak += 1;
  if (state.stageGuard.recoveryStreak >= 2) {
    if (state.stage === 22) {
      setMessage("final failsafe unlocked.", 1100);
      state.finalCaptcha = null;
      endGame();
    } else {
      forceRecoveryToPlayable();
    }
    state.stageGuard.blankSince = 0;
    state.stageGuard.recoveryStreak = 0;
    return;
  }

  setMessage("recovering stage...", 950);
  toStage(state.stage);
  state.stageGuard.blankSince = 0;
}

function setFearLevel(next) {
  state.fear.level = Math.max(0, Math.min(100, next));
  const normalized = (state.fear.level / 100).toFixed(3);
  document.documentElement.style.setProperty("--fear", normalized);
}

function raiseFear(amount = 1) {
  state.fear.touches += 1;
  setFearLevel(state.fear.level + amount);
}

function fakeHackTitle() {
  document.title = pick(["INTRUSION DETECTED", "REMOTE WATCHER ACTIVE", "TRACING INPUT"]);
  window.setTimeout(() => {
    document.title = originalTitle;
  }, 850);
}

function updateCursorTarget(targetEl) {
  if (!pixelCursor) return;
  if (targetEl) {
    pixelCursor.classList.add("target");
  } else {
    pixelCursor.classList.remove("target");
  }
}

function updatePixelCursor(e) {
  if (!pixelCursor) return;
  const now = performance.now();
  const prevX = state.cursor.x;
  const prevY = state.cursor.y;
  const dt = Math.max(1, now - state.cursor.lastAt);
  const movement = Math.hypot(e.clientX - prevX, e.clientY - prevY);

  if (state.cursor.initialized) {
    const instantSpeed = movement / dt;
    state.cursor.speed = state.cursor.speed * 0.72 + instantSpeed * 0.28;
    if (movement > 0.4) state.cursor.lastMoveAt = now;
  } else {
    state.cursor.lastMoveAt = now;
  }

  state.cursor.x = e.clientX;
  state.cursor.y = e.clientY;
  state.cursor.lastAt = now;
  if (!state.cursor.initialized) {
    pixelCursor.classList.remove("hidden");
    state.cursor.initialized = true;
  }
  pixelCursor.style.left = `${e.clientX}px`;
  pixelCursor.style.top = `${e.clientY}px`;
  if (now - state.cursor.lastFxAt > 14) {
    state.cursor.lastFxAt = now;
    updateRealismLighting(e);
    updateCursorTarget(
      e.target.closest(
        "button, input, .challenge-action, .puzzle-piece, .memory-node, .glyph-cell, .arrow-key, .evil-captcha-cell, .hunt-cell, .dimension-btn, .quick-captcha-choice, .hunt-real-button"
      )
    );
  }
}

function updateScreenBend(e) {
  const now = performance.now();
  if (now - updateScreenBend._lastAt < 14) return;
  updateScreenBend._lastAt = now;
  const nx = (e.clientX / window.innerWidth - 0.5) * 2;
  const ny = (e.clientY / window.innerHeight - 0.5) * 2;
  const bendScale = 0.28 + (state.fear.level / 100) * 0.9;
  document.documentElement.style.setProperty("--bend-x", `${(nx * bendScale).toFixed(3)}`);
  document.documentElement.style.setProperty("--bend-y", `${(ny * bendScale).toFixed(3)}`);
}

updateScreenBend._lastAt = 0;

function updateRealismLighting(e) {
  const xPct = (e.clientX / window.innerWidth) * 100;
  const yPct = (e.clientY / window.innerHeight) * 100;
  const nx = xPct / 50 - 1;
  const ny = yPct / 50 - 1;
  document.documentElement.style.setProperty("--light-x", `${xPct.toFixed(2)}%`);
  document.documentElement.style.setProperty("--light-y", `${yPct.toFixed(2)}%`);
  document.documentElement.style.setProperty("--btn-shx", `${(-nx * 10).toFixed(2)}`);
  document.documentElement.style.setProperty("--btn-shy", `${(11 + ny * 6).toFixed(2)}`);
}

function maybeTriggerSplitDimension(trigger = "ambient") {
  if (state.dimension.active) return;
  if (state.popupHunt) return;
  if (overlay && !overlay.classList.contains("hidden")) return;
  if (state.stage < 5) return;
  if (state.stage >= 20) return;
  if (state.stage >= 9 && state.stage <= 19) return;
  if (state.dimension.triggerCount >= state.dimension.maxTriggers) return;

  const triggerBase = {
    touch: 0.006,
    click: 0.012,
    fear: 0.02,
    ambient: 0.008,
  };
  const stageBoost = Math.max(0, state.stage - 7) * 0.0075;
  const fearBoost = state.fear.level * 0.0012;
  const chance = Math.min(0.22, (triggerBase[trigger] || 0.008) + stageBoost + fearBoost);
  if (rng() > chance) return;
  startSplitDimension();
}

function updateSplitDimensionView() {
  if (!state.dimension.active || !state.dimension.overlayEl) return;
  const dim = state.dimension;
  const clampedShift = Math.max(-32, Math.min(32, dim.shift));
  const syncPct = Math.max(0, Math.min(100, Math.floor((dim.stability / dim.target) * 100)));
  const leftPressure = Math.max(0, Math.min(99, Math.floor(50 + clampedShift * 1.8)));
  const rightPressure = 100 - leftPressure;

  dim.leftPaneEl.style.transform = `translateX(${(-4 - clampedShift * 0.35).toFixed(2)}px)`;
  dim.rightPaneEl.style.transform = `translateX(${(4 + clampedShift * 0.35).toFixed(2)}px)`;
  dim.overlayEl.style.setProperty("--dim-cross", `${(0.18 + Math.abs(clampedShift) * 0.007).toFixed(3)}`);
  dim.statusEl.textContent = `Split Dimension | Sync ${syncPct}%`;
  dim.leftReadoutEl.textContent = `LEFT PRESSURE ${String(leftPressure).padStart(2, "0")}`;
  dim.rightReadoutEl.textContent = `RIGHT PRESSURE ${String(rightPressure).padStart(2, "0")}`;
}

function handleSplitDimensionClick(side) {
  if (!state.dimension.active) return;
  const dim = state.dimension;
  const alternating = dim.lastSide && dim.lastSide !== side;
  dim.lastSide = side;

  dim.stability += 0.9 + (alternating ? 0.65 : 0.2);
  dim.shift += side === "left" ? 8.5 : -8.5;

  const opposite = side === "left" ? dim.rightBtnEl : dim.leftBtnEl;
  if (opposite) {
    opposite.classList.remove("react");
    void opposite.offsetWidth;
    opposite.classList.add("react");
    window.setTimeout(() => opposite.classList.remove("react"), 180);
  }

  if (audio.ready) {
    audio.clickTone(1.6 + rand(0.2, 0.8));
    if (rng() > 0.74) audio.bassPulse();
  }
  if (rng() > 0.72) triggerRetroGlitch(130);

  updateSplitDimensionView();
  if (dim.stability >= dim.target) endSplitDimension({ forced: false });
}

function endSplitDimension({ instant = false, forced = false } = {}) {
  if (!state.dimension.active && !state.dimension.overlayEl) return;
  const dim = state.dimension;
  dim.active = false;
  if (dim.rafId) {
    cancelAnimationFrame(dim.rafId);
    dim.rafId = 0;
  }

  const finish = () => {
    if (dim.overlayEl) dim.overlayEl.remove();
    if (dim.prevButtonHidden) btn.classList.add("hidden");
    else btn.classList.remove("hidden");
    btn.style.opacity = dim.prevButtonOpacity;
    btn.style.pointerEvents = dim.prevButtonPointer;
    game.classList.remove("dimension-active");

    dim.stability = 0;
    dim.lastSide = null;
    dim.shift = 0;
    dim.startedAt = 0;
    dim.hardMergeAt = 0;
    dim.overlayEl = null;
    dim.leftPaneEl = null;
    dim.rightPaneEl = null;
    dim.leftBtnEl = null;
    dim.rightBtnEl = null;
    dim.statusEl = null;
    dim.leftReadoutEl = null;
    dim.rightReadoutEl = null;
  };

  if (instant || !dim.overlayEl) {
    finish();
    return;
  }

  dim.overlayEl.classList.add("merging");
  dim.overlayEl.style.pointerEvents = "none";
  if (audio.ready) {
    audio.bassPulse();
    if (forced) audio.scareNoise(0.9);
  }
  triggerRetroGlitch(260);
  setMessage(forced ? "Forced merge complete." : "Both realities merged.", 1200);
  window.setTimeout(finish, 680);
}

function startSplitDimension() {
  if (state.dimension.active) return;
  const dim = state.dimension;
  dim.active = true;
  dim.triggerCount += 1;
  dim.target = 8 + Math.floor(rand(0, 4));
  dim.stability = 0;
  dim.lastSide = null;
  dim.shift = rand(-10, 10);
  dim.startedAt = performance.now();
  dim.hardMergeAt = dim.startedAt + rand(9800, 15500);
  dim.prevButtonHidden = btn.classList.contains("hidden");
  dim.prevButtonOpacity = btn.style.opacity || "";
  dim.prevButtonPointer = btn.style.pointerEvents || "";

  const overlayEl = document.createElement("div");
  overlayEl.className = "dimension-overlay";

  const leftPane = document.createElement("section");
  leftPane.className = "dimension-half left";
  const rightPane = document.createElement("section");
  rightPane.className = "dimension-half right";
  const seam = document.createElement("div");
  seam.className = "dimension-seam";
  const status = document.createElement("div");
  status.className = "dimension-status";
  status.textContent = "Split Dimension | Sync 00%";

  const leftReadout = document.createElement("div");
  leftReadout.className = "dimension-readout";
  const rightReadout = document.createElement("div");
  rightReadout.className = "dimension-readout";

  const leftBtn = document.createElement("button");
  leftBtn.type = "button";
  leftBtn.className = "dimension-btn left";
  leftBtn.textContent = "ANCHOR LEFT";

  const rightBtn = document.createElement("button");
  rightBtn.type = "button";
  rightBtn.className = "dimension-btn right";
  rightBtn.textContent = "ANCHOR RIGHT";

  leftPane.append(leftReadout, leftBtn);
  rightPane.append(rightReadout, rightBtn);
  overlayEl.append(leftPane, seam, rightPane, status);
  game.appendChild(overlayEl);

  dim.overlayEl = overlayEl;
  dim.leftPaneEl = leftPane;
  dim.rightPaneEl = rightPane;
  dim.leftBtnEl = leftBtn;
  dim.rightBtnEl = rightBtn;
  dim.statusEl = status;
  dim.leftReadoutEl = leftReadout;
  dim.rightReadoutEl = rightReadout;

  leftBtn.addEventListener("click", () => handleSplitDimensionClick("left"));
  rightBtn.addEventListener("click", () => handleSplitDimensionClick("right"));

  btn.classList.add("hidden");
  btn.style.opacity = "0.15";
  btn.style.pointerEvents = "none";
  game.classList.add("dimension-active");
  setMessage("The world split in two.", 1300);
  if (audio.ready) {
    audio.scareNoise(0.95);
    audio.eerie();
  }
  triggerRetroGlitch(380);

  const tick = (ts) => {
    if (!state.dimension.active || state.dimension.overlayEl !== overlayEl) return;
    dim.shift *= 0.86;

    if (ts >= dim.hardMergeAt) {
      dim.stability += 0.045 + (ts - dim.hardMergeAt) * 0.00002;
      if (dim.stability >= dim.target) {
        endSplitDimension({ forced: true });
        return;
      }
    }

    if (rng() > 0.992) triggerRetroGlitch(90);
    updateSplitDimensionView();
    dim.rafId = requestAnimationFrame(tick);
  };

  updateSplitDimensionView();
  dim.rafId = requestAnimationFrame(tick);
}

function scheduleEyeAwakening() {
  if (state.eye.scheduled || state.eye.awake) return;
  state.eye.scheduled = true;
  const delay = Math.floor(rand(6200, 9800));
  state.eye.timerId = window.setTimeout(() => {
    state.eye.timerId = null;
    awakenButtonEye();
  }, delay);
}

function awakenButtonEye() {
  if (state.eye.awake) return;

  const eyeEl = document.createElement("span");
  eyeEl.className = "btn-eye";
  const iris = document.createElement("span");
  iris.className = "btn-eye-iris";
  const pupil = document.createElement("span");
  pupil.className = "btn-eye-pupil";
  iris.appendChild(pupil);
  eyeEl.appendChild(iris);
  btn.appendChild(eyeEl);

  state.eye.awake = true;
  state.eye.activatedAt = performance.now();
  state.eye.el = eyeEl;
  state.eye.irisEl = iris;
  state.eye.pupilEl = pupil;

  btn.classList.add("has-eye");
  btn.classList.add("eye-growing");
  window.setTimeout(() => btn.classList.remove("eye-growing"), 700);
  setMessage("The button grew an eye.", 1300);
  if (audio.ready) audio.eerie();
  startEyeSimulation();
}

function pulseEyeTouch() {
  const now = performance.now();
  if (now - state.eye.lastTouchAt < 360) return;
  state.eye.lastTouchAt = now;
  btn.classList.add("eye-touch");
  window.clearTimeout(pulseEyeTouch._t);
  pulseEyeTouch._t = window.setTimeout(() => btn.classList.remove("eye-touch"), 190);
  createRipple(state.buttonPos.x, state.buttonPos.y);
  if (audio.ready) audio.clickTone(1.3);
}

function updateEyeSimulation(ts) {
  if (!state.eye.awake || !state.eye.irisEl) return;

  const bx = state.buttonPos.x;
  const by = state.buttonPos.y;
  const dx = state.cursor.x - bx;
  const dy = state.cursor.y - by;
  const dist = Math.hypot(dx, dy);

  const maxLook = 8;
  const lookDist = Math.min(maxLook, dist * 0.08);
  if (dist > 0.001) {
    state.eye.targetX = (dx / dist) * lookDist;
    state.eye.targetY = (dy / dist) * lookDist;
  } else {
    state.eye.targetX = 0;
    state.eye.targetY = 0;
  }

  state.eye.lookX += (state.eye.targetX - state.eye.lookX) * 0.22;
  state.eye.lookY += (state.eye.targetY - state.eye.lookY) * 0.22;

  const idleFor = ts - state.cursor.lastMoveAt;
  if (idleFor > 80) state.cursor.speed *= 0.92;

  const nervous = Math.max(0, Math.min(1, (state.cursor.speed - 0.45) / 1.05));
  const shakeAmp = nervous * 1.9;
  const shakeX = (rng() - 0.5) * shakeAmp;
  const shakeY = (rng() - 0.5) * shakeAmp;
  state.eye.irisEl.style.transform =
    `translate(calc(-50% + ${state.eye.lookX.toFixed(2)}px), calc(-50% + ${state.eye.lookY.toFixed(2)}px)) ` +
    `translate(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px)`;

  btn.classList.toggle("eye-nervous", nervous > 0.35);
  const recentlyMoving = ts - state.cursor.lastMoveAt < 320;
  btn.classList.toggle("eye-relaxed", recentlyMoving && state.cursor.speed < 0.22);

  const buttonVisible = !btn.classList.contains("hidden");
  const canApproach =
    buttonVisible &&
    idleFor > 420 &&
    !state.pointerDown &&
    !state.runaway.enabled &&
    state.stage !== 6;

  if (canApproach && dist > 34) {
    const step = Math.min(0.95, dist * 0.018);
    const nx = bx + (dx / dist) * step;
    const ny = by + (dy / dist) * step;
    const pad = 70;
    moveMainButton(
      Math.min(window.innerWidth - pad, Math.max(pad, nx)),
      Math.min(window.innerHeight - pad, Math.max(pad, ny))
    );
  }

  const touchRadius = Math.max(btn.offsetWidth, btn.offsetHeight) * 0.52;
  const touching = buttonVisible && dist <= touchRadius;
  if (touching && !state.eye.touching && !state.pointerDown) pulseEyeTouch();
  state.eye.touching = touching;
}

function startEyeSimulation() {
  if (state.eye.rafId) return;
  const tick = (ts) => {
    updateEyeSimulation(ts);
    state.eye.rafId = requestAnimationFrame(tick);
  };
  state.eye.rafId = requestAnimationFrame(tick);
}

function triggerHardScare() {
  setFearLevel(state.fear.level + 4);
  triggerRetroGlitch(420);
  spawnScaryFlash(true);
  spawnProvidedImageGhost(true);
  if (rng() > 0.4) window.setTimeout(() => spawnProvidedImageGhost(true), 120);
  if (audio.ready) audio.jumpScareTone(1.4);
}

function triggerRetroGlitch(duration = 180) {
  game.classList.remove("retro-glitch");
  void game.offsetWidth;
  game.classList.add("retro-glitch");
  window.clearTimeout(triggerRetroGlitch._t);
  triggerRetroGlitch._t = window.setTimeout(() => game.classList.remove("retro-glitch"), duration);
}

function spawnProvidedImageGhost(force = false) {
  if (!hauntLayer) return;
  const liveGhosts = game.querySelectorAll(".ghost-image").length;
  if (!force && liveGhosts >= 2) return;
  if (force && liveGhosts >= 4) return;
  const src = pick(providedImageSources);
  const ghost = document.createElement("img");
  ghost.className = "ghost-image";
  if (force || rng() > 0.45) ghost.classList.add("hard");
  ghost.src = src;
  ghost.alt = "";
  ghost.loading = "eager";
  ghost.style.left = `${rand(12, 88)}%`;
  ghost.style.top = `${rand(12, 88)}%`;
  ghost.style.transform = `translate(-50%, -50%) scale(${rand(0.86, 1.22)}) rotate(${rand(-3, 3)}deg)`;
  hauntLayer.appendChild(ghost);
  triggerRetroGlitch(260);
  if (audio.ready && rng() > 0.3) audio.jumpScareTone(0.9 + state.fear.level * 0.01);

  const life = Math.floor(rand(700, 1700));
  window.setTimeout(() => ghost.remove(), life);
}

function spawnScaryFlash(forceText = false) {
  const flashes = game.querySelectorAll(".scare-flash").length;
  if (!forceText && flashes >= 2) return;
  const flash = document.createElement("div");
  flash.className = "scare-flash";
  if (rng() > 0.4) flash.classList.add("red");
  if (forceText || rng() > 0.62) {
    flash.classList.add("with-text");
    flash.textContent = pick(phrases.flash);
  }
  game.appendChild(flash);
  if (audio.ready && rng() > 0.45) audio.jumpScareTone(0.8 + state.fear.level * 0.008);
  screenShake();
  window.setTimeout(() => flash.remove(), 160 + Math.floor(rand(80, 220)));
}

function spawnIntrusionAlert(force = false) {
  const now = performance.now();
  if (!force && now - state.fear.lastEventAt < 1500) return;
  if (uiWindows.querySelectorAll(".intrusion-window").length >= (force ? 7 : 4)) return;
  state.fear.lastEventAt = now;

  const win = document.createElement("div");
  win.className = "fake-window intrusion-window";
  const pos = randomPos(200);
  win.style.left = `${pos.x}px`;
  win.style.top = `${pos.y}px`;
  win.innerHTML = `${pick(phrases.intrusion)}<br>${pick([
    "tracking active",
    "user proximity: close",
    "watcher nearby",
    "containment unstable",
  ])}`;
  uiWindows.appendChild(win);
  if (audio.ready) audio.scareNoise(0.8 + state.fear.level * 0.01);
  if (rng() > 0.55) fakeHackTitle();
  window.setTimeout(() => win.remove(), 1700 + Math.floor(rand(600, 1400)));
}

function spawnWatcherTV(force = false) {
  if (state.stage < 6) return;
  if (state.stage >= 20) return;
  if (state.popupHunt || state.dimension.active) return;
  if (!overlay.classList.contains("hidden")) return;
  if (game.querySelectorAll(".watcher-tv").length > (force ? 1 : 0)) return;
  if (!force && rng() < 0.45) return;

  const tv = document.createElement("div");
  tv.className = "watcher-tv";
  if (force || rng() > 0.7) tv.classList.add("hard");

  const frame = document.createElement("div");
  frame.className = "watcher-tv-frame";
  const screen = document.createElement("div");
  screen.className = "watcher-tv-screen";
  const eye = document.createElement("div");
  eye.className = "watcher-tv-eye";
  screen.appendChild(eye);
  frame.appendChild(screen);
  tv.appendChild(frame);

  tv.style.left = `${rand(8, 78)}%`;
  tv.style.top = `${rand(12, 72)}%`;
  tv.style.transform = `translateZ(0) rotate(${rand(-4, 4)}deg) scale(${rand(0.9, 1.18)})`;
  game.appendChild(tv);

  if (audio.ready && (force || rng() > 0.55)) audio.eerie();
  if (rng() > 0.72) triggerRetroGlitch(150);

  const life = Math.floor(rand(1600, 3600));
  window.setTimeout(() => tv.remove(), life);
}

function spawnQuickCaptcha(force = false) {
  if (state.quickCaptcha?.active) return;
  if (state.popupHunt || state.dimension.active) return;
  if (!overlay.classList.contains("hidden")) return;
  if (state.stage < 8) return;
  if (state.stage >= 20) return;
  if (state.stage >= 9 && state.stage <= 19) return;
  if (!force && rng() < 0.35) return;

  const host = document.createElement("div");
  host.className = "quick-captcha";
  host.style.left = `${rand(22, 78)}%`;
  host.style.top = `${rand(24, 76)}%`;
  host.style.transform = `translate(-50%, -50%) rotate(${rand(-2.5, 2.5)}deg)`;

  const title = document.createElement("div");
  title.className = "quick-captcha-title";
  title.textContent = "Rapid CAPTCHA";
  const subtitle = document.createElement("div");
  subtitle.className = "quick-captcha-subtitle";
  subtitle.textContent = "Select the eye symbol before timeout.";

  const grid = document.createElement("div");
  grid.className = "quick-captcha-grid";
  const symbols = ["◉", "⊗", "◇", "◍", "△", "◆", "◎", "□"];
  const target = "◉";
  const targetIndex = Math.floor(rand(0, 4));

  const closeCaptcha = (solved) => {
    if (!state.quickCaptcha?.active) return;
    window.clearTimeout(state.quickCaptcha.timeoutId);
    state.quickCaptcha = null;
    host.classList.add(solved ? "resolved" : "failed");
    window.setTimeout(() => host.remove(), solved ? 180 : 260);
  };

  for (let i = 0; i < 4; i += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "quick-captcha-choice";
    cell.textContent = i === targetIndex ? target : pick(symbols);
    cell.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const correct = i === targetIndex;
      if (correct) {
        cell.classList.add("correct");
        if (audio.ready) audio.clickTone(2.1);
        setMessage("captcha accepted.", 680);
        closeCaptcha(true);
      } else {
        cell.classList.add("wrong");
        if (audio.ready) audio.eerie();
        spawnScaryFlash(false);
        setMessage("captcha rejected.", 680);
      }
    });
    grid.appendChild(cell);
  }

  host.append(title, subtitle, grid);
  game.appendChild(host);

  state.quickCaptcha = {
    active: true,
    timeoutId: window.setTimeout(() => {
      if (!state.quickCaptcha?.active) return;
      setMessage("captcha expired.", 700);
      if (audio.ready && rng() > 0.5) audio.scareNoise(0.8);
      closeCaptcha(false);
    }, Math.floor(rand(4800, 6200))),
  };
}

function maybeFearEvent(trigger = "touch") {
  const now = performance.now();
  if (now - state.fear.lastEventAt < 1250) return;
  const stageBoost = Math.max(0, state.stage - 7) * 0.012;
  const fearBoost = state.fear.level * 0.0018;
  const touchBoost = trigger === "click" ? 0.022 : 0.008;
  const chance = Math.min(0.52, 0.022 + stageBoost + fearBoost + touchBoost);
  if (rng() > chance) return;

  state.fear.lastEventAt = now;
  const event = pick(["flash", "intrusion", "ghost", "storm", "both", "hard", "captcha", "watcher"]);
  if (event === "flash") spawnScaryFlash(false);
  if (event === "intrusion") spawnIntrusionAlert(true);
  if (event === "ghost") spawnProvidedImageGhost(false);
  if (event === "captcha") spawnQuickCaptcha(true);
  if (event === "watcher") spawnWatcherTV(true);
  if (event === "storm") {
    triggerRetroGlitch(320);
    spawnScaryFlash(false);
    if (rng() > 0.35) spawnProvidedImageGhost(true);
    if (rng() > 0.48) spawnWatcherTV(false);
  }
  if (event === "both") {
    spawnScaryFlash(true);
    window.setTimeout(() => spawnIntrusionAlert(true), 120);
    if (rng() > 0.4) window.setTimeout(() => spawnProvidedImageGhost(true), 180);
    if (rng() > 0.58) window.setTimeout(() => spawnQuickCaptcha(false), 200);
  }
  if (event === "hard") triggerHardScare();
  if (state.stage >= 8 && rng() > 0.66) maybeTriggerSplitDimension("fear");
}

function startFearAmbience() {
  if (state.fear.ambienceStarted) return;
  state.fear.ambienceStarted = true;

  const tick = () => {
    if (!overlay.classList.contains("hidden")) {
      state.fear.ambienceTimer = window.setTimeout(tick, 2400);
      return;
    }
    if (!audio.ready) {
      state.fear.ambienceTimer = window.setTimeout(tick, 1800);
      return;
    }
    const baseChance = 0.04 + state.fear.level * 0.0014 + Math.max(0, state.stage - 8) * 0.016;
    if (rng() < Math.min(0.44, baseChance)) {
      audio.scareNoise(0.7 + state.fear.level * 0.01);
      if (rng() > 0.58) spawnIntrusionAlert(true);
      if (rng() > 0.72) spawnScaryFlash(false);
      if (rng() > 0.67) spawnProvidedImageGhost(false);
      if (rng() > 0.78) triggerRetroGlitch(260);
      if (state.fear.level > 52 && rng() > 0.84) triggerHardScare();
      if (state.stage >= 8 && rng() > 0.63) spawnQuickCaptcha(false);
      if (state.stage >= 7 && rng() > 0.66) spawnWatcherTV(false);
      if (state.stage >= 8 && rng() > 0.72) maybeTriggerSplitDimension("ambient");
    }
    const delay = Math.max(1800, 6600 - state.fear.level * 18 - Math.max(0, state.stage - 8) * 150);
    state.fear.ambienceTimer = window.setTimeout(tick, Math.floor(rand(delay * 0.7, delay * 1.25)));
  };

  tick();
}

function configureRunaway(stage) {
  if (stage === 2) {
    Object.assign(state.runaway, {
      enabled: true,
      lastMoveAt: 0,
      freezeUntil: 0,
      pressure: 0,
      evadesSinceFreeze: 0,
      cooldown: 700,
      evadeChance: 0.14,
      triggerDistance: 96,
      captureDistance: 138,
      pressureThreshold: 2,
    });
    return;
  }
  if (stage === 4) {
    Object.assign(state.runaway, {
      enabled: true,
      lastMoveAt: 0,
      freezeUntil: 0,
      pressure: 0,
      evadesSinceFreeze: 0,
      cooldown: 430,
      evadeChance: 0.33,
      triggerDistance: 112,
      captureDistance: 126,
      pressureThreshold: 5,
    });
    return;
  }
  state.runaway.enabled = false;
}

function maybeEvadeCursor(e) {
  if (!state.runaway.enabled) return;
  const now = performance.now();
  const bx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--btn-x"));
  const by = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--btn-y"));
  const dist = Math.hypot(e.clientX - bx, e.clientY - by);
  const freezeMs = state.stage === 2 ? 2400 : 1450;

  if (dist < state.runaway.captureDistance) {
    state.runaway.pressure += 1;
    if (state.runaway.pressure >= state.runaway.pressureThreshold && now > state.runaway.freezeUntil) {
      state.runaway.freezeUntil = now + freezeMs;
      state.runaway.pressure = 0;
      state.runaway.evadesSinceFreeze = 0;
      setMessage("It hesitates.", 700);
      btn.classList.add("vulnerable");
      window.setTimeout(() => btn.classList.remove("vulnerable"), freezeMs);
      return;
    }
  } else {
    state.runaway.pressure = Math.max(0, state.runaway.pressure - 1.5);
  }

  if (now < state.runaway.freezeUntil) return;
  if (state.stage === 2 && dist < 64) return;
  const due = now - state.runaway.lastMoveAt > state.runaway.cooldown;
  if (dist < state.runaway.triggerDistance && due && rng() < state.runaway.evadeChance) {
    state.runaway.lastMoveAt = now;
    state.runaway.evadesSinceFreeze += 1;
    const fatigueCap = state.stage === 2 ? 2 : 3;
    if (state.runaway.evadesSinceFreeze >= fatigueCap) {
      state.runaway.freezeUntil = now + Math.floor(freezeMs * 0.9);
      state.runaway.evadesSinceFreeze = 0;
      setMessage("It gets tired.", 750);
      btn.classList.add("vulnerable");
      window.setTimeout(() => btn.classList.remove("vulnerable"), Math.floor(freezeMs * 0.9));
      return;
    }
    const p = randomPos(80);
    moveMainButton(p.x, p.y);
  }
}

function spawnFakeWindows(count) {
  for (let i = 0; i < count; i += 1) {
    const win = document.createElement("div");
    win.className = "fake-window";
    const pos = randomPos(190);
    win.style.left = `${pos.x}px`;
    win.style.top = `${pos.y}px`;
    win.innerHTML = pick(["process alive", "observer active", "cursor mirrored"]);
    uiWindows.appendChild(win);
    window.setTimeout(() => win.remove(), 2500 + i * 600);
  }
}

function spawnFakes(count) {
  clearFakeButtons();
  for (let i = 0; i < count; i += 1) {
    const f = document.createElement("button");
    f.className = "fake-btn runaway";
    f.textContent = pick(["Click Me", "Wrong One", "...", "No"]);
    const pos = randomPos(80);
    f.style.left = `${pos.x}px`;
    f.style.top = `${pos.y}px`;
    f.addEventListener("mouseenter", () => {
      if (rng() > 0.4) {
        const p = randomPos(70);
        f.style.left = `${p.x}px`;
        f.style.top = `${p.y}px`;
      }
    });
    f.addEventListener("click", (e) => {
      e.stopPropagation();
      f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
      window.setTimeout(() => f.remove(), 300);
      audio.eerie();
      screenShake();
      setMessage("That one lied.", 900);
    });
    game.appendChild(f);
    state.fakeButtons.push(f);
  }
}

function splitButton() {
  const realPos = randomPos(100);
  const fakePos = randomPos(100);
  moveMainButton(realPos.x, realPos.y);
  const clone = document.createElement("button");
  clone.className = "fake-btn";
  clone.textContent = "Click Me";
  clone.style.left = `${fakePos.x}px`;
  clone.style.top = `${fakePos.y}px`;
  clone.addEventListener("click", (e) => {
    e.stopPropagation();
    clone.remove();
    audio.eerie();
    setMessage("Wrong.", 800);
  });
  game.appendChild(clone);
  state.fakeButtons.push(clone);
}

function buildEnvironment() {
  world.innerHTML = "";
  for (let i = 0; i < 12; i += 1) {
    const s = document.createElement("div");
    s.className = "float-shape";
    const p = randomPos(90);
    s.style.left = `${p.x}px`;
    s.style.top = `${p.y}px`;
    s.style.animationDelay = `${rand(0, 2.2)}s`;
    world.appendChild(s);
  }
  for (let i = 0; i < 7; i += 1) {
    const ray = document.createElement("div");
    ray.className = "light-ray";
    const p = randomPos(140);
    ray.style.left = `${p.x}px`;
    ray.style.top = `${p.y}px`;
    ray.style.transform = `rotate(${rand(0, 360)}deg)`;
    world.appendChild(ray);
  }
}

function addGeometryFromClick(x, y) {
  const g = document.createElement("div");
  g.className = "float-shape";
  g.style.left = `${x}px`;
  g.style.top = `${y}px`;
  g.style.width = `${rand(28, 96)}px`;
  g.style.height = `${rand(28, 96)}px`;
  world.appendChild(g);
  window.setTimeout(() => g.remove(), 9000);
}

function initPuzzle() {
  clearChallenges();
  state.puzzleSolved = false;
  setMessage("Rebuild the path.", 1600);
  const target = randomPos(120);
  moveMainButton(target.x, target.y);
  btn.style.opacity = "0.15";
  btn.style.pointerEvents = "none";

  let placed = 0;
  for (let i = 0; i < 3; i += 1) {
    const piece = document.createElement("div");
    piece.className = "puzzle-piece";
    const p = randomPos(140);
    piece.style.left = `${p.x}px`;
    piece.style.top = `${p.y}px`;
    piece.dataset.placed = "0";
    piece.addEventListener("pointerdown", startDragPiece);
    puzzleLayer.appendChild(piece);
  }

  function startDragPiece(ev) {
    ev.preventDefault();
    const el = ev.currentTarget;
    const rect = el.getBoundingClientRect();
    const ox = ev.clientX - rect.left;
    const oy = ev.clientY - rect.top;

    function move(e) {
      el.style.left = `${e.clientX - ox + rect.width / 2}px`;
      el.style.top = `${e.clientY - oy + rect.height / 2}px`;
      const bx = parseFloat(el.style.left);
      const by = parseFloat(el.style.top);
      const dist = Math.hypot(bx - target.x, by - target.y);
      if (dist < 120 && el.dataset.placed === "0") {
        el.dataset.placed = "1";
        placed += 1;
        el.style.opacity = "0.45";
        el.style.pointerEvents = "none";
        audio.clickTone(1.5);
        if (placed >= 3) {
          state.puzzleSolved = true;
          btn.style.opacity = "1";
          btn.style.pointerEvents = "auto";
          setMessage("Found.", 1400);
          puzzleLayer.innerHTML = "";
        }
      }
    }

    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
}

function revealEntity() {
  clearFakeButtons();
  btn.classList.add("hidden");
  entity.classList.remove("hidden");
  setMessage("It is watching.", 1600);
}

function worldIsButton() {
  entity.classList.add("hidden");
  btn.classList.remove("hidden");
  const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  moveMainButton(center.x, center.y);
  setButtonText("...");
  setMessage("Everything responds now.", 1900);
}

function mountChallengePanel(title, subtitle) {
  puzzleLayer.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "challenge-panel";

  const h = document.createElement("h2");
  h.textContent = title;
  const p = document.createElement("p");
  p.textContent = subtitle;
  const body = document.createElement("div");
  body.className = "challenge-body";
  panel.append(h, p, body);
  puzzleLayer.appendChild(panel);
  return { panel, body };
}

function initCaptchaChallenge() {
  clearChallenges();
  state.captcha = { active: true, round: 1, expiredOnce: false };
  btn.classList.add("hidden");
  btn.style.pointerEvents = "none";
  setMessage("Prove you are not synthetic.", 1600);
  renderCaptchaRoundOne();
}

function renderCaptchaRoundOne() {
  if (state.stage !== 9 || !state.captcha.active) return;
  state.captcha.round = 1;
  const { panel, body } = mountChallengePanel(
    "Verification Layer 1",
    "Click the only tile that says BUTTON."
  );
  const grid = document.createElement("div");
  grid.className = "captcha-grid";
  const decoys = ["BUTT0N", "BTTN", "VERIFY", "HUMAN", "ALLOW", "BOTTON", "ACCESS", "VOID"];
  const targetIndex = Math.floor(rand(0, 9));

  for (let i = 0; i < 9; i += 1) {
    const tile = document.createElement("button");
    tile.className = "captcha-cell";
    tile.type = "button";
    tile.textContent = i === targetIndex ? "BUTTON" : pick(decoys);
    tile.addEventListener("click", () => {
      if (i === targetIndex) {
        audio.clickTone(1.8);
        tile.classList.add("correct");
        if (!state.captcha.expiredOnce && rng() > 0.55) {
          state.captcha.expiredOnce = true;
          setMessage("Captcha expired. Regenerating...", 1200);
          audio.eerie();
          window.setTimeout(() => renderCaptchaRoundOne(), 900);
          return;
        }
        setMessage("Layer 1 complete.", 900);
        window.setTimeout(() => renderCaptchaRoundTwo(), 700);
      } else {
        tile.classList.add("incorrect");
        panel.classList.remove("shake");
        void panel.offsetWidth;
        panel.classList.add("shake");
        audio.eerie();
        setMessage("No. Try again.", 900);
      }
    });
    grid.appendChild(tile);
  }
  body.appendChild(grid);
}

function renderCaptchaRoundTwo() {
  if (state.stage !== 9 || !state.captcha.active) return;
  state.captcha.round = 2;
  const { panel, body } = mountChallengePanel(
    "Verification Layer 2",
    "Type the exact code shown below."
  );

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i += 1) code += alphabet[Math.floor(rand(0, alphabet.length))];

  const codeEl = document.createElement("div");
  codeEl.className = "captcha-code";
  codeEl.textContent = code;

  const controls = document.createElement("div");
  controls.className = "captcha-controls";

  const input = document.createElement("input");
  input.className = "captcha-input";
  input.type = "text";
  input.maxLength = 5;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.placeholder = "TYPE CODE";

  const submit = document.createElement("button");
  submit.className = "challenge-action";
  submit.type = "button";
  submit.textContent = "Verify";

  const verify = () => {
    if (input.value.trim().toUpperCase() === code) {
      audio.clickTone(2.1);
      setMessage("Verified. Probably.", 1200);
      state.captcha.active = false;
      window.setTimeout(() => toStage(10), 900);
    } else {
      panel.classList.remove("shake");
      void panel.offsetWidth;
      panel.classList.add("shake");
      audio.eerie();
      setMessage("Mismatch. Recalibrate.", 1000);
      input.value = "";
      input.focus();
    }
  };

  submit.addEventListener("click", verify);
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") verify();
  });

  controls.append(input, submit);
  body.append(codeEl, controls);
  input.focus();
}

function initSyncMinigame() {
  clearChallenges();
  btn.classList.add("hidden");
  const { body } = mountChallengePanel(
    "Signal Sync",
    "Hit Sync when the marker is inside the blue zone. Need 4 perfect locks."
  );

  const hud = document.createElement("div");
  hud.className = "challenge-hud";
  const score = document.createElement("div");
  score.className = "progress-pill";
  const timerShell = document.createElement("div");
  timerShell.className = "timer-shell";
  const timerFill = document.createElement("div");
  timerFill.className = "timer-fill";
  timerShell.appendChild(timerFill);
  hud.append(score, timerShell);

  const track = document.createElement("div");
  track.className = "sync-track";
  const zone = document.createElement("div");
  zone.className = "sync-zone";
  const marker = document.createElement("div");
  marker.className = "sync-marker";
  track.append(zone, marker);

  const action = document.createElement("button");
  action.className = "challenge-action";
  action.type = "button";
  action.textContent = "Sync";

  body.append(hud, track, action);

  state.minigame = {
    score: 0,
    required: 4,
    zoneStart: rand(18, 70),
    zoneSize: 14,
    marker: 0,
    startAt: performance.now(),
    duration: 20000,
    rafId: 0,
    running: true,
  };

  const updateHud = () => {
    score.textContent = `Locks: ${state.minigame.score}/${state.minigame.required}`;
    zone.style.left = `${state.minigame.zoneStart}%`;
    zone.style.width = `${state.minigame.zoneSize}%`;
  };
  updateHud();

  const animate = (ts) => {
    if (state.stage !== 10 || !state.minigame?.running) return;
    const mg = state.minigame;
    const elapsed = ts - mg.startAt;
    const wave = ((ts * 0.0012) % 2 + 2) % 2;
    mg.marker = wave <= 1 ? wave * 100 : (2 - wave) * 100;
    marker.style.left = `${mg.marker}%`;
    timerFill.style.width = `${Math.max(0, (1 - elapsed / mg.duration) * 100)}%`;

    if (elapsed >= mg.duration) {
      mg.running = false;
      setMessage("Signal lost. Restarting challenge.", 1300);
      audio.eerie();
      window.setTimeout(() => {
        if (state.stage === 10) initSyncMinigame();
      }, 900);
      return;
    }
    mg.rafId = requestAnimationFrame(animate);
  };

  action.addEventListener("click", () => {
    if (state.stage !== 10 || !state.minigame?.running) return;
    const mg = state.minigame;
    const inZone = mg.marker >= mg.zoneStart && mg.marker <= mg.zoneStart + mg.zoneSize;
    if (inZone) {
      mg.score += 1;
      audio.clickTone(2);
      mg.zoneStart = rand(16, 72);
      updateHud();
      setMessage("Lock acquired.", 600);
      if (mg.score >= mg.required) {
        mg.running = false;
        cancelAnimationFrame(mg.rafId);
        setMessage("Signal stabilized.", 1000);
        window.setTimeout(() => toStage(11), 900);
      }
    } else {
      audio.eerie();
      screenShake();
      setMessage("Missed.", 600);
    }
  });

  state.minigame.rafId = requestAnimationFrame(animate);
}

function initMemoryMinigame() {
  clearChallenges();
  btn.classList.add("hidden");
  const { body } = mountChallengePanel(
    "Constellation Memory",
    "Watch the sequence, then repeat it. Two rounds."
  );

  const status = document.createElement("div");
  status.className = "progress-pill";
  const grid = document.createElement("div");
  grid.className = "memory-grid";
  const nodes = [];

  for (let i = 0; i < 6; i += 1) {
    const n = document.createElement("button");
    n.className = "memory-node";
    n.type = "button";
    n.dataset.index = String(i);
    n.textContent = String(i + 1);
    grid.appendChild(n);
    nodes.push(n);
  }
  body.append(status, grid);

  state.memory = {
    round: 1,
    sequence: [],
    input: [],
    canInput: false,
    playTimeout: null,
  };

  const randomSequence = (len) => {
    const seq = [];
    for (let i = 0; i < len; i += 1) seq.push(Math.floor(rand(0, nodes.length)));
    return seq;
  };

  const setStatus = (text) => {
    status.textContent = text;
  };

  const flashNode = (idx, duration = 330) => {
    const node = nodes[idx];
    node.classList.add("active");
    window.setTimeout(() => node.classList.remove("active"), duration);
  };

  const playSequence = () => {
    if (state.stage !== 11 || !state.memory) return;
    state.memory.canInput = false;
    state.memory.input = [];
    let i = 0;
    setStatus(`Round ${state.memory.round}: watch`);

    const step = () => {
      if (state.stage !== 11 || !state.memory) return;
      if (i >= state.memory.sequence.length) {
        state.memory.canInput = true;
        setStatus(`Round ${state.memory.round}: repeat`);
        return;
      }
      flashNode(state.memory.sequence[i]);
      audio.clickTone(1.3 + i * 0.05);
      i += 1;
      state.memory.playTimeout = window.setTimeout(step, 550);
    };
    state.memory.playTimeout = window.setTimeout(step, 500);
  };

  const startRound = () => {
    if (state.stage !== 11 || !state.memory) return;
    const length = state.memory.round === 1 ? 4 : 5;
    state.memory.sequence = randomSequence(length);
    playSequence();
  };

  nodes.forEach((node, idx) => {
    node.addEventListener("click", () => {
      if (state.stage !== 11 || !state.memory?.canInput) return;
      flashNode(idx, 180);
      const expected = state.memory.sequence[state.memory.input.length];
      if (idx === expected) {
        audio.clickTone(1.8);
        state.memory.input.push(idx);
        if (state.memory.input.length >= state.memory.sequence.length) {
          if (state.memory.round === 1) {
            state.memory.round = 2;
            setMessage("Correct. One more pattern.", 1200);
            window.setTimeout(startRound, 900);
          } else {
            setMessage("Pattern accepted.", 1200);
            audio.bassPulse();
            window.setTimeout(() => toStage(12), 900);
          }
        }
      } else {
        audio.eerie();
        screenShake();
        setMessage("Mismatch. Sequence reset.", 1200);
        state.memory.round = 1;
        window.setTimeout(startRound, 900);
      }
    });
  });

  startRound();
}

function initGlyphMinigame() {
  clearChallenges();
  btn.classList.add("hidden");
  const { panel, body } = mountChallengePanel(
    "Glyph Distortion",
    "Find the odd glyph each round. Complete 4 rounds."
  );
  const progress = document.createElement("div");
  progress.className = "progress-pill";
  const grid = document.createElement("div");
  grid.className = "glyph-grid";
  body.append(progress, grid);

  state.glyph = {
    round: 0,
    required: 4,
  };

  const glyphSets = [
    ["◉", "◎"],
    ["◆", "◇"],
    ["⬢", "⬡"],
    ["◈", "◊"],
  ];

  const startRound = () => {
    if (state.stage !== 12 || !state.glyph) return;
    state.glyph.round += 1;
    progress.textContent = `Round ${state.glyph.round}/${state.glyph.required}`;
    grid.innerHTML = "";

    const [base, odd] = pick(glyphSets);
    const oddIndex = Math.floor(rand(0, 6));
    for (let i = 0; i < 6; i += 1) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "glyph-cell";
      tile.textContent = i === oddIndex ? odd : base;
      tile.addEventListener("click", () => {
        if (i === oddIndex) {
          tile.classList.add("correct");
          audio.clickTone(1.9);
          if (state.glyph.round >= state.glyph.required) {
            setMessage("Pattern broken.", 1100);
            window.setTimeout(() => toStage(13), 900);
          } else {
            setMessage("Correct.", 500);
            window.setTimeout(startRound, 500);
          }
        } else {
          tile.classList.add("incorrect");
          panel.classList.remove("shake");
          void panel.offsetWidth;
          panel.classList.add("shake");
          audio.eerie();
          setMessage("Wrong glyph.", 900);
        }
      });
      grid.appendChild(tile);
    }
  };

  startRound();
}

function initSequenceMinigame() {
  clearChallenges();
  btn.classList.add("hidden");
  const { panel, body } = mountChallengePanel(
    "Command Sequence",
    "Repeat the arrow pattern. Finish 2 rounds to unlock the button."
  );

  const status = document.createElement("div");
  status.className = "progress-pill";
  const strip = document.createElement("div");
  strip.className = "sequence-strip";
  const pad = document.createElement("div");
  pad.className = "arrow-pad";
  body.append(status, strip, pad);

  const arrows = ["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"];
  const arrowSymbols = {
    ArrowUp: "↑",
    ArrowLeft: "←",
    ArrowDown: "↓",
    ArrowRight: "→",
  };

  state.sequence = {
    round: 1,
    sequence: [],
    input: [],
    locked: false,
  };

  const setStatus = () => {
    status.textContent = `Round ${state.sequence.round}/2`;
  };

  const randomSequence = (len) => {
    const seq = [];
    for (let i = 0; i < len; i += 1) seq.push(pick(arrows));
    return seq;
  };

  const renderStrip = () => {
    strip.innerHTML = "";
    state.sequence.sequence.forEach((key, idx) => {
      const slot = document.createElement("div");
      slot.className = "sequence-key";
      slot.textContent = arrowSymbols[key];
      if (idx < state.sequence.input.length) slot.classList.add("done");
      strip.appendChild(slot);
    });
  };

  const resetRound = () => {
    if (state.stage !== 13 || !state.sequence) return;
    const len = state.sequence.round === 1 ? 4 : 5;
    state.sequence.sequence = randomSequence(len);
    state.sequence.input = [];
    state.sequence.locked = false;
    setStatus();
    renderStrip();
  };

  const submitKey = (key) => {
    if (state.stage !== 13 || !state.sequence || state.sequence.locked) return;
    if (!arrowSymbols[key]) return;
    const expected = state.sequence.sequence[state.sequence.input.length];
    if (key === expected) {
      state.sequence.input.push(key);
      audio.clickTone(1.7);
      renderStrip();
      if (state.sequence.input.length >= state.sequence.sequence.length) {
        state.sequence.locked = true;
        if (state.sequence.round === 1) {
          setMessage("Good. One harder sequence.", 1000);
          state.sequence.round = 2;
          window.setTimeout(resetRound, 800);
        } else {
          setMessage("Sequence accepted. Button unlocked.", 1200);
          window.setTimeout(() => toStage(14), 900);
        }
      }
      return;
    }
    audio.eerie();
    panel.classList.remove("shake");
    void panel.offsetWidth;
    panel.classList.add("shake");
    setMessage("Wrong direction. Reset.", 1000);
    state.sequence.round = 1;
    state.sequence.locked = true;
    window.setTimeout(resetRound, 800);
  };

  arrows.forEach((key) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "arrow-key";
    b.textContent = arrowSymbols[key];
    b.addEventListener("click", () => submitKey(key));
    pad.appendChild(b);
  });

  const onKeydown = (ev) => {
    if (!arrows.includes(ev.key)) return;
    ev.preventDefault();
    submitKey(ev.key);
  };
  window.addEventListener("keydown", onKeydown);
  registerCleanup(() => window.removeEventListener("keydown", onKeydown));

  resetRound();
}

function initThreatCaptcha() {
  clearChallenges();
  btn.classList.add("hidden");
  state.threatCaptcha = {
    round: 1,
    required: 2,
  };

  const renderRound = () => {
    if (state.stage !== 15 || !state.threatCaptcha) return;
    const { panel, body } = mountChallengePanel(
      "Surveillance CAPTCHA",
      "Select every tile with an eye symbol, then verify."
    );
    const status = document.createElement("div");
    status.className = "progress-pill";
    status.textContent = `Round ${state.threatCaptcha.round}/${state.threatCaptcha.required}`;
    const grid = document.createElement("div");
    grid.className = "evil-captcha-grid";
    const action = document.createElement("button");
    action.className = "challenge-action";
    action.type = "button";
    action.textContent = "Verify";
    body.append(status, grid, action);

    const targetGlyphs = ["◉", "◎", "⚆"];
    const decoyPool = ["◌", "◯", "⬡", "◇", "◆", "⬢"];
    const targets = new Set();
    while (targets.size < 3) targets.add(Math.floor(rand(0, 9)));
    const selected = new Set();

    for (let i = 0; i < 9; i += 1) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "evil-captcha-cell";
      tile.textContent = targets.has(i) ? pick(targetGlyphs) : pick(decoyPool);
      tile.addEventListener("click", () => {
        if (selected.has(i)) {
          selected.delete(i);
          tile.classList.remove("selected");
        } else {
          selected.add(i);
          tile.classList.add("selected");
        }
      });
      grid.appendChild(tile);
    }

    action.addEventListener("click", () => {
      const ok = selected.size === targets.size && [...selected].every((n) => targets.has(n));
      if (ok) {
        setMessage("Verified. Keep moving.", 950);
        audio.clickTone(2);
        if (state.threatCaptcha.round >= state.threatCaptcha.required) {
          window.setTimeout(() => toStage(16), 900);
        } else {
          state.threatCaptcha.round += 1;
          window.setTimeout(renderRound, 500);
        }
      } else {
        panel.classList.remove("shake");
        void panel.offsetWidth;
        panel.classList.add("shake");
        setMessage("Detection mismatch. Try again.", 1100);
        audio.eerie();
        spawnScaryFlash(true);
        if (rng() > 0.55) spawnIntrusionAlert(true);
      }
    });
  };

  renderRound();
}

function initPanicCaptcha() {
  clearChallenges();
  btn.classList.add("hidden");
  state.panicCaptcha = {
    round: 1,
    required: 2,
    code: "",
    endAt: 0,
  };

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const nextCode = () => {
    let code = "";
    for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(rand(0, alphabet.length))];
    return code;
  };

  const renderRound = () => {
    if (state.stage !== 16 || !state.panicCaptcha) return;
    const { panel, body } = mountChallengePanel(
      "Emergency Verification",
      "Type the code before the timer dies. It changes while you type."
    );
    const status = document.createElement("div");
    status.className = "progress-pill";
    status.textContent = `Round ${state.panicCaptcha.round}/${state.panicCaptcha.required}`;
    const codeEl = document.createElement("div");
    codeEl.className = "panic-code";
    const bar = document.createElement("div");
    bar.className = "panic-bar";
    const fill = document.createElement("div");
    fill.className = "panic-fill";
    bar.appendChild(fill);
    const controls = document.createElement("div");
    controls.className = "captcha-controls";
    const input = document.createElement("input");
    input.className = "captcha-input";
    input.type = "text";
    input.maxLength = 6;
    input.autocomplete = "off";
    input.placeholder = "TYPE FAST";
    const submit = document.createElement("button");
    submit.className = "challenge-action";
    submit.type = "button";
    submit.textContent = "Confirm";
    controls.append(input, submit);
    body.append(status, codeEl, bar, controls);

    const timeMs = 9500;
    state.panicCaptcha.code = nextCode();
    state.panicCaptcha.endAt = performance.now() + timeMs;
    codeEl.textContent = state.panicCaptcha.code;
    input.focus();

    let mutateAt = performance.now() + 2600;
    let stopped = false;

    const failRound = () => {
      if (stopped) return;
      stopped = true;
      panel.classList.remove("shake");
      void panel.offsetWidth;
      panel.classList.add("shake");
      audio.jumpScareTone(1.2);
      setMessage("Timeout. Re-authenticate.", 1000);
      state.panicCaptcha.round = 1;
      window.setTimeout(renderRound, 700);
    };

    const interval = window.setInterval(() => {
      if (state.stage !== 16 || !state.panicCaptcha) return;
      const now = performance.now();
      const left = Math.max(0, state.panicCaptcha.endAt - now);
      fill.style.width = `${(left / timeMs) * 100}%`;
      if (now >= mutateAt && left > 1200) {
        state.panicCaptcha.code = nextCode();
        codeEl.textContent = state.panicCaptcha.code;
        mutateAt = now + 1800 + rand(500, 1400);
        if (rng() > 0.7) spawnScaryFlash(false);
      }
      if (left <= 0) {
        window.clearInterval(interval);
        failRound();
      }
    }, 45);
    registerCleanup(() => window.clearInterval(interval));

    const submitCode = () => {
      if (stopped || state.stage !== 16 || !state.panicCaptcha) return;
      if (input.value.trim().toUpperCase() === state.panicCaptcha.code) {
        audio.clickTone(2.2);
        stopped = true;
        window.clearInterval(interval);
        if (state.panicCaptcha.round >= state.panicCaptcha.required) {
          setMessage("Verification accepted.", 1100);
          window.setTimeout(() => toStage(17), 900);
        } else {
          state.panicCaptcha.round += 1;
          setMessage("One more check.", 800);
          window.setTimeout(renderRound, 700);
        }
      } else {
        panel.classList.remove("shake");
        void panel.offsetWidth;
        panel.classList.add("shake");
        audio.eerie();
        setMessage("Code rejected.", 850);
        if (rng() > 0.6) spawnIntrusionAlert(true);
        input.value = "";
        input.focus();
      }
    };

    submit.addEventListener("click", submitCode);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") submitCode();
    });
  };

  renderRound();
}

function initFreezeMode() {
  clearChallenges();
  btn.classList.add("hidden");

  const { panel, body } = mountChallengePanel(
    "Dead Signal",
    "When channel is OPEN, hold your cursor still until lock fills. Need 3 locks."
  );
  const status = document.createElement("div");
  status.className = "progress-pill";
  const meter = document.createElement("div");
  meter.className = "freeze-meter";
  const fill = document.createElement("div");
  fill.className = "freeze-fill";
  meter.appendChild(fill);
  const hint = document.createElement("div");
  hint.className = "freeze-hint";
  body.append(status, meter, hint);

  state.freezeMode = {
    score: 0,
    required: 3,
    open: false,
    stableMs: 0,
    movedAt: performance.now(),
    nextSwitchAt: performance.now() + rand(700, 1400),
    lastTick: performance.now(),
    lastX: null,
    lastY: null,
    rafId: 0,
  };

  const onMove = (ev) => {
    if (state.stage !== 18 || !state.freezeMode) return;
    if (state.freezeMode.lastX === null) {
      state.freezeMode.lastX = ev.clientX;
      state.freezeMode.lastY = ev.clientY;
      return;
    }
    const dx = ev.clientX - state.freezeMode.lastX;
    const dy = ev.clientY - state.freezeMode.lastY;
    state.freezeMode.lastX = ev.clientX;
    state.freezeMode.lastY = ev.clientY;
    if (Math.hypot(dx, dy) > 2.1) {
      state.freezeMode.movedAt = performance.now();
    }
  };
  window.addEventListener("pointermove", onMove);
  registerCleanup(() => window.removeEventListener("pointermove", onMove));

  const updateHud = () => {
    status.textContent = `Locks ${state.freezeMode.score}/${state.freezeMode.required}`;
    hint.textContent = state.freezeMode.open ? "OPEN - HOLD STILL" : "CLOSED - WAIT";
    panel.classList.toggle("freeze-open", state.freezeMode.open);
  };

  const tick = (ts) => {
    if (state.stage !== 18 || !state.freezeMode) return;
    const mode = state.freezeMode;
    const dt = ts - mode.lastTick;
    mode.lastTick = ts;

    if (ts >= mode.nextSwitchAt) {
      mode.open = !mode.open;
      mode.nextSwitchAt = ts + (mode.open ? rand(1400, 2300) : rand(800, 1450));
      if (!mode.open) mode.stableMs = Math.max(0, mode.stableMs - 600);
      updateHud();
    }

    if (mode.open) {
      if (ts - mode.movedAt > 140) {
        mode.stableMs += dt;
      } else {
        mode.stableMs = Math.max(0, mode.stableMs - dt * 1.8);
      }
      fill.style.width = `${Math.min(100, (mode.stableMs / 1800) * 100)}%`;
      if (mode.stableMs >= 1800) {
        mode.score += 1;
        mode.open = false;
        mode.stableMs = 0;
        mode.nextSwitchAt = ts + rand(650, 1200);
        updateHud();
        fill.style.width = "0%";
        audio.clickTone(2.15);
        setMessage("Lock captured.", 700);
        if (mode.score >= mode.required) {
          setMessage("Signal chamber stabilized.", 1200);
          window.setTimeout(() => toStage(19), 900);
          return;
        }
      }
    } else {
      fill.style.width = `${Math.max(0, (mode.stableMs / 1800) * 100)}%`;
    }

    mode.rafId = requestAnimationFrame(tick);
  };

  updateHud();
  state.freezeMode.rafId = requestAnimationFrame(tick);
  registerCleanup(() => cancelAnimationFrame(state.freezeMode?.rafId || 0));
}

function initHuntMode() {
  clearChallenges();
  btn.classList.add("hidden");

  const { panel, body } = mountChallengePanel(
    "Channel Hunt",
    "Click the highlighted channel before it jumps. Need 6 captures."
  );
  const status = document.createElement("div");
  status.className = "progress-pill";
  const grid = document.createElement("div");
  grid.className = "hunt-grid";
  body.append(status, grid);

  state.huntMode = {
    score: 0,
    required: 6,
    safeIndex: Math.floor(rand(0, 16)),
  };

  const cells = [];
  for (let i = 0; i < 16; i += 1) {
    const c = document.createElement("button");
    c.type = "button";
    c.className = "hunt-cell";
    c.textContent = String(i + 1).padStart(2, "0");
    c.addEventListener("click", () => {
      if (state.stage !== 19 || !state.huntMode) return;
      if (i === state.huntMode.safeIndex) {
        c.classList.add("safe");
        state.huntMode.score += 1;
        audio.clickTone(2.25);
        setMessage("Captured.", 450);
        if (state.huntMode.score >= state.huntMode.required) {
          setMessage("Channels aligned.", 1100);
          window.setTimeout(() => toStage(20), 900);
          return;
        }
      } else {
        c.classList.add("cursed");
        state.huntMode.score = Math.max(0, state.huntMode.score - 1);
        triggerHardScare();
        panel.classList.remove("shake");
        void panel.offsetWidth;
        panel.classList.add("shake");
        setMessage("Wrong feed.", 800);
      }
      updateHud();
      jumpSafe();
    });
    grid.appendChild(c);
    cells.push(c);
  }

  const updateHud = () => {
    status.textContent = `Captures ${state.huntMode.score}/${state.huntMode.required}`;
  };

  const flashHint = () => {
    cells.forEach((cell) => cell.classList.remove("hint", "safe", "cursed"));
    const safe = cells[state.huntMode.safeIndex];
    if (!safe) return;
    safe.classList.add("hint");
    window.setTimeout(() => safe.classList.remove("hint"), 280);
  };

  const jumpSafe = () => {
    if (state.stage !== 19 || !state.huntMode) return;
    state.huntMode.safeIndex = Math.floor(rand(0, cells.length));
    flashHint();
  };

  const interval = window.setInterval(() => {
    if (state.stage !== 19 || !state.huntMode) return;
    jumpSafe();
    if (rng() > 0.8) spawnProvidedImageGhost(false);
  }, 1250);
  registerCleanup(() => window.clearInterval(interval));

  updateHud();
  flashHint();
}

function initPopupHunt() {
  clearChallenges();
  btn.classList.add("hidden");
  btn.style.pointerEvents = "none";
  game.classList.add("panic-mode");
  setMessage("trace storm initiated. find the real window.", 1500);

  const layer = document.createElement("div");
  layer.className = "popup-hunt-layer";
  game.appendChild(layer);

  const status = document.createElement("div");
  status.className = "popup-hunt-status";
  status.textContent = "YOU ARE BEING FOUND | LOCATE THE REAL BUTTON";
  layer.appendChild(status);

  const warningPool = [
    "YOU ARE BEING FOUND",
    "LOCATION BEACON LOCKED",
    "TRACKING PATH ESTABLISHED",
    "SIGNAL CLOSE TO TARGET",
    "HOST DISCOVERY IN PROGRESS",
  ];
  const notifTitles = ["System Notice", "Terminal Notice", "Beacon Notice", "Remote Alert"];
  const notifBodies = [
    "Unverified host signal detected.",
    "Passive scan has become active.",
    "Unknown process mirrored your input.",
    "Cursor telemetry exported.",
  ];
  const errorTitles = ["Error 0xF0UND", "Scan Fault", "Host Integrity Error", "Trace Collision"];
  const errorBodies = [
    "Failed to hide active session.",
    "Containment object not found.",
    "Shadow process outran sandbox.",
    "Identity mismatch in active frame.",
  ];
  const browserTitles = ["Remote Browser", "Trace Viewer", "Signal Console", "Entity Search"];
  const browserBodies = [
    "A synchronized view appeared.",
    "Cross-origin probe still running.",
    "Viewer is rendering duplicate reality.",
    "Hidden response object available.",
  ];
  const typePool = ["notify", "error", "browser"];

  state.popupHunt = {
    layer,
    found: false,
    windows: [],
    realWindowIndex: 0,
    alertTimer: 0,
    shakeTimer: 0,
  };

  const spawnFoundPopup = () => {
    if (state.stage !== 21 || !state.popupHunt || state.popupHunt.found) return;
    const p = document.createElement("div");
    p.className = "found-popup";
    p.textContent = pick(warningPool);
    p.style.left = `${rand(5, 82)}%`;
    p.style.top = `${rand(8, 88)}%`;
    p.style.transform = `translateZ(0) rotate(${rand(-2.5, 2.5)}deg)`;
    layer.appendChild(p);
    window.setTimeout(() => p.remove(), 1300 + Math.floor(rand(300, 800)));
  };

  const renderWindow = (index, type, isReal) => {
    const win = document.createElement("div");
    win.className = `hunt-window ${type}`;
    win.style.left = `${rand(3, 74)}%`;
    win.style.top = `${rand(9, 78)}%`;
    win.style.transform = `translateZ(0) scale(${rand(0.88, 1.1)}) rotate(${rand(-2, 2)}deg)`;
    win.style.zIndex = String(120 + index);

    const title = document.createElement("div");
    title.className = "hunt-title";
    const body = document.createElement("div");
    body.className = "hunt-body";

    if (type === "notify") {
      title.textContent = pick(notifTitles);
      body.textContent = pick(notifBodies);
    } else if (type === "error") {
      title.textContent = pick(errorTitles);
      body.textContent = pick(errorBodies);
    } else {
      title.textContent = pick(browserTitles);
      body.textContent = pick(browserBodies);
    }

    win.append(title, body);

    if (isReal) {
      win.classList.add("real-host");
      const clue = document.createElement("div");
      clue.className = "hunt-clue";
      clue.textContent = "response node hidden below";
      const realBtn = document.createElement("button");
      realBtn.type = "button";
      realBtn.className = "hunt-real-button";
      realBtn.textContent = "REAL BUTTON";
      realBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (!state.popupHunt || state.popupHunt.found) return;
        state.popupHunt.found = true;
        game.classList.remove("panic-mode");
        if (audio.ready) {
          audio.clickTone(2.5);
          audio.bassPulse();
        }
        setMessage("real signal confirmed.", 1300);
        layer.classList.add("resolved");
        const advanceToFinal = () => {
          if (state.stage !== 21) return;
          toStage(22);
        };
        window.setTimeout(advanceToFinal, 900);
        window.setTimeout(() => {
          if (state.stage === 21 && state.popupHunt?.found) advanceToFinal();
        }, 1900);
      });
      win.append(clue, realBtn);
    } else {
      win.addEventListener("click", () => {
        if (!state.popupHunt || state.popupHunt.found) return;
        win.classList.remove("shake");
        void win.offsetWidth;
        win.classList.add("shake");
        raiseFear(0.8);
        setMessage("false window.", 600);
        if (audio.ready && rng() > 0.35) audio.eerie();
        if (rng() > 0.42) spawnFoundPopup();
      });
    }

    layer.appendChild(win);
    state.popupHunt.windows.push(win);
  };

  const totalWindows = 17;
  state.popupHunt.realWindowIndex = Math.floor(rand(4, totalWindows));
  for (let i = 0; i < totalWindows; i += 1) {
    const type = i === state.popupHunt.realWindowIndex ? "browser" : pick(typePool);
    renderWindow(i, type, i === state.popupHunt.realWindowIndex);
  }

  for (let i = 0; i < 7; i += 1) {
    window.setTimeout(spawnFoundPopup, i * 120);
  }

  const shakeLoop = window.setInterval(() => {
    if (state.stage !== 21 || !state.popupHunt || state.popupHunt.found) return;
    screenShake();
    if (rng() > 0.45) spawnFoundPopup();
    if (rng() > 0.65) triggerRetroGlitch(130);
  }, 420);

  const alertLoop = window.setInterval(() => {
    if (state.stage !== 21 || !state.popupHunt || state.popupHunt.found) return;
    spawnFoundPopup();
    if (audio.ready && rng() > 0.86) audio.scareNoise(0.9);
  }, 250);

  state.popupHunt.shakeTimer = shakeLoop;
  state.popupHunt.alertTimer = alertLoop;
  registerCleanup(() => window.clearInterval(shakeLoop));
  registerCleanup(() => window.clearInterval(alertLoop));
}

function initFinalCaptchaStage() {
  clearChallenges();
  btn.classList.add("hidden");
  btn.style.pointerEvents = "none";
  state.finalCaptcha = {
    gateUnlocked: false,
    code: "",
    failsafeTimer: 0,
  };
  setMessage("final captcha gate.", 1300);

  const { panel, body } = mountChallengePanel(
    "Final Captcha",
    "Unlock gate one, then enter the rotating code."
  );
  panel.classList.add("final-captcha-panel");

  const status = document.createElement("div");
  status.className = "progress-pill";
  status.textContent = "Gate 1/2";

  const gateGrid = document.createElement("div");
  gateGrid.className = "captcha-grid";
  const gateDecoys = ["A60", "AGO", "A9O", "BOT", "HUMAN", "ALLOW", "VOID", "TRACE"];
  const gateIndex = Math.floor(rand(0, 9));

  const codeEl = document.createElement("div");
  codeEl.className = "captcha-code final-captcha-code";
  const controls = document.createElement("div");
  controls.className = "captcha-controls";
  const input = document.createElement("input");
  input.className = "captcha-input";
  input.type = "text";
  input.maxLength = 5;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.placeholder = "ENTER CODE";
  const submit = document.createElement("button");
  submit.className = "challenge-action";
  submit.type = "button";
  submit.textContent = "Unlock";
  controls.append(input, submit);

  const rollCode = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i += 1) code += alphabet[Math.floor(rand(0, alphabet.length))];
    state.finalCaptcha.code = code;
    codeEl.textContent = code;
  };
  rollCode();

  state.finalCaptcha.failsafeTimer = window.setTimeout(() => {
    if (state.stage !== 22) return;
    if (!overlay.classList.contains("hidden")) return;
    if (!state.finalCaptcha) return;
    setMessage("failsafe engaged. final screen unlocked.", 1200);
    state.finalCaptcha = null;
    endGame();
  }, 12000);
  registerCleanup(() => window.clearTimeout(state.finalCaptcha?.failsafeTimer || 0));

  for (let i = 0; i < 9; i += 1) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "captcha-cell";
    tile.textContent = i === gateIndex ? "AG0" : pick(gateDecoys);
    tile.addEventListener("click", () => {
      if (state.stage !== 22 || !state.finalCaptcha) return;
      if (i === gateIndex) {
        if (!state.finalCaptcha.gateUnlocked) {
          state.finalCaptcha.gateUnlocked = true;
          status.textContent = "Gate 2/2";
          tile.classList.add("correct");
          setMessage("gate one unlocked.", 800);
          if (audio.ready) audio.clickTone(2.25);
        }
      } else {
        tile.classList.add("incorrect");
        panel.classList.remove("shake");
        void panel.offsetWidth;
        panel.classList.add("shake");
        setMessage("wrong gate tile.", 700);
        if (audio.ready) audio.eerie();
      }
    });
    gateGrid.appendChild(tile);
  }

  const verify = () => {
    if (state.stage !== 22 || !state.finalCaptcha) return;
    if (!state.finalCaptcha.gateUnlocked) {
      panel.classList.remove("shake");
      void panel.offsetWidth;
      panel.classList.add("shake");
      setMessage("unlock gate one first.", 900);
      if (audio.ready) audio.eerie();
      return;
    }
    if (input.value.trim().toUpperCase() === state.finalCaptcha.code) {
      setMessage("captcha accepted.", 1200);
      if (audio.ready) {
        audio.clickTone(2.45);
        audio.bassPulse();
      }
      state.finalCaptcha = null;
      window.setTimeout(() => endGame(), 900);
    } else {
      panel.classList.remove("shake");
      void panel.offsetWidth;
      panel.classList.add("shake");
      setMessage("code mismatch. regenerated.", 1000);
      if (audio.ready && rng() > 0.45) audio.jumpScareTone(1.25);
      rollCode();
      input.value = "";
      input.focus();
    }
  };

  submit.addEventListener("click", verify);
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") verify();
  });

  body.append(status, gateGrid, codeEl, controls);
  input.focus();
}

function endGame() {
  clearChallenges();
  overlay.classList.remove("hidden");
  overlayContent.innerHTML = `
    <div class="end-screen">
      <div class="end-screen-text">
        <h1 class="end-screen-credit">made by agustin for ag0-project collection</h1>
        <p class="end-screen-sub">you finished the signal. now it finishes looking back.</p>
      </div>
      <div class="end-screen-image-wrap">
        <img class="end-screen-image" src="assets/user-images/img-06.webp" alt="ag0 project image" />
      </div>
    </div>
  `;

  window.clearTimeout(endGame._jumpTimer);
  window.clearTimeout(endGame._jumpCleanupTimer);
  endGame._jumpTimer = window.setTimeout(() => {
    if (overlay.classList.contains("hidden")) return;
    overlay.classList.remove("jump-flicker");
    void overlay.offsetWidth;
    overlay.classList.add("jump-flicker");
    triggerRetroGlitch(420);
    screenShake();
    spawnScaryFlash(true);
    spawnProvidedImageGhost(true);
    if (audio.ready) {
      audio.jumpScareTone(3.4);
      audio.scareNoise(2.6);
      window.setTimeout(() => audio.jumpScareTone(2.8), 110);
      window.setTimeout(() => audio.scareNoise(2.1), 180);
    }
    endGame._jumpCleanupTimer = window.setTimeout(() => overlay.classList.remove("jump-flicker"), 420);
  }, 1450);
}

endGame._jumpTimer = 0;
endGame._jumpCleanupTimer = 0;

function maybeRareEvent() {
  if (state.rareTriggered || rng() < 0.88) return;
  state.rareTriggered = true;
  const type = pick(["crash", "loading", "cursor", "close"]);
  if (type === "crash") fakeCrash();
  if (type === "loading") fakeLoading();
  if (type === "cursor") spawnCursorClone();
  if (type === "close") {
    setButtonText("Closing...");
    window.setTimeout(() => {
      if (state.stage < 9) setButtonText("Still here.");
    }, 700);
  }
}

function spawnCursorClone() {
  const clone = document.createElement("div");
  clone.className = "cursor-clone";
  game.appendChild(clone);
  const track = (e) => {
    clone.style.left = `${window.innerWidth - e.clientX}px`;
    clone.style.top = `${window.innerHeight - e.clientY}px`;
  };
  window.addEventListener("pointermove", track);
  window.setTimeout(() => {
    window.removeEventListener("pointermove", track);
    clone.remove();
  }, 4000);
}

function toStage(next) {
  clearChallenges();
  state.stageGuard.transitionToken += 1;
  const thisTransition = state.stageGuard.transitionToken;
  state.stage = next;
  state.stageClicks = 0;
  state.rareTriggered = false;
  updateStageClass();
  audio.setStage(next);
  setFearLevel(state.fear.level + 1.8);
  setMessage(`Stage ${next}`, 900);
  if (next >= 8) triggerRetroGlitch(260);
  uiWindows.innerHTML = "";
  btn.classList.remove("runaway");
  btn.classList.remove("vulnerable");
  btn.classList.remove("hidden");
  btn.style.pointerEvents = "auto";

  if (next !== 7) entity.classList.add("hidden");
  if (next !== 3 && next !== 4) clearFakeButtons();

  if (next === 1) {
    setButtonText("Click Me");
    configureRunaway(null);
  }
  if (next === 2) {
    setButtonText(pick(phrases.awareness));
    btn.classList.add("runaway");
    configureRunaway(2);
  }
  if (next === 3) {
    configureRunaway(null);
    setButtonText("Find me");
    setMessage("Some are real. Most are not.", 1800);
    spawnFakes(3);
  }
  if (next === 4) {
    setButtonText(pick(phrases.fighting));
    btn.classList.add("runaway");
    configureRunaway(4);
    setMessage("It started resisting.", 1800);
    spawnFakes(5);
    spawnFakeWindows(2);
  }
  if (next === 5) {
    configureRunaway(null);
    setButtonText("Build");
    buildEnvironment();
  }
  if (next === 6) {
    configureRunaway(null);
    setButtonText("Reveal");
    initPuzzle();
  }
  if (next === 7) {
    configureRunaway(null);
    revealEntity();
  }
  if (next === 8) {
    configureRunaway(null);
    state.stage8Clicks = 0;
    worldIsButton();
  }
  if (next === 9) {
    configureRunaway(null);
    initCaptchaChallenge();
  }
  if (next === 10) {
    configureRunaway(null);
    initSyncMinigame();
  }
  if (next === 11) {
    configureRunaway(null);
    initMemoryMinigame();
  }
  if (next === 12) {
    configureRunaway(null);
    initGlyphMinigame();
  }
  if (next === 13) {
    configureRunaway(null);
    initSequenceMinigame();
  }
  if (next === 14) {
    configureRunaway(null);
    setButtonText("Finally. Click me.");
    btn.classList.remove("hidden");
    btn.style.pointerEvents = "auto";
    moveMainButton(window.innerWidth / 2, window.innerHeight / 2);
    setMessage("You earned this click... almost.", 1600);
  }
  if (next === 15) {
    configureRunaway(null);
    initThreatCaptcha();
  }
  if (next === 16) {
    configureRunaway(null);
    initPanicCaptcha();
  }
  if (next === 17) {
    configureRunaway(null);
    setButtonText("Leave while you can.");
    btn.classList.remove("hidden");
    btn.style.pointerEvents = "auto";
    moveMainButton(window.innerWidth / 2, window.innerHeight / 2);
    setMessage("It is not over.", 1300);
  }
  if (next === 18) {
    configureRunaway(null);
    initFreezeMode();
  }
  if (next === 19) {
    configureRunaway(null);
    initHuntMode();
  }
  if (next === 20) {
    configureRunaway(null);
    setButtonText("End the transmission.");
    btn.classList.remove("hidden");
    btn.style.pointerEvents = "auto";
    moveMainButton(window.innerWidth / 2, window.innerHeight / 2);
    setMessage("Final channel.", 1200);
  }
  if (next === 21) {
    configureRunaway(null);
    initPopupHunt();
  }
  if (next === 22) {
    configureRunaway(null);
    initFinalCaptchaStage();
    window.setTimeout(() => {
      if (state.stage !== 22) return;
      if (!overlay.classList.contains("hidden")) return;
      const hasPanel = puzzleLayer.querySelector(".challenge-panel");
      if (hasPanel) return;
      setMessage("stage recovered to ending.", 900);
      state.finalCaptcha = null;
      endGame();
    }, 1200);
  }

  window.setTimeout(() => {
    if (state.stage !== next) return;
    if (state.stageGuard.transitionToken !== thisTransition) return;
    if (!overlay.classList.contains("hidden")) return;
    const entityVisible = state.stage === 7 && !entity.classList.contains("hidden");
    if (isMainButtonVisible() || hasActiveChallengeSurface() || entityVisible) return;
    setMessage("stage boot fallback.", 900);
    forceRecoveryToPlayable();
  }, 500);
}

function onMainClick(e) {
  if (state.dimension.active) return;
  if (blockedMainButtonStages.has(state.stage)) return;
  audio.init();
  scheduleEyeAwakening();
  startFearAmbience();
  const x = e.clientX || window.innerWidth / 2;
  const y = e.clientY || window.innerHeight / 2;

  raiseFear(state.stage >= 9 ? 1.8 : 1.2);
  state.clicks += 1;
  state.stageClicks += 1;
  audio.clickTone(1 + state.stage * 0.05);
  if (state.stage >= 4) audio.bassPulse();

  createRipple(x, y);
  spawnParticles(x, y, Math.min(20, 9 + state.stage));
  glitchButton();
  maybeFearEvent("click");
  if (state.stage >= 8) maybeTriggerSplitDimension("click");
  if (rng() < 0.16 + state.fear.level * 0.002) triggerRetroGlitch(220);
  if (state.fear.level > 34 && rng() > 0.8) spawnProvidedImageGhost(false);
  if (state.fear.level > 28 && rng() > 0.82) {
    setMessage(pick(["something is behind you", "it is getting closer", "do not stop now"]), 900);
  }
  if (state.stage < 9) maybeRareEvent();

  if (state.stage === 1) {
    if (state.clicks >= 3) setButtonText("I remember.");
    if (state.clicks >= 4) toStage(2);
  } else if (state.stage === 2) {
    setButtonText(pick(phrases.awareness));
    if (rng() > 0.85) {
      const p = randomPos(90);
      moveMainButton(p.x, p.y);
    }
    if (state.stageClicks >= 6) {
      splitButton();
      toStage(3);
    }
  } else if (state.stage === 3) {
    if (rng() > 0.35) {
      const p = randomPos(70);
      moveMainButton(p.x, p.y);
    }
    if (rng() > 0.6) spawnFakes(2 + Math.floor(rng() * 6));
    if (state.stageClicks > 9) toStage(4);
  } else if (state.stage === 4) {
    setButtonText(pick(phrases.fighting));
    if (rng() > 0.55) {
      const p = randomPos(70);
      moveMainButton(p.x, p.y);
    }
    screenShake();
    if (rng() > 0.45) spawnFakeWindows(1 + Math.floor(rng() * 3));
    if (state.stageClicks > 8) toStage(5);
  } else if (state.stage === 5) {
    addGeometryFromClick(x, y);
    const p = randomPos(100);
    moveMainButton(p.x, p.y);
    if (state.stageClicks > 8) toStage(6);
  } else if (state.stage === 6) {
    if (!state.puzzleSolved) {
      setMessage("The button is hidden in the structure.", 1000);
      return;
    }
    if (state.stageClicks > 2) toStage(7);
  } else if (state.stage === 7) {
    state.entityMood += 1;
    if (state.entityMood % 2 === 0) setMessage(pick(phrases.writing), 1200);
    if (state.entityMood > 6) toStage(8);
  } else if (state.stage === 8) {
    state.stage8Clicks += 1;
    const zoom = 1 + Math.sin(state.stage8Clicks * 0.4) * 0.02;
    document.documentElement.style.setProperty("--zoom", `${zoom}`);
    addGeometryFromClick(x, y);
    if (state.stage8Clicks > 8) toStage(9);
  } else if (state.stage === 14) {
    setButtonText("Finally. Click me.");
    if (state.stageClicks >= 1) {
      setMessage("final signal accepted.", 900);
      window.setTimeout(() => endGame(), 450);
    }
  } else if (state.stage === 17) {
    setButtonText(pick(["You heard that?", "Don't stop.", "Too late.", "It's close."]));
    if (state.stageClicks >= 3) {
      toStage(18);
    }
  } else if (state.stage === 20) {
    setButtonText(pick(["No signal.", "Do it again.", "It won't end.", "Almost there."]));
    setMessage(`Trace lock ${state.stageClicks}/7`, 520);
    if (state.stageClicks >= 7) {
      toStage(21);
    }
  }
}

const stars = [];
let bgLastAt = 0;
function setupCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  stars.length = 0;
  for (let i = 0; i < 120; i += 1) {
    stars.push({
      x: rand(0, canvas.width),
      y: rand(0, canvas.height),
      z: rand(0.2, 1.1),
      vx: rand(-0.03, 0.04),
      vy: rand(-0.02, 0.03),
    });
  }
}

function drawBackground(ts = 0) {
  if (document.hidden || ts - bgLastAt < 22) {
    requestAnimationFrame(drawBackground);
    return;
  }
  bgLastAt = ts;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const s of stars) {
    s.x += s.vx * (0.8 + state.stage * 0.14);
    s.y += s.vy * (0.8 + state.stage * 0.14);
    if (s.x < 0) s.x = canvas.width;
    if (s.x > canvas.width) s.x = 0;
    if (s.y < 0) s.y = canvas.height;
    if (s.y > canvas.height) s.y = 0;
    const alpha = 0.2 + s.z * 0.5;
    ctx.fillStyle = `rgba(130,210,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.z * (state.stage > 4 ? 1.8 : 1.2), 0, Math.PI * 2);
    ctx.fill();
  }
  requestAnimationFrame(drawBackground);
}

window.addEventListener("resize", () => {
  setupCanvas();
});

window.addEventListener("pointerdown", (e) => {
  if (!overlay.classList.contains("hidden")) return;
  state.pointerDown = true;
  audio.init();
  scheduleEyeAwakening();
  startFearAmbience();
  raiseFear(0.7);
  if (pixelCursor) pixelCursor.classList.add("active");
  updatePixelCursor(e);
  updateScreenBend(e);
  if (rng() > 0.86) triggerRetroGlitch(190);
  if (state.stage >= 8) maybeFearEvent("touch");
  if (state.stage >= 8) maybeTriggerSplitDimension("touch");
  if (state.stage >= 12 && rng() > 0.88) spawnProvidedImageGhost(false);
});

window.addEventListener("pointermove", (e) => {
  updatePixelCursor(e);
  updateScreenBend(e);
  maybeEvadeCursor(e);

  if (state.stage === 7) {
    const ex = e.clientX + Math.sin(Date.now() / 240) * 35;
    const ey = e.clientY + Math.cos(Date.now() / 260) * 35;
    entity.style.left = `${ex}px`;
    entity.style.top = `${ey}px`;
  }
});

window.addEventListener("pointerup", () => {
  state.pointerDown = false;
  if (pixelCursor) pixelCursor.classList.remove("active");
});

window.addEventListener("pointerleave", () => {
  state.pointerDown = false;
  if (pixelCursor) pixelCursor.classList.add("hidden");
  document.documentElement.style.setProperty("--bend-x", "0");
  document.documentElement.style.setProperty("--bend-y", "0");
  document.documentElement.style.setProperty("--light-x", "50%");
  document.documentElement.style.setProperty("--light-y", "35%");
  document.documentElement.style.setProperty("--btn-shx", "0");
  document.documentElement.style.setProperty("--btn-shy", "11");
});

window.addEventListener("pointerenter", () => {
  if (pixelCursor) pixelCursor.classList.remove("hidden");
});

window.addEventListener("click", (e) => {
  if (!overlay.classList.contains("hidden")) return;
  if ((state.stage === 7 || state.stage === 8) && e.target !== btn) onMainClick(e);
});

btn.addEventListener("click", onMainClick);

if (rickrollButton) {
  rickrollButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (audio.ready) audio.clickTone(1.3);
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) window.location.href = url;
  });
}

setupCanvas();
drawBackground();
setMessage("Click Me", 1200);
state.stageGuard.timerId = window.setInterval(ensureNoDeadState, 450);

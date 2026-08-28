/* ============================================================================
   THE PROMOTION — headless test harness  (rebuilt per HANDOFF-2 §"THE TEST HARNESS")
   ----------------------------------------------------------------------------
   Runs index.html's single <script> block under Node with stubbed
   DOM / Canvas / Image / Audio / AudioContext / localStorage, on a manual
   requestAnimationFrame driver. The 2D canvas context stub THROWS on any
   non-finite coordinate — that is the free render-bug catcher.

   The shipped build only exposes globalThis.__save and globalThis.__menu, so
   this harness appends its OWN export epilogue to the *extracted* script copy
   (globalThis.__g) to read internals. It never edits index.html.

   Public API (see t_regress.js / t_menu_load.js):
     const w = createWorld();      // boot to title screen
     w.startNewGame();             // enter play (fresh run, intro plays)
     w.run(150000);                // drive N frames; returns stats
     w.g.player / w.g.NPCS / ...   // live getters into game state
     w.save() / w.load(snap)       // save round-trip via __save
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DT_MS = 1000 / 60;           // 16.667ms/frame -> dt ~0.0167 (HANDOFF-2)

/* ---------- extract the game <script> from index.html --------------------- */
function extractGameScript(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const lower = html.toLowerCase();
  const open = lower.indexOf('<script');
  if (open < 0) throw new Error('no <script> found in ' + htmlPath);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = lower.lastIndexOf('</script>');
  if (close < 0 || close <= bodyStart) throw new Error('no closing </script> found');
  // guard against multiple script blocks silently swallowing HTML between them
  const openCount = (lower.match(/<script/g) || []).length;
  if (openCount !== 1) {
    throw new Error('expected exactly 1 <script> block, found ' + openCount +
      ' — extraction would corrupt JS. Inspect index.html.');
  }
  return html.slice(bodyStart, close);
}

/* ---------- the canvas 2D context stub (throws on non-finite) -------------- */
function makeCtx2D(canvasEl) {
  const store = { canvas: canvasEl || { width: 860, height: 500 } };
  const gradient = () => ({ addColorStop() {} });
  const returning = {
    /* width 0 made every measured layout collapse: the room banner sizes its background plate as
       measureText(label).width + 18, so under the stub the plate was 18px wide behind a full room
       name and any test comparing plate-to-text disagreed with the browser. Approximate from the
       current font size the way a monospace face actually behaves (~0.6em per char) — still not
       real metrics, but the same ORDER as the browser instead of zero. */
    measureText(t) {
      const m = /(\d+(?:\.\d+)?)px/.exec(this.font || '');
      const px = m ? parseFloat(m[1]) : 11;
      return { width: String(t == null ? '' : t).length * px * 0.6 };
    },
    createLinearGradient: () => gradient(),
    createRadialGradient: () => gradient(),
    createConicGradient: () => gradient(),
    createPattern: () => ({}),
    getImageData: (x, y, w, h) => {
      const W = Math.max(0, w | 0), H = Math.max(0, h | 0);
      return { data: new Uint8ClampedArray(W * H * 4), width: W, height: H };
    },
    createImageData: (w, h) => {
      const W = Math.max(0, w | 0), H = Math.max(0, h | 0);
      return { data: new Uint8ClampedArray(W * H * 4), width: W, height: H };
    },
  };
  const validate = (name, args) => {
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (typeof a === 'number' && !Number.isFinite(a)) {
        throw new Error('NON_FINITE arg[' + i + '] to ctx.' + name + ': ' + a);
      }
    }
  };
  return new Proxy(store, {
    get(t, prop) {
      if (prop in t) return t[prop];                 // set-then-get props (fillStyle, canvas, ...)
      if (typeof prop === 'symbol') return undefined;
      if (returning[prop]) return (...a) => { validate(prop, a); return returning[prop](...a); };
      // any other member is treated as a validating no-op method
      return (...a) => { validate(prop, a); return undefined; };
    },
    set(t, prop, val) { t[prop] = val; return true; },
  });
}

/* ---------- a generic DOM element stub ------------------------------------ */
function makeEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    _tag: tag,
    style: new Proxy({}, { get: (t, p) => (p in t ? t[p] : ''), set: (t, p, v) => { t[p] = v; return true; } }),
    dataset: {},
    children: [],
    childNodes: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    className: '',
    textContent: '',
    innerHTML: '',
    innerText: '',
    value: '',
    checked: false,
    disabled: false,
    hidden: false,
    width: 300, height: 150,
    naturalWidth: 0, naturalHeight: 0,
    clientWidth: 0, clientHeight: 0,
    offsetWidth: 0, offsetHeight: 0,
    scrollWidth: 0, scrollHeight: 0,
    parentNode: null,
    onclick: null, onpointerdown: null, onchange: null,
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    appendChild(c) { this.children.push(c); if (c) c.parentNode = this; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    insertBefore(c) { this.children.push(c); if (c) c.parentNode = this; return c; },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    focus() {}, blur() {}, click() { if (typeof this.onclick === 'function') this.onclick(); },
    querySelector() { return makeEl('div'); },
    querySelectorAll() { return []; },
    getContext() { return (this._ctx || (this._ctx = makeCtx2D(this))); },
    getBoundingClientRect() { return { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }; },
    contains() { return false; },
    closest() { return null; },
    scrollIntoView() {}, scrollTo() {},
    play() { return Promise.resolve(); }, pause() {}, load() {},
    canPlayType() { return ''; },
    cloneNode() { return makeEl(tag); },
  };
  return el;
}

/* ---------- localStorage stub (real in-memory Map) ------------------------ */
function makeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => { m.set(String(k), String(v)); },
    removeItem: (k) => { m.delete(String(k)); },
    clear: () => { m.clear(); },
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
    _map: m,
  };
}

/* ---------- Web Audio stubs ----------------------------------------------- */
function makeAudioContextClass() {
  const param = () => ({
    value: 0,
    setValueAtTime() { return this; },
    linearRampToValueAtTime() { return this; },
    exponentialRampToValueAtTime() { return this; },
    setTargetAtTime() { return this; },
    cancelScheduledValues() { return this; },
    setValueCurveAtTime() { return this; },
  });
  const node = (extra) => Object.assign({
    connect() { return arguments[0]; },
    disconnect() {},
    start() {}, stop() {},
  }, extra || {});
  return class AudioContextStub {
    constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = 'running'; this.destination = node(); }
    createGain() { return node({ gain: param() }); }
    createOscillator() { return node({ type: 'square', frequency: param(), detune: param(), onended: null }); }
    createBufferSource() { return node({ buffer: null, loop: false, playbackRate: param(), onended: null }); }
    createBuffer(ch, len) { const L = Math.max(0, len | 0); return { length: L, sampleRate: this.sampleRate, numberOfChannels: ch, getChannelData: () => new Float32Array(L) }; }
    createBiquadFilter() { return node({ type: 'lowpass', frequency: param(), Q: param(), gain: param(), detune: param() }); }
    createDynamicsCompressor() { return node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }); }
    createStereoPanner() { return node({ pan: param() }); }
    createAnalyser() { return node({ fftSize: 2048, frequencyBinCount: 1024, getByteFrequencyData() {}, getByteTimeDomainData() {} }); }
    createConvolver() { return node({ buffer: null }); }
    createWaveShaper() { return node({ curve: null, oversample: 'none' }); }
    createDelay() { return node({ delayTime: param() }); }
    decodeAudioData() { return Promise.resolve(this.createBuffer(2, 1)); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  };
}

/* ============================================================================ */
function createWorld(opts) {
  opts = opts || {};
  const htmlPath = opts.htmlPath || path.join(__dirname, '..', 'index.html');
  const script = extractGameScript(htmlPath);

  // node --check equivalent: compile first; a syntax error throws here.
  let compiled;
  try {
    compiled = new vm.Script(script + EPILOGUE, { filename: 'index.html#script' });
  } catch (e) {
    const err = new Error('SYNTAX/COMPILE error in extracted script: ' + e.message);
    err.cause = e;
    throw err;
  }

  /* ---- virtual clock + timer queue (setTimeout must work in sim time) ---- */
  let virtualNow = 0;
  let timerId = 1;
  const timers = [];
  const stats = newStats();

  function classify(e) {
    const msg = (e && e.message) || String(e);
    if (/NON_FINITE/.test(msg)) { stats.nonFinite++; if (!stats.firstNonFinite) stats.firstNonFinite = msg; }
    else { stats.throws++; if (!stats.firstThrow) stats.firstThrow = (e && e.stack) || msg; }
  }
  function fireTimers(nowMs) {
    let fired = 0;
    while (true) {
      let idx = -1, best = Infinity;
      for (let i = 0; i < timers.length; i++) {
        if (timers[i].due <= nowMs && timers[i].due < best) { best = timers[i].due; idx = i; }
      }
      if (idx < 0) break;
      const t = timers[idx];
      timers.splice(idx, 1);
      try { t.fn.apply(null, t.args || []); } catch (e) { classify(e); }
      if (t.interval) { t.due = nowMs + t.delay; timers.push(t); }
      if (++fired > 5000) break;   // runaway-reschedule guard
    }
    return fired;
  }

  const setTimeoutStub = (fn, delay, ...args) => {
    if (typeof fn !== 'function') return 0;
    const id = timerId++;
    timers.push({ id, due: virtualNow + (Number(delay) || 0), fn, args, interval: false });
    return id;
  };
  const clearTimeoutStub = (id) => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); };
  const setIntervalStub = (fn, delay, ...args) => {
    if (typeof fn !== 'function') return 0;
    const id = timerId++;
    timers.push({ id, due: virtualNow + (Number(delay) || 0), fn, args, interval: true, delay: (Number(delay) || 16) });
    return id;
  };

  /* ---- rAF: capture the callback, never auto-run ---- */
  let rafCb = null;
  const requestAnimationFrameStub = (cb) => { if (typeof cb === 'function') rafCb = cb; return timerId++; };
  const cancelAnimationFrameStub = () => {};

  /* ---- document stub (cache elements by id so onclick survives) ---- */
  const elById = new Map();
  const documentStub = {
    getElementById(id) { if (!elById.has(id)) { const e = makeEl('div'); e.id = id; elById.set(id, e); } return elById.get(id); },
    createElement(tag) { const e = makeEl(tag); if ((tag || '').toLowerCase() === 'canvas') e.getContext = function () { return (this._ctx || (this._ctx = makeCtx2D(this))); }; return e; },
    createElementNS(_ns, tag) { return makeEl(tag); },
    createTextNode(t) { return { textContent: t, nodeType: 3 }; },
    querySelector() { return makeEl('div'); },
    querySelectorAll() { return []; },
    getElementsByClassName() { return []; },
    getElementsByTagName() { return []; },
    addEventListener() {}, removeEventListener() {},
    body: makeEl('body'),
    documentElement: makeEl('html'),
    head: makeEl('head'),
    hidden: false,
    visibilityState: 'visible',
    fonts: { ready: Promise.resolve(), add() {}, load() { return Promise.resolve(); } },
    createEvent() { return { initEvent() {} }; },
  };

  /* ---- Image / Audio constructors ----
     Browsers fire image onload ASYNCHRONOUSLY, after the current script has
     finished parsing. Firing it synchronously inside `img.src=` (which happens
     during loadArt() near the top of the script) runs onload handlers that
     touch let/const declared later in the file -> TDZ ReferenceError. So we
     queue onloads and flush them at safe points: once after boot, and at the
     top of each frame (never mid-eval, never reentrant). */
  /* Fallback size only. Every sprite that exists on disk reports its REAL dimensions — see
     realImageSize below. A square 64x64 stub silently broke every piece of geometry derived from
     a sprite's aspect: crewRect measured each crew tabletop 76 authored units tall instead of 34
     (so seat rows spread twice as wide as they really are, and the meeting room's upper set tested
     as hanging outside the room), and the reception lounge's collision box came back 82x82 instead
     of 82x37 and sealed a corridor. Both were fine in the browser and broken only under test,
     which is the worst way round. HANDOFF-8 has the full account. */
  const ART_W = 64, ART_H = 64;
  const SPRITE_DIR = path.join(__dirname, '..', 'Art', 'sprites');
  const _dimCache = Object.create(null);
  /* Real width/height straight off the PNG header, the same trick placement.js already uses:
     8-byte signature, then the IHDR chunk with its type at byte 12, width at 16, height at 20.
     Returns null for a missing or non-PNG file so the caller falls back to the square stub —
     the three known-missing sprites must keep degrading gracefully, not throw. */
  function realImageSize(src) {
    const name = String(src || '').split('/').pop();
    if (!name) return null;
    if (name in _dimCache) return _dimCache[name];
    let d = null;
    try {
      const b = fs.readFileSync(path.join(SPRITE_DIR, name));
      if (b.length > 24 && b.readUInt32BE(12) === 0x49484452) {
        const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
        if (w > 0 && h > 0) d = { w, h };
      }
    } catch (e) { /* missing file -> null -> square fallback, as before */ }
    _dimCache[name] = d;
    return d;
  }
  const pendingImageLoads = [];
  function flushImageLoads() {
    while (pendingImageLoads.length) {
      const cb = pendingImageLoads.shift();
      try { cb(); } catch (e) { classify(e); }
    }
  }
  function ImageStub() {
    const im = makeEl('img');
    im.onload = null; im.onerror = null;
    let _src = '';
    Object.defineProperty(im, 'src', {
      get() { return _src; },
      set(v) {
        _src = v;
        const d = realImageSize(v);
        const w = d ? d.w : ART_W, h = d ? d.h : ART_H;
        im.complete = true; im.naturalWidth = w; im.naturalHeight = h;
        im.width = w; im.height = h;
        if (typeof im.onload === 'function') pendingImageLoads.push(im.onload.bind(im));
      },
    });
    return im;
  }
  function AudioStub(src) {
    const a = makeEl('audio');
    a.src = src || ''; a.currentTime = 0; a.volume = 1; a.loop = false; a.muted = false; a.paused = true;
    a.readyState = 4;
    return a;
  }

  /* ---- assemble the sandbox global ---- */
  const AudioContextStub = makeAudioContextClass();
  const localStorageStub = makeLocalStorage();
  /* PRE-SEEDED localStorage. Some state is read at script-eval time and can never be set
     afterwards from a test — the level a world boots into is decided before scaleWorld() runs,
     which is long before createWorld() returns. opts.storage lets a test choose it.
     Empty by default, so every existing test builds exactly the world it built before. */
  if (opts.storage) { Object.keys(opts.storage).forEach(k => localStorageStub.setItem(k, opts.storage[k])); }
  const sandbox = {
    console: makeQuietConsole(opts.verbose),
    document: documentStub,
    localStorage: localStorageStub,
    Image: ImageStub,
    Audio: AudioStub,
    AudioContext: AudioContextStub,
    webkitAudioContext: AudioContextStub,
    requestAnimationFrame: requestAnimationFrameStub,
    cancelAnimationFrame: cancelAnimationFrameStub,
    setTimeout: setTimeoutStub,
    clearTimeout: clearTimeoutStub,
    setInterval: setIntervalStub,
    clearInterval: clearTimeoutStub,
    queueMicrotask: (fn) => { try { fn(); } catch (e) { classify(e); } },
    performance: { now: () => virtualNow },
    navigator: { getGamepads: () => [], userAgent: 'promotion-harness', language: 'en-US', maxTouchPoints: 0, vibrate() {} },
    location: { href: 'about:blank', search: '', hash: '', pathname: '/', reload: undefined, assign() {}, replace() {} },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: () => '', width: '0px', height: '0px' }),
    devicePixelRatio: 1,
    innerWidth: 1280, innerHeight: 720,
    addEventListener() {}, removeEventListener() {},
    alert() {}, confirm() { return true; }, prompt() { return null; },
    scrollTo() {}, focus() {}, blur() {},
    isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.top = sandbox;

  vm.createContext(sandbox);
  // Opt-in deterministic RNG (opts.seed): install a seeded Math.random INTO the context BEFORE
  // the game boots, so both the initial floor (seedFriendships et al.) and all play are
  // reproducible. Default (no seed) leaves the engine's native Math.random untouched.
  if (opts.seed != null) {
    vm.runInContext(
      `(function(){var a=(${opts.seed})|0;Math.random=function(){a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();`,
      sandbox, { filename: 'harness-seed' });
  }
  try {
    compiled.runInContext(sandbox, { filename: 'index.html#script' });
  } catch (e) {
    const err = new Error('RUNTIME error during initial boot eval: ' + ((e && e.message) || e));
    err.cause = e;
    throw err;
  }

  flushImageLoads();   // fire deferred image onloads now that all bindings are initialized

  const G = sandbox.__g;
  if (!G) throw new Error('__g export epilogue did not attach — internals unreachable.');

  /* ---- driver ---- */
  const posTrack = new Map();     // npc id -> {x,y}
  const stuckAccum = new Map();   // npc id -> consecutive stuck frames
  const STUCK_LIMIT = 600;        // ~10s at 60fps of "navigating but not moving"
  const ENTITY_CHECK_EVERY = 30;

  function clickEndOfDayModal() {
    const btn = elById.get('mBtn');
    if (btn && typeof btn.onclick === 'function') { try { btn.onclick(); } catch (e) { classify(e); } }
  }

  function checkEntities(frame) {
    const P = G.player;
    if (P && (!Number.isFinite(P.x) || !Number.isFinite(P.y))) {
      stats.nonFiniteEntities++; if (!stats.firstNonFiniteEntity) stats.firstNonFiniteEntity = 'player';
    }
    const list = G.NPCS || [];
    for (const n of list) {
      // active set = alive & not gone (matches activeNPCs(); onFloor is a boss/promoted-away flag,
      // NOT a "present on the floor" flag — filtering on it would skip nearly every worker).
      if (!n || !n.alive || n.gone) { if (n) { posTrack.delete(n.id); stuckAccum.delete(n.id); } continue; }
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) {
        stats.nonFiniteEntities++; if (!stats.firstNonFiniteEntity) stats.firstNonFiniteEntity = (n.name || n.id);
        continue;
      }
      // "stuck in geometry" = has a goal it is meaningfully FAR from (beyond any arrival
      // tolerance) with an active path, yet isn't moving. Standing on top of your goal,
      // seated, or resting is arrival/idle — not stuck. (Arrival tolerances in-game run
      // ~14-28px*S; 70 clears them with margin.)
      const gg = n.goal;
      const distGoal = (gg && gg.x != null) ? Math.hypot(gg.x - n.x, gg.y - n.y) : 0;
      const navigating = !!(gg && distGoal > 70 && n.path && n.path.length && (n.wp == null || n.wp < n.path.length));
      const prev = posTrack.get(n.id);
      const moved = !prev || Math.hypot(n.x - prev.x, n.y - prev.y) > 0.5;
      if (navigating && !moved) {
        const acc = (stuckAccum.get(n.id) || 0) + ENTITY_CHECK_EVERY;
        stuckAccum.set(n.id, acc);
        if (acc >= STUCK_LIMIT && !(stats._stuckSeen && stats._stuckSeen.has(n.id))) {
          stats.stuckNPCs++;
          (stats._stuckSeen || (stats._stuckSeen = new Set())).add(n.id);
          (stats.stuckNames || (stats.stuckNames = [])).push((n.name || ('#' + n.id)) + ' @day' + G.day);
        }
      } else {
        stuckAccum.set(n.id, 0);
      }
      posTrack.set(n.id, { x: n.x, y: n.y });
    }
  }

  function checkSeatsDeskRank() {
    // The one that matters most: ranks / seats / desks agree.
    const isWorker = G.fn && G.fn.isWorker;
    const youTierFn = G.fn && G.fn.youTier;
    const activeFn = G.fn && G.fn.activeNPCs;
    const active = activeFn ? activeFn() : (G.NPCS || []).filter(n => n.alive && n.onFloor);
    const workers = active.filter(n => (isWorker ? isWorker(n) : (!n.boss && !n.mgr)));
    const SEATS = G.SEATS;
    const record = (msg) => { stats.seatViolations++; if (!stats.firstSeatViolation) stats.firstSeatViolation = msg; };

    // (1) tier 1 & 2 must never hold more people than there are chairs (refreshRanks invariant)
    if (SEATS) {
      const yt = youTierFn ? youTierFn() : -1;
      [1, 2].forEach(t => {
        if (SEATS[t] == null) return;
        const held = workers.filter(w => (w.tier | 0) === t).length + (yt === t ? 1 : 0);
        if (held > SEATS[t]) record(`tier ${t} oversubscribed: ${held}/${SEATS[t]} (day ${G.day})`);
      });
    }
    // (2) no desk owned by two different parties
    const owners = {};
    for (const d of (G.desks || [])) {
      if (d.owner && d.owner !== 'you') owners[d.owner] = (owners[d.owner] || 0) + 1;
    }
    for (const k in owners) if (owners[k] > 1) record(`desk owner "${k}" appears on ${owners[k]} desks (day ${G.day})`);

    // (3) a worker's home desk must sit at the worker's own tier (desk follows rank)
    for (const n of workers) {
      const d = n.homeDesk;
      if (d && d.tier != null && n.tier != null && (d.tier | 0) !== (n.tier | 0)) {
        record(`${n.name} tier ${n.tier} but home desk tier ${d.tier} (day ${G.day})`);
      }
    }
    // (4) player rank in range
    const R = G.RANKS;
    if (R && (G.player.rank < 0 || G.player.rank >= R.length)) record(`player.rank ${G.player.rank} out of range 0..${R.length - 1}`);
  }

  // INVESTMENT INVARIANT: after any NPC removal, no player-held investment may reference a gone NPC.
  // A removal path that forgets npcLeaving() fails loudly here instead of shipping a silent dead-end.
  function checkInvestments() {
    if (G.gameOver) return;   // the endgame removes NPCs on the way out; investments no longer matter
    const cast = G.NPCS || [];
    const inCast = name => cast.some(x => x.name === name);
    const alive = name => cast.some(x => x.name === name && x.alive && !x.gone);
    const record = (msg) => { stats.investmentViolations++; if (!stats.firstInvestmentViolation) stats.firstInvestmentViolation = msg + ' @day' + G.day; };
    // dirt held on a named cast member who is no longer alive
    for (const l of (G.player.leverage || [])) { if (l.target && inCast(l.target) && !alive(l.target)) { record('dirt on gone NPC ' + l.target); break; } }
    // a live worker's coerced/asked mission that targets a gone NPC
    for (const n of cast) { if (n.alive && !n.gone && n.mission && n.mission.target && !alive(n.mission.target)) { record('mission targets gone ' + n.mission.target); break; } }
    // a delegated job still assigned to a gone worker
    const dq = (G.deleg && G.deleg.q) || [];
    for (const t of dq) { if (t.state === 'assigned' && !alive(t.to)) { record('delegation assigned to gone ' + t.to); break; } }
    // a worker you were championing who has left
    for (const nm of ((G.career && G.career.championed) || [])) { if (!alive(nm)) { record('championing gone ' + nm); break; } }
    // a queued candidate hire whose "bad blood" points at a worker who has since left
    for (const h of (G.pendingHires || [])) { if (h.cand && h.cand.feudTarget && inCast(h.cand.feudTarget) && !alive(h.cand.feudTarget)) { record('pending hire feud-target gone ' + h.cand.feudTarget); break; } }
    // a per-person favour track pointing at a worker who has since left (npcLeaving must delete it)
    for (const nm of Object.keys((G.career && G.career.favors) || {})) { if (inCast(nm) && !alive(nm)) { record('favour track on gone ' + nm); break; } }
    // Dale's loyalty arc left active with no live manager
    if (G.dale && G.dale.active && !G.dale.done && !cast.some(n => n.mgr && n.alive)) record('Dale arc active but Dale gone');
  }

  function step() {
    flushImageLoads();   // fire onloads from images created during the previous frame
    virtualNow += DT_MS;
    fireTimers(virtualNow);
    if (rafCb) { try { rafCb(virtualNow); } catch (e) { classify(e); } }
    if (G.paused && !G.gameOver) clickEndOfDayModal();
  }

  const api = {
    g: G,
    stats,
    sandbox,
    get frame() { return stats.frames; },
    startNewGame(slot) {
      if (!sandbox.__menu) throw new Error('__menu missing');
      sandbox.__menu.startGame(slot || 0, true);   // fresh -> harness fallback enters play
    },
    run(frames, hooks) {
      hooks = hooks || {};
      const startDay = G.day;
      let lastDay = G.day;
      for (let i = 0; i < frames; i++) {
        step();
        stats.frames++;
        if (stats.frames % ENTITY_CHECK_EVERY === 0) { checkEntities(stats.frames); checkInvestments(); }
        if (G.day !== lastDay) {
          lastDay = G.day;
          stats.daysElapsed = G.day - startDay;
          checkSeatsDeskRank();
          if (hooks.onDay) hooks.onDay(G.day, stats);
        }
        if (G.gameOver && !hooks.ignoreGameOver) {
          stats.endedEarly = true;
          stats.endReason = 'gameOver at day ' + G.day + ', frame ' + stats.frames;
          break;
        }
      }
      // a final seat check at the stopping point
      checkSeatsDeskRank();
      return stats;
    },
    save() { return sandbox.__save.buildSnapshot(sandbox.__g.gameOver, null); },
    rawSave: () => sandbox.__save,
    rawMenu: () => sandbox.__menu,
    timersPending: () => timers.length,
  };
  return api;
}

function newStats() {
  return {
    frames: 0, daysElapsed: 0,
    throws: 0, firstThrow: null,
    nonFinite: 0, firstNonFinite: null,            // non-finite coords caught by the ctx stub
    nonFiniteEntities: 0, firstNonFiniteEntity: null,
    stuckNPCs: 0, stuckNames: null,
    seatViolations: 0, firstSeatViolation: null,
    investmentViolations: 0, firstInvestmentViolation: null,   // player investment referencing a gone NPC
    endedEarly: false, endReason: null,
  };
}

function makeQuietConsole(verbose) {
  if (verbose) return console;
  const noop = () => {};
  return { log: noop, info: noop, warn: noop, debug: noop, error: (...a) => console.error(...a), trace: noop, group: noop, groupEnd: noop, table: noop, dir: noop, assert: noop, count: noop, time: noop, timeEnd: noop };
}

/* export epilogue appended to the extracted game script (runs in game scope) */
const EPILOGUE = `
;(function(){
  try { globalThis.__loop = (typeof loop!=='undefined') ? loop : null; } catch(e){}
  var G = {}; var F = {};
  function def(o,k,f){ try{ Object.defineProperty(o,k,{get:f,enumerable:true,configurable:true}); }catch(e){} }
  def(G,'player',   function(){ return (typeof player!=='undefined')?player:null; });
  def(G,'NPCS',     function(){ return (typeof NPCS!=='undefined')?NPCS:null; });
  def(G,'desks',    function(){ return (typeof desks!=='undefined')?desks:null; });
  def(G,'day',      function(){ return (typeof day!=='undefined')?day:null; });
  def(G,'clock',    function(){ return (typeof clock!=='undefined')?clock:null; });
  def(G,'RANKS',    function(){ return (typeof RANKS!=='undefined')?RANKS:null; });
  def(G,'career',   function(){ return (typeof career!=='undefined')?career:null; });
  def(G,'today',    function(){ return (typeof today!=='undefined')?today:null; });
  def(G,'pendingHires', function(){ return (typeof pendingHires!=='undefined')?pendingHires:null; });
  def(G,'deleg',    function(){ return (typeof deleg!=='undefined')?deleg:null; });
  def(G,'dale',     function(){ return (typeof dale!=='undefined')?dale:null; });
  def(G,'catfish',  function(){ return (typeof catfish!=='undefined')?catfish:null; });
  def(G,'layout',   function(){ var pick=function(n,d){ try{ return eval(n); }catch(e){ return d; } };
    return { S:pick('S',1), objects:pick('objects',[]), desks:pick('desks',[]), walls:pick('walls',[]),
      ROOMS:pick('ROOMS',[]), containers:pick('CONTAINERS',[]),
      /* the level's own fixture rects — shelf runs, counters, checkstands. These are what
         buildGrid() actually reads, so an aisle-width assertion has to measure THESE and not the
         cosmetic container boxes that sit on top of them. */
      levelBlockers:pick('levelBlockers',[]),
      /* the LIVE array, not a copy — a test can empty it to pose a level that authors none */
      errandPoints:pick('errandPoints',[]), meetingTable:pick('meetingTable',null),
      meetingTable2:pick('meetingTable2',null),
      meetingChairs:pick('meetingChairs',[]), meetingChairs2:pick('meetingChairs2',[]),
      breakTable:pick('breakTable',null), kitchenTable:pick('kitchenTable',null),
      EXIT:pick('EXIT',null), MUSTER:pick('MUSTER',null), HR_OFFICE:pick('HR_OFFICE',null),
      SALES_DOOR:pick('SALES_DOOR',null), sealedZones:pick('sealedZones',[]),
      breakTableB:pick('breakTableB',null),
      ART_W:pick('ART_W',{}), OBJ_ART:pick('OBJ_ART',{}), CONT_ART:pick('CONT_ART',{}),
      WINDOWS:pick('WINDOWS',[]), W:pick('W',0), H:pick('H',0),
      /* Reception lounge: decor sprites, but the table and couch are SOLID, so the linter and the
         tests need their footprints. Deliberately does NOT return a height — the harness stubs
         Image at 64x64, so anything derived from naturalHeight here comes back square and every
         piece looks like it overlaps its neighbour. Export the anchor and the width (both
         independent of the stub) and let the consumer apply the real PNG aspect from disk, the
         same way placement.js already does with spriteDims(). */
      LOBBY:(function(){ try{
        return [LOBBY_TABLE,LOBBY_COUCH].concat(LOBBY_CHAIRS).map(function(p){
          return {art:p.art, solid:!!p.box, box:p.box||null,
                  cx:Math.round(p.x*S), yB:Math.round(p.yB*S), w:U1(ART_W[p.art]||40)};
        });
      }catch(e){ return []; } })() }; });
  /* the loaded sprite table. ART is a module-scope const, so a test asking "did this art actually
     load?" cannot reach it from the sandbox — and "it is in ART_FILES" is not the same claim. */
  def(G,'ART',      function(){ return (typeof ART!=='undefined')?ART:null; });
  /* the level's light banks. A module-scope const, so a test asking "is the store lit?" cannot
     reach it from the sandbox — and the whole point of this system is that a level with none is
     blacked out rather than merely unlit. */
  def(G,'LIGHT_BANKS', function(){ return (typeof LIGHT_BANKS!=='undefined')?LIGHT_BANKS:null; });
  def(G,'gameOver', function(){ return (typeof gameOver!=='undefined')?gameOver:null; });
  def(G,'renderErrs', function(){ return (typeof renderErrs!=='undefined')?renderErrs:null; });   // render() swallows draw throws into this counter — read it to actually enforce "0 renderErrs"
  // the in-game menu's open flag: a module-scope let, invisible from the sandbox, so a test that
  // reads it off the sandbox gets undefined and compares that to false -- passing for the wrong reason.
  // the live task list: a module-scope let, invisible from the sandbox. A test that reads it off
  // the sandbox gets undefined and counts null forever, which is how "exactly two tasks" read {null:40}.
  def(G,'tasks', function(){ return (typeof tasks!=='undefined')?tasks:null; });
  // the camera, so a test can see where it is actually pointing rather than inferring it
  def(G,'sightlines', function(){ return (typeof sightlines!=='undefined')?sightlines:null; });
  def(G,'cam', function(){ return (typeof cam!=='undefined')?cam:null; });
  def(G,'menuOpen', function(){ return (typeof menuOpen!=='undefined')?menuOpen:null; });
  def(G,'paused',   function(){ return (typeof paused!=='undefined')?paused:null; });
  def(G,'intro',    function(){ return (typeof intro!=='undefined')?intro:null; });
  def(G,'screen',   function(){ return (typeof screen!=='undefined')?screen:null; });
  def(G,'SEATS',    function(){ return (typeof SEATS!=='undefined')?SEATS:null; });
  def(G,'seatsFree',function(){ return (typeof seatsFree!=='undefined')?seatsFree:null; });
  def(G,'NPC_RANKS',function(){ return (typeof NPC_RANKS!=='undefined')?NPC_RANKS:null; });
  def(F,'isWorker',  function(){ return (typeof isWorker!=='undefined')?isWorker:null; });
  def(F,'youTier',   function(){ return (typeof youTier!=='undefined')?youTier:null; });
  def(F,'activeNPCs',function(){ return (typeof activeNPCs!=='undefined')?activeNPCs:null; });
  def(F,'branchHealth',function(){ return (typeof branchHealth!=='undefined')?branchHealth:null; });
  def(F,'tryPromote',function(){ return (typeof tryPromote!=='undefined')?tryPromote:null; });
  def(F,'deskArt',   function(){ return (typeof deskArt!=='undefined')?deskArt:null; });
  G.fn = F;
  globalThis.__g = G;
})();
`;

module.exports = { createWorld, extractGameScript, DT_MS };

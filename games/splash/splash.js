/* Splash — a calm vehicle toy for toddlers.
   Keys on the left half of the keyboard play the left half of the scene, keys on the right
   half play the right half; the key row picks the height (digits = sky … bottom row = road).
   Camera mode does the same from movement in each part of the (mirrored) camera picture.
   Each vehicle does one thing at a time, so mashing keys never stacks effects. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function part(vehicle, name) {
    return document.querySelector('#v-' + vehicle + (name ? ' [data-part="' + name + '"]' : ''));
  }

  function anim(el, frames, duration, easing, iterations) {
    if (!el || !el.animate) return Promise.resolve();
    return el.animate(frames, {
      duration: duration,
      easing: easing || 'ease-in-out',
      iterations: iterations || 1
    }).finished.catch(function () {});
  }

  // Drive dx forward, turn around, drive back, turn to face forward again.
  function outAndBack(el, dx, duration) {
    return anim(el, [
      { transform: 'translate(0px, 0px) scaleX(1)', offset: 0 },
      { transform: 'translate(' + dx + 'px, 0px) scaleX(1)', offset: 0.44 },
      { transform: 'translate(' + dx + 'px, 0px) scaleX(-1)', offset: 0.52 },
      { transform: 'translate(0px, 0px) scaleX(-1)', offset: 0.94 },
      { transform: 'translate(0px, 0px) scaleX(1)', offset: 1 }
    ], duration);
  }

  /* ---------- Sound (Web Audio, quiet, synthesized) ---------- */
  var ctx = null, master = null, noiseBuffer = null;
  var soundOn = true;

  function audio() {
    if (!soundOn) return null;
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }

  function envelope(g, t, dur, vol) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.05);
    g.gain.setValueAtTime(vol, t + Math.max(0.06, dur - 0.15));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(type, f0, f1, at, dur, vol, lowpass) {
    var c = audio();
    if (!c) return;
    var t = c.currentTime + at;
    var o = c.createOscillator(), g = c.createGain(), out = o;
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    if (lowpass) {
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      o.connect(f);
      out = f;
    }
    out.connect(g);
    g.connect(master);
    envelope(g, t, dur, vol);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, freq, wobbleHz) {
    var c = audio();
    if (!c) return;
    if (!noiseBuffer) {
      noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
      var d = noiseBuffer.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var t = c.currentTime;
    var src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noiseBuffer;
    src.loop = true;
    f.type = 'lowpass';
    f.frequency.value = freq;
    src.connect(f);
    f.connect(g);
    envelope(g, t, dur, vol);
    var out = g;
    if (wobbleHz) {
      // Chop the noise with a low-frequency oscillator: a rotor's "wop-wop".
      var lfo = c.createOscillator(), depth = c.createGain(), chop = c.createGain();
      lfo.frequency.value = wobbleHz;
      depth.gain.value = 0.5;
      chop.gain.value = 0.5;
      lfo.connect(depth);
      depth.connect(chop.gain);
      g.connect(chop);
      out = chop;
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    out.connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  var sfx = {
    horn: function () { tone('square', 392, 392, 0, 0.18, 0.05, 1200); tone('square', 330, 330, 0.24, 0.24, 0.05, 1200); },
    engine: function (dur) { tone('sawtooth', 55, 85, 0, dur, 0.1, 300); },
    vroom: function () { tone('sawtooth', 80, 220, 0, 0.9, 0.07, 650); tone('sawtooth', 220, 90, 0.9, 0.9, 0.06, 650); },
    rotor: function (dur) { noise(dur, 0.25, 450, 11); },
    whoosh: function (dur) { noise(dur, 0.12, 900, 0); },
    up: function () { [262, 294, 330, 392].forEach(function (f, i) { tone('sine', f, f, i * 0.2, 0.25, 0.09); }); },
    down: function (at) { [392, 330, 294, 262].forEach(function (f, i) { tone('sine', f, f, at + i * 0.2, 0.25, 0.09); }); },
    clunk: function (at) { tone('sine', 120, 50, at || 0, 0.3, 0.2); }
  };

  /* ---------- Spoken names (Turkish) ---------- */
  var namesOn = true, trVoice = null;
  var synth = window.speechSynthesis;

  function pickVoice() {
    var voices = synth.getVoices();
    for (var i = 0; i < voices.length; i++) {
      if (/^tr/i.test(voices[i].lang)) { trVoice = voices[i]; return; }
    }
  }
  if (synth) {
    pickVoice();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice);
  }

  function say(text) {
    if (!synth || !namesOn || !soundOn || typeof SpeechSynthesisUtterance === 'undefined') return;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'tr-TR';
    if (trVoice) u.voice = trVoice;
    u.rate = 0.85;
    u.pitch = 1.1;
    if (synth.speaking) synth.cancel();
    synth.speak(u);
  }

  /* ---------- Vehicles ---------- */
  var VEHICLES = {
    plane: {
      name: 'Uçak',
      play: function () {
        sfx.whoosh(3.4);
        return anim(part('plane', 'move'), [
          { transform: 'translate(0px, 0px) rotate(0deg) scaleX(1)', offset: 0 },
          { transform: 'translate(170px, -60px) rotate(-6deg) scaleX(1)', offset: 0.22 },
          { transform: 'translate(340px, -20px) rotate(0deg) scaleX(1)', offset: 0.44 },
          { transform: 'translate(340px, -20px) rotate(0deg) scaleX(-1)', offset: 0.52 },
          { transform: 'translate(170px, 40px) rotate(-4deg) scaleX(-1)', offset: 0.74 },
          { transform: 'translate(0px, 0px) rotate(0deg) scaleX(-1)', offset: 0.94 },
          { transform: 'translate(0px, 0px) rotate(0deg) scaleX(1)', offset: 1 }
        ], 3600);
      }
    },
    helicopter: {
      name: 'Helikopter',
      play: function () {
        sfx.rotor(3.6);
        anim(part('helicopter', 'rotor'), [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0.12)' }, { transform: 'scaleX(1)' }], 200, 'linear', 18);
        anim(part('helicopter', 'tail'), [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], 300, 'linear', 12);
        return anim(part('helicopter', 'move'), [
          { transform: 'translate(0px, 0px) rotate(0deg)', offset: 0 },
          { transform: 'translate(0px, -70px) rotate(0deg)', offset: 0.25 },
          { transform: 'translate(150px, -80px) rotate(5deg)', offset: 0.5 },
          { transform: 'translate(0px, -70px) rotate(-4deg)', offset: 0.75 },
          { transform: 'translate(0px, 0px) rotate(0deg)', offset: 1 }
        ], 3600);
      }
    },
    lift: {
      name: 'Lift',
      play: function () {
        sfx.up();
        sfx.down(2.2);
        var frames = function (k) {
          return [
            { transform: k(0), offset: 0 }, { transform: k(1), offset: 0.35 },
            { transform: k(1), offset: 0.65 }, { transform: k(0), offset: 1 }
          ];
        };
        anim(part('lift', 'scissor'), frames(function (on) { return 'scaleY(' + (on ? 2 : 1) + ')'; }), 3200);
        return anim(part('lift', 'platform'), frames(function (on) { return 'translateY(' + (on ? -180 : 0) + 'px)'; }), 3200);
      }
    },
    crane: {
      name: 'Vinç',
      play: function () {
        sfx.up();
        sfx.down(2);
        var d = 4200;
        anim(part('crane', 'trolley'), [
          { transform: 'translateX(0px)', offset: 0 }, { transform: 'translateX(150px)', offset: 0.25 },
          { transform: 'translateX(150px)', offset: 0.75 }, { transform: 'translateX(0px)', offset: 1 }
        ], d);
        anim(part('crane', 'cable'), [
          { transform: 'scaleY(1)', offset: 0 }, { transform: 'scaleY(1)', offset: 0.25 },
          { transform: 'scaleY(2.2)', offset: 0.45 }, { transform: 'scaleY(2.2)', offset: 0.55 },
          { transform: 'scaleY(1)', offset: 0.75 }, { transform: 'scaleY(1)', offset: 1 }
        ], d);
        return anim(part('crane', 'hook'), [
          { transform: 'translateY(0px)', offset: 0 }, { transform: 'translateY(0px)', offset: 0.25 },
          { transform: 'translateY(110px)', offset: 0.45 }, { transform: 'translateY(110px)', offset: 0.55 },
          { transform: 'translateY(0px)', offset: 0.75 }, { transform: 'translateY(0px)', offset: 1 }
        ], d);
      }
    },
    dump: {
      name: 'Kamyon',
      play: function () {
        sfx.engine(1.2);
        sfx.clunk(1.3);
        var d = 3400;
        anim(part('dump', 'load'), [
          { transform: 'translate(0px, 0px)', opacity: 1, offset: 0 },
          { transform: 'translate(0px, 0px)', opacity: 1, offset: 0.3 },
          { transform: 'translate(-110px, 10px)', opacity: 0, offset: 0.5 },
          { transform: 'translate(0px, 0px)', opacity: 0, offset: 0.85 },
          { transform: 'translate(0px, 0px)', opacity: 1, offset: 1 }
        ], d);
        return anim(part('dump', 'bed'), [
          { transform: 'rotate(0deg)', offset: 0 }, { transform: 'rotate(-38deg)', offset: 0.3 },
          { transform: 'rotate(-38deg)', offset: 0.55 }, { transform: 'rotate(0deg)', offset: 0.85 },
          { transform: 'rotate(0deg)', offset: 1 }
        ], d);
      }
    },
    forklift: {
      name: 'Forklift',
      play: function () {
        sfx.up();
        sfx.down(1.8);
        return anim(part('forklift', 'forks'), [
          { transform: 'translateY(0px)', offset: 0 }, { transform: 'translateY(-110px)', offset: 0.35 },
          { transform: 'translateY(-110px)', offset: 0.6 }, { transform: 'translateY(0px)', offset: 1 }
        ], 3000);
      }
    },
    excavator: {
      name: 'Kepçe',
      play: function () {
        sfx.engine(2.4);
        sfx.clunk(1.2);
        var d = 3600;
        anim(part('excavator', 'stick'), [
          { transform: 'rotate(0deg)', offset: 0 }, { transform: 'rotate(18deg)', offset: 0.3 },
          { transform: 'rotate(-22deg)', offset: 0.55 }, { transform: 'rotate(-22deg)', offset: 0.8 },
          { transform: 'rotate(0deg)', offset: 1 }
        ], d);
        anim(part('excavator', 'bucket'), [
          { transform: 'rotate(0deg)', offset: 0 }, { transform: 'rotate(30deg)', offset: 0.3 },
          { transform: 'rotate(-55deg)', offset: 0.55 }, { transform: 'rotate(-55deg)', offset: 0.8 },
          { transform: 'rotate(0deg)', offset: 1 }
        ], d);
        return anim(part('excavator', 'boom'), [
          { transform: 'rotate(0deg)', offset: 0 }, { transform: 'rotate(-16deg)', offset: 0.3 },
          { transform: 'rotate(-16deg)', offset: 0.55 }, { transform: 'rotate(10deg)', offset: 0.8 },
          { transform: 'rotate(0deg)', offset: 1 }
        ], d);
      }
    },
    car: {
      name: 'Araba',
      play: function () { sfx.horn(); sfx.engine(2.8); return outAndBack(part('car', 'move'), 420, 3400); }
    },
    motorcycle: {
      name: 'Motosiklet',
      play: function () { sfx.vroom(); return outAndBack(part('motorcycle', 'move'), 230, 2800); }
    },
    mixer: {
      name: 'Beton mikseri',
      play: function () {
        sfx.engine(3.2);
        anim(part('mixer', 'stripes'), [{ transform: 'translateX(0px)' }, { transform: 'translateX(60px)' }], 500, 'linear', 7);
        return outAndBack(part('mixer', 'move'), 320, 3600);
      }
    },
    truck: {
      name: 'Tır',
      play: function () { sfx.horn(); sfx.engine(3); return outAndBack(part('truck', 'move'), 260, 3400); }
    },
    bus: {
      name: 'Otobüs',
      play: function () {
        sfx.horn();
        sfx.engine(5);
        return anim(part('bus', 'move'), [
          { transform: 'translateX(0px)' }, { transform: 'translateX(2100px)' }
        ], 6000, 'linear');
      }
    }
  };

  var ZONES = {
    L0: ['plane'], R0: ['helicopter'],
    L1: ['lift'], R1: ['crane'],
    L2: ['dump', 'forklift'], R2: ['excavator'],
    L3: ['car', 'motorcycle'], R3: ['mixer', 'truck']
  };
  var busy = {};
  var nextInZone = {};

  function glow(zone) {
    if (reduceMotion) return;
    var el = document.querySelector('.glow[data-zone="' + zone + '"]');
    anim(el, [{ opacity: 0 }, { opacity: 0.16 }, { opacity: 0 }], 800, 'ease-out');
  }

  function play(id, zones) {
    if (busy[id]) return false;
    busy[id] = true;
    zones.forEach(glow);
    say(VEHICLES[id].name);
    VEHICLES[id].play().then(function () { busy[id] = false; });
    return true;
  }

  // Taps and camera alternate between the vehicles of a zone, skipping busy ones.
  function playZone(zone) {
    var list = ZONES[zone];
    for (var i = 0; i < list.length; i++) {
      var n = ((nextInZone[zone] || 0) + i) % list.length;
      if (!busy[list[n]]) {
        nextInZone[zone] = n + 1;
        play(list[n], [zone]);
        return;
      }
    }
  }

  /* ---------- Keyboard ---------- */
  // Physical key positions (KeyboardEvent.code), so every layout splits the same way.
  var ROWS = [
    [['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'],
     ['Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal']],
    [['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'],
     ['KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash']],
    [['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG'],
     ['KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote']],
    [['IntlBackslash', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB'],
     ['KeyN', 'KeyM', 'Comma', 'Period', 'Slash']]
  ];
  var KEYS = {};
  ROWS.forEach(function (row, r) {
    row.forEach(function (codes, side) {
      codes.forEach(function (code, col) { KEYS[code] = { zone: (side ? 'R' : 'L') + r, col: col }; });
    });
  });

  var started = false;
  var held = {};

  function isEnter(code) { return code === 'Enter' || code === 'NumpadEnter'; }

  document.addEventListener('keydown', function (e) {
    var combo = (e.code === 'ControlLeft' && (held.Enter || held.NumpadEnter)) ||
                (isEnter(e.code) && held.ControlLeft);
    held[e.code] = true;
    if (combo && !e.repeat) {
      e.preventDefault();
      toggleFullscreen();
      return;
    }
    if (!started || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    // Space/Enter on a focused control activate it; every other key still plays.
    var t = e.target;
    if ((e.code === 'Space' || isEnter(e.code)) && t && t.closest && t.closest('button, a')) return;

    if (e.code === 'Space') {
      e.preventDefault();
      play('bus', ['L3', 'R3']);
      return;
    }
    var k = KEYS[e.code];
    if (!k) return;
    e.preventDefault();
    var list = ZONES[k.zone];
    play(list[k.col % list.length], [k.zone]);
  });
  document.addEventListener('keyup', function (e) { delete held[e.code]; });
  window.addEventListener('blur', function () { held = {}; });

  /* ---------- Touch / mouse ---------- */
  document.getElementById('hits').addEventListener('pointerdown', function (e) {
    var zone = e.target.getAttribute('data-zone');
    if (!started || !zone) return;
    e.preventDefault();
    playZone(zone);
  });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ---------- Fullscreen ---------- */
  function fullscreenElement() { return document.fullscreenElement || document.webkitFullscreenElement; }

  function enterFullscreen() {
    var el = document.documentElement;
    var req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    var p = req.call(el);
    if (p && p.catch) p.catch(function () {});
  }

  function toggleFullscreen() {
    if (!fullscreenElement()) return enterFullscreen();
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    var p = exit && exit.call(document);
    if (p && p.catch) p.catch(function () {});
  }

  function onFullscreenChange() {
    var on = !!fullscreenElement();
    document.body.classList.toggle('is-fs', on);
    var kb = navigator.keyboard;
    if (!kb) return;
    // Chromium: a single Esc tap no longer leaves fullscreen (holding Esc still does).
    if (on && kb.lock) kb.lock(['Escape']).catch(function () {});
    if (!on && kb.unlock) kb.unlock();
  }
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  /* ---------- Camera ---------- */
  var video = document.getElementById('cam');
  var W = 64, H = 48;
  var BAND_EDGES = [0.3, 0.56, 0.79]; // same splits as the scene's zones (y = 300, 560, 790 of 1000)
  var frameCanvas = document.createElement('canvas');
  frameCanvas.width = W;
  frameCanvas.height = H;
  var frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
  var cam = { stream: null, starting: false, timer: null, prev: null, lastAt: 0, lastZoneAt: {} };

  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error('unsupported'));
    }
    if (cam.stream || cam.starting) return Promise.resolve();
    cam.starting = true;
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
      audio: false
    }).then(function (stream) {
      cam.stream = stream;
      cam.starting = false;
      video.srcObject = stream;
      video.hidden = false;
      return video.play();
    }).then(function () {
      cam.prev = null;
      cam.timer = setInterval(sampleCamera, 100);
      setPressed('camera', true);
    }).catch(function (err) {
      cam.starting = false;
      stopCamera();
      throw err;
    });
  }

  function stopCamera() {
    clearInterval(cam.timer);
    cam.timer = null;
    if (cam.stream) cam.stream.getTracks().forEach(function (t) { t.stop(); });
    cam.stream = null;
    video.srcObject = null;
    video.hidden = true;
    setPressed('camera', false);
  }

  // Compare each small, mirrored frame with the previous one and count changed pixels in
  // each of the 8 zones (left/right × 4 bands). The busiest zone plays, with cooldowns.
  function sampleCamera() {
    if (video.readyState < 2) return;
    frameCtx.setTransform(-1, 0, 0, 1, W, 0);
    frameCtx.drawImage(video, 0, 0, W, H);
    var px = frameCtx.getImageData(0, 0, W, H).data;
    var cur = new Uint8Array(W * H);
    for (var i = 0, p = 0; i < cur.length; i++, p += 4) {
      cur[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
    }
    var prev = cam.prev;
    cam.prev = cur;
    if (!prev) return;

    var counts = [0, 0, 0, 0, 0, 0, 0, 0], total = 0;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var j = y * W + x;
        if (Math.abs(cur[j] - prev[j]) > 28) {
          total++;
          var band = 0;
          while (band < 3 && y >= BAND_EDGES[band] * H) band++;
          counts[band * 2 + (x < W / 2 ? 0 : 1)]++;
        }
      }
    }
    if (total > W * H * 0.45) return; // light change or camera bump

    var best = -1, bestCount = 0;
    for (var z = 0; z < 8; z++) {
      if (counts[z] > bestCount) { bestCount = counts[z]; best = z; }
    }
    if (best < 0 || bestCount < 30) return;

    var zone = (best % 2 ? 'R' : 'L') + (best >> 1);
    var now = performance.now();
    if (now - cam.lastAt < 700 || now - (cam.lastZoneAt[zone] || 0) < 2000) return;
    cam.lastAt = now;
    cam.lastZoneAt[zone] = now;
    playZone(zone);
  }

  /* ---------- Controls ---------- */
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 4000);
  }

  function setPressed(action, on) {
    var b = document.querySelector('[data-action="' + action + '"]');
    if (b) b.setAttribute('aria-pressed', String(on));
  }

  function cameraError(err) {
    return err && err.name === 'NotAllowedError'
      ? 'Camera permission was not given — keys and taps still work.'
      : 'No camera available here — keys and taps still work.';
  }

  function start(mode) {
    started = true;
    audio();
    enterFullscreen();
    document.body.classList.add('is-started');
    if (mode === 'camera') startCamera().catch(function (err) { toast(cameraError(err)); });
  }

  document.querySelectorAll('[data-start]').forEach(function (b) {
    b.addEventListener('click', function () { start(b.getAttribute('data-start')); });
  });

  document.querySelector('.bar').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var action = b.getAttribute('data-action');
    if (action === 'camera') {
      if (cam.stream) stopCamera();
      else if (cam.starting) return;
      else startCamera().catch(function (err) { toast(cameraError(err)); });
    } else if (action === 'sound') {
      soundOn = !soundOn;
      setPressed('sound', soundOn);
      if (master) master.gain.value = soundOn ? 0.6 : 0;
      if (!soundOn && synth) synth.cancel();
    } else if (action === 'names') {
      namesOn = !namesOn;
      setPressed('names', namesOn);
      if (!namesOn && synth) synth.cancel();
    } else if (action === 'fullscreen') {
      enterFullscreen();
    }
    // A mouse click leaves focus on the button, which would swallow the child's key presses.
    if (e.detail > 0) b.blur();
  });
})();

/* El buzón de Lia · sonido, libro, tu letra y el buzón de Lia en el tiempo */
(function () {
  'use strict';
  var B = window.__BUZON__;
  if (!B) return;
  var $ = B.$, $$ = B.$$, clamp = B.clamp, toast = B.toast;
  function safe(fn, name) { try { fn(); } catch (e) { if (window.console) console.warn('[buzon-extras] ' + name, e); } }

  /* ---------- Sonido: sintetizado, sin archivos ---------- */
  var ctx = null, on = true, noiseBuf = null;
  try { on = localStorage.getItem('buzon-sonido') !== 'no'; } catch (e) { /* sin almacenamiento */ }
  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      ctx = new AC();
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }
  function noise(t, dur, type, f0, f1, vol, q) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    var f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q || .8;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var g = ctx.createGain(); g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * .25); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }
  function tone(t, dur, type, f0, f1, vol) {
    var o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + .05);
  }
  var SFX = {
    paper: function (t) { noise(t, .28, 'bandpass', 1800, 4200, .07); noise(t + .08, .16, 'highpass', 3000, 6000, .03); },
    slide: function (t) { noise(t, .5, 'bandpass', 900, 2200, .05, .5); },
    seal: function (t) { tone(t, .28, 'sine', 120, 46, .5); noise(t, .07, 'lowpass', 900, 300, .18); },
    crack: function (t) { noise(t, .05, 'highpass', 2500, 5000, .14); noise(t + .07, .06, 'highpass', 1800, 4000, .1); },
    clunk: function (t) { tone(t, .13, 'triangle', 190, 80, .35); tone(t + .14, .16, 'triangle', 150, 60, .28); tone(t, .5, 'sine', 640, 600, .03); noise(t, .06, 'lowpass', 700, 200, .15); },
    stamp: function (t) { tone(t, .14, 'sine', 100, 55, .45); noise(t, .09, 'lowpass', 500, 180, .22); },
    tick: function (t) { tone(t, .04, 'sine', 1150, 900, .05); },
    tap: function (t) { tone(t, .05, 'sine', 520, 380, .04); }
  };
  function sfx(name) {
    if (!on || !ctx || ctx.state !== 'running' || !SFX[name]) return;
    try { SFX[name](ctx.currentTime + .01); } catch (e) { /* el sonido nunca rompe nada */ }
  }
  B.sfx = sfx;

  // Avisos de la escena carta → sobre → buzón (también al revés, al abrir)
  var CUES = [[.07, 'paper', 'paper'], [.24, 'paper', 'paper'], [.52, 'slide', 'slide'], [.725, 'seal', 'crack'], [.9, 'clunk', null]];
  B.cue = function (o, p) {
    var last = o._p; o._p = p;
    if (last === undefined || !on || !ctx) return;
    if (Math.abs(p - last) > .3) return; // salto de scroll: no disparar todo de golpe
    for (var i = 0; i < CUES.length; i++) {
      var c = CUES[i];
      if (last < c[0] && p >= c[0]) { if (!(o.noBox && c[1] === 'clunk')) sfx(c[1]); }
      else if (last > c[0] && p <= c[0] && c[2] && o.noBox) sfx(c[2]);
    }
  };

  function initSound() {
    var btn = $('[data-snd]');
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, unlock, { passive: true }); });
    function paint() { btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.title = on ? 'Sonido activado' : 'Sonido en silencio'; }
    paint();
    btn.addEventListener('click', function () {
      on = !on; paint(); unlock();
      try { localStorage.setItem('buzon-sonido', on ? 'si' : 'no'); } catch (e) { /* da igual */ }
      if (on) setTimeout(function () { sfx('seal'); }, 60);
    });
    var lf = $('[data-lia-form]'); if (lf) lf.addEventListener('submit', function () { setTimeout(function () { sfx('clunk'); }, 150); });
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-break]')) sfx('crack');
      else if (e.target.closest('[data-foto-add]')) sfx('paper');
      else if (e.target.closest('.chip, .lock, .tabbar button, .age')) sfx('tap');
    });
  }

  /* ---------- El libro se abre al bajar ---------- */
  function initBook() {
    var book = $('[data-book]'); if (!book) return;
    var last = -1;
    B.onFrame(function () {
      var r = book.getBoundingClientRect(), vh = window.innerHeight;
      if (r.bottom < -100 || r.top > vh + 100) return;
      var p = clamp((vh * .5 - r.top) / (vh * .38), 0, 1);
      p = p * p * (3 - 2 * p);
      if (Math.abs(p - last) < .002) return;
      if (last >= 0 && last < .15 && p >= .15) sfx('paper');
      last = p; book.style.setProperty('--bk', p.toFixed(3));
    });
  }

  /* ---------- Tu letra de verdad ---------- */
  function initFont() {
    var file = $('[data-font-file]'), reset = $('[data-font-reset]'); if (!file) return;
    file.addEventListener('change', function () {
      var f = file.files && file.files[0]; if (!f || !window.FontFace) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var face = new FontFace('MiLetra', rd.result);
          face.load().then(function (ff) {
            document.fonts.add(ff);
            document.documentElement.style.setProperty('--hand', "'MiLetra', 'Caveat', cursive");
            reset.hidden = false; toast('Listo · la maqueta ya está escrita con tu letra');
          }, function () { toast('No se pudo leer esa fuente · prueba con el .ttf'); });
        } catch (e) { toast('No se pudo leer esa fuente · prueba con el .ttf'); }
      };
      rd.readAsArrayBuffer(f);
    });
    reset.addEventListener('click', function () { document.documentElement.style.removeProperty('--hand'); reset.hidden = true; file.value = ''; });
  }

  /* ---------- El buzón de Lia hoy, a los 18 y muchos años después ---------- */
  var WHEN = {
    hoy: {
      date: 'Jueves · 12 de noviembre de 2026', title: 'Buenos días, <em>Lia</em>', hand: 'Hoy te ha llegado una carta nueva.',
      top: 'Hoy · sin abrir', tema: 'Lo que he aprendido', pol: 'ph-cake|hoy, 08:20',
      body: ['Querida Lia:', 'Hoy he pensado en ti toda la mañana. Quería contarte una cosa que tardé muchos años en entender: equivocarse no es lo contrario de hacerlo bien. Es el camino.', 'Las cosas que mejor me han salido en la vida empezaron saliendo mal. Así que cuando falles, y fallarás, no te escondas. Mira lo que ha pasado, ríete un poco y vuelve a intentarlo.']
    },
    '18': {
      date: 'El día que cumples 18', title: 'Feliz cumpleaños, <em>Lia</em>', hand: 'Hoy se abre una carta que lleva años esperándote.',
      top: 'Escrita el 30 oct 2026 · se abre hoy', tema: 'Para cuando cumplas…', pol: 'ph-field|tú, de pequeña',
      body: ['Lia:', 'Hoy cumples 18. Siéntate, que esta es larga. Cuando la escribí todavía te ataba yo los cordones, y me costaba imaginarte leyendo esto.', 'No te voy a dar consejos, solo uno: sé buena persona antes que cualquier otra cosa. Lo demás se aprende. Me gusta muchísimo quien eres, y eso lo sé desde ya.']
    },
    lejos: {
      date: 'Un día cualquiera, dentro de muchos años', title: 'Hola, <em>Lia</em>', hand: 'Hoy te llega una carta que escribí hace mucho, para hoy.',
      top: 'Escrita el 12 nov 2026 · programada para hoy', tema: 'Programada', pol: 'ph-night|buenas noches, Lia',
      body: ['Lia:', 'Cuando escribí esto tú eras pequeña y yo no sabía dónde estaría hoy. Si estoy cerca, ven a darme un abrazo.', 'Y si no lo estoy, que sepas que ya contaba con ello al escribirla, y que te quise cada día igual. Sigue. Yo voy contigo en todo lo que te enseñé.']
    }
  };
  function initWhen() {
    var chips = $('[data-lia-when]'); if (!chips) return;
    var head = $('.lhome-head'), env = $('.lnew-env');
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      var w = WHEN[b.dataset.v]; if (!w) return;
      $$('.chip', chips).forEach(function (x) { x.classList.toggle('is-on', x === b); });
      $('[data-lw-date]').textContent = w.date; $('[data-lw-title]').innerHTML = w.title; $('[data-lw-hand]').textContent = w.hand;
      head.classList.remove('swap'); void head.offsetWidth; head.classList.add('swap');
      $('.card-top .label', env).textContent = w.top; $('.card-foot .label', env).textContent = w.tema;
      env.dataset.pol = w.pol; env.classList.remove('is-read');
      var body = $('.card-body', env); body.innerHTML = '';
      w.body.forEach(function (t) { var p = document.createElement('p'); p.textContent = t; body.appendChild(p); });
    });
  }

  function boot() { safe(initSound, 'sound'); safe(initBook, 'book'); safe(initFont, 'font'); safe(initWhen, 'when'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

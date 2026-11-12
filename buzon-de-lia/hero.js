/* El buzón de Lia · portada: el buzón gira y se abre con el scroll, y se decora con stickers */
(function () {
  'use strict';
  var B = window.__BUZON__;
  if (!B) return;
  var $ = B.$, $$ = B.$$, clamp = B.clamp;
  function safe(fn, name) { try { fn(); } catch (e) { if (window.console) console.warn('[buzon-hero] ' + name, e); } }
  var seg = function (p, from, len) { return clamp((p - from) / len, 0, 1); };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var sfx = function (n) { if (B.sfx) B.sfx(n); };

  var sec = $('.heroX'), mb = $('[data-mb]');
  if (!sec || !mb) return;
  var head = $('[data-hero-head]'), core = $('[data-hero-core]'), hint = $('[data-hero-hint]'), ui = $('[data-stk-ui]');
  var floats = $$('.hero-float .px[data-speed]', sec).map(function (el) { return { el: el, s: parseFloat(el.dataset.speed) }; });
  var stick = false, ms = 1, lastP = -1, lastDoor = 0;

  function fit() {
    var vw = window.innerWidth, vh = window.innerHeight;
    ms = clamp(Math.min(vw / 760, vh / 800), .5, 1.25);
    lastP = -1;
  }

  /* ---------- Scroll: girar, levantar la bandera, abrir, y que salgan las cartas ---------- */
  function pose(p) {
    var turn = ease(seg(p, 0, .62));
    var ry = -27 - 37 * turn, rx = -9 + 2 * turn;
    var door = ease(seg(p, .34, .3)) * 104;
    var out = ease(seg(p, .6, .34));
    mb.style.transform = 'translateY(' + (-p * 30) + 'px) scale(' + (ms * (1 + .16 * p)).toFixed(3) + ') rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
    mb.style.setProperty('--door', door.toFixed(1));
    mb.style.setProperty('--flag', ease(seg(p, .06, .22)).toFixed(3));
    mb.style.setProperty('--out', out.toFixed(3));
    if (lastDoor < 8 && door >= 8) sfx('clunk');
    if (lastDoor < 96 && door >= 96) sfx('paper');
    lastDoor = door;
    head.style.transform = 'translateY(' + (-p * 90) + 'px) scale(' + (1 - .08 * p) + ')';
    head.style.opacity = (1 - seg(p, .72, .28)).toFixed(2);
    core.style.opacity = hint.style.opacity = ui.style.opacity = (1 - seg(p, .04, .16)).toFixed(2);
    var gone = p > .2;
    core.style.pointerEvents = ui.style.pointerEvents = gone ? 'none' : '';
  }
  function frame() {
    var r = sec.getBoundingClientRect(), vh = window.innerHeight;
    if (r.bottom < -50) return;
    var p = clamp(-r.top / (r.height - vh), 0, 1);
    var y = -r.top;
    floats.forEach(function (f) { f.el.style.setProperty('--py', (y * f.s).toFixed(1)); });
    if (stick) { if (p > .12) exitStick(); return; }
    if (Math.abs(p - lastP) < .0003) return;
    lastP = p; pose(p);
  }

  /* ---------- Stickers ---------- */
  var area = $('[data-stk-area]'), wall = $('[data-mb-wall]'), tray = $('[data-stk-tray]'), openBtn = $('[data-stk-open]'), tools = $('[data-stk-tools]');
  var KEY = 'buzon-stickers-2', list = [], sel = null;
  var DEFAULTS = [
    { t: '⭐', x: 340, y: 46, r: -12, s: 1 }, { t: '🌈', x: 262, y: 104, r: 8, s: 1.1 },
    { t: '🦋', x: 392, y: 118, r: 14, s: .9 }, { t: '❤️', x: 196, y: 40, r: -6, s: .8 }, { t: '🌙', x: 58, y: 40, r: 10, s: .85 }
  ];
  function save() { try { localStorage.setItem(KEY, JSON.stringify(list.map(function (o) { return { t: o.t, src: o.src, x: o.x, y: o.y, r: o.r, s: o.s }; }))); } catch (e) { /* sin sitio: se queda solo en pantalla */ } }
  function paint(o) {
    o.el.style.left = o.x + 'px'; o.el.style.top = o.y + 'px';
    o.el.style.setProperty('--sr', o.r + 'deg'); o.el.style.setProperty('--ss', o.s);
  }
  function add(o, pop) {
    var el = document.createElement('div'); el.className = 'stk' + (pop ? ' pop' : '');
    if (o.src) { var im = document.createElement('img'); im.src = o.src; im.alt = ''; im.draggable = false; el.appendChild(im); }
    else { var sp = document.createElement('span'); sp.textContent = o.t; el.appendChild(sp); }
    o.el = el; list.push(o); paint(o); area.appendChild(el);
    el.addEventListener('pointerdown', function (e) { startDrag(e, o); });
    return o;
  }
  function select(o) {
    sel = o; list.forEach(function (x) { x.el.classList.toggle('is-sel', x === o); });
    tools.hidden = !o;
  }
  function startDrag(e, o) {
    if (!stick) return;
    e.preventDefault(); select(o);
    var k = wall.getBoundingClientRect().width / wall.offsetWidth || 1;
    var sx = e.clientX, sy = e.clientY, ox = o.x, oy = o.y;
    try { o.el.setPointerCapture(e.pointerId); } catch (err) { /* da igual */ }
    function move(ev) {
      o.x = clamp(ox + (ev.clientX - sx) / k, 8, wall.offsetWidth - 8);
      o.y = clamp(oy + (ev.clientY - sy) / k, 8, wall.offsetHeight - 8);
      paint(o);
    }
    function up() { o.el.removeEventListener('pointermove', move); o.el.removeEventListener('pointerup', up); o.el.removeEventListener('pointercancel', up); save(); }
    o.el.addEventListener('pointermove', move); o.el.addEventListener('pointerup', up); o.el.addEventListener('pointercancel', up);
  }
  function place(o) {
    o.x = 50 + Math.random() * (wall.offsetWidth - 100); o.y = 34 + Math.random() * (wall.offsetHeight - 68);
    o.r = Math.round(Math.random() * 30 - 15); o.s = 1;
    select(add(o, true)); save(); sfx('paper');
  }
  // Las imágenes se reducen antes de guardarlas, para que quepan y carguen rápido.
  function shrink(file, done) {
    var url = null; try { url = URL.createObjectURL(file); } catch (e) { return; }
    var im = new Image();
    im.onload = function () {
      var m = 240, k = Math.min(1, m / Math.max(im.width, im.height));
      var c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      try { c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); done(c.toDataURL('image/png')); } catch (e) { done(url); }
    };
    im.onerror = function () { B.toast('No se pudo leer esa imagen'); };
    im.src = url;
  }
  function moving() { mb.classList.add('is-moving'); setTimeout(function () { mb.classList.remove('is-moving'); }, 1050); }
  function enterStick() {
    stick = true; sec.classList.add('is-stick'); tray.hidden = false; openBtn.hidden = true;
    if (window.scrollY > 4) window.scrollTo({ top: 0, behavior: 'smooth' });
    ui.style.opacity = 1; ui.style.pointerEvents = '';
    moving();
    mb.style.setProperty('--door', 0); mb.style.setProperty('--out', 0);
    var up = window.innerWidth < 900 ? -Math.round(window.innerHeight * .2) : -10;
    mb.style.transform = 'translateY(' + up + 'px) scale(' + (ms * (window.innerWidth < 900 ? 1.05 : 1.22)).toFixed(3) + ') rotateX(0deg) rotateY(0deg)';
  }
  function exitStick() {
    if (!stick) return;
    stick = false; sec.classList.remove('is-stick'); tray.hidden = true; openBtn.hidden = false; select(null);
    moving(); lastP = -1;
  }
  function initStickers() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
    (Array.isArray(saved) ? saved : DEFAULTS).forEach(function (o) { add({ t: o.t, src: o.src, x: o.x, y: o.y, r: o.r, s: o.s }, false); });
    openBtn.addEventListener('click', enterStick);
    $('[data-stk-done]').addEventListener('click', exitStick);
    $('[data-stk-samples]').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) place({ t: b.textContent }); });
    $('[data-stk-file]').addEventListener('change', function (e) {
      Array.prototype.slice.call(e.target.files || [], 0, 8).forEach(function (f) { shrink(f, function (src) { place({ src: src }); }); });
      e.target.value = '';
    });
    tools.addEventListener('click', function (e) {
      var b = e.target.closest('[data-stk-do]'); if (!b || !sel) return;
      var d = b.dataset.stkDo;
      if (d === 'plus') sel.s = clamp(+(sel.s + .15).toFixed(2), .4, 2.4);
      if (d === 'minus') sel.s = clamp(+(sel.s - .15).toFixed(2), .4, 2.4);
      if (d === 'rot') sel.r = (sel.r + 15) % 360;
      if (d === 'del') { sel.el.remove(); list.splice(list.indexOf(sel), 1); select(null); save(); return; }
      paint(sel); save();
    });
  }

  function boot() {
    safe(fit, 'fit'); window.addEventListener('resize', fit);
    safe(initStickers, 'stickers');
    B.onFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

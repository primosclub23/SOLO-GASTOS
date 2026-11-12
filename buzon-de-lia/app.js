/* El buzón de Lia · tu lado en el móvil (maqueta) */
(function () {
  'use strict';
  var B = window.__BUZON__;
  if (!B) return;
  var $ = B.$, $$ = B.$$, toast = B.toast;
  function safe(fn, name) { try { fn(); } catch (e) { if (window.console) console.warn('[buzon-app] ' + name, e); } }

  var app = $('[data-app]');
  if (!app) return;
  var phone = $('[data-phone]', app), tabbar = $('[data-tabbar]', app);
  var state = { scr: 'login', tema: 'Lo que he aprendido', lock: 'Sin candado', as: null };

  /* ---------- Navegación entre pantallas ---------- */
  function go(name) {
    state.scr = name;
    if (name === 'home' || name === 'login' || name === 'plan') setAs(null);
    $$('[data-scr]', phone).forEach(function (s) { s.hidden = s.dataset.scr !== name; });
    tabbar.hidden = name === 'login' || name === 'write' || name === 'invite';
    $$('[data-tab]', tabbar).forEach(function (t) { t.classList.toggle('is-on', t.dataset.tab === name); });
    $$('.app-jump [data-go]', app).forEach(function (c) { c.classList.toggle('is-on', c.dataset.go === name); });
    closeSheet();
    var s = $('[data-scr="' + name + '"]', phone); if (s) s.scrollTop = 0;
  }
  function setAs(who) {
    state.as = who;
    $('[data-w-who]', app).textContent = who ? 'Escribes como: ' + who : 'Jue 12 nov';
    $('[data-w-send-txt]', app).textContent = who ? 'Enviar a aprobar' : 'Enviar';
    $('.scr-write .w-back', app).dataset.go = who ? 'invite' : 'home';
  }
  function show(start) {
    app.hidden = false; document.documentElement.style.overflow = 'hidden';
    go(start || 'login');
  }
  function hide() { app.hidden = true; document.documentElement.style.overflow = ''; stopSeal(); }
  B.app = { show: show, hide: hide, go: go, state: state };

  function initNav() {
    document.addEventListener('click', function (e) {
      var o = e.target.closest('[data-app-open]');
      if (o) { e.preventDefault(); show(o.dataset.appOpen || 'login'); return; }
      if (e.target.closest('[data-app-exit]')) return hide();
      var g = e.target.closest('[data-go]');
      if (g && app.contains(g)) go(g.dataset.go);
    });
    $('[data-login]', app).addEventListener('submit', function (e) { e.preventDefault(); go('home'); });
    var h = new Date().getHours();
    $('[data-greet]', app).innerHTML = (h < 13 ? 'Buenos <em>días</em>' : h < 21 ? 'Buenas <em>tardes</em>' : 'Buenas <em>noches</em>');
    $('[data-pend-ok]', app).addEventListener('click', function (e) {
      var c = e.target.closest('[data-pend]'); c.classList.add('is-gone');
      setTimeout(function () { c.hidden = true; }, 700);
      toast('Aprobada · va camino del buzón');
    });
    $('[data-inv-ok]', app).addEventListener('click', function () {
      go('write'); setAs('la abuela');
      $('[data-w-edit]', app).textContent = 'Mi niña, cuando tu madre tenía tu edad…';
    });
    if (location.hash === '#tu-lado') show();
  }

  /* ---------- Hojas inferiores ---------- */
  var sheet = $('[data-sheet]', app);
  function openSheet(name) {
    $$('[data-panel]', sheet).forEach(function (p) { p.hidden = p.dataset.panel !== name; });
    sheet.hidden = false;
  }
  function closeSheet() { if (sheet) sheet.hidden = true; stopRec(true); }
  function initSheets() {
    app.addEventListener('click', function (e) {
      var o = e.target.closest('[data-sheet-open]');
      if (o) return openSheet(o.dataset.sheetOpen);
      if (e.target.closest('[data-sheet-close]')) closeSheet();
    });

    // Tema
    $('[data-w-temas]', app).addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      $$('.chip', e.currentTarget).forEach(function (x) { x.classList.toggle('is-on', x === b); });
      state.tema = b.textContent; $('[data-w-tema]', app).textContent = state.tema;
      setTimeout(closeSheet, 250);
    });

    // Candado y entrega
    var locks = $('[data-w-locks]', app);
    function setLock(label) { state.lock = label; $('[data-w-lock]', app).textContent = label; }
    function pickLock(kind) {
      $$('.lock', locks).forEach(function (x) { x.classList.toggle('is-on', x.dataset.lk === kind); });
      $$('[data-lk-extra]', app).forEach(function (x) { x.hidden = x.dataset.lkExtra !== kind; });
      setLock({ none: 'Sin candado', fecha: 'Cerrada hasta una fecha', momento: 'Para un momento', plan: 'Le llega más adelante' }[kind]);
    }
    B.app.pickLock = pickLock; B.app.setLock = setLock;
    locks.addEventListener('click', function (e) { var b = e.target.closest('.lock'); if (b) pickLock(b.dataset.lk); });
    $$('[data-lk-extra]', app).forEach(function (box) {
      var kind = box.dataset.lkExtra, pre = kind === 'fecha' ? 'Cerrada hasta: ' : kind === 'plan' ? 'Le llega: ' : '';
      box.addEventListener('click', function (e) {
        var c = e.target.closest('.chip'); if (!c) return;
        $$('.chip', box).forEach(function (x) { x.classList.toggle('is-on', x === c); });
        setLock(pre + c.textContent.toLowerCase());
      });
      var d = $('[data-lk-date]', box);
      if (d) d.addEventListener('change', function () {
        if (!d.value) return;
        var p = d.value.split('-');
        setLock(pre + p[2] + '/' + p[1] + '/' + p[0]);
        $$('.chip', box).forEach(function (x) { x.classList.remove('is-on'); });
      });
      var t = $('[data-lk-text]', box);
      if (t) t.addEventListener('input', function () { if (t.value.trim()) setLock('«' + t.value.trim() + '»'); });
    });
  }

  /* ---------- Foto → polaroid ---------- */
  var fotoUrl = null;
  function initFoto() {
    var file = $('[data-foto-file]', app), ph = $('[data-foto-ph]', app), cap = $('[data-foto-cap]', app), txt = $('[data-foto-text]', app);
    file.addEventListener('change', function () {
      var f = file.files && file.files[0]; if (!f) return;
      try { fotoUrl = URL.createObjectURL(f); } catch (e) { fotoUrl = null; }
      if (fotoUrl) { ph.innerHTML = ''; var im = document.createElement('img'); im.src = fotoUrl; im.alt = ''; ph.appendChild(im); }
    });
    txt.addEventListener('input', function () { cap.textContent = txt.value || 'escribe la frase'; });
    $('[data-foto-add]', app).addEventListener('click', function () {
      var fig = document.createElement('figure'); fig.className = 'polaroid polaroid-s';
      fig.style.setProperty('--r', (Math.random() * 10 - 5).toFixed(1) + 'deg'); fig.style.transform = 'rotate(var(--r))';
      var p = document.createElement('div'); p.className = 'ph' + (fotoUrl ? '' : ' ph-field');
      if (fotoUrl) { var im = document.createElement('img'); im.src = fotoUrl; im.alt = ''; p.appendChild(im); }
      var c = document.createElement('figcaption'); c.textContent = txt.value.trim() || 'hoy';
      fig.appendChild(p); fig.appendChild(c);
      $('[data-w-items]', app).appendChild(fig);
      txt.value = ''; cap.textContent = 'escribe la frase';
      closeSheet(); fig.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  /* ---------- Audio (grabación simulada en la maqueta) ---------- */
  var recT = null, recS = 0;
  function fmt(s) { return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function stopRec(reset) {
    clearInterval(recT); recT = null;
    var b = $('[data-rec]', app); if (!b) return;
    b.classList.remove('is-rec');
    if (reset) { recS = 0; $('[data-rec-time]', app).textContent = '0:00'; $('[data-rec-add]', app).disabled = true; $('[data-rec-hint]', app).textContent = 'Toca para grabar'; }
  }
  function initAudio() {
    var bars = $('[data-rec-bars]', app), btn = $('[data-rec]', app), add = $('[data-rec-add]', app), hint = $('[data-rec-hint]', app);
    if (bars.children.length === 0) for (var i = 0; i < 36; i++) bars.appendChild(document.createElement('i'));
    var all = $$('i', bars), n = 0;
    btn.addEventListener('click', function () {
      if (recT) { stopRec(false); hint.textContent = 'Grabado · ' + fmt(Math.max(1, recS)); add.disabled = false; return; }
      recS = 0; n = 0; btn.classList.add('is-rec'); hint.textContent = 'Grabando… toca para parar'; add.disabled = true;
      recT = setInterval(function () {
        n++; if (n % 8 === 0) { recS++; $('[data-rec-time]', app).textContent = fmt(recS); }
        all.forEach(function (b, k) { b.style.height = (12 + 80 * Math.abs(Math.sin(n * .5 + k * .9) * Math.cos(n * .23 + k * .31))) + '%'; });
      }, 125);
    });
    add.addEventListener('click', function () {
      var a = document.createElement('div'); a.className = 'audio';
      var pb = document.createElement('span'); pb.className = 'audio-btn'; pb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
      var bs = document.createElement('div'); bs.className = 'audio-bars';
      for (var k = 0; k < 26; k++) { var b = document.createElement('i'); b.style.setProperty('--h', Math.round(22 + 70 * Math.abs(Math.sin(k * 1.9) * Math.cos(k * .41)))); bs.appendChild(b); }
      var l = document.createElement('span'); l.className = 'label'; l.textContent = fmt(Math.max(1, recS));
      a.appendChild(pb); a.appendChild(bs); a.appendChild(l);
      $('[data-w-items]', app).appendChild(a);
      closeSheet();
    });
  }

  /* ---------- Enviar ---------- */
  function initSendApp() {
    $('[data-w-send]', app).addEventListener('click', function () {
      var text = ($('[data-w-edit]', app).textContent || '').trim();
      B.playSend(text, function () {
        if (state.as) { toast('Enviada · le llegará a Lia cuando la aprueben'); go('invite'); return; }
        B.addSentCard(text);
        $('[data-today-state]', app).textContent = 'enviada';
        $('[data-today]', app).classList.add('is-sealed');
        go('home'); toast('Tu carta ya está en el buzón de Lia');
      });
    });
  }

  /* ---------- Programadas ---------- */
  function initPlan() {
    function startPlanned(label) {
      go('write'); B.app.pickLock('plan'); B.app.setLock('Le llega: ' + label);
      $('[data-w-edit]', app).textContent = '';
      toast('Carta nueva · ' + label);
    }
    $('[data-ages]', app).addEventListener('click', function (e) {
      var a = e.target.closest('.age'); if (!a) return;
      if (a.classList.contains('is-done')) return toast('Ya está escrita · se entrega cuando cumpla ' + a.dataset.age);
      startPlanned('cuando cumpla ' + a.dataset.age);
    });
    $('[data-plan-new]', app).addEventListener('click', function () { go('write'); B.app.pickLock('plan'); openSheet('candado'); });
  }

  /* ---------- El sellado de las 23:59 ---------- */
  var mid = $('[data-mid]', app), midTimers = [];
  function stopSeal() { midTimers.forEach(clearTimeout); midTimers = []; if (mid) { mid.hidden = true; mid.className = 'mid'; } }
  function at(ms, fn) { midTimers.push(setTimeout(fn, ms)); }
  function playSeal() {
    stopSeal(); closeSheet();
    if (app.hidden) show('home');
    var clock = $('[data-mid-clock]', mid);
    var t = ($('[data-w-edit]', app).textContent || '').trim();
    if (t) $('[data-mid-text]', mid).textContent = t;
    function setClock(v) { clock.textContent = v; clock.classList.remove('tick'); void clock.offsetWidth; clock.classList.add('tick'); if (B.sfx) B.sfx('tick'); }
    clock.textContent = '23:59:57';
    mid.hidden = false;
    at(1000, function () { setClock('23:59:58'); });
    at(2000, function () { setClock('23:59:59'); });
    at(2600, function () { mid.classList.add('is-drop'); });
    at(3000, function () { setClock('00:00:00'); });
    at(3100, function () { mid.classList.add('is-sealed'); if (B.sfx) B.sfx('seal'); });
    at(3900, function () { mid.classList.add('is-stamped'); if (B.sfx) B.sfx('stamp'); });
    at(4700, function () { mid.classList.add('is-done'); });
  }
  B.app.playSeal = playSeal;
  function initSeal() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-seal-demo]')) { e.preventDefault(); playSeal(); }
      if (e.target.closest('[data-mid-close]')) {
        stopSeal();
        $('[data-today-state]', app).textContent = 'sellada';
        $('[data-today]', app).classList.add('is-sealed');
        go('home');
      }
    });
  }

  function boot() {
    safe(initNav, 'nav'); safe(initSheets, 'sheets'); safe(initFoto, 'foto'); safe(initAudio, 'audio');
    safe(initSendApp, 'send'); safe(initPlan, 'plan'); safe(initSeal, 'seal');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

/* El buzón de Lia · maqueta interactiva. Sin dependencias. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a === undefined ? 0 : a, Math.min(b === undefined ? 1 : b, v)); };
  var seg = function (p, from, len) { return clamp((p - from) / len); };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function safe(fn, name) { try { fn(); } catch (e) { if (window.console) console.warn('[buzon] ' + name, e); } }

  var vh = window.innerHeight, vw = window.innerWidth;
  var frameFns = [];

  /* ---------- Splash ---------- */
  function initSplash() {
    var s = $('.splash');
    if (!s) return;
    setTimeout(function () { s.classList.add('is-gone'); }, 2600);
  }

  /* ---------- Reveal ---------- */
  function initReveal() {
    var els = $$('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.05, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io.observe(e); });
    // Red de seguridad: lo que ya esté en pantalla y siga oculto, se muestra.
    setTimeout(function () {
      els.forEach(function (e) {
        var r = e.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) e.classList.add('in');
      });
    }, 6000);
  }

  /* ---------- Parallax (scroll + ratón) ---------- */
  function initParallax() {
    var roots = $$('[data-px-root]').map(function (root) {
      return { root: root, items: $$('.px[data-speed]', root).map(function (el) { return { el: el, s: parseFloat(el.dataset.speed) || 0 }; }) };
    });
    var k = function () { return vw < 900 ? .55 : 1; };
    frameFns.push(function () {
      roots.forEach(function (g) {
        var r = g.root.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var d = (r.top + r.height / 2 - vh / 2) * k();
        g.items.forEach(function (it) { it.el.style.setProperty('--py', (d * it.s).toFixed(1)); });
      });
    });

    var hero = $('.hero');
    var deep = $$('.px[data-depth]', hero);
    var tx = 0, ty = 0, cx = 0, cy = 0;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      tx = e.clientX / vw - .5; ty = e.clientY / vh - .5;
    }, { passive: true });
    frameFns.push(function () {
      if (Math.abs(tx - cx) < .0005 && Math.abs(ty - cy) < .0005) return;
      cx += (tx - cx) * .06; cy += (ty - cy) * .06;
      deep.forEach(function (el) {
        var d = parseFloat(el.dataset.depth);
        el.style.setProperty('--mx', (-cx * d).toFixed(2));
        el.style.setProperty('--my', (-cy * d).toFixed(2));
      });
    });
  }

  /* ---------- Barra de tinta + nav ---------- */
  function initChrome() {
    var bar = $('.ink-progress'), nav = $('.nav'), last = 0;
    frameFns.push(function () {
      var y = window.scrollY, max = document.documentElement.scrollHeight - vh;
      bar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
      if (Math.abs(y - last) > 6) { nav.classList.toggle('is-hidden', y > last && y > 300); last = y; }
    });
  }

  /* ---------- Manifiesto: palabra a palabra ---------- */
  function initWords() {
    var p = $('[data-words]');
    if (!p || p.dataset.done) return;
    p.dataset.done = '1';
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span'); s.className = 'wd'; s.textContent = t;
            frag.appendChild(s); words.push(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(p);
    frameFns.push(function () {
      var r = p.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var prog = clamp((vh * .86 - r.top) / (r.height + vh * .34));
      var n = prog * (words.length + 3);
      words.forEach(function (w, i) { w.style.opacity = clamp(n - i, .13, 1).toFixed(2); });
    });
  }

  /* ---------- La escena: carta → sobre → buzón ---------- */
  function sceneParts(stage) {
    return {
      stage: stage, pack: $('.pack', stage), ltr: $('.ltr', stage), top: $('.ltr-top', stage), bot: $('.ltr-bot', stage),
      envB: $('.env-back', stage), envF: $('.env-front', stage), flap: $('.env-flap', stage), seal: $('.env-seal', stage),
      mbB: $('.mbx-back', stage), mbF: $('.mbx-front', stage), flag: $('.mbx-flag', stage), done: $('.send-done', stage)
    };
  }
  function renderScene(o, p) {
    var a = ease(seg(p, .05, .17));   // dobla abajo
    var b = ease(seg(p, .22, .17));   // dobla arriba
    var c1 = ease(seg(p, .40, .10));  // aparece el sobre
    var c2 = ease(seg(p, .50, .12));  // la carta entra
    var d = ease(seg(p, .62, .09));   // se cierra la solapa
    var e = seg(p, .71, .05);         // lacre
    var f = ease(seg(p, .78, .17));   // cae al buzón
    var g = seg(p, .95, .04);         // sellada

    o.bot.style.transform = 'translateZ(' + (a * 1) + 'px) rotateX(' + (a * 179) + 'deg)';
    o.top.style.transform = 'translateZ(' + (b * 2.5) + 'px) rotateX(' + (-b * 178) + 'deg)';
    var ly = -70 * c1 * (1 - c2) + 70 * c2;
    o.ltr.style.transform = 'translateY(' + ly + 'px) scale(' + (1 - .08 * c2) + ')';
    o.ltr.style.opacity = f > .02 ? 0 : 1;

    var envO = clamp(c1 * 2.2), envY = (1 - c1) * 150;
    [o.envB, o.envF, o.flap].forEach(function (el) { el.style.opacity = envO; });
    o.envB.style.transform = o.envF.style.transform = 'translateY(' + envY + 'px)';
    o.flap.style.transform = 'translateY(' + envY + 'px) perspective(900px) rotateX(' + (180 - d * 180) + 'deg)';
    o.flap.style.zIndex = d > .5 ? 4 : 1;
    o.flap.style.filter = 'brightness(' + (d > .5 ? 1 : .93) + ')';
    o.seal.style.opacity = clamp(e * 3);
    o.seal.style.transform = 'scale(' + (2.4 - 1.4 * clamp(e * 1.6) + Math.sin(e * Math.PI) * .12) + ') rotate(' + (-20 + 20 * e) + 'deg)';

    o.pack.style.transform = 'translateY(' + (f * 330) + 'px) rotate(' + (Math.sin(f * Math.PI) * -5) + 'deg) scale(' + (1 - .5 * clamp(f * 1.8)) + ')';

    var m = o.noBox ? 0 : ease(seg(p, .56, .2));
    o.mbB.style.opacity = o.mbF.style.opacity = clamp(m * 1.6);
    o.mbB.style.transform = o.mbF.style.transform = 'translateY(' + ((1 - m) * 120) + 'px)';
    o.flag.style.transform = 'rotate(' + (g > .2 ? 0 : 90) + 'deg)';
    o.done.style.opacity = g;
    o.done.style.transform = 'translateY(' + ((1 - g) * 8) + 'px)';
    o.stage.style.setProperty('--sy', ((1 - m) * 120) + 'px');
  }

  function initSendScroll() {
    var sec = $('.sendsec'), stage = $('[data-send]', sec), wrap = $('.send-wrap', sec), copy = $('.sendsec-copy', sec);
    if (!sec || !stage) return;
    var parts = sceneParts(stage), steps = $$('.send-steps li', sec), lastP = -1;
    function fit() {
      vh = window.innerHeight; vw = window.innerWidth;
      var avail = vw < 900 ? vh - copy.getBoundingClientRect().height - 120 : vh - 120;
      wrap.style.setProperty('--s', clamp(Math.min(avail / 690, (vw - 44) / 340), .38, 1.05).toFixed(3));
    }
    fit(); window.addEventListener('resize', fit);
    renderScene(parts, 0);
    frameFns.push(function () {
      var r = sec.getBoundingClientRect();
      var p = clamp(-r.top / (r.height - vh));
      if (Math.abs(p - lastP) < .0004) return;
      lastP = p;
      renderScene(parts, p);
      var active = p < .40 ? 0 : p < .62 ? 1 : p < .78 ? 2 : 3;
      steps.forEach(function (li, i) { li.classList.toggle('is-on', i === active); });
    });
  }

  /* ---------- Editor ---------- */
  function initEditor() {
    // Cuenta atrás hasta las 23:59
    var cd = $('[data-countdown]');
    function tick() {
      var now = new Date(), end = new Date(now); end.setHours(23, 59, 59, 0);
      var s = Math.max(0, Math.floor((end - now) / 1000));
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      cd.textContent = pad(Math.floor(s / 3600)) + ' h ' + pad(Math.floor(s % 3600 / 60)) + ' min ' + pad(s % 60) + ' s';
    }
    if (cd) { tick(); setInterval(tick, 1000); }

    // Selección única (tema, candado)
    $$('[data-single]').forEach(function (group) {
      group.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        $$('button', group).forEach(function (x) { x.classList.toggle('is-on', x === b); });
      });
    });

    // Audio: ondas + reproducción simulada
    $$('[data-audio]').forEach(function (au) {
      var bars = $('.audio-bars', au);
      if (bars.children.length > 0) return;
      for (var i = 0; i < 44; i++) {
        var b = document.createElement('i');
        b.style.setProperty('--h', Math.round(22 + 70 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * .37))));
        b.style.setProperty('--n', i);
        bars.appendChild(b);
      }
      var timer = null, pos = 0, all = $$('i', bars);
      $('.audio-btn', au).addEventListener('click', function () {
        var on = au.classList.toggle('is-playing');
        clearInterval(timer);
        if (!on) return;
        if (pos >= all.length) { pos = 0; all.forEach(function (x) { x.classList.remove('is-past'); }); }
        timer = setInterval(function () {
          if (pos >= all.length) { clearInterval(timer); au.classList.remove('is-playing'); return; }
          all[pos++].classList.add('is-past');
        }, 130);
      });
    });
  }

  /* ---------- Enviar: la animación a pantalla completa ---------- */
  function toast(msg) {
    var t = $('[data-toast]'); if (!t) return;
    t.textContent = msg; t.hidden = true; void t.offsetWidth; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 4200);
  }
  function initSend() {
    var btn = $('[data-send-btn]'), ov = $('[data-sending]'), wrap = $('[data-sending-wrap]'), src = $('[data-send]');
    if (!btn || !ov || !src) return;
    var busy = false;
    btn.addEventListener('click', function () {
      if (busy) return; busy = true;
      var text = ($('[data-edit]').textContent || '').trim();
      wrap.innerHTML = '';
      var stage = src.cloneNode(true);
      stage.removeAttribute('data-send');
      var body = $('[data-ltr-body]', stage);
      if (text && body) body.textContent = text.length > 110 ? text.slice(0, 108) + '…' : text;
      wrap.appendChild(stage);
      wrap.style.setProperty('--s', clamp(Math.min((vh - 60) / 690, (vw - 40) / 340), .4, 1.1).toFixed(3));
      var parts = sceneParts(stage);
      renderScene(parts, 0);
      ov.classList.remove('is-out'); ov.hidden = false;
      var t0 = null, dur = 5200;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = clamp((ts - t0) / dur);
        renderScene(parts, p);
        if (p < 1) return requestAnimationFrame(step);
        setTimeout(function () {
          ov.classList.add('is-out');
          setTimeout(function () { ov.hidden = true; busy = false; addSentCard(text); toast('Tu carta ya está en el buzón de Lia'); }, 600);
        }, 900);
      }
      requestAnimationFrame(step);
    });
  }
  function addSentCard(text) {
    var grid = $('[data-grid]'); if (!grid || !text) return;
    var temaBtn = $('.side .chips .is-on');
    var c = document.createElement('article');
    c.className = 'card'; c.tabIndex = 0; c.dataset.tema = 'nuevo'; c.dataset.de = 'yo';
    var top = document.createElement('div'); top.className = 'card-top';
    top.innerHTML = '<span class="label">Hoy · recién llegada</span><span class="ministamp">L</span>';
    var h = document.createElement('h3'); h.innerHTML = 'La carta de <em>hoy</em>';
    var ex = document.createElement('p'); ex.className = 'card-ex'; ex.textContent = text.length > 120 ? text.slice(0, 118) + '…' : text;
    var foot = document.createElement('div'); foot.className = 'card-foot';
    var sg = document.createElement('span'); sg.className = 'hand'; sg.textContent = 'Quien más te quiere';
    var lb = document.createElement('span'); lb.className = 'label'; lb.textContent = temaBtn ? temaBtn.textContent : '';
    foot.appendChild(sg); foot.appendChild(lb);
    var bd = document.createElement('div'); bd.className = 'card-body'; bd.hidden = true;
    ['Querida Lia:', text].forEach(function (t) { var p = document.createElement('p'); p.textContent = t; bd.appendChild(p); });
    [top, h, ex, foot, bd].forEach(function (n) { c.appendChild(n); });
    grid.insertBefore(c, grid.firstChild);
  }

  /* ---------- Temas: scroll horizontal ---------- */
  function initThemes() {
    var sec = $('.themes'), track = $('[data-track]');
    if (!sec || !track) return;
    frameFns.push(function () {
      var r = sec.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var p = clamp(-r.top / (r.height - vh));
      var max = Math.max(0, track.scrollWidth - vw);
      track.style.transform = 'translate3d(' + (-ease(p) * max).toFixed(1) + 'px,0,0)';
    });
  }

  /* ---------- Cartas: filtros + lectura ---------- */
  function initLetters() {
    var grid = $('[data-grid]'), empty = $('.grid-empty');
    var state = { tema: '*', de: '*' };
    function apply() {
      var n = 0;
      $$('.card', grid).forEach(function (c) {
        var ok = (state.tema === '*' || c.dataset.tema === state.tema) && (state.de === '*' || c.dataset.de === state.de);
        c.hidden = !ok;
        if (ok) { c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; c.style.animationDelay = (n++ * 60) + 'ms'; }
      });
      empty.hidden = n > 0;
    }
    $$('[data-filter]').forEach(function (g) {
      g.addEventListener('click', function (e) {
        var b = e.target.closest('.chip'); if (!b) return;
        $$('.chip', g).forEach(function (x) { x.classList.toggle('is-on', x === b); });
        state[g.dataset.filter] = b.dataset.v; apply();
      });
    });

    var modal = $('[data-modal]'), box = $('[data-modal-letter]'), ask = $('[data-modal-ask]'), foot = $('[data-modal-foot]');
    var current = null;
    function showLetter(card) {
      box.innerHTML = '';
      if (card.dataset.pol) {
        var pp = card.dataset.pol.split('|'), fig = document.createElement('figure');
        fig.className = 'polaroid polaroid-s m-pol';
        var ph = document.createElement('div'); ph.className = 'ph ' + pp[0];
        var cap = document.createElement('figcaption'); cap.textContent = pp[1] || '';
        fig.appendChild(ph); fig.appendChild(cap); box.appendChild(fig);
      }
      var body = $('.card-body', card);
      if (body) Array.prototype.forEach.call(body.children, function (p) { box.appendChild(p.cloneNode(true)); });
      var sign = document.createElement('p'); sign.className = 'm-sign'; sign.textContent = $('.card-foot .hand', card).textContent;
      box.appendChild(sign);
      $('[data-modal-meta]').textContent = $('.card-top .label', card).textContent + ' · ' + $('.card-foot .label', card).textContent;
      box.hidden = false; foot.hidden = false; ask.hidden = true;
    }
    function open(card) {
      current = card;
      var lock = card.classList.contains('is-locked') ? card.dataset.lock : null;
      if (lock) {
        box.hidden = true; foot.hidden = true; ask.hidden = false;
        $('[data-ask-title]').textContent = $('h3', card).textContent;
        var isMoment = lock === 'momento';
        $('[data-ask-txt]').textContent = isMoment
          ? 'Esta carta te espera para un día así. Solo se abre una vez. ¿Es hoy?'
          : 'Todavía no es el día. Esta carta se abrirá sola cuando llegue su fecha.';
        $('[data-break]').hidden = !isMoment;
        if (!isMoment) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
      } else if (card.closest('[data-lia]')) {
        // En la vista de Lia, el sobre se abre antes de leer.
        return playOpen(function () { showLetter(card); card.classList.add('is-read'); modal.hidden = false; document.documentElement.style.overflow = 'hidden'; });
      } else showLetter(card);
      modal.hidden = false; document.documentElement.style.overflow = 'hidden';
    }
    function close() { modal.hidden = true; document.documentElement.style.overflow = $('[data-lia]').hidden ? '' : 'hidden'; current = null; }

    document.addEventListener('click', function (e) { var c = e.target.closest('.card'); if (c) open(c); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('card')) open(e.target); });
    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) return close();
      if (e.target.closest('[data-break]') && current) {
        current.classList.remove('is-locked');
        var w = $('.wax', current); if (w) w.remove();
        $('.card-foot .label', current).textContent = 'Abierta hoy';
        showLetter(current);
      }
      if (e.target.closest('[data-print]')) { try { window.print(); } catch (err) { /* vista previa sin impresión */ } }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });
  }

  /* ---------- Abrir un sobre: la escena al revés ---------- */
  var opening = false;
  function playOpen(cb) {
    var ov = $('[data-sending]'), wrap = $('[data-sending-wrap]'), src = $('[data-send]');
    if (opening || !ov || !src) return cb();
    opening = true;
    wrap.innerHTML = '';
    var stage = src.cloneNode(true); stage.removeAttribute('data-send'); wrap.appendChild(stage);
    wrap.style.setProperty('--s', clamp(Math.min((vh - 60) / 690, (vw - 40) / 340), .4, 1.1).toFixed(3));
    var parts = sceneParts(stage); parts.noBox = true;
    var from = .76, to = .02, dur = 2600, t0 = null;
    renderScene(parts, from);
    ov.classList.remove('is-out'); ov.hidden = false;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var t = clamp((ts - t0) / dur);
      renderScene(parts, from + (to - from) * t);
      if (t < 1) return requestAnimationFrame(step);
      setTimeout(function () {
        ov.classList.add('is-out'); cb();
        setTimeout(function () { ov.hidden = true; opening = false; }, 600);
      }, 350);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Vista de Lia ---------- */
  function initLia() {
    var lia = $('[data-lia]'), gate = $('[data-lia-gate]'), home = $('[data-lia-home]'), form = $('[data-lia-form]');
    if (!lia) return;
    // Su libro: las mismas cartas del archivo, sin las de «momento» (tienen su sitio aparte).
    var lg = $('[data-lia-grid]');
    if (lg.children.length === 0) {
      $$('[data-grid] .card').forEach(function (c) {
        if (c.dataset.lock === 'momento') return;
        lg.appendChild(c.cloneNode(true));
      });
    }
    function show() {
      gate.hidden = false; gate.classList.remove('is-open', 'is-leaving'); home.hidden = true;
      lia.hidden = false; lia.scrollTop = 0; document.documentElement.style.overflow = 'hidden';
    }
    function hide() { lia.hidden = true; document.documentElement.style.overflow = ''; }
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-lia-open]')) { e.preventDefault(); show(); }
      if (e.target.closest('[data-lia-exit]')) hide();
      if (e.target.closest('[data-lia-book]')) toast('En la web real: se descarga el PDF con todas tus cartas');
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      gate.classList.add('is-open');
      setTimeout(function () { gate.classList.add('is-leaving'); }, 1700);
      setTimeout(function () { gate.hidden = true; home.hidden = false; lia.scrollTop = 0; }, 2400);
    });
    $('[data-lia-who]').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      $$('.chip', e.currentTarget).forEach(function (x) { x.classList.toggle('is-on', x === b); });
      $$('.card', lg).forEach(function (c) { c.hidden = !(b.dataset.v === '*' || c.dataset.de === b.dataset.v); });
    });
    if (location.hash === '#vista-lia') show();
  }

  /* ---------- Familia ---------- */
  function initFamily() {
    $$('[data-role]').forEach(function (b) {
      b.addEventListener('click', function () {
        var w = b.classList.toggle('is-write');
        b.textContent = w ? 'Escribe' : 'Solo lee';
      });
    });
    var ap = $('[data-approve]');
    if (ap) ap.addEventListener('click', function () {
      ap.closest('.pending').classList.add('is-ok');
      toast('Aprobada · la carta de la abuela va camino del buzón');
    });
  }

  /* ---------- Arranque ---------- */
  function boot() {
    safe(initSplash, 'splash');
    safe(initReveal, 'reveal');
    safe(initParallax, 'parallax');
    safe(initChrome, 'chrome');
    safe(initWords, 'words');
    safe(initSendScroll, 'sendScroll');
    safe(initEditor, 'editor');
    safe(initSend, 'send');
    safe(initThemes, 'themes');
    safe(initLetters, 'letters');
    safe(initFamily, 'family');
    safe(initLia, 'lia');

    window.addEventListener('resize', function () { vh = window.innerHeight; vw = window.innerWidth; });
    (function loop() {
      for (var i = 0; i < frameFns.length; i++) { try { frameFns[i](); } catch (e) { /* un fallo no para el resto */ } }
      requestAnimationFrame(loop);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

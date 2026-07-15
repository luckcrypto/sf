/* ships.fyi — MEGA-NAV v5 behaviour, ported per the family blueprint. */
(function () {
  'use strict';
  var mn = document.getElementById('mn'); if (!mn) return;
  var groups = [].slice.call(mn.querySelectorAll('.mn-group'));
  var desktop = window.matchMedia('(min-width:961px)');
  var hoverTimer;

  function openGroup(g) {
    groups.forEach(function (o) {
      if (o !== g) { o.classList.remove('is-open');
        var t = o.querySelector('.mn-top'); if (t) t.setAttribute('aria-expanded', 'false'); }
    });
    g.classList.add('is-open');
    var t = g.querySelector('.mn-top'); if (t) t.setAttribute('aria-expanded', 'true');
  }
  function closeGroup(g) {
    g.classList.remove('is-open');
    var t = g.querySelector('.mn-top'); if (t) t.setAttribute('aria-expanded', 'false');
  }
  function closeAll() { groups.forEach(closeGroup); }

  groups.forEach(function (g) {
    var top = g.querySelector('.mn-top'); if (!top) return;
    top.addEventListener('click', function () {
      g.classList.contains('is-open') ? closeGroup(g) : openGroup(g);
    });
    g.addEventListener('mouseenter', function () {
      if (!desktop.matches) return;
      clearTimeout(hoverTimer); openGroup(g);
    });
    g.addEventListener('mouseleave', function () {
      if (!desktop.matches) return;
      hoverTimer = setTimeout(function () { closeGroup(g); }, 150);
    });
  });

  /* current-page highlight */
  var cur = mn.getAttribute('data-current');
  if (cur) {
    var el = mn.querySelector('.mn-group[data-key="' + cur + '"], .mn-direct[data-key="' + cur + '"]');
    if (el) el.classList.add('is-current');
  }

  /* Escape + click-outside close */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeAll(); closeDrawer(); }
  });
  document.addEventListener('click', function (e) {
    if (!mn.contains(e.target)) closeAll();
  });

  /* scroll state */
  function onScroll() { mn.classList.toggle('is-scrolled', (window.scrollY || 0) > 12); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- scrim sync (non-invasive) ---------- */
  (function () {
    var scrim = document.querySelector('.mn-scrim'); if (!scrim) return;
    function sync() {
      var open = desktop.matches && groups.some(function (g) { return g.classList.contains('is-open'); });
      document.documentElement.classList.toggle('mn-blur', open);
    }
    groups.forEach(function (g) {
      new MutationObserver(sync).observe(g, { attributes: true, attributeFilter: ['class'] });
    });
    if (desktop.addEventListener) desktop.addEventListener('change', sync);
    scrim.addEventListener('click', function () { closeAll(); sync(); });
    sync();
  })();

  /* ---------- mobile drawer ---------- */
  var burger = document.getElementById('mnBurger');
  var burger2 = document.getElementById('mnBurger2');
  function openDrawer() {
    mn.classList.add('is-drawer');
    if (burger) burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    mn.classList.remove('is-drawer');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  if (burger) burger.addEventListener('click', function () {
    mn.classList.contains('is-drawer') ? closeDrawer() : openDrawer();
  });
  if (burger2) burger2.addEventListener('click', closeDrawer);
  if (desktop.addEventListener) desktop.addEventListener('change', function (e) {
    if (e.matches) closeDrawer(); else closeAll();
  });

  /* drawer accordions — single-open */
  var accs = [].slice.call(mn.querySelectorAll('.mn-acc'));
  accs.forEach(function (a) {
    var top = a.querySelector('.mn-acc-top'); if (!top) return;
    top.addEventListener('click', function () {
      var was = a.classList.contains('is-open');
      accs.forEach(function (o) {
        o.classList.remove('is-open');
        var t = o.querySelector('.mn-acc-top'); if (t) t.setAttribute('aria-expanded', 'false');
      });
      if (!was) { a.classList.add('is-open'); top.setAttribute('aria-expanded', 'true'); }
    });
  });
})();

/* ---------- page: single-open <details> accordions ---------- */
(function () {
  document.querySelectorAll('[data-accordion]').forEach(function (group) {
    group.querySelectorAll('details').forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        group.querySelectorAll('details[open]').forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
  });
})();

/* ---------- spec table: metric ⇄ imperial (remembered sitewide) ---------- */
(function () {
  function stored(){ try { return localStorage.getItem('shfyi.units') === 'imperial'; } catch(e){ return false; } }
  document.querySelectorAll('[data-unit-toggle]').forEach(function (btn) {
    var table = document.querySelector(btn.getAttribute('data-unit-toggle'));
    if (!table) return;
    var imperial = false;
    function apply(){
      table.querySelectorAll('td[data-metric]').forEach(function (td) {
        td.textContent = imperial ? td.getAttribute('data-imperial') : td.getAttribute('data-metric');
      });
      btn.textContent = imperial ? 'Switch to metric' : 'Switch to imperial';
    }
    btn.addEventListener('click', function () {
      imperial = !imperial;
      try { localStorage.setItem('shfyi.units', imperial ? 'imperial' : 'metric'); } catch(e){}
      apply();
    });
    if (stored()){ imperial = true; apply(); }
  });
})();

/* ============ ANIMATED NAV BRAND — ported verbatim from luck.fyi ============ */
/* 1. the .fyi expander */
(function(){
  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var fws=[].slice.call(document.querySelectorAll('.mn-logo b .fw'));
  fws.forEach(function(fw){
    var sp=fw.querySelector('.fwt'); if(!sp) return;
    var base=sp.textContent;
    function widthOf(t){
      var c=document.createElement('span'); c.textContent=t;
      c.style.cssText='position:absolute;visibility:hidden;white-space:nowrap';
      fw.appendChild(c); var w=c.offsetWidth; c.remove(); return w;
    }
    fw.style.width=widthOf(base)+'px';
    function swap(t,cb){
      sp.classList.add('fo');
      setTimeout(function(){
        sp.textContent=t; fw.style.width=widthOf(t)+'px';
        sp.classList.remove('fo'); sp.classList.add('fi');
        requestAnimationFrame(function(){requestAnimationFrame(function(){
          sp.classList.remove('fi');
        });});
        if(cb) setTimeout(cb,1350);
      },240);
    }
    var seq=['for','your','information'];
    function play(){
      if(document.hidden){ setTimeout(play,9000); return; }
      var i=0;
      (function step(){
        i<seq.length ? swap(seq[i++],step)
                     : swap(base,function(){ setTimeout(play, 7000 + Math.random()*6000); });
      })();
    }
    setTimeout(play, 5000 + Math.random()*7000);
  });
})();

/* 2. the brand roller — calm edition: the ship glyph + a small emoji set, rotating rarely */
(function(){
  var mbs=[].slice.call(document.querySelectorAll('.mn-mark .mm-b')); if(!mbs.length) return;

  var EMO=['\u2693\uFE0F','\u26F4\uFE0F','\uD83D\uDEA2','\uD83D\uDEF3\uFE0F','\uD83D\uDEE5\uFE0F','\uD83D\uDEA4','\u26F5\uFE0F','\uD83D\uDEF6','\uD83C\uDF0A'];

  /* the brand's anchor, drawn white on the teal disc */
  var ANCHOR='<img src="/assets/img/anchor-white.png" alt="" width="17" height="17" decoding="async">';
  function paint(mb,s){
    if(s.plane){ mb.classList.remove('emo'); mb.classList.add('pln');
      mb.innerHTML=ANCHOR; return; }
    mb.classList.remove('pln');
    mb.classList.add('emo'); mb.textContent=s.emo;
  }
  var seq = -1;
  function next(){
    /* every third beat returns home to the logo; otherwise walk the emoji set in order */
    seq++;
    if(seq % 3 === 2) return {plane:true};
    return {emo:EMO[(seq - Math.floor(seq/3)) % EMO.length]};
  }

  mbs.forEach(function(mb){ paint(mb, {plane:true}); });

  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function roll(){
    if(document.hidden){ schedule(); return; }
    mbs.forEach(function(mb){ mb.classList.add('mo'); });
    setTimeout(function(){
      mbs.forEach(function(mb){
        paint(mb, next());
        mb.classList.remove('mo'); mb.classList.add('mi');
      });
      requestAnimationFrame(function(){requestAnimationFrame(function(){
        mbs.forEach(function(mb){ mb.classList.remove('mi'); });
      });});
      schedule();
    },220);
  }
  function schedule(){ setTimeout(roll, 16000 + Math.random()*8000); }   /* one turn every ~16-24 s */
  setTimeout(roll, 22000 + Math.random()*4000);                          /* brand mark holds ~22 s first */
})();

/* ---------- site search ---------- */
(function(){
  var dlg = document.getElementById('srch');
  var input = document.getElementById('srchInput');
  var list = document.getElementById('srchResults');
  if (!dlg || !input || !list) return;
  var IDX = window.SEARCH_INDEX || [];
  var open = false, sel = -1, hits = [];
  var esc = function(s){ var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

  function score(item, q){
    var t = item.t.toLowerCase();
    var w = item.w || 0;   /* popularity weight — the terms people actually type rank first */
    if (t === q) return 100 + w;
    if (t.indexOf(q) === 0) return 80 + w;
    if (t.indexOf(q) > -1) return 60 + w;
    if (item.q.indexOf(q) > -1) return 40 + w;
    /* every word must appear somewhere */
    var words = q.split(/\s+/).filter(Boolean);
    if (words.length > 1 && words.every(function(w){ return item.q.indexOf(w) > -1; })) return 30;
    return 0;
  }
  function render(){
    var q = input.value.trim().toLowerCase();
    if (!q){
      list.innerHTML = '';
      hits = [];
      return;
    }
    hits = IDX.map(function(i){ return { i: i, s: score(i, q) }; })
      .filter(function(x){ return x.s > 0; })
      .sort(function(a, b){ return b.s - a.s || a.i.t.length - b.i.t.length; })
      .slice(0, 8).map(function(x){ return x.i; });
    sel = hits.length ? 0 : -1;
    list.innerHTML = hits.length
      ? hits.map(function(h, n){
          return '<li role="option" aria-selected="' + (n === 0) + '" class="' + (n === 0 ? 'on' : '') + '">' +
            '<a href="' + h.u + '"><span class="sr-k">' + esc(h.k) + '</span>' +
            '<span class="sr-t">' + esc(h.t) + '</span>' +
            '<span class="sr-d">' + esc(h.d || '') + '</span></a></li>'; }).join('')
      : '<li class="srch-none">Nothing matches “' + esc(input.value) + '”.</li>';
  }
  function move(d){
    if (!hits.length) return;
    sel = (sel + d + hits.length) % hits.length;
    [].forEach.call(list.children, function(li, n){
      li.classList.toggle('on', n === sel);
      li.setAttribute('aria-selected', String(n === sel));
    });
    var el = list.children[sel];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }
  function show(){
    dlg.hidden = false; open = true;
    document.body.style.overflow = 'hidden';
    input.value = ''; render();
    setTimeout(function(){ input.focus(); }, 20);
  }
  function hide(){
    dlg.hidden = true; open = false;
    document.body.style.overflow = '';
  }
  ['mnSearchBtn', 'mnSearchBtn2'].forEach(function(id){
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', show);
  });
  var close = document.getElementById('srchClose');
  if (close) close.addEventListener('click', hide);
  var scrim = document.getElementById('srchScrim');
  if (scrim) scrim.addEventListener('click', hide);
  input.addEventListener('input', render);
  /* SearchAction entry point: /?q=... opens the dialog pre-filled */
  try {
    var qp = new URLSearchParams(location.search).get('q');
    if (qp) setTimeout(function(){ show(); input.value = qp; render(); }, 80);
  } catch(e) {}
  document.addEventListener('keydown', function(e){
    var ae = document.activeElement;
    if (!open && e.key === '/' && !(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))){
      e.preventDefault(); show(); return;
    }
    if (!open && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){
      e.preventDefault(); show(); return;
    }
    if (!open) return;
    if (e.key === 'Escape'){ e.preventDefault(); hide(); }
    if (e.key === 'ArrowDown'){ e.preventDefault(); move(1); }
    if (e.key === 'ArrowUp'){ e.preventDefault(); move(-1); }
    if (e.key === 'Enter' && sel > -1 && hits[sel]){ e.preventDefault(); location.href = hits[sel].u; }
  });
})();


/* ---------- compare tray: collect up to three from anywhere ---------- */
(function(){
  var KEY = 'shfyi.tray';
  function load(){ try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch(e){ return []; } }
  function save(t){ try { sessionStorage.setItem(KEY, JSON.stringify(t)); } catch(e){} }
  var btns = [].slice.call(document.querySelectorAll('.addcmp'));
  var pill = document.createElement('div');
  pill.id = 'trayPill';
  pill.setAttribute('role', 'status');
  pill.hidden = true;
  pill.innerHTML = '<a id="trayGo" href="/compare">Compare</a><button type="button" id="trayClear" aria-label="Clear the compare tray">×</button>';
  document.body.appendChild(pill);
  var go = pill.querySelector('#trayGo');

  function sync(){
    var t = load();
    btns.forEach(function(b){
      b.setAttribute('aria-pressed', String(t.indexOf(b.getAttribute('data-slug')) > -1));
    });
    if (!t.length){ pill.hidden = true; return; }
    pill.hidden = false;
    if (t.length === 1){
      go.textContent = '1 in tray — pick one more to compare';
      go.setAttribute('href', '/compare#' + t[0]);
    } else {
      go.textContent = 'Compare ' + t.length + ' ships →';
      go.setAttribute('href', '/compare#' + t.join(','));
    }
  }
  btns.forEach(function(b){
    b.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      var slug = b.getAttribute('data-slug');
      var t = load();
      var i = t.indexOf(slug);
      if (i > -1) t.splice(i, 1);
      else { if (t.length >= 3) t.shift(); t.push(slug); }
      save(t); sync();
    });
  });
  pill.querySelector('#trayClear').addEventListener('click', function(){ save([]); sync(); });
  sync();
})();


/* ---------- card grid columns — scoped: each bar controls only its own section ---------- */
(function(){
  var bars = [].slice.call(document.querySelectorAll('.colsbar'));
  var grids = [].slice.call(document.querySelectorAll('.cardgrid'));
  if (!grids.length) return;
  function get(k, d){ try { return localStorage.getItem(k) || d; } catch(e){ return d; } }
  function set(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
  function scopeOf(el){ return (el && el.getAttribute('data-scope')) || 'ships'; }
  function prefs(scope){
    /* ships scope migrates any pre-scope stored choice */
    var dc = get('shfyi.cols.' + scope, scope === 'ships' ? get('shfyi.cols', '2') : '2');
    var mc = get('shfyi.colsm.' + scope, scope === 'ships' ? get('shfyi.colsm', 'm2') : 'm2');
    return { dc: dc, mc: mc };
  }
  function apply(scope){
    var p = prefs(scope);
    grids.forEach(function(g){
      if (scopeOf(g) !== scope) return;
      g.classList.toggle('cols-3', p.dc === '3');
      g.classList.toggle('cols-4', p.dc === '4');
      g.classList.toggle('mcols-1', p.mc === 'm1');
    });
    bars.forEach(function(bar){
      if (scopeOf(bar) !== scope) return;
      [].forEach.call(bar.querySelectorAll('.fchip'), function(c){
        var v = c.getAttribute('data-cols');
        c.setAttribute('aria-pressed', String(v === p.dc || v === p.mc));
      });
    });
  }
  bars.forEach(function(bar){
    bar.addEventListener('click', function(e){
      var c = e.target.closest ? e.target.closest('.fchip') : null;
      if (!c) return;
      var v = c.getAttribute('data-cols');
      if (!v) return;
      var scope = scopeOf(bar);
      set(v.charAt(0) === 'm' ? 'shfyi.colsm.' + scope : 'shfyi.cols.' + scope, v);
      apply(scope);
    });
  });
  apply('ships'); apply('lines');
})();

/* ---------- language pill ---------- */
(function(){
  var pill = document.getElementById('langPill');
  if (!pill) return;
  var LANGS = [['en','English'],['zh','简体中文'],['ru','Русский'],['es','Español'],['fr','Français'],
               ['de','Deutsch'],['pt','Português'],['ar','العربية'],['hi','हिन्दी'],['ja','日本語']];
  var btn = pill.querySelector('.lang-btn');
  var menu = pill.querySelector('.lang-menu');
  var cur = pill.querySelector('.lang-cur');
  var m = location.pathname.match(/^\/(zh|ru|es|fr|de|pt|ar|hi|ja)(\/|$)/);
  var here = m ? m[1] : 'en';
  cur.textContent = here.toUpperCase();
  var rest = location.pathname.replace(/^\/(zh|ru|es|fr|de|pt|ar|hi|ja)(?=\/|$)/, '') || '/';
  menu.innerHTML = LANGS.map(function(l){
    var href = (l[0] === 'en' ? rest : '/' + l[0] + rest) + location.hash;
    return '<li role="option" aria-selected="' + (l[0] === here) + '">' +
      '<a href="' + href + '" data-lang="' + l[0] + '"' + (l[0] === here ? ' class="on"' : '') + '>' + l[1] + '</a></li>';
  }).join('');
  function close(){ menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  btn.addEventListener('click', function(e){
    e.stopPropagation();
    var open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function(e){ if (!pill.contains(e.target)) close(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  menu.addEventListener('click', function(e){
    var a = e.target.closest ? e.target.closest('a[data-lang]') : null;
    if (a) { try { localStorage.setItem('shfyi.lang', a.getAttribute('data-lang')); } catch(err){} }
  });
})();

/* ---------- silhouette legend: hex toggle + click-to-copy ---------- */
(function(){
  var leg = document.getElementById('hueLegend');
  if (!leg) return;
  var btn = document.getElementById('hueHexToggle');
  if (btn) btn.addEventListener('click', function(){
    var on = leg.classList.toggle('show-hex');
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? 'Hide hex codes' : 'Show hex codes';
  });
  leg.addEventListener('click', function(e){
    var chip = e.target.closest ? e.target.closest('.hl') : null;
    if (!chip) return;
    var hex = chip.getAttribute('data-hex');
    if (!hex) return;
    function flash(){
      chip.classList.add('copied');
      setTimeout(function(){ chip.classList.remove('copied'); }, 700);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(hex).then(flash, flash);
    } else { flash(); }
  });
})();

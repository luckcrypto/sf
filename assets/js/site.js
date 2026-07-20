/* ---------- shared search scoring ----------
   One implementation used by BOTH the full search dialog and the hero search.
   Ranking: exact title > title prefix > title contains > keyword blob contains
   > all-words match, each lifted by the item's popularity weight. */
window.shipsScore = (function () {
  /* Query-intent filler. Real search traffic is phrased as questions —
     "who owns costa cruises", "costa fleet of ships", "how many ships does X have".
     Stripped only as a FALLBACK, so exact phrasing always wins first. */
  var STOP = /^(?:who|owns|own|what|which|how|many|much|does|do|did|is|are|was|the|a|an|of|for|list|all|fleet|ship|ships|line|lines|cruise|cruises|have|has|there|by|size)$/;

  /* "P&O Cruises" must be findable as "p and o". Punctuation is flattened so the
     ampersand, hyphens and apostrophes never decide whether a query matches. */
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function cache(item) {
    if (item._n === undefined) { item._n = norm(item.t); item._q = norm(item.q); item._w = norm(item.qw || ''); }
    return item;
  }
  function raw(item, q) {
    var t = item._n, w = item.w || 0;
    if (!q) return 0;
    if (t === q) return 100 + w;
    if (t.indexOf(q) === 0) return 80 + w;
    /* Query starts with the whole title. Guarded by coverage: "msc" must not win
       "msc irina size comparison" just because MSC is a popular short title. */
    if (t.length >= 3 && q.indexOf(t) === 0 && t.length / q.length >= 0.34) return 70 + w;
    if (t.indexOf(q) > -1) return 60 + w;
    if (item._q.indexOf(q) > -1) return 40 + w;
    var words = q.split(' ').filter(Boolean);
    /* All words in the TITLE. Deliberately not the keyword blob: a line's blob
       lists its whole fleet, so "royal caribbean" would match Princess through
       Royal Princess plus Caribbean Princess. Two words on two ships is not a hit. */
    if (words.length > 1 && words.every(function (x) { return t.indexOf(x) > -1; })) return 30;
    if (words.length > 1 && words.every(function (x) { return item._q.indexOf(x) > -1; })) return 14;
    /* Ownership and other related terms. Celebrity is owned by Royal Caribbean
       Group, but "royal caribbean" wants Royal Caribbean, not its stablemates. */
    if (item._w && item._w.indexOf(q) > -1) return 10;
    return 0;
  }
  /* Phrases that mean "show me the roster", not "show me one ship". */
  var FLEET_INTENT = /(^|\s)(fleet|ships|line|lines|cruises|roster|owns|own)(\s|$)/;
  return function (item, q) {
    cache(item);
    var qn = norm(q);
    var s = raw(item, qn);
    if (s > 0) return s;
    var stripped = qn.split(' ').filter(function (x) { return !STOP.test(x); }).join(' ');
    if (!stripped || stripped === qn) return 0;
    var f = raw(item, stripped);
    if (!f) return 0;
    /* Penalty, not a cap — a flat ceiling flattened the popularity weight and let
       individual ships tie with their own operator. */
    f = Math.max(1, f - 10);
    /* "costa fleet of ships", "who owns costa cruises" are roster questions.
       The line page answers those; a single ship does not. */
    if (item.k === 'Line' && FLEET_INTENT.test(qn)) f += 20;
    return f;
  };
})();

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

  /* second tier: cruise-line submenus. Single-open, but scoped to siblings inside
     the same parent accordion so opening a line never closes the section above it. */
  [].slice.call(mn.querySelectorAll('.mn-acc2')).forEach(function (b) {
    var top = b.querySelector('.mn-acc2-top'); if (!top) return;
    top.addEventListener('click', function () {
      var was = b.classList.contains('is-open');
      var sibs = [].slice.call(b.parentNode.querySelectorAll(':scope > .mn-acc2'));
      sibs.forEach(function (o) {
        o.classList.remove('is-open');
        var t = o.querySelector('.mn-acc2-top'); if (t) t.setAttribute('aria-expanded', 'false');
      });
      if (!was) { b.classList.add('is-open'); top.setAttribute('aria-expanded', 'true'); }
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

  function render(){
    var q = input.value.trim().toLowerCase();
    if (!q){
      list.innerHTML = '';
      hits = [];
      return;
    }
    hits = IDX.map(function(i){ return { i: i, s: window.shipsScore(i, q) }; })
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

/* ---------- hero: dynamic random CTA ---------- */
(function () {
  var el = document.getElementById('heroRand');
  if (!el) return;
  /* The HTML ships with "See the longest ever" → /records/longest-ships as the
     crawlable default. JS re-rolls it per page load. Labels are kept short enough
     to sit on one line on a 360px screen. */
  var POOL = [
    ['See the longest ever',   '/records/longest-ships'],
    ['Browse the fleet',       '/#fleet'],
    ['Compare any two ships',  '/compare'],
    ['Biggest cruise ships',   '/records/biggest-cruise-ships'],
    ['Most passengers ever',   '/records/most-passengers'],
    ['Biggest by tonnage',     '/records/biggest-by-tonnage'],
    ['Will it fit? Canal-Fit', '/canal-fit'],
    ['Ships in a storm',       '/ships-in-storm'],
    ['All five record boards', '/records'],
    ['Explained — 12 concepts','/explained']
  ];
  var pick = POOL[Math.floor(Math.random() * POOL.length)];
  var lbl = el.querySelector('.hr-lbl');
  if (lbl) lbl.textContent = pick[0];
  el.setAttribute('href', pick[1]);
})();

/* ---------- hero search — one element that changes shape ----------
   Reuses window.SEARCH_INDEX and the same scoring as the full dialog.
   Expands on INPUT, not on click: typing is what grows the element. */
(function () {
  var wrap = document.getElementById('heroSearch');
  if (!wrap) return;
  var input = document.getElementById('hsInput');
  var list  = document.getElementById('hsRes');
  var ph    = document.getElementById('hsPh');
  var phT   = ph && ph.querySelector('.hs-ph-t');
  if (!input || !list) return;

  var IDX = window.SEARCH_INDEX || [];
  var sel = -1, hits = [];
  var esc = function (s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

  /* ---- typed placeholder: real queries that all resolve in the index ---- */
  var Q = ['Icon of the Seas', 'RMS Titanic', 'MSC Irina', 'Seawise Giant', 'Queen Mary 2',
           'Ever Given', 'Disney Adventure', 'Celebrity Edge', 'Wonder of the Seas', 'Iona'];
  var qi = 0, ci = 0, del = false, timer = null, paused = false;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function type() {
    if (paused || !phT) return;
    var w = Q[qi % Q.length];
    ci += del ? -1 : 1;
    phT.textContent = w.slice(0, ci);
    var wait = del ? 32 : 74;
    if (!del && ci === w.length) { del = true; wait = 1700; }
    else if (del && ci === 0) { del = false; qi++; wait = 240; }
    timer = setTimeout(type, wait);
  }
  function startType() {
    if (reduce || !phT) { if (phT) phT.textContent = Q[0]; return; }
    paused = false;
    if (timer) clearTimeout(timer);
    timer = setTimeout(type, 700);
  }
  function stopType() { paused = true; if (timer) clearTimeout(timer); }
  function showPh(v) { if (ph) ph.style.display = v ? '' : 'none'; }

  /* ---- scoring: identical rules to the full search dialog ---- */
  function render() {
    var q = input.value.trim().toLowerCase();
    if (!q) { collapse(); return; }
    hits = IDX.map(function (i) { return { i: i, s: window.shipsScore(i, q) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s || a.i.t.length - b.i.t.length; })
      .slice(0, 8).map(function (x) { return x.i; });
    sel = hits.length ? 0 : -1;
    list.innerHTML = hits.length
      ? hits.map(function (h, n) {
          return '<li role="option" aria-selected="' + (n === 0) + '" class="' + (n === 0 ? 'on' : '') + '">' +
            '<a href="' + h.u + '"><span class="sr-k">' + esc(h.k) + '</span>' +
            '<span class="sr-t">' + esc(h.t) + '</span>' +
            '<span class="sr-d">' + esc(h.d || '') + '</span></a></li>'; }).join('')
      : '<li class="hs-none">Nothing matches \u201C' + esc(input.value) + '\u201D.</li>';
    wrap.classList.add('on');
    input.setAttribute('aria-expanded', 'true');
  }
  function collapse() {
    wrap.classList.remove('on');
    input.setAttribute('aria-expanded', 'false');
    list.innerHTML = ''; hits = []; sel = -1;
  }
  function move(d) {
    if (!hits.length) return;
    sel = (sel + d + hits.length) % hits.length;
    [].forEach.call(list.children, function (li, n) {
      li.classList.toggle('on', n === sel);
      li.setAttribute('aria-selected', String(n === sel));
    });
    var el = list.children[sel];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('focus', function () { stopType(); showPh(false); });
  input.addEventListener('blur', function () {
    if (!input.value) { showPh(true); startType(); }
  });
  input.addEventListener('input', function () {
    showPh(!input.value);
    render();
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      var a = list.children[sel] && list.children[sel].querySelector('a');
      if (a) { e.preventDefault(); window.location.href = a.getAttribute('href'); }
    } else if (e.key === 'Escape') {
      e.preventDefault(); input.value = ''; collapse(); showPh(true); startType();
    }
  });
  document.addEventListener('click', function (e) {
    if (wrap.classList.contains('on') && !wrap.contains(e.target)) collapse();
  });

  startType();
})();

/* ---------- fleet grid: sort switch ----------
   Reorders the EXISTING card nodes with appendChild — never regenerates markup.
   Every <a> in the grid stays the same crawlable node it was server-rendered as,
   so sorting costs nothing in SEO and needs no second copy of the data. */
(function () {
  var bars = [].slice.call(document.querySelectorAll('[data-sort-for]'));
  if (!bars.length) return;

  var collator = window.Intl && Intl.Collator
    ? new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
    : { compare: function (a, b) { return a < b ? -1 : a > b ? 1 : 0; } };

  bars.forEach(function (bar) {
    var group = document.getElementById(bar.getAttribute('data-sort-for'));
    var grid = group && group.querySelector('.cardgrid');
    if (!grid) return;

    var num = function (el, attr) { return parseFloat(el.getAttribute(attr)) || 0; };
    var str = function (el, attr) { return el.getAttribute(attr) || ''; };

    var SORTS = {
      default: function (a, b) { return num(a, 'data-i') - num(b, 'data-i'); },
      /* within a line, keep the biggest ship first so a fleet reads sensibly */
      line: function (a, b) {
        return collator.compare(str(a, 'data-line'), str(b, 'data-line'))
            || num(b, 'data-size') - num(a, 'data-size');
      },
      name: function (a, b) { return collator.compare(str(a, 'data-name'), str(b, 'data-name')); },
      size: function (a, b) { return num(b, 'data-size') - num(a, 'data-size'); },
      loa:  function (a, b) { return num(b, 'data-loa') - num(a, 'data-loa'); }
    };

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.fchip') : null;
      if (!btn || !bar.contains(btn)) return;
      var key = btn.getAttribute('data-sort');
      if (!SORTS[key]) return;

      [].forEach.call(bar.querySelectorAll('.fchip'), function (c) {
        c.setAttribute('aria-pressed', String(c === btn));
      });

      var cards = [].slice.call(grid.children).filter(function (n) {
        return n.classList && n.classList.contains('acard');
      });
      cards.sort(SORTS[key]);
      var frag = document.createDocumentFragment();
      cards.forEach(function (c) { frag.appendChild(c); });
      grid.appendChild(frag);
    });
  });
})();

/* ---------- ship photography, fetched at load ----------
   The site does this itself: no build step, no local tooling, nothing to run.
   Wikipedia's lead image is the editor-chosen photograph of that exact ship, so
   it is the only candidate we trust. Licence and author come from Commons and
   are rendered as a credit — CC BY and BY-SA require it.

   If anything at all is missing or unfree, the slot stays empty and collapses.
   No image means no card, by design. */
(function () {
  var slots = [].slice.call(document.querySelectorAll('.photoSlot'));
  if (!slots.length || typeof fetch !== 'function') return;

  var FREE = /^(cc[ -]?0|cc[ -]?by([ -]sa)?\b|public domain|pd[ -]|no restrictions)/i;
  var NONFREE = /(non[- ]?commercial|\bnc\b|no[- ]?deriv|\bnd\b|fair use|all rights)/i;
  /* same subject filter the offline tool uses — never an interior, model or wreck */
  var BAD = /(interior|cabin|lounge|restaurant|lego|model|plaque|menu|logo|deck[ _-]?plan|diagram|bridge|engine|propeller|lifeboat|pool|scrap|wreck|sinking|aground|under[ _-]?construction|dry[ _-]?dock|christening|night)/i;

  var strip = function (s) { return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); };

  function api(base, params) {
    var q = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    return fetch(base + '?' + q + '&format=json&origin=*', { mode: 'cors' })
      .then(function (r) { return r.ok ? r.json() : null; });
  }

  function render(slot, d) {
    var fig = document.createElement('figure');
    fig.className = 'shipPhoto';
    var img = document.createElement('img');
    img.src = d.src; img.alt = slot.getAttribute('data-name') || '';
    img.loading = 'lazy'; img.decoding = 'async';
    img.width = 1200; img.height = 800;
    /* only reveal once it has actually decoded, so a dead URL leaves no empty box */
    img.onerror = function () { fig.remove(); };
    var cap = document.createElement('figcaption');
    cap.className = 'photoCredit';
    cap.innerHTML = 'Photo: ' + d.author +
      ' · <a href="' + d.licenseUrl + '" rel="license nofollow noopener" target="_blank">' + d.license + '</a>' +
      ' · via <a href="' + d.source + '" rel="nofollow noopener" target="_blank">Wikimedia Commons</a>';
    fig.appendChild(img); fig.appendChild(cap);
    slot.appendChild(fig);
  }

  slots.forEach(function (slot) {
    var title = slot.getAttribute('data-wiki');
    if (!title) return;
    api('https://en.wikipedia.org/w/api.php', {
      action: 'query', titles: title, prop: 'pageimages',
      piprop: 'original', pilicense: 'free', redirects: '1', formatversion: '2'
    }).then(function (j) {
      var pages = j && j.query && j.query.pages;
      var orig = pages && pages[0] && pages[0].original;
      if (!orig || !orig.source) return null;
      var file = 'File:' + decodeURIComponent(orig.source.split('/').pop()).replace(/_/g, ' ');
      if (BAD.test(file)) return null;
      return api('https://commons.wikimedia.org/w/api.php', {
        action: 'query', titles: file, prop: 'imageinfo',
        iiprop: 'url|extmetadata', iiurlwidth: '1200',
        iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl', formatversion: '2'
      });
    }).then(function (j) {
      if (!j) return;
      var pages = j.query && j.query.pages;
      var ii = pages && pages[0] && pages[0].imageinfo && pages[0].imageinfo[0];
      if (!ii) return;
      var em = ii.extmetadata || {};
      var lic = strip(em.LicenseShortName && em.LicenseShortName.value);
      var author = strip(em.Artist && em.Artist.value);
      /* every one of these is required before anything is shown */
      if (!lic || NONFREE.test(lic) || !FREE.test(lic)) return;
      if (!author || author.length > 140) return;
      var licUrl = (em.LicenseUrl && em.LicenseUrl.value) || '';
      if (!licUrl) return;
      render(slot, {
        src: ii.thumburl || ii.url, author: author, license: lic,
        licenseUrl: licUrl, source: ii.descriptionurl || ''
      });
    }).catch(function () { /* offline, blocked, or rate limited — leave the slot empty */ });
  });
})();

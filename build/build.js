#!/usr/bin/env node
/* ships.fyi build engine — zero dependencies.
   Cloned from the aircraft.fyi v53 machinery per the family blueprint.
   Family nav + footer (MEGA-NAV v5 / MEGA-FOOTER) generated ONCE here,
   batch-injected into every page. data/ships.json is the single source
   of truth: ships ↔ lines cross-linked both ways. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;                       // build/ — data + templates live here
const SITE = path.join(ROOT, '..');
const STAMP = new Date().toISOString().slice(0, 10);

/* LAUNCH CONFIG: English-only. The full i18n engine below stays dormant until a market
   proves demand AND its prose has been human-reviewed. Do not enable casually. */
const LOCALES = [];
const I18N = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'i18n.json'), 'utf8'));
const I18N_LANGS = Object.keys(I18N.langs).filter(l => l !== 'en' && LOCALES.includes(l));
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ships.json'), 'utf8'));
const SILMETA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'silhouettes-meta.json'), 'utf8'));
const LAYOUT = fs.readFileSync(path.join(ROOT, 'templates', 'layout.html'), 'utf8');

/* Targeted clean: remove only what this build generates. NEVER recursive-delete SITE. */
const GEN_DIRS = ['ships', 'lines', 'compare', 'records', 'blog', 'explained', 'shipyards', 'categories', 'cruise', '.well-known',
  'zh', 'ru', 'es', 'fr', 'de', 'pt', 'ar', 'hi', 'ja'];
for (const d of GEN_DIRS) fs.rmSync(path.join(SITE, d), { recursive: true, force: true });
for (const f of fs.readdirSync(SITE)) {
  if (f.endsWith('.html') || /^sitemap.*\.xml$/.test(f) || ['feed.xml', 'robots.txt', 'humans.txt', 'CNAME', '.nojekyll'].includes(f)) {
    fs.rmSync(path.join(SITE, f), { force: true });
  }
}

const esc = s => (s === undefined || s === null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- two-tier sources block (primary backbone + optional further reading) ----------
   Keeps the site's factual credibility on primary sources, while offering encyclopedic
   further reading (Wikipedia — a strong topical signal Google trusts) where genuinely on-topic. */
const wikiURL = title => 'https://en.wikipedia.org/wiki/' + encodeURIComponent(String(title).replace(/ /g, '_'));
function sourceLi(s) {
  return `<li style="margin-bottom:8px"><a href="${esc(s.url)}" rel="noopener" target="_blank" style="color:var(--muted);font-size:.88rem">${esc(s.name)} &nearr;</a></li>`;
}
/* primary: array of {name,url}; further: array of {name,url}. Renders sub-heads only when needed. */
function sourcesBlock(primary, further, opts) {
  opts = opts || {};
  const eyebrow = opts.eyebrow !== false;
  let h = '';
  if (eyebrow) h += '<span class="eyebrow" style="display:block">Sources</span>';
  else h += '<h3 style="margin-top:32px;font-size:1.1rem">Sources</h3>';
  if (further && further.length) {
    h += '<h3 style="font-family:var(--display);font-size:.95rem;font-weight:700;margin:14px 0 6px">Primary</h3>';
    h += `<ul style="list-style:none;margin:0 auto;padding:0;max-width:64ch;text-align:left">${primary.map(sourceLi).join('')}</ul>`;
    h += '<h3 style="font-family:var(--display);font-size:.95rem;font-weight:700;margin:16px 0 6px">Further reading</h3>';
    h += `<ul style="list-style:none;margin:0 auto;padding:0;max-width:64ch;text-align:left">${further.map(sourceLi).join('')}</ul>`;
  } else {
    h += `<ul style="list-style:none;margin:10px auto 0;padding:0;max-width:64ch;text-align:left">${primary.map(sourceLi).join('')}</ul>`;
  }
  return h;
}
const S = DATA.ships, LN = DATA.lines, HUBS = DATA.hubs;
const YD = DATA.yards, TY = DATA.types;
const EX = DATA.explained;
/* operator Wikipedia titles (further-reading tier for line pages) */
const LINE_WIKI = {
  'royal-caribbean': 'Royal Caribbean International', 'msc-cruises': 'MSC Cruises',
  'carnival': 'Carnival Cruise Line', 'norwegian': 'Norwegian Cruise Line',
  'disney-cruise-line': 'Disney Cruise Line', 'aida': 'AIDA Cruises', 'costa': 'Costa Cruises',
  'cunard': 'Cunard Line', 'princess-cruises': 'Princess Cruises', 'p-and-o': 'P&O Cruises',
  'celebrity': 'Celebrity Cruises', 'holland-america': 'Holland America Line',
  'evergreen': 'Evergreen Marine', 'maersk': 'Maersk', 'cosco': 'COSCO Shipping',
  'cma-cgm': 'CMA CGM', 'hapag-lloyd': 'Hapag-Lloyd', 'msc': 'Mediterranean Shipping Company',
  'hmm': 'HMM (company)', 'one': 'Ocean Network Express'
};
/* curated sources for the Explained concept pages: primary authority + further reading */
const EX_SOURCES = {
  'panamax': {
    primary: [{ name: 'Panama Canal Authority — vessel requirements', url: 'https://pancanal.com/en/' },
              { name: 'Suez Canal Authority', url: 'https://www.suezcanal.gov.eg/English/Pages/default.aspx' }],
    further: [{ name: 'Panamax — Wikipedia', url: 'https://en.wikipedia.org/wiki/Panamax' }]
  },
  'gross-tonnage': {
    primary: [{ name: 'International Convention on Tonnage Measurement of Ships, 1969 — IMO', url: 'https://www.imo.org/en/About/Conventions/Pages/International-Convention-on-Tonnage-Measurement-of-Ships.aspx' }],
    further: [{ name: 'Gross tonnage — Wikipedia', url: 'https://en.wikipedia.org/wiki/Gross_tonnage' }]
  },
  'teu': {
    primary: [{ name: 'ISO 668 shipping container standard — ISO', url: 'https://www.iso.org/standard/76912.html' }],
    further: [{ name: 'Twenty-foot equivalent unit — Wikipedia', url: 'https://en.wikipedia.org/wiki/Twenty-foot_equivalent_unit' }]
  },
  'loa-beam-draft': {
    primary: [{ name: 'Ship measurements & principal dimensions — Marine Insight', url: 'https://www.marineinsight.com/naval-architecture/ship-dimensions/' }],
    further: [{ name: 'Length overall — Wikipedia', url: 'https://en.wikipedia.org/wiki/Length_overall' }]
  },
  'bulbous-bow': {
    primary: [{ name: 'The bulbous bow explained — Marine Insight', url: 'https://www.marineinsight.com/naval-architecture/bulbous-bow-ships/' }],
    further: [{ name: 'Bulbous bow — Wikipedia', url: 'https://en.wikipedia.org/wiki/Bulbous_bow' }]
  },
  'plimsoll-line': {
    primary: [{ name: 'International Convention on Load Lines, 1966 — IMO', url: 'https://www.imo.org/en/About/Conventions/Pages/International-Convention-on-Load-Lines.aspx' }],
    further: [{ name: 'Waterline (Plimsoll line) — Wikipedia', url: 'https://en.wikipedia.org/wiki/Waterline' }]
  },
  'deadweight-tonnage': {
    primary: [{ name: 'International Convention for the Safety of Life at Sea (SOLAS) — IMO', url: 'https://www.imo.org/en/About/Conventions/Pages/International-Convention-for-the-Safety-of-Life-at-Sea-(SOLAS),-1974.aspx' }],
    further: [{ name: 'Deadweight tonnage — Wikipedia', url: 'https://en.wikipedia.org/wiki/Deadweight_tonnage' }]
  },
  'displacement': {
    primary: [{ name: 'Displacement & tonnage measurement — Marine Insight', url: 'https://www.marineinsight.com/naval-architecture/ship-tonnage-measurement/' }],
    further: [{ name: 'Displacement (ship) — Wikipedia', url: 'https://en.wikipedia.org/wiki/Displacement_(ship)' }]
  },
  'air-draft': {
    primary: [{ name: 'Panama Canal Authority — vessel requirements', url: 'https://pancanal.com/en/' },
              { name: 'Suez Canal Authority', url: 'https://www.suezcanal.gov.eg/English/Pages/default.aspx' }],
    further: [{ name: 'Air draft — Wikipedia', url: 'https://en.wikipedia.org/wiki/Air_draft' }]
  },
  'azipod-propulsion': {
    primary: [{ name: 'Azipod electric propulsion — ABB Marine', url: 'https://new.abb.com/marine/systems-and-solutions/electric-solutions/azipod-propulsion' }],
    further: [{ name: 'Azimuth thruster — Wikipedia', url: 'https://en.wikipedia.org/wiki/Azimuth_thruster' }]
  },
  'block-coefficient': {
    primary: [{ name: 'Hull form coefficients — Marine Insight', url: 'https://www.marineinsight.com/naval-architecture/hull-form-coefficients/' }],
    further: [{ name: 'Block coefficient — Wikipedia', url: 'https://en.wikipedia.org/wiki/Block_coefficient' }]
  },
  'container-ship-classes': {
    primary: [{ name: 'Panama Canal Authority — vessel requirements', url: 'https://pancanal.com/en/' }],
    further: [{ name: 'Container ship — Wikipedia', url: 'https://en.wikipedia.org/wiki/Container_ship' }]
  }
};
const POSTS = DATA.posts || [];
/* silhouette crops come from the generator's meta file — one source of truth */
for (const a of S) { a.vb = SILMETA[a.slug] ? { top: SILMETA[a.slug].top, h: SILMETA[a.slug].h } : { top: 0, h: 160 }; }

/* VERDICTS — the whole written library. COMPARES — only the pairs that earn a page. */
const pk = (x, y) => [x, y].sort().join('|');
const VERDICTS = new Map(DATA.compareMarquee.map(([x, y, v]) => [pk(x, y), v]));
const COMPARES = DATA.compareStatic
  .map(([x, y]) => [S.find(z => z.slug === x), S.find(z => z.slug === y), VERDICTS.get(pk(x, y))])
  .filter(p => p[0] && p[1] && p[2]);

/* ---------- affiliate plumbing: honest, clearly disclosed, one switch ---------- */
const AFFIL = {
  amazonTag: 'luck11106-21',   // Normal Amazon tag on the links. OneLink (dashboard) auto-routes each visitor to their local store with the right regional tag — do NOT hardcode the US -20 tag here.
  disclosure: 'As an Amazon Associate, ships.fyi earns from qualifying purchases. Some links in our guides are affiliate links — if you buy through them we may earn a small commission at no extra cost to you. It never changes what we recommend.'
};
const amz = q => 'https://www.amazon.co.uk/s?k=' + encodeURIComponent(q) + (AFFIL.amazonTag ? '&tag=' + AFFIL.amazonTag : '');
/* Booking partners with real affiliate programs. Swap each url for your tracked link
   (CJ/Impact/FlexOffers deep link) once approved — one edit here flows site-wide. */
/* ONLY programmes we are actually enrolled in. An untracked outbound link earns
   nothing, sends the reader away from the most engaged page on the site, and makes
   the disclosure below untrue by promising a commission that does not exist.
   Add a partner here only once the tracked deep link is in hand. */
AFFIL.partners = [
  { k: 'essentials', label: 'Cruise essentials kit', sub: 'The gear regulars actually pack', url: null /* filled with amz() below */ }
];
AFFIL.partners[0].url = amz('cruise essentials');
const planPanel = shipName => `<div class="planpanel">
<p class="pp-h">Plan ${shipName ? 'a sailing on ' + esc(shipName) : 'your cruise'}</p>
<div class="pp-row">
${AFFIL.partners.map(p => `<a class="pp-card" href="${p.url}" target="_blank" rel="sponsored nofollow noopener"><b>${esc(p.label)}</b><span>${esc(p.sub)}</span></a>`).join('\n')}
</div>
${disclosureBox()}
</div>`;
const disclosureBox = () => `<p class="disclosure">${esc(AFFIL.disclosure)}</p>`;

const shortName = a => a.name
  .replace(/^(RMS|SS|CMA CGM) /, '')
  .replace(/ of the Seas$/, '');

const RECORD_BOARDS = [
  { urlPath: '/records/longest-ships', h1: 'The 40 longest ships ever built', lead: 'Ranked by length overall — from the 488 m Prelude down to Berge Stahl, with the honest asterisk explained.' },
  { file: 'records/biggest-by-tonnage.html', urlPath: '/records/biggest-by-tonnage',
    title: 'The biggest ships by gross tonnage — ranked',
    description: 'Every ship on ships.fyi with a modern GT figure, ranked by gross tonnage — from Pioneering Spirit and the Icon-class giants down. Sourced, dated, honest.',
    h1: 'The biggest ships by gross tonnage', lead: 'Ranked by gross tonnage — internal volume, the honest measure for passenger ships and the record Pioneering Spirit owns outright.',
    note: 'Gross tonnage is a volume index, not a weight — see the explainer. Ships measured under the pre-1982 GRT rules (Titanic, the 1970s tankers) are excluded rather than mixed in dishonestly.',
    key: 'gt', jsonldName: 'Biggest ships by gross tonnage',
    fmt: a => a.core.gt.toLocaleString('en-US') + ' GT',
    sub: a => `${opName(a)} · ${a.core.delivered}` },
  { file: 'records/biggest-container-ships.html', urlPath: '/records/biggest-container-ships',
    title: 'The biggest container ships — ranked by TEU',
    description: 'Every container ship on ships.fyi ranked by nominal TEU capacity, from the 24,346 TEU MSC Irina all the way down to the 58 boxes of Ideal X in 1956.',
    h1: 'The biggest container ships', lead: 'Ranked by nominal capacity in twenty-foot equivalent units — a board that runs from 24,346 down to the 58 boxes that started everything.',
    note: 'TEU ratings are nominal — the count of standard slots, not laden records. The bottom entry is left in deliberately: Ideal X carried 58 containers in 1956, and the whole modern number is compound interest on that voyage.',
    key: 'teu', jsonldName: 'Biggest container ships by TEU',
    fmt: a => a.core.teu.toLocaleString('en-US') + ' TEU',
    sub: a => `${opName(a)} · ${a.core.delivered}` },
  { file: 'records/biggest-tankers.html', urlPath: '/records/biggest-tankers',
    title: 'The biggest tankers & bulk giants — by deadweight',
    description: 'Every tanker and bulk carrier on ships.fyi ranked by deadweight tonnage, from the 564,763 t Seawise Giant down. The half-million-tonne club, sourced and dated.',
    h1: 'The biggest tankers & bulk giants', lead: 'Ranked by deadweight — the tonnes a ship can lift. The top of this board is the half-million-tonne club, and most of it died young.',
    note: 'Deadweight is carrying capacity: cargo, fuel and stores combined. All five ships ever to exceed 500,000 t are on this board, alongside the ore giants and the last ULCCs still trading.',
    key: 'dwt', jsonldName: 'Biggest tankers by deadweight',
    fmt: a => a.core.dwt.toLocaleString('en-US') + ' t',
    sub: a => `${opName(a)} · ${a.core.delivered}` },
  { file: 'records/most-passengers.html', urlPath: '/records/most-passengers',
    title: 'The highest-capacity passenger ships — ranked',
    description: 'Every passenger ship on ships.fyi ranked by passengers at double occupancy, from the Icon and Oasis classes down to the liners. Sourced figures, dated.',
    h1: 'The highest-capacity passenger ships', lead: 'Ranked by passengers at double occupancy — where the mega-resorts stack up, and where the true liners deliberately do not.',
    note: 'Figures are double-occupancy capacity, the industry\u2019s standard basis; maximum berths run higher and are given on each ship\u2019s page. Titanic\u2019s figure is her passenger capacity of 1912.',
    key: 'passengers', jsonldName: 'Highest-capacity passenger ships',
    fmt: a => a.core.passengers.toLocaleString('en-US'),
    sub: a => `${opName(a)} · ${a.core.delivered}` }
];
RECORD_BOARDS.splice(1, 0, {
  file: 'records/biggest-cruise-ships.html', urlPath: '/records/biggest-cruise-ships',
  title: 'The biggest cruise ships in the world — ranked',
  description: 'The biggest cruise ships in the world, ranked by gross tonnage — Legend, Icon and Star of the Seas at the top, every figure sourced from the operator and dated.',
  h1: 'The biggest cruise ships in the world', lead: 'Ranked by gross tonnage — the ships you can actually book, led by Royal Caribbean\u2019s Icon class. The full answer to the most-asked question at sea.',
  note: 'Cruise ships and ocean liners only, ranked by gross tonnage — internal volume, the honest measure for passenger ships. For every giant including tankers and the working monsters, see the all-ships tonnage board. Titanic measured 46,328 GRT under pre-1982 rules \u2014 a different unit we refuse to mix in; her page carries the honest comparison.',
  key: 'gt', only: a => a.category === 'Cruise' || a.category === 'Liner', jsonldName: 'Biggest cruise ships in the world',
  fmt: a => a.core.gt.toLocaleString('en-US') + ' GT',
  sub: a => `${opName(a)} · ${a.core.delivered}` });
RECORD_BOARDS.push({ urlPath: '/canal-fit', h1: 'The Canal-Fit Checker',
  lead: 'Pick any ship and get an instant verdict against Panamax, Neopanamax, Suezmax, Malaccamax, Seawaymax and Chinamax — with the limiting dimension highlighted.' });

const typeOf = a => (TY.find(t => t.cats.includes(a.category)) || {}).slug || '';
/* google-trends-informed popularity weights: the terms people actually type */
const HOT = {
  // ships — the household names
  'titanic': 50, 'icon-of-the-seas': 48, 'ever-given': 45, 'legend-of-the-seas': 45,
  'star-of-the-seas': 40, 'queen-mary-2': 36, 'wonder-of-the-seas': 34, 'disney-wish': 30,
  'symphony-of-the-seas': 30, 'harmony-of-the-seas': 28, 'oasis-of-the-seas': 28,
  'msc-world-europa': 26, 'carnival-jubilee': 25, 'norwegian-aqua': 22, 'seawise-giant': 22, 'msc-irina': 18,
  'star-princess': 26, 'arvia': 24, 'celebrity-xcel': 22, 'rotterdam': 18,
  'pioneering-spirit': 20, 'prelude-flng': 16,
  // lines — the query giants
  'royal-caribbean': 50, 'carnival': 46, 'msc-cruises': 42, 'norwegian': 40, 'disney-cruise-line': 40,
  'princess-cruises': 34, 'celebrity': 30, 'p-and-o': 26, 'holland-america': 20,
  'cunard': 32, 'msc': 28, 'costa': 24, 'aida': 22, 'maersk': 22, 'evergreen': 20, 'white-star-line': 18,
  'cma-cgm': 14, 'hapag-lloyd': 12, 'cosco': 10, 'one': 8, 'hmm': 8
};
/* The three macro groups. HARD RULE: wherever ships are listed, these never mix. */
const MACRO = [
  { key: 'cruise', name: 'Cruise ships & liners', cats: ['Cruise', 'Liner'], href: '/categories/cruise-ships',
    rank: a => a.core.gt || 0 },
  { key: 'container', name: 'Container ships', cats: ['Container'], href: '/categories/container-ships',
    rank: a => a.core.teu || 0 },
  { key: 'giants', name: 'Tankers & giants', cats: ['Tanker', 'Gas', 'FLNG', 'Bulk', 'Special'], href: '/categories/tankers',
    rank: a => a.core.loa_m || 0,
    subs: [['Tankers', '/categories/tankers'], ['Gas carriers', '/categories/gas-carriers'], ['Bulk carriers', '/categories/bulk-carriers'], ['Heavy-lift', '/categories/heavy-lift-giants']] }
];
const byMacro = m => {
  const list = S.filter(a => m.cats.includes(a.category));
  if (m.key === 'giants') /* the famous monsters lead: Seawise Giant, Pioneering Spirit, Prelude, then by length */
    return list.sort((x, y) => ((HOT[y.slug] || 0) - (HOT[x.slug] || 0)) || ((y.core.loa_m || 0) - (x.core.loa_m || 0)));
  return list.sort((x, y) => (y.core.loa_m || 0) - (x.core.loa_m || 0));
};
/* brand-first nav: ships grouped under their operator, biggest brands first */
const NAV_BRAND_ORDER = ['royal-caribbean', 'cunard', 'msc-cruises', 'carnival', 'norwegian', 'princess-cruises', 'celebrity', 'disney-cruise-line', 'p-and-o', 'holland-america', 'aida', 'costa', 'white-star-line',
  'evergreen', 'msc', 'maersk', 'cosco', 'cma-cgm', 'hmm', 'one', 'hapag-lloyd'];
function brandGroups(macroKey) {
  const mg = MACRO.find(x => x.key === macroKey);
  const pool = byMacro(mg);
  const groups = [];
  const claimed = new Set();
  const order = LN.slice().sort((p, q) => {
    const pi = NAV_BRAND_ORDER.indexOf(p.slug), qi = NAV_BRAND_ORDER.indexOf(q.slug);
    return (pi < 0 ? 99 : pi) - (qi < 0 ? 99 : qi);
  });
  for (const al of order) {
    const ships = pool.filter(a => !claimed.has(a.slug) && (a.operators || []).some(o => o.line === al.slug));
    if (!ships.length) continue;
    ships.forEach(x => claimed.add(x.slug));
    groups.push([al, ships]);
  }
  const orphans = pool.filter(a => !claimed.has(a.slug));
  for (const a of orphans) {
    const nm = opName(a) || 'Independent';
    groups.push([{ name: nm }, [a]]);
  }
  return groups;
}
const LINE_GROUPS = [
  ['Cruise lines', 'cruise'],
  ['Shipping lines', 'shipping'],
  ['Specialists', 'other']
];
const byYard = m => S.filter(a => m.matches.includes(a.builder));
const byType = t => S.filter(a => t.cats.includes(a.category));
const byLine = slug => S.map(a => {
  const op = (a.operators || []).find(o => o.line === slug);
  return op ? { ship: a, op } : null;
}).filter(Boolean);

/* the primary size figure for a ship, in its own honest unit */
/* THE HIERARCHY RULE: a ship's first identity is her OPERATOR, never her builder. */
const opName = a => {
  const ops = a.operators || [];
  if (!ops.length) return '';
  const al = LN.find(x => x.slug === ops[0].line);
  return al ? al.name : (ops[0].name || '');
};
const tonLabel = a => a.core.gt ? [a.core.gt, 'GT', 'gross tonnage'] :
  a.core.teu ? [a.core.teu, 'TEU', 'capacity'] :
  a.core.dwt ? [a.core.dwt, 't DWT', 'deadweight'] : null;

const DISC = `<span class="mn-mark" aria-hidden="true"><span class="mm-b">LOA</span></span>`;
const WORD = `<span class="lw">ships<b><i class="ld">.</i><span class="fw"><span class="fwt">fyi</span></span></b></span>`;
const BRAND = cls => `<a class="${cls}" href="/" aria-label="ships.fyi home">${DISC}${WORD}</a>`;

/* ---------- MEGA NAV (family structure, defined once) ---------- */
function navHTML(current) {
  const cruise = S.filter(a => a.category === 'Cruise' || a.category === 'Liner');
  const box = S.filter(a => a.category === 'Container');
  const giants = S.filter(a => !['Cruise', 'Liner', 'Container'].includes(a.category)).slice().sort((x, y) => x.name.localeCompare(y.name));
  const link = a => `<a class="mn-link" href="/ships/${a.slug}"><span class="lbl">${esc(a.name)}</span><span class="cc">${esc(a.cc)}</span></a>`;
  const alink = al => `<a class="mn-link" href="/lines/${al.slug}"><span class="lbl">${esc(al.name)}</span><span class="cc">${esc(al.cc)}</span></a>`;
  const mlink = (href, lbl, cc) => `<a class="mn-mlink" href="${href}"><span>${esc(lbl)}</span>${cc ? `<span class="cc">${esc(cc)}</span>` : ''}</a>`;

  return `<nav class="mn" id="mn" data-current="${current}" aria-label="Primary">
<div class="mn-shell">
<div class="mn-bar">
${BRAND('mn-logo')}
<div class="mn-groups">
<div class="mn-group" data-key="menu">
<button class="mn-top" type="button" aria-expanded="false" aria-haspopup="true"><svg class="gi" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h14M3 10h14M3 15h9"/></svg>Explore<i class="caret"></i></button>
<div class="mn-panel" role="menu">
<div class="mn-panel-inner" style="grid-template-columns:1.05fr 1fr 1.15fr 1fr">
<div>
<div class="mn-col-h">Cruise ships &amp; liners</div>
${brandGroups('cruise').map(([al, ships]) => `<div class="mn-sub-h">${esc(al.name)}</div>
${ships.map(link).join('\n')}`).join('\n')}
</div>
<div>
<div class="mn-col-h">Container ships</div>
${brandGroups('container').map(([al, ships]) => `<div class="mn-sub-h">${esc(al.name)}</div>
${ships.map(link).join('\n')}`).join('\n')}
<div class="mn-col-h mt">Tankers &amp; giants</div>
${byMacro(MACRO[2]).map(link).join('\n')}
<a class="mn-link" href="/categories"><span class="lbl">All ship categories</span><span class="arr">&rarr;</span></a>
</div>
<div>
<div class="mn-col-h">Cruise lines</div>
${LN.filter(x => x.kind === 'cruise').map(alink).join('\n')}
<div class="mn-col-h mt">Shipping lines</div>
<div class="mn-2col">
${LN.filter(x => x.kind === 'shipping').map(alink).join('\n')}
</div>
<div class="mn-col-h mt">Specialists</div>
${LN.filter(x => x.kind === 'other').map(alink).join('\n')}
</div>
<div>
<div class="mn-col-h">Guides</div>
<a class="mn-link" href="/cruise"><span class="lbl">Get cruise-ready</span><span class="arr">&rarr;</span></a>
<a class="mn-link" href="/cruise/first-cruise-guide"><span class="lbl">First cruise guide</span><span class="arr">&rarr;</span></a>
<a class="mn-link" href="/cruise/packing-list"><span class="lbl">Cruise packing list</span><span class="arr">&rarr;</span></a>
<a class="mn-link" href="/cruise/seasickness"><span class="lbl">Beat seasickness</span><span class="arr">&rarr;</span></a>
<a class="mn-link" href="/cruise/fear-of-cruising"><span class="lbl">Scared to cruise?</span><span class="arr">&rarr;</span></a>
<a class="mn-link" href="/cruise/port-safety"><span class="lbl">Port safety</span><span class="arr">&rarr;</span></a>
<a class="mn-link" href="/cruise/how-big-is-a-cruise-ship"><span class="lbl">How big is a cruise ship?</span><span class="arr">&rarr;</span></a>
<div class="mn-col-h mt">Explore &amp; learn</div>
<a class="mn-link" href="/ships-in-storm"><span class="lbl">Ships in storm</span><span class="arr">&rarr;</span></a>
<a class="mn-link" href="/records"><span class="lbl">Records board</span><span class="arr">&rarr;</span></a>
<a class="mn-link" href="/explained"><span class="lbl">Explained</span><span class="arr">&rarr;</span></a>
<a class="mn-link" href="/canal-fit"><span class="lbl">Canal-Fit Checker</span><span class="arr">&rarr;</span></a>
<a class="mn-link" href="/quiz"><span class="lbl">Silhouette quiz</span><span class="arr">&rarr;</span></a>
<a class="mn-link" href="/play"><span class="lbl">Captain — ship game</span><span class="arr">&rarr;</span></a>
<div class="mn-col-h mt">Latest</div>
${POSTS.map(p => `<a class="mn-link" href="/blog/${p.slug}"><span class="lbl">${esc(p.title)}</span><span class="arr">&rarr;</span></a>`).join('\n')}
<a class="mn-link" href="/blog"><span class="lbl">All blog posts</span><span class="arr">&rarr;</span></a>
<a class="mn-link" href="/methodology"><span class="lbl">Methodology</span><span class="arr">&rarr;</span></a>
</div>
</div>
</div>
</div>
</div>
${I18N_LANGS.length ? `<div class="lang" id="langPill">
<button class="lang-btn" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Language"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="7.2"/><path d="M2.8 10h14.4M10 2.8c2.5 2.3 2.5 12.1 0 14.4M10 2.8c-2.5 2.3-2.5 12.1 0 14.4"/></svg><span class="lang-cur">EN</span></button>
<ul class="lang-menu" role="listbox" aria-label="Choose language" hidden></ul>
</div>` : ''}
<button class="mn-search" type="button" id="mnSearchBtn" aria-label="Search the site" aria-haspopup="dialog"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="9" r="5.4"/><path d="m13.2 13.2 3.3 3.3"/></svg><span>Search</span><kbd>/</kbd></button>
<a class="mn-cta" href="/compare"${current === 'compare' ? ' aria-current="page"' : ''}>Compare</a>
<button class="mn-search-icon" type="button" id="mnSearchBtn2" aria-label="Search the site"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="9" r="5.4"/><path d="m13.2 13.2 3.3 3.3"/></svg></button>
<button class="mn-burger" id="mnBurger" type="button" aria-label="Open menu" aria-expanded="false"><span></span></button>
</div>
</div>
<aside class="mn-drawer" id="mnDrawer" aria-label="Menu">
<div class="mn-drawer-scroll">
<div class="mn-acc">
<button class="mn-acc-top" type="button" aria-expanded="false"><span class="lhs">Cruise ships &amp; liners</span><i class="caret"></i></button>
<div class="mn-acc-body"><div class="mn-acc-in">
${brandGroups('cruise').map(([al, ships]) => `<div class="mn-acc2">
<button class="mn-acc2-top" type="button" aria-expanded="false"><span class="lhs">${esc(al.name)}</span><span class="rhs"><span class="n">${ships.length}</span><i class="caret"></i></span></button>
<div class="mn-acc2-body"><div class="mn-acc2-in">
${ships.map(a => mlink('/ships/' + a.slug, a.name, a.cc)).join('\n')}
</div></div>
</div>`).join('\n')}
</div></div>
</div>
<div class="mn-acc">
<button class="mn-acc-top" type="button" aria-expanded="false"><span class="lhs">Container ships</span><i class="caret"></i></button>
<div class="mn-acc-body"><div class="mn-acc-in">
${brandGroups('container').map(([al, ships]) => `<div class="mn-sub-h">${esc(al.name)}</div>
${ships.map(a => mlink('/ships/' + a.slug, a.name, a.cc)).join('\n')}`).join('\n')}
</div></div>
</div>
<div class="mn-acc">
<button class="mn-acc-top" type="button" aria-expanded="false"><span class="lhs">Tankers &amp; giants</span><i class="caret"></i></button>
<div class="mn-acc-body"><div class="mn-acc-in">
${byMacro(MACRO[2]).map(a => mlink('/ships/' + a.slug, a.name, a.cc)).join('\n')}
</div></div>
</div>
${LINE_GROUPS.map(([gname, kind]) => `<div class="mn-acc">
<button class="mn-acc-top" type="button" aria-expanded="false"><span class="lhs">${esc(gname)}</span><i class="caret"></i></button>
<div class="mn-acc-body"><div class="mn-acc-in">
${LN.filter(x => x.kind === kind).map(al => mlink('/lines/' + al.slug, al.name, al.cc)).join('\n')}
</div></div>
</div>`).join('\n')}
<div class="mn-acc">
<button class="mn-acc-top" type="button" aria-expanded="false"><span class="lhs">Shipyards &amp; categories</span><i class="caret"></i></button>
<div class="mn-acc-body"><div class="mn-acc-in">
${TY.map(t => mlink('/categories/' + t.slug, t.name, String(byType(t).length))).join('\n')}
${YD.map(m => mlink('/shipyards/' + m.slug, m.name, m.cc)).join('\n')}
</div></div>
</div>
<a class="mn-acc-direct" href="/cruise">Get cruise-ready</a>
<a class="mn-acc-direct" href="/ships-in-storm">Ships in storm</a>
<a class="mn-acc-direct" href="/records/longest-ships">Records</a>
<a class="mn-acc-direct" href="/compare">Compare ships</a>
<a class="mn-acc-direct" href="/canal-fit">Canal-Fit Checker</a>
<a class="mn-acc-direct" href="/quiz">Silhouette quiz</a>
<a class="mn-acc-direct" href="/play">Captain — ship game</a>
<a class="mn-acc-direct" href="/blog">Blog</a>
<a class="mn-acc-direct" href="/explained">Explained</a>
</div>
<div class="mn-drawer-foot"><a class="mn-cta" href="/#fleet">Explore the fleet</a></div>
</aside>
</nav>`;
}

/* ---------- MEGA FOOTER (family structure, defined once) ---------- */
function footerHTML() {
  return `<footer class="mf">
<div class="wrap">
<div class="mf-top">
<div class="mf-brand">
${BRAND('mf-logo mn-logo')}
<p>The visual reference for ships. Sourced spec tables, every operator, and every giant of the sea drawn to true scale.</p>
<div class="mf-soc">
<a href="https://aircraft.fyi" target="_blank" rel="noopener">aircraft.fyi</a>
<a href="https://luck.fyi" target="_blank" rel="noopener">luck.fyi</a>
<a href="https://calculate.to" target="_blank" rel="noopener">calculate.to</a>
</div>
</div>
${MACRO.map(mg => {
  const top = byMacro(mg).slice().sort((p, q) => mg.rank(q) - mg.rank(p)).slice(0, 10);
  return `<div>
<p class="mf-h">${esc(mg.name)}</p>
<ul>${top.map(a => `<li><a href="/ships/${a.slug}">${esc(a.name)}</a></li>`).join('')}<li><a href="/#fleet-${mg.key}"><b>All ${byMacro(mg).length} &rarr;</b></a></li></ul>
</div>`;
}).join('\n')}
<div>
<p class="mf-h">Guides</p>
<ul><li><a href="/cruise">Get cruise-ready</a></li><li><a href="/cruise/first-cruise-guide">First cruise guide</a></li><li><a href="/cruise/packing-list">Cruise packing list</a></li><li><a href="/cruise/seasickness">Beat seasickness</a></li><li><a href="/cruise/fear-of-cruising">Scared to cruise?</a></li><li><a href="/cruise/port-safety">Port safety</a></li><li><a href="/cruise/how-big-is-a-cruise-ship">How big is a cruise ship?</a></li><li><a href="/ships-in-storm">Ships in storm</a></li></ul>
<p class="mf-h mt">Reference</p>
<ul><li><a href="/categories">Ship categories</a></li><li><a href="/#lines">All ${LN.length} lines</a></li><li><a href="/shipyards">Shipyards</a></li><li><a href="/records/longest-ships">Longest ships</a></li><li><a href="/canal-fit">Canal-Fit Checker</a></li><li><a href="/compare">Compare ships</a></li><li><a href="/explained">Explained</a></li><li><a href="/blog">Blog</a></li><li><a href="/methodology">Methodology</a></li><li><a href="/quiz">The Silhouette Quiz</a></li><li><a href="/play">Captain — ship game</a></li></ul>
</div>
</div>
<div class="mf-gens">
<div class="mf-gens-head"><p class="mf-h">The directory</p><a href="/#fleet">Every page &rarr;</a></div>
<div class="mf-gens-grid">
<span class="mf-gh">Categories</span>
${TY.map(t => `<a href="/categories/${t.slug}">${esc(t.name)}</a>`).join('\n')}
${MACRO.map(mg => `<span class="mf-gh">${esc(mg.name)}</span>
${byMacro(mg).map(a => `<a href="/ships/${a.slug}">${esc(a.name)}<span class="cc">${esc(a.cc)}</span></a>`).join('\n')}`).join('\n')}
${LINE_GROUPS.map(([gname, kind]) => `<span class="mf-gh">${esc(gname)}</span>
${LN.filter(x => x.kind === kind).map(al => `<a href="/lines/${al.slug}">${esc(al.name)}<span class="cc">${esc(al.cc)}</span></a>`).join('\n')}`).join('\n')}
<span class="mf-gh">Shipyards</span>
${YD.map(m => `<a href="/shipyards/${m.slug}">${esc(m.name)}<span class="cc">${esc(m.cc)}</span></a>`).join('\n')}
<span class="mf-gh">Explained</span>
${EX.map(e => `<a href="/explained/${e.slug}">${esc(e.name.split('\u2014')[0].split(',')[0].trim())}</a>`).join('\n')}
<span class="mf-gh">Records</span>
${RECORD_BOARDS.map(r => `<a href="${r.urlPath}">${esc(r.h1)}</a>`).join('\n')}
<span class="mf-gh">Guides</span>
<a href="/cruise">Get cruise-ready</a>
<a href="/cruise/packing-list">Cruise packing list</a>
<a href="/cruise/first-cruise-guide">First cruise guide</a>
<a href="/cruise/how-big-is-a-cruise-ship">How big is a cruise ship?</a>
<a href="/cruise/seasickness">Beat seasickness</a>
<a href="/cruise/fear-of-cruising">Scared to cruise?</a>
<a href="/cruise/port-safety">Port safety</a>
<a href="/ships-in-storm">Ships in storm</a>
<a href="/quiz">The Silhouette Quiz</a>
<a href="/methodology">Methodology</a>
<span class="mf-gh">Matchups</span>
${COMPARES.map(([x, y]) => `<a href="/compare/${x.slug}-vs-${y.slug}">${esc(shortName(x))} vs ${esc(shortName(y))}</a>`).join('\n')}
${POSTS.length ? `<span class="mf-gh">Blog</span>\n` + POSTS.map(p => `<a href="/blog/${p.slug}">${esc(p.title)}</a>`).join('\n') : ''}
</div>
</div>
<div class="mf-rg"><b>About the data.</b> Every specification is compiled from operator, builder and registry sources and cited per row. Fleet and status figures are snapshots, marked ≈ where approximate and dated; individually verified figures carry a ✓. Ranks never mix units — cruise ships rank by GT, container ships by TEU, tankers by DWT. All silhouettes are original works of ships.fyi, drawn to true scale. Guides may contain clearly marked affiliate links; they never change what we recommend. <b>Corrections and enquiries:</b> <a href="mailto:${DATA.site.corrections}" style="color:var(--gold)">${esc(DATA.site.corrections)}</a> — we fix errors visibly, not silently.</div>
<div class="mf-bot">
<span>&copy; ${new Date().getFullYear()} ships.fyi</span>
<div class="mf-legal"><a href="/records">Records</a><a href="/explained">Explained</a></div>
</div>
</div>
</footer>`;
}

/* ---------- renderer ---------- */
const pages = [];

const CRUMB_NAMES = { ships: 'Ships', lines: 'Lines', shipyards: 'Shipyards', categories: 'Categories', cruise: 'Cruise ready',
  explained: 'Explained', records: 'Records', compare: 'Compare', blog: 'Blog' };
function crumbLd(urlPath, title) {
  const parts = urlPath.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://ships.fyi/' }];
  let acc = '';
  parts.forEach((p, i) => {
    acc += '/' + p;
    const last = i === parts.length - 1;
    items.push({ '@type': 'ListItem', position: i + 2,
      name: last ? title.split(' — ')[0] : (CRUMB_NAMES[p] || p),
      item: 'https://ships.fyi' + acc });
  });
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

const BUILT_PAGES = [];
function renderPage({ file, urlPath, title, description, ogImage, jsonld, content, head = '', ogType = 'website', current = '', sitemap = true, robots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' }) {
  BUILT_PAGES.push({ file, urlPath, indexable: sitemap });
  if (title.length > 60) console.warn(`⚠ title > 60 (${title.length}): ${urlPath}`);
  if (description.length < 110 || description.length > 160) console.warn(`⚠ description ${description.length} (want 110–160): ${urlPath}`);
  let html = LAYOUT
    .replace(/{{TITLE}}/g, esc(title))
    .replace(/{{DESCRIPTION}}/g, esc(description))
    .replace(/{{PATH}}/g, urlPath)
    .replace(/{{OG_IMAGE}}/g, ogImage || 'default.png')
    .replace('{{OG_TYPE}}', ogType)
    .replace('{{ROBOTS}}', robots ? `<meta name="robots" content="${robots}">` : '')
    .replace('{{HEAD}}', head)
    .replace('{{JSONLD}}', JSON.stringify(crumbLd(urlPath, title) ? [].concat(jsonld, crumbLd(urlPath, title)) : jsonld))
    .replace('{{NAV}}', navHTML(current))
    .replace('{{FOOTER}}', footerHTML())
    .replace('{{CONTENT}}', content);
  // relative asset prefixes work everywhere (file://, github.io previews, live domain)
  const depth = file.split('/').length - 1;
  // 404 is served by GitHub Pages at arbitrary/unknown URL depth, so it must keep
  // absolute /assets/ paths; every other page uses relative prefixes so file:// previews work.
  const prefix = (file === '404.html') ? '/' : (depth ? '../'.repeat(depth) : '');
  html = html.replace(/(href|src)="\/assets\//g, `$1="${prefix}assets/`);
  const out = path.join(SITE, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  pages.push({ path: urlPath, sitemap });
}

/* ---------- derived metrics: computed from core, never hand-authored ---------- */
const METRICS = DATA.methodology.metrics;
function metricValue(key, a) {
  const c = a.core;
  if (key === 'paxPerMetre') return (c.passengers && c.loa_m) ? c.passengers / c.loa_m : null;
  if (key === 'teuPerMetre') return (c.teu && c.teu > 1000 && c.loa_m) ? c.teu / c.loa_m : null;
  if (key === 'slenderness') return (c.loa_m && c.beam_m) ? c.loa_m / c.beam_m : null;
  return null;
}
function metricPool(key) {
  return S.map(x => ({ slug: x.slug, v: metricValue(key, x) })).filter(x => x.v !== null);
}
function metricRank(key, a) {
  const vals = metricPool(key).sort((p, q) => q.v - p.v);
  return { rank: vals.findIndex(x => x.slug === a.slug) + 1, of: vals.length };
}
function derivedSection(a) {
  const rows = METRICS.map(m => {
    const raw = metricValue(m.key, a);
    if (raw === null) return '';
    const v = raw.toFixed(m.decimals);
    const { rank, of } = metricRank(m.key, a);
    const max = Math.max(...metricPool(m.key).map(x => x.v));
    const pct = Math.round(raw / max * 100);
    return `<div class="dmetric">
<div class="dm-head"><span class="dm-name">${esc(m.name)}</span><span class="dm-rank">#${rank} of ${of}</span></div>
<div class="dm-bar"><span style="width:${pct}%"></span></div>
<div class="dm-val">${v}${m.unit ? ' ' + esc(m.unit) : ''} <span class="dm-formula">${esc(m.formula)}</span></div>
</div>`;
  }).filter(Boolean).join('\n');
  if (!rows) return '';
  return `<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Our numbers</span>
<h2 class="title">Derived metrics</h2>
<p class="sub">Computed by ships.fyi from the core specification — <a href="/methodology" style="color:var(--gold)">see how we calculate these</a>.</p>
<div class="dgrid">${rows}</div>
</div></section>`;
}

function statStrip(a) {
  const c = a.core;
  const ton = tonLabel(a);
  const candidates = [
    ['Length overall', c.loa_m ? c.loa_m + ' m' : null],
    ['Beam', c.beam_m ? c.beam_m + ' m' : null],
    [ton ? (ton[1] === 'GT' ? 'Gross tonnage' : ton[1] === 'TEU' ? 'Capacity' : 'Deadweight') : '', ton ? ton[0].toLocaleString('en-US') + (ton[1] === 'GT' ? ' GT' : ton[1] === 'TEU' ? ' TEU' : ' t') : null],
    ['Passengers', c.passengers ? c.passengers.toLocaleString('en-US') : null],
    ['Speed', c.speed_kn ? c.speed_kn + ' kn' : null],
    ['Delivered', c.delivered ? String(c.delivered) : null],
    ['Draft', c.draft_m ? c.draft_m + ' m' : null],
    ['Crew', c.crew ? c.crew.toLocaleString('en-US') : null]
  ];
  const items = candidates.filter(x => x[1] !== null).slice(0, 6);
  return `<div class="statstrip">${items.map(([k, v]) =>
    `<div class="ss"><span class="k">${k}</span><span class="v num">${v}</span></div>`).join('')}</div>`;
}

/* ---------- content builders ---------- */
/* soft pastel palette — a calm spectrum; each ship keeps a fixed signature hue.
   Colors are muted enough to read against the light card and stay on-brand. */
const SIL_PALETTE = [
  '#7FB3D5', // pastel blue
  '#82C7A5', // pastel green
  '#F0B27A', // pastel orange
  '#5FB8B0', // pastel teal
  '#B39DDB', // pastel purple
  '#F1948A', // pastel coral
  '#DDB44A', // warm amber (deepened for contrast)
  '#85C1C9', // pastel cyan
  '#C39BD3', // pastel lilac
  '#7DCEA0', // pastel mint
  '#F8A5C2', // pastel pink
  '#A9CCE3'  // pastel sky
];
/* Silhouettes are colored by OPERATOR — the fleet becomes a visual map:
   every Royal Caribbean ship shares one hue, every Maersk another. The household
   names get the memorable pastels (and a legend); the long tail of one-ship
   historical operators shares a calm neutral so the palette stays legible. */
const OP_HUE = {
  'royal-caribbean': '#5FB8B0', // teal
  'msc-cruises':     '#7FB3D5', // blue
  'msc':             '#7FB3D5', // MSC container — same house blue
  'carnival':        '#F1948A', // coral
  'norwegian':       '#3D8FA6', // deep cyan — darkened so the white funnel reads
  'princess-cruises':'#B39DDB', // purple
  'celebrity':       '#82C7A5', // green
  'disney-cruise-line':'#F8A5C2', // pink
  'p-and-o':         '#A9CCE3', // sky
  'holland-america': '#12385E', // dark navy — HAL's actual hull colour
  'aida':            '#9B72C4', // violet — separated from Princess, which was near-identical
  'costa':           '#1F5C9E', // blue — the Costa C is blue over yellow; lets the yellow funnel read
  'cunard':          '#33383F', // charcoal — Cunard house livery (see OP_FUNNEL)
  'white-star-line': '#22262B', // black hull with buff funnels — White Star livery
  'evergreen':       '#82C7A5', // green (container)
  'maersk':          '#7FB3D5', // blue (container)
  'cosco':           '#5FB8B0', // teal (container)
  'cma-cgm':         '#F1948A', // coral (container)
  'hapag-lloyd':     '#F0B27A'  // orange (container)
};
/* ---- funnel liveries ----------------------------------------------------
   HULL colour stays the tuned pastel map (one distinguishable hue per operator,
   with a legend). FUNNEL colour is drawn from the operator's real livery.

   Deliberately NOT painting hulls to match reality: most cruise hulls are white,
   and most of the lines that aren't skew navy — nine near-identical dark blue
   silhouettes would read as a palette failure and kill the visual map. The funnel
   is where the house identity actually lives, so that is where accuracy goes.

   Lines with a genuinely coloured funnel get it. Lines whose funnels are white
   get a pale silver — which IS their livery, not a placeholder. */
const FUNNEL_WHITE = '#CBD5E0';
const OP_FUNNEL = {
  'cunard':             '#C8102E',    // red-orange with black bands, since 1840
  'costa':              '#F2C230',    // yellow with a blue C and black tips, since the 1940s
  'carnival':           '#E11B22',    // the red whale-tail, trademarked
  'disney-cruise-line': '#D8232A',    // red with black caps; only the aft one works
  'white-star-line':    '#C08A2E',    // buff with black tops
  'p-and-o':            '#1B5FA8',    // repainted blue with the rising sun from Britannia (2015)
  'celebrity':          '#16263D',    // dark navy carrying the chi — the Chandris X
  'royal-caribbean':    FUNNEL_WHITE, // white, crown-and-anchor
  'msc-cruises':        FUNNEL_WHITE, // white with the house crest
  'norwegian':          FUNNEL_WHITE, // white
  'princess-cruises':   FUNNEL_WHITE, // white with the sea witch
  'holland-america':    FUNNEL_WHITE, // white funnels above a dark navy hull
  'aida':               FUNNEL_WHITE  // white
};
const silFunnel = slug => {
  const a = S.find(x => x.slug === slug);
  const op = a && (a.operators || [])[0];
  return (op && OP_FUNNEL[op.line]) || null;
};
const silVars = slug => {
  const f = silFunnel(slug);
  return `color:${silHue(slug)}${f ? `;--sil-funnel:${f}` : ''}`;
};
const SIL_NEUTRAL = '#8A97A6';   // the historical / single-ship tail
const silHue = slug => {
  const a = S.find(x => x.slug === slug);
  const op = a && (a.operators || [])[0];
  return (op && OP_HUE[op.line]) || SIL_NEUTRAL;
};
/* legend: only the operators that actually appear, in fleet-size order */
const HUE_LEGEND = (() => {
  const seen = new Map();
  for (const a of S) {
    const op = (a.operators || [])[0];
    if (op && OP_HUE[op.line] && !seen.has(op.line)) {
      const ln = LN.find(x => x.slug === op.line);
      seen.set(op.line, { name: ln ? ln.name : op.line, hue: OP_HUE[op.line] });
    }
  }
  return [...seen.values()];
})();
const SIL = {};
for (const a of S) {
  const raw = fs.readFileSync(path.join(SITE, a.silhouette), 'utf8');
  const m = raw.match(/<g id="sil"[^>]*>([\s\S]*?)<\/g>/);
  if (!m) throw new Error('no silhouette geometry for ' + a.slug);
  SIL[a.slug] = m[1].trim();
}
const MAXLOA = Math.max(...S.map(x => x.core.loa_m || 0));

/* ---- photography ---------------------------------------------------------
   Photos are an ENHANCEMENT. Silhouettes remain the site's signature and the
   only visual on cards, so coverage can grow from 3 to 142 without the grid
   ever looking half-finished.

   A figure renders only when the local file actually exists on disk. Metadata
   without a downloaded file renders nothing — the build reports it instead, so
   a missing image can never ship as a broken <img>.

   CC BY and CC BY-SA both require: title, author, licence + link, link to the
   source, and a note if the work was modified. All five are emitted. */
const photoPath = a => a.photo && a.photo.local ? path.join(SITE, 'assets/img/photos', a.photo.local) : null;
const hasPhoto = a => { const p = photoPath(a); return !!(p && fs.existsSync(p)); };
const PHOTO_PENDING = [];


/* Ships with no self-hosted file get an empty slot instead. The browser asks
   Wikimedia for a photo at load and fills it, or leaves it empty — an empty
   slot is display:none, so a ship with no image renders no card at all.
   Exact article titles are used where we already cite one; otherwise the ship
   name, with the API following redirects. */
/* Return the EXACT cited Wikipedia article, or '' if we don't have one.
   Returning the bare ship name here was a bug: "Iona" is a Scottish island,
   "Aurora" is a light phenomenon, "Volendam" is a Dutch town. The client now
   guesses "MS <name>" instead and verifies the article is about a ship. */
const wikiTitle = a => {
  const s = (a.sources || []).find(x => (x.url || '').includes('en.wikipedia.org/wiki/'));
  if (!s) return '';
  try { return decodeURIComponent(s.url.split('/wiki/')[1].split('#')[0]).replace(/_/g, ' '); }
  catch (e) { return ''; }
};
const photoSlot = a => `<div class="photoSlot" data-wiki="${esc(wikiTitle(a))}" data-name="${esc(a.name)}"></div>`;

const PHOTO_REQUIRED = ['local', 'file', 'author', 'license', 'licenseUrl', 'source'];
const shipPhoto = a => {
  /* No local file and no metadata? Still emit a slot — every ship gets to try. */
  if (!a.photo) return photoSlot(a);
  /* Fail the build rather than publish an incomplete credit. CC BY and BY-SA make
     attribution a condition of the licence, not a courtesy. */
  const missing = PHOTO_REQUIRED.filter(k => !a.photo[k]);
  if (missing.length) throw new Error(`photo credit incomplete for ${a.slug}: missing ${missing.join(', ')}`);
  if (!hasPhoto(a)) { PHOTO_PENDING.push(a.slug); return photoSlot(a); }
  const p = a.photo;
  return `<figure class="shipPhoto">
<img src="/assets/img/photos/${esc(p.local)}" alt="${esc(a.name)}" loading="lazy" decoding="async" width="1200" height="800">
<figcaption class="photoCredit">Photo: ${esc(p.author)} · <a href="${esc(p.licenseUrl)}" rel="license nofollow noopener" target="_blank">${esc(p.license)}</a> · via <a href="${esc(p.source)}" rel="nofollow noopener" target="_blank">Wikimedia Commons</a>${p.modified ? ` · ${esc(p.modified)}` : ''}</figcaption>
</figure>`;
};

const silScaled = a => {
  const pct = Math.max(46, Math.round(98 * Math.pow((a.core.loa_m || 0) / MAXLOA, 0.38)));
  return `<div class="silbox" title="Length overall ${a.core.loa_m} m — drawn at ${pct}% of the longest hull ever floated"><svg viewBox="0 ${a.vb.top} 480 ${a.vb.h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style="width:var(--silw, ${pct}%);${silVars(a.slug)}">
<g fill="currentColor">${SIL[a.slug]}</g></svg></div>`;
};
const rkLen = [...S].sort((x, y) => y.core.loa_m - x.core.loa_m).map(x => x.slug);
const rkGT = S.filter(x => x.core.gt).sort((x, y) => y.core.gt - x.core.gt).map(x => x.slug);
const rkTEU = S.filter(x => x.core.teu).sort((x, y) => y.core.teu - x.core.teu).map(x => x.slug);
const rkDWT = S.filter(x => x.core.dwt).sort((x, y) => y.core.dwt - x.core.dwt).map(x => x.slug);
const rkPax = S.filter(x => x.core.passengers).sort((x, y) => y.core.passengers - x.core.passengers).map(x => x.slug);

const silUse = (a, w) => `<svg viewBox="0 ${a.vb.top} 480 ${a.vb.h}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" style="${silVars(a.slug)}${w ? `;max-width:${w}px` : ''}"><g fill="currentColor">${SIL[a.slug]}</g></svg>`;

function specTable(a) {
  const id = 'spec-' + a.slug;
  return `<div class="tablewrap"><table class="compare" id="${id}"><tbody>
${a.specs.map(s => `<tr><th scope="row">${esc(s.label)}</th><td data-metric="${esc(s.metric)}" data-imperial="${esc(s.imperial)}">${esc(s.metric)}</td></tr>`).join('\n')}
</tbody></table></div>
<p class="unitrow"><button class="btn ghost" type="button" data-unit-toggle="#${id}">Switch to imperial</button></p>`;
}

function shipCard(a) {
  const top = a.specs.slice(0, 4);
  const _op = (a.operators || [])[0];
  const _ln = _op && LN.find(x => x.slug === _op.line);
  return `<article class="acard" data-cat="${typeOf(a)}" data-slug="${a.slug}" data-loa="${a.core.loa_m}" data-beam="${a.core.beam_m}" data-year="${a.core.delivered}" data-name="${esc(a.name.toLowerCase())}" data-line="${esc((_ln ? _ln.name : 'Other').toLowerCase())}" data-size="${a.core.gt || a.core.teu || a.core.dwt || 0}">
<button class="addcmp" type="button" data-slug="${a.slug}" data-short="${esc(shortName(a))}" aria-pressed="false" title="Add to compare tray" aria-label="Add ${esc(a.name)} to the compare tray">⇄</button>
<div class="sil">${silScaled(a)}</div>
<h3><a href="/ships/${a.slug}">${esc(a.name)}</a></h3>
<p class="kicker">${esc(opName(a))} · ${esc(a.status)}</p>
<div class="stats">${top.map(s => `<div><span class="k">${esc(s.label)}</span><span class="v">${esc(s.metric)}</span></div>`).join('')}</div>
<a class="mini" href="/ships/${a.slug}">Full specification &rarr;</a>
</article>`;
}

const opNum = c => parseInt(String(c).replace(/[^0-9]/g, ''), 10) || 0;
function operatorRow(op, a) {
  const al = LN.find(x => x.slug === op.line);
  const name = al ? al.name : (op.name || op.line);
  const cc = al ? al.cc : (op.cc || '');
  const zero = (a && a.operatorsPreService) ? 'On order' : '—';
  const count = op.count === '0' ? zero : esc(op.count) + (op.verified ? '<span class="vtick" title="Individually verified against a cited source">✓</span>' : '');
  const note = op.note ? `<span class="note">${esc(op.note)}</span>` : '';
  const chip = al && al.iata ? `<span class="iata" style="background:${al.brand}">${al.iata}</span>` : (cc ? `<span class="cc">${esc(cc)}</span>` : '');
  const who = `<span class="who">${chip}<span><b>${esc(name)}</b>${note}</span></span>`;
  if (!al) {
    // never silently drop an operator — render unlinked until its page exists
    return `<div class="oprow">${who}<span class="tail"><span class="count num">${count}</span></span></div>`;
  }
  return `<a class="oprow" href="/lines/${al.slug}">${who}<span class="tail"><span class="count num">${count}</span><span class="arr">&rarr;</span></span></a>`;
}
function operatorsMeta(a) {
  const n = (a.operators || []).length;
  if (a.operatorsPreService) {
    return `<p class="sub">Not yet in service — the operators below hold the order. Verified ${esc(a.lastVerified)}.</p>`;
  }
  if (a.operatorsHistorical) {
    return `<p class="sub">No current operator — this ship's sailing days are over. The operators of record are below.</p>`;
  }
  if (a.operatorsComplete) {
    return `<p class="sub">All ${a.operatorsTotal} operator${String(a.operatorsTotal) === '1' ? '' : 's'} of record, verified ${esc(a.lastVerified)}. Figures marked ≈ are approximate.</p>`;
  }
  return `<p class="sub">The top ${n} operators, of ${esc(String(a.operatorsTotal))} — counts marked ≈ are approximate, verified ${esc(a.lastVerified)}.</p>`;
}

/* ---------- home ---------- */
renderPage({
  file: 'index.html', urlPath: '/', current: '',
  title: 'ships.fyi — every giant of the sea, at true scale',
  description: 'The visual reference for ships. Sourced spec tables for every giant of the sea, full operator records, and true-scale side-profile comparison.',
  jsonld: [
    { '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': 'https://ships.fyi/#org', name: 'ships.fyi', url: 'https://ships.fyi/', logo: 'https://ships.fyi/assets/img/icon-512.png', email: DATA.site.contact, description: DATA.site.description },
      { '@type': 'WebSite', '@id': 'https://ships.fyi/#website', name: 'ships.fyi', url: 'https://ships.fyi/', description: DATA.site.description, publisher: { '@id': 'https://ships.fyi/#org' },
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: 'https://ships.fyi/?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } },
      { '@type': 'Dataset', '@id': 'https://ships.fyi/#dataset', name: 'ships.fyi ship specifications', description: `Sourced specifications, dimensions and operator records for ${S.length} of the world's most significant ships — cruise liners, container ships, tankers and record-holders — each drawn to true scale.`, url: 'https://ships.fyi/', creator: { '@id': 'https://ships.fyi/#org' }, license: 'https://ships.fyi/methodology', keywords: ['ships', 'cruise ships', 'container ships', 'tankers', 'ship dimensions', 'gross tonnage', 'TEU', 'deadweight'], isAccessibleForFree: true }
    ] }
  ],
  content: `
<div class="ucbar" aria-hidden="true" data-nosnippet>\uD83D\uDEA7 We\u2019re still adding ships and polishing \u2014 thanks for visiting early. \uD83D\uDEA7</div>
<section class="hero home"><div class="wrap">
<h1>Ships — <span class="em">for your information</span>.</h1>
<p class="lead">Every giant of the sea — measured, sourced, and drawn to true scale. No stock photos. No guesswork.</p>
<div class="heroSearch" id="heroSearch">
<div class="hs-bar">
<svg class="hs-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="9" r="5.4"/><path d="m13.2 13.2 3.3 3.3"/></svg>
<input id="hsInput" type="text" role="combobox" aria-expanded="false" aria-controls="hsRes" aria-autocomplete="list" aria-label="Search ships, lines and shipyards" autocomplete="off" spellcheck="false">
<span class="hs-ph" id="hsPh" aria-hidden="true"><span class="hs-ph-t"></span><i class="hs-cur"></i></span>
</div>
<ul class="hs-res" id="hsRes" role="listbox" aria-label="Search results"></ul>
</div>
<div class="heroChips">
<span class="chip"><b class="num">458.45 m</b><span>longest ship ever</span></span>
<span class="chip"><b class="num">24,346 TEU</b><span>most containers</span></span>
<span class="chip"><b class="num">248,663 GT</b><span>biggest cruise ship</span></span>
<span class="chip"><b class="num">${S.length} + 40</b><span>ships &amp; records</span></span>
</div>
<div class="heroCtas">
<a class="btn ghost" href="/cruise">&#9875; Get cruise-ready</a>
<a class="btn ghost heroRand" id="heroRand" href="/records/longest-ships"><span class="hr-lbl">See the longest ever</span><span class="hr-arr">&rarr;</span></a></div>
</div></section>
<div class="seaband" aria-hidden="true" role="presentation">
<div class="sea-wrap">
<div class="sea-l sea-1"></div>
<div class="sea-l sea-2"></div>
<div class="sea-l sea-3"></div>
</div>
</div>
<section class="section" id="fleet" style="padding-top:30px"><div class="wrap">
<span class="eyebrow">The fleet</span>
<h2 class="title">Ships, page by page</h2>
<p class="sub">Every side profile below is sized by real length overall — the longer the ship, the bigger it draws, and each is <b>colored by operator</b> so a fleet reads at a glance. Cruise ships, container ships and the tanker-era giants are always listed apart, never mixed.</p>
<div class="huelegend" id="hueLegend" aria-label="Silhouette colors by operator">
<div class="huelegend-head"><span class="huelegend-t">Colored by operator</span><button type="button" class="huelegend-btn" id="hueHexToggle" aria-pressed="false">Show hex codes</button></div>
<div class="huelegend-grid">
${HUE_LEGEND.map(l => `<button type="button" class="hl" data-hex="${l.hue}" title="Copy ${l.hue}"><i style="background:${l.hue}"></i><span class="hl-name">${esc(l.name)}</span><span class="hl-hex">${l.hue}</span></button>`).join('')}
<button type="button" class="hl" data-hex="${SIL_NEUTRAL}" title="Copy ${SIL_NEUTRAL}"><i style="background:${SIL_NEUTRAL}"></i><span class="hl-name">Historical &amp; other</span><span class="hl-hex">${SIL_NEUTRAL}</span></button>
</div></div>
<div class="filterbar colsbar" data-scope="ships" role="group" aria-label="Grid columns">
<span class="fsort-lbl">Grid</span>
<button class="fchip cols-d" type="button" data-cols="2" aria-pressed="true">2 columns</button>
<button class="fchip cols-d" type="button" data-cols="3" aria-pressed="false">3</button>
<button class="fchip cols-d" type="button" data-cols="4" aria-pressed="false">4</button>
<button class="fchip cols-m" type="button" data-cols="m1" aria-pressed="false">1 column</button>
<button class="fchip cols-m" type="button" data-cols="m2" aria-pressed="true">2</button>
</div>
${MACRO.map(mg => `<div class="fgroup" id="fleet-${mg.key}">
<div class="fgroup-head">
<h3><a href="${mg.href}">${esc(mg.name)}</a></h3>
<span class="fgroup-n">${byMacro(mg).length} ships</span>
</div>
${mg.subs ? `<p class="fgroup-subs">${mg.subs.map(([n, h]) => `<a href="${h}">${esc(n)}</a>`).join(' · ')}</p>` : ''}
<div class="filterbar" data-sort-for="fleet-${mg.key}" role="group" aria-label="Sort ${esc(mg.name)}">
<span class="fsort-lbl">Sort</span>
<button class="fchip" type="button" data-sort="default" aria-pressed="true">Featured</button>
<button class="fchip" type="button" data-sort="line" aria-pressed="false">${mg.key === 'cruise' ? 'Cruise line' : 'Operator'} A&ndash;Z</button>
<button class="fchip" type="button" data-sort="name" aria-pressed="false">Ship name A&ndash;Z</button>
<button class="fchip" type="button" data-sort="size" aria-pressed="false">${mg.key === 'cruise' ? 'Gross tonnage' : mg.key === 'container' ? 'Capacity (TEU)' : 'Deadweight'}</button>
<button class="fchip" type="button" data-sort="loa" aria-pressed="false">Longest first</button>
</div>
<div class="grid2 cardgrid" data-scope="ships">${byMacro(mg).map((a, i) => shipCard(a).replace('<article class="acard"', `<article class="acard" data-i="${i}"`)).join('\n')}</div>
</div>`).join('\n')}
</div></section>
<section class="section" id="lines" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Lines</span>
<h2 class="title">Fleets, line by line</h2>
<p class="sub">Cruise lines, shipping lines and the specialist operators — always listed apart.</p>
<div class="filterbar colsbar" data-scope="lines" role="group" aria-label="Grid columns">
<span class="fsort-lbl">Grid</span>
<button class="fchip cols-d" type="button" data-cols="2" aria-pressed="true">2 columns</button>
<button class="fchip cols-d" type="button" data-cols="3" aria-pressed="false">3</button>
<button class="fchip cols-d" type="button" data-cols="4" aria-pressed="false">4</button>
<button class="fchip cols-m" type="button" data-cols="m1" aria-pressed="false">1 column</button>
<button class="fchip cols-m" type="button" data-cols="m2" aria-pressed="true">2</button>
</div>
${LINE_GROUPS.map(([gname, kind]) => `<div class="fgroup" id="lines-${kind}">
<div class="fgroup-head"><h3>${esc(gname)}</h3><span class="fgroup-n">${LN.filter(x => x.kind === kind).length} lines</span></div>
<div class="grid2 cardgrid" data-scope="lines">
${LN.filter(x => x.kind === kind).map(al => `<article class="acard">${al.iata ? `<span class="iata iata-top" style="background:${al.brand}">${al.iata}</span>` : ''}<h3><a href="/lines/${al.slug}">${esc(al.name)}</a></h3><p class="kicker">${esc(al.country)} · ${esc(al.alliance)}</p><p class="alh" style="color:var(--muted);font-size:.92rem;margin:0 0 14px">${esc(al.headline)}</p><a class="mini" href="/lines/${al.slug}">See the fleet &rarr;</a></article>`).join('\n')}
</div>
</div>`).join('\n')}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Now live</span>
<h2 class="title">The Canal-Fit Checker</h2>
<div class="callout" style="border-color:var(--gold)">
<p style="margin:0 0 6px"><b>Does it fit through Panama? Suez? The St Lawrence?</b></p>
<p style="margin:0 0 14px;color:var(--muted)">Pick any ship on this site and get an instant verdict against all six great gauges — Panamax, Neopanamax, Suezmax, Malaccamax, Seawaymax and Chinamax — with the limiting dimension highlighted. The size classes are the canal limits; now you can run them.</p>
<div class="heroCtas" style="margin:0"><a class="btn" href="/canal-fit">Open the Canal-Fit Checker &rarr;</a><a class="btn ghost" href="/explained/panamax">What the gauges mean</a></div>
</div>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Setting sail?</span>
<h2 class="title">Get cruise-ready</h2>
<div class="pillars two">
<article class="acard"><h3><a href="/cruise/packing-list">The packing list</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">An interactive checklist that remembers your progress — including the cabin tricks regulars swear by.</p><a class="mini" href="/cruise/packing-list">Start packing &rarr;</a></article>
<article class="acard"><h3><a href="/cruise/first-cruise-guide">First cruise? Read this</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Embarkation, gratuities, seasickness, dining — the honest version, from people who read about ships for fun.</p><a class="mini" href="/cruise/first-cruise-guide">Read the guide &rarr;</a></article>
</div>
<p class="sub" style="margin-top:14px"><a href="/cruise" style="color:var(--gold)">Everything cruise-ready &rarr;</a></p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Browse</span>
<h2 class="title">By builder, or by kind</h2>
<div class="pillars two">
<article class="acard"><h3><a href="/shipyards">Shipyards</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Thirteen builders, from Meyer Turku and Saint-Nazaire to the giant yards of Korea and China — each with its full line-up.</p><a class="mini" href="/shipyards">All shipyards &rarr;</a></article>
<article class="acard"><h3><a href="/categories">Ship categories</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Cruise ships, container ships, tankers, gas carriers, bulk giants and the heavy-lift category-benders — every kind explained.</p><a class="mini" href="/categories">All categories &rarr;</a></article>
<article class="acard"><h3><a href="/blog">The blog</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Long-form writing on the ships we cover — sourced, dated, and honest about what nobody knows yet.</p><a class="mini" href="/blog">Read the blog &rarr;</a></article>
<article class="acard"><h3><a href="/explained">Explained</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Gross tonnage, deadweight, displacement, TEU, Panamax to Megamax, azipod drives — twelve plain-English guides to the ideas behind every spec table.</p><a class="mini" href="/explained">Start reading &rarr;</a></article>
</div>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Side by side</span>
<h2 class="title">The Scale Engine</h2>
<div class="callout"><p>Any three ships, rendered at true relative scale — next to a 1.75&nbsp;m person and a full football pitch. Honest proportions, always.</p></div>
<div class="heroCtas" style="margin-top:18px"><a class="btn" href="/compare">Open the compare tool &rarr;</a><a class="btn ghost" href="/records">See all five record boards</a></div>
</div></section>
<section class="section" id="guides" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Before you sail</span>
<h2 class="title">The guides</h2>
<p class="sub">Spec tables tell you how big a ship is. These tell you what it's like to be aboard one — and how to be ready for it.</p>
<div class="pillars">
<article class="acard"><h3><a href="/cruise/seasickness">Beat seasickness</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">The cabin that barely moves, the horizon rule, wristbands and ginger — how to prevent it, and the simple kit to pack.</p><a class="mini" href="/cruise/seasickness">Prevent it &rarr;</a></article>
<article class="acard"><h3><a href="/cruise/fear-of-cruising">Scared to cruise?</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Nervous about the motion, the open water, feeling trapped? A calm look at why modern ships are so steady — and how to enjoy the view.</p><a class="mini" href="/cruise/fear-of-cruising">Overcome the fear &rarr;</a></article>
<article class="acard"><h3><a href="/cruise/port-safety">Safe ashore, back on time</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Ship time versus local time, all-aboard buffers, tender ports — the rules that keep a port day worry-free.</p><a class="mini" href="/cruise/port-safety">Port day rules &rarr;</a></article>
</div>
<div class="heroCtas" style="margin-top:22px"><a class="btn" href="/cruise">Get cruise-ready &rarr;</a><a class="btn ghost" href="/ships-in-storm">How ships handle storms</a><a class="btn ghost" href="/explained">Explained &mdash; 12 concepts</a></div>
</div></section>`
});

/* ---------- ship pages ---------- */
for (const a of S) {
  const compareLinks = a.compareWith.map(s => S.find(x => x.slug === s)).filter(Boolean)
    .map(x => `<li style="margin-bottom:9px"><a href="/compare?a=${a.slug}&amp;b=${x.slug}" style="color:var(--gold);font-family:var(--display);font-weight:600">${esc(a.name)} vs ${esc(x.name)} &rarr;</a></li>`).join('\n');
  const ops = (a.operators || []).slice().sort((p, q) => opNum(q.count) - opNum(p.count)).map(o => operatorRow(o, a)).filter(Boolean).join('\n');
  const ton = tonLabel(a);
  const tonChip = a.core.gt ? `<a class="recchip" href="/records/biggest-by-tonnage">#${rkGT.indexOf(a.slug) + 1} by gross tonnage &rarr;</a>`
    : a.core.teu ? `<a class="recchip" href="/records/biggest-container-ships">#${rkTEU.indexOf(a.slug) + 1} by capacity (TEU) &rarr;</a>`
    : a.core.dwt ? `<a class="recchip" href="/records/biggest-tankers">#${rkDWT.indexOf(a.slug) + 1} by deadweight &rarr;</a>` : '';
  const paxChip = a.core.passengers ? `<a class="recchip" href="/records/most-passengers">#${rkPax.indexOf(a.slug) + 1} by passengers &rarr;</a>` : '';
  const scaleMax = Math.max(a.core.loa_m, 330);
  const eq = [];
  if (a.slug !== 'titanic') eq.push((a.core.loa_m / 269.06).toFixed(2) + ' Titanics');
  eq.push((a.core.loa_m / 105).toFixed(1) + ' football pitches', Math.round(a.core.loa_m / 25) + ' blue whales', (a.core.loa_m / 76.3).toFixed(1) + ' Boeing 747-8s');
  const CAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'canals.json'), 'utf8')).canals;
  const gauge = slug => CAN.find(c => c.slug === slug);
  const fits = c => !((c.loa_m && a.core.loa_m > c.loa_m) || (c.beam_m && a.core.beam_m > c.beam_m) || (c.draft_m && a.core.draft_m > c.draft_m));
  const npx = gauge('neopanamax'), opx = gauge('panamax');
  const panamaA = fits(opx)
    ? `Yes — at ${a.core.loa_m} m by ${a.core.beam_m} m on a ${a.core.draft_m} m draft, the ${a.name} fits the original Panamax locks, and the larger Neopanamax locks with ease.`
    : fits(npx)
      ? `Not the original locks — but yes through the 2016 Neopanamax locks: at ${a.core.loa_m} m by ${a.core.beam_m} m on a ${a.core.draft_m} m draft she clears the ${npx.loa_m} × ${npx.beam_m} × ${npx.draft_m} m expanded gauge.`
      : `No. At ${a.core.loa_m} m long, ${a.core.beam_m} m wide and ${a.core.draft_m} m of draft, the ${a.name} exceeds even the Neopanamax gauge (${npx.loa_m} × ${npx.beam_m} × ${npx.draft_m} m) — run any gauge on the Canal-Fit Checker.`;
  const ti = S.find(x => x.slug === 'titanic');
  const faq = [];
  faq.push([`How long is the ${a.name}?`,
    `${a.core.loa_m} m (${Math.round(a.core.loa_m * 3.28084).toLocaleString('en-US')} ft) length overall — the #${rkLen.indexOf(a.slug) + 1} longest of the ${S.length} ships on ships.fyi, and ${(a.core.loa_m / 105).toFixed(1)} football pitches end to end.`]);
  if (a.slug !== 'titanic') {
    let vs = `The ${a.name} is ${(a.core.loa_m / ti.core.loa_m).toFixed(2)}× the Titanic's length — ${a.core.loa_m} m against her 269.06 m.`;
    if (a.core.gt) vs += ` By volume the gap is starker still: ${a.core.gt.toLocaleString('en-US')} GT against Titanic's 46,328 GRT — roughly ${(a.core.gt / 46328).toFixed(1)} times the tonnage, measured across two different rule eras.`;
    faq.push([`How big is the ${a.name} compared to the Titanic?`, vs]);
  } else {
    faq.push(['How big was the Titanic in modern terms?',
      'At 269.06 m and 46,328 GRT she would not make the top thirty of today\u2019s length board, and the largest modern cruise ship carries roughly five times her tonnage \u2014 which is exactly why she appears as the reference bar on nearly every chart on this site.']);
  }
  const opNames = (a.operators || []).map(o => { const al = LN.find(x => x.slug === o.line); return al ? al.name : (o.name || ''); }).filter(Boolean);
  faq.push([`Who ${a.operatorsHistorical ? 'operated' : 'operates'} the ${a.name}?`,
    `${opNames.join(', ')}${a.operatorsHistorical ? ' — the ship is no longer in service (' + a.status.toLowerCase() + ').' : '. Current status: ' + a.status.toLowerCase() + '.'}`]);
  faq.push([`Does the ${a.name} fit through the Panama Canal?`, panamaA]);
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map(([q, ans]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: ans } })) };
  const bars = [[a.name, a.core.loa_m, 1], ['Eiffel Tower (height)', 330, 0]];
  if (a.slug !== 'titanic') bars.push(['Titanic', 269.06, 0]);
  bars.push(['Football pitch', 105, 0], ['Boeing 747-8', 76.3, 0], ['Blue whale', 25, 0], ['You (probably)', 1.75, 0]);

  renderPage({
    file: `ships/${a.slug}.html`, urlPath: `/ships/${a.slug}`, current: 'ships',
    title: `${a.name} — size, specs & story`.length > 60 ? `${a.name} — size & specs` : `${a.name} — size, specs & story`,
    description: fitDesc(`${a.headline} Sourced specs, the class, and every operator.`),
    ogImage: `${a.slug}.png`,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'Dataset', name: `${a.name} specifications`, description: a.headline, url: `https://ships.fyi/ships/${a.slug}`, image: `https://ships.fyi/assets/img/og/${a.slug}.png`, dateModified: a.lastVerified, license: 'https://ships.fyi/methodology', creator: { '@type': 'Organization', name: 'ships.fyi', url: 'https://ships.fyi' } }, faqLd],
    content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › <a href="/#fleet">Ships</a> › ${esc(a.name)}</div>
<h1>${esc(a.name)}</h1>
<p class="kicker" style="margin-top:2px"><b>${esc(opName(a))}</b> · ${esc(a.category)} · ${esc(a.status)} · built by ${esc(a.builder)}</p>
<p class="lead">${esc(a.identity)}</p>
${shipPhoto(a)}
<div class="hero-sil">${silUse(a, 560)}</div>
${statStrip(a)}
</div></section>
${derivedSection(a)}
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Sense of scale</span>
<h2 class="title">How big is it, really?</h2>
<p class="sub">The ${esc(a.name)}'s length overall, against things you already know the size of.</p>
<div class="sizebars">
${bars.map(r => `<div class="szrow${r[2] ? ' me' : ''}"><span class="szl">${esc(String(r[0]))}</span><span class="szb"><i style="width:${Math.max(1.2, r[1] / scaleMax * 100).toFixed(1)}%"></i></span><span class="szv num">${r[1]} m</span></div>`).join('')}
</div>
<p class="sub" style="margin-top:10px">The 747-8 held the longest-airliner record for over a decade, until Boeing's 777-9 took it by about 19 inches (76.72 m) — our sibling site <a href="https://aircraft.fyi" target="_blank" rel="noopener" style="color:var(--gold)">aircraft.fyi</a> measures everything that flies the same way.</p>
<p class="eqrow">One ${esc(a.name)} = <b>${eq.join('</b> · <b>')}</b> laid end to end.</p>
<div class="recrow">
<a class="recchip" href="/records/longest-ships">#${rkLen.indexOf(a.slug) + 1} of ${S.length} by length &rarr;</a>
${tonChip}
${paxChip}
<a class="recchip" href="/canal-fit#${a.slug}">Run the Canal-Fit Checker &rarr;</a>
${(a.category === 'Cruise' && /^in service/i.test(a.status)) ? `<a class="recchip cruisechip" href="/cruise/packing-list">Sailing on her? Get cruise-ready &rarr;</a>` : ''}
</div>
${(a.category === 'Cruise' && /^in service/i.test(a.status)) ? planPanel(shortName(a)) : ''}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Specification</span>
<h2 class="title">The numbers</h2>
${specTable(a)}
<div class="cmpJump">
<span class="eyebrow">Compare it</span>
<h2 class="title" style="font-size:1.3rem;margin-bottom:12px">Put the ${esc(shortName(a))} next to something</h2>
${(() => { const t = typeOf(a); const rv = S.filter(x => x.slug !== a.slug && typeOf(x) === t).sort((p, q) => Math.abs(p.core.loa_m - a.core.loa_m) - Math.abs(q.core.loa_m - a.core.loa_m)).slice(0, 2); return rv.length ? `<div class="recrow" style="margin-top:12px">${rv.map(v => `<a class="recchip" href="/compare?a=${a.slug}&amp;b=${v.slug}">vs ${esc(shortName(v))} &rarr;</a>`).join('')}</div>` : ''; })()}
<div class="cmpJumpRow">
${(a.compareWith || []).filter(c => S.find(z => z.slug === c)).slice(0, 3).map(c => {
  const o = S.find(z => z.slug === c);
  return `<a class="btn ghost sm" href="/compare#${a.slug},${o.slug}">vs ${esc(shortName(o))}</a>`;
}).join('\n')}
<a class="btn sm" href="/compare#${a.slug}">Compare with anything &rarr;</a>
<button class="btn ghost sm addcmp" type="button" data-slug="${a.slug}" data-short="${esc(shortName(a))}" aria-pressed="false">+ Add to tray</button>
</div>
</div>
${(() => { const SS = [...S].sort((p, q) => p.name.localeCompare(q.name)); const i = SS.findIndex(x => x.slug === a.slug);
const pv = SS[(i - 1 + SS.length) % SS.length], nx = SS[(i + 1) % SS.length];
return `<nav class="pn" aria-label="More ships">
<a class="pn-a" href="/ships/${pv.slug}"><span class="pn-k">&larr; Previous</span><b>${esc(pv.name)}</b></a>
<a class="pn-a next" href="/ships/${nx.slug}"><span class="pn-k">Next &rarr;</span><b>${esc(nx.name)}</b></a>
</nav>`; })()}
<p class="verified">Last verified: ${esc(a.lastVerified)} · Spot an error? <a href="mailto:${DATA.site.corrections}?subject=Correction%3A%20${encodeURIComponent(a.name)}" style="color:var(--gold)">${esc(DATA.site.corrections)}</a></p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The story</span>
<h2 class="title">What makes it different</h2>
<div class="prose" style="margin-top:20px">
${a.prose.map(p => `<p>${esc(p)}</p>`).join('\n')}
</div>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The class</span>
<h2 class="title">The ${esc(shortName(a))} line</h2>
<div data-accordion>
${a.variants.map((v, i) => `<details class="qa"${i === 0 ? ' open' : ''}><summary>${esc(v.name)}<i class="caret"></i></summary><div class="body">${esc(v.note)}</div></details>`).join('\n')}
</div>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Operators</span>
<h2 class="title">Who operates the ${esc(shortName(a))}</h2>
${operatorsMeta(a)}
${ops}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Quick answers</span>
<h2 class="title">${esc(shortName(a))}, asked and answered</h2>
<div data-accordion>
${faq.map((qa, i) => `<details class="qa"${i === 0 ? ' open' : ''}><summary>${esc(qa[0])}<i class="caret"></i></summary><div class="body">${esc(qa[1])}</div></details>`).join('\n')}
</div>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Compare</span>
<h2 class="title">Put it next to something</h2>
<ul style="list-style:none;margin:20px 0 0;padding:0">${compareLinks}</ul>
${sourcesBlock(a.sources, a.wiki ? [{ name: esc(a.name) + ' — Wikipedia', url: a.wiki }] : [], { eyebrow: false })}
</div></section>`
  });
}

/* ---------- line pages ---------- */
for (const al of LN) {
  const fl = S.map(a => ({ a, op: (a.operators || []).find(o => o.line === al.slug) })).filter(x => x.op)
    .sort((x, y) => (y.a.core.loa_m || 0) - (x.a.core.loa_m || 0));
  const REC = { 'legend-of-the-seas': 'the largest cruise ship in the world',
                'msc-irina': 'the largest container ship in the world',
                'ti-europe': 'the largest trading ship afloat',
                'pioneering-spirit': 'the largest ship ever built by gross tonnage',
                'queen-mary-2': 'the only true ocean liner in service',
                'mozah': 'the largest LNG carriers ever built',
                'titanic': 'the most famous ship ever built',
                'berge-stahl': 'the largest bulk carrier of its era' };
  const recs = fl.filter(x => REC[x.a.slug]);
  const opN = c => { const n = parseInt(String(c).replace(/[^0-9]/g, ''), 10); return isNaN(n) ? -1 : n; };
  /* status regexes anchored at string start — 'In service (renamed …)' must never match */
  const isPast = x => /^(retired|scrapped|sunk|preserved|out of service)/i.test(String(x.a.status || '')) || /\b(retired|withdrawn|former|historical|ceased)\b/i.test(String(x.op.note || ''));
  const past = fl.filter(isPast);
  const ord = fl.filter(x => !isPast(x) && opN(x.op.count) === 0).map(x => Object.assign({}, x, { _ord: true }));
  const cur = fl.filter(x => !isPast(x) && opN(x.op.count) !== 0);
  const flCards = [...cur, ...ord].map(x => `<article class="acard flcard">
<span class="opcount">${x._ord ? 'On order' : esc(String(x.op.count)) + ' in fleet'}</span>
<button class="addcmp" type="button" data-slug="${x.a.slug}" data-short="${esc(shortName(x.a))}" aria-pressed="false" title="Add to compare tray" aria-label="Add ${esc(x.a.name)} to the compare tray">&#8644;</button>
<div class="sil">${silScaled(x.a)}</div>
<h3><a href="/ships/${x.a.slug}">${esc(x.a.name)}</a></h3>
<p class="kicker">${esc(x.a.builder)} · ${esc(x.a.status)}</p>
${x.op.note ? `<p class="opnote">${esc(x.op.note)}</p>` : ''}
<a class="mini" href="/ships/${x.a.slug}">Full specification &rarr;</a>
</article>`).join('\n');
  renderPage({
    file: `lines/${al.slug}.html`, urlPath: `/lines/${al.slug}`, current: 'lines',
    title: `${al.name} fleet — the giants they operate`.length > 60 ? `${al.name} — fleet & giants` : `${al.name} fleet — the giants they operate`,
    description: fitDesc(`${al.headline} The fleet, ship by ship, sourced.`),
    jsonld: { '@context': 'https://schema.org', '@type': 'Organization', name: al.name, foundingDate: al.founded, url: `https://ships.fyi/lines/${al.slug}` },
    content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › Lines › ${esc(al.name)}</div>
<h1>${al.iata ? `<span class="iata big" style="background:${al.brand}">${al.iata}</span> ` : ''}${esc(al.name)}</h1>
<p class="kicker" style="margin-top:2px">${esc(al.country)} · ${esc(al.alliance)} · HQ: ${esc(al.hub)}</p>
<p class="lead">${esc(al.headline)}</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<div class="statstrip">
<div class="ss"><span class="k">Ships here</span><span class="v num">${cur.length}</span></div>
<div class="ss"><span class="k">Biggest ship</span><span class="v">${cur.length ? esc(shortName(cur[0].a)) : '—'}</span></div>
<div class="ss"><span class="k">Group / alliance</span><span class="v">${esc(al.alliance)}</span></div>
<div class="ss"><span class="k">Founded</span><span class="v num">${esc(al.founded)}</span></div>
<div class="ss"><span class="k">Mark</span><span class="v">${esc(al.iata)}</span></div>
${past.length ? `<div class="ss"><span class="k">Historical ships</span><span class="v num">${past.length}</span></div>` : ''}
</div>
</div></section>
${cur.length > 1 ? `<section class="section" style="padding-top:6px"><div class="wrap">
<span class="eyebrow">Side by side</span>
<h2 class="title">The fleet at true scale</h2>
<p class="sub">Every giant ${esc(al.name)} operates on this site, drawn to the same scale — longest hull on the left. Tap any silhouette.</p>
<div class="allineup">${cur.map(x => `<a class="lu" href="/ships/${x.a.slug}"${x.a.core.loa_m ? ` style="flex:${x.a.core.loa_m} 1 0"` : ''}><span class="lu-s">${silScaled(x.a)}</span><span class="lu-n">${esc(shortName(x.a))}</span></a>`).join('')}</div>
</div></section>` : ''}
${al.fleetText ? `<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The whole fleet</span>
<h2 class="title">Every ${esc(al.name)} ship, in brief</h2>
<div class="prose"><p>${esc(al.fleetText)}</p>
<p style="color:var(--muted);font-size:.9rem">We profile the flagships in full below \u2014 the rest of the fleet joins ships.fyi class by class.</p></div>
</div></section>
` : ''}<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The fleet</span>
<h2 class="title">What ${esc(al.name)} operates</h2>
${(cur.length + ord.length) ? `<div class="filterbar colsbar" role="group" aria-label="Grid columns">
<span class="fsort-lbl">Grid</span>
<button class="fchip cols-d" type="button" data-cols="2" aria-pressed="true">2 columns</button>
<button class="fchip cols-d" type="button" data-cols="3" aria-pressed="false">3</button>
<button class="fchip cols-d" type="button" data-cols="4" aria-pressed="false">4</button>
<button class="fchip cols-m" type="button" data-cols="m1" aria-pressed="false">1 column</button>
<button class="fchip cols-m" type="button" data-cols="m2" aria-pressed="true">2</button>
</div>
<div class="grid2 cardgrid">
${flCards}
</div>` : '<p class="sub">Full coverage of this line\u2019s fleet is in build — the profile below is here because the line matters to the story of the giants.</p>'}
${recs.length ? `<div class="recrow">${recs.map(x => `<a class="recchip" href="/ships/${x.a.slug}">${isPast(x) ? 'Operated' : 'Operates'} ${esc(shortName(x.a))} — ${REC[x.a.slug]} &rarr;</a>`).join('')}</div>` : ''}
</div></section>
${past.length ? `<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The history</span>
<h2 class="title">Gone from the fleet</h2>
<div class="grid2 cardgrid">
${past.map(x => `<article class="acard flcard pastcard">
<span class="opcount">${opN(x.op.count) > 0 ? esc(String(x.op.count)) + ' sailed' : 'Former operator'}</span>
<div class="sil">${silScaled(x.a)}</div>
<h3><a href="/ships/${x.a.slug}">${esc(x.a.name)}</a></h3>
<p class="kicker">${esc(x.a.status)}</p>
${x.op.note ? `<p class="opnote">${esc(x.op.note)}</p>` : ''}
<a class="mini" href="/ships/${x.a.slug}">The full story &rarr;</a>
</article>`).join('\n')}
</div>
</div></section>` : ''}
${al.facts && al.facts.length ? `<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Good to know</span>
<h2 class="title">${esc(al.name)}, in a few facts</h2>
<ul class="facts">${al.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
</div></section>` : ''}
<section class="section" style="padding-top:0"><div class="wrap">
${sourcesBlock(al.sources, LINE_WIKI[al.slug] ? [
  { name: esc(al.name) + ' — Wikipedia', url: wikiURL(LINE_WIKI[al.slug]) }
] : [])}
</div></section>`
  });
}

/* ---------- methodology (E-E-A-T: publish how the numbers are made) ---------- */
renderPage({
  file: 'methodology.html', urlPath: '/methodology', current: '',
  title: 'Methodology — how ships.fyi calculates its numbers',
  description: 'How every ships.fyi derived metric is computed, where the core specifications come from, why ranks never mix units, and how corrections work.',
  jsonld: { '@context': 'https://schema.org', '@type': 'TechArticle', headline: 'How ships.fyi calculates its numbers', url: 'https://ships.fyi/methodology' },
  content: `
<section class="hero"><div class="wrap">
<h1>How we calculate our numbers</h1>
<p class="lead">Every derived metric on this site is computed from the sourced core specification. Here is exactly how — so the numbers are checkable, and citable.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Our numbers</span>
<h2 class="title" style="margin-bottom:8px">Every derived metric, formula by formula</h2>
${METRICS.map(m => `<div class="qa" style="margin-top:12px"><div style="padding:16px 18px">
<h3 style="font-size:1.1rem;margin-bottom:6px">${esc(m.name)}</h3>
<p style="color:var(--muted);font-size:.92rem;margin:0 0 6px"><b style="color:var(--text)">Formula:</b> ${esc(m.formula)}</p>
<p style="color:var(--muted);font-size:.92rem;margin:0">${esc(m.why)}</p>
</div></div>`).join('\n')}
<div class="mf-rg" style="margin-top:24px"><b>Caveats.</b> ${esc(DATA.methodology.caveats)}</div>
<h3 style="margin-top:40px;font-size:1.15rem">Why ranks never mix units</h3>
<div class="prose" style="margin-top:12px">
<p>A cruise ship is measured by gross tonnage (internal volume), a container ship by TEU (box slots), a tanker by deadweight (tonnes lifted). These are three different physical quantities, and a board that ranked them against each other would be fiction. On this site every rank chip says its unit, every board ranks within one unit, and pre-1982 gross register tonnage (Titanic and the 1970s tankers) is flagged as GRT and excluded from the modern GT board rather than mixed in dishonestly.</p>
</div>
<h3 style="margin-top:40px;font-size:1.15rem">What the ✓ tick actually means</h3>
<div class="prose" style="margin-top:12px">
<p>Fleet and status data move constantly, and most ship sites quietly present a stale number as fact. We do not. Every operator row on this site is one of two things, and we say which.</p>
<p>A row marked <b>✓</b> has been individually checked against a named source — an operator page, a builder's delivery record, or registry data — and that source is listed at the bottom of the page. A row marked <b>≈</b> is an approximate snapshot: broadly right, good enough to reason about, and not something you should quote in a contract. Currently ${(() => { const t = S.reduce((n, a) => n + (a.operators || []).length, 0); const v = S.reduce((n, a) => n + (a.operators || []).filter(o => o.verified).length, 0); return `<b>${v} of ${t}</b> operator rows`; })()} carry a tick. That number will only go up.</p>
<p>We would rather show you an honest ≈ than a confident lie.</p>
</div>
<h3 style="margin-top:40px;font-size:1.15rem">Where the core data comes from</h3>
<div class="prose" style="margin-top:12px">
<p>Core specifications are taken from operator fact sheets, builder delivery records and classification or registry data, cited per row on every spec table. Historical ships use inquiry records, museum archives and published class data. Where sources conflict, we say so on the page and carry the honest range or an ≈.</p>
<p>Every silhouette is an original parametric drawing composed from the published dimensions — never traced from photographs or other people's drawings. If you spot an error, tell us — corrections are made visibly, not silently.</p>
</div>
</div></section>`
});

/* ---------- records: longest-ships board + hub ---------- */
const RL = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'records-longest.json'), 'utf8'));
function recordRow(r) {
  const inner = `<span class="rr-rank num">${r.rank}</span>
<span class="rr-main"><span class="rr-name">${esc(r.name)}</span><span class="rr-len num"><b>${r.length_m.toFixed(2)} m</b><span class="rr-ft"> · ${esc(r.length_ft)}</span></span></span>
<span class="rr-sub"><span class="rr-ff num">${esc(r.year)}</span><span class="rr-st">${esc(r.status)}</span></span>`;
  return r.slug
    ? `<a class="recrow" href="/ships/${r.slug}">${inner}</a>`
    : `<div class="recrow">${inner}</div>`;
}
renderPage({
  file: 'records/longest-ships.html', urlPath: '/records/longest-ships', current: 'records',
  title: 'The 40 longest ships ever built — full ranked list',
  description: 'The 40 longest ships in history, ranked by length overall — from Prelude and Seawise Giant to the 400 m megamax fleet, with dates and status.',
  jsonld: { '@context': 'https://schema.org', '@type': 'ItemList', name: RL.title,
    itemListElement: RL.records.slice(0, 10).map(r => ({ '@type': 'ListItem', position: r.rank, name: r.name })) },
  content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › <a href="/records">Records</a> › Longest ships</div>
<h1>The 40 longest ships ever built</h1>
<p class="lead">Ranked by length overall — supertankers, the entire 400-metre megamax club, the cruise giants and one enormous asterisk. Number one cannot sail, and number two no longer exists.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<div class="prose">
<p>Length is the record with the best stories. The top of this board is dominated by the 1970s supertanker experiment — four French half-million-tonners and Exxon's twins, almost all scrapped young — crowned by Seawise Giant, the longest ship ever to sail, and out-measured only by Prelude FLNG, which was towed into place and will never make a voyage. Below them, an eleven-way pile-up at 399.9 metres marks the wall every modern container ship is built against.</p>
<p>${esc(RL.note)}</p>
</div>
<h2 class="title" style="margin-top:34px">The board, one to forty</h2>
<div class="reclist">
<div class="recrow head" aria-hidden="true"><span class="rr-rank">#</span><span class="rr-main"><span class="rr-name">Ship</span><span class="rr-len">Length</span></span><span class="rr-sub"><span class="rr-ff">Built</span><span class="rr-st">Status</span></span></div>
${RL.records.map(recordRow).join('\n')}
</div>
<p class="verified">Compiled by ships.fyi from operator, builder and archive data, verified ${esc(RL.asOf)}.</p>
<div class="mf-rg" style="margin-top:18px">Sources: ${RL.sources.map(s => `<a href="${s.url}" style="color:var(--gold)">${esc(s.name)}</a>`).join(' · ')}</div>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">More boards</span>
<h2 class="title">Other records</h2>
<div class="pillars two">
${RECORD_BOARDS.filter(x => x.urlPath !== '/records/longest-ships').map(x => `<article class="acard"><h3><a href="${x.urlPath}">${esc(x.h1)}</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">${esc(x.lead)}</p><a class="mini" href="${x.urlPath}">Open the board &rarr;</a></article>`).join('\n')}
</div>
</div></section>`
});
renderPage({
  file: 'records.html', urlPath: '/records', current: 'records', ogImage: 'records.png',
  title: 'Ship records — the longest, biggest and busiest',
  description: 'Five ranked record boards compiled from sourced data — longest ever, biggest by tonnage, TEU and deadweight, highest capacity — plus the Canal-Fit tool.',
  jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Ship records', url: 'https://ships.fyi/records' },
  content: `
<section class="hero"><div class="wrap">
<h1>Ship records</h1>
<p class="lead">Five ranked boards and one tool, compiled from operator and builder data and sourced on every page — with each board ranked in its own honest unit.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The boards</span>
<h2 class="title">Six ways to rank a ship</h2>
<div class="pillars two">
${RECORD_BOARDS.map(x => `<article class="acard"><h3><a href="${x.urlPath}">${esc(x.h1)}</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">${esc(x.lead)}</p><a class="mini" href="${x.urlPath}">Open the board &rarr;</a></article>`).join('\n')}
</div>
</div></section>`
});

/* ---------- RECORDS BOARDS (computed from the dataset) ---------- */
function boardRow(rank, a, main, sub) {
  return `<a class="recrow" href="/ships/${a.slug}">
<span class="rr-rank num">${rank}</span>
<span class="rr-main"><span class="rr-name">${esc(a.name)}</span><span class="rr-len num"><b>${esc(main)}</b></span></span>
<span class="rr-sub"><span class="rr-ff num">${esc(sub)}</span><span class="rr-st">${esc(a.status)}</span></span>
</a>`;
}
function board({ file, urlPath, title, description, h1, lead, note, key, fmt, sub, jsonldName, only }) {
  const list = S.filter(a => a.core[key] && (!only || only(a))).sort((x, y) => y.core[key] - x.core[key]);
  const rows = list.map((a, i) => boardRow(i + 1, a, fmt(a), sub(a))).join('\n');
  renderPage({
    file, urlPath, current: '', title, description,
    jsonld: { '@context': 'https://schema.org', '@type': 'ItemList', name: jsonldName, url: `https://ships.fyi${urlPath}`,
      itemListElement: list.slice(0, 20).map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.name, url: `https://ships.fyi/ships/${a.slug}` })) },
    content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › <a href="/records">Records</a> › ${esc(h1)}</div>
<h1>${esc(h1)}</h1>
<p class="lead">${esc(lead)}</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<p class="sub">${esc(note)}</p>
<div class="reclist">
${rows}
</div>
<p class="verified">${list.length} ships ranked · every figure sourced on its own page · last verified ${esc(S[0].lastVerified)}</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">More boards</span>
<h2 class="title">Other records</h2>
<div class="pillars two">
${RECORD_BOARDS.filter(x => x.urlPath !== urlPath).map(x => `<article class="acard"><h3><a href="${x.urlPath}">${esc(x.h1)}</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">${esc(x.lead)}</p><a class="mini" href="${x.urlPath}">Open the board &rarr;</a></article>`).join('\n')}
</div>
</div></section>`
  });
}
RECORD_BOARDS.filter(x => x.key).forEach(board);

/* ---------- THE CANAL-FIT CHECKER — the ships-native tool ---------- */
const CANALS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'canals.json'), 'utf8'));
renderPage({
  file: 'canal-fit.html', urlPath: '/canal-fit', current: '',
  title: 'Canal-Fit Checker — does that ship fit through Panama?',
  description: 'Pick any ship and get an instant verdict against Panamax, Neopanamax, Suezmax, Malaccamax, Seawaymax and Chinamax — with the limiting dimension highlighted.',
  jsonld: { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'ships.fyi Canal-Fit Checker', applicationCategory: 'ReferenceApplication', url: 'https://ships.fyi/canal-fit', operatingSystem: 'Any' },
  head: '<script src="/assets/js/ships-data.js" defer></script>',
  content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › Canal-Fit Checker</div>
<h1>Does it <span class="em">fit</span>?</h1>
<p class="lead">The famous ship sizes — Panamax, Suezmax and the rest — are just the dimensions of the world's great chokepoints. Pick any ship on this site and run it against all six gauges. The failing dimension is highlighted in red, straight from the published limits.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<div class="cmpPicks" style="grid-template-columns:1fr">
<label class="pick"><span>Ship</span><select id="cfSel"></select></label>
</div>
<div class="cmpBar">
<button class="btn ghost sm" type="button" id="cfRandom">Surprise me</button>
<button class="btn ghost sm" type="button" id="cfShare">Copy link to this verdict</button>
</div>
<p class="sub" id="cfShipLine" style="margin-top:14px"></p>
<div id="cfBoards" style="margin-top:10px"></div>
<p class="verified" style="margin-top:18px">Gauge dimensions verified ${esc(CANALS.asOf)} from: ${CANALS.canals.map(c => `<a href="${c.url}" style="color:var(--gold)" rel="noopener" target="_blank">${esc(c.source)}</a>`).filter((v, i, arr) => arr.indexOf(v) === i).join(' · ')}. ${esc(CANALS.note)}</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The gauges</span>
<h2 class="title">What each limit actually is</h2>
<div class="pillars two">
${CANALS.canals.map(c => `<article class="acard"><h3>${esc(c.name)}</h3><p class="kicker">${esc(c.what)}</p><p style="color:var(--muted);font-size:.92rem;margin:0 0 10px">${['LOA ' + (c.loa_m ? c.loa_m + ' m' : 'no limit'), 'beam ' + (c.beam_m ? c.beam_m + ' m' : 'no limit'), 'draft ' + (c.draft_m ? c.draft_m + ' m' : 'no limit')].join(' · ')}</p><p style="color:var(--muted);font-size:.88rem;margin:0">${esc(c.note)}</p></article>`).join('\n')}
</div>
<p class="sub" style="margin-top:18px">Deeper reading: <a href="/explained/panamax" style="color:var(--gold)">Panamax, Neopanamax and Suezmax, explained</a> · <a href="/explained/loa-beam-draft" style="color:var(--gold)">LOA, beam and draft — what the three dimensions mean</a></p>
</div></section>
<script>
(function(){
  var CN = ${JSON.stringify(CANALS.canals)};
  function init(){
    var D = window.SHIPS || [];
    if (!D.length) return;
    var $ = function(id){ return document.getElementById(id); };
    var sel = $('cfSel'), boards = $('cfBoards'), line = $('cfShipLine');
    var groups = {};
    D.forEach(function(a){ (groups[a.typeName] = groups[a.typeName] || []).push(a); });
    var html = '';
    Object.keys(groups).forEach(function(g){
      html += '<optgroup label="' + g + '">';
      groups[g].slice().sort(function(p,q){ return p.name.localeCompare(q.name); })
        .forEach(function(a){ html += '<option value="' + a.slug + '">' + a.name + '</option>'; });
      html += '</optgroup>';
    });
    sel.innerHTML = html;
    var get = function(s){ return D.find(function(a){ return a.slug === s; }); };
    var esc2 = function(s){ var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
    function bar(label, shipV, limV){
      if (limV === null || limV === undefined) return '<div class="szrow"><span class="szl">' + label + '</span><span class="szb"><i style="width:1.2%"></i></span><span class="szv num">no limit</span></div>';
      var pct = Math.min(100, shipV / limV * 100);
      var over = shipV > limV;
      return '<div class="szrow' + (over ? ' cf-over' : '') + '"><span class="szl">' + label + '</span><span class="szb"><i style="width:' + Math.max(1.2, pct).toFixed(1) + '%' + (over ? ';background:var(--crimson)' : '') + '"></i></span><span class="szv num"' + (over ? ' style="color:var(--crimson)"' : '') + '>' + shipV + ' / ' + limV + ' m</span></div>';
    }
    function render(){
      var a = get(sel.value); if (!a) return;
      var c = a.core;
      line.textContent = a.name + ' — ' + c.loa_m + ' m LOA · ' + c.beam_m + ' m beam · ' + c.draft_m + ' m draft (laden figures from the ship\\u2019s spec page).';
      boards.innerHTML = CN.map(function(cn){
        var fails = [];
        if (cn.loa_m !== null && c.loa_m > cn.loa_m) fails.push(['length', c.loa_m, cn.loa_m]);
        if (cn.beam_m !== null && c.beam_m > cn.beam_m) fails.push(['beam', c.beam_m, cn.beam_m]);
        if (cn.draft_m !== null && c.draft_m > cn.draft_m) fails.push(['draft', c.draft_m, cn.draft_m]);
        var pass = !fails.length;
        var verdict = pass
          ? '<b style="color:var(--mint)">Fits ✓</b>'
          : '<b style="color:var(--crimson)">Fails ✗</b> — ' + fails.map(function(f){ return f[0] + ': ' + f[1] + ' m vs ' + f[2] + ' m limit'; }).join(' · ');
        return '<div class="qa" style="margin-top:12px"><div style="padding:16px 18px">' +
          '<h3 style="font-size:1.05rem;margin-bottom:2px">' + esc2(cn.name) + ' <span style="font-weight:400;color:var(--muted);font-size:.85rem">' + esc2(cn.what) + '</span></h3>' +
          '<p style="margin:4px 0 10px;font-size:.94rem">' + verdict + '</p>' +
          '<div class="sizebars" style="margin-top:0">' +
          bar('Length', c.loa_m, cn.loa_m) + bar('Beam', c.beam_m, cn.beam_m) + bar('Draft', c.draft_m, cn.draft_m) +
          '</div></div></div>';
      }).join('');
      try { if (history.replaceState) history.replaceState(null, '', '#' + a.slug); } catch(e){}
    }
    sel.addEventListener('change', render);
    $('cfRandom').addEventListener('click', function(){
      sel.value = D[Math.floor(Math.random() * D.length)].slug; render();
    });
    var shareBtn = $('cfShare');
    shareBtn.addEventListener('click', function(){
      var url = location.origin + location.pathname + location.hash;
      var done = function(){ shareBtn.textContent = 'Copied ✓'; setTimeout(function(){ shareBtn.textContent = 'Copy link to this verdict'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(done, function(){ window.prompt('Copy this link:', url); }); }
      else { window.prompt('Copy this link:', url); }
    });
    var h = decodeURIComponent(location.hash.replace('#',''));
    sel.value = get(h) ? h : 'ever-given';
    render();
  }
  if (window.SHIPS) init();
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
</script>`
});

/* ---------- Captain: the ship game ----------
   A full-viewport canvas game, so it does NOT go through renderPage() — the site
   layout's nav and footer would fight a fixed canvas for the viewport. It is
   emitted verbatim from build/templates/play.html and registered here so it still
   lands in the sitemap and the link audit like every other page. */
{
  const gameSrc = path.join(ROOT, 'templates', 'play.html');
  const game = fs.readFileSync(gameSrc, 'utf8');
  fs.writeFileSync(path.join(SITE, 'play.html'), game);
  BUILT_PAGES.push({ file: 'play.html', urlPath: '/play', indexable: true });
  pages.push({ path: '/play', sitemap: true });
}

/* ---------- the silhouette quiz ---------- */
renderPage({
  file: 'quiz.html', urlPath: '/quiz',
  title: 'The Silhouette Quiz — can you name the ship?',
  description: 'A side profile appears. Four names. One is right. How long a streak can you build from ' + S.length + ' ships drawn to true scale? No prizes, just honour.',
  jsonld: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'The Silhouette Quiz', url: 'https://ships.fyi/quiz' },
  content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › Quiz</div>
<h1>The Silhouette Quiz</h1>
<p class="lead">A side profile appears. Four names. One is right. All ${S.length} ships, drawn to true scale — how long a streak can you build?</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<div class="quizcard">
<div class="qstat"><span>Streak <b class="num" id="qStreak">0</b></span><span>Best <b class="num" id="qBest">0</b></span></div>
<div class="qsil" id="qSil" aria-hidden="true"></div>
<div class="qopts" id="qOpts"></div>
<p class="qmsg" id="qMsg" aria-live="polite">&nbsp;</p>
<div class="qrow"><button class="fchip" type="button" id="qSkip">Skip &rarr;</button><button class="fchip" type="button" id="qShare">Share my streak</button></div>
</div>
</div></section>
<script>
(function(){
  var QD = ${JSON.stringify(S.map(x => ({ n: x.name, s: silUse(x) })))};
  var sil = document.getElementById('qSil'), opts = document.getElementById('qOpts'), msg = document.getElementById('qMsg');
  var stEl = document.getElementById('qStreak'), bEl = document.getElementById('qBest');
  if (!sil) return;
  var streak = 0, best = 0, cur = -1, lock = false;
  try { best = parseInt(localStorage.getItem('shfyi.quiz.best') || '0', 10) || 0; } catch (e) {}
  bEl.textContent = best;
  function pick() {
    lock = false; msg.innerHTML = '&nbsp;';
    var i; do { i = Math.floor(Math.random() * QD.length); } while (i === cur);
    cur = i;
    sil.innerHTML = QD[i].s;
    var set = [i];
    while (set.length < 4) { var r = Math.floor(Math.random() * QD.length); if (set.indexOf(r) < 0) set.push(r); }
    set.sort(function(){ return Math.random() - 0.5; });
    opts.innerHTML = set.map(function(k){ return '<button type="button" class="qopt" data-k="' + k + '">' + QD[k].n + '</button>'; }).join('');
  }
  opts.addEventListener('click', function(e){
    var btn = e.target.closest ? e.target.closest('.qopt') : null;
    if (!btn || lock) return;
    lock = true;
    var k = parseInt(btn.getAttribute('data-k'), 10);
    if (k === cur) {
      btn.classList.add('ok'); streak++;
      if (streak > best) { best = streak; bEl.textContent = best; try { localStorage.setItem('shfyi.quiz.best', String(best)); } catch (e2) {} }
      stEl.textContent = streak;
      msg.textContent = 'Correct — it\\u2019s the ' + QD[cur].n + '.';
      setTimeout(pick, 750);
    } else {
      btn.classList.add('no');
      [].forEach.call(opts.querySelectorAll('.qopt'), function(o){ if (parseInt(o.getAttribute('data-k'), 10) === cur) o.classList.add('ok'); });
      streak = 0; stEl.textContent = 0;
      msg.textContent = 'It was the ' + QD[cur].n + '. Streak reset.';
      setTimeout(pick, 1600);
    }
  });
  document.getElementById('qSkip').addEventListener('click', function(){ if (!lock) { streak = 0; stEl.textContent = 0; pick(); } });
  document.getElementById('qShare').addEventListener('click', function(){
    var t = 'My best streak naming ship silhouettes is ' + best + ' \\uD83D\\uDEA2 Try it: https://ships.fyi/quiz';
    try { navigator.clipboard.writeText(t); msg.textContent = 'Copied — paste it anywhere.'; } catch (e) { msg.textContent = t; }
  });
  pick();
})();
</script>`
});

/* ---------- SHIPYARD + CATEGORY pages (real hubs, computed from the dataset) ---------- */
function fitDesc(s) {
  if (s.length > 160) s = s.slice(0, 157).replace(/[\s,\u2014-]+\S*$/, '') + '…';
  while (s.length < 110) s += ' Every number sourced and dated.';
  return s.length > 160 ? s.slice(0, 159) + '…' : s;
}
function miniTable(list) {
  const rows = list.slice().sort((x, y) => y.core.loa_m - x.core.loa_m).map(a =>
    `<tr><td><a href="/ships/${a.slug}">${esc(a.name)}</a></td><td>${esc(a.category)}</td><td class="num">${a.core.loa_m.toFixed(2)} m</td><td class="num">${a.core.beam_m ? a.core.beam_m.toFixed(2) + ' m' : '—'}</td><td class="num">${a.core.delivered || '—'}</td><td style="color:var(--muted);font-size:.88em">${esc(a.status)}</td></tr>`).join('\n');
  return `<div class="specwrap"><table class="spec">
<thead><tr><th>Ship</th><th>Category</th><th>Length</th><th>Beam</th><th>Delivered</th><th>Status</th></tr></thead>
<tbody>${rows}</tbody></table></div>`;
}
function groupStats(list) {
  const longest = list.slice().sort((x, y) => y.core.loa_m - x.core.loa_m)[0];
  const years = list.map(a => a.core.delivered).filter(Boolean).sort();
  const alive = list.filter(a => /^in service/i.test(a.status)).length;
  const items = [
    ['Ships here', String(list.length)],
    ['Longest', longest.core.loa_m.toFixed(2) + ' m'],
    ['Deliveries', years.length ? `${years[0]}–${years[years.length - 1]}` : '—'],
    ['Still in service', String(alive)]
  ];
  return `<div class="statstrip">${items.map(i => `<div class="ss"><span class="k">${esc(i[0])}</span><span class="v num">${esc(i[1])}</span></div>`).join('')}</div>`;
}

for (const m of YD) {
  const list = byYard(m);
  if (!list.length) continue;
  const longest = list.slice().sort((x, y) => y.core.loa_m - x.core.loa_m)[0];
  renderPage({
    file: `shipyards/${m.slug}.html`, urlPath: `/shipyards/${m.slug}`, current: '',
    title: `${m.name} ships — every giant, sourced`.slice(0, 60),
    description: fitDesc(`${m.tagline} ${list.length} ${m.name} ship${list.length === 1 ? '' : 's'} on ships.fyi, led by the ${longest.name} — full specs, silhouettes and operators.`),
    jsonld: { '@context': 'https://schema.org', '@type': 'Organization', name: m.name, foundingDate: String(m.founded), url: `https://ships.fyi/shipyards/${m.slug}` },
    content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › <a href="/shipyards">Shipyards</a> › ${esc(m.name)}</div>
<h1>${esc(m.name)}</h1>
<p class="kicker" style="margin-top:2px">${esc(m.country)} · Founded ${m.founded}</p>
<p class="lead">${esc(m.tagline)}</p>
${groupStats(list)}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The yard</span>
<h2 class="title">The story so far</h2>
${m.prose.map(p => `<p>${esc(p)}</p>`).join('\n')}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The line-up</span>
<h2 class="title">${esc(m.name)} ships</h2>
<p class="sub">Side profiles are sized by real length overall — longer ships draw bigger. Categories are never mixed.</p>
${MACRO.map(mg => {
  const gl = list.filter(a => mg.cats.includes(a.category)).sort((x, y) => (y.core.loa_m || 0) - (x.core.loa_m || 0));
  if (!gl.length) return '';
  return `<div class="fgroup">
<div class="fgroup-head"><h3><a href="${mg.href}">${esc(mg.name)}</a></h3><span class="fgroup-n">${gl.length} ship${gl.length === 1 ? '' : 's'}</span></div>
${gl.length > 1 ? `<div class="allineup" style="margin-bottom:16px">${gl.map(x => `<a class="lu" href="/ships/${x.slug}" style="flex:${x.core.loa_m || 100} 1 0"><span class="lu-s">${silScaled(x)}</span><span class="lu-n">${esc(shortName(x))}</span></a>`).join('')}</div>` : ''}
<div class="grid2 cardgrid">${gl.map(shipCard).join('\n')}</div>
</div>`;
}).join('\n')}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Side by side</span>
<h2 class="title">Every ship, ranked by length</h2>
${miniTable(list)}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow" style="display:block">Sources</span>
<ul style="list-style:none;margin:10px auto 0;padding:0;max-width:64ch;text-align:left">
${m.sources.map(s => `<li style="margin-bottom:8px"><a href="${esc(s.url)}" rel="noopener" target="_blank" style="color:var(--muted);font-size:.88rem">${esc(s.name)} &nearr;</a></li>`).join('\n')}
</ul>
</div></section>`
  });
}

renderPage({
  file: 'shipyards.html', urlPath: '/shipyards', current: '',
  title: 'Shipyards — who builds the giants of the sea',
  description: fitDesc(`Every shipyard on ships.fyi, from Meyer Turku and Saint-Nazaire to the giant yards of Korea, China and Japan — line-ups, record deliveries and full sourced specs.`),
  jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Shipyards', url: 'https://ships.fyi/shipyards' },
  content: `
<section class="hero"><div class="wrap">
<h1>The people who <span class="em">build</span> them.</h1>
<p class="lead">Thirteen shipyards, one line-up each — every giant they built that appears on this site, with record deliveries and true-scale silhouettes.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The builders</span>
<h2 class="title">Every shipyard</h2>
<div class="pillars two">
${YD.map(m => {
  const list = byYard(m);
  const longest = list.slice().sort((x, y) => y.core.loa_m - x.core.loa_m)[0];
  return `<article class="acard">
<h3><a href="/shipyards/${m.slug}">${esc(m.name)}</a></h3>
<p class="kicker">${esc(m.country)} · Founded ${m.founded} · ${list.length} ship${list.length === 1 ? '' : 's'} here</p>
<p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">${esc(m.tagline)}</p>
<p style="font-size:.86rem;color:var(--muted);margin:0 0 14px">Longest: <b style="color:var(--text)">${esc(longest.name)}</b> · ${longest.core.loa_m.toFixed(2)} m</p>
<a class="mini" href="/shipyards/${m.slug}">Open the line-up &rarr;</a>
</article>`;
}).join('\n')}
</div>
</div></section>`
});

for (const t of TY) {
  const list = byType(t);
  if (!list.length) continue;
  const longest = list.slice().sort((x, y) => y.core.loa_m - x.core.loa_m)[0];
  renderPage({
    file: `categories/${t.slug}.html`, urlPath: `/categories/${t.slug}`, current: '',
    title: `${t.name} — explained and compared`.slice(0, 60),
    description: fitDesc(`${t.tagline} ${list.length} on ships.fyi, led by the ${longest.name} — sourced specs, true-scale silhouettes and every operator.`),
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: t.name, url: `https://ships.fyi/categories/${t.slug}` },
    content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › <a href="/categories">Categories</a> › ${esc(t.name)}</div>
<h1>${esc(t.name)}</h1>
<p class="lead">${esc(t.tagline)}</p>
${groupStats(list)}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">What it means</span>
<h2 class="title">The category, explained</h2>
${t.prose.map(p => `<p>${esc(p)}</p>`).join('\n')}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The ships</span>
<h2 class="title">Every one here</h2>
<p class="sub">Side profiles are sized by real length overall — longer ships draw bigger.</p>
${list.length > 1 ? `<div class="allineup" style="margin-bottom:20px">${list.slice().sort((x, y) => (y.core.loa_m || 0) - (x.core.loa_m || 0)).map(x => `<a class="lu" href="/ships/${x.slug}" style="flex:${x.core.loa_m || 100} 1 0"><span class="lu-s">${silScaled(x)}</span><span class="lu-n">${esc(shortName(x))}</span></a>`).join('')}</div>` : ''}
<div class="filterbar colsbar" role="group" aria-label="Grid columns">
<span class="fsort-lbl">Grid</span>
<button class="fchip cols-d" type="button" data-cols="2" aria-pressed="true">2 columns</button>
<button class="fchip cols-d" type="button" data-cols="3" aria-pressed="false">3</button>
<button class="fchip cols-d" type="button" data-cols="4" aria-pressed="false">4</button>
<button class="fchip cols-m" type="button" data-cols="m1" aria-pressed="false">1 column</button>
<button class="fchip cols-m" type="button" data-cols="m2" aria-pressed="true">2</button>
</div>
<div class="grid2 cardgrid">${list.slice().sort((x, y) => (y.core.loa_m || 0) - (x.core.loa_m || 0)).map(shipCard).join('\n')}</div>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Side by side</span>
<h2 class="title">Ranked by length</h2>
${miniTable(list)}
</div></section>`
  });
}

renderPage({
  file: 'categories.html', urlPath: '/categories', current: '',
  title: 'Ship categories — every kind of giant explained',
  description: fitDesc(`Cruise ships, container ships, tankers, gas carriers, bulk giants and the heavy-lift category-benders — every category of giant explained and compared at true scale.`),
  jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Ship categories', url: 'https://ships.fyi/categories' },
  content: `
<section class="hero"><div class="wrap">
<h1>Every kind of <span class="em">ship</span>, explained.</h1>
<p class="lead">Six categories, from the floating resorts to the half-million-tonne crude carriers and the twin-hulled giant that lifts oil platforms whole — each one defined, illustrated and ranked in its own honest unit.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The categories</span>
<h2 class="title">Every category</h2>
<div class="pillars two">
${TY.map(t => {
  const list = byType(t);
  const longest = list.slice().sort((x, y) => y.core.loa_m - x.core.loa_m)[0];
  return `<article class="acard">
<h3><a href="/categories/${t.slug}">${esc(t.name)}</a></h3>
<p class="kicker">${list.length} ship${list.length === 1 ? '' : 's'} here</p>
<p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">${esc(t.tagline)}</p>
<p style="font-size:.86rem;color:var(--muted);margin:0 0 14px">Longest: <b style="color:var(--text)">${esc(longest.name)}</b> · ${longest.core.loa_m.toFixed(2)} m</p>
<a class="mini" href="/categories/${t.slug}">Open the category &rarr;</a>
</article>`;
}).join('\n')}
</div>
</div></section>`
});

for (const h of HUBS) {
  renderPage({
    file: `${h.slug}.html`, urlPath: `/${h.slug}`, current: '',
    title: `${h.name} — ships.fyi`, description: h.description, sitemap: false,
    jsonld: { '@context': 'https://schema.org', '@type': 'WebPage', name: h.name, url: `https://ships.fyi/${h.slug}` },
    content: `
<section class="hero"><div class="wrap">
<h1>${esc(h.name)}</h1>
<p class="kicker" style="margin-top:2px">${esc(h.phase)}</p>
<p class="lead">${esc(h.description)}</p>
<div class="heroCtas"><a class="btn" href="/#fleet">Browse the fleet built so far</a></div>
</div></section>`
  });
}

/* ---------- search index: everything on the site, one small file ---------- */

/* Abbreviations people type but that appear nowhere in an operator's formal name.
   Straight from Search Console: "ncl ships", "rccl", "hal ships". */
const LINE_ALIASES = {
  'norwegian': 'ncl norwegian cruise line',
  'royal-caribbean': 'rccl rci royal caribbean international',
  'holland-america': 'hal holland america',
  'msc-cruises': 'msc cruises',
  'p-and-o': 'p and o p&o pando',
  'celebrity': 'celebrity cruises x',
  'princess-cruises': 'princess',
  'disney-cruise-line': 'dcl disney',
  'carnival': 'ccl carnival',
  'costa': 'costa crociere',
  'cunard': 'cunard line',
  'aida': 'aida'
};
const SEARCH = [
  ...S.map(a => ({ t: a.name, u: `/ships/${a.slug}`, k: 'Ship', d: `${opName(a)} · ${a.status}`,
    w: HOT[a.slug] || 0,
    q: [a.name, opName(a),
        ...(a.operators || []).map(o => { const al = LN.find(x => x.slug === o.line); return al ? al.name : (o.name || ''); }),
        a.builder, a.category, shortName(a), a.slug, a.slug.replace(/-/g, ' '), (a.headline || '')].join(' ').toLowerCase() })),
  ...YD.map(m => ({ t: m.name, u: `/shipyards/${m.slug}`, k: 'Shipyard', d: `${byYard(m).length} ships`,
    q: [m.name, ...(m.matches || [])].join(' ').toLowerCase() })),
  ...LN.map(x => ({ t: x.name, u: `/lines/${x.slug}`, k: 'Line', d: `${byLine(x.slug).length} ships here · ${x.country}`,
    w: HOT[x.slug] || 0,
    /* strong terms: what this line actually IS and what it operates */
    q: [x.name, x.cc || '', x.kind || '', x.country, LINE_ALIASES[x.slug] || '',
        ...byLine(x.slug).map(r => r.ship.name)].join(' ').toLowerCase(),
    /* weak terms: ownership. Celebrity is owned by Royal Caribbean Group, but a
       search for "royal caribbean" wants Royal Caribbean, not its stablemates. */
    qw: [x.alliance || ''].join(' ').toLowerCase() })),
  ...TY.map(t => ({ t: t.name, u: `/categories/${t.slug}`, k: 'Category', d: `${byType(t).length} ships`,
    q: [t.name, ...(t.cats || [])].join(' ').toLowerCase() })),
  ...EX.map(e => ({ t: e.name.split(' — ')[0], u: `/explained/${e.slug}`, k: 'Explained', d: e.tagline,
    q: [e.name, e.tagline].join(' ').toLowerCase() })),
  ...POSTS.map(p => ({ t: p.title, u: `/blog/${p.slug}`, k: 'Blog', d: p.dek.slice(0, 70) + '…',
    q: [p.title, p.dek, ...(p.tags || [])].join(' ').toLowerCase() })),
  ...COMPARES.map(([x, y]) => ({ t: `${shortName(x)} vs ${shortName(y)}`, u: `/compare/${x.slug}-vs-${y.slug}`, k: 'Matchup', d: 'Written verdict + true-scale drawing',
    q: `${x.name} ${y.name} ${shortName(x)} ${shortName(y)} vs compare`.toLowerCase() })),
  ...RECORD_BOARDS.map(r => ({ t: r.h1, u: r.urlPath, k: 'Records', d: r.lead.slice(0, 70) + '…', q: r.h1.toLowerCase() })),
  { t: 'Get cruise-ready', u: '/cruise', k: 'Guide', d: 'Packing, first-cruise know-how, the ships', w: 25, q: 'cruise ready guides packing checklist first cruise tips' },
  { t: 'Cruise packing list', u: '/cruise/packing-list', k: 'Guide', d: 'Interactive checklist, saves progress', w: 30, q: 'what to pack for a cruise packing list checklist bring luggage' },
  { t: 'First cruise guide', u: '/cruise/first-cruise-guide', k: 'Guide', d: 'What to actually expect aboard', q: 'first cruise guide tips embarkation gratuities seasickness dining what to expect' },
  { t: 'Beat seasickness', u: '/cruise/seasickness', k: 'Guide', d: 'Prevent it, and what to pack', w: 28, q: 'seasickness cruise motion sickness prevent remedy wristbands sea bands ginger cabin midship how to avoid feeling sick boat' },
  { t: 'Scared to cruise?', u: '/cruise/fear-of-cruising', k: 'Guide', d: 'Overcome the fear of sailing', w: 26, q: 'scared of cruising fear afraid nervous anxiety cruise ship rolling capsize open water phobia overcome first time' },
  { t: 'Cruise port safety', u: '/cruise/port-safety', k: 'Guide', d: 'Stay safe ashore, don\'t miss the ship', w: 26, q: 'cruise port safety ashore all aboard time ship time local time miss the ship left behind tender excursion stay safe abroad' },
  { t: 'How big is a cruise ship?', u: '/cruise/how-big-is-a-cruise-ship', k: 'Guide', d: 'The honest scale of the giants', q: 'how big is a cruise ship size compared titanic length' },
  { t: 'Compare ships', u: '/compare', k: 'Tool', d: 'Any three ships at true scale', q: 'compare tool scale engine side by side' },
  { t: 'Canal-Fit Checker', u: '/canal-fit', k: 'Tool', d: 'Panamax to Chinamax, instantly', q: 'canal fit panamax neopanamax suezmax malaccamax seawaymax chinamax does it fit' },
  { t: 'Ships in Storm & Rogue Waves', u: '/ships-in-storm', k: 'Guide', d: 'Capsize angles, rogue waves & storm survival', w: 30, q: 'ships in storm heavy weather capsize heel angle rogue wave freak wave monster wave draupner stability point of no return how many degrees lean survive biggest wave ever recorded' },
  { t: 'Methodology', u: '/methodology', k: 'Reference', d: 'How every number is calculated', q: 'methodology sources how we calculate data' }
];
fs.writeFileSync(path.join(SITE, 'assets', 'js', 'search-index.js'),
  '/* GENERATED by build.js — do not edit by hand. */\nwindow.SEARCH_INDEX = ' + JSON.stringify(SEARCH) + ';\n');
console.log(`  · search index: ${SEARCH.length} entries`);

/* ---------- the client data file: GENERATED from data/ships.json, never hand-edited ---------- */
fs.mkdirSync(path.join(SITE, 'assets', 'js'), { recursive: true });
fs.writeFileSync(path.join(SITE, 'assets', 'js', 'ships-data.js'),
  '/* GENERATED by build.js from data/ships.json — do not edit by hand, your changes will be overwritten. */\n' +
  'window.SHIPS = ' + JSON.stringify(S.map(a => ({
    slug: a.slug, name: a.name, short: shortName(a), builder: a.builder, op: opName(a),
    type: typeOf(a), typeName: (TY.find(t => t.slug === typeOf(a)) || {}).name || '',
    status: a.status, identity: a.identity, core: a.core, vb: a.vb, sil: SIL[a.slug], hue: silHue(a.slug), funnel: silFunnel(a.slug)
  }))) + ';\n' +
  'window.VERDICTS = ' + JSON.stringify(Object.fromEntries(VERDICTS)) + ';\n' +
  'window.COMPARE_PAGES = ' + JSON.stringify(COMPARES.map(([x, y]) => pk(x.slug, y.slug))) + ';\n');

/* ---------- COMPARE: one tool, any three ships ---------- */
renderPage({
  file: 'compare.html', urlPath: '/compare', current: 'compare', ogImage: 'compare-tool.png',
  title: 'Compare ships — side by side, at true scale',
  description: 'Pick any two or three ships and see them drawn at true relative scale, with every specification side by side. ' + S.length + ' ships, from Ideal X to Prelude.',
  jsonld: { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'ships.fyi Compare', applicationCategory: 'ReferenceApplication', url: 'https://ships.fyi/compare', operatingSystem: 'Any' },
  head: '<script src="/assets/js/ships-data.js" defer></script>',
  content: `
<section class="hero"><div class="wrap">
<h1>Compare any <span class="em">three</span> ships.</h1>
<p class="lead">Drawn to true relative scale from sourced figures — against a 1.75 m person and a full football pitch — with every specification side by side. Same metres, same pixels, no artistic licence.</p>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<div class="cmpPicks" id="cmpPicks">
<label class="pick"><span>Ship one</span><select id="selA"></select></label>
<label class="pick"><span>Ship two</span><select id="selB"></select></label>
<label class="pick"><span>Ship three <i>(optional)</i></span><select id="selC"></select></label>
</div>
<div class="cmpBar">
<button class="btn ghost sm" type="button" id="cmpSwap">Swap one &amp; two</button>
<button class="btn ghost sm" type="button" id="cmpRandom">Surprise me</button>
<button class="btn ghost sm" type="button" id="cmpUnits">Switch to imperial</button>
<button class="btn ghost sm" type="button" id="cmpShare">Copy link to this comparison</button>
</div>

<div class="scaleStage" id="cmpStage"><svg viewBox="0 0 1200 430" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Selected ships drawn at true relative scale" id="cmpSvg"></svg></div>
<p class="sub" id="cmpNote" style="margin-top:12px"></p>
<div id="cmpVerdict" hidden style="margin-top:20px"></div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The numbers</span>
<h2 class="title">Every specification, side by side</h2>
<div class="tablewrap"><table class="spec" id="cmpTable"><thead id="cmpHead"></thead><tbody id="cmpBody"></tbody></table></div>
<p class="verified" style="margin-top:14px">Green marks the largest figure in each row — within like units only. Every number comes from the sourced spec table on that ship's own page. Spot an error? <a href="mailto:${DATA.site.corrections}" style="color:var(--gold)">${esc(DATA.site.corrections)}</a></p>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Popular matchups</span>
<h2 class="title">The ones everybody asks about</h2>
<p class="sub" style="margin-bottom:18px">Every other combination lives in the tool above. These six get a page of their own because they are the ones people actually search for.</p>
<div class="pillars two">
${COMPARES.slice(0, 6).map(([x, y]) => `<article class="acard"><h3><a href="/compare/${x.slug}-vs-${y.slug}">${esc(shortName(x))} vs ${esc(shortName(y))}</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">A written verdict, both ships at true scale, and the full difference table.</p><a class="mini" href="/compare/${x.slug}-vs-${y.slug}">Read the matchup &rarr;</a></article>`).join('\n')}
</div>
</div></section>

<script>
(function(){
  function init(){
  var D = window.SHIPS || [];
  if (!D.length) return;
  var $ = function(id){ return document.getElementById(id); };
  var selA = $('selA'), selB = $('selB'), selC = $('selC'), svg = $('cmpSvg');
  var imperial = false;
  try { imperial = localStorage.getItem('shfyi.units') === 'imperial'; } catch(e){}

  /* --- dropdowns, grouped by category --- */
  var groups = {};
  D.forEach(function(a){ (groups[a.typeName] = groups[a.typeName] || []).push(a); });
  function fill(sel, allowNone){
    var html = allowNone ? '<option value="">— none —</option>' : '';
    Object.keys(groups).forEach(function(g){
      html += '<optgroup label="' + g + '">';
      groups[g].slice().sort(function(p,q){ return p.name.localeCompare(q.name); })
        .forEach(function(a){ html += '<option value="' + a.slug + '">' + a.name + '</option>'; });
      html += '</optgroup>';
    });
    sel.innerHTML = html;
  }
  fill(selA, false); fill(selB, false); fill(selC, true);

  var get = function(s){ return D.find(function(a){ return a.slug === s; }); };
  function picked(){
    return [selA.value, selB.value, selC.value].map(get).filter(Boolean);
  }

  /* --- true scale: one px-per-metre for everything on the waterline --- */
  var W = 1200, H = 430, GROUND = 366, PAD = 34, GAP = 40, HUMAN = 1.75, PITCH = 105;
  function draw(){
    var items = picked();
    if (!items.length) return;
    var spans = items.reduce(function(t,a){ return t + a.core.loa_m; }, 0) + PITCH + 1.4;
    var K = (W - PAD*2 - GAP*(items.length + 1)) / spans;
    var out = '<line x1="0" y1="' + GROUND + '" x2="' + W + '" y2="' + GROUND + '" stroke="#0E141C" stroke-width="1.5" opacity=".35"/>';
    var x = PAD;
    items.forEach(function(a){
      var w = a.core.loa_m * K * (480/460), vh = a.vb.h;
      var h = w * (vh/480);
      var cx = x + (a.core.loa_m * K) / 2;
      var y = GROUND - ((118 - a.vb.top) / vh) * h;
      out += '<svg x="' + (cx - w/2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" viewBox="0 ' + a.vb.top + ' 480 ' + vh + '" style="color:' + (a.hue || '#0E141C') + (a.funnel ? ';--sil-funnel:' + a.funnel : '') + '"><g fill="currentColor">' + a.sil + '</g></svg>';
      out += '<text x="' + cx.toFixed(1) + '" y="' + (GROUND + 24) + '" text-anchor="middle" class="sl">' + a.short + '</text>';
      out += '<text x="' + cx.toFixed(1) + '" y="' + (GROUND + 42) + '" text-anchor="middle" class="sl2">' + a.core.loa_m.toFixed(1) + ' m long · ' + a.core.beam_m.toFixed(1) + ' m beam</text>';
      x += a.core.loa_m * K + GAP;
    });
    var pw = PITCH*K;
    out += '<rect x="' + x.toFixed(1) + '" y="' + (GROUND-3).toFixed(1) + '" width="' + pw.toFixed(1) + '" height="3" rx="1.5" fill="#334155"/>';
    out += '<text x="' + (x+pw/2).toFixed(1) + '" y="' + (GROUND+24) + '" text-anchor="middle" class="sl2">Pitch · 105 m</text>';
    x += pw + GAP*0.5;
    var hh = HUMAN*K, hw = Math.max(1.6, hh*0.26);
    out += '<rect x="' + x.toFixed(1) + '" y="' + (GROUND-hh).toFixed(1) + '" width="' + hw.toFixed(1) + '" height="' + Math.max(1.2, hh).toFixed(1) + '" rx="' + (hw/2).toFixed(1) + '" fill="#334155"/>';
    out += '<text x="' + (x+hw/2).toFixed(1) + '" y="' + (GROUND+24) + '" text-anchor="middle" class="sl2">1.75 m</text>';
    svg.innerHTML = out;
    $('cmpNote').textContent = items.map(function(a){ return a.name; }).join(' · ') + ' — all drawn at the same scale, floating on the same waterline. The person is drawn honestly: next to these hulls, you are a pixel.';
  }

  /* --- the spec table --- */
  var ROWS = [
    { k:'loa_m',      label:'Length overall', imp: function(v){ return (v*3.28084).toFixed(0) + ' ft'; },  fmt: function(v){ return v.toFixed(2) + ' m'; } },
    { k:'beam_m',     label:'Beam',           imp: function(v){ return (v*3.28084).toFixed(1) + ' ft'; },  fmt: function(v){ return v.toFixed(2) + ' m'; } },
    { k:'draft_m',    label:'Draft',          imp: function(v){ return (v*3.28084).toFixed(1) + ' ft'; },  fmt: function(v){ return v.toFixed(1) + ' m'; } },
    { k:'gt',         label:'Gross tonnage',  fmt: function(v){ return v.toLocaleString('en-US') + ' GT'; } },
    { k:'teu',        label:'Capacity (TEU)', fmt: function(v){ return v.toLocaleString('en-US') + ' TEU'; } },
    { k:'dwt',        label:'Deadweight',     imp: function(v){ return Math.round(v*1.10231).toLocaleString('en-US') + ' US tons'; }, fmt: function(v){ return v.toLocaleString('en-US') + ' t'; } },
    { k:'passengers', label:'Passengers',     fmt: function(v){ return v.toLocaleString('en-US'); } },
    { k:'speed_kn',   label:'Speed',          imp: function(v){ return (v*1.15078).toFixed(1) + ' mph'; }, fmt: function(v){ return v + ' kn'; } },
    { k:'delivered',  label:'Delivered',      fmt: function(v){ return String(v); }, noWin: true }
  ];
  function table(){
    var items = picked();
    $('cmpHead').innerHTML = '<tr><th></th>' + items.map(function(a){
      return '<th><a href="/ships/' + a.slug + '" style="color:var(--text)">' + a.short + '</a></th>'; }).join('') + '</tr>';
    var body = '';
    ROWS.forEach(function(r){
      var vals = items.map(function(a){ return a.core[r.k]; });
      if (!vals.some(function(v){ return v !== null && v !== undefined && v !== ''; })) return;
      var best = r.noWin ? null : Math.max.apply(null, vals.filter(function(v){ return typeof v === 'number'; }));
      body += '<tr><td>' + r.label + '</td>' + items.map(function(a){
        var v = a.core[r.k];
        if (v === undefined || v === null || v === '') return '<td class="num">—</td>';
        var txt = (imperial && r.imp) ? r.imp(v) : r.fmt(v);
        var win = (!r.noWin && v === best && items.length > 1 && vals.filter(function(x){ return x === best; }).length === 1);
        return '<td class="num' + (win ? ' win' : '') + '">' + txt + '</td>';
      }).join('') + '</tr>';
    });
    body += '<tr><td>Status</td>' + items.map(function(a){ return '<td>' + a.status + '</td>'; }).join('') + '</tr>';
    body += '<tr><td>Operator</td>' + items.map(function(a){ return '<td>' + (a.op || '\u2014') + '</td>'; }).join('') + '</tr>';
    body += '<tr><td>Builder</td>' + items.map(function(a){ return '<td>' + a.builder + '</td>'; }).join('') + '</tr>';
    $('cmpBody').innerHTML = body;
  }

  var V = window.VERDICTS || {}, PAGES = window.COMPARE_PAGES || [];
  function verdict(){
    var box = $('cmpVerdict');
    var items = picked();
    var key = items.length === 2 ? [items[0].slug, items[1].slug].sort().join('|') : '';
    var txt = key && V[key];
    if (!txt){ box.hidden = true; box.innerHTML = ''; return; }
    var link = PAGES.indexOf(key) > -1
      ? '<a class="mini" href="/compare/' + items[0].slug + '-vs-' + items[1].slug + '">Read the full matchup &rarr;</a>'
      : '';
    box.innerHTML = '<div class="qa"><div style="padding:20px 22px">' +
      '<span class="eyebrow">The verdict</span>' +
      '<p style="margin:8px 0 ' + (link ? '14px' : '0') + ';font-family:var(--display);font-size:1.05rem;line-height:1.55">' + txt + '</p>' + link +
      '</div></div>';
    box.hidden = false;
  }
  function render(){ draw(); table(); verdict(); hash(); }
  function hash(){
    var s = [selA.value, selB.value, selC.value].filter(Boolean).join(',');
    try { if (history.replaceState) history.replaceState(null, '', '#' + s); } catch(e){ /* file:// previews refuse this — harmless */ }
  }
  function fromHash(){
    var parts = decodeURIComponent(location.hash.replace('#','')).split(',').filter(function(p){ return get(p); });
    if (!parts.length) return false;
    selA.value = parts[0];
    if (parts.length === 1){
      var d = get(parts[0]);
      var rival = D.filter(function(a){ return a.slug !== d.slug; })
        .sort(function(p, q){
          return Math.abs(p.core.loa_m - d.core.loa_m) - Math.abs(q.core.loa_m - d.core.loa_m);
        })[0];
      selB.value = rival.slug; selC.value = '';
    } else {
      selB.value = parts[1];
      selC.value = (parts[2] && get(parts[2])) ? parts[2] : '';
    }
    return true;
  }

  [selA, selB, selC].forEach(function(s){ s.addEventListener('change', render); });
  $('cmpSwap').addEventListener('click', function(){
    var t = selA.value; selA.value = selB.value; selB.value = t; render();
  });
  $('cmpRandom').addEventListener('click', function(){
    var pool = D.slice();
    function pull(){ return pool.splice(Math.floor(Math.random()*pool.length), 1)[0].slug; }
    selA.value = pull(); selB.value = pull(); selC.value = Math.random() > 0.45 ? pull() : '';
    render();
  });
  if (imperial) $('cmpUnits').textContent = 'Switch to metric';
  $('cmpUnits').addEventListener('click', function(){
    imperial = !imperial;
    try { localStorage.setItem('shfyi.units', imperial ? 'imperial' : 'metric'); } catch(e){}
    this.textContent = imperial ? 'Switch to metric' : 'Switch to imperial';
    table();
  });

  var shareBtn = $('cmpShare');
  if (shareBtn) shareBtn.addEventListener('click', function(){
    var url = location.origin + location.pathname + location.hash;
    var done = function(){ shareBtn.textContent = 'Copied ✓'; setTimeout(function(){ shareBtn.textContent = 'Copy link to this comparison'; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(done, function(){ window.prompt('Copy this link:', url); }); }
    else { window.prompt('Copy this link:', url); }
  });
  if (!fromHash()){ selA.value = 'icon-of-the-seas'; selB.value = 'titanic'; selC.value = ''; }
  render();
  }
  /* deferred scripts (ships-data.js) run before DOMContentLoaded — init then, or now if already past */
  if (window.SHIPS) init();
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
</script>
<script>(function(){try{var q=new URLSearchParams(location.search);['a','b','c'].forEach(function(key,i){var el=document.getElementById('sel'+'ABC'[i]);var v=q.get(key);if(el&&v&&el.querySelector('option[value="'+v+'"]')){el.value=v;el.dispatchEvent(new Event('change'));}});}catch(e){}})();</script>`
});

/* ---------- COMPARE PAGES: static, true-scale, crawlable ---------- */
function compareSVG(a, b2) {
  const W = 1200, H = 430, GROUND = 366, PAD = 34, GAP = 40;
  const HUMAN = 1.75, PITCH = 105;
  const spans = a.core.loa_m + b2.core.loa_m + PITCH + 1.4;
  const K = (W - PAD * 2 - GAP * 3) / spans;                 // px per real-world metre
  let x = PAD, out = '';
  out += `<line x1="0" y1="${GROUND}" x2="${W}" y2="${GROUND}" stroke="#0E141C" stroke-width="1.5" opacity=".35"/>`;
  for (const d of [a, b2]) {
    const w = d.core.loa_m * K * (480 / 460), vh = d.vb.h;
    const h = w * (vh / 480);
    const cx = x + (d.core.loa_m * K) / 2;
    const y = GROUND - ((118 - d.vb.top) / vh) * h;
    out += `<svg x="${(cx - w / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" viewBox="0 ${d.vb.top} 480 ${vh}" style="${silVars(d.slug)}"><g fill="currentColor">${SIL[d.slug]}</g></svg>`;
    out += `<text x="${cx.toFixed(1)}" y="${GROUND + 24}" text-anchor="middle" class="sl">${esc(shortName(d))}</text>`;
    out += `<text x="${cx.toFixed(1)}" y="${GROUND + 42}" text-anchor="middle" class="sl2">${d.core.loa_m.toFixed(1)} m long · ${d.core.beam_m.toFixed(1)} m beam</text>`;
    x += d.core.loa_m * K + GAP;
  }
  const pw = PITCH * K;
  out += `<rect x="${x.toFixed(1)}" y="${(GROUND - 3).toFixed(1)}" width="${pw.toFixed(1)}" height="3" rx="1.5" fill="#334155"/>`;
  out += `<text x="${(x + pw / 2).toFixed(1)}" y="${GROUND + 24}" text-anchor="middle" class="sl2">Pitch · 105 m</text>`;
  x += pw + GAP * 0.5;
  const hh = HUMAN * K, hw = Math.max(1.6, hh * 0.26);
  out += `<rect x="${x.toFixed(1)}" y="${(GROUND - hh).toFixed(1)}" width="${hw.toFixed(1)}" height="${Math.max(1.2, hh).toFixed(1)}" rx="${(hw / 2).toFixed(1)}" fill="#334155"/>`;
  out += `<text x="${(x + hw / 2).toFixed(1)}" y="${GROUND + 24}" text-anchor="middle" class="sl2">1.75 m</text>`;
  return `<div class="scaleStage"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${esc(a.name)} and ${esc(b2.name)} drawn at true relative scale">${out}</svg></div>`;
}

function verdicts(a, b2) {
  const rows = [
    ['Length overall', 'loa_m', ' m', 'longer'],
    ['Beam', 'beam_m', ' m', 'wider'],
    ['Draft', 'draft_m', ' m', 'deeper'],
    ['Gross tonnage', 'gt', ' GT', 'more volume'],
    ['Capacity', 'teu', ' TEU', 'more boxes'],
    ['Deadweight', 'dwt', ' t', 'lifts more'],
    ['Passengers', 'passengers', '', 'more people'],
    ['Speed', 'speed_kn', ' kn', 'faster']
  ];
  const fmt = (v, u) => (Number.isInteger(v) ? v.toLocaleString('en-US') : v.toFixed(2)) + u;
  const oprow = `<tr><td>Operator</td><td>${esc(opName(a))}</td><td>${esc(opName(b2))}</td><td></td><td></td></tr>`;
  const trs = oprow + rows.map(([label, key, unit]) => {
    const va = a.core[key], vb = b2.core[key];
    if (!va || !vb) return '';
    const diff = Math.abs(va - vb);
    const pct = Math.round((diff / Math.min(va, vb)) * 100);
    const winner = va > vb ? shortName(a) : shortName(b2);
    return `<tr><td>${label}</td><td class="num">${fmt(va, unit)}</td><td class="num">${fmt(vb, unit)}</td><td class="num">${fmt(diff, unit)}</td><td style="font-size:.88em">${esc(winner)}${pct ? ` <span style="color:var(--muted)">+${pct}%</span>` : ''}</td></tr>`;
  }).filter(Boolean).join('\n');
  return `<div class="specwrap"><table class="spec">
<thead><tr><th></th><th>${esc(shortName(a))}</th><th>${esc(shortName(b2))}</th><th>Difference</th><th>Bigger</th></tr></thead>
<tbody>${trs}</tbody></table></div>`;
}

function compareProse(a, b2) {
  const L = a.core.loa_m > b2.core.loa_m ? [a, b2] : [b2, a];
  const dl = Math.abs(a.core.loa_m - b2.core.loa_m).toFixed(2);
  const B = a.core.beam_m > b2.core.beam_m ? [a, b2] : [b2, a];
  const db = Math.abs(a.core.beam_m - b2.core.beam_m).toFixed(2);
  const p1 = `The ${esc(L[0].name)} is the longer of the two, at ${L[0].core.loa_m.toFixed(2)} m against ${L[1].core.loa_m.toFixed(2)} m — a difference of ${dl} m. ` +
    (B[0].slug === L[0].slug
      ? `She is also the wider ship, by ${db} m of beam, so she is the bigger vessel on both hull dimensions.`
      : `Beam tells the opposite story: the ${esc(B[0].name)} is ${db} m wider, so which one is "bigger" depends on which dimension you care about.`);
  const p2 = `${esc(a.identity)} ${esc(b2.identity)} The silhouettes above are drawn at true relative scale from the sourced figures on each ship's page — same metres, same pixels, no artistic licence.`;
  let p3;
  if (a.core.gt && b2.core.gt) {
    const w = a.core.gt > b2.core.gt ? a : b2, l = a.core.gt > b2.core.gt ? b2 : a;
    p3 = `By gross tonnage — internal volume, the honest measure here — the ${esc(w.name)} is the larger ship: ${w.core.gt.toLocaleString('en-US')} GT against ${l.core.gt.toLocaleString('en-US')}.`;
  } else if (a.core.teu && b2.core.teu) {
    const w = a.core.teu > b2.core.teu ? a : b2, l = a.core.teu > b2.core.teu ? b2 : a;
    p3 = `On capacity, the ${esc(w.name)} carries more — ${w.core.teu.toLocaleString('en-US')} TEU against ${l.core.teu.toLocaleString('en-US')}.`;
  } else if (a.core.dwt && b2.core.dwt) {
    const w = a.core.dwt > b2.core.dwt ? a : b2, l = a.core.dwt > b2.core.dwt ? b2 : a;
    p3 = `By deadweight, the ${esc(w.name)} lifts more — ${w.core.dwt.toLocaleString('en-US')} t against ${l.core.dwt.toLocaleString('en-US')}.`;
  } else {
    p3 = `The two are measured in different units — one by volume or people, the other by cargo — which is why this site never ranks them on one board, and why the true-scale drawing above is the only honest single comparison.`;
  }
  return [p1, p2, p3];
}

for (const [a, b2, verdict] of COMPARES) {
  const slug = `${a.slug}-vs-${b2.slug}`;
  let title = `${shortName(a)} vs ${shortName(b2)} — size comparison`;
  if (title.length > 60) title = `${shortName(a)} vs ${shortName(b2)}`;
  if (title.length > 60) title = title.slice(0, 57) + '…';
  const related = COMPARES.filter(p => (p[0].slug === a.slug || p[1].slug === a.slug || p[0].slug === b2.slug || p[1].slug === b2.slug))
    .filter(p => `${p[0].slug}-vs-${p[1].slug}` !== slug).slice(0, 4);
  renderPage({
    file: `compare/${slug}.html`, urlPath: `/compare/${slug}`, current: '',
    ogImage: `compare-${a.slug}-vs-${b2.slug}.png`,
    title,
    description: fitDesc(`${shortName(a)} vs ${shortName(b2)}: length, beam, tonnage and capacity side by side, with both ships drawn at true relative scale against a person and a football pitch.`),
    jsonld: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: `https://ships.fyi/compare/${slug}`,
      about: [{ '@type': 'Product', name: a.name }, { '@type': 'Product', name: b2.name }] },
    content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › <a href="/compare">Compare</a> › ${esc(shortName(a))} vs ${esc(shortName(b2))}</div>
<h1>${esc(shortName(a))} vs ${esc(shortName(b2))}</h1>
<p class="lead">Both ships at true relative scale — against a 1.75 m person and a full football pitch.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
${compareSVG(a, b2)}
<p class="sub" style="margin-top:14px">Length and profile height are drawn to true scale from the sourced figures on each ship page. <a href="/compare">Compare any other ships in the live tool &rarr;</a></p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The numbers</span>
<h2 class="title">Side by side</h2>
${verdicts(a, b2)}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The verdict</span>
<h2 class="title">Which is actually bigger?</h2>
<div class="prose"><p class="verdict">${esc(verdict)}</p>
${compareProse(a, b2).map(p => `<p>${p}</p>`).join('\n')}</div>
<div class="pillars two" style="margin-top:26px">
<article class="acard"><div class="sil">${silScaled(a)}</div><h3><a href="/ships/${a.slug}">${esc(a.name)}</a></h3><p class="kicker">${esc(opName(a))} · ${esc(a.status)}</p><a class="mini" href="/ships/${a.slug}">Full specification &rarr;</a></article>
<article class="acard"><div class="sil">${silScaled(b2)}</div><h3><a href="/ships/${b2.slug}">${esc(b2.name)}</a></h3><p class="kicker">${esc(opName(b2))} · ${esc(b2.status)}</p><a class="mini" href="/ships/${b2.slug}">Full specification &rarr;</a></article>
</div>
</div></section>
${related.length ? `<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">More matchups</span>
<h2 class="title">Related comparisons</h2>
<ul style="list-style:none;margin:20px 0 0;padding:0">
${related.map(p => `<li style="margin-bottom:10px"><a class="mini" href="/compare/${p[0].slug}-vs-${p[1].slug}">${esc(shortName(p[0]))} vs ${esc(shortName(p[1]))} &rarr;</a></li>`).join('\n')}
</ul>
</div></section>` : ''}`
  });
}
console.log(`  · ${COMPARES.length} compare pages`);

/* ---------- EXPLAINED: the concepts behind the spec tables ---------- */
for (const e of EX) {
  renderPage({
    file: `explained/${e.slug}.html`, urlPath: `/explained/${e.slug}`, current: '',
    title: e.name.length > 60 ? e.name.slice(0, 57) + '…' : e.name,
    description: fitDesc(`${e.tagline} Explained plainly by ships.fyi, with the ships that prove it — sourced specifications and true-scale silhouettes.`),
    jsonld: { '@context': 'https://schema.org', '@type': 'TechArticle', headline: e.name, description: e.tagline, url: `https://ships.fyi/explained/${e.slug}` },
    content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › <a href="/explained">Explained</a> › ${esc(e.name.split(' — ')[0])}</div>
<h1>${esc(e.name)}</h1>
<p class="lead">${esc(e.tagline)}</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Explained</span>
<h2 class="title">What it actually means</h2>
<div class="prose">${e.prose.map(p => `<p>${esc(p)}</p>`).join('\n')}</div>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">See it in the data</span>
<h2 class="title">Where this shows up</h2>
<ul style="list-style:none;margin:20px 0 0;padding:0">
${e.links.map(l => `<li style="margin-bottom:10px"><a class="mini" href="${l[1]}">${esc(l[0])} &rarr;</a></li>`).join('\n')}
</ul>
</div></section>
${EX_SOURCES[e.slug] ? `<section class="section" style="padding-top:0"><div class="wrap">
${sourcesBlock(EX_SOURCES[e.slug].primary, EX_SOURCES[e.slug].further)}
<p class="verified" style="margin-top:18px">Facts checked against the primary sources above; further reading is provided for background. Spot an error? <a href="mailto:${DATA.site.corrections}" style="color:var(--gold)">${esc(DATA.site.corrections)}</a></p>
</div></section>` : ''}
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Keep reading</span>
<h2 class="title">Other concepts</h2>
<div class="pillars two">
${EX.filter(x => x.slug !== e.slug).slice(0, 4).map(x => `<article class="acard"><h3><a href="/explained/${x.slug}">${esc(x.name.split(' — ')[0])}</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">${esc(x.tagline)}</p><a class="mini" href="/explained/${x.slug}">Read it &rarr;</a></article>`).join('\n')}
</div>
</div></section>`
  });
}
renderPage({
  file: 'explained.html', urlPath: '/explained', current: '',
  title: 'Explained — the concepts behind the spec tables',
  description: 'Gross tonnage, deadweight, displacement, TEU, Panamax to Megamax, azipod drives and more — twelve plain-English guides to the ideas behind every ship spec.',
  jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Explained', url: 'https://ships.fyi/explained' },
  content: `
<section class="hero"><div class="wrap">
<h1>The ideas behind the <span class="em">numbers</span>.</h1>
<p class="lead">Every spec table on this site assumes you know what gross tonnage means, why a Panamax is that exact shape, and what the circle painted on every hull is for. Here is all of it, plainly.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The concepts</span>
<h2 class="title">Start anywhere</h2>
<div class="pillars two">
${EX.map(e => `<article class="acard"><h3><a href="/explained/${e.slug}">${esc(e.name.split(' — ')[0])}</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">${esc(e.tagline)}</p><a class="mini" href="/explained/${e.slug}">Read it &rarr;</a></article>`).join('\n')}
</div>
</div></section>`
});

/* ================= CRUISE READY: the evergreen cluster ================= */
const PACK = [
  ['Documents & money', [
    ['passport', 'Passport (valid 6+ months past sailing)', false],
    ['visas', 'Visas for every port country that needs one', false],
    ['boarding', 'Cruise boarding pass & luggage tags, printed', false],
    ['insurance', 'Travel insurance details', false],
    ['cards', 'Two payment cards, kept separately', false],
    ['cash', 'Small bills for port tips and taxis', false],
    ['copies', 'Photocopies of documents, separate from originals', false]
  ]],
  ['Clothing', [
    ['layers', 'Light layers — decks are breezy even in the tropics', false],
    ['formal', 'One formal-night outfit (check your line\u2019s dress code)', false],
    ['swim', 'Two swimsuits, so one is always dry', 'swimsuit'],
    ['shoes', 'Broken-in walking shoes for port days', 'walking shoes'],
    ['sandals', 'Deck sandals or flip-flops', 'flip flops'],
    ['jacket', 'Light rain jacket or windbreaker', 'packable rain jacket'],
    ['embarkday', 'Embarkation-day essentials in your carry-on \u2014 checked bags can take hours to reach the cabin', false]
  ]],
  ['Health & comfort', [
    ['meds', 'Prescription meds in original packaging, in carry-on', false],
    ['seasick', 'Seasickness remedies \u2014 bands, tablets or patches', 'travel sickness bands'],
    ['sunscreen', 'Reef-safe sunscreen \u2014 port shops charge triple', 'reef safe sunscreen'],
    ['painkillers', 'Basic painkillers & plasters', 'travel first aid kit'],
    ['sanitizer', 'Hand sanitizer for port excursions', 'travel hand sanitizer']
  ]],
  ['Tech & cabin', [
    ['powerstrip', 'Non-surge power strip or multi-USB hub \u2014 cabins are outlet-poor (surge-protected strips are banned aboard)', 'cruise approved non surge power strip'],
    ['magnets', 'Magnetic hooks \u2014 cabin walls are steel, hang everything', 'strong magnetic hooks'],
    ['lanyard', 'Lanyard or clip for your cruise card', 'cruise lanyard card holder'],
    ['waterproof', 'Waterproof phone pouch for beach days', 'waterproof phone pouch'],
    ['binoculars', 'Compact binoculars \u2014 sail-ins are the best show aboard', 'compact binoculars'],
    ['downloads', 'Offline downloads done \u2014 ship wifi is better than it was, but not that much better', false]
  ]]
];
const packItem = ([id, label, shop]) =>
  `<li class="pk"><label><input type="checkbox" data-pk="${id}"><span>${label}</span></label>${shop ? `<a class="pk-shop" href="${amz(shop)}" target="_blank" rel="sponsored nofollow noopener" aria-label="Shop ${esc(shop)} on Amazon">shop &nearr;</a>` : ''}</li>`;

renderPage({
  file: 'cruise/packing-list.html', urlPath: '/cruise/packing-list', current: 'cruise',
  title: 'Cruise packing list — the interactive checklist',
  description: fitDesc('The complete cruise packing list as an interactive checklist that remembers your progress — documents, clothing, health, tech, and the things everyone forgets.'),
  ogImage: 'cruise-packing.png',
  jsonld: { '@context': 'https://schema.org', '@type': 'HowTo', name: 'How to pack for a cruise',
    description: 'The complete cruise packing checklist, from documents to the cabin tricks regulars swear by.',
    step: PACK.map(([g]) => ({ '@type': 'HowToStep', name: 'Pack ' + g.toLowerCase() })) },
  content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › <a href="/cruise">Cruise ready</a> › Packing list</div>
<h1>The cruise <span class="em">packing list</span>.</h1>
<p class="lead">Everything worth bringing aboard, and nothing that isn't — as a checklist that remembers your progress on this device. Tick as you pack; it'll be waiting when you come back.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<div class="cmpBar" style="margin-bottom:6px">
<span class="fchip" id="pkCount" aria-live="polite" style="cursor:default">0 packed</span>
<button class="btn ghost sm" type="button" id="pkPrint">Print the list</button>
<button class="btn ghost sm" type="button" id="pkReset">Start over</button>
</div>
<div id="pkBoard">
<h2 class="visually-hidden">Your packing checklist by category</h2>
${PACK.map(([g, items]) => `<div class="fgroup">
<div class="fgroup-head"><h3>${g}</h3><span class="fgroup-n">${items.length} items</span></div>
<ul class="pklist">${items.map(packItem).join('\n')}</ul>
</div>`).join('\n')}
</div>
${disclosureBox()}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Before you sail</span>
<h2 class="title">Keep getting ready</h2>
<div class="pillars two">
<article class="acard"><h3><a href="/cruise/first-cruise-guide">First cruise? Read this</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Embarkation day, dining, seasickness, gratuities — the honest guide to your first sailing.</p><a class="mini" href="/cruise/first-cruise-guide">Read the guide &rarr;</a></article>
<article class="acard"><h3><a href="/cruise/how-big-is-a-cruise-ship">How big is your ship, really?</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">See the ship you're sailing on at true scale — next to the Titanic, a football pitch, and you.</p><a class="mini" href="/cruise/how-big-is-a-cruise-ship">See the scale &rarr;</a></article>
</div>
</div></section>
<script>
(function(){
  var KEY = 'shfyi.pack';
  var board = document.getElementById('pkBoard');
  var count = document.getElementById('pkCount');
  if (!board) return;
  var boxes = [].slice.call(board.querySelectorAll('input[data-pk]'));
  function load(){ try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e){ return {}; } }
  function save(st){ try { localStorage.setItem(KEY, JSON.stringify(st)); } catch(e){} }
  var st = load();
  boxes.forEach(function(b){ b.checked = !!st[b.getAttribute('data-pk')]; });
  function paint(){
    var n = boxes.filter(function(b){ return b.checked; }).length;
    count.textContent = n + ' of ' + boxes.length + ' packed' + (n === boxes.length ? ' \u2693 ready to sail!' : '');
    boxes.forEach(function(b){
      var li = b.closest ? b.closest('.pk') : null;
      if (li) li.classList.toggle('done', b.checked);
    });
  }
  board.addEventListener('change', function(e){
    var b = e.target;
    if (!b || !b.getAttribute || !b.getAttribute('data-pk')) return;
    st[b.getAttribute('data-pk')] = b.checked;
    save(st); paint();
  });
  document.getElementById('pkReset').addEventListener('click', function(){
    st = {}; save(st);
    boxes.forEach(function(b){ b.checked = false; });
    paint();
  });
  document.getElementById('pkPrint').addEventListener('click', function(){ if (window.print) window.print(); });
  paint();
})();
</script>`
});

const FCG = [
  ['Embarkation day, decoded', 'Arrive in the port city the night before if you possibly can — the single most common way people miss a cruise is a delayed same-day flight, and the ship will not wait. Boarding itself is an airport-style flow: documents, security, a photo, and then you are aboard, usually from around midday. Your checked bags can take until evening to reach the cabin, which is why the carry-on on our packing list holds swimwear, medication and anything you need for the first afternoon. The mandatory safety drill (the muster) happens before sail-away — on most big lines it is now a quick visit to your assigned station plus a video. Then find a rail on the top deck: sail-away, with the horn sounding and the port sliding past, is the moment the trip actually begins.'],
  ['The money part nobody explains', 'Your cruise card (or wearable) is room key, ID and wallet in one — the ship is cashless, and everything you tap lands on one onboard account. Gratuities on most big lines are added automatically per person per day; they are adjustable at guest services, but know they exist before the final bill surprises you. Drinks packages only pay off past several drinks a day — do the arithmetic against your actual habits, not the brochure\u2019s. And in every port, the golden rule: the ship\u2019s clock, not local time, decides when you must be back aboard. Ships genuinely do sail without stragglers; the pier-runner videos are not staged.'],
  ['Seasickness, honestly', 'Modern giants are astonishingly stable — stabilizer fins and sheer mass mean most sailings feel like a large hotel that hums slightly. If you are prone to motion sickness, book a cabin low and midships where movement is least, keep remedies from our packing list to hand, and spend time on deck with your eyes on the horizon if a swell builds. Most people who worry about it find, by day two, that they had forgotten to worry.'],
  ['Dining and days at sea', 'Food is included nearly everywhere except the marked specialty restaurants — the main dining room is the same kitchen ambition as the paid venues more often than first-timers expect. Sea days are the ship\u2019s own show: this is when you have time for everything the vessel itself offers, which on the ships in our fleet section ranges from ten-storey slides to full Broadway productions to a quiet rail and a very big ocean. Book popular shows and specialty meals through the line\u2019s app on day one, and then let the schedule breathe.'],
  ['Know your ship before you board', 'Here is the enthusiast secret that makes normal people better cruisers: fifteen minutes learning your ship pays back all week. Look her up in our fleet pages — her length, her tonnage, her class and sisters, what makes her different — and the vessel stops being a floating corridor and becomes a place you can read. You will know why the pool deck is where it is, what that hum is, and exactly how she stacks up against the Titanic when someone asks at dinner. Someone always asks at dinner.']
];
renderPage({
  file: 'cruise/first-cruise-guide.html', urlPath: '/cruise/first-cruise-guide', current: 'cruise',
  title: 'First cruise guide — what to actually expect',
  description: fitDesc('The honest first-cruise guide: embarkation day, the onboard account, gratuities, seasickness, dining, and the fifteen-minute trick that makes any sailing better.'),
  ogImage: 'cruise-first.png',
  jsonld: { '@context': 'https://schema.org', '@type': 'Article', headline: 'First cruise: what to actually expect', url: 'https://ships.fyi/cruise/first-cruise-guide',
    author: { '@type': 'Organization', name: 'ships.fyi' }, datePublished: '2026-07-15', dateModified: '2026-07-15' },
  content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › <a href="/cruise">Cruise ready</a> › First cruise guide</div>
<h1>Your first cruise, <span class="em">decoded</span>.</h1>
<p class="lead">No brochure gloss — just the things that actually shape a first sailing, from the person in your group who reads about ships for fun.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<div class="prose">
${FCG.map(([h, p]) => `<h2 class="title" style="margin-top:34px">${h}</h2>\n<p>${p}</p>`).join('\n')}
</div>
<div class="callout" style="margin-top:34px">
<p style="margin:0 0 12px"><b>Next step: pack like you've done this before.</b> Our interactive checklist remembers your progress and covers the things everyone forgets.</p>
<a class="btn" href="/cruise/packing-list">Open the packing list &rarr;</a>
</div>
${planPanel('')}
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Meet the ships</span>
<h2 class="title">The giants you might be boarding</h2>
<div class="pillars two">
${['legend-of-the-seas', 'icon-of-the-seas', 'msc-world-europa', 'carnival-jubilee'].map(sl => { const a = S.find(x => x.slug === sl); return `<article class="acard"><div class="sil">${silScaled(a)}</div><h3><a href="/ships/${a.slug}">${esc(a.name)}</a></h3><p class="kicker">${esc(a.builder)} · ${a.core.gt.toLocaleString('en-US')} GT</p><a class="mini" href="/ships/${a.slug}">Know her before you board &rarr;</a></article>`; }).join('\n')}
</div>
</div></section>`
});

/* ================= SEASICKNESS: prepare & prevent ================= */
renderPage({
  file: 'cruise/seasickness.html', urlPath: '/cruise/seasickness', current: 'cruise',
  title: 'Seasickness on a cruise — how to prevent it',
  description: fitDesc('How to prevent and manage seasickness on a cruise: the cabin trick that matters most, acupressure wristbands, ginger, the horizon rule, and what to pack — plainly explained.'),
  ogImage: 'cruise-seasickness.png',
  jsonld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: 'How to prevent seasickness on a cruise', url: 'https://ships.fyi/cruise/seasickness',
    author: { '@type': 'Organization', name: 'ships.fyi' }, datePublished: '2026-07-15', dateModified: '2026-07-15' },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
      { '@type': 'Question', name: 'What is the best cabin to avoid seasickness?',
        acceptedAnswer: { '@type': 'Answer', text: 'Midship and low. A ship pivots around its middle like a seesaw, so a cabin in the centre on a lower deck moves the least. A window or balcony helps too, because a view of the horizon gives your brain a stable reference and reduces the sensory conflict that causes seasickness.' } },
      { '@type': 'Question', name: 'Do seasickness wristbands work?',
        acceptedAnswer: { '@type': 'Answer', text: 'Acupressure wristbands (such as Sea-Bands) press a bead against the P6 point on the inner wrist. The clinical evidence is mixed, but they are cheap, drug-free, reusable and have no side effects, so many cruisers use them as part of a stack alongside ginger and time on deck. Put them on before you feel unwell, not after.' } },
      { '@type': 'Question', name: 'When should I take seasickness medicine?',
        acceptedAnswer: { '@type': 'Answer', text: 'Before symptoms start — this is the single most important rule. Most remedies work far better as prevention than as a cure, so take them before rough water rather than once you already feel unwell. Speak to a pharmacist or doctor about which option suits you, especially for prescription patches.' } }
    ] }],
  head: '<meta property="article:published_time" content="2026-07-15T09:00:00Z">',
  content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › <a href="/cruise">Cruise ready</a> › Seasickness</div>
<h1>Seasickness, <span class="em">solved</span>.</h1>
<p class="lead">Here is the reassuring truth: most people never get seasick on a big modern cruise ship, and those who do can almost always prevent it. Seasickness is not a fixed fate — it is a sensory mismatch you can plan around. Here is exactly how.</p>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Why it happens</span>
<h2 class="title">It's a mix-up, not a weakness</h2>
<div class="prose">
<p>Seasickness happens when your inner ear feels motion your eyes can't see — you're below deck, the walls look still, but your balance sensors feel the roll. Your brain gets conflicting signals and responds with nausea. That's the whole mechanism, and understanding it is the key, because every good prevention trick works by <b>removing the conflict</b>: let your eyes see the motion your body feels, and the mismatch disappears.</p>
<p>Modern giants are also far kinder than the ships of reputation. A 360-metre cruise ship spans several waves at once and carries stabiliser fins that cancel most of the roll — on a calm-weather Caribbean or Mediterranean sailing, many passengers feel nothing at all. The dread is usually worse than the reality.</p>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Prevention</span>
<h2 class="title">The stack that works</h2>
<p class="sub">None of these is a magic bullet — but they stack. Most cruisers who call themselves "cured" are quietly running three or four of these at once.</p>
<div class="stormfacts">
<div class="sfact"><b>Cabin</b><span>The one you book in advance and can't add later: <b>midship, low deck</b>. The ship pivots around its middle, so the centre barely moves. A window or balcony for a horizon view is a bonus.</span></div>
<div class="sfact"><b>Horizon</b><span>When you feel it starting, get on deck and fix your eyes on the horizon. Free, instant, and it directly cancels the sensory conflict. Fresh air on your face helps too.</span></div>
<div class="sfact"><b>Timing</b><span>Whatever remedy you choose, use it <b>before</b> rough water, not after symptoms start. Prevention works; rescue is much harder once nausea has begun.</span></div>
<div class="sfact"><b>Ginger</b><span>The natural remedy with the best evidence. Chews, capsules or tea — genuinely settles the stomach for many people, with no drowsiness.</span></div>
<div class="sfact"><b>Wristbands</b><span>Acupressure bands press the P6 point on your wrist. Evidence is mixed but they're cheap, drug-free and side-effect-free — an easy addition to the stack.</span></div>
<div class="sfact"><b>Eat light</b><span>Plain carbs — crackers, bread, pretzels — settle the stomach. Skip heavy, greasy food and go easy on alcohol, which makes it worse. Don't skip meals entirely.</span></div>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">What to pack</span>
<h2 class="title">A simple seasickness kit</h2>
<p class="sub">Everything here is inexpensive and worth having in your day bag just in case — even if you never open it. For anything medicated, a quick word with a pharmacist or your doctor before you sail is the right move.</p>
<ul class="pklist">
<li class="pk"><span>Acupressure wristbands — the drug-free classic</span><a class="pk-shop" href="${amz('sea sickness bands')}" target="_blank" rel="sponsored nofollow noopener" aria-label="Shop acupressure wristbands on Amazon">shop &nearr;</a></li>
<li class="pk"><span>Ginger chews or capsules — best-evidence natural option</span><a class="pk-shop" href="${amz('ginger chews travel sickness')}" target="_blank" rel="sponsored nofollow noopener" aria-label="Shop ginger chews on Amazon">shop &nearr;</a></li>
<li class="pk"><span>Motion-sickness tablets — take before rough water</span><a class="pk-shop" href="${amz('motion sickness tablets')}" target="_blank" rel="sponsored nofollow noopener" aria-label="Shop motion sickness tablets on Amazon">shop &nearr;</a></li>
<li class="pk"><span>Motion-sickness glasses — trick the brain with an artificial horizon</span><a class="pk-shop" href="${amz('motion sickness glasses')}" target="_blank" rel="sponsored nofollow noopener" aria-label="Shop motion sickness glasses on Amazon">shop &nearr;</a></li>
</ul>
<p class="verified" style="margin-top:18px">As an Amazon Associate, ships.fyi earns from qualifying purchases. These are affiliate links — if you buy through them we may earn a small commission at no extra cost to you. It never changes what we recommend.</p>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">If it still hits</span>
<h2 class="title">You're not stuck with it</h2>
<div class="prose">
<p>If you feel it coming on: get outside, find the horizon, get air on your face, and sip water or a fizzy drink. Sit low and central — the buffet at the top and back of the ship is the worst place to be; a lounge low and midship is the best. Avoid reading or staring at your phone, which deepens the conflict.</p>
<p>And if you've forgotten your kit, every cruise ship's medical centre handles seasickness constantly and can help — guest services often has remedies on hand too. Persistent vomiting or symptoms that continue for days ashore deserve a doctor, but for the ordinary queasiness of a rough afternoon, the tools above almost always do the job.</p>
</div>
<div class="callout" style="margin-top:30px">
<p style="margin:0 0 12px"><b>Still nervous about the motion itself?</b> Understanding exactly how ships handle rough seas — and how far they can lean before it matters — turns fear into fascination.</p>
<a class="btn" href="/cruise/fear-of-cruising">Overcome the fear &rarr;</a><a class="btn ghost" href="/ships-in-storm">How ships handle storms</a>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<h2 class="title">Quick answers</h2>
<div data-accordion>
<details class="qa" open><summary>What's the best cabin to avoid seasickness?<i class="caret"></i></summary><div class="body">Midship and low. The ship pivots around its centre like a seesaw, so the middle moves least. A window or balcony adds a horizon view, which further reduces the sensory conflict behind seasickness. Book it early — these cabins sell out.</div></details>
<details class="qa"><summary>Do the wristbands actually work?<i class="caret"></i></summary><div class="body">The clinical evidence is genuinely mixed, but acupressure bands are cheap, reusable, drug-free and have no side effects, so they're a low-risk addition. Many cruisers find them helpful stacked with ginger and horizon time. Put them on before you feel unwell.</div></details>
<details class="qa"><summary>Will I definitely get seasick?<i class="caret"></i></summary><div class="body">Probably not. On a large modern ship in normal conditions, most passengers feel little or nothing — stabilisers and sheer size absorb the motion. If you're prone, pick a midship cabin, an itinerary with fewer open-sea days, and pack the simple kit above.</div></details>
</div>
<p class="verified" style="margin-top:20px">This page is general information, not medical advice. For medication — especially prescription patches — check with a pharmacist or doctor before you sail. Spot an error? <a href="mailto:${DATA.site.corrections}" style="color:var(--gold)">${esc(DATA.site.corrections)}</a></p>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<h2 class="title">Sources</h2>
<ul style="list-style:none;margin:14px 0 0;padding:0">
<li style="margin-bottom:8px"><a href="https://www.nhs.uk/conditions/motion-sickness/" rel="noopener" target="_blank" style="color:var(--muted);font-size:.9rem">Motion sickness — NHS &nearr;</a></li>
<li style="margin-bottom:8px"><a href="https://wwwnc.cdc.gov/travel/yellowbook/2024/preparing/motion-sickness" rel="noopener" target="_blank" style="color:var(--muted);font-size:.9rem">Motion sickness — CDC Yellow Book &nearr;</a></li>
</ul>
</div></section>`
});

/* ================= FEAR OF CRUISING: overcome it ================= */
renderPage({
  file: 'cruise/fear-of-cruising.html', urlPath: '/cruise/fear-of-cruising', current: 'cruise',
  title: 'Scared to cruise? How to overcome the fear',
  description: fitDesc('Nervous or scared about cruising — the rolling sea, feeling trapped, the open water? A calm, honest guide to understanding the fear and overcoming it, so you can see more of the world.'),
  ogImage: 'cruise-fear.png',
  jsonld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: 'Scared to cruise? How to overcome the fear', url: 'https://ships.fyi/cruise/fear-of-cruising',
    author: { '@type': 'Organization', name: 'ships.fyi' }, datePublished: '2026-07-15', dateModified: '2026-07-15' },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
      { '@type': 'Question', name: 'Is it normal to be scared of cruising?',
        acceptedAnswer: { '@type': 'Answer', text: 'Completely normal. Fear of the open sea, of feeling trapped, or of the ship rolling are all common — and they usually shrink fast once you understand how safe and stable modern ships are and once you have one calm sailing behind you. Naming the specific fear is the first step to managing it.' } },
      { '@type': 'Question', name: 'How do I get over the fear of the ship sinking or rolling?',
        acceptedAnswer: { '@type': 'Answer', text: 'Knowledge is the most effective remedy. Modern cruise ships are extraordinarily stable, span several waves at once, carry stabiliser fins that cancel most roll, and have a range of positive stability far beyond anything a normal sea produces. Learning how the physics actually works turns a vague dread into understood, manageable motion.' } }
    ] }],
  head: '<meta property="article:published_time" content="2026-07-15T09:00:00Z">',
  content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › <a href="/cruise">Cruise ready</a> › Overcoming the fear</div>
<h1>Scared to cruise? <span class="em">Read this.</span></h1>
<p class="lead">If the thought of open water, of feeling trapped, or of the ship rolling in a swell makes you anxious — you are not being silly, and you are not alone. But that fear is standing between you and some of the most beautiful places on Earth. Here's how to shrink it down to size.</p>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Name it</span>
<h2 class="title">Fear shrinks when you name it</h2>
<div class="prose">
<p>"Scared of cruising" is usually three or four smaller, specific fears wearing one coat. Pulling them apart is the first step, because each one has a concrete, reassuring answer:</p>
<p><b>The ship rolling or capsizing.</b> This is the big one, and it's the one where the facts are most on your side. A modern cruise ship is one of the most stable structures humans build — it spans several wave crests at once, sits on deep ballast, and carries stabiliser fins that cancel up to 90% of the roll you'd otherwise feel. Its range of positive stability reaches far beyond any angle a normal sea can produce. The deep, slow roll you might feel on a breezy evening is the ship doing exactly what it's designed to do, with enormous margin to spare.</p>
<p><b>Feeling trapped.</b> Cruise ships are floating towns — parks, theatres, quiet corners, open decks, a cabin of your own. Many nervous first-timers are surprised to find the opposite of claustrophobia: space, air, and a horizon in every direction. You can always find a quiet deck and watch the sea go by.</p>
<p><b>The open water and the unknown.</b> This is fear of the unfamiliar, and it fades faster than any other — usually by the second morning, when the rhythm of the ship becomes ordinary and the view becomes the point.</p>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Practical steps</span>
<h2 class="title">A gentle plan to your first sailing</h2>
<div class="stormfacts">
<div class="sfact"><b>Start small</b><span>Pick a short 3–4 night cruise with lots of port stops and few open-sea days. A gentle first taste, close to land, builds confidence for bigger trips later.</span></div>
<div class="sfact"><b>Choose calm seas</b><span>The Caribbean and Mediterranean in season are famously smooth. Avoid the North Atlantic in winter or Drake Passage for a first trip — you can grow into those.</span></div>
<div class="sfact"><b>Book a good cabin</b><span>Midship and low for the least motion; a balcony or window gives you a horizon and fresh air whenever you want reassurance.</span></div>
<div class="sfact"><b>Learn the ship</b><span>Understanding how a ship stays upright turns mystery into machinery. Fear feeds on the unknown; knowledge starves it.</span></div>
<div class="sfact"><b>Pack for calm</b><span>A simple seasickness kit you never open is pure peace of mind. Knowing you're prepared removes half the worry.</span></div>
<div class="sfact"><b>Give it two days</b><span>Almost everyone's nerves fade by the second morning. Promise yourself you'll reserve judgement until then — you'll be glad you did.</span></div>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The reframe</span>
<h2 class="title">What's on the other side of the fear</h2>
<div class="prose">
<p>Here's the thing worth holding onto: on the far side of this fear is a way of seeing the world that almost nothing else matches. You unpack once and wake up somewhere new — a different country, a different sea, a different sunrise — without a single airport or suitcase-drag between them. Venice at dawn, the Norwegian fjords sliding past your balcony, a Greek island you'd never have reached otherwise.</p>
<p>The people who love cruising most are very often the ones who were most nervous before their first. The fear is real, but it's also temporary and beatable — and the reward for beating it is a bigger world. You don't have to be fearless. You just have to be a little braver than the fear, for about two days. The sea does the rest.</p>
</div>
<div class="callout" style="margin-top:30px">
<p style="margin:0 0 12px"><b>Turn the biggest fear into fascination.</b> See exactly how far a ship can lean before it matters — with an interactive model. Understanding is the cure.</p>
<a class="btn" href="/ships-in-storm">How ships handle storms &rarr;</a><a class="btn ghost" href="/cruise/seasickness">Prevent seasickness</a>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<h2 class="title">Quick answers</h2>
<div data-accordion>
<details class="qa" open><summary>Is it normal to be scared of cruising?<i class="caret"></i></summary><div class="body">Completely. Fear of open water, of feeling trapped, or of the motion are all common — and they shrink fast once you understand how stable modern ships are and have one calm sailing behind you. Many of the keenest cruisers started out nervous.</div></details>
<details class="qa"><summary>How do I get over the fear of the ship rolling?<i class="caret"></i></summary><div class="body">Learn how it works. Modern ships span several waves at once, sit on deep ballast, and use stabiliser fins to cancel most roll, with a stability range far beyond any normal sea. Our Ships in Storm page shows the actual physics — knowledge turns dread into understood motion.</div></details>
<details class="qa"><summary>What if I try it and hate it?<i class="caret"></i></summary><div class="body">Start with a short 3–4 night cruise close to land. It's a small, low-stakes way to find out — and most people's nerves are gone by the second morning. If it's truly not for you, you've lost only a few days; if it is, you've unlocked a whole way of seeing the world.</div></details>
</div>
</div></section>`
});

/* ================= PORT SAFETY: ashore & back on time ================= */
renderPage({
  file: 'cruise/port-safety.html', urlPath: '/cruise/port-safety', current: 'cruise',
  title: 'Cruise port safety — stay safe ashore and back on time',
  description: fitDesc('How to stay safe in cruise ports and never miss your ship: ship time vs local time, all-aboard time, tender ports, excursions, and the simple rules that keep your day ashore worry-free.'),
  ogImage: 'cruise-port-safety.png',
  jsonld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: 'Cruise port safety: stay safe ashore and never miss the ship', url: 'https://ships.fyi/cruise/port-safety',
    author: { '@type': 'Organization', name: 'ships.fyi' }, datePublished: '2026-07-15', dateModified: '2026-07-15' },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
      { '@type': 'Question', name: 'What happens if you miss the all-aboard time?',
        acceptedAnswer: { '@type': 'Answer', text: 'The ship leaves without you. If you were on an independent tour, you are responsible for getting yourself to the next port — flights, hotels and transport at your own expense. If you booked a cruise-line excursion that ran late, the ship waits or makes arrangements for you. Always call the ship or port agent immediately if you are stuck.' } },
      { '@type': 'Question', name: 'Should I use ship time or local time in port?',
        acceptedAnswer: { '@type': 'Answer', text: 'Always ship time. The all-aboard deadline is in ship time, which can differ from local time by an hour or more. Phones auto-update to local time when you go ashore, which has stranded many people — turn off automatic time updating, or set a manual reminder to ship time.' } },
      { '@type': 'Question', name: 'How early should I get back to the ship?',
        acceptedAnswer: { '@type': 'Answer', text: 'Aim to be back at least an hour before all-aboard for a docked port, and two hours for a tender port or a distant excursion. All-aboard is a hard operational deadline, not a suggestion — build your own earlier target around the slowest part of your route back.' } }
    ] }],
  head: '<meta property="article:published_time" content="2026-07-15T09:00:00Z">',
  content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › <a href="/cruise">Cruise ready</a> › Port safety</div>
<h1>Ashore &amp; <span class="em">back on time</span>.</h1>
<p class="lead">Port days are the best part of a cruise — new towns, new food, new coastlines. Two simple habits keep them worry-free: stay street-smart ashore, and never, ever be late back to the ship. Here's how to do both.</p>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The golden rule</span>
<h2 class="title">Ship time, not local time</h2>
<div class="prose">
<p>The single most common way people miss their ship is a clock mix-up. The <b>all-aboard time</b> — usually 30 to 60 minutes before departure — is always in <b>ship time</b>, which is not always the same as the local time of the port. As you sail between time zones, the two can drift an hour or more apart.</p>
<p>The trap is your phone: it auto-updates to local time the moment you step ashore, so you glance down, see a comfortable hour, and don't realise ship time is already later. If your phone says 3:45 but ship time is 4:45, you may already be watching the ship leave. <b>Turn off automatic time updating</b> on your phone for the day, or set a manual alarm to ship time. This one habit prevents the disaster entirely.</p>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Never miss the ship</span>
<h2 class="title">The rules that keep you aboard</h2>
<div class="stormfacts">
<div class="sfact"><b>Know the time</b><span>Check the all-aboard time before you leave — it's in the daily newsletter, the app, and on a sign at the gangway. Write it down in ship time.</span></div>
<div class="sfact"><b>Build a buffer</b><span>Be back at least <b>1 hour early</b> at a docked port, <b>2 hours</b> for a tender port or a far excursion. Plan around the slowest part of your route back.</span></div>
<div class="sfact"><b>Ship tours wait</b><span>On a cruise-line excursion that runs late, the ship waits for you. On an independent tour, it does not — that's the real trade-off, not just the price.</span></div>
<div class="sfact"><b>Tender ports need more</b><span>If the ship anchors offshore and you return by tender boat, the last tender is your real deadline — treat it exactly like all-aboard, and allow for the queue.</span></div>
<div class="sfact"><b>Carry the port agent number</b><span>It's in the daily newsletter. If something goes wrong ashore, one call to the port agent is your lifeline — save it before you leave.</span></div>
<div class="sfact"><b>If you're stuck</b><span>Missed it anyway? Call the ship or port agent immediately. You'll make your own way to the next port, so the sooner they know, the better they can help.</span></div>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Street-smart ashore</span>
<h2 class="title">Staying safe in a new town</h2>
<div class="prose">
<p>Cruise ports are overwhelmingly safe and used to visitors, but the ordinary rules of any unfamiliar city apply — a little awareness lets you relax into the day. Carry only what you need: your cruise card (your key back aboard), a government photo ID, some cash for cash-only vendors, and a card. Leave passports and valuables locked in your cabin unless the port specifically requires the passport.</p>
<p>Beyond that, it's common sense worn lightly. Stick to reputable, licensed tour and taxi operators rather than whoever shouts loudest at the pier. Keep to busier areas and avoid isolated spots, especially alone. Agree a price before you get in an unmetered taxi. Keep a portable charger on you so your phone — your map, your clock, your lifeline — never dies. And note that internet ashore can be patchy, so pin your key spots on an offline map before you go.</p>
</div>
<div class="callout" style="margin-top:30px">
<p style="margin:0 0 12px"><b>Pack the day bag right.</b> Our interactive packing list covers exactly what to carry ashore — and remembers what you've ticked off.</p>
<a class="btn" href="/cruise/packing-list">Open the packing list &rarr;</a><a class="btn ghost" href="/cruise/first-cruise-guide">First cruise guide</a>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<h2 class="title">Quick answers</h2>
<div data-accordion>
<details class="qa" open><summary>What happens if I miss the all-aboard time?<i class="caret"></i></summary><div class="body">The ship leaves. On an independent tour, getting to the next port is your responsibility and your expense. On a cruise-line excursion that ran late, the ship waits or arranges for you. Either way, call the ship or port agent immediately if you're stranded.</div></details>
<details class="qa"><summary>Ship time or local time — which do I follow?<i class="caret"></i></summary><div class="body">Always ship time. All-aboard is in ship time, which can differ from local time by an hour or more, and your phone auto-switches to local when you land. Turn off automatic time updates for the day or set a manual ship-time alarm.</div></details>
<details class="qa"><summary>How early should I head back?<i class="caret"></i></summary><div class="body">An hour before all-aboard at a docked port; two hours for a tender port or a distant excursion. Treat all-aboard as a hard deadline and build your own earlier target around whatever could slow your return — traffic, trains, or a tender queue.</div></details>
</div>
<p class="verified" style="margin-top:20px">General guidance for planning — always follow your specific ship's stated times and your cruise line's instructions. Spot an error? <a href="mailto:${DATA.site.corrections}" style="color:var(--gold)">${esc(DATA.site.corrections)}</a></p>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<h2 class="title">Sources</h2>
<ul style="list-style:none;margin:14px 0 0;padding:0">
<li style="margin-bottom:8px"><a href="https://www.gov.uk/foreign-travel-advice" rel="noopener" target="_blank" style="color:var(--muted);font-size:.9rem">Foreign travel advice — UK Foreign, Commonwealth &amp; Development Office &nearr;</a></li>
<li style="margin-bottom:8px"><a href="https://travel.state.gov/content/travel/en/international-travel.html" rel="noopener" target="_blank" style="color:var(--muted);font-size:.9rem">International travel safety — U.S. Department of State &nearr;</a></li>
</ul>
</div></section>`
});


renderPage({
  file: 'cruise/how-big-is-a-cruise-ship.html', urlPath: '/cruise/how-big-is-a-cruise-ship', current: 'cruise',
  title: 'How big is a cruise ship? Seen at true scale',
  description: fitDesc('How big is a cruise ship really? The largest is 365 m long and five times the Titanic\u2019s tonnage — see every giant drawn at true scale against things you know.'),
  ogImage: 'cruise-howbig.png',
  jsonld: { '@context': 'https://schema.org', '@type': 'Article', headline: 'How big is a cruise ship, really?', url: 'https://ships.fyi/cruise/how-big-is-a-cruise-ship',
    author: { '@type': 'Organization', name: 'ships.fyi' }, datePublished: '2026-07-15', dateModified: '2026-07-15' },
  content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › <a href="/cruise">Cruise ready</a> › How big is a cruise ship?</div>
<h1>How big is a cruise ship, <span class="em">really</span>?</h1>
<p class="lead">Bigger than the number sounds. The largest cruise ship afloat is ${(365.1 / 105).toFixed(1)} football pitches long, carries the population of a small town, and would loom over almost every building in your city — here is the honest scale of it.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<div class="prose">
<p>The largest cruise ship in the world, <a href="/ships/legend-of-the-seas" style="color:var(--gold)">Legend of the Seas</a>, is about 365 metres long and 248,663 gross tons. Numbers that size stop meaning anything, so translate: stand her on her stern and she out-reaches the Eiffel Tower. Lay the Titanic beside her and the most famous ship in history reaches barely three-quarters of the way down her hull — and carries a fifth of the volume. At full capacity she holds nearly 10,000 people, which is more than many towns you have driven through.</p>
<p>Yet here is what surprises first-timers most: aboard, she rarely feels crowded. Volume is the whole trick of modern cruise design — eight "neighborhoods", twenty decks, and enough sheer internal space that thousands of people spread out into it. Gross tonnage measures exactly that internal volume, which is why it is the honest ranking unit for cruise ships (we keep a full explainer on <a href="/explained/gross-tonnage" style="color:var(--gold)">what tonnage actually means</a>).</p>
<p>And the giants are not even the biggest ships afloat — a fact enthusiasts love and first-timers never guess. The <a href="/ships/pioneering-spirit" style="color:var(--gold)">Pioneering Spirit</a>, a twin-hulled platform-lifter, is half again the volume of any cruise ship, and the longest vessel ever built was a <a href="/ships/seawise-giant" style="color:var(--gold)">tanker 458 metres long</a>. Your floating resort is merely the biggest thing at sea <em>that you can buy a ticket on</em>.</p>
</div>
<div class="callout" style="margin-top:30px">
<p style="margin:0 0 12px"><b>See it, don't take our word for it.</b> Draw your ship against the Titanic, a football pitch and a 1.75 m person — everything at true relative scale.</p>
<div class="heroCtas" style="margin:0"><a class="btn" href="/compare#legend-of-the-seas,titanic">Open the Scale Engine &rarr;</a><a class="btn ghost" href="/records/most-passengers">Capacity records</a></div>
</div>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The top of the table</span>
<h2 class="title">The five biggest cruise ships right now</h2>
<div class="reclist">
${S.filter(x => x.category === 'Cruise').sort((p, q) => q.core.gt - p.core.gt).slice(0, 5).map((a, i) => `<a class="recrow" href="/ships/${a.slug}">
<span class="rr-rank num">${i + 1}</span>
<span class="rr-main"><span class="rr-name">${esc(a.name)}</span><span class="rr-len num"><b>${a.core.gt.toLocaleString('en-US')} GT</b></span></span>
<span class="rr-sub"><span class="rr-ff num">${a.core.delivered}</span><span class="rr-st">${esc(a.status)}</span></span>
</a>`).join('\n')}
</div>
<p class="sub" style="margin-top:14px">Full board: <a href="/records/biggest-cruise-ships" style="color:var(--gold)">the biggest cruise ships in the world &rarr;</a></p>
</div></section>`
});

renderPage({
  file: 'cruise.html', urlPath: '/cruise', current: 'cruise', ogImage: 'cruise-hub.png',
  title: 'Get cruise-ready — guides, checklists & the ships',
  description: fitDesc('Get cruise-ready with ships.fyi: the interactive packing checklist, the honest first-cruise guide, and every giant you might board — measured and drawn to true scale.'),
  jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Get cruise-ready', url: 'https://ships.fyi/cruise' },
  content: `
<section class="hero"><div class="wrap">
<h1>Get <span class="em">cruise-ready</span>.</h1>
<p class="lead">The adventure starts before you board. Pack like a regular, know your ship like an enthusiast, and step up the gangway ready for the best week of the year.</p>
<div class="heroChips">
<span class="chip"><b class="num">${S.filter(x => x.category === 'Cruise' || x.category === 'Liner').length}</b><span>cruise giants profiled</span></span>
<span class="chip"><b class="num">${PACK.reduce((n, g) => n + g[1].length, 0)}</b><span>checklist items</span></span>
<span class="chip"><b class="num">248,663 GT</b><span>the biggest afloat</span></span>
</div>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The guides</span>
<h2 class="title">Before you sail</h2>
<div class="pillars two">
<article class="acard"><h3><a href="/cruise/packing-list">The packing list</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">The interactive checklist that remembers your progress — documents, clothing, health, cabin tricks, and the things everyone forgets.</p><a class="mini" href="/cruise/packing-list">Start packing &rarr;</a></article>
<article class="acard"><h3><a href="/cruise/first-cruise-guide">First cruise? Read this</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Embarkation, the onboard account, gratuities, seasickness, dining — decoded honestly, no brochure gloss.</p><a class="mini" href="/cruise/first-cruise-guide">Read the guide &rarr;</a></article>
<article class="acard"><h3><a href="/cruise/seasickness">Beat seasickness</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">The cabin trick that matters most, wristbands, ginger, the horizon rule — how to prevent it and what to pack.</p><a class="mini" href="/cruise/seasickness">Prevent it &rarr;</a></article>
<article class="acard"><h3><a href="/cruise/fear-of-cruising">Scared to cruise?</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Nervous about the sea, the motion, feeling trapped? A calm guide to overcoming the fear and seeing more of the world.</p><a class="mini" href="/cruise/fear-of-cruising">Overcome the fear &rarr;</a></article>
<article class="acard"><h3><a href="/cruise/port-safety">Safe ashore &amp; back on time</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Ship time vs local time, all-aboard, tender ports — stay street-smart ashore and never miss your ship.</p><a class="mini" href="/cruise/port-safety">Port day rules &rarr;</a></article>
<article class="acard"><h3><a href="/cruise/how-big-is-a-cruise-ship">How big is a cruise ship?</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Bigger than the number sounds — see the giants at true scale against the Titanic, a football pitch, and you.</p><a class="mini" href="/cruise/how-big-is-a-cruise-ship">See the scale &rarr;</a></article>
<article class="acard"><h3><a href="/play">Captain — the ship game</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Take the wheel of sixteen real ships, from a harbour tug to Seawise Giant. Hunt treasure, bank it at port, and find out why draught decides everything. Free, no download.</p><a class="mini" href="/play">Take the wheel &rarr;</a></article>
<article class="acard"><h3><a href="/quiz">The Silhouette Quiz</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Impress precisely one person at the sail-away party by naming every ship in the harbor from its profile.</p><a class="mini" href="/quiz">Test yourself &rarr;</a></article>
</div>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Know your ship</span>
<h2 class="title">The giants you can actually board</h2>
<p class="sub">Every cruise giant on this site — tap yours and know her better than the cruise director does.</p>
<div class="allineup">${S.filter(x => x.category === 'Cruise').sort((p, q) => q.core.gt - p.core.gt).map(x => `<a class="lu" href="/ships/${x.slug}" style="flex:${x.core.loa_m} 1 0"><span class="lu-s">${silScaled(x)}</span><span class="lu-n">${esc(shortName(x))}</span></a>`).join('')}</div>
<div class="recrow" style="margin-top:18px">
<a class="recchip" href="/categories/cruise-ships">All cruise ships &amp; liners &rarr;</a>
<a class="recchip" href="/records/most-passengers">Capacity records &rarr;</a>
<a class="recchip" href="/compare#legend-of-the-seas,titanic">Your ship vs the Titanic &rarr;</a>
</div>
${disclosureBox()}
</div></section>`
});

/* ---------- BLOG ---------- */
function block(x) {
  if (x.h2) return `<h2 class="title" style="margin-top:38px">${esc(x.h2)}</h2>`;
  if (x.p) return `<p>${esc(x.p)}</p>`;
  if (x.callout) return `<div class="callout" style="margin:22px 0"><p style="margin:0"><b>${esc(x.callout)}</b></p></div>`;
  if (x.ul) return `<ul class="pl">${x.ul.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
  if (x.table) return `<div class="specwrap"><table class="spec">
<thead><tr>${x.table.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
<tbody>${x.table.rows.map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('\n')}</tbody></table></div>`;
  return '';
}
for (const post of POSTS) {
  renderPage({
    file: `blog/${post.slug}.html`, urlPath: `/blog/${post.slug}`, current: 'blog',
    ogImage: post.og || 'blog.png',
    ogType: 'article',
    head: `<meta property="article:published_time" content="${post.date}T09:00:00Z"><meta property="article:modified_time" content="${post.date}T09:00:00Z">`,
    title: post.title.length > 60 ? post.title.slice(0, 57) + '…' : post.title,
    description: fitDesc(post.dek),
    jsonld: { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.dek,
      datePublished: post.date, dateModified: post.date,
      author: { '@type': 'Organization', name: DATA.site.author, email: DATA.site.contact },
      publisher: { '@type': 'Organization', name: 'ships.fyi', url: 'https://ships.fyi' },
      mainEntityOfPage: `https://ships.fyi/blog/${post.slug}` },
    content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › <a href="/blog">Blog</a> › ${esc(post.tags[0])}</div>
<h1>${esc(post.title)}</h1>
<p class="lead">${esc(post.dek)}</p>
<p class="kicker" style="margin-top:14px">${esc(post.author)} · <time datetime="${post.date}">${new Date(post.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</time> · ${esc(post.read)}</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<article class="prose">${post.body.map(block).join('\n')}</article>
${post.slug === 'ever-given-six-days' ? `<div class="callout" style="margin-top:34px"><p style="margin:0 0 12px"><b>Would your favourite giant even fit through Suez?</b> We built a tool for exactly that question.</p><a class="btn" href="/canal-fit">Open the Canal-Fit Checker &rarr;</a></div>` : ''}
${POSTS.filter(p => p.slug !== post.slug).slice(0, 1).map(p => `<div class="callout" style="margin-top:34px"><p style="margin:0 0 6px"><b>Read next</b></p><p style="margin:0 0 12px;color:var(--muted)">${esc(p.dek)}</p><a class="btn ghost" href="/blog/${p.slug}">${esc(p.title)} &rarr;</a></div>`).join('')}
<h2 class="title" style="margin-top:40px">Sources</h2>
<ul style="list-style:none;margin:14px 0 0;padding:0">
${post.sources.map(s => `<li style="margin-bottom:8px"><a href="${esc(s.url)}" rel="noopener" target="_blank" style="color:var(--muted);font-size:.9rem">${esc(s.name)} &nearr;</a></li>`).join('\n')}
</ul>
<p class="verified" style="margin-top:20px">Written ${esc(post.date)}. Facts checked against the sources above. Spot an error? <a href="mailto:${DATA.site.corrections}" style="color:var(--gold)">${esc(DATA.site.corrections)}</a></p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Related</span>
<h2 class="title">Go deeper</h2>
<div class="pillars two">
<article class="acard"><div class="sil">${silScaled(S.find(x => x.slug === 'ever-given'))}</div><h3><a href="/ships/ever-given">Ever Given</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">The ship that blocked the Suez Canal — full specification, the class, and the six days in detail.</p><a class="mini" href="/ships/ever-given">Open the page &rarr;</a></article>
<article class="acard"><div class="sil">${silScaled(S.find(x => x.slug === 'seawise-giant'))}</div><h3><a href="/records/longest-ships">The longest ships ever</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Forty giants ranked by length — and why the top of the board is a graveyard of ambition.</p><a class="mini" href="/records/longest-ships">Open the board &rarr;</a></article>
</div>
</div></section>`
  });
}
renderPage({
  file: 'blog.html', urlPath: '/blog', current: 'blog', ogImage: 'blog.png',
  title: 'The ships.fyi blog',
  description: 'Long-form maritime writing from ships.fyi — the Suez blockage, why the giants stopped growing, and the stories behind the specifications. Sourced and dated.',
  jsonld: { '@context': 'https://schema.org', '@type': 'Blog', name: 'ships.fyi blog', url: 'https://ships.fyi/blog' },
  content: `
<section class="hero"><div class="wrap">
<h1>The <span class="em">blog</span>.</h1>
<p class="lead">Long-form writing on the ships we cover — sourced, dated, and honest about what nobody actually knows yet.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Latest</span>
<h2 class="title">Posts</h2>
<div class="pillars two">
${POSTS.map(p => `<article class="acard">
<p class="kicker">${esc(p.tags.join(' · '))}</p>
<h3><a href="/blog/${p.slug}">${esc(p.title)}</a></h3>
<p style="color:var(--muted);font-size:.92rem;margin:8px 0 14px">${esc(p.dek)}</p>
<p style="font-size:.84rem;color:var(--muted);margin:0 0 14px"><time datetime="${p.date}">${new Date(p.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</time> · ${esc(p.read)}</p>
<a class="mini" href="/blog/${p.slug}">Read it &rarr;</a>
</article>`).join('\n')}
</div>
</div></section>`
});


/* ================= SHIPS IN STORM — the big interactive explainer ================= */
renderPage({
  file: 'ships-in-storm.html', urlPath: '/ships-in-storm', current: '', ogImage: 'ships-in-storm.png',
  title: 'Ships in Storm — heel, capsize & rogue waves explained',
  description: fitDesc('How far can a ship lean before capsizing, what a rogue wave is, and how giant ships survive storms — an interactive guide to heel, stability and the biggest waves ever recorded.'),
  ogType: 'article',
  jsonld: [{ '@context': 'https://schema.org', '@type': 'Article',
    headline: 'Ships in Storm: how far can a ship lean before it capsizes?',
    description: 'Interactive explainer on ship stability in heavy weather — heel angle, the angle of vanishing stability, rogue waves and storm survival.',
    url: 'https://ships.fyi/ships-in-storm', datePublished: '2026-07-15', dateModified: '2026-07-15',
    author: { '@type': 'Organization', name: 'ships.fyi' }, publisher: { '@type': 'Organization', name: 'ships.fyi', url: 'https://ships.fyi' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
      { '@type': 'Question', name: 'How many degrees can a ship lean before it capsizes?',
        acceptedAnswer: { '@type': 'Answer', text: 'There is no single number — it depends on the ship. The limit is called the angle of vanishing stability (AVS), the heel angle beyond which a ship can no longer right itself. For a typical cargo ship it is often around 60–80°; a well-designed cruise ship can exceed 70°; a ballasted ocean-going ship may approach 90°. Below the AVS the ship pushes back toward upright; beyond it, gravity and buoyancy work together to capsize her.' } },
      { '@type': 'Question', name: 'What is the point of no return for a ship?',
        acceptedAnswer: { '@type': 'Answer', text: 'The point of no return is the angle of vanishing stability. At that exact angle the righting arm (GZ) falls to zero and the ship is in unstable equilibrium — the smallest further push capsizes her. In practice ships flood and capsize before the geometric AVS because water enters through openings at the downflooding angle.' } },
      { '@type': 'Question', name: 'What is the biggest wave ever recorded?',
        acceptedAnswer: { '@type': 'Answer', text: 'The tallest instrumentally measured rogue wave is the Draupner wave: 25.6 metres (84 ft), recorded on 1 January 1995 in the North Sea, in seas whose significant wave height was only about 12 metres — more than twice the surrounding waves, the defining test of a rogue wave.' } },
      { '@type': 'Question', name: 'What is a rogue wave?',
        acceptedAnswer: { '@type': 'Answer', text: 'A rogue wave (also called a freak or monster wave) is an unusually large, steep wave that appears suddenly in otherwise moderate seas. It is formally defined as more than twice the significant wave height — the average height of the largest third of the surrounding waves. They form when multiple wave trains briefly stack in phase, and were first proven real by the 25.6-metre Draupner wave in 1995.' } },
      { '@type': 'Question', name: 'Can a rogue wave sink a ship?',
        acceptedAnswer: { '@type': 'Answer', text: 'A rogue wave can injure people, smash bridge windows and flood cabins, and is suspected in the loss of some vessels historically — but modern large ships are built to survive them. The Norwegian Dawn (2005) and Caledonian Star (2001) both took 21–30 metre rogue waves and came home. The greatest danger is to people near windows or on deck rather than to the hull itself.' } }
    ] }],
  head: '<meta property="article:published_time" content="2026-07-15T09:00:00Z">',
  content: `
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Home</a> › Ships in Storm</div>
<h1>Ships in <span class="em">Storm</span>.</h1>
<p class="lead">A 360-metre cruise ship in a Force 12 gale looks like the end of the world from a cabin window — and is, almost always, completely routine for the ship. Here is the physics of why: how far a hull can lean, where the point of no return actually is, and the monster waves that test it.</p>
<div class="heroChips">
<span class="chip"><b class="num">25.6 m</b><span>tallest wave ever measured</span></span>
<span class="chip"><b class="num">~60–90°</b><span>heel before the point of no return</span></span>
<span class="chip"><b class="num">0°</b><span>where the righting arm finally fails</span></span>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Try it</span>
<h2 class="title">Lean the ship. Find the edge.</h2>
<p class="sub">Drag to heel the ship over. Watch the righting arm — the force pulling her back upright — grow, peak, and then die. The angle where it dies is the point of no return.</p>
<div class="stormsim">
<div class="stormsim-stage" id="ssStage">
<div class="ss-sky"></div>
<div class="ss-sea" id="ssSea"></div>
<div class="ss-ship" id="ssShip"><svg viewBox="0 0 120 90" aria-hidden="true"><path d="M20 46 L100 46 L92 70 Q60 82 28 70 Z" fill="#0F766E"/><rect x="40" y="30" width="40" height="16" rx="2" fill="#0B5D55"/><rect x="52" y="18" width="16" height="14" rx="2" fill="#0B5D55"/><rect x="46" y="34" width="6" height="6" rx="1" fill="#EAF6F4"/><rect x="58" y="34" width="6" height="6" rx="1" fill="#EAF6F4"/><rect x="70" y="34" width="6" height="6" rx="1" fill="#EAF6F4"/></svg></div>
<div class="ss-readout" id="ssReadout"><b id="ssAngle">0°</b><span id="ssState">Upright &amp; stable</span></div>
</div>
<input type="range" id="ssSlider" min="0" max="110" value="0" step="1" aria-label="Heel angle in degrees">
<div class="ss-scale"><span>0°</span><span>30°</span><span>60°</span><span>90°</span><span>110°</span></div>
<div class="ss-zones">
<div class="ss-zone" id="ssZone">
<span class="ssz ssz-safe">Self-righting</span>
<span class="ssz ssz-warn">Fighting back, harder</span>
<span class="ssz ssz-danger">Past the point of no return</span>
</div>
</div>
<p class="ss-explain" id="ssExplain">At rest, gravity and buoyancy line up and the ship sits level. Start leaning her over.</p>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The one graph that matters</span>
<h2 class="title">The righting arm, from upright to capsize</h2>
<p class="sub">Naval architects live by this curve — the <b>GZ curve</b>. It plots the righting arm (how hard the ship pushes back toward upright) against heel angle. It rises, peaks, and crosses zero. That crossing is the angle of vanishing stability: the point of no return.</p>
<div class="gzwrap"><svg viewBox="0 0 640 300" id="gzChart" role="img" aria-label="A righting-arm curve rising to a peak then falling to zero at the angle of vanishing stability">
<line x1="60" y1="250" x2="620" y2="250" stroke="#334155" stroke-width="1.5"/>
<line x1="60" y1="250" x2="60" y2="30" stroke="#334155" stroke-width="1.5"/>
<text x="340" y="288" text-anchor="middle" fill="#56677A" font-size="13">Angle of heel →</text>
<text x="20" y="140" text-anchor="middle" fill="#56677A" font-size="13" transform="rotate(-90 20 140)">Righting arm (GZ) →</text>
<path id="gzCurve" d="" fill="none" stroke="#0F766E" stroke-width="3"/>
<path id="gzFill" d="" fill="rgba(15,118,110,.10)"/>
<circle id="gzPeak" r="5" fill="#DDB44A"/>
<circle id="gzZero" r="5" fill="#F1948A"/>
<line id="gzMarker" x1="0" y1="30" x2="0" y2="250" stroke="#DDB44A" stroke-width="1.5" stroke-dasharray="4 3" opacity="0"/>
<text id="gzPeakLabel" fill="#B8860B" font-size="12" text-anchor="middle"></text>
<text id="gzZeroLabel" fill="#C0392B" font-size="12" text-anchor="middle"></text>
</svg></div>
<p class="ss-explain">Two points define a ship's fate in storm. The <b style="color:#B8860B">peak</b> is the hardest she can push back — the maximum heeling force she can survive. The <b style="color:#C0392B">zero crossing</b> is the angle of vanishing stability, where the push-back finally dies. Below it she recovers; beyond it, she is going over.</p>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The numbers</span>
<h2 class="title">How far is too far?</h2>
<p class="sub">There is no single capsize angle — it is set by each ship's shape and loading. But the ranges are real, and they are bigger than most people guess.</p>
<div class="stormfacts">
<div class="sfact"><b>~7°</b><span>Heel a passenger notices as "leaning". Drinks slide. Everyone grabs a rail. The ship is nowhere near trouble.</span></div>
<div class="sfact"><b>15–20°</b><span>A heavy, alarming lean in storm — and still routine. Stabiliser fins and ballast handle this range all night.</span></div>
<div class="sfact"><b>~30–40°</b><span>Where a typical ship's righting arm is <em>strongest</em> — she is fighting back hardest exactly when she is leaning scarily far.</span></div>
<div class="sfact"><b>~60–80°</b><span>The angle of vanishing stability for many cargo ships — the geometric point of no return.</span></div>
<div class="sfact"><b>70°+</b><span>A well-designed cruise ship's range of positive stability. She can be knocked past horizontal on her superstructure and still return.</span></div>
<div class="sfact"><b>&lt; AVS</b><span>The catch: ships usually flood and capsize <em>before</em> the geometric limit, once water pours in through doors and vents at the downflooding angle.</span></div>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Rogue waves</span>
<h2 class="title">What is a rogue wave?</h2>
<div class="prose">
<p>A <b>rogue wave</b> — also called a freak, killer or monster wave — is an unusually large, steep wall of water that appears suddenly, often in otherwise moderate seas. The formal definition is precise: a wave more than <b>twice the significant wave height</b> (the average height of the largest third of waves around it). So in 6-metre seas, a 13-metre wall counts; in a 12-metre storm, it takes 25 metres.</p>
<p>For centuries mariners' accounts of walls of water were dismissed as tall tales. That ended on 1 January 1995, when a downward-pointing laser on the <b>Draupner platform</b> in the North Sea measured a <b>25.6-metre</b> wave in seas running only ~12 metres — the first hard instrumental proof rogue waves are real. They form when multiple wave trains briefly stack in phase, sometimes amplified by currents or nonlinear focusing, and they can arrive from a different direction than the prevailing sea. A 2001 satellite survey found ten waves over 25 metres worldwide in just three weeks: far from folklore, they are a routine hazard of the open ocean.</p>
</div>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">The monsters</span>
<h2 class="title">The biggest rogue waves ever recorded</h2>
<p class="sub">Every one of these is measured or well-documented — and every ship here survived. These are the walls of water that tested the limit.</p>
<div class="reclist">
<div class="recrow"><span class="rr-rank num">1</span><span class="rr-main"><span class="rr-name">The Draupner wave</span><span class="rr-len num"><b>25.6 m</b></span></span><span class="rr-sub"><span class="rr-ff num">1995</span><span class="rr-st">North Sea · first ever instrumentally recorded, in 12 m seas</span></span></div>
<div class="recrow"><span class="rr-rank num">2</span><span class="rr-main"><span class="rr-name">RRS Discovery encounter</span><span class="rr-len num"><b>29.1 m</b></span></span><span class="rr-sub"><span class="rr-ff num">2000</span><span class="rr-st">North Atlantic · crest-to-trough, in 70-knot winds</span></span></div>
<div class="recrow"><span class="rr-rank num">3</span><span class="rr-main"><span class="rr-name">Caledonian Star</span><span class="rr-len num"><b>~30 m</b></span></span><span class="rr-sub"><span class="rr-ff num">2001</span><span class="rr-st">South Atlantic · smashed bridge windows, no fatalities</span></span></div>
<div class="recrow"><span class="rr-rank num">4</span><span class="rr-main"><span class="rr-name">Norwegian Dawn</span><span class="rr-len num"><b>~21 m</b></span></span><span class="rr-sub"><span class="rr-ff num">2005</span><span class="rr-st">Off Georgia, USA · three waves, flooded 62 cabins, held together</span></span></div>
<div class="recrow"><span class="rr-rank num">5</span><span class="rr-main"><span class="rr-name">Esso Languedoc (estimated)</span><span class="rr-len num"><b>25–30 m</b></span></span><span class="rr-sub"><span class="rr-ff num">1980</span><span class="rr-st">Off Durban · washed clean over the deck of a supertanker</span></span></div>
</div>
<p class="ss-explain">The Draupner wave changed science: it was the first hard proof that "freak waves" sailors had described for centuries were real. A 2001 satellite survey then found <b>ten</b> waves over 25 metres worldwide in just three weeks — they are far more common than anyone wanted to believe.</p>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Why they survive</span>
<h2 class="title">How a giant shrugs off a Force 12</h2>
<div class="prose">
<p>The reassuring truth for anyone who has white-knuckled a storm at sea: modern ships are extraordinarily hard to capsize, and they are built precisely for the night you are dreading. Sheer size is the first defence — a 360-metre cruise ship spans several wave crests at once, so no single wave can lift or roll her the way it would a small boat.</p>
<p>Then come the active systems. <b>Stabiliser fins</b> — wings that extend from the hull below the waterline — generate counter-forces that cancel much of the roll, and can cut the felt motion by up to 90% in the beam seas that cause the worst rolling. Deep <b>ballast</b> keeps the centre of gravity low, which is the whole game: the lower the weight, the longer the righting arm, the further she can lean and still snap back.</p>
<p>Captains add seamanship the instruments cannot. In heavy weather a ship will slow and <b>turn to take the seas on the bow</b> rather than the beam, because waves hitting side-on are what roll a ship. The one genuinely dangerous trap is <b>parametric rolling</b> — a resonance where a following or head sea on a certain rhythm pumps energy into the roll with each wave, building the angle dangerously in a handful of cycles. It is now modelled, monitored and actively avoided, and it is the reason ships change course and speed in specific seas that look survivable but aren't.</p>
<p>So the cabin-window view lies. The horizon tilting, the spray over the top deck, the deep slow roll — that is a ship doing exactly what her GZ curve says she can, with tens of degrees of margin still in hand before the number that matters: the angle of vanishing stability, the real point of no return.</p>
</div>
<div class="callout" style="margin-top:30px">
<p style="margin:0 0 12px"><b>See these ships at true scale.</b> The giants that ride out these storms — drawn against the Titanic, a football pitch, and you.</p>
<div class="heroCtas" style="margin:0"><a class="btn" href="/records/biggest-cruise-ships">The biggest cruise ships &rarr;</a><a class="btn ghost" href="/compare#legend-of-the-seas,titanic">Open the Scale Engine</a></div>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Quick answers</span>
<h2 class="title">Ships in storm, asked and answered</h2>
<div data-accordion>
<details class="qa" open><summary>How many degrees can a ship lean before it capsizes?<i class="caret"></i></summary><div class="body">There is no single number — it is the ship's angle of vanishing stability (AVS). For a typical cargo ship it is often 60–80°; a well-designed cruise ship can exceed 70°; a heavily ballasted ocean-going ship may approach 90°. Below the AVS the ship rights herself; beyond it she capsizes. Note that flooding often ends the story before the geometric limit is reached.</div></details>
<details class="qa"><summary>What is the point of no return called?<i class="caret"></i></summary><div class="body">The angle of vanishing stability. At that heel the righting arm (GZ) falls to zero and the ship is in unstable equilibrium — the smallest further push capsizes her. It is the exact edge between recovering and going over.</div></details>
<details class="qa"><summary>What is the biggest wave ever recorded?<i class="caret"></i></summary><div class="body">The Draupner wave: 25.6 m (84 ft), measured by laser on 1 January 1995 in the North Sea, in seas whose significant height was only about 12 m. The RRS Discovery later measured a 29.1 m wave crest-to-trough in the North Atlantic in 2000.</div></details>
<details class="qa"><summary>What exactly counts as a rogue wave?<i class="caret"></i></summary><div class="body">A wave more than twice the significant wave height — the average height of the largest third of the waves around it. So the threshold is relative: in calm 3 m seas a 7 m wave is rogue; in a 12 m storm it takes 25 m. They appear suddenly, are unusually steep, and can come from a different direction than the main sea. The 25.6 m Draupner wave (1995) was the first ever measured by instrument.</div></details>
<details class="qa"><summary>Can a rogue wave sink a cruise ship?<i class="caret"></i></summary><div class="body">It can injure people and flood cabins — the Norwegian Dawn (2005) and Caledonian Star (2001) both took ~21–30 m rogue waves that smashed windows and flooded interiors — but modern large ships are built to survive them, and all these vessels came home. The danger is to those near windows and on deck, not usually to the hull itself.</div></details>
<details class="qa"><summary>Why do ships roll so much more than they pitch?<i class="caret"></i></summary><div class="body">Because a hull is long and narrow: it resists tipping end-over-end (pitch) far more than side-to-side (roll). That is why crews turn to meet big seas bow-on, and why beam seas — waves hitting side-on — are the ones that threaten stability.</div></details>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
<h2 class="title">Sources</h2>
<p class="sub">Primary scientific and reference authorities first, general further reading below.</p>
<h3 style="font-family:var(--display);font-size:1rem;font-weight:700;margin:18px 0 8px">Primary &amp; scientific</h3>
<ul style="list-style:none;margin:0;padding:0">
<li style="margin-bottom:8px"><a href="https://oceanservice.noaa.gov/facts/roguewaves.html" rel="noopener" target="_blank" style="color:var(--muted);font-size:.9rem">What is a rogue wave? — NOAA National Ocean Service &nearr;</a></li>
<li style="margin-bottom:8px"><a href="https://www.ecmwf.int/en/newsletter/148/meteorology/what-conditions-led-draupner-freak-wave" rel="noopener" target="_blank" style="color:var(--muted);font-size:.9rem">What conditions led to the Draupner freak wave? — ECMWF &nearr;</a></li>
<li style="margin-bottom:8px"><a href="https://www.whoi.edu/ocean-learning-hub/ocean-facts/what-is-a-rogue-wave/" rel="noopener" target="_blank" style="color:var(--muted);font-size:.9rem">What is a rogue wave? — Woods Hole Oceanographic Institution &nearr;</a></li>
<li style="margin-bottom:8px"><a href="https://www.marineinsight.com/ship-stability-understanding-curves-static-stability/" rel="noopener" target="_blank" style="color:var(--muted);font-size:.9rem">Understanding curves of static stability — Marine Insight &nearr;</a></li>
</ul>
<h3 style="font-family:var(--display);font-size:1rem;font-weight:700;margin:22px 0 8px">Further reading</h3>
<ul style="list-style:none;margin:0;padding:0">
<li style="margin-bottom:8px"><a href="https://www.britannica.com/topic/rogue-wave" rel="noopener" target="_blank" style="color:var(--muted);font-size:.9rem">Rogue wave — Britannica &nearr;</a></li>
<li style="margin-bottom:8px"><a href="https://en.wikipedia.org/wiki/Draupner_wave" rel="noopener" target="_blank" style="color:var(--muted);font-size:.9rem">Draupner wave — Wikipedia &nearr;</a></li>
<li style="margin-bottom:8px"><a href="https://en.wikipedia.org/wiki/Rogue_wave" rel="noopener" target="_blank" style="color:var(--muted);font-size:.9rem">Rogue wave — Wikipedia &nearr;</a></li>
</ul>
<p class="verified" style="margin-top:20px">Written 2026-07-15. Facts are checked against the primary and scientific sources above; the further-reading links are provided for general background. This page explains general naval-architecture principles and is not operational safety guidance. Spot an error? <a href="mailto:${DATA.site.corrections}" style="color:var(--gold)">${esc(DATA.site.corrections)}</a></p>
</div></section>

<script>
(function(){
  var slider = document.getElementById('ssSlider');
  if (!slider) return;
  var ship = document.getElementById('ssShip'), sea = document.getElementById('ssSea');
  var angEl = document.getElementById('ssAngle'), stateEl = document.getElementById('ssState');
  var explainEl = document.getElementById('ssExplain'), readout = document.getElementById('ssReadout');
  var AVS = 75; // illustrative angle of vanishing stability for the demo ship
  function gz(a){ // simplified righting-arm shape: sin bump that dies at AVS
    if (a >= AVS) return Math.max(-0.35, -(a - AVS) / 60);
    return Math.sin(Math.PI * a / AVS) * (0.65 + 0.35 * Math.cos(Math.PI * a / (2 * AVS)));
  }
  function paint(a){
    angEl.textContent = a + '\\u00B0';
    ship.style.transform = 'rotate(' + a + 'deg)';
    var state, cls, ex;
    if (a === 0){ state = 'Upright & stable'; cls = 'safe'; ex = 'At rest, gravity and buoyancy line up and the ship sits level. Start leaning her over.'; }
    else if (a < 30){ state = 'Self-righting'; cls = 'safe'; ex = 'The righting arm is growing: the further she leans, the harder she pushes back toward upright. This is a ship doing its job.'; }
    else if (a < AVS - 10){ state = 'Fighting back, hard'; cls = 'warn'; ex = 'Near her strongest righting force now — leaning frighteningly far, yet pushing back with everything she has. Still recovers every time.'; }
    else if (a < AVS){ state = 'Approaching the edge'; cls = 'warn'; ex = 'The righting arm is fading fast. She still returns to upright, but the margin is nearly gone.'; }
    else if (a < AVS + 8){ state = 'Point of no return'; cls = 'danger'; ex = 'This is the angle of vanishing stability. The righting arm has hit zero — unstable equilibrium. The smallest push now decides everything.'; }
    else { state = 'Capsizing'; cls = 'danger'; ex = 'Past the point of no return: gravity and buoyancy now work together to roll her over. There is no coming back from here.'; }
    stateEl.textContent = state;
    readout.className = 'ss-readout ss-' + cls;
    explainEl.innerHTML = ex;
    if (sea) sea.style.transform = 'rotate(' + (-a * 0.12) + 'deg)';
  }
  slider.addEventListener('input', function(){ paint(parseInt(slider.value, 10)); });
  paint(0);

  // GZ curve chart
  var W = 640, H = 300, x0 = 60, x1 = 620, y0 = 250, yTop = 40, maxA = 110;
  function px(a){ return x0 + (a / maxA) * (x1 - x0); }
  function py(v){ return y0 - v * (y0 - yTop) / 0.85; }
  var d = '', peakA = 0, peakV = -1;
  for (var a = 0; a <= maxA; a += 2){
    var v = gz(a);
    if (v > peakV){ peakV = v; peakA = a; }
    d += (a === 0 ? 'M' : 'L') + px(a).toFixed(1) + ' ' + py(Math.max(0, v)).toFixed(1) + ' ';
  }
  var curve = document.getElementById('gzCurve'); if (curve) curve.setAttribute('d', d);
  var fill = document.getElementById('gzFill');
  if (fill) fill.setAttribute('d', d + 'L' + px(AVS).toFixed(1) + ' ' + y0 + ' L' + x0 + ' ' + y0 + ' Z');
  var pk = document.getElementById('gzPeak');
  if (pk){ pk.setAttribute('cx', px(peakA)); pk.setAttribute('cy', py(peakV)); }
  var pkl = document.getElementById('gzPeakLabel');
  if (pkl){ pkl.setAttribute('x', px(peakA)); pkl.setAttribute('y', py(peakV) - 12); pkl.textContent = 'Max righting arm \\u2248' + peakA + '\\u00B0'; }
  var zero = document.getElementById('gzZero');
  if (zero){ zero.setAttribute('cx', px(AVS)); zero.setAttribute('cy', y0); }
  var zl = document.getElementById('gzZeroLabel');
  if (zl){ zl.setAttribute('x', px(AVS)); zl.setAttribute('y', y0 - 12); zl.textContent = 'Point of no return ' + AVS + '\\u00B0'; }
})();
</script>`
});

/* ---------- 404 ---------- */
renderPage({
  file: '404.html', urlPath: '/404', current: '', sitemap: false,
  title: 'Page not found — ships.fyi',
  description: 'That page does not exist. Search ' + S.length + ' ships, thirteen shipyards, twenty-three lines and five record boards — or head back to the fleet.',
  robots: 'noindex, follow',
  jsonld: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Page not found', url: 'https://ships.fyi/404' },
  content: `
<section class="hero"><div class="wrap">
<h1>Off the <span class="em">chart</span>.</h1>
<p class="lead">That page does not exist — mistyped, moved, or never built. Here is everything that does.</p>
<div class="heroCtas"><a class="btn" href="/">Back to the fleet &rarr;</a><a class="btn ghost" href="/compare">Compare ships</a></div>
<p class="sub" style="margin-top:16px">Or press <b>/</b> anywhere on the site to search.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap">
<span class="eyebrow">Everything on the site</span>
<h2 class="title">Try one of these</h2>
<div class="pillars two">
<article class="acard"><h3><a href="/">All ${S.length} ships</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Every side profile drawn to true scale, with sourced specifications and full operator records.</p><a class="mini" href="/">Open the fleet &rarr;</a></article>
<article class="acard"><h3><a href="/compare">Compare ships</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Put any three ships side by side at true relative scale, against a person and a football pitch.</p><a class="mini" href="/compare">Open the tool &rarr;</a></article>
<article class="acard"><h3><a href="/records">Record boards</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">The longest, biggest and highest-capacity ships ever built — each ranked in its own honest unit.</p><a class="mini" href="/records">See the records &rarr;</a></article>
<article class="acard"><h3><a href="/canal-fit">Canal-Fit Checker</a></h3><p style="color:var(--muted);font-size:.92rem;margin:0 0 14px">Does it fit through Panama? Suez? Pick a ship and find out instantly.</p><a class="mini" href="/canal-fit">Run a ship &rarr;</a></article>
</div>
</div></section>`
});

/* ---------- RSS feed ---------- */
const feedItems = POSTS.map(p => `  <item>
    <title>${esc(p.title)}</title>
    <link>https://ships.fyi/blog/${p.slug}</link>
    <guid isPermaLink="true">https://ships.fyi/blog/${p.slug}</guid>
    <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    <description>${esc(p.dek)}</description>
  </item>`).join('\n');
fs.writeFileSync(path.join(SITE, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>ships.fyi</title>
  <link>https://ships.fyi</link>
  <description>Every giant of the sea, at true scale. Long-form maritime writing, sourced and dated.</description>
  <language>en-US</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="https://ships.fyi/feed.xml" rel="self" type="application/rss+xml"/>
${feedItems}
</channel>
</rss>
`);


/* ---------- web app manifest (generated — never let it drift from the brand) ---------- */
fs.writeFileSync(path.join(SITE, 'assets', 'site.webmanifest'), JSON.stringify({
  name: 'ships.fyi', short_name: 'ships.fyi',
  description: DATA.site.description,
  start_url: '/', display: 'standalone',
  /* MUST match <meta name="theme-color"> in layout.html and the .mn-shell
     background, or Android Chrome tints the browser bar a different colour
     from the nav. The teal signal colour does not belong here. */
  background_color: '#FAFBFC', theme_color: '#FAFBFC',
  icons: [
    { src: '/assets/img/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ]
}, null, 2));

/* ---------- security.txt + humans.txt ---------- */
fs.mkdirSync(path.join(SITE, '.well-known'), { recursive: true });
fs.writeFileSync(path.join(SITE, '.well-known', 'security.txt'),
`Contact: mailto:${DATA.site.contact}
Expires: ${new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10)}T00:00:00.000Z
Preferred-Languages: en
Canonical: https://ships.fyi/.well-known/security.txt
`);
fs.writeFileSync(path.join(SITE, 'humans.txt'),
`/* TEAM */
  Built by: ships.fyi
  Contact: ${DATA.site.contact}
  Site: https://ships.fyi

/* SITE */
  Standards: HTML5, CSS3, vanilla JavaScript
  Components: none. No frameworks, no trackers, no cookies.
  Silhouettes: original works, generated parametrically and drawn to true scale.
`);

/* ---------- sitemaps (segmented) + robots + CNAME ---------- */
const today = new Date().toISOString().slice(0, 10);
const seg = {
  'sitemap-ships.xml': pages.filter(p => p.sitemap && p.path.startsWith('/ships/')),
  'sitemap-lines.xml': pages.filter(p => p.sitemap && p.path.startsWith('/lines/')),
  'sitemap-compare.xml': pages.filter(p => p.sitemap && p.path.startsWith('/compare/')),
  'sitemap-reference.xml': pages.filter(p => p.sitemap && (p.path.startsWith('/shipyards') || p.path.startsWith('/categories') || p.path.startsWith('/explained'))),
  'sitemap-pages.xml': pages.filter(p => p.sitemap && !p.path.startsWith('/ships/') && !p.path.startsWith('/lines/') && !p.path.startsWith('/shipyards') && !p.path.startsWith('/categories') && !p.path.startsWith('/explained') && !p.path.startsWith('/compare/'))
};
for (const [file, list] of Object.entries(seg)) {
  fs.writeFileSync(path.join(SITE, file),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    list.map(p => `  <url><loc>https://ships.fyi${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
    `\n</urlset>\n`);
}
fs.writeFileSync(path.join(SITE, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  Object.keys(seg).map(f => `  <sitemap><loc>https://ships.fyi/${f}</loc><lastmod>${today}</lastmod></sitemap>`).join('\n') +
  `\n</sitemapindex>\n`);
fs.writeFileSync(path.join(SITE, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /compare?\n\nSitemap: https://ships.fyi/sitemap.xml\n');
fs.writeFileSync(path.join(SITE, 'CNAME'), 'ships.fyi\n');
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');

/* ================= I18N: dormant engine, ported for ships URLs =================
   LOCALES = [] at launch. i18n.json still carries the family's UI strings; per-market
   meta templates (ship_title etc.) must be human-reviewed before any locale opens.
   Do not delete, do not enable casually. */
const HREFLANG_OF = l => I18N.langs[l].hreflang;

function hreflangBlock(urlPath) {
  const canon = p => 'https://ships.fyi' + (p === '/' ? '/' : p);
  let out = `<link rel="alternate" hreflang="en" href="${canon(urlPath)}">\n`;
  for (const l of I18N_LANGS) out += `<link rel="alternate" hreflang="${HREFLANG_OF(l)}" href="${canon('/' + l + (urlPath === '/' ? '/' : urlPath))}">\n`;
  out += `<link rel="alternate" hreflang="x-default" href="${canon(urlPath)}">`;
  return out;
}

function localize(html, lang, urlPath) {
  const L = I18N.langs[lang];
  const parts = html.split(/(<script[\s\S]*?<\/script>)/);
  const rules = Object.entries(I18N.ui)
    .map(([k, v]) => [v.en, v[lang]])
    .filter(([a, b]) => a && b && a !== b)
    .sort((a, b) => b[0].length - a[0].length);
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith('<script')) continue;
    for (const [from, to] of rules) parts[i] = parts[i].split(from).join(to);
  }
  html = parts.join('');
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${L.hreflang}"${L.dir === 'rtl' ? ' dir="rtl"' : ''}>`);
  const am = urlPath.match(/^\/ships\/([\w-]+)$/);
  const metaShip = I18N.meta && (I18N.meta.ship_title || I18N.meta.aircraft_title);
  const metaShipD = I18N.meta && (I18N.meta.ship_desc || I18N.meta.aircraft_desc);
  if (am && metaShip && metaShip[lang]) {
    const a = S.find(x => x.slug === am[1]);
    if (a) {
      const t = metaShip[lang].replace('{name}', a.name);
      const d = metaShipD[lang].replace('{name}', a.name);
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(t)}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(d)}$2`)
        .replace(/(property="og:title" content=")[^"]*(")/, `$1${esc(t)}$2`)
        .replace(/(property="og:description" content=")[^"]*(")/, `$1${esc(d)}$2`)
        .replace(/(name="twitter:title" content=")[^"]*(")/, `$1${esc(t)}$2`)
        .replace(/(name="twitter:description" content=")[^"]*(")/, `$1${esc(d)}$2`);
    }
  }
  if (urlPath === '/' && I18N.meta && I18N.meta.site_title && I18N.meta.site_title[lang]) {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(I18N.meta.site_title[lang])}</title>`)
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(I18N.meta.site_desc[lang])}$2`);
  }
  html = html.replace(/https:\/\/ships\.fyi\/(?!assets\/)/g, `https://ships.fyi/${lang}/`);
  html = html.replace(/href="\/(?!\/)/g, m => m)
             .replace(/(href=")\/(?!feed\.xml)([^"]*")/g, `$1/${lang}/$2`);
  html = html.replace('</head>', hreflangBlock(urlPath) + '\n</head>');
  html = html.replace(/(<div class="prose[^"]*"[^>]*>)/g, `$1<p class="sub i18n-note">${esc(I18N.notice[lang])}</p>`);
  html = html.replace(/(href|src)="((?:\.\.\/)*)assets\//g, (m, attr, dots) => `${attr}="../${dots}assets/`);
  return html;
}

{
  const targets = BUILT_PAGES.filter(p => p.indexable);
  for (const lang of I18N_LANGS) {
    const urls = [];
    for (const pg of targets) {
      const src = fs.readFileSync(path.join(SITE, pg.file), 'utf8');
      const out = path.join(SITE, lang, pg.file);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, localize(src, lang, pg.urlPath));
      urls.push(`https://ships.fyi/${lang}${pg.urlPath === '/' ? '/' : pg.urlPath}`);
    }
    fs.writeFileSync(path.join(SITE, `sitemap-${lang}.xml`),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map(u => `  <url><loc>${u}</loc><lastmod>${STAMP}</lastmod></url>`).join('\n') + '\n</urlset>\n');
  }
  if (I18N_LANGS.length) {
  for (const pg of targets) {
    const f = path.join(SITE, pg.file);
    let h = fs.readFileSync(f, 'utf8');
    if (!h.includes('hreflang=')) fs.writeFileSync(f, h.replace('</head>', hreflangBlock(pg.urlPath) + '\n</head>'));
  }
  const idx = path.join(SITE, 'sitemap.xml');
  let sx = fs.readFileSync(idx, 'utf8');
  const extra = I18N_LANGS.map(l => `  <sitemap><loc>https://ships.fyi/sitemap-${l}.xml</loc></sitemap>`).join('\n');
  fs.writeFileSync(idx, sx.replace('</sitemapindex>', extra + '\n</sitemapindex>'));
  }
  console.log(`  · i18n: ${I18N_LANGS.length} languages (engine dormant at launch)`);
}

{
  const shipsAll = S.length;
  const withPhoto = S.filter(a => a.photo).length;
  const live = withPhoto - PHOTO_PENDING.length;
  console.log(`  photos: ${live} self-hosted · ${shipsAll - live} fetched by the browser from Wikimedia at load`);
}
console.log(`✔ built ${pages.length} pages (${pages.filter(p => p.sitemap).length} in sitemap)`);
pages.forEach(p => console.log(`  ${p.sitemap ? '●' : '○'} ${p.path}`));

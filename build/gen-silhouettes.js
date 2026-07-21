#!/usr/bin/env node
/* ships.fyi — parametric side-profile silhouette generator. Zero dependencies.
   Every silhouette is an ORIGINAL drawing composed from primitives on a shared
   canvas, proportioned from published dimensions (LOA, beam-independent side
   view, height above waterline). Never traced from imagery.

   Canvas: 480 × 160. Waterline at y=118. Hull always spans x=10..470 (460 units);
   the build scales rendered width by LOA relative to the longest ship.
   Output: assets/img/silhouettes/<slug>.svg with <g id="sil"> geometry,
   plus build/data/silhouettes-meta.json with per-ship viewBox crops {top,h}
   and raw polygon data (used by the OG-image renderer). */
'use strict';
const fs = require('fs');
const path = require('path');

const W = 480, WL = 118, X0 = 10, X1 = 470, HULLW = X1 - X0;
const OUT = path.join(__dirname, '..', 'assets', 'img', 'silhouettes');
fs.mkdirSync(OUT, { recursive: true });

/* px above the waterline for a real-world height on this ship */
const pxUp = (loa, m) => m / loa * HULLW;

function poly(pts) { return { pts: pts.map(p => [Number(p[0].toFixed(1)), Number(p[1].toFixed(1))]) }; }
/* rounded-front block: rectangle whose leading (left) edge is a quarter-round */
function block(x, y, w, h, r) {
  r = Math.min(r || 0, w / 2, h / 2);
  if (r <= 0.4) return poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = Math.PI + i / 6 * (Math.PI / 2); pts.push([x + r + r * Math.cos(a), y + r + r * Math.sin(a)]); }
  pts.push([x + w, y]); pts.push([x + w, y + h]); pts.push([x, y + h]);
  return poly(pts);
}
/* raked funnel — tagged so it can carry its own fill (house liveries) */
function funnel(x, yTop, w, h, rake) {
  const s = poly([[x + rake, yTop], [x + w + rake, yTop], [x + w, yTop + h], [x, yTop + h]]);
  s.role = 'funnel';
  return s;
}
function mast(x, yTop, yBot, w) { return poly([[x, yTop], [x + w, yTop], [x + w, yBot], [x, yBot]]); }

/* ---- hull: bow + sheer + stern, closing below the waterline ---- */
function hull({ loa, freeboard_m, bow, stern, sheer_m = 0, draftHint = 12 }) {
  const fb = pxUp(loa, freeboard_m);                       // deck height above WL
  const sh = pxUp(loa, sheer_m);                            // extra rise at the bow
  const deckBow = WL - fb - sh, deckStern = WL - fb;
  const bot = WL + draftHint;
  const pts = [];
  /* stern (right side) upward face */
  if (stern === 'cruiser') {
    pts.push([X1 - 14, bot]); pts.push([X1 - 4, WL + draftHint * 0.35]); pts.push([X1, WL - fb * 0.45]); pts.push([X1 - 6, deckStern]);
  } else { /* transom */
    pts.push([X1 - 6, bot]); pts.push([X1, WL - fb * 0.2]); pts.push([X1 - 2, deckStern]);
  }
  /* deck line, stern → bow, with gentle sheer */
  pts.push([X0 + 46, deckBow + sh * 0.45]);
  pts.push([X0 + 10, deckBow]);
  /* bow (left side) downward face */
  if (bow === 'bulb') {
    pts.push([X0 + 6, WL - fb * 0.15]);
    pts.push([X0 + 12, WL + 3]);
    pts.push([X0 + 2, WL + 4.5]); pts.push([X0, WL + 8]); pts.push([X0 + 3, WL + 11]); pts.push([X0 + 12, WL + draftHint - 1]);
    pts.push([X0 + 22, bot]);
  } else if (bow === 'axe') {
    pts.push([X0 + 2, WL + 2]); pts.push([X0 + 4, bot]);
  } else { /* raked */
    pts.push([X0 + 4, WL - fb * 0.1]); pts.push([X0 + 26, bot]);
  }
  return poly(pts);
}

/* ---- container stack profile: stepped bays between bow and house ---- */
function containerStacks({ loa, deckY, tiers_m, gaps }) {
  const shapes = [];
  const top = m => deckY - pxUp(loa, m);
  for (const g of gaps) { // [x0,x1,heightMetres]
    shapes.push(poly([[g[0], top(g[2])], [g[1], top(g[2])], [g[1], deckY], [g[0], deckY]]));
  }
  return shapes;
}

/* ================= per-type composers ================= */

function cruise(p) {
  const { loa, fb = 11, topDeck_m, decks = 12, funnelH_m, funnels = 1, bow = 'bulb', name } = p;
  const s = [];
  s.push(hull({ loa, freeboard_m: fb, bow, stern: 'transom', sheer_m: 4 }));
  const deckY = WL - pxUp(loa, fb);
  const supTop = WL - pxUp(loa, topDeck_m);
  const supH = deckY - supTop;
  const x = p.supX0 ?? X0 + 52, xe = p.supX1 ?? X1 - 26;
  /* main superstructure: two stepped tiers with rounded fronts */
  const t1h = supH * 0.62, t2h = supH - t1h;
  s.push(block(x, deckY - t1h, xe - x, t1h, 10));
  s.push(block(x + (p.step ?? 16), supTop, xe - x - (p.step ?? 16) - 8, t2h + 1, 9));
  /* window bands: horizontal void strips drawn as paper-coloured? single-colour silhouettes — skip voids, add deck ledges as thin notches above tier1 front */
  /* bridge wing lip at the front of tier 2 */
  s.push(poly([[x + (p.step ?? 16) - 7, supTop + t2h * 0.28], [x + (p.step ?? 16) + 4, supTop + t2h * 0.28], [x + (p.step ?? 16) + 4, supTop + t2h * 0.52], [x + (p.step ?? 16) - 7, supTop + t2h * 0.52]]));

  /* funnel(s) */
  const fh = pxUp(loa, funnelH_m - topDeck_m) + 2;
  const fx0 = p.funnelX ?? (x + (xe - x) * 0.66);
  for (let i = 0; i < funnels; i++) s.push(funnel(fx0 + i * 26, supTop - fh, 15, fh + 2, 4));
  /* mast forward */
  s.push(mast(x + (p.step ?? 16) + 10, supTop - pxUp(loa, 8), supTop, 1.6));
  return s;
}

function liner(p) { /* Titanic, QM2 — long low superstructure, big funnels, masts */
  const { loa, fb = 10, topDeck_m, funnelH_m, funnels, bow = 'raked', stern = 'cruiser' } = p;
  const s = [];
  s.push(hull({ loa, freeboard_m: fb, bow, stern, sheer_m: 5 }));
  const deckY = WL - pxUp(loa, fb);
  const supTop = WL - pxUp(loa, topDeck_m);
  const x = p.supX0 ?? X0 + 92, xe = p.supX1 ?? X1 - 78;
  const supH = deckY - supTop;
  s.push(block(x, deckY - supH * 0.6, xe - x, supH * 0.6, 5));
  s.push(block(x + 18, supTop, xe - x - 40, supH * 0.42, 4));
  const fh = pxUp(loa, funnelH_m - topDeck_m) + 3;
  const span = (xe - x - 60);
  for (let i = 0; i < funnels; i++) {
    const fx = x + 26 + (funnels > 1 ? i * span / (funnels - 1) : span / 2);
    s.push(funnel(fx, supTop - fh, 13, fh + 2, 5));
  }
  s.push(mast(X0 + 58, WL - pxUp(loa, topDeck_m + 16), deckY, 1.6));
  s.push(mast(X1 - 52, WL - pxUp(loa, topDeck_m + 12), deckY, 1.6));
  return s;
}

function container(p) {
  const { loa, fb = 7, houseX_m, houseTop_m, stackTop_m, funnelX_m, name } = p;
  const s = [];
  s.push(hull({ loa, freeboard_m: fb, bow: 'bulb', stern: 'transom', sheer_m: 3 }));
  const deckY = WL - pxUp(loa, fb);
  const mx = m => X0 + m / loa * HULLW;                    // metres-from-bow → x
  const hx = mx(houseX_m), hw = pxUp(loa, 24);
  const houseTop = WL - pxUp(loa, houseTop_m);
  const stackTop = m => WL - pxUp(loa, m);
  /* stacks: bow block, block between house and funnel, aft block */
  const st = stackTop_m;
  s.push(poly([[X0 + 34, stackTop(st * 0.82)], [X0 + 52, stackTop(st)], [hx - 5, stackTop(st)], [hx - 5, deckY], [X0 + 34, deckY]]));
  const fx = mx(funnelX_m), fw = pxUp(loa, 16);
  s.push(poly([[hx + hw + 5, stackTop(st)], [fx - 5, stackTop(st)], [fx - 5, deckY], [hx + hw + 5, deckY]]));
  s.push(poly([[fx + fw + 5, stackTop(st * 0.94)], [X1 - 22, stackTop(st * 0.8)], [X1 - 18, deckY], [fx + fw + 5, deckY]]));
  /* accommodation house with bridge wings */
  s.push(block(hx, houseTop, hw, deckY - houseTop, 2));
  s.push(poly([[hx - 4, houseTop + 2], [hx + hw + 4, houseTop + 2], [hx + hw + 4, houseTop + 5.4], [hx - 4, houseTop + 5.4]]));
  s.push(mast(hx + hw / 2, houseTop - pxUp(loa, 9), houseTop, 1.6));
  /* funnel casing */
  s.push(funnel(fx, WL - pxUp(loa, houseTop_m * 0.94), fw, pxUp(loa, houseTop_m * 0.94) - pxUp(loa, fb), 3));
  return s;
}

function tanker(p) {
  const { loa, fb = 8, houseTop_m, funnelH_m, bow = 'bulb', manifold = true } = p;
  const s = [];
  s.push(hull({ loa, freeboard_m: fb, bow, stern: 'transom', sheer_m: 2.5 }));
  const deckY = WL - pxUp(loa, fb);
  const hx = X1 - 76, hw = 42;
  const houseTop = WL - pxUp(loa, houseTop_m);
  s.push(block(hx, houseTop, hw, deckY - houseTop, 2.5));
  s.push(poly([[hx - 4, houseTop + 1.6], [hx + hw + 4, houseTop + 1.6], [hx + hw + 4, houseTop + 4.6], [hx - 4, houseTop + 4.6]]));
  const fh = pxUp(loa, funnelH_m - houseTop_m) + 3;
  s.push(funnel(hx + hw * 0.52, houseTop - fh, 13, fh + 2, 4));
  /* catwalk: thin raised line bow→house */
  const cw = deckY - 2.6;
  s.push(poly([[X0 + 44, cw], [hx - 6, cw], [hx - 6, cw + 1.4], [X0 + 44, cw + 1.4]]));
  for (let px2 = X0 + 56; px2 < hx - 12; px2 += 34) s.push(poly([[px2, cw + 1.4], [px2 + 1.6, cw + 1.4], [px2 + 1.6, deckY], [px2, deckY]]));
  if (manifold) s.push(poly([[X0 + 208, deckY - 6.5], [X0 + 236, deckY - 6.5], [X0 + 236, deckY], [X0 + 208, deckY]]));
  /* foremast */
  s.push(mast(X0 + 40, deckY - pxUp(loa, 12), deckY, 1.6));
  s.push(block(X0 + 30, deckY - 4.6, 22, 4.6, 2)); // focsle
  return s;
}

function gas(p) { /* Q-Max: membrane trunk deck */
  const { loa, fb = 9, trunk_m, houseTop_m, funnelH_m } = p;
  const s = [];
  s.push(hull({ loa, freeboard_m: fb, bow: 'bulb', stern: 'transom', sheer_m: 2.5 }));
  const deckY = WL - pxUp(loa, fb);
  const trunkTop = WL - pxUp(loa, trunk_m);
  s.push(poly([[X0 + 42, trunkTop + 2], [X0 + 58, trunkTop], [X1 - 108, trunkTop], [X1 - 100, deckY], [X0 + 36, deckY]]));
  const hx = X1 - 84, hw = 46;
  const houseTop = WL - pxUp(loa, houseTop_m);
  s.push(block(hx, houseTop, hw, deckY - houseTop, 2.5));
  s.push(poly([[hx - 4, houseTop + 1.6], [hx + hw + 4, houseTop + 1.6], [hx + hw + 4, houseTop + 4.6], [hx - 4, houseTop + 4.6]]));
  const fh = pxUp(loa, funnelH_m - houseTop_m) + 3;
  s.push(funnel(hx + hw * 0.5, houseTop - fh, 13, fh + 2, 4));
  s.push(mast(X0 + 38, deckY - pxUp(loa, 11), deckY, 1.6));
  return s;
}

function flng(p) { /* Prelude: box topsides, turret bow column, flare boom aft */
  const { loa } = p; const s = [];
  s.push(hull({ loa, freeboard_m: 16, bow: 'plumb', stern: 'transom', sheer_m: 0, draftHint: 13 }));
  const deckY = WL - pxUp(loa, 16);
  /* dense topsides modules */
  const topY = WL - pxUp(loa, 50);
  const mods = [[70, 96, 2.5], [104, 150, 0], [158, 210, 3.5], [218, 268, 1], [276, 330, 4], [338, 386, 0]];
  for (const m of mods) s.push(block(m[0], topY + m[2], m[1] - m[0], deckY - topY - m[2], 1.5));
  /* turret mooring column forward */
  s.push(poly([[34, WL - pxUp(loa, 62)], [46, WL - pxUp(loa, 62)], [50, deckY], [30, deckY]]));
  /* flare tower aft, raked */
  s.push(poly([[418, WL - pxUp(loa, 92)], [423, WL - pxUp(loa, 92)], [434, deckY], [426, deckY]]));
  /* accommodation forward */
  s.push(block(52, WL - pxUp(loa, 44), 26, WL - pxUp(loa, 16) - (WL - pxUp(loa, 44)), 2.5));
  return s;
}

function special(p) { /* Pioneering Spirit: slab hull, twin lifting beams over the bow slot */
  const { loa } = p; const s = [];
  s.push(hull({ loa, freeboard_m: 26, bow: 'plumb', stern: 'transom', sheer_m: 0, draftHint: 13 }));
  const deckY = WL - pxUp(loa, 26);
  /* topsides lift beams (side view: raked gantry over the bow) */
  s.push(poly([[X0 + 18, deckY - pxUp(loa, 22)], [X0 + 30, deckY - pxUp(loa, 22)], [X0 + 96, deckY], [X0 + 78, deckY]]));
  s.push(poly([[X0 + 44, deckY - pxUp(loa, 30)], [X0 + 56, deckY - pxUp(loa, 30)], [X0 + 122, deckY], [X0 + 104, deckY]]));
  /* jacket lift gantry aft */
  s.push(poly([[X1 - 44, deckY - pxUp(loa, 34)], [X1 - 34, deckY - pxUp(loa, 34)], [X1 - 18, deckY], [X1 - 58, deckY]]));
  /* accommodation + funnel amidships-forward */
  s.push(block(X0 + 150, deckY - pxUp(loa, 18), 42, pxUp(loa, 18), 2.5));
  s.push(funnel(X0 + 210, deckY - pxUp(loa, 14), 12, pxUp(loa, 14), 3));
  return s;
}

function bulk(p) {
  const { loa, fb = 8, houseTop_m, funnelH_m, hatches = 7 } = p;
  const s = [];
  s.push(hull({ loa, freeboard_m: fb, bow: 'bulb', stern: 'transom', sheer_m: 2.5 }));
  const deckY = WL - pxUp(loa, fb);
  const hx = X1 - 74, hw = 40;
  const houseTop = WL - pxUp(loa, houseTop_m);
  s.push(block(hx, houseTop, hw, deckY - houseTop, 2.5));
  s.push(poly([[hx - 4, houseTop + 1.6], [hx + hw + 4, houseTop + 1.6], [hx + hw + 4, houseTop + 4.6], [hx - 4, houseTop + 4.6]]));
  const fh = pxUp(loa, funnelH_m - houseTop_m) + 3;
  s.push(funnel(hx + hw * 0.52, houseTop - fh, 13, fh + 2, 4));
  const span = hx - 12 - (X0 + 44), w = span / hatches;
  for (let i = 0; i < hatches; i++) s.push(block(X0 + 44 + i * w + 3, deckY - 5, w - 6, 5, 1.5));
  s.push(mast(X0 + 40, deckY - pxUp(loa, 11), deckY, 1.6));
  s.push(block(X0 + 30, deckY - 4.6, 22, 4.6, 2));
  return s;
}

const T = { cruise, liner, container, tanker, gas, flng, special, bulk };

/* ================= the fleet ================= */
/* aboveWL heights are honest approximations from published air-draft/depth data,
   used only for silhouette proportion — never quoted as specifications. */
const SHIPS = [
  /* ---- cruise ---- */
  { slug: 'legend-of-the-seas',   t: 'cruise', loa: 365.1,  topDeck_m: 63, funnelH_m: 70, funnels: 2, step: 20 },
  { slug: 'icon-of-the-seas',     t: 'cruise', loa: 364.75, topDeck_m: 63, funnelH_m: 70, funnels: 2, step: 20 },
  { slug: 'star-of-the-seas',     t: 'cruise', loa: 364.75, topDeck_m: 63, funnelH_m: 70, funnels: 2, step: 20 },
  { slug: 'wonder-of-the-seas',   t: 'cruise', loa: 362.04, topDeck_m: 60, funnelH_m: 66, funnels: 2, step: 16 },
  { slug: 'symphony-of-the-seas', t: 'cruise', loa: 361.011,topDeck_m: 60, funnelH_m: 66, funnels: 2, step: 16 },
  { slug: 'harmony-of-the-seas',  t: 'cruise', loa: 362.12, topDeck_m: 60, funnelH_m: 66, funnels: 2, step: 16 },
  { slug: 'oasis-of-the-seas',    t: 'cruise', loa: 360,    topDeck_m: 60, funnelH_m: 65, funnels: 2, step: 16 },
  { slug: 'msc-world-europa',     t: 'cruise', loa: 333.3,  topDeck_m: 62, funnelH_m: 67, funnels: 1, step: 14 },
  { slug: 'msc-world-america',    t: 'cruise', loa: 333.3,  topDeck_m: 62, funnelH_m: 67, funnels: 1, step: 14 },
  { slug: 'msc-euribia',          t: 'cruise', loa: 331.4,  topDeck_m: 57, funnelH_m: 65, funnels: 1, step: 16 },
  { slug: 'msc-virtuosa',         t: 'cruise', loa: 331.43, topDeck_m: 57, funnelH_m: 65, funnels: 1, step: 16 },
  { slug: 'msc-grandiosa',        t: 'cruise', loa: 331.43, topDeck_m: 57, funnelH_m: 65, funnels: 1, step: 16 },
  { slug: 'msc-meraviglia',       t: 'cruise', loa: 315.83, topDeck_m: 56, funnelH_m: 64, funnels: 1, step: 15 },
  { slug: 'msc-bellissima',       t: 'cruise', loa: 315.83, topDeck_m: 56, funnelH_m: 64, funnels: 1, step: 15 },
  { slug: 'msc-seascape',         t: 'cruise', loa: 339,    topDeck_m: 54, funnelH_m: 62, funnels: 1, step: 19 },
  { slug: 'msc-seashore',         t: 'cruise', loa: 339,    topDeck_m: 54, funnelH_m: 62, funnels: 1, step: 19 },
  { slug: 'msc-seaview',          t: 'cruise', loa: 323,    topDeck_m: 52, funnelH_m: 60, funnels: 1, step: 18 },
  { slug: 'msc-seaside',          t: 'cruise', loa: 323,    topDeck_m: 52, funnelH_m: 60, funnels: 1, step: 18 },
  { slug: 'carnival-jubilee',     t: 'cruise', loa: 344.5,  topDeck_m: 58, funnelH_m: 66, funnels: 1, step: 16, funnelX: 300 },
  { slug: 'carnival-celebration',  t: 'cruise', loa: 344.5,  topDeck_m: 58, funnelH_m: 66, funnels: 1, step: 16, funnelX: 300 },
  { slug: 'mardi-gras',            t: 'cruise', loa: 344.5,  topDeck_m: 58, funnelH_m: 66, funnels: 1, step: 16, funnelX: 300 },
  { slug: 'carnival-vista',        t: 'cruise', loa: 323.6,  topDeck_m: 52, funnelH_m: 60, funnels: 1, step: 14 },
  { slug: 'carnival-horizon',      t: 'cruise', loa: 323.6,  topDeck_m: 52, funnelH_m: 60, funnels: 1, step: 14 },
  { slug: 'carnival-panorama',     t: 'cruise', loa: 323.6,  topDeck_m: 52, funnelH_m: 60, funnels: 1, step: 14 },
  { slug: 'carnival-dream',        t: 'cruise', loa: 306.02, topDeck_m: 50, funnelH_m: 58, funnels: 1, step: 13 },
  { slug: 'carnival-magic',        t: 'cruise', loa: 306.02, topDeck_m: 50, funnelH_m: 58, funnels: 1, step: 13 },
  { slug: 'carnival-breeze',       t: 'cruise', loa: 306.02, topDeck_m: 50, funnelH_m: 58, funnels: 1, step: 13 },
  { slug: 'norwegian-aqua',       t: 'cruise', loa: 322,    topDeck_m: 55, funnelH_m: 61, funnels: 1, step: 14 },
  { slug: 'norwegian-encore',     t: 'cruise', loa: 333.44, topDeck_m: 54, funnelH_m: 62, funnels: 1, step: 16 },
  { slug: 'norwegian-bliss',      t: 'cruise', loa: 333.4,  topDeck_m: 54, funnelH_m: 62, funnels: 1, step: 16 },
  { slug: 'norwegian-joy',        t: 'cruise', loa: 333.4,  topDeck_m: 54, funnelH_m: 62, funnels: 1, step: 16 },
  { slug: 'norwegian-escape',     t: 'cruise', loa: 325.9,  topDeck_m: 53, funnelH_m: 61, funnels: 1, step: 16 },
  { slug: 'norwegian-luna',       t: 'cruise', loa: 322,    topDeck_m: 55, funnelH_m: 61, funnels: 1, step: 14 },
  { slug: 'norwegian-epic',       t: 'cruise', loa: 329.4,  topDeck_m: 55, funnelH_m: 63, funnels: 1, step: 18 },
  { slug: 'norwegian-getaway',    t: 'cruise', loa: 324,    topDeck_m: 52, funnelH_m: 60, funnels: 1, step: 15 },
  { slug: 'norwegian-breakaway',  t: 'cruise', loa: 324,    topDeck_m: 52, funnelH_m: 60, funnels: 1, step: 15 },
  { slug: 'norwegian-viva',       t: 'cruise', loa: 294,    topDeck_m: 50, funnelH_m: 58, funnels: 1, step: 13 },
  { slug: 'norwegian-prima',      t: 'cruise', loa: 294,    topDeck_m: 50, funnelH_m: 58, funnels: 1, step: 13 },
  { slug: 'disney-wish',          t: 'cruise', loa: 341.1,  topDeck_m: 53, funnelH_m: 62, funnels: 2, step: 18 },
  { slug: 'disney-adventure',     t: 'cruise', loa: 342,    topDeck_m: 58, funnelH_m: 66, funnels: 2, step: 18 },
  { slug: 'disney-destiny',       t: 'cruise', loa: 341.1,  topDeck_m: 53, funnelH_m: 62, funnels: 2, step: 18 },
  { slug: 'disney-treasure',      t: 'cruise', loa: 341.1,  topDeck_m: 53, funnelH_m: 62, funnels: 2, step: 18 },
  { slug: 'disney-fantasy',       t: 'cruise', loa: 340,    topDeck_m: 52, funnelH_m: 61, funnels: 2, step: 16 },
  { slug: 'disney-dream',         t: 'cruise', loa: 340,    topDeck_m: 52, funnelH_m: 61, funnels: 2, step: 16 },
  { slug: 'disney-magic',         t: 'cruise', loa: 294,    topDeck_m: 44, funnelH_m: 54, funnels: 2, step: 12 },
  { slug: 'disney-wonder',        t: 'cruise', loa: 294,    topDeck_m: 44, funnelH_m: 54, funnels: 2, step: 12 },
  { slug: 'aidanova',             t: 'cruise', loa: 337,    topDeck_m: 56, funnelH_m: 62, funnels: 1, step: 15 },
  { slug: 'aidacosma',            t: 'cruise', loa: 337,    topDeck_m: 56, funnelH_m: 62, funnels: 1, step: 15 },
  { slug: 'aidaperla',            t: 'cruise', loa: 300,    topDeck_m: 50, funnelH_m: 57, funnels: 1, step: 18 },
  { slug: 'aidaprima',            t: 'cruise', loa: 300,    topDeck_m: 50, funnelH_m: 57, funnels: 1, step: 18 },
  { slug: 'aidastella',           t: 'cruise', loa: 253.26, topDeck_m: 40, funnelH_m: 46, funnels: 1, step: 11 },
  { slug: 'aidamar',              t: 'cruise', loa: 253.3,  topDeck_m: 40, funnelH_m: 46, funnels: 1, step: 11 },
  { slug: 'aidasol',              t: 'cruise', loa: 253.33, topDeck_m: 40, funnelH_m: 46, funnels: 1, step: 11 },
  { slug: 'aidablu',              t: 'cruise', loa: 253.3,  topDeck_m: 40, funnelH_m: 46, funnels: 1, step: 11 },
  { slug: 'aidaluna',             t: 'cruise', loa: 251.9,  topDeck_m: 39, funnelH_m: 45, funnels: 1, step: 10 },
  { slug: 'aidabella',            t: 'cruise', loa: 251.9,  topDeck_m: 39, funnelH_m: 45, funnels: 1, step: 10 },
  { slug: 'aidadiva',             t: 'cruise', loa: 251.89, topDeck_m: 39, funnelH_m: 45, funnels: 1, step: 10 },
  { slug: 'costa-smeralda',       t: 'cruise', loa: 337,    topDeck_m: 56, funnelH_m: 63, funnels: 1, step: 15 },
  { slug: 'costa-toscana',        t: 'cruise', loa: 337,    topDeck_m: 56, funnelH_m: 63, funnels: 1, step: 15 },
  { slug: 'costa-diadema',        t: 'cruise', loa: 306,    topDeck_m: 48, funnelH_m: 55, funnels: 1, step: 17 },
  { slug: 'costa-pacifica',       t: 'cruise', loa: 290,    topDeck_m: 45, funnelH_m: 52, funnels: 1, step: 15 },
  { slug: 'costa-serena',         t: 'cruise', loa: 290,    topDeck_m: 45, funnelH_m: 52, funnels: 1, step: 15 },
  { slug: 'costa-fascinosa',      t: 'cruise', loa: 290,    topDeck_m: 45, funnelH_m: 52, funnels: 1, step: 15 },
  { slug: 'costa-favolosa',       t: 'cruise', loa: 290,    topDeck_m: 45, funnelH_m: 52, funnels: 1, step: 15 },
  { slug: 'costa-fortuna',        t: 'cruise', loa: 272.19, topDeck_m: 43, funnelH_m: 50, funnels: 1, step: 13 },
  { slug: 'costa-deliziosa',      t: 'cruise', loa: 294,    topDeck_m: 45, funnelH_m: 52, funnels: 1, step: 14 },
  { slug: 'queen-mary-2',         t: 'liner',  loa: 345.03, topDeck_m: 52, funnelH_m: 62, funnels: 1, bow: 'raked', stern: 'transom', supX0: X0 + 64, supX1: X1 - 40, fb: 12 },
  { slug: 'queen-anne',           t: 'cruise', loa: 322.51, topDeck_m: 48, funnelH_m: 55, funnels: 1, step: 16 },
  { slug: 'queen-elizabeth',      t: 'cruise', loa: 294,    topDeck_m: 45, funnelH_m: 52, funnels: 1, step: 14 },
  { slug: 'queen-victoria',       t: 'cruise', loa: 294,    topDeck_m: 45, funnelH_m: 52, funnels: 1, step: 14 },
  { slug: 'titanic',              t: 'liner',  loa: 269.06, topDeck_m: 32, funnelH_m: 53, funnels: 4, bow: 'plumb', stern: 'cruiser' },
  { slug: 'star-princess',       t: 'cruise', loa: 345,    topDeck_m: 56, funnelH_m: 62, funnels: 1, step: 22 },
  { slug: 'sun-princess',         t: 'cruise', loa: 345.3,  topDeck_m: 56, funnelH_m: 62, funnels: 1, step: 22 },
  { slug: 'discovery-princess',   t: 'cruise', loa: 330,    topDeck_m: 52, funnelH_m: 59, funnels: 1, step: 18 },
  { slug: 'enchanted-princess',   t: 'cruise', loa: 330,    topDeck_m: 52, funnelH_m: 59, funnels: 1, step: 18 },
  { slug: 'sky-princess',         t: 'cruise', loa: 330,    topDeck_m: 52, funnelH_m: 59, funnels: 1, step: 18 },
  { slug: 'majestic-princess',    t: 'cruise', loa: 330,    topDeck_m: 52, funnelH_m: 59, funnels: 1, step: 18 },
  { slug: 'regal-princess',       t: 'cruise', loa: 330,    topDeck_m: 52, funnelH_m: 59, funnels: 1, step: 18 },
  { slug: 'royal-princess',       t: 'cruise', loa: 330,    topDeck_m: 52, funnelH_m: 59, funnels: 1, step: 18 },
  { slug: 'diamond-princess',     t: 'cruise', loa: 290.2,  topDeck_m: 46, funnelH_m: 54, funnels: 1, step: 14 },
  { slug: 'sapphire-princess',    t: 'cruise', loa: 290.2,  topDeck_m: 46, funnelH_m: 54, funnels: 1, step: 14 },
  { slug: 'ruby-princess',        t: 'cruise', loa: 290,    topDeck_m: 47, funnelH_m: 55, funnels: 1, step: 15 },
  { slug: 'caribbean-princess',   t: 'cruise', loa: 289.9,  topDeck_m: 46, funnelH_m: 54, funnels: 1, step: 14 },
  { slug: 'grand-princess',       t: 'cruise', loa: 289.9,  topDeck_m: 45, funnelH_m: 53, funnels: 1, step: 13 },
  { slug: 'arvia',                t: 'cruise', loa: 345,    topDeck_m: 55, funnelH_m: 61, funnels: 1, step: 21 },
  { slug: 'iona',                 t: 'cruise', loa: 344.5,  topDeck_m: 55, funnelH_m: 61, funnels: 1, step: 21 },
  { slug: 'britannia',            t: 'cruise', loa: 330,    topDeck_m: 52, funnelH_m: 59, funnels: 1, step: 18 },
  { slug: 'ventura',              t: 'cruise', loa: 288.6,  topDeck_m: 46, funnelH_m: 54, funnels: 1, step: 14 },
  { slug: 'azura',                t: 'cruise', loa: 290,    topDeck_m: 46, funnelH_m: 54, funnels: 1, step: 14 },
  { slug: 'arcadia',              t: 'cruise', loa: 289.9,  topDeck_m: 43, funnelH_m: 51, funnels: 1, step: 12 },
  { slug: 'aurora',               t: 'cruise', loa: 270,    topDeck_m: 42, funnelH_m: 50, funnels: 1, step: 11 },
  { slug: 'celebrity-xcel',       t: 'cruise', loa: 326.4,  topDeck_m: 52, funnelH_m: 58, funnels: 1, step: 24 },
  { slug: 'celebrity-ascent',     t: 'cruise', loa: 327,    topDeck_m: 52, funnelH_m: 58, funnels: 1, step: 24 },
  { slug: 'celebrity-beyond',     t: 'cruise', loa: 327,    topDeck_m: 52, funnelH_m: 58, funnels: 1, step: 24 },
  { slug: 'celebrity-apex',       t: 'cruise', loa: 306,    topDeck_m: 50, funnelH_m: 56, funnels: 1, step: 22 },
  { slug: 'celebrity-edge',       t: 'cruise', loa: 306,    topDeck_m: 50, funnelH_m: 56, funnels: 1, step: 22 },
  { slug: 'celebrity-reflection', t: 'cruise', loa: 319,    topDeck_m: 49, funnelH_m: 56, funnels: 1, step: 16 },
  { slug: 'celebrity-silhouette', t: 'cruise', loa: 317.2,  topDeck_m: 48, funnelH_m: 55, funnels: 1, step: 15 },
  { slug: 'celebrity-eclipse',    t: 'cruise', loa: 317.2,  topDeck_m: 48, funnelH_m: 55, funnels: 1, step: 15 },
  { slug: 'celebrity-equinox',    t: 'cruise', loa: 317.2,  topDeck_m: 48, funnelH_m: 55, funnels: 1, step: 15 },
  { slug: 'celebrity-solstice',   t: 'cruise', loa: 317.2,  topDeck_m: 48, funnelH_m: 55, funnels: 1, step: 15 },
  { slug: 'celebrity-constellation', t: 'cruise', loa: 294, topDeck_m: 44, funnelH_m: 51, funnels: 1, step: 13 },
  { slug: 'celebrity-summit',     t: 'cruise', loa: 294,    topDeck_m: 44, funnelH_m: 51, funnels: 1, step: 13 },
  { slug: 'celebrity-infinity',   t: 'cruise', loa: 294,    topDeck_m: 44, funnelH_m: 51, funnels: 1, step: 13 },
  { slug: 'celebrity-millennium', t: 'cruise', loa: 294,    topDeck_m: 44, funnelH_m: 51, funnels: 1, step: 13 },
  { slug: 'rotterdam',            t: 'cruise', loa: 299.8,  topDeck_m: 47, funnelH_m: 54, funnels: 1, step: 26 },
  { slug: 'nieuw-statendam',      t: 'cruise', loa: 297.2,  topDeck_m: 47, funnelH_m: 54, funnels: 1, step: 26 },
  { slug: 'koningsdam',           t: 'cruise', loa: 299.9,  topDeck_m: 47, funnelH_m: 54, funnels: 1, step: 26 },
  { slug: 'nieuw-amsterdam',      t: 'cruise', loa: 285.3,  topDeck_m: 44, funnelH_m: 51, funnels: 1, step: 20 },
  { slug: 'eurodam',              t: 'cruise', loa: 285.3,  topDeck_m: 44, funnelH_m: 51, funnels: 1, step: 20 },
  { slug: 'noordam',              t: 'cruise', loa: 285,    topDeck_m: 43, funnelH_m: 50, funnels: 1, step: 17 },
  { slug: 'westerdam',            t: 'cruise', loa: 285,    topDeck_m: 43, funnelH_m: 50, funnels: 1, step: 17 },
  { slug: 'oosterdam',            t: 'cruise', loa: 285,    topDeck_m: 43, funnelH_m: 50, funnels: 1, step: 17 },
  { slug: 'zuiderdam',            t: 'cruise', loa: 285,    topDeck_m: 43, funnelH_m: 50, funnels: 1, step: 17 },
  { slug: 'zaandam',              t: 'cruise', loa: 237.1,  topDeck_m: 38, funnelH_m: 45, funnels: 1, step: 12 },
  { slug: 'volendam',             t: 'cruise', loa: 237.9,  topDeck_m: 38, funnelH_m: 45, funnels: 1, step: 12 },

  /* ---- container ---- */
  { slug: 'msc-irina',            t: 'container', loa: 399.9,  houseX_m: 118, houseTop_m: 52, stackTop_m: 34, funnelX_m: 300 },
  { slug: 'ever-alot',            t: 'container', loa: 399.9,  houseX_m: 120, houseTop_m: 52, stackTop_m: 33, funnelX_m: 302 },
  { slug: 'ever-ace',             t: 'container', loa: 399.9,  houseX_m: 120, houseTop_m: 52, stackTop_m: 33, funnelX_m: 302 },
  { slug: 'ever-given',           t: 'container', loa: 399.94, houseX_m: 122, houseTop_m: 50, stackTop_m: 31, funnelX_m: 300 },
  { slug: 'oocl-spain',           t: 'container', loa: 399.99, houseX_m: 118, houseTop_m: 52, stackTop_m: 33, funnelX_m: 300 },
  { slug: 'oocl-hong-kong',       t: 'container', loa: 399.87, houseX_m: 124, houseTop_m: 50, stackTop_m: 31, funnelX_m: 298 },
  { slug: 'cma-cgm-jacques-saade',t: 'container', loa: 399.9,  houseX_m: 120, houseTop_m: 52, stackTop_m: 32, funnelX_m: 300 },
  { slug: 'hmm-algeciras',        t: 'container', loa: 399.9,  houseX_m: 120, houseTop_m: 52, stackTop_m: 33, funnelX_m: 300 },
  { slug: 'emma-maersk',          t: 'container', loa: 397.71, houseX_m: 250, houseTop_m: 48, stackTop_m: 28, funnelX_m: 316 },
  { slug: 'maersk-mc-kinney-moller', t: 'container', loa: 399.2, houseX_m: 128, houseTop_m: 50, stackTop_m: 30, funnelX_m: 306 },
  { slug: 'madrid-maersk',        t: 'container', loa: 399,   houseX_m: 128, houseTop_m: 50, stackTop_m: 31, funnelX_m: 306 },
  { slug: 'mol-triumph',          t: 'container', loa: 400,   houseX_m: 122, houseTop_m: 51, stackTop_m: 31, funnelX_m: 300 },
  { slug: 'barzan',               t: 'container', loa: 400,   houseX_m: 122, houseTop_m: 51, stackTop_m: 30, funnelX_m: 300 },
  { slug: 'ideal-x',              t: 'tanker',    loa: 160,   fb: 5.5, houseTop_m: 17, funnelH_m: 22, bow: 'raked', manifold: false },
  /* ---- tankers & giants ---- */
  { slug: 'seawise-giant',        t: 'tanker', loa: 458.45, houseTop_m: 34, funnelH_m: 42 },
  { slug: 'batillus',             t: 'tanker', loa: 414.22, houseTop_m: 33, funnelH_m: 41 },
  { slug: 'pierre-guillaumat',    t: 'tanker', loa: 414.22, houseTop_m: 33, funnelH_m: 41 },
  { slug: 'esso-atlantic',        t: 'tanker', loa: 406.57, houseTop_m: 33, funnelH_m: 40 },
  { slug: 'ti-europe',            t: 'tanker', loa: 380,    houseTop_m: 32, funnelH_m: 40 },
  { slug: 'ti-oceania',           t: 'tanker', loa: 380,    houseTop_m: 32, funnelH_m: 40 },
  { slug: 'exxon-valdez',         t: 'tanker', loa: 300.85, houseTop_m: 28, funnelH_m: 35 },
  { slug: 'mozah',                t: 'gas',    loa: 345,    trunk_m: 15, houseTop_m: 32, funnelH_m: 40 },
  { slug: 'prelude-flng',         t: 'flng',   loa: 488 },
  { slug: 'berge-stahl',          t: 'bulk',   loa: 342.08, houseTop_m: 30, funnelH_m: 37, hatches: 9 },
  { slug: 'vale-brasil',          t: 'bulk',   loa: 362,    houseTop_m: 31, funnelH_m: 38, hatches: 9 },
  { slug: 'pioneering-spirit',    t: 'special',loa: 382 }
];

const META = {};
for (const sp of SHIPS) {
  const shapes = T[sp.t](sp);
  /* bbox → viewBox crop */
  let top = WL;
  for (const s of shapes) for (const p of s.pts) top = Math.min(top, p[1]);
  const vbTop = Math.max(0, Math.floor(top - 5));
  const vbH = Math.ceil(WL + 15 - vbTop);   // include draft hint below the waterline
  const paths = shapes.map(s => {
    /* --sil-funnel lets an operator colour the funnel separately; when it is not
       set, `inherit` picks up the parent <g fill> exactly as before. */
    const f = s.role === 'funnel' ? ' fill="var(--sil-funnel,inherit)"' : '';
    return `<path${f} d="M${s.pts.map(p => p.join(' ')).join('L')}Z"/>`;
  }).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${vbTop} ${W} ${vbH}"><g id="sil" fill="currentColor">\n${paths}\n</g></svg>\n`;
  fs.writeFileSync(path.join(OUT, sp.slug + '.svg'), svg);
  META[sp.slug] = { top: vbTop, h: vbH, loa: sp.loa, polys: shapes.map(s => s.pts), roles: shapes.map(s => s.role || null) };
}
fs.writeFileSync(path.join(__dirname, 'data', 'silhouettes-meta.json'), JSON.stringify(META));
console.log(`✔ ${SHIPS.length} silhouettes → ${OUT}`);

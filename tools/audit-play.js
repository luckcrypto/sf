const fs=require('fs');
const f=process.argv[2], h=fs.readFileSync(f,'utf8');
const head=h.slice(0,h.indexOf('</head>'));
const body=h.slice(h.indexOf('<body'));
const css=h.slice(h.indexOf('<style>'),h.indexOf('</style>'));
const js=h.match(/<script>([\s\S]*)<\/script>/)[1];
const cssNS=css.replace(/\s/g,'');
const jsNS=js.replace(/\s/g,'');
let pass=0,fail=0;
function T(ok,label,detail){ if(ok){pass++;console.log('  PASS  '+label);} else {fail++;console.log('  FAIL  '+label+(detail?'  — '+detail:''));} }
function S(t){ console.log('\n'+t); }

S('SEO — core');
T(/<html lang="en">/.test(h),'html has lang');
T(/<title>[^<]{20,60}<\/title>/.test(head),'title present and 20-60 chars', (head.match(/<title>([^<]*)</)||[])[1]);
const desc=(head.match(/name="description" content="([^"]*)"/)||[])[1]||'';
T(desc.length>=120&&desc.length<=170,'meta description 120-170 chars','len '+desc.length);
T(/rel="canonical" href="https:\/\/ships\.fyi\/play"/.test(head),'canonical URL');
T(/name="robots"[^>]*max-image-preview:large/.test(head),'robots directives');
T(/name="viewport"[^>]*width=device-width/.test(head),'responsive viewport');
T(/name="theme-color"/.test(head),'theme-color');
T(/rel="manifest"/.test(head),'web manifest linked');
T(/rel="icon"[^>]*svg/.test(head)&&/apple-touch-icon/.test(head),'favicon set + apple touch icon');
T(/rel="alternate"[^>]*rss/.test(head),'RSS alternate (site convention)');

S('SEO — social');
['og:type','og:site_name','og:url','og:title','og:description','og:image','og:image:width','og:image:height','og:image:alt','og:locale']
  .forEach(k=>T(new RegExp('property="'+k+'"').test(head),'meta '+k));
['twitter:card','twitter:title','twitter:description','twitter:image','twitter:image:alt']
  .forEach(k=>T(new RegExp('name="'+k+'"').test(head),'meta '+k));

S('Structured data');
const blocks=[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
T(blocks.length>=3,'three or more JSON-LD blocks','found '+blocks.length);
let types=[];
blocks.forEach((b,i)=>{ try{ const o=JSON.parse(b[1]); types.push(o['@type']); }catch(e){ types.push('INVALID'); } });
T(!types.includes('INVALID'),'all JSON-LD parses');
T(types.includes('VideoGame'),'VideoGame schema');
T(types.includes('FAQPage'),'FAQPage schema');
T(types.includes('BreadcrumbList'),'BreadcrumbList schema');
const vg=blocks.map(b=>{try{return JSON.parse(b[1])}catch(e){return{}}}).find(o=>o['@type']==='VideoGame')||{};
T(vg.isAccessibleForFree===true,'VideoGame marked free');
T(vg.offers&&vg.offers.price==='0','offer price zero (ranks for "free")');
T(!!vg.publisher,'publisher declared');
T(!/aggregateRating/.test(h),'no fabricated ratings');
const faq=blocks.map(b=>{try{return JSON.parse(b[1])}catch(e){return{}}}).find(o=>o['@type']==='FAQPage');
const faqQs=faq?faq.mainEntity.map(q=>q.name.toLowerCase()):[];
const onPage=body.toLowerCase();
T(faqQs.length>0&&faqQs.every(q=>{
  const key=q.replace(/[^a-z ]/g,'').split(' ').filter(w=>w.length>4).slice(0,2);
  return key.every(k=>onPage.includes(k));
}),'every schema FAQ question is backed by visible page content');

S('Crawlable content');
T(/<h1[^>]*>/.test(body),'has an h1');
T((body.match(/<h1/g)||[]).length===1,'exactly one h1');
T(/<h2/.test(body),'has h2 structure');
T(/free ship game/i.test(body),'target phrase present in visible copy');
T(/<main/.test(body),'main landmark');
T(/<noscript>/.test(body),'noscript fallback');
const ships=['Titanic','Icon of the Seas','Ever Given','Seawise Giant','Pioneering Spirit','Queen Mary 2','Emma','Batillus'];
T(ships.every(s=>body.includes(s)),'ship names in static crawlable HTML');
T(/<ul class="shiplist">/.test(body),'ship list is real markup, not JS-only');
T(/<dl class="faq">/.test(body),'FAQ is real markup');
T(/href="https:\/\/ships\.fyi\/"/.test(body),'links back to the site');

S('Accessibility');
T(/class="skip"/.test(body),'skip link');
T(/\.sr-only\{/.test(cssNS.replace(/\s/g,''))||/sr-only/.test(css),'screen-reader-only utility exists');
T(/id="kbdHelp"/.test(body),'keyboard instructions in the DOM');
T(/<canvas[^>]*aria-hidden="true"/.test(body),'decorative canvas hidden from AT');
T(/id="joy"[^>]*aria-hidden="true"/.test(body),'drag surface hidden (keyboard path provided)');
T(/id="thrWrap"[^>]*role="slider"/.test(body),'telegraph has slider role');
T(/aria-valuenow/.test(body)&&/aria-valuetext/.test(body),'telegraph exposes its value');
T(/setAttribute\('aria-valuenow'/.test(js),'telegraph value updates live');
T(/role="radiogroup"/.test(body),'radiogroup for pickers');
T(/role="tablist"/.test(body),'tablist for categories');
T(/aria-pressed/.test(body)&&/aria-pressed/.test(js),'toggle buttons expose pressed state');
T(/role="status"/.test(body),'status live regions');
T(/aria-live="assertive"/.test(body),'important events announced');
T(/aria-live="off"/.test(body),'per-frame numbers NOT spammed to AT');
T(/role="dialog"/.test(body)&&/aria-modal/.test(body),'end screen is a dialog');
T(/createElement\('button'\)/.test(js),'pickers built as buttons, not clickable divs');
T(!/onclick="/.test(body),'no inline onclick handlers');
T(/:focus-visible\{/.test(cssNS),'visible focus styling');
T(/prefers-reduced-motion/.test(css),'respects reduced motion');
T(/aria-label/.test(body),'aria-labels present');

S('Site conventions & house rules');
T(/Space Grotesk/.test(css)&&!/Hanken/.test(h),'one font family, matching ships.fyi');
T(/\*\{cursor:default/.test(cssNS),'cursor policy block present');
T(!/localStorage|sessionStorage/.test(js),'no browser storage');
T(/color-scheme/.test(head),'colour scheme declared');
T(/forced-color-adjust/.test(cssNS),'forced-colors handled');

/* ---- mobile browser chrome: /play behaves exactly like every other page ----
   The sea is drawn on the canvas (position:fixed;inset:0), so the page background
   is free to be the site's colour. All seven chrome sources agree; nothing is
   set by JS, because Brave will not reliably repaint chrome touched after parse. */
T((head.match(/name="theme-color"/gi)||[]).length===1, 'exactly one theme-color tag');
T(/name="theme-color"\s+content="#FAFBFC"\s*>/i.test(head), 'theme-color is the site value #FAFBFC');
T(!/name="theme-color"[^>]*media=/i.test(head), 'no dark-variant theme-color tag');
T(!/getElementById\(['"]themeColour/.test(js), 'theme-color is NOT injected by JS');
T(/name="color-scheme"\s+content="light only"/i.test(head), 'color-scheme is "light only" (blocks forced-dark)');
T(cssNS.includes('html,body{margin:0;height:100%;overflow:hidden;overscroll-behavior:none;background:#FAFBFC'),
  'html,body background is #FAFBFC, same as the site');
T(/@media\(prefers-color-scheme:dark\)\{html,body\{background:#FAFBFC/i.test(cssNS),
  'forced-dark re-assertion present');

console.log('\n  '+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);

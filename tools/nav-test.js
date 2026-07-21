// Load site.js against a DOM that ONLY contains the ids/classes present on play.html,
// so the `if (!el) return` guards behave exactly as they would in a browser.
const fs=require('fs');
const page=fs.readFileSync('play.html','utf8');
const ids=new Set([...page.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
const classes=new Set();
[...page.matchAll(/class="([^"]+)"/g)].forEach(m=>m[1].split(/\s+/).forEach(c=>classes.add(c)));

function mkEl(id){ return {
  id, style:new Proxy({},{get:()=>'',set:()=>true}), dataset:{}, children:[], _attrs:{},
  classList:{_s:new Set(),add(){},remove(){},toggle(){},contains(){return false}},
  className:'', innerHTML:'', textContent:'', value:'', disabled:false,
  addEventListener(){}, removeEventListener(){}, appendChild(c){return c},
  setAttribute(){}, getAttribute(){return null}, removeAttribute(){}, hasAttribute(){return false},
  getBoundingClientRect(){return{left:0,top:0,width:100,height:100,right:100,bottom:100}},
  /* An element's own querySelector must return something: site.js sets innerHTML
     and then queries its own children, which works in a real browser. Only
     DOCUMENT-level queries stay realistic (null when the page lacks the node). */
  querySelector(){return mkEl('child')}, querySelectorAll(){return []},
  closest(){return null}, focus(){}, blur(){}, click(){}, matches(){return false},
  contains(){return false}, remove(){}, insertBefore(){}, scrollIntoView(){}
};}
const doc={
  getElementById:id=>ids.has(id)?mkEl(id):null,          // realistic: null when absent
  querySelector:sel=>{ const c=sel.replace(/^[.#]/,''); return (classes.has(c)||ids.has(c))?mkEl(c):null; },
  querySelectorAll:()=>[],
  createElement:t=>mkEl('new-'+t),
  createDocumentFragment:()=>mkEl('frag'),
  addEventListener(){}, removeEventListener(){},
  documentElement:mkEl('html'), body:mkEl('body'), head:mkEl('head'),
  cookie:'', title:'', readyState:'complete'
};
const win={ innerWidth:390, innerHeight:844, devicePixelRatio:2, scrollY:0, pageYOffset:0,
  addEventListener(){}, removeEventListener(){}, requestAnimationFrame(){return 1}, cancelAnimationFrame(){},
  setTimeout:()=>0, clearTimeout(){}, setInterval:()=>0, clearInterval(){},
  matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},
  location:{href:'https://ships.fyi/play',pathname:'/play'}, history:{replaceState(){}},
  performance:{now:()=>0}, getComputedStyle:()=>({getPropertyValue:()=>''}),
  SEARCH_INDEX:[], scrollTo(){}, navigator:{userAgent:'test'}
};
global.document=doc; global.window=win;
for(const k of Object.keys(win)) if(typeof global[k]==='undefined') global[k]=win[k];

const src=fs.readFileSync('assets/js/site.js','utf8');
try{ new Function('document','window',src)(doc,win); console.log('  site.js executed on play.html DOM without throwing'); }
catch(e){ console.log('  site.js THREW: '+e.message); console.log(e.stack.split('\n').slice(0,5).join('\n')); process.exit(1); }

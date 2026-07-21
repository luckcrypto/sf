const fs=require('fs'), path=require('path');
function walk(d,out=[]){ for(const e of fs.readdirSync(d,{withFileTypes:true})){
  if(['.git','build','node_modules','__pycache__','tools'].includes(e.name)) continue;
  const f=path.join(d,e.name);
  if(e.isDirectory()) walk(f,out); else if(e.name.endsWith('.html')) out.push(f);
} return out; }
const files=walk('.');
const checks={
  'html lang':            h=>/<html lang="[^"]+"/.test(h),
  'title present':        h=>/<title>[^<]{5,}<\/title>/.test(h),
  'title <= 60 chars':    h=>{const m=h.match(/<title>([^<]*)</);return m?m[1].length<=60:false;},
  'meta description':     h=>/name="description" content="[^"]{50,}"/.test(h),
  'canonical':            h=>/rel="canonical"/.test(h),
  'robots meta':          h=>/name="robots"/.test(h),
  'viewport':             h=>/name="viewport"[^>]*width=device-width/.test(h),
  'og:title':             h=>/property="og:title"/.test(h),
  'og:description':       h=>/property="og:description"/.test(h),
  'og:image':             h=>/property="og:image"/.test(h),
  'og:url':               h=>/property="og:url"/.test(h),
  'twitter:card':         h=>/name="twitter:card"/.test(h),
  'JSON-LD present':      h=>/application\/ld\+json/.test(h),
  'JSON-LD valid':        h=>{const b=[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
                              if(!b.length)return false;
                              try{ b.forEach(x=>JSON.parse(x[1])); return true; }catch(e){ return false; }},
  'exactly one h1':       h=>(h.match(/<h1[\s>]/g)||[]).length===1,
  'favicon':              h=>/rel="icon"/.test(h),
  'theme-color':          h=>/name="theme-color"/.test(h),
  'skip link':            h=>/class="skip"/.test(h),
  'no empty alt on <img>':h=>{const im=[...h.matchAll(/<img[^>]*>/g)].map(m=>m[0]);
                              return im.every(t=>/alt="/.test(t));},
};
const results={}, failing={};
for(const k of Object.keys(checks)) { results[k]=0; failing[k]=[]; }
for(const f of files){
  const h=fs.readFileSync(f,'utf8');
  for(const [k,fn] of Object.entries(checks)){
    let ok=false; try{ ok=fn(h); }catch(e){ ok=false; }
    if(ok) results[k]++; else failing[k].push(f);
  }
}
console.log('  '+files.length+' HTML pages audited\n');
let allPass=true;
for(const k of Object.keys(checks)){
  const n=results[k], pct=(n/files.length*100).toFixed(0);
  const bad=n<files.length;
  if(bad) allPass=false;
  console.log('  '+(bad?'FAIL':'PASS')+'  '+k.padEnd(24)+String(n).padStart(4)+'/'+files.length+'  '+pct+'%'+
    (bad?'   e.g. '+failing[k].slice(0,3).map(x=>x.replace('./','')).join(', '):''));
}
console.log('\n  '+(allPass?'every page passes every check':'see failures above'));

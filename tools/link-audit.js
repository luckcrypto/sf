const fs=require('fs'), path=require('path');
function walk(d,out=[]){ for(const e of fs.readdirSync(d,{withFileTypes:true})){
  if(['.git','build','node_modules','__pycache__','tools'].includes(e.name)) continue;
  const f=path.join(d,e.name);
  if(e.isDirectory()) walk(f,out); else out.push(f);
} return out; }
const all=walk('.').map(f=>f.replace(/^\.\//,''));
const htmls=all.filter(f=>f.endsWith('.html'));
const exists=new Set(all);
function resolves(u,fromFile){
  if(/^(https?:|#|mailto:|tel:|data:|javascript:)/.test(u)) return true;
  let p=u.split('#')[0].split('?')[0];
  if(!p) return true;
  // resolve RELATIVE to the linking file's directory, which is the bit I got wrong
  p = p.startsWith('/') ? p.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), p));
  if(p==='.'||p==='') return exists.has('index.html');
  return exists.has(p) || exists.has(p+'.html') || exists.has(p.replace(/\/$/,'')+'/index.html');
}
let broken=[], checked=0;
for(const f of htmls){
  const h=fs.readFileSync(f,'utf8');
  for(const m of h.matchAll(/(?:href|src)="([^"]+)"/g)){
    checked++;
    if(!resolves(m[1],f)) broken.push(f+'  ->  '+m[1]);
  }
}
console.log('  internal links checked : '+checked.toLocaleString());
console.log('  broken                 : '+broken.length);
const uniq=[...new Set(broken.map(b=>b.split('  ->  ')[1]))];
uniq.slice(0,12).forEach(u=>console.log('    '+u+'   ('+broken.filter(b=>b.endsWith(u)).length+' pages)'));

const smFiles=all.filter(f=>/^sitemap.*\.xml$/.test(f));
let inSitemap=new Set();
smFiles.forEach(f=>{ for(const m of fs.readFileSync(f,'utf8').matchAll(/<loc>https:\/\/ships\.fyi([^<]*)<\/loc>/g)) inSitemap.add(m[1]); });
console.log('\n  sitemap files          : '+smFiles.length);
console.log('  URLs in sitemaps       : '+inSitemap.size);
console.log('  /play listed           : '+(inSitemap.has('/play')?'yes':'NO'));
console.log('\n  GitHub Pages essentials:');
['CNAME','.nojekyll','robots.txt','sitemap.xml','404.html','index.html','feed.xml'].forEach(f=>{
  console.log('    '+(exists.has(f)?'present':'MISSING').padEnd(9)+f);
});

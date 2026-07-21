/* Mobile browser chrome audit — the seven-place rule.
   The chrome colour must be identical in seven places, and six oversights that
   break it (each of which has bitten this site) must be absent from every page. */
const fs=require('fs'), path=require('path');
const C='#FAFBFC';
const norm=s=>s.toLowerCase();

function walk(d,out=[]){ for(const e of fs.readdirSync(d,{withFileTypes:true})){
  if(['.git','build','node_modules','__pycache__','tools'].includes(e.name)) continue;
  const f=path.join(d,e.name);
  if(e.isDirectory()) walk(f,out); else if(e.name.endsWith('.html')) out.push(f);
} return out; }

const pages=walk('.').map(f=>f.replace(/^\.\//,''));
const css=fs.readFileSync('assets/css/main.css','utf8').replace(/\s+/g,'');
const man=JSON.parse(fs.readFileSync('site.webmanifest','utf8'));

let fails=[];
function G(ok,label,detail){ console.log('  '+(ok?'PASS':'FAIL')+'  '+label+(ok?'':'   '+(detail||''))); if(!ok) fails.push(label); }

console.log('\n  THE SEVEN PLACES (must all be '+C+')\n');
G(fs.existsSync('site.webmanifest'), 'manifest is at the SITE ROOT, not under assets/',
  'scope defaults to its own directory; under /assets/ it excludes every page');
G(man.scope==='/', 'manifest declares scope "/"', String(man.scope));
G(man.start_url==='/'&&(man.scope||'/')==='/', 'start_url is inside scope',
  'a start_url outside scope makes the whole manifest invalid');
G(norm(man.theme_color)===norm(C),      'manifest theme_color', man.theme_color);
G(norm(man.background_color)===norm(C), 'manifest background_color', man.background_color);
G(css.includes('html{background:'+C.toLowerCase())||css.includes('html{background:'+C),
                                        'main.css html background');
G(css.includes('background-color:'+C)||css.includes('body{background:'+C),
                                        'main.css body background');
G(css.includes('.mn-shell{background:'+C), 'main.css .mn-shell background');
G(/@media\(prefers-color-scheme:dark\)\{html,body\{background:#FAFBFC/i.test(css),
                                        'main.css forced-dark re-assertion');

console.log('\n  PER PAGE ('+pages.length+' pages)\n');
const per={
  'exactly one theme-color tag': h=>(h.match(/name="theme-color"/gi)||[]).length===1,
  ['theme-color is '+C]:        h=>{const m=h.match(/name="theme-color"[^>]*content="([^"]+)"/i)||h.match(/content="([^"]+)"[^>]*name="theme-color"/i); return m&&norm(m[1])===norm(C);},
  'theme-color is a literal hex':h=>{const m=h.match(/name="theme-color"[^>]*content="([^"]+)"/i); return m&&/^#[0-9a-f]{6}$/i.test(m[1]);},
  'color-scheme is "light only"':h=>/name="color-scheme"\s+content="light only"/i.test(h),
  'no dark-variant theme-color': h=>!/name="theme-color"[^>]*media=[^>]*dark/i.test(h),
  'no apple-mobile-web-app-* tags':   h=>!/name="(apple-)?mobile-web-app-/i.test(h),
  'no apple status-bar-style tag':    h=>!/apple-mobile-web-app-status-bar-style/i.test(h),
  'theme-color not JS-injected': h=>!/getElementById\(['"]themeColour|querySelector\(['"]meta\[name="theme-color/i.test(h),
};
for(const [label,fn] of Object.entries(per)){
  const bad=pages.filter(f=>{ try{ return !fn(fs.readFileSync(f,'utf8')); }catch(e){ return true; } });
  G(bad.length===0, label+'  ('+(pages.length-bad.length)+'/'+pages.length+')', 'e.g. '+bad.slice(0,3).join(', '));
}
console.log('\n  '+(fails.length?fails.length+' FAILED':'all chrome checks pass')+'\n');
process.exit(fails.length?1:0);

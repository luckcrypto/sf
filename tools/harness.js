// Minimal DOM + canvas mock so the game can actually RUN outside a browser.
const fs=require('fs');
const file=process.argv[2];
const html=fs.readFileSync(file,'utf8');

const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
function mkEl(id){
  const el={
    id, style:new Proxy({},{get:()=>'',set:()=>true}), dataset:{}, children:[],
    classList:{ _s:new Set(), add(c){this._s.add(c)}, remove(c){this._s.delete(c)},
                toggle(c,v){v?this._s.add(c):this._s.delete(c)}, contains(c){return this._s.has(c)} },
    _cls:'', get className(){return this._cls}, set className(v){this._cls=v},
    innerHTML:'', textContent:'', disabled:false,
    addEventListener(){}, removeEventListener(){},
    _attrs:{},
    setAttribute(k,v){ this._attrs[k]=String(v); },
    getAttribute(k){ return Object.prototype.hasOwnProperty.call(this._attrs,k)?this._attrs[k]:null; },
    removeAttribute(k){ delete this._attrs[k]; },
    hasAttribute(k){ return Object.prototype.hasOwnProperty.call(this._attrs,k); },
    appendChild(c){this.children.push(c); return c},
    getBoundingClientRect(){return {left:0,top:0,width:100,height:100,right:100,bottom:100}},
    getContext(){return CTX}, click(){}, focus(){},
    set onclick(f){this._onclick=f}, get onclick(){return this._onclick}
  };
  return el;
}
const CTX=new Proxy({},{get:(t,k)=>{
  if(k==='canvas') return {width:400,height:800};
  if(k==='setTransform'||k==='save'||k==='restore') return ()=>{};
  if(k==='createImageData') return (w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)});
  if(k==='putImageData') return (img)=>{
    if(!img||!img.data) throw new Error('putImageData got no ImageData');
    return undefined; };
  if(k==='drawImage') return (...a)=>{
    for(const v of a) if(typeof v==='number' && !isFinite(v)) throw new Error('NON-FINITE in drawImage: '+a.join(','));
    return undefined; };
  if(k==='imageSmoothingEnabled') return true;
  return (...a)=>{ 
    for(const v of a) if(typeof v==='number' && !isFinite(v)) throw new Error('NON-FINITE passed to ctx.'+String(k)+': '+a.join(','));
    return undefined; };
}});
const registry={};
for(const id of ids) registry[id]=mkEl(id);
const doc={
  getElementById:id=>registry[id]||(registry[id]=mkEl(id)),
  querySelectorAll:sel=>{
    if(sel==='#time div'||sel==='#time button') return [0,1,2,3].map(i=>{const e=mkEl('t'+i); e.dataset.t=String([1,10,30,60][i]); return e;});
    return [];
  },
  createElement:t=>{const e=mkEl('new-'+t); e.getContext=()=>CTX; return e;},
  addEventListener(){}, body:mkEl('body')
};
let rafQ=[];
const win={
  innerWidth:390, innerHeight:844, devicePixelRatio:2,
  addEventListener(){}, removeEventListener(){},
  requestAnimationFrame(fn){ rafQ.push(fn); return rafQ.length; },
  cancelAnimationFrame(){}, setTimeout:()=>0, clearTimeout:()=>{}, setInterval:()=>0, clearInterval:()=>{},
  performance:{now:()=>Date.now()}
};
global.document=doc; global.window=win;
for(const k of ['innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame',
                'cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','performance'])
  global[k]=win[k];

const js=html.match(/<script>([\s\S]*)<\/script>/)[1];
try{
  new Function('document','window',js)(doc,win);
  console.log('  IIFE executed without throwing');
}catch(e){ console.log('  THREW ON LOAD: '+e.message); process.exit(1); }

// now drive it: press "go", then pump frames
try{
  const go=registry['go'];
  if(go && go._onclick){ go._onclick(); console.log('  start() ran'); }
  else { console.log('  could not find #go handler'); }
}catch(e){ console.log('  THREW IN start(): '+e.message+'\n'+e.stack.split('\n').slice(0,4).join('\n')); process.exit(1); }

let frames=0, err=null;
try{
  for(let i=0;i<6000 && rafQ.length;i++){
    const fn=rafQ.shift(); fn(Date.now()+i*16.7); frames++;
  }
}catch(e){ err=e; }
if(err){ console.log('  THREW AT FRAME '+frames+': '+err.message);
         console.log(err.stack.split('\n').slice(0,6).join('\n')); process.exit(1); }
console.log('  ran '+frames+' frames clean');if(win.__nulls!==undefined)console.log('  distance '+win.__km.toFixed(1)+' km · ribbons '+win.__ribs+' · tombstoned '+win.__nulls);

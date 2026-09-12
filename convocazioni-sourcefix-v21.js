(()=>{'use strict';
const V='convocazioni-sourcefix-v21';
const OUT='17L4pTwKdrDxHHm2Sg6MWQx2cg_yUnTXm';
const FM='application/vnd.google-apps.folder';
const DM='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XM='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CANON={doc:'1fHohJRlkq2oN3isMkNC25Q_yFmtKMQKs',front:'1LsIztXr6xavLsCHmBfccJiJ9i1-q89pl',delivery:'1VcSH6xjrn_On88CwQJat9r1tpp3qXegP'};
const MODELS=[
 {id:'172CA6FH8sv-C-S8OLrREGgIzXXDoLLeh',name:'PANTANI',doc:CANON.doc,front:'1wyavkgA1xUrAZNuiStVNtBL6wPzbnyHq',delivery:CANON.delivery,safe:true},
 {id:'1ZFMJ6eIPrLLsT9Gdynl-mplByUZ2xos8',name:'KAROL',doc:CANON.doc,front:CANON.front,delivery:CANON.delivery,safe:true},
 {id:'1cKpZ5eVgqp0R--2A3_cCMNA61xvRS7BJ',name:'CLANIO 2',doc:CANON.doc,front:CANON.front,delivery:CANON.delivery,safe:false,reason:'frontespizio specifico non verificato'},
 {id:'1UJjCEenvEnLIOMgRstTBz2eLO3dZOcfV',name:'DEMACOOP',doc:CANON.doc,front:'1ChDxr0ywodWqPZVfb1xdu1E4CoPbty-5',delivery:CANON.delivery,safe:false,reason:'frontespizio storico contiene residuo PANTANI'},
 {id:'1TF8uI2eosO00lD1DrnMProeSMpS0r84m',name:'GARDENIA',doc:CANON.doc,front:CANON.front,delivery:CANON.delivery,safe:false,reason:'frontespizio specifico non verificato'}
];
const MAP=Object.fromEntries(MODELS.map(x=>[x.id,x]));
const oldFetch=window.fetch.bind(window);
let active=null;
function fake(files){return new Response(JSON.stringify({files}),{status:200,headers:{'Content-Type':'application/json'}})}
function modelFiles(m){const a=[
 {id:m.doc,name:m.doc===CANON.doc?'CONVOCAZIONE karol.docx':'CONVOCAZIONE.docx',mimeType:DM,modifiedTime:'2026-09-12T00:00:00Z'},
 {id:m.delivery,name:'consegna CONVOCAZIONE assemblea.xlsx',mimeType:XM,modifiedTime:'2026-09-12T00:00:00Z'}
];if(m.safe)a.splice(1,0,{id:m.front,name:m.front===CANON.front?'Frontaspizio consegna delibera.xlsx':'Frontaspizio.xlsx',mimeType:XM,modifiedTime:'2026-09-12T00:00:00Z'});return a}
function ziplib(){return new Promise((ok,no)=>{if(window.JSZip)return ok(window.JSZip);let s=document.querySelector('script[data-conv21-zip]');if(s){s.addEventListener('load',()=>ok(window.JSZip),{once:true});return}s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.dataset.conv21Zip='1';s.onload=()=>ok(window.JSZip);s.onerror=()=>no(Error('Motore documenti non disponibile'));document.head.appendChild(s)})}
async function retargetBlob(b,id,name){if(!name||name==='KAROL'||![CANON.doc,CANON.front,CANON.delivery].includes(id))return b;let J=await ziplib(),z=await J.loadAsync(b),p=id===CANON.doc?'word/document.xml':'xl/sharedStrings.xml',f=z.file(p);if(!f)return b;let s=await f.async('string');s=s.replace(/PARCO\s+KAROL/gi,name).replace(/\bKAROL\b/gi,name);z.file(p,s);return z.generateAsync({type:'blob',mimeType:id===CANON.doc?DM:XM,compression:'DEFLATE'})}
window.fetch=async function(input,init={}){
 const url=typeof input==='string'?input:(input&&input.url)||'';
 try{
  if(url.startsWith('https://www.googleapis.com/drive/v3/files?')&&(!init.method||init.method==='GET')){
   const u=new URL(url),q=u.searchParams.get('q')||'';
   if(q.includes(`'${OUT}' in parents`))return fake(MODELS.map(m=>({id:m.id,name:m.name,mimeType:FM,modifiedTime:'2026-09-12T00:00:00Z'})));
   const m=MODELS.find(x=>q.includes(`'${x.id}' in parents`));
   if(m){active=m;return fake(modelFiles(m))}
  }
  if(url.includes('https://www.googleapis.com/drive/v3/files?fields=id,name')&&String(init.method||'GET').toUpperCase()==='POST'&&typeof init.body==='string'){
   let j=JSON.parse(init.body),m=MAP[j?.parents?.[0]];
   if(m&&!m.safe)throw Error('Modello '+m.name+' bloccato: '+m.reason);
   if(m&&j.mimeType===FM){active=m;j.parents=[OUT];j.name=String(j.name||'Assemblea').replace(/^Assemblea\s*/i,`Assemblea ${m.name} `);return oldFetch(input,{...init,body:JSON.stringify(j)})}
  }
  const mm=url.match(/\/drive\/v3\/files\/([^?]+)\?alt=media/);
  if(mm&&active&&[CANON.doc,CANON.front,CANON.delivery].includes(mm[1])){
   const r=await oldFetch(input,init);if(!r.ok)return r;const b=await r.blob(),p=await retargetBlob(b,mm[1],active.name);return new Response(p,{status:200,headers:{'Content-Type':p.type||'application/octet-stream'}})
  }
 }catch(e){console.warn(V,e);if(String(e.message||'').startsWith('Modello '))throw e}
 return oldFetch(input,init)
};
function mark(){let el=document.querySelector('#c2launch span');if(el)el.textContent='TEST · MODELLI ORIGINALI V2.1'}
setTimeout(mark,800);setTimeout(mark,1600);
window.condoConvocazioniSourceFixV21={version:V,outputRoot:OUT,models:MODELS.map(({id,name,safe,reason})=>({id,name,safe,reason:reason||''}))};
})();

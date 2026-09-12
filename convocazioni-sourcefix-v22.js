(()=>{'use strict';
const V='convocazioni-sourcefix-v22';
const OUT='17L4pTwKdrDxHHm2Sg6MWQx2cg_yUnTXm';
const FM='application/vnd.google-apps.folder';
const DM='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XM='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MODELS=[
 {id:'172CA6FH8sv-C-S8OLrREGgIzXXDoLLeh',name:'PANTANI',doc:null,front:'1wyavkgA1xUrAZNuiStVNtBL6wPzbnyHq',delivery:null,safe:false,reason:'set centrale originale non più presente: recuperato solo il frontespizio PANTANI'},
 {id:'1ZFMJ6eIPrLLsT9Gdynl-mplByUZ2xos8',name:'KAROL',doc:'1fHohJRlkq2oN3isMkNC25Q_yFmtKMQKs',front:'1LsIztXr6xavLsCHmBfccJiJ9i1-q89pl',delivery:'1VcSH6xjrn_On88CwQJat9r1tpp3qXegP',safe:true},
 {id:'1cKpZ5eVgqp0R--2A3_cCMNA61xvRS7BJ',name:'CLANIO 2',doc:null,front:null,delivery:null,safe:false,reason:'set centrale originale non più presente e master specifici non ancora recuperati'},
 {id:'1UJjCEenvEnLIOMgRstTBz2eLO3dZOcfV',name:'DEMACOOP',doc:null,front:null,delivery:null,safe:false,reason:'frontespizio storico trovato ma contaminato da residuo PANTANI; set centrale originale non più presente'},
 {id:'1TF8uI2eosO00lD1DrnMProeSMpS0r84m',name:'GARDENIA',doc:null,front:null,delivery:null,safe:false,reason:'set centrale originale non più presente; il frontespizio verbale resta escluso'}
];
const MAP=Object.fromEntries(MODELS.map(x=>[x.id,x]));
const baseFetch=window.fetch.bind(window);
let active=null;
function reply(files){return new Response(JSON.stringify({files}),{status:200,headers:{'Content-Type':'application/json'}})}
function filesFor(m){
 const a=[];
 if(m.doc)a.push({id:m.doc,name:m.name==='KAROL'?'CONVOCAZIONE karol.docx':'CONVOCAZIONE.docx',mimeType:DM,modifiedTime:'2026-09-12T00:00:00Z'});
 if(m.front)a.push({id:m.front,name:m.name==='PANTANI'?'Frontaspizio consegna delibera ULTIMA ASSEMBLEA.xlsx':'Frontaspizio consegna delibera.xlsx',mimeType:XM,modifiedTime:'2026-09-12T00:00:00Z'});
 if(m.delivery)a.push({id:m.delivery,name:'consegna CONVOCAZIONE assemblea.xlsx',mimeType:XM,modifiedTime:'2026-09-12T00:00:00Z'});
 return a;
}
window.fetch=async function(input,init={}){
 const url=typeof input==='string'?input:(input&&input.url)||'';
 if(url.startsWith('https://www.googleapis.com/drive/v3/files?')&&(!init.method||init.method==='GET')){
  const u=new URL(url),q=u.searchParams.get('q')||'';
  if(q.includes(`'${OUT}' in parents`))return reply(MODELS.map(m=>({id:m.id,name:m.name,mimeType:FM,modifiedTime:'2026-09-12T00:00:00Z'})));
  const m=MODELS.find(x=>q.includes(`'${x.id}' in parents`));
  if(m){active=m;return reply(filesFor(m))}
 }
 if(url.includes('https://www.googleapis.com/drive/v3/files?fields=id,name')&&String(init.method||'GET').toUpperCase()==='POST'&&typeof init.body==='string'){
  const j=JSON.parse(init.body),m=MAP[j?.parents?.[0]];
  if(m&&!m.safe)throw Error('Modello '+m.name+' bloccato: '+m.reason);
  if(m&&j.mimeType===FM){active=m;j.parents=[OUT];j.name=String(j.name||'Assemblea').replace(/^Assemblea\s*/i,`Assemblea ${m.name} `);return baseFetch(input,{...init,body:JSON.stringify(j)})}
 }
 return baseFetch(input,init)
};
function mark(){
 const badge=document.querySelector('#c2launch span');if(badge)badge.textContent='TEST · MODELLI ORIGINALI V2.2';
 const sel=document.getElementById('c2condo'),status=document.getElementById('c2status');
 if(sel&&!sel.dataset.sourcefix22){sel.dataset.sourcefix22='1';sel.addEventListener('change',()=>{const m=MAP[sel.value];if(m&&!m.safe&&status)setTimeout(()=>{status.textContent='Modello '+m.name+' bloccato in sicurezza: '+m.reason;status.style.color='#b42318'},80)})}
}
setTimeout(mark,800);setTimeout(mark,1600);setTimeout(mark,3000);
window.condoConvocazioniSourceFixV22={version:V,outputRoot:OUT,models:MODELS.map(({id,name,safe,reason,doc,front,delivery})=>({id,name,safe,reason:reason||'',doc:!!doc,front:!!front,delivery:!!delivery}))};
})();

import fs from 'node:fs';
const src=fs.readFileSync('convocazioni-sourcefix-v22.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app-current.html','utf8');
function ok(c,m){if(!c)throw new Error(m)}
new Function(src);
for(const n of ['PANTANI','KAROL','CLANIO 2','DEMACOOP','GARDENIA'])ok(src.includes(`name:'${n}'`),'modello '+n+' assente');
ok(src.includes("const OUT='17L4pTwKdrDxHHm2Sg6MWQx2cg_yUnTXm'"),'output root errato');
ok(src.includes("name:'KAROL',doc:'1fHohJRlkq2oN3isMkNC25Q_yFmtKMQKs',front:'1LsIztXr6xavLsCHmBfccJiJ9i1-q89pl',delivery:'1VcSH6xjrn_On88CwQJat9r1tpp3qXegP',safe:true"),'set KAROL originale non completo');
ok(src.includes("name:'PANTANI',doc:null,front:'1wyavkgA1xUrAZNuiStVNtBL6wPzbnyHq',delivery:null,safe:false"),'PANTANI deve esporre solo il frontespizio verificato');
for(const n of ['CLANIO 2','DEMACOOP','GARDENIA']){
  const p=src.indexOf(`name:'${n}'`);ok(p>=0,'modello '+n+' assente');const s=src.slice(p,p+320);ok(s.includes('safe:false'),'blocco sicurezza assente per '+n);ok(s.includes('doc:null')&&s.includes('front:null')&&s.includes('delivery:null'),'fallback incrociato presente per '+n);
}
ok(!src.includes('retargetBlob')&&!src.includes('CANON'),'V2.2 non deve retargettare/usare un modello universale');
ok(src.includes("if(m&&!m.safe)throw Error('Modello '+m.name+' bloccato: '+m.reason)"),'guard scrittura assente');
ok(!src.includes('condo_archive_v5')&&!src.includes('condo_contacts_v5')&&!src.includes('condo_last_update_v5'),'chiavi core toccate');
for(const t of [index,app]){ok(t.includes('convocazioni-sourcefix-v22.js'),'loader non carica V2.2');ok(!t.includes('convocazioni-sourcefix-v21.js'),'loader carica ancora V2.1');ok(t.indexOf('convocazioni-template-v2.js')<t.indexOf('convocazioni-sourcefix-v22.js'),'ordine V2/V2.2 errato')}
console.log('CONVOCAZIONI SOURCEFIX V2.2 QA PASSED');

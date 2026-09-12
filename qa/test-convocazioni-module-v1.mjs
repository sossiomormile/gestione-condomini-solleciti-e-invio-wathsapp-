import fs from 'node:fs';
const js=fs.readFileSync('convocazioni-module-v1.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const current=fs.readFileSync('app-current.html','utf8');
const must=[
  'CONVOCAZIONI','convocazioni-v1','17L4pTwKdrDxHHm2Sg6MWQx2cg_yUnTXm',
  'https://www.googleapis.com/auth/drive.readonly','1ª convocazione','2ª convocazione',
  'Ordine del giorno','Allegati','GENERA PDF / STAMPA','condo_convocazioni_draft_test_v1_'
];
for(const x of must) if(!js.includes(x)) throw new Error('Marker modulo mancante: '+x);
for(const bad of ["localStorage.setItem('condo_archive_v5'",'localStorage.setItem("condo_archive_v5"',"localStorage.setItem('condo_contacts_v5'",'localStorage.setItem("condo_contacts_v5"']){
  if(js.includes(bad)) throw new Error('Possibile accesso non isolato: '+bad);
}
if(/method\s*:\s*['\"](?:POST|PUT|PATCH|DELETE)['\"]/i.test(js)) throw new Error('V1 non deve scrivere su Drive');
for(const [name,txt] of [['index.html',index],['app-current.html',current]]){
  if(!txt.includes('convocazioni-module-v1.js?v=20260912-conv1')) throw new Error(name+' non carica il modulo convocazioni');
  const a=txt.indexOf('pdf-resoconto-v1.js');
  const b=txt.indexOf('convocazioni-module-v1.js');
  const c=txt.indexOf('version-label-v1.js');
  if(!(a>=0&&b>a&&c>b)) throw new Error(name+' ordine loader non corretto');
}
console.log('CONVOCAZIONI MODULE V1 STATIC TEST PASSED');

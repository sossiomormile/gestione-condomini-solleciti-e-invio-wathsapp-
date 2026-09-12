import fs from 'node:fs';
const src=fs.readFileSync('convocazioni-template-v2.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app-current.html','utf8');
function ok(c,m){if(!c)throw new Error(m)}
ok(src.includes("const V='convocazioni-template-v2'"),'marker V2 assente');
ok(src.includes("https://www.googleapis.com/auth/drive.readonly"),'scope read assente');
ok(src.includes("https://www.googleapis.com/auth/drive"),'scope write assente');
ok(src.includes('async function docx'),'patch DOCX assente');
ok(src.includes('async function front'),'patch Frontespizio assente');
ok(src.includes('async function delivery'),'patch Consegna assente');
ok(src.includes('I modelli originali non vengono sovrascritti'),'protezione master assente');
ok(src.includes('Consegna verbale resta separato'),'isolamento verbale assente');
ok(!src.includes('condo_archive_v5')&&!src.includes('condo_contacts_v5')&&!src.includes('condo_last_update_v5'),'chiavi core toccate dal modulo');
ok(index.includes('convocazioni-template-v2.js'),'index TEST non carica V2');
ok(app.includes('convocazioni-template-v2.js'),'app-current TEST non carica V2');
ok(index.indexOf('convocazioni-module-v1.js')<index.indexOf('convocazioni-template-v2.js'),'ordine loader V1/V2 errato');
console.log('CONVOCAZIONI TEMPLATE V2 QA PASSED');

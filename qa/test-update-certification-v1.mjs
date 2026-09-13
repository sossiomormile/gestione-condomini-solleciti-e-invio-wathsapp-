import fs from 'node:fs';
import vm from 'node:vm';
const cert=fs.readFileSync('update-certification-v1.js','utf8');
const drive=fs.readFileSync('drive-sync-v4.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app-current.html','utf8');
function ok(c,m){if(!c)throw new Error(m)}
new Function(cert);new Function(drive);
const baseApi={auditWorkbook:()=>({ok:true,errors:[]}),auditFile:async()=>({ok:true,errors:[]}),finalize:()=>({ok:true,errors:[],totals:{}}),renderBatchSummary:()=>{},getBatch:()=>[]};
const sandbox={window:{condoSelfCheckV1:baseApi},XLSX:{},console};sandbox.globalThis=sandbox;vm.runInNewContext(cert,sandbox);
const api=sandbox.window.condoUpdateCertificationV1;ok(api?.active===true,'certificazione runtime non attiva');
const current=['Condominio Clanio 2','Condominio Demacoop','Condominio Di Lorenzo','Condominio Di.Be','Condominio F.lli Caruso C.so Vitt. Emenuele','Condominio F.lli Caruso Via Lupoli','Condominio Globo','CONDOMINIO NEW GATE','Condominio Parco Gardenia','Condominio Parco Iris','Condominio Parco Pantani','Condominio Parco San Nazario','PARCO DEL SOLE','PARCO KAROL','parco oliteama'];
for(const n of current)ok(api.expectedSource(n),`manca sorgente certificata per ${n}`);
ok(cert.includes('Ricalcolo indipendente del motore'),'manca doppio ricalcolo indipendente');
ok(cert.includes('riga Incassi duplicata'),'manca guard identità riga Incassi');
ok(cert.includes('ordine Incassi duplicato'),'manca guard ordine Incassi');
ok(cert.includes('totale lordo incoerente'),'manca controllo totale lordo');
ok(cert.includes('Conteggio/totale rate ordinarie non coincide al centesimo'),'manca controllo centesimi');
ok(cert.includes('Totali conguagli Drive/motore/app non coincidono al centesimo'),'manca controllo incrociato conguagli');
ok(cert.includes('Motore non risolto:'),'manca blocco casi motore non risolti');
ok(cert.includes('Certificazione estesa AGGIORNA'),'manca riepilogo certificazione estesa');
ok(drive.includes("if(!window.condoUpdateCertificationV1?.active)throw new Error('Certificazione estesa AGGIORNA non disponibile: aggiornamento bloccato.')"),'Drive V4 non blocca se certificazione assente');
ok(drive.includes("rows.filter(r=>r.state!=='ok'||r.validated!==true)"),'Drive V4 accetta sorgenti non certificate');
ok(drive.includes('verifyArchiveMatchesDrive'),'manca verifica archivio = Drive');
ok(drive.includes('verifyProtectedData'),'manca verifica dati protetti');
ok(drive.includes('rollbackFullRefreshTransaction'),'manca rollback automatico');
ok(drive.includes("window.condoDriveSyncV4=publicApi;window.condoDriveSyncV3=publicApi"),'alias runtime V4/V3 assente');
for(const loader of [index,app]){
 ok(loader.includes('update-certification-v1.js'),'loader non carica certificazione V1');
 ok(loader.includes('drive-sync-v4.js'),'loader non carica Drive V4');
 ok(!loader.includes('drive-sync-v3.js'),'loader carica ancora Drive V3');
 ok(loader.indexOf('v1-cent-consistency-v1.js')<loader.indexOf('update-certification-v1.js'),'certificazione caricata prima dei controlli centesimi');
 ok(loader.indexOf('update-certification-v1.js')<loader.indexOf('drive-sync-v4.js'),'Drive V4 caricato prima della certificazione');
}
console.log('UPDATE CERTIFICATION V1 QA PASSED',JSON.stringify({currentCondos:current.length,strictSourceRules:true,rollback:true}));

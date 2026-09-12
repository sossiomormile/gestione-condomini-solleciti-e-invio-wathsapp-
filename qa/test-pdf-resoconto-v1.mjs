import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const fail=m=>{throw new Error(m)};
const code=fs.readFileSync('pdf-resoconto-v1.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app-current.html','utf8');

try{execFileSync(process.execPath,['--check','pdf-resoconto-v1.js'],{stdio:'pipe'})}catch(e){fail('Sintassi PDF resoconto non valida: '+String(e.stderr||e.message))}

for(const needle of [
  'Dati PDF resoconto',
  'Via / indirizzo condominio *',
  'Comune / Paese *',
  'CAP *',
  'Nome amministratore *',
  'Email amministratore *',
  'IBAN conto corrente condominiale *',
  'Gentile Condòmino, di seguito riportiamo il riepilogo aggiornato',
  'La invitiamo a verificare le voci indicate',
  'Resoconto quote condominiali',
  'TOTALE DA VERSARE',
  'Il versamento può essere effettuato mediante bonifico sul conto corrente condominiale',
  'IBAN:',
  'window.condoPdfResocontoV1',
  'window.resocontoPdf=generate',
  'condo_pdf_summary_test_v1_'
])if(!code.includes(needle))fail('Elemento mancante nel PDF resoconto: '+needle);

if(code.includes('localStorage.setItem(legacyKey'))fail('Il PDF TEST non deve sovrascrivere la configurazione stabile');
if(!index.includes('pdf-resoconto-v1.js?v=20260912-pdfsummary1'))fail('index TEST non carica pdf-resoconto-v1.js');
if(!app.includes('pdf-resoconto-v1.js?v=20260912-pdfsummary1'))fail('app-current TEST non carica pdf-resoconto-v1.js');
const iDrive=index.indexOf('drive-sync-v3.js?v=20260911-fullrefresh3');
const iPdf=index.indexOf('pdf-resoconto-v1.js?v=20260912-pdfsummary1');
const iVersion=index.indexOf('version-label-v1.js?v=20260912-prod-v4');
if(iDrive<0||iPdf<0||iVersion<0||!(iDrive<iPdf&&iPdf<iVersion))fail('Ordine loader PDF TEST errato');

console.log('PDF RESOCONTO STRUCTURAL TEST PASSED');

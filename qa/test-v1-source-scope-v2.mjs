import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync('v1-source-scope-v2.js','utf8');
const seen=[];
const context={window:{condoAnalyzeV6:(wb)=>{seen.push([...wb.SheetNames]);return{unresolved:[],people:[]}}},console};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.condoV1SourceScopeV2;
if(!api)throw new Error('v1-source-scope-v2 non caricato');
const wb={
 SheetNames:['Frontespizio','Incassi 2026','Polizza','Consumi idrici','Conguagli','Recupero Incassi','Spese straordinarie'],
 Sheets:{
  'Frontespizio':{},'Incassi 2026':{},'Polizza':{},'Consumi idrici':{},'Conguagli':{},'Recupero Incassi':{},'Spese straordinarie':{}
 }
};
context.window.condoAnalyzeV6(wb,'2026-2027.xlsx');
const got=seen[0]||[];
for(const required of ['Incassi 2026','Conguagli','Recupero Incassi'])if(!got.includes(required))throw new Error('Foglio operativo escluso: '+required+' -> '+got.join(' | '));
for(const forbidden of ['Polizza','Consumi idrici','Spese straordinarie'])if(got.includes(forbidden))throw new Error('Foglio estraneo entrato nel motore: '+forbidden);
if(api.primaryIncassi(wb)!=='Incassi 2026')throw new Error('Foglio Incassi primario errato');
console.log('V1 SOURCE SCOPE V2 PASSED',got.join(' | '));

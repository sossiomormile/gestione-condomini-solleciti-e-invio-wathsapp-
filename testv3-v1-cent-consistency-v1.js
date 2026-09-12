(()=>{
'use strict';
const api=window.condoSelfCheckV1,guard=window.condoOrdinaryCentGuardV1;
if(!api||!guard?.sourceOrdinaryByRow||typeof XLSX==='undefined')return;
const nrm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const num=x=>{if(typeof x==='number'&&Number.isFinite(x))return x;const z=parseFloat(String(x??'').replace(',','.'));return Number.isFinite(z)?z:0};
const round2=x=>Math.round((Number(x)||0)*100)/100;
function preciseOrdinaryAudit(wb,people,fileName){
 const source=guard.sourceOrdinaryByRow(wb,fileName),errors=[],details=[],byRow=new Map();let actualCount=0,actualTotal=0,expectedCount=0,expectedTotal=0;
 for(const [row,u] of source){expectedCount+=u.unpaid.length;expectedTotal+=u.unpaid.reduce((s,x)=>s+num(x.amount),0)}
 for(const p of people||[]){
  const row=Number(p?._sourceRow),actual=(p?.items||[]).filter(x=>x.type==='ordinary').map(x=>({mese:String(x.label||''),amount:round2(x.amount)}));actualCount+=actual.length;actualTotal+=actual.reduce((s,x)=>s+x.amount,0);
  if(!Number.isFinite(row)||!source.has(row))continue;if(byRow.has(row)){errors.push(`Precisione centesimi: posizione Incassi duplicata ${row} (${p.name})`);continue}byRow.set(row,p);
  const expected=source.get(row).unpaid.map(x=>({mese:String(x.label||''),amount:round2(x.amount)}));
  if(actual.length!==expected.length){errors.push(`${p.name}: rate ordinarie app ${actual.length}, Drive ${expected.length}`);details.push({name:p.name,row,type:'ordinary-count',app:actual.length,drive:expected.length})}
  const max=Math.max(actual.length,expected.length);for(let i=0;i<max;i++){const a=actual[i],e=expected[i];if(!a||!e)continue;if(nrm(a.mese)!==nrm(e.mese)||Math.abs(a.amount-e.amount)>.01){errors.push(`${p.name}: rata ${i+1} diversa (app ${a.mese} ${a.amount}; Drive ${e.mese} ${e.amount})`);details.push({name:p.name,row,type:'ordinary-value',app:a,drive:e})}}
 }
 for(const [row,u] of source){if(!u.unpaid.length||byRow.has(row))continue;errors.push(`Precisione centesimi: ${u.name} ha ${u.unpaid.length} rate Drive senza unità app alla riga ${row}`);details.push({name:u.name,row,type:'missing-active-unit',drive:u.unpaid.length})}
 actualTotal=round2(actualTotal);expectedTotal=round2(expectedTotal);
 return{ok:!errors.length,errors,details,actualCount,expectedCount,actualTotal,expectedTotal};
}
function legacyOrdinaryError(e){const s=String(e||'');return /: rate ordinarie app \d+, Drive \d+$/.test(s)||/: rata \d+ diversa \(app /.test(s)||/^Deep check: rate ordinarie complessive app /.test(s)||/^Deep check: totale ordinario app /.test(s)||/^Deep check: \d+ unità con rate scoperte mancanti nell'app$/.test(s)||/^Deep check: \d+ unità con rate ordinarie non previste da Drive$/.test(s)}
function reconcile(report,wb,people,fileName){
 const precise=preciseOrdinaryAudit(wb,people,fileName),kept=(report?.errors||[]).filter(e=>!legacyOrdinaryError(e)),errors=[...kept,...precise.errors];report.errors=[...new Set(errors)];report.ok=report.errors.length===0;report.centConsistency=precise;
 if(report.ordinary){report.ordinary.ordinaryItems=precise.actualCount;report.ordinary.centExpectedItems=precise.expectedCount;report.ordinary.centExpectedTotal=precise.expectedTotal;report.ordinary.centActualTotal=precise.actualTotal}
 if(report.deep){report.deep.expectedOrdinaryItems=precise.expectedCount;report.deep.actualOrdinaryItems=precise.actualCount;report.deep.expectedOrdinaryTotal=precise.expectedTotal;report.deep.actualOrdinaryTotal=precise.actualTotal;report.deep.ok=!(report.errors||[]).some(e=>String(e).startsWith('Deep check:')||String(e).startsWith('Precisione centesimi:'))}
 return report;
}
const baseWorkbook=api.auditWorkbook?.bind(api),baseFile=api.auditFile?.bind(api);
if(baseWorkbook)api.auditWorkbook=function(wb,people,folderName,fileName){return reconcile(baseWorkbook(wb,people,folderName,fileName),wb,people,fileName)};
if(baseFile)api.auditFile=async function(file,people,folderName,fileName){const r=await baseFile(file,people,folderName,fileName),data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array',cellDates:true,cellFormula:true});return reconcile(r,wb,people,fileName||file.name)};
window.condoV1CentConsistencyV1={preciseOrdinaryAudit,reconcile,legacyOrdinaryError};
})();
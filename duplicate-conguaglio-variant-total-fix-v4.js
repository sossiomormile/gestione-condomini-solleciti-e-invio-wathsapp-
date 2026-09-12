(()=>{
'use strict';
if(typeof window==='undefined'||typeof window.condoAnalyzeV6!=='function'||!window.condoDuplicateUnitRebuildV2||!window.condoDuplicateConguaglioPositionFixV3)return;
const baseAnalyze=window.condoAnalyzeV6;
const apiV2=window.condoDuplicateUnitRebuildV2;
const apiV3=window.condoDuplicateConguaglioPositionFixV3;
const nrm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const round2=x=>Math.round((Number(x)||0)*100)/100;
const num=x=>Number.isFinite(Number(x))?Number(x):0;
function isCongSheet(name){const x=nrm(name);return x.includes('CONG')||((x.includes('REC')||x.includes('RECUPERO'))&&x.includes('INCASS'))}
function isCongCredit(x){const t=nrm(x?.label);return t.includes('CONGUAGLIO')||t.includes('DARE-AVERE')}
function findPerson(result,u){const people=result?.people||[];let p=people.find(x=>Number(x?._sourceRow)===Number(u.sourceRow));if(!p)p=people.find(x=>Number(x?._sourceOrder)===Number(u.order));if(!p)p=people.find(x=>apiV3.nameCompatible(x?.name,u.name)&&String(x?.scala||'')===String(u.scala||'')&&String(x?.interno||'')===String(u.interno||'')&&String(x?.piano||'')===String(u.piano||''));return p||null}
function consumeOrAddDebit(p,amount,used){const items=p.items||(p.items=[]);for(let i=0;i<items.length;i++){if(used.has(i)||items[i]?.type!=='cong')continue;if(Math.abs(round2(items[i]?.amount)-amount)<=.01){used.add(i);return'already-present'}}items.push({type:'cong',label:'Conguaglio a debito',amount,selected:true});return'added'}
function consumeOrAddCredit(p,amount,used){const credits=p.credits||(p.credits=[]);for(let i=0;i<credits.length;i++){if(used.has(i)||!isCongCredit(credits[i]))continue;if(Math.abs(round2(credits[i]?.amount)-amount)<=.01){used.add(i);return'already-present'}}credits.push({label:'Conguaglio / dare-avere a credito',amount,selected:false});return'added'}
function applyVariantTotals(result,wb,fileName){
 const units=apiV2.sourceUnits(wb,fileName)||[];if(!units.length)return result;
 const counts=new Map();for(const u of units)counts.set(u.canon,(counts.get(u.canon)||0)+1);const duplicate=new Set([...counts].filter(([,n])=>n>1).map(([c])=>c));
 const targets=new Map(),audits=[];
 for(const sn of (wb.SheetNames||[]).filter(isCongSheet)){
  let rows=[];try{rows=apiV2.parseCongRows(wb,sn)||[]}catch(e){continue}
  for(let ri=0;ri<rows.length;ri++){
   const rec=rows[ri];if(!duplicate.has(rec.canon)||Math.abs(rec.balance)<=.01)continue;
   const direct=units[rec.position];if(!direct||direct.canon===rec.canon)continue;
   const ev=apiV3.positionEvidence(rows,ri,units,rec.position);
   if(!apiV3.nameCompatible(rec.name,direct.name)||apiV3.strongConflict(rec,direct)||!ev.ok)continue;
   if(!targets.has(direct.sourceRow))targets.set(direct.sourceRow,{unit:direct,recs:[]});
   targets.get(direct.sourceRow).recs.push({sheet:sn,row:rec.row+1,name:rec.name,balance:round2(rec.balance)});
  }
 }
 for(const {unit,recs} of targets.values()){
  const p=findPerson(result,unit);
  if(!p){const msg=`Conguaglio variante compatibile · ${unit.name}: unità corrente non trovata`;result.unresolved=[...(result.unresolved||[]),msg];audits.push({target:unit.name,status:'blocked-person-not-found',rows:recs});continue}
  const usedDebit=new Set(),usedCredit=new Set();
  for(const rec of recs){
   if(rec.balance>0){const amount=round2(rec.balance),status=consumeOrAddDebit(p,amount,usedDebit);audits.push({target:unit.name,status,kind:'debit',amount,sheet:rec.sheet,row:rec.row})}
   else{const amount=round2(-rec.balance),status=consumeOrAddCredit(p,amount,usedCredit);audits.push({target:unit.name,status,kind:'credit',amount,sheet:rec.sheet,row:rec.row})}
  }
  if(p._v6){p._v6.gross=round2((p.items||[]).reduce((s,x)=>s+num(x?.amount),0));p._v6.variantConguaglioV4=true}
 }
 result.people?.forEach((p,i)=>p.id=i);
 window.condoConguaglioVariantTotalFixV4.lastAudit=audits;
 return result;
}
function analyzeV4(wb,fileName){return applyVariantTotals(baseAnalyze(wb,fileName),wb,fileName)}
window.condoAnalyzeV6=analyzeV4;
window.condoConguaglioVariantTotalFixV4={applyVariantTotals,findPerson,lastAudit:null};
})();

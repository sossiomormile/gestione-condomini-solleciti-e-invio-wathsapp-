(()=>{
'use strict';
if(typeof window==='undefined'||typeof window.condoAnalyzeV6!=='function'||!window.condoDuplicateUnitRebuildV2||!window.condoDuplicateConguaglioPositionFixV3)return;
const baseAnalyze=window.condoAnalyzeV6;
const apiV2=window.condoDuplicateUnitRebuildV2;
const apiV3=window.condoDuplicateConguaglioPositionFixV3;
const nrm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const canon=x=>nrm(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
const unitNorm=x=>canon(x).replace(/\s+/g,'');
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const round2=x=>Math.round((Number(x)||0)*100)/100;
const familyKey=x=>apiV3.primaryParty?.(x)||canon(x);
function isCongSheet(name){const x=nrm(name);return x.includes('CONG')||((x.includes('REC')||x.includes('RECUPERO'))&&x.includes('INCASS'))}
function isCongCredit(x){const t=nrm(x?.label);return t.includes('CONGUAGLIO')||t.includes('DARE-AVERE')}
function strongConflict(a,b){for(const f of ['scala','interno','piano']){const x=unitNorm(a?.[f]),y=unitNorm(b?.[f]);if(x&&y&&x!==y)return true}return false}
function score(a,b){let s=0;for(const [f,w] of [['sub',32],['scala',8],['interno',8],['piano',4]]){const x=unitNorm(a?.[f]),y=unitNorm(b?.[f]);if(x&&y&&x===y)s+=w}return s}
function chooseStrict(rec,rows,ri,units,idxs){
 const compatible=idxs.filter(i=>apiV3.nameCompatible(rec.name,units[i].name)&&!strongConflict(rec,units[i]));
 if(!compatible.length)return{index:-1,reason:'no-compatible-unit'};
 const scored=compatible.map(i=>({i,s:score(rec,units[i])})),mx=Math.max(...scored.map(x=>x.s)),best=scored.filter(x=>x.s===mx);
 if(mx>0&&best.length===1)return{index:best[0].i,reason:'unique-structure'};
 if(compatible.length===1)return{index:compatible[0],reason:'unique-compatible'};
 const direct=units[rec.position];
 if(direct&&compatible.includes(rec.position)){
   const ev=apiV3.positionEvidence(rows,ri,units,rec.position);
   if(ev?.ok)return{index:rec.position,reason:'same-position+neighbors',evidence:ev};
 }
 return{index:-1,reason:'ambiguous-position-or-neighbors'};
}
function findPerson(result,u,key){
 const people=result?.people||[];
 let p=people.find(x=>Number(x?._sourceRow)===Number(u.sourceRow));
 if(!p)p=people.find(x=>Number(x?._sourceOrder)===Number(u.order));
 if(p)return p;
 const candidates=people.filter(x=>familyKey(x?.name)===key&&!strongConflict(x,u));
 const scored=candidates.map(x=>({x,s:score(x,u)})),mx=scored.length?Math.max(...scored.map(z=>z.s)):0,best=scored.filter(z=>z.s===mx);
 return mx>0&&best.length===1?best[0].x:null;
}
function reconcileFamilies(result,wb,fileName){
 const units=apiV2.sourceUnits(wb,fileName)||[];if(!units.length)return result;
 const families=new Map();units.forEach((u,i)=>{const k=familyKey(u.name);if(!families.has(k))families.set(k,[]);families.get(k).push(i)});
 const targetFamilies=new Map([...families].filter(([,idxs])=>idxs.length>1));if(!targetFamilies.size)return result;
 const assigned=new Map(units.map(u=>[u.sourceRow,{debit:0,credit:0}]));
 const state=new Map([...targetFamilies].map(([k])=>[k,{seen:0,ok:true,issues:[]}])) , audits=[];
 for(const sn of (wb.SheetNames||[]).filter(isCongSheet)){
   let rows=[];try{rows=apiV2.parseCongRows(wb,sn)||[]}catch(e){continue}
   for(let ri=0;ri<rows.length;ri++){
     const rec=rows[ri],k=familyKey(rec.name),idxs=targetFamilies.get(k);if(!idxs||Math.abs(num(rec.balance))<=.01)continue;
     const st=state.get(k);st.seen++;
     const chosen=chooseStrict(rec,rows,ri,units,idxs);
     if(chosen.index<0){st.ok=false;st.issues.push(`${sn} · riga ${Number(rec.row)+1} · ${rec.name}: ${chosen.reason}`);audits.push({family:k,status:'blocked',sheet:sn,row:Number(rec.row)+1,name:rec.name,reason:chosen.reason});continue}
     const u=units[chosen.index],a=assigned.get(u.sourceRow);if(rec.balance>0)a.debit=round2(a.debit+rec.balance);else a.credit=round2(a.credit-rec.balance);
     audits.push({family:k,status:'assigned',sheet:sn,row:Number(rec.row)+1,name:rec.name,target:u.name,sourceRow:u.sourceRow,reason:chosen.reason,balance:round2(rec.balance)});
   }
 }
 for(const [k,idxs] of targetFamilies){
   const st=state.get(k);if(!st.seen)continue;
   if(!st.ok){result.unresolved=[...(result.unresolved||[]),...st.issues.map(x=>`Conguaglio identità V5 · ${x}`)];continue}
   const persons=new Set();let mappingOk=true;
   for(const i of idxs){const u=units[i],a=assigned.get(u.sourceRow),p=findPerson(result,u,k);if(p)persons.add(p);if((a.debit>.01||a.credit>.01)&&!p){mappingOk=false;result.unresolved=[...(result.unresolved||[]),`Conguaglio identità V5 · ${u.name}: unità destinazione non trovata`]}}
   if(!mappingOk)continue;
   for(const p of (result.people||[]))if(familyKey(p?.name)===k)persons.add(p);
   for(const p of persons){p.items=(p.items||[]).filter(x=>x?.type!=='cong');p.credits=(p.credits||[]).filter(x=>!isCongCredit(x))}
   for(const i of idxs){const u=units[i],a=assigned.get(u.sourceRow),p=findPerson(result,u,k);if(!p)continue;if(a.debit>.01)p.items.push({type:'cong',label:'Conguaglio a debito',amount:round2(a.debit),selected:true});if(a.credit>.01)p.credits.push({label:'Conguaglio / dare-avere a credito',amount:round2(a.credit),selected:false});if(p._v6){p._v6.gross=round2((p.items||[]).reduce((s,x)=>s+num(x?.amount),0));p._v6.conguaglioIdentityV5='posizione + struttura + nominativi sopra/sotto'}}
 }
 result.people?.forEach((p,i)=>p.id=i);
 window.condoConguaglioIdentityStrictFixV5.lastAudit=audits;
 return result;
}
function analyzeV5(wb,fileName){return reconcileFamilies(baseAnalyze(wb,fileName),wb,fileName)}
window.condoAnalyzeV6=analyzeV5;
window.condoConguaglioIdentityStrictFixV5={familyKey,score,strongConflict,chooseStrict,reconcileFamilies,lastAudit:null};
})();

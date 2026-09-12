(()=>{
'use strict';
if(typeof window==='undefined'||typeof window.condoAnalyzeV6!=='function'||!window.condoDuplicateUnitRebuildV2)return;
const baseAnalyze=window.condoAnalyzeV6;
const apiV2=window.condoDuplicateUnitRebuildV2;
const nrm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const canon=x=>nrm(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
const unitNorm=x=>canon(x).replace(/\s+/g,'');
const num=x=>{if(typeof x==='number'&&Number.isFinite(x))return x;if(typeof x==='string'){let v=x.trim();if(!v)return 0;if(v.includes(',')&&v.includes('.'))v=v.replace(/\./g,'').replace(',','.');else if(v.includes(','))v=v.replace(',','.');const z=parseFloat(v);return Number.isFinite(z)?z:0}return 0};
const round2=x=>Math.round((Number(x)||0)*100)/100;
const primaryParty=x=>{let s=String(x??'').trim(),cut=s.length;const p=s.indexOf('(');if(p>=0)cut=Math.min(cut,p);return canon(s.slice(0,cut))};
function nameCompatible(a,b){const x=canon(a),y=canon(b);if(!x||!y)return false;if(x===y||x.includes(y)||y.includes(x))return true;if(primaryParty(a)&&primaryParty(a)===primaryParty(b))return true;const xt=x.split(' ').filter(Boolean),yt=y.split(' ').filter(Boolean),shorter=xt.length<=yt.length?xt:yt,longer=xt.length<=yt.length?yt:xt;return shorter.length>0&&shorter.every(t=>longer.some(u=>u===t||(t.length===1&&u.startsWith(t))||(u.length===1&&t.startsWith(u))))}
function strongConflict(a,b){for(const f of ['scala','interno','piano']){const x=unitNorm(a?.[f]),y=unitNorm(b?.[f]);if(x&&y&&x!==y)return true}return false}
function strongScore(a,b){let s=0;for(const [f,w] of [['scala',8],['interno',8],['piano',4]]){const x=unitNorm(a?.[f]),y=unitNorm(b?.[f]);if(x&&y&&x===y)s+=w}return s}
function neighborDistinct(list,index,dir){const self=canon(list[index]?.name)||list[index]?.canon||'';for(let i=index+dir;i>=0&&i<list.length;i+=dir){const row=list[i]||{},hasUnit=!!(unitNorm(row.interno)||unitNorm(row.piano)||unitNorm(row.sub));if(!hasUnit)continue;const key=canon(row.name)||row.canon||'';if(key&&key!==self)return row}return null}
function positionEvidence(rows,ri,units,ui){let confirmed=0,contradiction=false;for(const dir of [-1,1]){const a=neighborDistinct(rows,ri,dir),b=neighborDistinct(units,ui,dir);if(a&&b){if(nameCompatible(a.name,b.name))confirmed++;else contradiction=true}}return{ok:!contradiction&&confirmed>0,confirmed,contradiction}}
function chooseDuplicateUnit(rec,rows,ri,units){
 const direct=units[rec.position];
 if(direct&&direct.canon===rec.canon&&!strongConflict(rec,direct)){
   const ev=positionEvidence(rows,ri,units,rec.position);
   if(ev.ok)return{index:rec.position,reason:'same-position+neighbor',evidence:ev};
 }
 const candidates=[];for(let i=0;i<units.length;i++)if(units[i].canon===rec.canon&&!strongConflict(rec,units[i]))candidates.push(i);
 if(!candidates.length)return{index:-1,reason:'no-compatible-unit'};
 const scored=candidates.map(i=>({i,s:strongScore(rec,units[i])})),mx=Math.max(...scored.map(x=>x.s)),best=scored.filter(x=>x.s===mx);
 if(mx>0&&best.length===1)return{index:best[0].i,reason:'unique-structure'};
 const rs=unitNorm(rec.sub),subMatches=rs?candidates.filter(i=>unitNorm(units[i].sub)===rs):[];
 if(subMatches.length===1)return{index:subMatches[0],reason:'unique-sub'};
 return{index:-1,reason:'ambiguous'};
}
function isCongSheet(name){const x=nrm(name);return x.includes('CONG')||((x.includes('REC')||x.includes('RECUPERO'))&&x.includes('INCASS'))}
function assignmentsV3(wb,units){
 const byRow=new Map(units.map(u=>[u.sourceRow,{debit:0,credit:0}])),counts=new Map();for(const u of units)counts.set(u.canon,(counts.get(u.canon)||0)+1);const duplicate=new Set([...counts].filter(([,n])=>n>1).map(([c])=>c)),confidence=new Map([...duplicate].map(c=>[c,true])),resolvedPrefixes=new Map([...duplicate].map(c=>[c,[]])),audits=[];
 for(const sn of (wb.SheetNames||[]).filter(isCongSheet)){
   let rows=[];try{rows=apiV2.parseCongRows(wb,sn)||[]}catch(e){continue}if(!rows.length)continue;
   for(let ri=0;ri<rows.length;ri++){
     const rec=rows[ri];if(!duplicate.has(rec.canon)||Math.abs(rec.balance)<=.01)continue;
     const direct=units[rec.position],ev=direct?positionEvidence(rows,ri,units,rec.position):{ok:false};
     if(direct&&direct.canon!==rec.canon&&nameCompatible(rec.name,direct.name)&&!strongConflict(rec,direct)&&ev.ok){resolvedPrefixes.get(rec.canon)?.push(`${sn} · riga ${rec.row+1} ·`);audits.push({sheet:sn,row:rec.row+1,name:rec.name,status:'belongs-to-compatible-direct-unit',target:direct.name,sourceOrder:direct.order});continue}
     const chosen=chooseDuplicateUnit(rec,rows,ri,units);if(chosen.index<0){confidence.set(rec.canon,false);audits.push({sheet:sn,row:rec.row+1,name:rec.name,status:'blocked',reason:chosen.reason});continue}
     const u=units[chosen.index],a=byRow.get(u.sourceRow);if(rec.balance>0)a.debit=round2(a.debit+rec.balance);else a.credit=round2(a.credit-rec.balance);resolvedPrefixes.get(rec.canon)?.push(`${sn} · riga ${rec.row+1} ·`);audits.push({sheet:sn,row:rec.row+1,name:rec.name,status:'assigned',reason:chosen.reason,target:u.name,sourceOrder:u.order,sourceRow:u.sourceRow});
   }
 }
 return{byRow,confidence,resolvedPrefixes,audits};
}
function isCongCredit(x){const t=nrm(x?.label);return t.includes('CONGUAGLIO')||t.includes('DARE-AVERE')}
function rebuildWithPositionEvidence(result,wb,fileName){
 const units=apiV2.sourceUnits(wb,fileName)||[],assign=assignmentsV3(wb,units),audits=[];if(!units.length)return result;const groups=new Map();for(const u of units){if(!groups.has(u.canon))groups.set(u.canon,[]);groups.get(u.canon).push(u)}
 for(const [c,srcGroup] of groups){
   if(srcGroup.length<2)continue;const people=result.people||[],appGroup=people.filter(p=>canon(p?.name)===c);if(!appGroup.length)continue;
   if(assign.confidence.get(c)===false){audits.push({name:srcGroup[0].name,status:'still-blocked'});continue}
   const expected=srcGroup.filter(u=>u.unpaid.length||u.ordinaryCredit>.01||((assign.byRow.get(u.sourceRow)?.debit||0)>.01)||((assign.byRow.get(u.sourceRow)?.credit||0)>.01));
   const first=people.findIndex(p=>canon(p?.name)===c);if(first<0)continue;const template=appGroup[0]||{};
   const rebuilt=expected.map(u=>{const a=assign.byRow.get(u.sourceRow)||{debit:0,credit:0},items=u.unpaid.map(x=>({type:'ordinary',label:x.mese,amount:x.amount,selected:true}));if(a.debit>.01)items.push({type:'cong',label:'Conguaglio a debito',amount:round2(a.debit),selected:true});const credits=[];if(u.ordinaryCredit>.01)credits.push({label:'Eccedenza / credito da incassi ordinari',amount:round2(u.ordinaryCredit),selected:false});if(a.credit>.01)credits.push({label:'Conguaglio / dare-avere a credito',amount:round2(a.credit),selected:false});return{...template,name:u.name,scala:u.scala||'',piano:u.piano||'',interno:u.interno||'',sub:u.sub||'',_sourceRow:u.sourceRow,_sourceOrder:u.order,phone:'',email:'',items,credits,conflicts:[],recipientAddress:'',_v6:{...(template._v6||{}),gross:round2(items.reduce((s,x)=>s+num(x.amount),0)),monthSource:'celle reali Incassi · conguagli duplicati V3 per posizione/vicini'}}});
   const kept=people.filter(p=>canon(p?.name)!==c);kept.splice(Math.min(first,kept.length),0,...rebuilt);result.people=kept;
   const prefixes=assign.resolvedPrefixes.get(c)||[];result.unresolved=(result.unresolved||[]).filter(x=>{const s=String(x);if(s.startsWith(`Unità duplicate · ${srcGroup[0].name}:`))return false;const m=s.match(/^Rate ordinarie · (.*?): unità omonima non associabile con certezza$/);if(m&&canon(m[1])===c)return false;if(prefixes.some(p=>s.startsWith(p)))return false;return true});
   audits.push({name:srcGroup[0].name,status:'rebuilt-position-v3',sourceUnits:srcGroup.length,activeUnits:expected.length,rows:rebuilt.map(p=>p._sourceRow),subs:rebuilt.map(p=>p.sub),debits:rebuilt.map(p=>round2(p.items.filter(x=>x.type==='cong').reduce((s,x)=>s+num(x.amount),0))),credits:rebuilt.map(p=>round2(p.credits.filter(isCongCredit).reduce((s,x)=>s+num(x.amount),0)))});
 }
 result.people.forEach((p,i)=>p.id=i);window.condoDuplicateConguaglioPositionFixV3.lastAudit={groups:audits,rows:assign.audits};return result;
}
function analyzeV3(wb,fileName){return rebuildWithPositionEvidence(baseAnalyze(wb,fileName),wb,fileName)}
window.condoAnalyzeV6=analyzeV3;
window.condoDuplicateConguaglioPositionFixV3={primaryParty,nameCompatible,strongConflict,positionEvidence,chooseDuplicateUnit,assignmentsV3,rebuildWithPositionEvidence,lastAudit:null};
})();

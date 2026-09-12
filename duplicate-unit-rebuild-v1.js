(()=>{
'use strict';
if(typeof window==='undefined'||typeof window.condoAnalyzeV6!=='function'||typeof XLSX==='undefined')return;
const baseAnalyze=window.condoAnalyzeV6;
const nrm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const canon=x=>nrm(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
const unitNorm=x=>canon(x).replace(/\s+/g,'');
const num=x=>{if(typeof x==='number'&&Number.isFinite(x))return x;if(typeof x==='string'){let v=x.trim();if(!v)return 0;if(v.includes(',')&&v.includes('.'))v=v.replace(/\./g,'').replace(',','.');else if(v.includes(','))v=v.replace(',','.');const z=parseFloat(v);return Number.isFinite(z)?z:0}return 0};
const round2=x=>Math.round((Number(x)||0)*100)/100;
const MONTHS={GEN:'Gennaio',GENNAIO:'Gennaio',FEB:'Febbraio',FEBBRAIO:'Febbraio',MAR:'Marzo',MARZO:'Marzo',APR:'Aprile',APRILE:'Aprile',MAG:'Maggio',MAGGIO:'Maggio',GIU:'Giugno',GIUGNO:'Giugno',LUG:'Luglio',LUGLIO:'Luglio',AGO:'Agosto',AGOSTO:'Agosto',SET:'Settembre',SETT:'Settembre',SETTEMBRE:'Settembre',OTT:'Ottobre',OTTOBRE:'Ottobre',NOV:'Novembre',NOVEMBRE:'Novembre',DIC:'Dicembre',DICEMBRE:'Dicembre'};
const MONTH_NUM={GENNAIO:1,FEBBRAIO:2,MARZO:3,APRILE:4,MAGGIO:5,GIUGNO:6,LUGLIO:7,AGOSTO:8,SETTEMBRE:9,OTTOBRE:10,NOVEMBRE:11,DICEMBRE:12};
const SUMMARY=new Set(['ANCORA DA INCASSARE','TOTALE DA INCASSARE','TOTALE PERIODO DA INCASSARE','TOTALE PERIODO ANCORA DA INCASSARE','TOTALE ANNUO DA INCASSARE','TOTALE ANNUO ANCORA DA INCASSARE']);
function isSummary(x){return SUMMARY.has(nrm(x))}
function scaleFromRow(row){for(let c=0;c<Math.min(4,(row||[]).length);c++){const s=nrm(row[c]).replace(/["']/g,' ');let m=s.match(/\bSCALA\s+([A-Z0-9]+)\b/);if(m)return m[1];m=s.match(/\bFABBRICATO\s+([A-Z0-9]+)\b/);if(m)return m[1];m=s.match(/\bFABRICATO\s+([A-Z0-9]+)\b/);if(m)return m[1]}return''}
function findIncassi(wb){return(wb.SheetNames||[]).find(s=>nrm(s).startsWith('INCASSI '))||(wb.SheetNames||[]).find(s=>nrm(s).includes('INCASSI'))||''}
function sourceYear(fileName){const src=[String(window.condoSourcePath||''),String(fileName||'')].join(' '),ys=[...src.matchAll(/20\d{2}/g)].map(x=>Number(x[0]));return ys.length?ys[0]:null}
function plan(cols,start){if(!start)return cols.map(([c,m])=>({c,m,year:null}));let y=start,prev=MONTH_NUM[nrm(cols[0]?.[1])]||0;return cols.map(([c,m],i)=>{const mn=MONTH_NUM[nrm(m)]||0;if(i>0&&mn&&prev&&mn<prev)y++;prev=mn||prev;return{c,m,year:y}})}
function future(year,m){if(!year)return false;const mn=MONTH_NUM[nrm(m)],d=new Date();return year>d.getFullYear()||(year===d.getFullYear()&&mn>d.getMonth()+1)}
function colExact(H,...names){const hs=H.map(nrm);for(const name of names){const i=hs.indexOf(nrm(name));if(i>=0)return i}return-1}
function colContains(H,...terms){const hs=H.map(nrm);for(const t0 of terms){const t=nrm(t0);for(let i=0;i<hs.length;i++)if(hs[i].includes(t))return i}return-1}
function effectiveHeaders(rows,hi){const prev=hi>0?(rows[hi-1]||[]):[],cur=rows[hi]||[],nn=Math.max(prev.length,cur.length),out=[];for(let i=0;i<nn;i++){const c=cur[i],p=prev[i];out.push(c!==null&&c!==undefined&&c!==''?c:p)}return out}
function findHeader(rows){const keys=['RATA','CONGUAGLIO','IMPORTO','SALDO','RESIDUO','DA INCASSARE','DA VERSARE','PAGATO','VERSATO','INCASSATO'];for(let i=0;i<Math.min(35,rows.length);i++){const hs=(rows[i]||[]).map(nrm),hasName=hs.includes('NOMINATIVO')||hs.includes('CONDOMINO');if(hasName&&hs.some(h=>keys.some(k=>h.includes(k))))return i}return null}
function monthCols(H){const out=[];H.forEach((h,i)=>{const k=nrm(h);if(MONTHS[k])out.push([i,MONTHS[k]])});return out.length>12?out.slice(-12):out}
function sourceUnits(wb,fileName){
 const inc=findIncassi(wb);if(!inc||!wb.Sheets?.[inc])return[];const rows=XLSX.utils.sheet_to_json(wb.Sheets[inc],{header:1,defval:null,raw:true}),start=sourceYear(fileName);let scala='',h=null,order=0;const out=[];
 for(let r=0;r<rows.length;r++){
  const row=rows[r]||[],sc=scaleFromRow(row);if(sc)scala=sc;const H=row.map(nrm),name=H.findIndex(x=>x==='CONDOMINO'||x==='NOMINATIVO');
  if(name>=0){const rata=H.findIndex(x=>x==='RATA'),interno=H.findIndex(x=>x==='INTERNO'||x==='INT'||x==='INT.'),piano=H.findIndex(x=>x==='PIANO'||x==='P'),sub=H.findIndex(x=>x==='SUB'),scalaCol=H.findIndex(x=>x==='SCALA'||x==='S');let mc=[];H.forEach((x,i)=>{if(MONTHS[x])mc.push([i,MONTHS[x]])});if(mc.length>12)mc=mc.slice(-12);if(rata>=0&&mc.length)h={name,rata,interno,piano,sub,scalaCol,plan:plan(mc,start)};continue}
  if(!h)continue;const person=String(row[h.name]??'').trim(),nn=nrm(person);if(!person||nn==='CONDOMINO'||nn==='NOMINATIVO'||nn.startsWith('TOTALE')||nn.startsWith('SCALA')||isSummary(person))continue;
  const rata=round2(num(row[h.rata])),unpaid=[];for(const x of h.plan){if(future(x.year,x.m))continue;const rem=Math.max(0,rata-Math.max(0,num(row[x.c])));if(rem>.01)unpaid.push({mese:x.m,amount:round2(rem)})}
  out.push({order:order++,sourceRow:r,name:person,canon:canon(person),scala:String(h.scalaCol>=0?(row[h.scalaCol]??''):'').trim()||scala,interno:String(h.interno>=0?(row[h.interno]??''):'').trim(),piano:String(h.piano>=0?(row[h.piano]??''):'').trim(),sub:String(h.sub>=0?(row[h.sub]??''):'').trim(),rata,unpaid});
 }
 return out;
}
function isCongSheet(name){const x=nrm(name);return x.includes('CONG')||((x.includes('REC')||x.includes('RECUPERO'))&&x.includes('INCASS'))}
function parseCongRows(wb,sn){
 const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:null,raw:true}),hi=findHeader(rows);if(hi==null)return[];const H=effectiveHeaders(rows,hi),namec=colExact(H,'NOMINATIVO','CONDOMINO'),intc=colExact(H,'INT','INT.','INTERNO'),pianoc=colExact(H,'P','PIANO'),subc=colExact(H,'SUB'),scalac=colExact(H,'SCALA','S'),totaldue=colContains(H,'TOTALE ANNUO DA INCASSARE','TOTALE PERIODO DA INCASSARE','TOTALE DA INCASSARE'),balancec=colContains(H,'TOTALE ANNUO ANCORA DA INCASSARE','TOTALE PERIODO ANCORA DA INCASSARE','ANCORA DA INCASSARE','DA INCASSARE','SALDO','RESIDUO'),duec=colContains(H,'CONGUAGLIO','IMPORTO','DA VERSARE','RATA','TAB. A'),paidc=colExact(H,'PAGATO','VERSATO','INCASSATO'),reimbc=colExact(H,'RIMBORSATO'),mcols=monthCols(H);let scala='',pos=0;const out=[];
 for(let r=hi+1;r<rows.length;r++){
  const row=rows[r]||[],sc=scaleFromRow(row);if(sc){scala=sc;continue}const person=String(namec>=0?(row[namec]??''):'').trim(),nn=nrm(person);if(!person||nn==='CONDOMINO'||nn==='NOMINATIVO'||nn.startsWith('TOTALE')||nn.startsWith('SCALA')||isSummary(person))continue;
  const raw=balancec>=0?row[balancec]:null;let bal;if(balancec>=0&&!(typeof raw==='string'&&raw.includes('#')))bal=num(raw);else{const due=(totaldue>=0?num(row[totaldue]):0)||(duec>=0?num(row[duec]):0),paid=(paidc>=0?num(row[paidc]):0)+mcols.reduce((s,[c])=>s+num(row[c]),0),reimb=reimbc>=0?num(row[reimbc]):0;bal=due?due-paid+reimb:0}
  out.push({position:pos++,row:r,name:person,canon:canon(person),scala:String(scalac>=0?(row[scalac]??''):'').trim()||scala,interno:String(intc>=0?(row[intc]??''):'').trim(),piano:String(pianoc>=0?(row[pianoc]??''):'').trim(),sub:String(subc>=0?(row[subc]??''):'').trim(),balance:round2(bal)});
 }
 return out;
}
function structuralConflict(a,b){for(const f of ['scala','interno','piano','sub']){const x=unitNorm(a?.[f]),y=unitNorm(b?.[f]);if(x&&y&&x!==y)return true}return false}
function structuralScore(a,b){let s=0;for(const [f,w] of [['sub',16],['scala',8],['interno',8],['piano',4]]){const x=unitNorm(a?.[f]),y=unitNorm(b?.[f]);if(x&&y&&x===y)s+=w}return s}
function neighborDistinct(list,index,dir){const self=list[index]?.canon||'';for(let i=index+dir;i>=0&&i<list.length;i+=dir){const c=list[i]?.canon||'';if(c&&c!==self)return c}return''}
function positionConfirmed(rows,ri,units,ui){let confirmed=0,contradiction=false;for(const dir of [-1,1]){const a=neighborDistinct(rows,ri,dir),b=neighborDistinct(units,ui,dir);if(a&&b){if(a===b)confirmed++;else contradiction=true}}return!contradiction&&confirmed>0}
function matchCongRow(rec,rows,ri,units){
 const candidates=[];for(let i=0;i<units.length;i++)if(units[i].canon===rec.canon&&!structuralConflict(rec,units[i]))candidates.push(i);if(!candidates.length)return-1;if(candidates.length===1)return candidates[0];
 const scored=candidates.map(i=>({i,s:structuralScore(rec,units[i])})),mx=Math.max(...scored.map(x=>x.s)),best=scored.filter(x=>x.s===mx);if(mx>0&&best.length===1)return best[0].i;
 const direct=units[rec.position];if(direct&&direct.canon===rec.canon&&!structuralConflict(rec,direct)&&positionConfirmed(rows,ri,units,rec.position))return rec.position;
 return-1;
}
function congAssignments(wb,units){
 const byRow=new Map(units.map(u=>[u.sourceRow,{debit:0,credit:0}])),duplicate=new Set();const counts=new Map();for(const u of units)counts.set(u.canon,(counts.get(u.canon)||0)+1);for(const [c,n] of counts)if(n>1)duplicate.add(c);const confidence=new Map([...duplicate].map(c=>[c,true]));
 for(const sn of (wb.SheetNames||[]).filter(isCongSheet)){
  const rows=parseCongRows(wb,sn);for(let ri=0;ri<rows.length;ri++){const rec=rows[ri];if(!duplicate.has(rec.canon)||Math.abs(rec.balance)<=.01)continue;const ui=matchCongRow(rec,rows,ri,units);if(ui<0){confidence.set(rec.canon,false);continue}const a=byRow.get(units[ui].sourceRow);if(rec.balance>0)a.debit=round2(a.debit+rec.balance);else a.credit=round2(a.credit-rec.balance)}
 }
 return{byRow,confidence};
}
function isCongCredit(x){const t=nrm(x?.label);return t.includes('CONGUAGLIO')||t.includes('DARE-AVERE')}
function rebuildCollapsed(result,wb,fileName){
 const units=sourceUnits(wb,fileName),assign=congAssignments(wb,units),audits=[];if(!units.length)return result;const groups=new Map();for(const u of units){if(!groups.has(u.canon))groups.set(u.canon,[]);groups.get(u.canon).push(u)}
 for(const [c,srcGroup] of groups){
  if(srcGroup.length<2)continue;const people=result.people||[],appGroup=people.filter(p=>canon(p?.name)===c),expected=srcGroup.filter(u=>u.unpaid.length||((assign.byRow.get(u.sourceRow)?.debit||0)>.01)||((assign.byRow.get(u.sourceRow)?.credit||0)>.01));if(!expected.length||appGroup.length===expected.length)continue;
  const first=people.findIndex(p=>canon(p?.name)===c);if(first<0)continue;const otherCredits=appGroup.flatMap(p=>(p.credits||[]).filter(x=>!isCongCredit(x)));if(otherCredits.length){result.unresolved=[...(result.unresolved||[]),`Unità duplicate · ${srcGroup[0].name}: crediti non-conguaglio non separabili con certezza`];audits.push({name:srcGroup[0].name,status:'blocked-other-credit'});continue}
  if(assign.confidence.get(c)===false){result.unresolved=[...(result.unresolved||[]),`Unità duplicate · ${srcGroup[0].name}: conguagli non separabili con certezza`];audits.push({name:srcGroup[0].name,status:'blocked-conguaglio'});continue}
  const baseDebit=round2(appGroup.reduce((s,p)=>s+(p.items||[]).filter(x=>x.type==='cong').reduce((q,x)=>q+num(x.amount),0),0)),baseCredit=round2(appGroup.reduce((s,p)=>s+(p.credits||[]).filter(isCongCredit).reduce((q,x)=>q+num(x.amount),0),0));
  const splitDebit=round2(srcGroup.reduce((s,u)=>s+(assign.byRow.get(u.sourceRow)?.debit||0),0)),splitCredit=round2(srcGroup.reduce((s,u)=>s+(assign.byRow.get(u.sourceRow)?.credit||0),0));
  if(Math.abs(baseDebit-splitDebit)>.01||Math.abs(baseCredit-splitCredit)>.01){result.unresolved=[...(result.unresolved||[]),`Unità duplicate · ${srcGroup[0].name}: totale conguagli ricostruito non coincide`];audits.push({name:srcGroup[0].name,status:'blocked-total',baseDebit,splitDebit,baseCredit,splitCredit});continue}
  const template=appGroup[0]||{},rebuilt=expected.map(u=>{const a=assign.byRow.get(u.sourceRow)||{debit:0,credit:0},items=u.unpaid.map(x=>({type:'ordinary',label:x.mese,amount:x.amount,selected:true}));if(a.debit>.01)items.push({type:'cong',label:'Conguaglio a debito',amount:round2(a.debit),selected:true});const credits=[];if(a.credit>.01)credits.push({label:'Conguaglio / dare-avere a credito',amount:round2(a.credit),selected:false});const gross=round2(items.reduce((s,x)=>s+num(x.amount),0));return{...template,name:u.name,scala:u.scala||'',piano:u.piano||'',interno:u.interno||'',sub:u.sub||'',_sourceRow:u.sourceRow,phone:'',email:'',items,credits,conflicts:[],_v6:{...(template._v6||{}),gross,monthSource:'celle reali Incassi · unità duplicate ricostruite per riga/SUB/posizione'}}});
  const kept=people.filter(p=>canon(p?.name)!==c);kept.splice(Math.min(first,kept.length),0,...rebuilt);result.people=kept;result.unresolved=(result.unresolved||[]).filter(x=>{const m=String(x).match(/^Rate ordinarie · (.*?): unità omonima non associabile con certezza$/);return!(m&&canon(m[1])===c)});audits.push({name:srcGroup[0].name,status:'rebuilt',sourceUnits:srcGroup.length,before:appGroup.length,after:rebuilt.length,rows:rebuilt.map(p=>p._sourceRow)});
 }
 result.people.forEach((p,i)=>p.id=i);window.condoDuplicateUnitRebuildV1.lastAudit=audits;return result;
}
function analyzeRebuilt(wb,fileName){return rebuildCollapsed(baseAnalyze(wb,fileName),wb,fileName)}
window.condoAnalyzeV6=analyzeRebuilt;
window.condoDuplicateUnitRebuildV1={sourceUnits,parseCongRows,matchCongRow,congAssignments,rebuildCollapsed,lastAudit:[]};
parseFile=async function(file){if(typeof loader!=='undefined')loader.classList.remove('hidden');if(typeof results!=='undefined')results.classList.add('hidden');try{const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array',cellDates:true,cellFormula:true}),r=analyzeRebuilt(wb,file.name);if(typeof current!=='undefined')current=r.people;if(r.frontKey&&r.frontKey!=='Frotespizio'&&!wb.Sheets.Frotespizio){wb.Sheets.Frotespizio=wb.Sheets[r.frontKey];wb.SheetNames.push('Frotespizio')}if(!r.frontKey){const ws=XLSX.utils.aoa_to_sheet([[r.title]]);wb.Sheets.Frotespizio=ws;wb.SheetNames.push('Frotespizio')}if(typeof render==='function')render(file.name,wb);if(typeof building!=='undefined')building.textContent=r.title;if(typeof source!=='undefined')source.textContent='Motore V7 · identità unità omonime verificata · '+file.name+(r.unresolved.length?' · '+r.unresolved.length+' casi da verificare':'');if(r.unresolved.length)console.warn('Casi da verificare V7:',r.unresolved)}catch(e){console.error(e);alert('Non riesco a leggere il file con il motore V7: '+e.message)}finally{if(typeof loader!=='undefined')loader.classList.add('hidden')}};
})();
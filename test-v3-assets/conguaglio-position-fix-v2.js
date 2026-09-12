(()=>{
'use strict';
if(typeof window.condoAnalyzeV6!=='function'||typeof XLSX==='undefined')return;
const baseAnalyze=window.condoAnalyzeV6;
const nrm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const canon=x=>nrm(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
const unitNorm=x=>canon(x).replace(/\s+/g,'');
const MONTHS={GEN:'Gennaio',GENNAIO:'Gennaio',FEB:'Febbraio',FEBBRAIO:'Febbraio',MAR:'Marzo',MARZO:'Marzo',APR:'Aprile',APRILE:'Aprile',MAG:'Maggio',MAGGIO:'Maggio',GIU:'Giugno',GIUGNO:'Giugno',LUG:'Luglio',LUGLIO:'Luglio',AGO:'Agosto',AGOSTO:'Agosto',SET:'Settembre',SETT:'Settembre',SETTEMBRE:'Settembre',OTT:'Ottobre',OTTOBRE:'Ottobre',NOV:'Novembre',NOVEMBRE:'Novembre',DIC:'Dicembre',DICEMBRE:'Dicembre'};
const MONTH_NUM={GENNAIO:1,FEBBRAIO:2,MARZO:3,APRILE:4,MAGGIO:5,GIUGNO:6,LUGLIO:7,AGOSTO:8,SETTEMBRE:9,OTTOBRE:10,NOVEMBRE:11,DICEMBRE:12};
const num=x=>{if(typeof x==='number'&&Number.isFinite(x))return x;if(typeof x==='string'){let v=x.trim();if(!v)return 0;if(v.includes(',')&&v.includes('.'))v=v.replace(/\./g,'').replace(',','.');else if(v.includes(','))v=v.replace(',','.');const z=parseFloat(v);return Number.isFinite(z)?z:0}return 0};
const round2=x=>Math.round((Number(x)||0)*100)/100;
function sanitizeWorkbook(wb){const clone={...wb,Sheets:{...wb.Sheets}};for(const [name,ws0] of Object.entries(wb.Sheets||{})){if(nrm(name).includes('INCASSI'))continue;const ws={...ws0};let firstHeaderSeen=false,changed=false;const ref=ws['!ref'];if(!ref){clone.Sheets[name]=ws;continue}const range=XLSX.utils.decode_range(ref);for(let r=range.s.r;r<=range.e.r;r++){const addr=XLSX.utils.encode_cell({r,c:0}),nv=nrm(ws0[addr]?.v);if(nv==='CONDOMINO'||nv==='NOMINATIVO'){if(!firstHeaderSeen){firstHeaderSeen=true;continue}delete ws[addr];changed=true}}clone.Sheets[name]=changed?ws:ws0}return clone}
function findIncassiSheet(wb){return (wb.SheetNames||[]).find(s=>nrm(s).startsWith('INCASSI '))||(wb.SheetNames||[]).find(s=>nrm(s).includes('INCASSI'))||''}
function scaleFromRow(row){for(let c=0;c<Math.min(4,row.length);c++){const s=nrm(row[c]).replace(/["']/g,' ');let m=s.match(/\bSCALA\s+([A-Z0-9]+)\b/);if(m)return m[1];m=s.match(/\bFABBRICATO\s+([A-Z0-9]+)\b/);if(m)return m[1]}return ''}
function sourceStartYear(fileName){const src=[String(window.condoSourcePath||''),String(fileName||'')].join(' ');const years=[...src.matchAll(/20\d{2}/g)].map(m=>Number(m[0]));if(!years.length)return null;return years[0]}
function monthPlan(monthCols,startYear){if(!monthCols.length||!startYear)return monthCols.map(([c,mese])=>({c,mese,year:null}));let y=startYear,prev=MONTH_NUM[nrm(monthCols[0][1])]||0;return monthCols.map(([c,mese],i)=>{const mn=MONTH_NUM[nrm(mese)]||0;if(i>0&&mn&&prev&&mn<prev)y++;prev=mn||prev;return {c,mese,year:y}})}
function isFutureMonth(year,mese){if(!year)return false;const mn=MONTH_NUM[nrm(mese)];if(!mn)return false;const now=new Date(),cy=now.getFullYear(),cm=now.getMonth()+1;return year>cy||(year===cy&&mn>cm)}
function unitEvidence(p,r){
 let score=0;const matched=[],conflicts=[];
 for(const [field,weight] of [['sub',16],['scala',8],['interno',8],['piano',4]]){
   const a=unitNorm(p?.[field]),b=unitNorm(r?.[field]);
   if(!a||!b)continue;
   if(a===b){score+=weight;matched.push(field)}else conflicts.push(field);
 }
 return {score,matched,conflicts};
}
function neighborName(list,index,dir,getName){
 const self=canon(getName(list[index]));
 for(let i=index+dir;i>=0&&i<list.length;i+=dir){const c=canon(getName(list[i]));if(c&&c!==self)return c}
 return '';
}
function neighborScore(people,pi,records,ri){
 let score=0;
 const pp=neighborName(people,pi,-1,x=>x?.name),pn=neighborName(people,pi,1,x=>x?.name);
 const rp=neighborName(records,ri,-1,x=>x?.name),rn=neighborName(records,ri,1,x=>x?.name);
 if(pp&&rp&&pp===rp)score++;
 if(pn&&rn&&pn===rn)score++;
 return score;
}
function knownIdentityCount(p){return ['scala','interno','piano','sub'].reduce((n,f)=>n+(unitNorm(p?.[f])?1:0),0)}
function chooseRecordIndex(p,people,pi,records,used){
 const pc=canon(p?.name),candidateIdx=[];
 for(let i=0;i<records.length;i++)if(!used.has(i)&&canon(records[i].name)===pc)candidateIdx.push(i);
 if(!candidateIdx.length)return -1;
 const compatible=candidateIdx.map(i=>({i,ev:unitEvidence(p,records[i])})).filter(x=>!x.ev.conflicts.length);
 if(!compatible.length)return -1;
 const explicitRow=Number(p?._sourceRow);
 if(Number.isFinite(explicitRow)){
   const exact=compatible.filter(x=>records[x.i].sourceRow===explicitRow);
   if(exact.length===1)return exact[0].i;
 }
 const ps=unitNorm(p?.sub);
 if(ps){
   const exactSub=compatible.filter(x=>unitNorm(records[x.i].sub)===ps);
   if(exactSub.length===1)return exactSub[0].i;
 }
 const maxScore=Math.max(...compatible.map(x=>x.ev.score));
 const best=compatible.filter(x=>x.ev.score===maxScore);
 if(maxScore>0&&best.length===1)return best[0].i;
 if(compatible.length===1)return compatible[0].i;
 const neigh=compatible.map(x=>({...x,neighbor:neighborScore(people,pi,records,x.i)}));
 const maxNeighbor=Math.max(...neigh.map(x=>x.neighbor));
 const byNeighbor=neigh.filter(x=>x.neighbor===maxNeighbor);
 if(maxNeighbor>0&&byNeighbor.length===1)return byNeighbor[0].i;
 // Ultimo fallback consentito: stesso nominativo e almeno due elementi strutturali già concordi.
 // In questo caso le unità sono indistinguibili con i campi disponibili (es. stesso interno/piano,
 // SUB assente sulla persona) e la posizione relativa nel foglio Incassi resta l'unica evidenza.
 if(knownIdentityCount(p)>=2&&best.length>1&&best.every(x=>x.ev.score===maxScore))return best.sort((a,b)=>a.i-b.i)[0].i;
 return -1;
}
function fixOrdinaryByRealMonthCells(result,wb,fileName){
 const inc=findIncassiSheet(wb);if(!inc)return result;
 const rows=XLSX.utils.sheet_to_json(wb.Sheets[inc],{header:1,defval:null,raw:true});let scala='',header=null;const records=[];const startYear=sourceStartYear(fileName);
 for(let r=0;r<rows.length;r++){
   const row=rows[r]||[],sc=scaleFromRow(row);if(sc)scala=sc;const normalized=row.map(nrm);const nameCol=normalized.findIndex(x=>x==='CONDOMINO'||x==='NOMINATIVO');
   if(nameCol>=0){const rataCol=normalized.findIndex(x=>x==='RATA'),internoCol=normalized.findIndex(x=>x==='INTERNO'||x==='INT'||x==='INT.'),pianoCol=normalized.findIndex(x=>x==='PIANO'||x==='P'),subCol=normalized.findIndex(x=>x==='SUB');let monthCols=[];normalized.forEach((x,i)=>{if(MONTHS[x])monthCols.push([i,MONTHS[x]])});if(monthCols.length>12)monthCols=monthCols.slice(-12);if(rataCol>=0&&monthCols.length){header={nameCol,rataCol,internoCol,pianoCol,subCol,monthPlan:monthPlan(monthCols,startYear)};continue}}
   if(!header)continue;const name=String(row[header.nameCol]??'').trim();if(!name||/^TOTALE\b/i.test(name)||/^SCALA\b/i.test(name)||/^CONDOMINO$/i.test(name))continue;const rata=num(row[header.rataCol]);if(rata<=0)continue;const unpaid=[];for(const x of header.monthPlan){if(isFutureMonth(x.year,x.mese))continue;const paid=Math.max(0,num(row[x.c])),rem=Math.max(0,rata-paid);if(rem>.01)unpaid.push({mese:x.mese,importo:round2(rem),year:x.year})}records.push({name,scala,interno:header.internoCol>=0?String(row[header.internoCol]??''):'',piano:header.pianoCol>=0?String(row[header.pianoCol]??''):'',sub:header.subCol>=0?String(row[header.subCol]??''):'',sourceRow:r,unpaid})
 }
 const used=new Set(),people=result.people||[],unitUnresolved=[];
 for(let pi=0;pi<people.length;pi++){
   const p=people[pi],sameNameCount=records.reduce((n,r,i)=>n+(!used.has(i)&&canon(r.name)===canon(p.name)?1:0),0);
   const idx=chooseRecordIndex(p,people,pi,records,used);
   if(idx<0){if(sameNameCount>0)unitUnresolved.push(`Rate ordinarie · ${p.name}: unità omonima non associabile con certezza`);continue}
   used.add(idx);const rec=records[idx],other=(p.items||[]).filter(x=>x.type!=='ordinary'),ordinary=rec.unpaid.map(x=>({type:'ordinary',label:x.mese,amount:x.importo,selected:true}));p.items=[...ordinary,...other];
   if(!p.scala&&rec.scala)p.scala=rec.scala;if(!p.interno&&rec.interno)p.interno=rec.interno;if(!p.piano&&rec.piano)p.piano=rec.piano;if(!p.sub&&rec.sub)p.sub=rec.sub;p._sourceRow=rec.sourceRow;
   if(p._v6){p._v6.gross=round2(p.items.reduce((s,x)=>s+(Number(x.amount)||0),0));p._v6.monthSource='celle reali Incassi · ultimo blocco 12 mesi · identità unità verificata';p._v6.monthStartYear=startYear}
 }
 for(let i=0;i<records.length;i++){if(used.has(i))continue;const rec=records[i];if(!rec.unpaid.length)continue;const ordinary=rec.unpaid.map(x=>({type:'ordinary',label:x.mese,amount:x.importo,selected:true})),gross=round2(ordinary.reduce((s,x)=>s+x.amount,0));result.people.push({name:rec.name,scala:rec.scala||'',piano:rec.piano||'',interno:rec.interno||'',sub:rec.sub||'',_sourceRow:rec.sourceRow,phone:'',email:'',items:ordinary,credits:[],conflicts:[],recipientAddress:'',_v6:{gross,inc,monthSource:'celle reali Incassi · recuperato anche se totale annuale compensato',monthStartYear:startYear,warnings:[],unresolved:result.unresolved||[]}})}
 if(unitUnresolved.length)result.unresolved=[...(result.unresolved||[]),...unitUnresolved];
 result.people.sort((a,b)=>String(a.scala||'').localeCompare(String(b.scala||''),'it',{numeric:true})||String(a.interno||'').localeCompare(String(b.interno||''),'it',{numeric:true})||String(a.name||'').localeCompare(String(b.name||''),'it'));result.people.forEach((p,i)=>p.id=i);return result
}
function analyzePatched(wb,fileName){const clean=sanitizeWorkbook(wb);return fixOrdinaryByRealMonthCells(baseAnalyze(clean,fileName),wb,fileName)}
window.condoAnalyzeV6=analyzePatched;
window.condoAnalyzeAssociationFixV2={sanitizeWorkbook,analyzePatched,fixOrdinaryByRealMonthCells,sourceStartYear,unitEvidence,chooseRecordIndex};
parseFile=async function(file){loader.classList.remove('hidden');results.classList.add('hidden');try{const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array',cellDates:true,cellFormula:true}),r=analyzePatched(wb,file.name);current=r.people;if(r.frontKey&&r.frontKey!=='Frotespizio'&&!wb.Sheets.Frotespizio){wb.Sheets.Frotespizio=wb.Sheets[r.frontKey];wb.SheetNames.push('Frotespizio')}if(!r.frontKey){const ws=XLSX.utils.aoa_to_sheet([[r.title]]);wb.Sheets.Frotespizio=ws;wb.SheetNames.push('Frotespizio')}render(file.name,wb);building.textContent=r.title;source.textContent='Motore V7 · rate per singolo mese · ultimo blocco 12 mesi · mesi futuri esclusi · '+file.name+(r.unresolved.length?' · '+r.unresolved.length+' casi da verificare':'');const v=document.querySelector('#results .card .muted');if(v&&(v.textContent.includes('V2.8')||v.textContent.includes('Motore contabile V6')))v.textContent='Motore V7 · celle reali Incassi + ultimi 12 mesi + esclusione rate future + associazione conguagli verificata';if(r.unresolved.length)console.warn('Casi da verificare V7:',r.unresolved)}catch(e){console.error(e);alert('Non riesco a leggere il file con il motore V7: '+e.message)}finally{loader.classList.add('hidden')}};
})();
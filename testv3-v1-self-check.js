(()=>{
'use strict';
if(typeof XLSX==='undefined')return;

const nrm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const canon=x=>nrm(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
const num=x=>{if(typeof x==='number'&&Number.isFinite(x))return x;if(typeof x==='string'){let v=x.trim();if(!v)return 0;if(v.includes(',')&&v.includes('.'))v=v.replace(/\./g,'').replace(',','.');else if(v.includes(','))v=v.replace(',','.');const z=parseFloat(v);return Number.isFinite(z)?z:0}return 0};
const round2=x=>Math.round((Number(x)||0)*100)/100;
const MONTHS={GEN:'Gennaio',GENNAIO:'Gennaio',FEB:'Febbraio',FEBBRAIO:'Febbraio',MAR:'Marzo',MARZO:'Marzo',APR:'Aprile',APRILE:'Aprile',MAG:'Maggio',MAGGIO:'Maggio',GIU:'Giugno',GIUGNO:'Giugno',LUG:'Luglio',LUGLIO:'Luglio',AGO:'Agosto',AGOSTO:'Agosto',SET:'Settembre',SETT:'Settembre',SETTEMBRE:'Settembre',OTT:'Ottobre',OTTOBRE:'Ottobre',NOV:'Novembre',NOVEMBRE:'Novembre',DIC:'Dicembre',DICEMBRE:'Dicembre'};
const MONTH_NUM={GENNAIO:1,FEBBRAIO:2,MARZO:3,APRILE:4,MAGGIO:5,GIUGNO:6,LUGLIO:7,AGOSTO:8,SETTEMBRE:9,OTTOBRE:10,NOVEMBRE:11,DICEMBRE:12};
const SUMMARY_LABELS=new Set(['ANCORA DA INCASSARE','TOTALE DA INCASSARE','TOTALE PERIODO DA INCASSARE','TOTALE PERIODO ANCORA DA INCASSARE','TOTALE ANNUO DA INCASSARE','TOTALE ANNUO ANCORA DA INCASSARE']);
let batch=[];

function isSummaryName(name){return SUMMARY_LABELS.has(nrm(name))}
function scaleFromRow(row){for(let c=0;c<Math.min(4,(row||[]).length);c++){const s=nrm(row[c]).replace(/["']/g,' ');let m=s.match(/\bSCALA\s+([A-Z0-9]+)\b/);if(m)return m[1];m=s.match(/\bFABBRICATO\s+([A-Z0-9]+)\b/);if(m)return m[1];m=s.match(/\bFABRICATO\s+([A-Z0-9]+)\b/);if(m)return m[1]}return ''}
function findIncassi(wb){return (wb.SheetNames||[]).find(s=>nrm(s).startsWith('INCASSI '))||(wb.SheetNames||[]).find(s=>nrm(s).includes('INCASSI'))||''}
function sourceStartYear(fileName){const src=[String(window.condoSourcePath||''),String(fileName||'')].join(' '),years=[...src.matchAll(/20\d{2}/g)].map(m=>Number(m[0]));return years.length?years[0]:null}
function monthPlan(cols,startYear){if(!cols.length||!startYear)return cols.map(([c,mese])=>({c,mese,year:null}));let y=startYear,prev=MONTH_NUM[nrm(cols[0][1])]||0;return cols.map(([c,mese],i)=>{const mn=MONTH_NUM[nrm(mese)]||0;if(i>0&&mn&&prev&&mn<prev)y++;prev=mn||prev;return{c,mese,year:y}})}
function isFutureMonth(year,mese){if(!year)return false;const mn=MONTH_NUM[nrm(mese)];if(!mn)return false;const now=new Date(),cy=now.getFullYear(),cm=now.getMonth()+1;return year>cy||(year===cy&&mn>cm)}
function colExact(H,...names){const hs=H.map(nrm);for(const name of names){const i=hs.indexOf(nrm(name));if(i>=0)return i}return -1}
function colContains(H,...terms){const hs=H.map(nrm);for(const t0 of terms){const t=nrm(t0);for(let i=0;i<hs.length;i++)if(hs[i].includes(t))return i}return -1}
function effectiveHeaders(rows,hi){const prev=hi>0?(rows[hi-1]||[]):[],cur=rows[hi]||[],nn=Math.max(prev.length,cur.length),out=[];for(let i=0;i<nn;i++){const c=cur[i],p=prev[i];out.push(c!==null&&c!==undefined&&c!==''?c:p)}return out}
function monthCols(H){const out=[];H.forEach((h,i)=>{const k=nrm(h);if(MONTHS[k])out.push([i,MONTHS[k]])});return out.length>12?out.slice(-12):out}
function findHeader(rows){const keys=['RATA','CONGUAGLIO','IMPORTO','SALDO','RESIDUO','DA INCASSARE','DA VERSARE','PAGATO','VERSATO','INCASSATO'];for(let i=0;i<Math.min(35,rows.length);i++){const hs=(rows[i]||[]).map(nrm),hasName=hs.includes('NOMINATIVO')||hs.includes('CONDOMINO');if(hasName&&hs.some(h=>keys.some(k=>h.includes(k))))return i}return null}

function parseIncassiSource(wb,fileName){
 const inc=findIncassi(wb);if(!inc||!wb.Sheets?.[inc])return{inc:'',units:[],errors:['Foglio Incassi non trovato']};
 const rows=XLSX.utils.sheet_to_json(wb.Sheets[inc],{header:1,defval:null,raw:true}),startYear=sourceStartYear(fileName);let scala='',header=null,seq=0;const units=[],errors=[];
 for(let r=0;r<rows.length;r++){
   const row=rows[r]||[],sc=scaleFromRow(row);if(sc)scala=sc;const normalized=row.map(nrm),nameCol=normalized.findIndex(x=>x==='CONDOMINO'||x==='NOMINATIVO');
   if(nameCol>=0){const rataCol=normalized.findIndex(x=>x==='RATA'),internoCol=normalized.findIndex(x=>x==='INTERNO'||x==='INT'||x==='INT.'),pianoCol=normalized.findIndex(x=>x==='PIANO'||x==='P'),subCol=normalized.findIndex(x=>x==='SUB'),scalaCol=normalized.findIndex(x=>x==='SCALA'||x==='S');let mcols=[];normalized.forEach((x,i)=>{if(MONTHS[x])mcols.push([i,MONTHS[x]])});if(mcols.length>12)mcols=mcols.slice(-12);if(rataCol>=0&&mcols.length)header={nameCol,rataCol,internoCol,pianoCol,subCol,scalaCol,plan:monthPlan(mcols,startYear)};continue}
   if(!header)continue;
   const name=String(row[header.nameCol]??'').trim(),nn=nrm(name);if(!name||nn==='CONDOMINO'||nn==='NOMINATIVO'||nn.startsWith('TOTALE')||nn.startsWith('SCALA')||isSummaryName(name))continue;
   const rata=num(row[header.rataCol]),unpaid=[];for(const x of header.plan){if(isFutureMonth(x.year,x.mese))continue;const paid=Math.max(0,num(row[x.c])),rem=Math.max(0,rata-paid);if(rem>.01)unpaid.push({mese:x.mese,amount:round2(rem),year:x.year})}
   units.push({sourceOrder:seq++,sourceRow:r,name,canon:canon(name),scala:String(header.scalaCol>=0?(row[header.scalaCol]??''):'').trim()||scala,piano:String(header.pianoCol>=0?(row[header.pianoCol]??''):'').trim(),interno:String(header.internoCol>=0?(row[header.internoCol]??''):'').trim(),sub:String(header.subCol>=0?(row[header.subCol]??''):'').trim(),rata:round2(rata),unpaid});
 }
 if(!units.length)errors.push('Nessuna posizione ufficiale letta dal foglio Incassi');
 return{inc,units,startYear,errors};
}

function compareOrdinaryAndOrder(people,source){
 const errors=[...(source.errors||[])],details=[];let lastOrder=-1,ordinaryItems=0,futureItems=0;
 for(const p of people||[]){
   if(isSummaryName(p?.name)){errors.push(`Riga riepilogativa mostrata come condomino: ${p.name}`);continue}
   const order=Number(p?._sourceOrder);if(!Number.isFinite(order)||order<0||order>=source.units.length){errors.push(`${p?.name||'?'}: posizione Incassi non risolta`);continue}
   if(order<=lastOrder)errors.push(`${p.name}: sequenza app non coerente con Incassi (${order} dopo ${lastOrder})`);lastOrder=order;
   const u=source.units[order];if(canon(p.name)!==u.canon)errors.push(`${p.name}: nominativo app diverso dalla riga Incassi ${u.name}`);
   const actual=(p.items||[]).filter(x=>x.type==='ordinary').map(x=>({mese:String(x.label||''),amount:round2(x.amount)})),expected=u.unpaid;ordinaryItems+=actual.length;
   if(actual.length!==expected.length){errors.push(`${p.name}: rate ordinarie app ${actual.length}, Drive ${expected.length}`);details.push({name:p.name,type:'ordinary-count',app:actual.length,drive:expected.length})}
   const max=Math.max(actual.length,expected.length);for(let i=0;i<max;i++){const a=actual[i],e=expected[i];if(!a||!e)continue;if(nrm(a.mese)!==nrm(e.mese)||Math.abs(a.amount-e.amount)>.01){errors.push(`${p.name}: rata ${i+1} diversa (app ${a.mese} ${a.amount}; Drive ${e.mese} ${e.amount})`);details.push({name:p.name,type:'ordinary-value',app:a,drive:e})}}
   for(const a of actual){const mn=MONTH_NUM[nrm(a.mese)];if(mn){const expectedMonth=expected.find(e=>nrm(e.mese)===nrm(a.mese));if(!expectedMonth){futureItems++;}}}
   const invalid=(p.items||[]).filter(x=>x.type!=='ordinary'&&x.type!=='cong');if(invalid.length)errors.push(`${p.name}: presenti ${invalid.length} voci fuori scope V1`);
 }
 return{ok:!errors.length,errors,details,ordinaryItems,futureItems,displayed:(people||[]).length,sourceUnits:source.units.length};
}

function isCongSheet(name){const nn=nrm(name);return nn.includes('CONG')||((nn.includes('REC')||nn.includes('RECUPERO'))&&nn.includes('INCASS'))}
function parseCongSource(wb){
 const errors=[],sheets=[],names=(wb.SheetNames||[]).filter(isCongSheet);let count=0,debit=0,credit=0;
 for(const sn of names){
   const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:null,raw:true}),hi=findHeader(rows);if(hi==null){errors.push(`${sn}: intestazione conguaglio non riconosciuta`);continue}
   const H=effectiveHeaders(rows,hi),namec=colExact(H,'NOMINATIVO','CONDOMINO'),totaldue=colContains(H,'TOTALE ANNUO DA INCASSARE','TOTALE PERIODO DA INCASSARE','TOTALE DA INCASSARE'),balancec=colContains(H,'TOTALE ANNUO ANCORA DA INCASSARE','TOTALE PERIODO ANCORA DA INCASSARE','ANCORA DA INCASSARE','DA INCASSARE','SALDO','RESIDUO'),duec=colContains(H,'CONGUAGLIO','IMPORTO','DA VERSARE','RATA','TAB. A'),paidc=colExact(H,'PAGATO','VERSATO','INCASSATO'),reimbc=colExact(H,'RIMBORSATO'),mcols=monthCols(H);let sheetCount=0,sheetDebit=0,sheetCredit=0;
   for(let r=hi+1;r<rows.length;r++){
     const row=rows[r]||[],person=String(namec>=0?(row[namec]??''):'').trim(),nn=nrm(person);if(!person||nn==='CONDOMINO'||nn==='NOMINATIVO'||nn.startsWith('TOTALE')||nn.startsWith('SCALA')||isSummaryName(person))continue;
     const raw=balancec>=0?row[balancec]:null;let bal;if(balancec>=0&&!(typeof raw==='string'&&raw.includes('#')))bal=num(raw);else{const due=(totaldue>=0?num(row[totaldue]):0)||(duec>=0?num(row[duec]):0),paid=(paidc>=0?num(row[paidc]):0)+mcols.reduce((s,[c])=>s+num(row[c]),0),reimb=reimbc>=0?num(row[reimbc]):0;if(due===0)continue;bal=due-paid+reimb}
     if(Math.abs(bal)<=.01)continue;sheetCount++;count++;if(bal>0){sheetDebit+=bal;debit+=bal}else{sheetCredit+=-bal;credit+=-bal}
   }
   sheets.push({name:sn,count:sheetCount,debit:round2(sheetDebit),credit:round2(sheetCredit)});
 }
 return{names,sheets,count,debit:round2(debit),credit:round2(credit),errors};
}
function congDebt(p){return round2((p?.items||[]).filter(x=>x.type==='cong').reduce((s,x)=>s+num(x.amount),0))}
function congCredit(p){return round2((p?.credits||[]).filter(x=>{const t=nrm(x.label);return t.includes('CONGUAGLIO')||t.includes('DARE-AVERE')}).reduce((s,x)=>s+num(x.amount),0))}
function clonePeople(people){return (people||[]).map(p=>({...p,items:(p.items||[]).map(x=>({...x})),credits:(p.credits||[]).map(x=>({...x})),conflicts:[...(p.conflicts||[])]}))}
function compareConguagli(wb,fileName,people,sourceCong){
 const errors=[...(sourceCong.errors||[])],details=[];if(typeof window.condoAnalyzeV6!=='function'){errors.push('Motore conguagli non disponibile per il controllo');return{ok:false,errors,details,source:sourceCong}}
 let expectedResult;try{expectedResult=window.condoAnalyzeV6(wb,fileName)}catch(e){errors.push('Ricalcolo conguagli fallito: '+e.message);return{ok:false,errors,details,source:sourceCong}}
 const congNames=sourceCong.names||[],unresolved=(expectedResult.unresolved||[]).filter(x=>congNames.some(sn=>String(x).startsWith(sn)));if(unresolved.length)errors.push(...unresolved.map(x=>'Conguaglio non risolto: '+x));
 let expectedPeople=clonePeople(expectedResult.people||[]);if(window.condoV1SourceOrder?.reorderPeople)expectedPeople=window.condoV1SourceOrder.reorderPeople(expectedPeople,wb);
 const expectedByOrder=new Map(),actualByOrder=new Map();for(const p of expectedPeople){const o=Number(p._sourceOrder);if(Number.isFinite(o)&&o>=0&&o<Number.MAX_SAFE_INTEGER)expectedByOrder.set(o,{name:p.name,debit:congDebt(p),credit:congCredit(p)})}
 for(const p of people||[]){const o=Number(p._sourceOrder);if(Number.isFinite(o)&&o>=0&&o<Number.MAX_SAFE_INTEGER)actualByOrder.set(o,{name:p.name,debit:congDebt(p),credit:congCredit(p)})}
 let engineDebit=0,engineCredit=0,appDebit=0,appCredit=0;for(const v of expectedByOrder.values()){engineDebit+=v.debit;engineCredit+=v.credit}for(const v of actualByOrder.values()){appDebit+=v.debit;appCredit+=v.credit}
 engineDebit=round2(engineDebit);engineCredit=round2(engineCredit);appDebit=round2(appDebit);appCredit=round2(appCredit);
 if(Math.abs(sourceCong.debit-engineDebit)>.01)errors.push(`Conguagli a debito: Drive ${sourceCong.debit}, motore ${engineDebit}`);if(Math.abs(sourceCong.credit-engineCredit)>.01)errors.push(`Conguagli a credito: Drive ${sourceCong.credit}, motore ${engineCredit}`);
 if(Math.abs(engineDebit-appDebit)>.01)errors.push(`Conguagli a debito: motore ${engineDebit}, app ${appDebit}`);if(Math.abs(engineCredit-appCredit)>.01)errors.push(`Conguagli a credito: motore ${engineCredit}, app ${appCredit}`);
 const orders=new Set([...expectedByOrder.keys(),...actualByOrder.keys()]);for(const o of orders){const e=expectedByOrder.get(o)||{debit:0,credit:0,name:'?'},a=actualByOrder.get(o)||{debit:0,credit:0,name:e.name};if(Math.abs(e.debit-a.debit)>.01||Math.abs(e.credit-a.credit)>.01){errors.push(`${a.name||e.name}: conguaglio diverso (app debito ${a.debit}/credito ${a.credit}; Drive debito ${e.debit}/credito ${e.credit})`);details.push({order:o,name:a.name||e.name,app:a,drive:e})}}
 return{ok:!errors.length,errors,details,source:sourceCong,engineDebit,engineCredit,appDebit,appCredit,unresolved:unresolved.length};
}

function auditWorkbook(wb,people,folderName,fileName){
 const source=parseIncassiSource(wb,fileName),ordinary=compareOrdinaryAndOrder(people,source),sourceCong=parseCongSource(wb),conguagli=compareConguagli(wb,fileName,people,sourceCong),errors=[...ordinary.errors,...conguagli.errors];
 return{ok:!errors.length,folder:folderName||fileName||'Condominio',file:fileName||'',errors,ordinary,conguagli,sourceUnits:source.units.length,displayed:(people||[]).length,conguaglioRows:sourceCong.count};
}
async function auditFile(file,people,folderName,fileName){const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array',cellDates:true,cellFormula:true});return auditWorkbook(wb,people,folderName,fileName||file.name)}
function resetBatch(){batch=[]}
function add(report){batch.push(report);return report}
function finalize(expectedCount){
 const errors=[];if(Number.isFinite(expectedCount)&&batch.length!==expectedCount)errors.push(`File autocollaudati ${batch.length}/${expectedCount}`);for(const r of batch)for(const e of r.errors||[])errors.push(`${r.folder}: ${e}`);
 const totals=batch.reduce((a,r)=>{a.files++;a.displayed+=r.displayed||0;a.sourceUnits+=r.sourceUnits||0;a.ordinaryItems+=r.ordinary?.ordinaryItems||0;a.futureItems+=r.ordinary?.futureItems||0;a.conguaglioRows+=r.conguaglioRows||0;a.congUnresolved+=r.conguagli?.unresolved||0;return a},{files:0,displayed:0,sourceUnits:0,ordinaryItems:0,futureItems:0,conguaglioRows:0,congUnresolved:0});
 return{ok:!errors.length&&(!Number.isFinite(expectedCount)||batch.length===expectedCount),expectedCount:Number.isFinite(expectedCount)?expectedCount:null,errors,totals,reports:batch.map(r=>({folder:r.folder,file:r.file,ok:r.ok,errors:r.errors,displayed:r.displayed,sourceUnits:r.sourceUnits,ordinaryItems:r.ordinary?.ordinaryItems||0,conguaglioRows:r.conguaglioRows||0}))};
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderBatchSummary(summary){
 let card=document.getElementById('v1SelfCheckReport');if(!card){card=document.createElement('div');card.id='v1SelfCheckReport';card.className='card no-print';const area=document.getElementById('driveCondoArea'),status=document.getElementById('status');(area||status)?.parentNode?.insertBefore(card,(area||status)?.nextSibling||null)}if(!card)return;
 const ok=!!summary?.ok,t=summary?.totals||{},title=ok?'✅ AUTOCOLLAUDO AGGIORNAMENTO SUPERATO':'❌ AUTOCOLLAUDO AGGIORNAMENTO NON SUPERATO';
 const errs=(summary?.errors||[]).slice(0,12);card.style.border=ok?'2px solid #14804a':'2px solid #b42318';card.innerHTML=`<div style="font-weight:900;font-size:16px;color:${ok?'#067647':'#b42318'}">${title}</div><div style="margin-top:8px;line-height:1.55"><b>Condomini/file controllati:</b> ${t.files||0}${summary?.expectedCount!=null?' / '+summary.expectedCount:''}<br><b>Nominativi/sequenza Incassi:</b> ${ok?'OK':'VERIFICARE'}<br><b>Rate ordinarie confrontate:</b> ${t.ordinaryItems||0}<br><b>Rate future anomale:</b> ${t.futureItems||0}<br><b>Conguagli sorgente:</b> ${t.conguaglioRows||0} · <b>non risolti:</b> ${t.congUnresolved||0}<br><b>Scope V1:</b> ordinario + conguagli + WhatsApp</div>${errs.length?`<details style="margin-top:8px"><summary><b>Dettagli errori (${summary.errors.length})</b></summary>${errs.map(e=>`<div style="padding:4px 0">• ${esc(e)}</div>`).join('')}${summary.errors.length>errs.length?'<div>… altri errori non mostrati.</div>':''}</details>`:''}`;
}

window.condoSelfCheckV1={auditWorkbook,auditFile,resetBatch,add,finalize,renderBatchSummary,getBatch:()=>batch.map(x=>({...x}))};
})();

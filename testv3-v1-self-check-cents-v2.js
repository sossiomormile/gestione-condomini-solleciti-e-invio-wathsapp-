(()=>{
'use strict';

// Correzione isolata dell'autocollaudo conguagli.
// I fogli Excel possono contenere formule con frazioni di centesimo non visibili.
// Il motore operativo arrotonda ogni singola posizione a 2 decimali prima di sommarla;
// il controllo Drive deve usare la stessa base contabile (centesimi per posizione),
// altrimenti può segnalare falsi scostamenti di pochi centesimi.
const api=window.condoSelfCheckV1;
if(!api||typeof XLSX==='undefined')return;

const nrm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const num=x=>{if(typeof x==='number'&&Number.isFinite(x))return x;if(typeof x==='string'){let v=x.trim();if(!v)return 0;if(v.includes(',')&&v.includes('.'))v=v.replace(/\./g,'').replace(',','.');else if(v.includes(','))v=v.replace(',','.');const z=parseFloat(v);return Number.isFinite(z)?z:0}return 0};
const round2=x=>Math.round((Number(x)||0)*100)/100;
const SUMMARY_LABELS=new Set(['ANCORA DA INCASSARE','TOTALE DA INCASSARE','TOTALE PERIODO DA INCASSARE','TOTALE PERIODO ANCORA DA INCASSARE','TOTALE ANNUO DA INCASSARE','TOTALE ANNUO ANCORA DA INCASSARE']);
const MONTHS=new Set(['GEN','GENNAIO','FEB','FEBBRAIO','MAR','MARZO','APR','APRILE','MAG','MAGGIO','GIU','GIUGNO','LUG','LUGLIO','AGO','AGOSTO','SET','SETT','SETTEMBRE','OTT','OTTOBRE','NOV','NOVEMBRE','DIC','DICEMBRE']);

function isSummaryName(name){return SUMMARY_LABELS.has(nrm(name))}
function isCongSheet(name){const nn=nrm(name);return nn.includes('CONG')||((nn.includes('REC')||nn.includes('RECUPERO'))&&nn.includes('INCASS'))}
function findHeader(rows){const keys=['RATA','CONGUAGLIO','IMPORTO','SALDO','RESIDUO','DA INCASSARE','DA VERSARE','PAGATO','VERSATO','INCASSATO'];for(let i=0;i<Math.min(35,rows.length);i++){const hs=(rows[i]||[]).map(nrm),hasName=hs.includes('NOMINATIVO')||hs.includes('CONDOMINO');if(hasName&&hs.some(h=>keys.some(k=>h.includes(k))))return i}return null}
function effectiveHeaders(rows,hi){const prev=hi>0?(rows[hi-1]||[]):[],cur=rows[hi]||[],nn=Math.max(prev.length,cur.length),out=[];for(let i=0;i<nn;i++){const c=cur[i],p=prev[i];out.push(c!==null&&c!==undefined&&c!==''?c:p)}return out}
function colExact(H,...names){const hs=H.map(nrm);for(const name of names){const i=hs.indexOf(nrm(name));if(i>=0)return i}return -1}
function colContains(H,...terms){const hs=H.map(nrm);for(const t0 of terms){const t=nrm(t0);for(let i=0;i<hs.length;i++)if(hs[i].includes(t))return i}return -1}
function monthCols(H){const out=[];H.forEach((h,i)=>{if(MONTHS.has(nrm(h)))out.push(i)});return out.length>12?out.slice(-12):out}

function roundedSourceConguagli(wb){
 const names=(wb.SheetNames||[]).filter(isCongSheet),sheets=[];let count=0,debit=0,credit=0;
 for(const sn of names){
  const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:null,raw:true}),hi=findHeader(rows);if(hi==null)continue;
  const H=effectiveHeaders(rows,hi),namec=colExact(H,'NOMINATIVO','CONDOMINO'),totaldue=colContains(H,'TOTALE ANNUO DA INCASSARE','TOTALE PERIODO DA INCASSARE','TOTALE DA INCASSARE'),balancec=colContains(H,'TOTALE ANNUO ANCORA DA INCASSARE','TOTALE PERIODO ANCORA DA INCASSARE','ANCORA DA INCASSARE','DA INCASSARE','SALDO','RESIDUO'),duec=colContains(H,'CONGUAGLIO','IMPORTO','DA VERSARE','RATA','TAB. A'),paidc=colExact(H,'PAGATO','VERSATO','INCASSATO'),reimbc=colExact(H,'RIMBORSATO'),mcols=monthCols(H);let sheetCount=0,sheetDebit=0,sheetCredit=0;
  for(let r=hi+1;r<rows.length;r++){
   const row=rows[r]||[],person=String(namec>=0?(row[namec]??''):'').trim(),nn=nrm(person);if(!person||nn==='CONDOMINO'||nn==='NOMINATIVO'||nn.startsWith('TOTALE')||nn.startsWith('SCALA')||isSummaryName(person))continue;
   const raw=balancec>=0?row[balancec]:null;let bal;
   if(balancec>=0&&!(typeof raw==='string'&&raw.includes('#')))bal=num(raw);
   else{const due=(totaldue>=0?num(row[totaldue]):0)||(duec>=0?num(row[duec]):0),paid=(paidc>=0?num(row[paidc]):0)+mcols.reduce((s,c)=>s+num(row[c]),0),reimb=reimbc>=0?num(row[reimbc]):0;if(due===0)continue;bal=due-paid+reimb}
   if(Math.abs(bal)<=.01)continue;
   const cents=round2(bal);sheetCount++;count++;
   if(bal>0){sheetDebit+=cents;debit+=cents}else{sheetCredit+=-cents;credit+=-cents}
  }
  sheets.push({name:sn,count:sheetCount,debit:round2(sheetDebit),credit:round2(sheetCredit)});
 }
 return{names,sheets,count,debit:round2(debit),credit:round2(credit)};
}

function normalize(report,rounded){
 const c=report?.conguagli;if(!c)return report;
 const debitOk=Math.abs(round2(c.engineDebit)-rounded.debit)<=.01,creditOk=Math.abs(round2(c.engineCredit)-rounded.credit)<=.01;
 const isOnlyRawCentMismatch=e=>(debitOk&&/^Conguagli a debito: Drive .*?, motore /.test(String(e)))||(creditOk&&/^Conguagli a credito: Drive .*?, motore /.test(String(e)));
 c.errors=(c.errors||[]).filter(e=>!isOnlyRawCentMismatch(e));
 c.source={...(c.source||{}),debit:rounded.debit,credit:rounded.credit,count:rounded.count,sheets:rounded.sheets,roundingBasis:'singola posizione arrotondata a 2 decimali'};
 c.ok=c.errors.length===0;
 report.conguaglioRows=rounded.count;
 report.errors=[...(report.ordinary?.errors||[]),...c.errors];
 report.ok=report.errors.length===0;
 return report;
}

const baseAuditWorkbook=api.auditWorkbook?.bind(api),baseAuditFile=api.auditFile?.bind(api);
if(baseAuditWorkbook)api.auditWorkbook=function(wb,people,folderName,fileName){const report=baseAuditWorkbook(wb,people,folderName,fileName);try{return normalize(report,roundedSourceConguagli(wb))}catch(e){console.warn('Autocollaudo centesimi: controllo non applicato',e);return report}};
if(baseAuditFile)api.auditFile=async function(file,people,folderName,fileName){const report=await baseAuditFile(file,people,folderName,fileName);try{const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array',cellDates:true,cellFormula:true});return normalize(report,roundedSourceConguagli(wb))}catch(e){console.warn('Autocollaudo centesimi: controllo non applicato',e);return report}};

window.condoSelfCheckCentsV2={roundedSourceConguagli,normalize};
})();

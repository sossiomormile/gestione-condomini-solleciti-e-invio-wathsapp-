(()=>{
'use strict';
const api=window.condoSelfCheckV1;if(!api||typeof XLSX==='undefined')return;
const nrm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const canon=x=>nrm(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
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
function parseSource(wb,fileName){
 const inc=findIncassi(wb);if(!inc||!wb.Sheets?.[inc])return{units:[],errors:['Deep check: foglio Incassi non trovato']};const rows=XLSX.utils.sheet_to_json(wb.Sheets[inc],{header:1,defval:null,raw:true}),start=sourceYear(fileName);let scala='',h=null,order=0;const units=[],errors=[];
 for(let r=0;r<rows.length;r++){
  const row=rows[r]||[],sc=scaleFromRow(row);if(sc)scala=sc;const H=row.map(nrm),name=H.findIndex(x=>x==='CONDOMINO'||x==='NOMINATIVO');
  if(name>=0){const rata=H.findIndex(x=>x==='RATA'),interno=H.findIndex(x=>x==='INTERNO'||x==='INT'||x==='INT.'),piano=H.findIndex(x=>x==='PIANO'||x==='P'),sub=H.findIndex(x=>x==='SUB'),scalaCol=H.findIndex(x=>x==='SCALA'||x==='S');let mc=[];H.forEach((x,i)=>{if(MONTHS[x])mc.push([i,MONTHS[x]])});if(mc.length>12)mc=mc.slice(-12);if(rata>=0&&mc.length)h={name,rata,interno,piano,sub,scalaCol,plan:plan(mc,start)};continue}
  if(!h)continue;const person=String(row[h.name]??'').trim(),nn=nrm(person);if(!person||nn==='CONDOMINO'||nn==='NOMINATIVO'||nn.startsWith('TOTALE')||nn.startsWith('SCALA')||isSummary(person))continue;
  const rata=round2(num(row[h.rata])),unpaid=[];for(const x of h.plan){if(future(x.year,x.m))continue;const rem=Math.max(0,rata-Math.max(0,num(row[x.c])));if(rem>.01)unpaid.push({mese:x.m,amount:round2(rem)})}
  units.push({order:order++,row:r,name:person,canon:canon(person),scala:String(h.scalaCol>=0?(row[h.scalaCol]??''):'').trim()||scala,interno:String(h.interno>=0?(row[h.interno]??''):'').trim(),piano:String(h.piano>=0?(row[h.piano]??''):'').trim(),sub:String(h.sub>=0?(row[h.sub]??''):'').trim(),unpaid});
 }
 if(!units.length)errors.push('Deep check: nessuna unità Incassi letta');return{inc,units,errors};
}
function conflict(a,b){const A=nrm(a),B=nrm(b);return!!(A&&B&&A!==B)}
function deepAudit(wb,people,fileName){
 const src=parseSource(wb,fileName),errors=[...src.errors],details=[],seen=new Set();let actualCount=0,actualTotal=0;
 const expectedCount=src.units.reduce((s,u)=>s+u.unpaid.length,0),expectedTotal=round2(src.units.reduce((s,u)=>s+u.unpaid.reduce((q,x)=>q+x.amount,0),0)),expectedActive=new Set(src.units.filter(u=>u.unpaid.length).map(u=>u.order)),actualActive=new Set();
 for(const p of people||[]){
  if(isSummary(p?.name)){errors.push('Deep check: riga riepilogativa presente: '+p.name);continue}
  const o=Number(p?._sourceOrder);if(!Number.isFinite(o)||o<0||o>=src.units.length){errors.push(`Deep check: ${p?.name||'?'} senza posizione Incassi valida`);continue}
  if(seen.has(o))errors.push(`Deep check: posizione Incassi duplicata ${o} (${p.name})`);seen.add(o);const u=src.units[o];
  if(canon(p.name)!==u.canon)errors.push(`Deep check: nominativo diverso alla posizione ${o}`);
  for(const f of ['scala','interno','piano','sub'])if(conflict(p?.[f],u?.[f]))errors.push(`Deep check: ${p.name} ${f} app ${p[f]} / Drive ${u[f]}`);
  const ord=(p.items||[]).filter(x=>x.type==='ordinary');if(ord.length)actualActive.add(o);actualCount+=ord.length;actualTotal+=ord.reduce((s,x)=>s+num(x.amount),0);
  const bad=(p.items||[]).filter(x=>x.type!=='ordinary'&&x.type!=='cong');if(bad.length)errors.push(`Deep check: ${p.name} contiene ${bad.length} voci fuori V1`);
 }
 actualTotal=round2(actualTotal);
 if(actualCount!==expectedCount)errors.push(`Deep check: rate ordinarie complessive app ${actualCount} / Drive ${expectedCount}`);
 if(Math.abs(actualTotal-expectedTotal)>.01)errors.push(`Deep check: totale ordinario app ${actualTotal} / Drive ${expectedTotal}`);
 const missing=[...expectedActive].filter(o=>!actualActive.has(o));if(missing.length){errors.push(`Deep check: ${missing.length} unità con rate scoperte mancanti nell'app`);details.push({type:'missing-active-orders',orders:missing})}
 const unexpected=[...actualActive].filter(o=>!expectedActive.has(o));if(unexpected.length){errors.push(`Deep check: ${unexpected.length} unità con rate ordinarie non previste da Drive`);details.push({type:'unexpected-active-orders',orders:unexpected})}
 return{ok:!errors.length,errors,details,expectedOrdinaryItems:expectedCount,actualOrdinaryItems:actualCount,expectedOrdinaryTotal:expectedTotal,actualOrdinaryTotal:actualTotal,expectedActiveUnits:expectedActive.size,actualActiveUnits:actualActive.size,sourceUnits:src.units.length};
}
function augment(report,deep){report.deep=deep;report.errors=[...(report.errors||[]),...(deep.errors||[])];report.ok=report.errors.length===0;return report}
const baseWorkbook=api.auditWorkbook?.bind(api),baseFile=api.auditFile?.bind(api);
if(baseWorkbook)api.auditWorkbook=function(wb,people,folderName,fileName){const r=baseWorkbook(wb,people,folderName,fileName);try{return augment(r,deepAudit(wb,people,fileName))}catch(e){return augment(r,{ok:false,errors:['Deep check non eseguito: '+e.message]})}};
if(baseFile)api.auditFile=async function(file,people,folderName,fileName){const r=await baseFile(file,people,folderName,fileName);try{const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array',cellDates:true,cellFormula:true});return augment(r,deepAudit(wb,people,fileName||file.name))}catch(e){return augment(r,{ok:false,errors:['Deep check non eseguito: '+e.message]})}};
window.condoDeepCheckV2={parseSource,deepAudit};
})();

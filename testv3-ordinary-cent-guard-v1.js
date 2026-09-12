(()=>{
'use strict';
if(typeof window==='undefined'||typeof window.condoAnalyzeV6!=='function'||typeof XLSX==='undefined')return;
const baseAnalyze=window.condoAnalyzeV6;
const nrm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const num=x=>{if(typeof x==='number'&&Number.isFinite(x))return x;if(typeof x==='string'){let v=x.trim();if(!v)return 0;if(v.includes(',')&&v.includes('.'))v=v.replace(/\./g,'').replace(',','.');else if(v.includes(','))v=v.replace(',','.');const z=parseFloat(v);return Number.isFinite(z)?z:0}return 0};
const round2=x=>Math.round((Number(x)||0)*100)/100;
const MONTHS={GEN:'Gennaio',GENNAIO:'Gennaio',FEB:'Febbraio',FEBBRAIO:'Febbraio',MAR:'Marzo',MARZO:'Marzo',APR:'Aprile',APRILE:'Aprile',MAG:'Maggio',MAGGIO:'Maggio',GIU:'Giugno',GIUGNO:'Giugno',LUG:'Luglio',LUGLIO:'Luglio',AGO:'Agosto',AGOSTO:'Agosto',SET:'Settembre',SETT:'Settembre',SETTEMBRE:'Settembre',OTT:'Ottobre',OTTOBRE:'Ottobre',NOV:'Novembre',NOVEMBRE:'Novembre',DIC:'Dicembre',DICEMBRE:'Dicembre'};
const MONTH_NUM={GENNAIO:1,FEBBRAIO:2,MARZO:3,APRILE:4,MAGGIO:5,GIUGNO:6,LUGLIO:7,AGOSTO:8,SETTEMBRE:9,OTTOBRE:10,NOVEMBRE:11,DICEMBRE:12};
function findIncassi(wb){return(wb.SheetNames||[]).find(s=>nrm(s).startsWith('INCASSI '))||(wb.SheetNames||[]).find(s=>nrm(s).includes('INCASSI'))||''}
function sourceYear(fileName){const src=[String(window.condoSourcePath||''),String(fileName||'')].join(' '),ys=[...src.matchAll(/20\d{2}/g)].map(x=>Number(x[0]));return ys.length?ys[0]:null}
function plan(cols,start){if(!start)return cols.map(([c,m])=>({c,m,year:null}));let y=start,prev=MONTH_NUM[nrm(cols[0]?.[1])]||0;return cols.map(([c,m],i)=>{const mn=MONTH_NUM[nrm(m)]||0;if(i>0&&mn&&prev&&mn<prev)y++;prev=mn||prev;return{c,m,year:y}})}
function future(year,m){if(!year)return false;const mn=MONTH_NUM[nrm(m)];if(!mn)return false;const d=new Date();return year>d.getFullYear()||(year===d.getFullYear()&&mn>d.getMonth()+1)}
function sourceOrdinaryByRow(wb,fileName){
 const inc=findIncassi(wb),map=new Map();if(!inc||!wb.Sheets?.[inc])return map;
 const rows=XLSX.utils.sheet_to_json(wb.Sheets[inc],{header:1,defval:null,raw:true}),start=sourceYear(fileName);let h=null;
 for(let r=0;r<rows.length;r++){
  const row=rows[r]||[],H=row.map(nrm),name=H.findIndex(x=>x==='CONDOMINO'||x==='NOMINATIVO');
  if(name>=0){const rata=H.findIndex(x=>x==='RATA');let mc=[];H.forEach((x,i)=>{if(MONTHS[x])mc.push([i,MONTHS[x]])});if(mc.length>12)mc=mc.slice(-12);if(rata>=0&&mc.length)h={name,rata,plan:plan(mc,start)};continue}
  if(!h)continue;const person=String(row[h.name]??'').trim(),nn=nrm(person);if(!person||nn==='CONDOMINO'||nn==='NOMINATIVO'||nn.startsWith('TOTALE')||nn.startsWith('SCALA'))continue;
  const rata=round2(num(row[h.rata])),unpaid=[];for(const x of h.plan){if(future(x.year,x.m))continue;const paid=Math.max(0,num(row[x.c])),rem=round2(Math.max(0,rata-paid));if(rem>.01)unpaid.push({type:'ordinary',label:x.m,amount:rem,selected:true})}
  map.set(r,{name:person,rata,unpaid});
 }
 return map;
}
function normalize(result,wb,fileName){
 const source=sourceOrdinaryByRow(wb,fileName),audit=[];
 for(const p of result?.people||[]){const row=Number(p?._sourceRow);if(!Number.isFinite(row)||!source.has(row))continue;const src=source.get(row),other=(p.items||[]).filter(x=>x.type!=='ordinary'),before=(p.items||[]).filter(x=>x.type==='ordinary'),ordinary=src.unpaid.map(x=>({...x}));p.items=[...ordinary,...other];if(p._v6)p._v6.gross=round2(p.items.reduce((s,x)=>s+num(x.amount),0));if(before.length!==ordinary.length||Math.abs(before.reduce((s,x)=>s+num(x.amount),0)-ordinary.reduce((s,x)=>s+num(x.amount),0))>.001)audit.push({name:p.name,sourceRow:row,before:before.map(x=>({label:x.label,amount:x.amount})),after:ordinary.map(x=>({label:x.label,amount:x.amount}))})}
 window.condoOrdinaryCentGuardV1.lastAudit=audit;return result;
}
function analyzeGuarded(wb,fileName){return normalize(baseAnalyze(wb,fileName),wb,fileName)}
window.condoAnalyzeV6=analyzeGuarded;
window.condoOrdinaryCentGuardV1={sourceOrdinaryByRow,normalize,analyzeGuarded,lastAudit:[]};
parseFile=async function(file){if(typeof loader!=='undefined')loader.classList.remove('hidden');if(typeof results!=='undefined')results.classList.add('hidden');try{const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array',cellDates:true,cellFormula:true}),r=analyzeGuarded(wb,file.name);if(typeof current!=='undefined')current=r.people;if(r.frontKey&&r.frontKey!=='Frotespizio'&&!wb.Sheets.Frotespizio){wb.Sheets.Frotespizio=wb.Sheets[r.frontKey];wb.SheetNames.push('Frotespizio')}if(!r.frontKey){const ws=XLSX.utils.aoa_to_sheet([[r.title]]);wb.Sheets.Frotespizio=ws;wb.SheetNames.push('Frotespizio')}if(typeof render==='function')render(file.name,wb);if(typeof building!=='undefined')building.textContent=r.title;if(typeof source!=='undefined')source.textContent='Motore V7 · rate allineate ai centesimi · identità unità verificata · '+file.name+(r.unresolved.length?' · '+r.unresolved.length+' casi da verificare':'');if(r.unresolved.length)console.warn('Casi da verificare V7:',r.unresolved)}catch(e){console.error(e);alert('Non riesco a leggere il file con il controllo centesimi: '+e.message)}finally{if(typeof loader!=='undefined')loader.classList.add('hidden')}};
})();
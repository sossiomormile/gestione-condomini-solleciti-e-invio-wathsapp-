(()=>{
'use strict';
const MONTH_ALIASES={GEN:'Gennaio',GENNAIO:'Gennaio',FEB:'Febbraio',FEBBRAIO:'Febbraio',MAR:'Marzo',MARZO:'Marzo',APR:'Aprile',APRILE:'Aprile',MAG:'Maggio',MAGGIO:'Maggio',GIU:'Giugno',GIUGNO:'Giugno',LUG:'Luglio',LUGLIO:'Luglio',AGO:'Agosto',AGOSTO:'Agosto',SET:'Settembre',SETT:'Settembre',SETTEMBRE:'Settembre',OTT:'Ottobre',OTTOBRE:'Ottobre',NOV:'Novembre',NOVEMBRE:'Novembre',DIC:'Dicembre',DICEMBRE:'Dicembre'};
const IGNORE_SHEETS=['MOROSI','RATE INSOLUTE','FRONTESPIZIO','FROTESPIZIO','RENDICONTO','CONTO ECONOMICO','STATO PATRIMONIALE','PRIMA NOTA','MILLESIMI','RIPARTO','PREVENTIVO','RESOCONTO','FATTURE NON PAGATE'];
function nrm(x){return String(x??'').trim().replace(/\s+/g,' ').toUpperCase()}
function canonName(x){return nrm(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim()}
function nameCompatible(a,b){const x=canonName(a),y=canonName(b);if(!x||!y)return false;if(x===y)return true;if(x.includes(y)||y.includes(x))return true;const xt=x.split(' ').filter(Boolean),yt=y.split(' ').filter(Boolean);if(!xt.length||!yt.length)return false;const shorter=xt.length<=yt.length?xt:yt,longer=xt.length<=yt.length?yt:xt;return shorter.every(t=>longer.some(u=>u===t||(t.length===1&&u.startsWith(t))||(u.length===1&&t.startsWith(u))))}
function num(x){if(typeof x==='number'&&Number.isFinite(x))return x;if(typeof x==='string'){let v=x.trim();if(!v)return 0;if(v.includes(',')&&v.includes('.'))v=v.replace(/\./g,'').replace(',','.');else if(v.includes(','))v=v.replace(',','.');const z=parseFloat(v);return Number.isFinite(z)?z:0}return 0}
const round2=x=>Math.round((Number(x)||0)*100)/100;
function val(r,i){return i!=null&&i<r.length?r[i]:null}
function findHeader(rows){const keys=['RATA','CONGUAGLIO','IMPORTO','SALDO','RESIDUO','DA INCASSARE','DA VERSARE','PAGATO','VERSATO','INCASSATO'];for(let i=0;i<Math.min(35,rows.length);i++){const hs=(rows[i]||[]).map(nrm),hasName=hs.includes('NOMINATIVO')||hs.includes('CONDOMINO');if(hasName&&hs.some(h=>keys.some(k=>h.includes(k))))return i}return null}
function effectiveHeaders(rows,hi){const prev=hi>0?(rows[hi-1]||[]):[],cur=rows[hi]||[],nn=Math.max(prev.length,cur.length),out=[];for(let i=0;i<nn;i++){const c=cur[i],p=prev[i];out.push(c!==null&&c!==undefined&&c!==''?c:p)}return out}
function colExact(H,...names){const hs=H.map(nrm);for(const name of names){const i=hs.indexOf(nrm(name));if(i>=0)return i}return null}
function colContains(H,...terms){const hs=H.map(nrm);for(const t0 of terms){const t=nrm(t0);for(let i=0;i<hs.length;i++)if(hs[i].includes(t))return i}return null}
function monthCols(H){const out=[];H.forEach((h,i)=>{const k=nrm(h);if(MONTH_ALIASES[k])out.push([i,MONTH_ALIASES[k]])});return out.length>12?out.slice(-12):out}
function frontInfo(sheets){const key=Object.keys(sheets).find(k=>/FRO?NT?ESPIZIO/i.test(k))||'';const rows=sheets[key]||[],vals=rows.flat().filter(x=>x!==null&&x!==undefined&&x!=='').map(String);let condo='';for(const v of vals){if(/CONDOMINIO/i.test(v)){condo=v.replace(/CONDOMINIO/i,'').replace(/^[ \"-]+|[ \"-]+$/g,'').trim();if(condo)break}}if(!condo&&vals.length)condo=vals[0].replace(/^[ \"-]+|[ \"-]+$/g,'').trim();let period='Non rilevato',dates='';for(const v of vals){const m=v.match(/(?:RENDICONTO|BILANCIO)\s+CONSUNTIVO\s+(\d{4})(?:\s*[-/]\s*(\d{4}))?/i);if(m){period=m[1]+(m[2]?'-'+m[2]:'');break}}for(const v of vals){if(/\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}/.test(v)){dates=v;break}}return [condo,period,dates,key]}
function parseOrdinary(rows){
 const hi=findHeader(rows);if(hi==null)return [{},['Intestazione ordinario non riconosciuta']];
 const H=effectiveHeaders(rows,hi),namec=colExact(H,'NOMINATIVO','CONDOMINO'),ratac=colExact(H,'RATA'),intc=colExact(H,'INT','INT.','INTERNO'),scalac=colExact(H,'SCALA'),pianoc=colExact(H,'P','PIANO'),indc=colContains(H,'SPESE INDIVIDUALI','SPESE INDIVUALI'),indpaid=colExact(H,'RISCOSSE','RISCOSSIONE'),duec=colContains(H,'TOTALE ANNUO DA INCASSARE','TOTALE PERIODO DA INCASSARE'),balanc=colContains(H,'TOTALE ANNUO ANCORA DA INCASSARE','TOTALE PERIODO ANCORA DA INCASSARE'),mcols=monthCols(H),out={},warns=[];
 let seq=0;
 rows.slice(hi+1).forEach((r,offset)=>{const name=String(val(r,namec)??'').trim();if(!name||nrm(name).startsWith('TOTALE')||nrm(name).startsWith('SCALA'))return;const rata=num(val(r,ratac)),totalDue=num(val(r,duec)),balance=num(val(r,balanc));if(rata<=0&&totalDue<=0&&Math.abs(balance)<=.01)return;const position=seq++;const monthlyPaid=mcols.reduce((s,[c])=>s+num(val(r,c)),0),indDue=num(val(r,indc)),indPaid=num(val(r,indpaid)),monthlyDue=totalDue>0?Math.max(0,totalDue-indDue):Math.max(0,rata*12);if(rata>0&&Math.abs(monthlyDue-rata*12)>Math.max(2,.03*Math.max(monthlyDue,1)))warns.push(`${name}: quota mensile x12 non coincide con quota ordinaria`);let ordinaryBalance=Math.max(0,monthlyDue-monthlyPaid),individualBalance=Math.max(0,indDue-indPaid),calc=ordinaryBalance+individualBalance;if(balance>0&&Math.abs(calc-balance)>2){warns.push(`${name}: saldo contabile diverso dal ricalcolo`);const diff=balance-calc;if(diff>0)individualBalance+=diff}let paidPool=Math.max(0,monthlyPaid),unpaid=[];for(const [c,mn] of mcols){const q=rata>0?rata:(mcols.length?monthlyDue/mcols.length:0),covered=Math.min(q,paidPool);paidPool-=covered;const rem=Math.max(0,q-covered);if(rem>.01)unpaid.push({mese:mn,importo:round2(rem)})}const excess=Math.max(0,monthlyPaid-monthlyDue)+Math.max(0,indPaid-indDue)+Math.max(0,-balance);out[name]={ordinario:round2(ordinaryBalance),rate_scoperte:unpaid,spese_individuali:round2(individualBalance),credito:round2(excess),interno:String(val(r,intc)??''),scala:String(val(r,scalac)??''),piano:String(val(r,pianoc)??''),_position:position,_row:hi+1+offset};});
 return [out,warns]
}
function parseBalanceSheet(rows){
 const hi=findHeader(rows);if(hi==null)return [[], 'intestazione non riconosciuta'];
 const H=effectiveHeaders(rows,hi),namec=colExact(H,'NOMINATIVO','CONDOMINO'),intc=colExact(H,'INT','INT.','INTERNO'),scalac=colExact(H,'SCALA'),pianoc=colExact(H,'P','PIANO'),totaldue=colContains(H,'TOTALE ANNUO DA INCASSARE','TOTALE PERIODO DA INCASSARE','TOTALE DA INCASSARE'),balancec=colContains(H,'TOTALE ANNUO ANCORA DA INCASSARE','TOTALE PERIODO ANCORA DA INCASSARE','ANCORA DA INCASSARE','DA INCASSARE','SALDO','RESIDUO'),duec=colContains(H,'CONGUAGLIO','IMPORTO','DA VERSARE','RATA','TAB. A'),paidc=colExact(H,'PAGATO','VERSATO','INCASSATO'),reimbc=colExact(H,'RIMBORSATO'),mcols=monthCols(H),allPeople=[],out=[];let unresolved=false;
 rows.slice(hi+1).forEach((r,offset)=>{const person=String(val(r,namec)??'').trim();if(!person||nrm(person).startsWith('TOTALE')||nrm(person).startsWith('SCALA'))return;const base={nominativo:person,interno:String(val(r,intc)??''),scala:String(val(r,scalac)??''),piano:String(val(r,pianoc)??''),_position:allPeople.length,_row:hi+1+offset};allPeople.push(base);const raw=val(r,balancec);let bal;if(balancec!=null&&!(typeof raw==='string'&&raw.includes('#')))bal=num(raw);else{const due=num(val(r,totaldue))||num(val(r,duec)),paid=num(val(r,paidc))+mcols.reduce((s,[c])=>s+num(val(r,c)),0),reimb=num(val(r,reimbc));if(due===0){unresolved=true;return}bal=due-paid+reimb}if(Math.abs(bal)>.01)out.push({...base,importo:round2(bal)});});
 out.forEach(rec=>{const i=rec._position;rec._prevName=i>0?allPeople[i-1].nominativo:'';rec._nextName=i<allPeople.length-1?allPeople[i+1].nominativo:'';});
 return [out,unresolved?'formula/struttura ricalcolata':null]
}
function workbookSheets(wb){const sheets={};for(const name of wb.SheetNames||[])sheets[name]=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null,raw:true});return sheets}
function analyzeV6(wb,fileName){
 const sheets=workbookSheets(wb),[condo0,period,dates,frontKey]=frontInfo(sheets),inc=Object.keys(sheets).find(s=>nrm(s).startsWith('INCASSI '))||Object.keys(sheets).find(s=>nrm(s).includes('INCASSI'));
 if(!inc)throw new Error('Non trovo un foglio Incassi nel bilancio. Fogli presenti: '+Object.keys(sheets).join(' | '));
 const [ordinary,warns]=parseOrdinary(sheets[inc]);if(!Object.keys(ordinary).length)throw new Error('Il foglio '+inc+' è stato trovato ma non riesco a riconoscere l’intestazione delle quote.');
 const people={},ordinaryMeta={};
 const ensure=p=>people[p]||(people[p]={ordinario:0,rate_scoperte:[],conguaglio:0,spese_individuali:0,straordinari:[],crediti:[]});
 for(const [p,d] of Object.entries(ordinary)){Object.assign(ensure(p),{ordinario:d.ordinario,rate_scoperte:d.rate_scoperte,spese_individuali:d.spese_individuali});ordinaryMeta[p]=d;if(d.credito>.01)ensure(p).crediti.push({label:'Eccedenza / credito da incassi ordinari',amount:d.credito})}
 const ordinaryOrder=Object.entries(ordinaryMeta).sort((a,b)=>a[1]._position-b[1]._position).map(([name,meta])=>({name,...meta}));
 const exactName=(a,b)=>{const x=canonName(a),y=canonName(b);return !!(x&&y&&x===y)};
 const neighborCheck=(rec,idx)=>{
   const prevTarget=idx>0?ordinaryOrder[idx-1]:null,nextTarget=idx<ordinaryOrder.length-1?ordinaryOrder[idx+1]:null;
   const prevComparable=!!(rec._prevName&&prevTarget),nextComparable=!!(rec._nextName&&nextTarget);
   const prevOk=prevComparable&&nameCompatible(rec._prevName,prevTarget.name),nextOk=nextComparable&&nameCompatible(rec._nextName,nextTarget.name);
   const contradiction=(prevComparable&&!prevOk)||(nextComparable&&!nextOk);
   return {confirmed:prevOk||nextOk,contradiction,prevOk,nextOk};
 };
 const matchPerson=rec=>{
   const exact=ordinaryOrder.map((x,i)=>({x,i})).filter(z=>exactName(rec.nominativo,z.x.name));
   if(exact.length===1)return {name:exact[0].x.name,reason:'nominativo coincidente in modo univoco'};

   const target=ordinaryOrder[rec._position];
   if(target&&nameCompatible(rec.nominativo,target.name)){
     const ev=neighborCheck(rec,rec._position);
     if(!ev.contradiction&&ev.confirmed)return {name:target.name,reason:'nome parziale + stessa posizione + vicino sopra/sotto confermato'};
   }

   const compatible=ordinaryOrder.map((x,i)=>({x,i})).filter(z=>nameCompatible(rec.nominativo,z.x.name));
   if(compatible.length===1){
     const cand=compatible[0],ev=neighborCheck(rec,cand.i);
     if(cand.i===rec._position&&!ev.contradiction&&ev.confirmed)return {name:cand.x.name,reason:'nome parziale + stessa posizione + vicino sopra/sotto confermato'};
     if(cand.i!==rec._position)return {name:null,reason:`nome parziale compatibile ma posizione diversa (${cand.i+1} invece di ${rec._position+1})`};
     if(ev.contradiction)return {name:null,reason:'nome parziale e posizione coerenti ma vicino sopra/sotto in contraddizione'};
     return {name:null,reason:'nome parziale e posizione coerenti ma nessun vicino sopra/sotto conferma'};
   }
   if(compatible.length>1)return {name:null,reason:'nome compatibile con più condomini: associazione ambigua'};
   if(exact.length>1)return {name:null,reason:'nominativo identico presente in più unità: serve conferma di posizione/vicini'};
   return {name:null,reason:'nominativo non compatibile con il condomino nella stessa posizione'};
 };
 const unresolved=[];
 for(const [sn,rows] of Object.entries(sheets)){
   const nn=nrm(sn);if(sn===inc||IGNORE_SHEETS.some(tok=>nn.includes(tok)))continue;
   const [vals,note]=parseBalanceSheet(rows);if(note&&!vals.length)unresolved.push(`${sn}: ${note}`);
   const isCong=nn.includes('CONG')||((nn.includes('REC')||nn.includes('RECUPERO'))&&nn.includes('INCASS'));
   for(const rec of vals){
     const match=matchPerson(rec);
     if(!match.name){unresolved.push(`${sn} · riga ${rec._row+1} · ${rec.nominativo}: ${match.reason}`);continue}
     const d=ensure(match.name);
     if(rec.importo>0){if(isCong)d.conguaglio=round2(d.conguaglio+rec.importo);else d.straordinari.push({voce:sn,importo:rec.importo})}
     else if(rec.importo<0){d.crediti.push({label:(isCong?'Conguaglio / dare-avere a credito':'Credito / eccedenza – '+sn),amount:round2(-rec.importo)})}
   }
 }
 const currentPeople=[];
 for(const [p,d] of Object.entries(people)){
   const md=ordinaryMeta[p]||{},items=[];
   (d.rate_scoperte||[]).forEach(r=>items.push({type:'ordinary',label:r.mese,amount:round2(r.importo),selected:true}));
   if(d.conguaglio>.01)items.push({type:'cong',label:'Conguaglio a debito',amount:round2(d.conguaglio),selected:true});
   if(d.spese_individuali>.01)items.push({type:'extra',label:'Spese individuali',amount:round2(d.spese_individuali),selected:true});
   (d.straordinari||[]).forEach(s=>items.push({type:'extra',label:s.voce,amount:round2(s.importo),selected:true}));
   const gross=round2(items.reduce((s,x)=>s+x.amount,0));
   const credits=(d.crediti||[]).filter(c=>c.amount>.01).map(c=>({label:c.label,amount:round2(c.amount),selected:false}));
   const personConflicts=unresolved.filter(x=>x.includes(`· ${p}:`)||x.includes(`(${p})`));
   if(gross>.01||credits.length)currentPeople.push({name:p,scala:md.scala||'',piano:md.piano||'',interno:md.interno||'',phone:'',email:'',items,credits,conflicts:personConflicts,recipientAddress:'',_v6:{gross,period,dates,inc,warnings:warns,unresolved}})
 }
 currentPeople.sort((a,b)=>String(a.scala).localeCompare(String(b.scala),'it',{numeric:true})||String(a.interno).localeCompare(String(b.interno),'it',{numeric:true})||a.name.localeCompare(b.name,'it'));
 currentPeople.forEach((p,i)=>p.id=i);
 return{title:condo0||fileName.replace(/\.(xlsx|xlsm|xls)$/i,''),people:currentPeople,frontKey,warnings:warns,unresolved}
}
async function parseFileV6(file){loader.classList.remove('hidden');results.classList.add('hidden');try{const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array',cellDates:true,cellFormula:true}),r=analyzeV6(wb,file.name);current=r.people;if(r.frontKey&&r.frontKey!=='Frotespizio'&&!wb.Sheets.Frotespizio){wb.Sheets.Frotespizio=wb.Sheets[r.frontKey];wb.SheetNames.push('Frotespizio')}if(!r.frontKey){const ws=XLSX.utils.aoa_to_sheet([[r.title]]);wb.Sheets.Frotespizio=ws;wb.SheetNames.push('Frotespizio')}render(file.name,wb);building.textContent=r.title;source.textContent='Motore V6 · '+file.name+(r.unresolved.length?' · '+r.unresolved.length+' associazioni/schede da verificare':'');const v=document.querySelector('#results .card .muted');if(v&&v.textContent.includes('V2.8'))v.textContent='Motore contabile V6 · lettura Incassi e singole schede · associazione conguagli verificata per nome/posizione/vicini';if(r.unresolved.length)console.warn('Associazioni/schede da verificare V6:',r.unresolved)}catch(e){console.error(e);alert('Non riesco a leggere il file con il motore V6: '+e.message)}finally{loader.classList.add('hidden')}}
window.condoAnalyzeV6=analyzeV6;
parseFile=parseFileV6;
})();

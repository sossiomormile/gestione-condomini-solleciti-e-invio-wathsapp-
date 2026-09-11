(()=>{
'use strict';
if(typeof window.condoAnalyzeV6!=='function'||typeof XLSX==='undefined')return;
const baseAnalyze=window.condoAnalyzeV6;
const nrm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const MONTH_NUM={GENNAIO:1,FEBBRAIO:2,MARZO:3,APRILE:4,MAGGIO:5,GIUGNO:6,LUGLIO:7,AGOSTO:8,SETTEMBRE:9,OTTOBRE:10,NOVEMBRE:11,DICEMBRE:12};
function sanitizeWorkbook(wb){
  const clone={...wb,Sheets:{...wb.Sheets}};
  for(const [name,ws0] of Object.entries(wb.Sheets||{})){
    if(nrm(name).includes('INCASSI')) continue;
    const ws={...ws0};
    let firstHeaderSeen=false;
    let changed=false;
    const ref=ws['!ref'];
    if(!ref){clone.Sheets[name]=ws;continue}
    const range=XLSX.utils.decode_range(ref);
    for(let r=range.s.r;r<=range.e.r;r++){
      const addr=XLSX.utils.encode_cell({r,c:0});
      const v=ws0[addr]?.v;
      const nv=nrm(v);
      if(nv==='CONDOMINO'||nv==='NOMINATIVO'){
        if(!firstHeaderSeen){firstHeaderSeen=true;continue}
        delete ws[addr];
        changed=true;
      }
    }
    clone.Sheets[name]=changed?ws:ws0;
  }
  return clone;
}
function exerciseStartYear(result){
  const inc=result?.people?.find(p=>p?._v6?.inc)?._v6?.inc||'';
  const m=String(inc).match(/(20\d{2})\s*[-/]\s*(?:20)?\d{2}/);
  return m?Number(m[1]):null;
}
function removeFutureOrdinary(result){
  const startYear=exerciseStartYear(result);
  if(!startYear)return result;
  const now=new Date(),cy=now.getFullYear(),cm=now.getMonth()+1;
  for(const p of result.people||[]){
    p.items=(p.items||[]).filter(item=>{
      if(item.type!=='ordinary')return true;
      const mn=MONTH_NUM[nrm(item.label)];
      if(!mn)return true;
      const y=mn>=6?startYear:startYear+1;
      return y<cy||(y===cy&&mn<=cm);
    });
    if(p._v6)p._v6.gross=Math.round((p.items||[]).reduce((s,x)=>s+(Number(x.amount)||0),0)*100)/100;
  }
  return result;
}
function analyzePatched(wb,fileName){
  return removeFutureOrdinary(baseAnalyze(sanitizeWorkbook(wb),fileName));
}
window.condoAnalyzeV6=analyzePatched;
window.condoAnalyzeAssociationFixV2={sanitizeWorkbook,analyzePatched,removeFutureOrdinary};
parseFile=async function(file){
  loader.classList.remove('hidden');results.classList.add('hidden');
  try{
    const data=await file.arrayBuffer();
    const wb=XLSX.read(data,{type:'array',cellDates:true,cellFormula:true});
    const r=analyzePatched(wb,file.name);
    current=r.people;
    if(r.frontKey&&r.frontKey!=='Frotespizio'&&!wb.Sheets.Frotespizio){wb.Sheets.Frotespizio=wb.Sheets[r.frontKey];wb.SheetNames.push('Frotespizio')}
    if(!r.frontKey){const ws=XLSX.utils.aoa_to_sheet([[r.title]]);wb.Sheets.Frotespizio=ws;wb.SheetNames.push('Frotespizio')}
    render(file.name,wb);
    building.textContent=r.title;
    source.textContent='Motore V7 · associazione conguagli verificata · '+file.name+(r.unresolved.length?' · '+r.unresolved.length+' casi da verificare':'');
    const v=document.querySelector('#results .card .muted');
    if(v&&(v.textContent.includes('V2.8')||v.textContent.includes('Motore contabile V6')))v.textContent='Motore V7 · nome compatibile + stessa posizione + vicino sopra/sotto + nessuna contraddizione';
    if(r.unresolved.length)console.warn('Casi da verificare V7:',r.unresolved);
  }catch(e){
    console.error(e);alert('Non riesco a leggere il file con il motore V7: '+e.message);
  }finally{loader.classList.add('hidden')}
};
})();
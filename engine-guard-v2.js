(()=>{
'use strict';
const REFRESH_MARK='condo_guard_v3_refresh_done';
try{if(localStorage.getItem(REFRESH_MARK)!=='1'){localStorage.removeItem('condo_drive_sync_state_v7');localStorage.setItem(REFRESH_MARK,'1')}}catch(e){}
const base=window.condoAnalyzeV7;
if(typeof base!=='function')return;
const BAD=/\bPREVENTIVO\b|\bRIPARTO PREVENTIVO\b/i;
function cleanResult(r){
  for(const p of r.people||[]){
    const technical=(p.conflicts||[]).some(x=>/voce tecnica\/parte comune/i.test(String(x)));
    if(technical){p.items=[];p.credits=[]}
    else{
      p.items=(p.items||[]).filter(x=>!(x.type==='extra'&&BAD.test(String(x.label||''))));
      p.credits=(p.credits||[]).filter(x=>!BAD.test(String(x.label||'')));
    }
    if(p._v7)p._v7.gross=Math.round((p.items||[]).reduce((s,x)=>s+(x.amount>0?x.amount:0),0)*100)/100;
  }
  return r;
}
window.condoAnalyzeGuarded=(wb,fileName)=>cleanResult(base(wb,fileName));
async function parseFileGuarded(file){
  loader.classList.remove('hidden');results.classList.add('hidden');
  try{
    const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array',cellDates:true,cellFormula:true}),r=window.condoAnalyzeGuarded(wb,file.name);
    current=r.people;
    if(!wb.Sheets.Frotespizio){
      const front=(wb.SheetNames||[]).find(s=>/FRO?NT?ESPIZIO/i.test(s));
      if(front)wb.Sheets.Frotespizio=wb.Sheets[front];else wb.Sheets.Frotespizio=XLSX.utils.aoa_to_sheet([[r.title]]);
      if(!wb.SheetNames.includes('Frotespizio'))wb.SheetNames.push('Frotespizio');
    }
    render(file.name,wb);building.textContent=r.title;
    source.textContent='Motore V7 validato · '+r.blocks+' blocchi Incassi · RATA solo da Incassi · solo rate scadute';
    const v=document.querySelector('#results .card .muted');
    if(v)v.textContent=(r.warnings.length?r.warnings.join(' ')+' · ':'')+'Ordine Excel preservato · preventivi/riparti esclusi · righe tecniche escluse dai solleciti · RATA Incassi contro versato dello stesso mese · dati ambigui = DA VERIFICARE';
  }catch(e){console.error(e);alert('Controllo bilancio: '+e.message);throw e}
  finally{loader.classList.add('hidden')}
}
parseFile=parseFileGuarded;
})();

(()=>{
'use strict';
const REFRESH_MARK='condo_guard_v5_refresh_done';
try{
  if(localStorage.getItem(REFRESH_MARK)!=='1'){
    localStorage.removeItem('condo_drive_sync_state_v7');
    localStorage.setItem(REFRESH_MARK,'1');
  }
  const raw=localStorage.getItem('condo_archive_v5');
  if(raw){
    const a=JSON.parse(raw);
    let changed=false;
    for(const rec of Object.values(a?.condomini||{}))for(const p of rec?.people||[]){
      const old=Array.isArray(p.conflicts)?p.conflicts:[];
      const clean=old.filter(x=>typeof x==='string');
      if(clean.length!==old.length){p.conflicts=clean;changed=true}
    }
    if(changed)localStorage.setItem('condo_archive_v5',JSON.stringify(a));
  }
}catch(e){}
const base=window.condoAnalyzeV7;
if(typeof base!=='function')return;
const BAD=/\bPREVENTIVO\b|\bRIPARTO PREVENTIVO\b/i;
const N=x=>String(x??'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
const V=x=>{if(typeof x==='number'&&Number.isFinite(x))return x;let s=String(x??'').trim();if(!s)return 0;if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');const n=parseFloat(s);return Number.isFinite(n)?n:0};
const R=x=>Math.round((Number(x)||0)*100)/100;
function rowsOf(wb,sn){return XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:null,raw:true})}
function supplementPreviousConguagli(wb,r){
  for(const sn of wb.SheetNames||[]){
    if(!/(REC.*INCASS.*PRECED|CONG.*PRECED|PRECED.*CONG)/i.test(N(sn)))continue;
    const rows=rowsOf(wb,sn);let hi=-1;
    for(let i=0;i<rows.length;i++){const h=(rows[i]||[]).map(N);if((h.includes('CONDOMINO')||h.includes('NOMINATIVO'))&&h.some(x=>x.includes('DA INCASSARE')||x==='SALDO')){hi=i;break}}
    if(hi<0)continue;
    const H=(rows[hi]||[]).map(N),nc=Math.max(H.indexOf('CONDOMINO'),H.indexOf('NOMINATIVO')),pc=H.indexOf('P'),ic=Math.max(H.indexOf('INT'),H.indexOf('INT.'),H.indexOf('INTERNO')),sc=Math.max(H.indexOf('SCALA'),H.indexOf('SC')),bc=H.findIndex(x=>x.includes('DA INCASSARE')||x==='SALDO');
    if(nc<0||bc<0)continue;
    for(let j=hi+1;j<rows.length;j++){
      const row=rows[j]||[],name=String(row[nc]??'').trim();if(!name||/^TOTALE/i.test(name))continue;
      const bal=R(V(row[bc]));if(Math.abs(bal)<=.01)continue;
      let cand=(r.people||[]).filter(p=>N(p.name)===N(name));
      if(cand.length!==1&&pc>=0&&ic>=0){const pk=N(row[pc]),ik=N(row[ic]),sk=sc>=0?N(row[sc]):'';cand=(r.people||[]).filter(p=>N(p.piano)===pk&&N(p.interno)===ik&&(!sk||N(p.scala)===sk))}
      if(cand.length!==1)continue;
      const p=cand[0],already=(p.items||[]).some(x=>x.type==='cong')||(p.credits||[]).some(x=>/CONGUAGLIO/i.test(String(x.label||'')));
      if(already)continue;
      if(bal>0)(p.items||(p.items=[])).push({type:'cong',label:'Conguaglio a debito',amount:bal,selected:false});
      else (p.credits||(p.credits=[])).push({label:'Conguaglio / dare-avere a credito',amount:R(-bal),selected:false});
    }
  }
  return r;
}
function cleanResult(r){
  for(const p of r.people||[]){
    p.conflicts=(Array.isArray(p.conflicts)?p.conflicts:[]).filter(x=>typeof x==='string');
    const technical=p.conflicts.some(x=>/voce tecnica\/parte comune/i.test(String(x)));
    if(technical){p.items=[];p.credits=[]}
    else{
      p.items=(p.items||[]).filter(x=>!(x.type==='extra'&&BAD.test(String(x.label||''))));
      p.credits=(p.credits||[]).filter(x=>!BAD.test(String(x.label||'')));
    }
    if(p._v7)p._v7.gross=R((p.items||[]).reduce((s,x)=>s+(x.amount>0?x.amount:0),0));
  }
  return r;
}
window.condoAnalyzeGuarded=(wb,fileName)=>cleanResult(supplementPreviousConguagli(wb,base(wb,fileName)));
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
    if(v)v.textContent=(r.warnings.length?r.warnings.join(' ')+' · ':'')+'Ordine Excel preservato · conguagli recuperati anche per piano/interno · preventivi/riparti esclusi · vecchi falsi DA VERIFICARE rimossi · dati ambigui reali = DA VERIFICARE';
  }catch(e){console.error(e);alert('Controllo bilancio: '+e.message);throw e}
  finally{loader.classList.add('hidden')}
}
parseFile=parseFileGuarded;
})();

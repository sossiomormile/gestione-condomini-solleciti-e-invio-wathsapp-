(()=>{
'use strict';
const REFRESH_MARK='condo_phase_ordinary_cong_v1_done';
try{
  if(localStorage.getItem(REFRESH_MARK)!=='1'){
    localStorage.removeItem('condo_drive_sync_state_v7');
    const raw=localStorage.getItem('condo_archive_v5');
    if(raw){
      const a=JSON.parse(raw);
      for(const rec of Object.values(a?.condomini||{}))for(const p of rec?.people||[]){
        p.conflicts=[];
        p.items=(p.items||[]).filter(x=>x?.type==='ordinary'||x?.type==='cong');
        p.credits=(p.credits||[]).filter(x=>/CONGUAGLIO|DARE[- /]?AVERE/i.test(String(x?.label||'')));
      }
      localStorage.setItem('condo_archive_v5',JSON.stringify(a));
    }
    localStorage.setItem(REFRESH_MARK,'1');
  }
}catch(e){}
const base=window.condoAnalyzeV7;
if(typeof base!=='function')return;
const N=x=>String(x??'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
const V=x=>{if(typeof x==='number'&&Number.isFinite(x))return x;let s=String(x??'').trim();if(!s)return 0;if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');const n=parseFloat(s);return Number.isFinite(n)?n:0};
const R=x=>Math.round((Number(x)||0)*100)/100;
function rowsOf(wb,sn){return XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:null,raw:true})}
function isCongSheet(sn){const s=N(sn);return /CONG/.test(s)||(/REC/.test(s)&&/INCASS/.test(s)&&/PRECED/.test(s))||(/PRECED/.test(s)&&/INCASS/.test(s));}
function findHeader(rows){for(let i=0;i<rows.length;i++){const h=(rows[i]||[]).map(N);if((h.includes('CONDOMINO')||h.includes('NOMINATIVO'))&&h.some(x=>x.includes('DA INCASSARE')||x==='SALDO'))return i}return-1}
function uniquePersonByName(people,name){const a=people.filter(p=>N(p.name)===N(name));return a.length===1?a[0]:null}
function uniquePersonByUnit(people,piano,interno,scala){const pk=N(piano),ik=N(interno),sk=N(scala);if(!ik)return null;let a=people.filter(p=>N(p.piano)===pk&&N(p.interno)===ik);if(sk){const b=a.filter(p=>N(p.scala)===sk);if(b.length===1)return b[0]}
return a.length===1?a[0]:null}
function supplementConguagli(wb,r){
  for(const sn of wb.SheetNames||[]){
    if(!isCongSheet(sn))continue;
    const rows=rowsOf(wb,sn),hi=findHeader(rows);if(hi<0)continue;
    const H=(rows[hi]||[]).map(N),nc=Math.max(H.indexOf('CONDOMINO'),H.indexOf('NOMINATIVO')),pc=H.indexOf('P'),ic=Math.max(H.indexOf('INT'),H.indexOf('INT.'),H.indexOf('INTERNO')),sc=Math.max(H.indexOf('SCALA'),H.indexOf('SC')),bc=H.findIndex(x=>x.includes('DA INCASSARE')||x==='SALDO');
    if(nc<0||bc<0)continue;
    const entries=[];
    for(let j=hi+1;j<rows.length;j++){
      const row=rows[j]||[],name=String(row[nc]??'').trim();
      if(!name||/^TOTALE/i.test(name))continue;
      const bal=R(V(row[bc]));
      entries.push({row,name,bal,piano:pc>=0?row[pc]:'',interno:ic>=0?row[ic]:'',scala:sc>=0?row[sc]:''});
    }
    for(let i=0;i<entries.length;i++){
      const e=entries[i];if(Math.abs(e.bal)<=.01)continue;
      let p=uniquePersonByName(r.people||[],e.name)||uniquePersonByUnit(r.people||[],e.piano,e.interno,e.scala);
      if(!p&&entries.length===(r.people||[]).length)p=(r.people||[])[i]||null;
      if(!p)continue;
      const hasDebit=(p.items||[]).some(x=>x.type==='cong'),hasCredit=(p.credits||[]).some(x=>/CONGUAGLIO|DARE[- /]?AVERE/i.test(String(x.label||'')));
      if(e.bal>0&&!hasDebit)(p.items||(p.items=[])).push({type:'cong',label:'Conguaglio a debito',amount:e.bal,selected:false});
      if(e.bal<0&&!hasCredit)(p.credits||(p.credits=[])).push({label:'Conguaglio / dare-avere a credito',amount:R(-e.bal),selected:false});
    }
  }
  return r;
}
function cleanResult(r){
  for(const p of r.people||[]){
    p.items=(p.items||[]).filter(x=>x?.type==='ordinary'||x?.type==='cong').map(x=>({...x,selected:false}));
    p.credits=(p.credits||[]).filter(x=>/CONGUAGLIO|DARE[- /]?AVERE/i.test(String(x?.label||''))).map(x=>({...x,selected:false}));
    p.conflicts=(Array.isArray(p.conflicts)?p.conflicts:[]).filter(x=>typeof x==='string'&&(/ESERCIZIO CONTABILE|COLONNA RATA/i.test(x)));
    if(p._v7)p._v7.gross=R(p.items.reduce((s,x)=>s+(x.amount>0?x.amount:0),0));
  }
  return r;
}
window.condoAnalyzeGuarded=(wb,fileName)=>cleanResult(supplementConguagli(wb,base(wb,fileName)));
async function parseFileGuarded(file){
  loader.classList.remove('hidden');results.classList.add('hidden');
  try{
    const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array',cellDates:true,cellFormula:true}),r=window.condoAnalyzeGuarded(wb,file.name);
    current=r.people;
    if(!wb.Sheets.Frotespizio){const front=(wb.SheetNames||[]).find(s=>/FRO?NT?ESPIZIO/i.test(s));if(front)wb.Sheets.Frotespizio=wb.Sheets[front];else wb.Sheets.Frotespizio=XLSX.utils.aoa_to_sheet([[r.title]]);if(!wb.SheetNames.includes('Frotespizio'))wb.SheetNames.push('Frotespizio')}
    render(file.name,wb);building.textContent=r.title;
    source.textContent='Motore V7 · solo rate ordinarie e conguagli · rate future escluse';
    const v=document.querySelector('#results .card .muted');if(v)v.textContent='Fase attuale: rate ordinarie da Incassi + conguagli. Spese straordinarie e spese individuali escluse. Conguagli abbinati per nome, piano/interno o riga quando strutturalmente possibile.';
  }catch(e){console.error(e);alert('Controllo bilancio: '+e.message);throw e}
  finally{loader.classList.add('hidden')}
}
parseFile=parseFileGuarded;
})();

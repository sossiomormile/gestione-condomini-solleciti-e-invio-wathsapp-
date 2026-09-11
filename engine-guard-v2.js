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
function findHeaders(rows){const out=[];for(let i=0;i<rows.length;i++){const h=(rows[i]||[]).map(N);if((h.includes('CONDOMINO')||h.includes('NOMINATIVO'))&&h.some(x=>x.includes('DA INCASSARE')||x==='SALDO'))out.push(i)}return out}
function col(H,...names){for(const n of names){const i=H.indexOf(N(n));if(i>=0)return i}return-1}
function uniqueIndexByName(target,name){const k=N(name);if(!k)return-1;const a=[];for(let i=0;i<target.length;i++)if(N(target[i]?.name)===k)a.push(i);return a.length===1?a[0]:-1}
function uniqueIndexByUnit(target,e){const ik=N(e?.interno),pk=N(e?.piano),sk=N(e?.scala);if(!ik)return-1;const a=[];for(let i=0;i<target.length;i++){const p=target[i];if(N(p?.interno)!==ik)continue;if(pk&&N(p?.piano)!==pk)continue;if(sk&&N(p?.scala)&&N(p?.scala)!==sk)continue;a.push(i)}return a.length===1?a[0]:-1}
function evidenceFor(e,target){return{ni:uniqueIndexByName(target,e.name),ui:uniqueIndexByUnit(target,e)}}
function isAnchor(ev,pos){return ev.ni===pos}
function structuralMap(entries,target){const ev=entries.map(e=>evidenceFor(e,target));let contradiction=false;for(let i=0;i<ev.length;i++){const x=ev[i];if(x.ui>=0&&x.ui!==i)contradiction=true;else if(x.ui<0&&x.ni>=0&&x.ni!==i)contradiction=true;if(x.ui>=0&&x.ni>=0&&x.ui!==x.ni&&x.ui!==i)contradiction=true}return{ev,contradiction,countEqual:entries.length===target.length,anchors:ev.map((x,i)=>isAnchor(x,i)?i:-1).filter(i=>i>=0)}}
function neighborCheck(i,map,unitSameRow){if(!map||!map.countEqual||map.contradiction)return{ok:false,method:''};const before=map.anchors.filter(x=>x<i),after=map.anchors.filter(x=>x>i);if(before.length&&after.length)return{ok:true,method:'riga confermata da nominativi esatti prima e dopo'};if(unitSameRow&&before.length>=2){const b=before.slice(-2);if(i-b[0]<=4)return{ok:true,method:'piano/interno + due nominativi esatti precedenti vicini'}}if(unitSameRow&&after.length>=2){const a=after.slice(0,2);if(a[1]-i<=4)return{ok:true,method:'piano/interno + due nominativi esatti successivi vicini'}}return{ok:false,method:''}}
function resolveEntry(e,i,target,map){if(!target.length)return{idx:-1,method:'',conflict:false};const ev=evidenceFor(e,target);if(ev.ni>=0)return{idx:ev.ni,method:'nome esatto da Incassi',conflict:false};if(ev.ui>=0&&ev.ui!==i)return{idx:-1,method:'',conflict:true};const chk=neighborCheck(i,map,ev.ui===i);if(chk.ok)return{idx:i,method:chk.method,conflict:false};return{idx:-1,method:'',conflict:false}}
function supplementConguagli(wb,r){
  const allPeople=r.people||[],maxBlock=Math.max(0,...allPeople.map(p=>Number(p?._v7?.block)||0));
  for(const sn of wb.SheetNames||[]){
    if(!isCongSheet(sn))continue;
    const rows=rowsOf(wb,sn),hs=findHeaders(rows);if(!hs.length)continue;
    for(let z=0;z<hs.length;z++){
      const hi=hs[z],end=z+1<hs.length?hs[z+1]:rows.length;
      const H=(rows[hi]||[]).map(N),nc=Math.max(H.indexOf('CONDOMINO'),H.indexOf('NOMINATIVO')),pc=col(H,'P','PIANO'),ic=col(H,'INT','INT.','INTERNO'),sc=col(H,'SCALA','SC'),bc=H.findIndex(x=>x.includes('DA INCASSARE')||x==='SALDO');
      if(nc<0||bc<0)continue;
      const entries=[];
      for(let j=hi+1;j<end;j++){
        const row=rows[j]||[],name=String(row[nc]??'').trim();
        if(!name||/^TOTALE/i.test(name))continue;
        const bal=R(V(row[bc]));
        entries.push({row,name,bal,piano:pc>=0?row[pc]:'',interno:ic>=0?row[ic]:'',scala:sc>=0?row[sc]:''});
      }
      const blockAware=hs.length===maxBlock&&maxBlock>1;
      const target=blockAware?allPeople.filter(p=>(Number(p?._v7?.block)||0)===z+1):(hs.length===1&&maxBlock===1?allPeople:[]);
      const map=target.length?structuralMap(entries,target):null,used=new Set();
      for(let i=0;i<entries.length;i++){
        const e=entries[i];if(Math.abs(e.bal)<=.01)continue;
        let p=null;
        if(target.length){const rr=resolveEntry(e,i,target,map);if(rr.conflict)continue;if(rr.idx>=0)p=target[rr.idx]}
        else{const ni=uniqueIndexByName(allPeople,e.name);if(ni>=0)p=allPeople[ni]}
        if(!p||used.has(p))continue;
        used.add(p);
        const hasDebit=(p.items||[]).some(x=>x.type==='cong'),hasCredit=(p.credits||[]).some(x=>/CONGUAGLIO|DARE[- /]?AVERE/i.test(String(x.label||'')));
        if(e.bal>0&&!hasDebit)(p.items||(p.items=[])).push({type:'cong',label:'Conguaglio a debito',amount:e.bal,selected:false});
        if(e.bal<0&&!hasCredit)(p.credits||(p.credits=[])).push({label:'Conguaglio / dare-avere a credito',amount:R(-e.bal),selected:false});
      }
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
    const v=document.querySelector('#results .card .muted');if(v)v.textContent='Fase attuale: rate ordinarie da Incassi + conguagli. Incassi resta l’anagrafica ufficiale; i nominativi diversi vengono associati solo con struttura coerente e conferme nominali vicine. In dubbio nessuna attribuzione automatica.';
  }catch(e){console.error(e);alert('Controllo bilancio: '+e.message);throw e}
  finally{loader.classList.add('hidden')}
}
parseFile=parseFileGuarded;
})();

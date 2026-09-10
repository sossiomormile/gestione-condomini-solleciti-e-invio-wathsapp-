(()=>{
'use strict';
const REFRESH_MARK='condo_phase_ordinary_cong_neighbor_v1_done';
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
function uniqueIndexByName(people,name){const k=N(name);if(!k)return-1;const a=[];for(let i=0;i<people.length;i++)if(N(people[i]?.name)===k)a.push(i);return a.length===1?a[0]:-1}
function uniqueIndexByUnit(people,e){const ik=N(e?.interno),pk=N(e?.piano),sk=N(e?.scala);if(!ik)return-1;const a=[];for(let i=0;i<people.length;i++){const p=people[i];if(N(p?.interno)!==ik)continue;if(pk&&N(p?.piano)!==pk)continue;if(sk&&N(p?.scala)!==sk)continue;a.push(i)}return a.length===1?a[0]:-1}
function evidenceFor(e,target){const ni=uniqueIndexByName(target,e.name),ui=uniqueIndexByUnit(target,e);return{ni,ui,conflict:ni>=0&&ui>=0&&ni!==ui}}
function isAnchor(ev,pos){return !ev.conflict&&((ev.ni===pos)||(ev.ui===pos))}
function structuralMap(entries,target){const ev=entries.map(e=>evidenceFor(e,target));let contradiction=false;for(let i=0;i<ev.length;i++){const x=ev[i];if(x.conflict)contradiction=true;if(x.ni>=0&&x.ni!==i)contradiction=true;if(x.ui>=0&&x.ui!==i)contradiction=true}return{ev,contradiction,countEqual:entries.length===target.length}}
function rowByNeighbors(i,entries,target,map){if(!map.countEqual||map.contradiction||i<0||i>=target.length)return-1;const cur=map.ev[i];if(cur.conflict)return-1;if(cur.ui===i)return i;let above=-1,below=-1;for(let j=i-1;j>=0;j--)if(isAnchor(map.ev[j],j)){above=j;break}for(let j=i+1;j<entries.length;j++)if(isAnchor(map.ev[j],j)){below=j;break}if(above<0||below<0)return-1;return i}
function existingCong(p){return (p.items||[]).some(x=>x.type==='cong')||(p.credits||[]).some(x=>/CONGUAGLIO|DARE[- /]?AVERE/i.test(String(x.label||'')))}
function supplementConguagli(wb,r){
  r.warnings=Array.isArray(r.warnings)?r.warnings:[];
  const allPeople=r.people||[],maxBlock=Math.max(0,...allPeople.map(p=>Number(p?._v7?.block)||0));
  for(const sn of wb.SheetNames||[]){
    if(!isCongSheet(sn))continue;
    const rows=rowsOf(wb,sn),hs=findHeaders(rows);if(!hs.length)continue;
    for(let z=0;z<hs.length;z++){
      const hi=hs[z],end=z+1<hs.length?hs[z+1]:rows.length,H=(rows[hi]||[]).map(N),nc=Math.max(H.indexOf('CONDOMINO'),H.indexOf('NOMINATIVO')),pc=H.indexOf('P'),ic=Math.max(H.indexOf('INT'),H.indexOf('INT.'),H.indexOf('INTERNO')),sc=Math.max(H.indexOf('SCALA'),H.indexOf('SC')),bc=H.findIndex(x=>x.includes('DA INCASSARE')||x==='SALDO');
      if(nc<0||bc<0)continue;
      const entries=[];
      for(let j=hi+1;j<end;j++){const row=rows[j]||[],name=String(row[nc]??'').trim();if(!name||/^TOTALE/i.test(name))continue;entries.push({row,name,bal:R(V(row[bc])),piano:pc>=0?row[pc]:'',interno:ic>=0?row[ic]:'',scala:sc>=0?row[sc]:'',sheetRow:j+1})}
      const blockAware=hs.length===maxBlock&&maxBlock>1;
      const target=blockAware?allPeople.filter(p=>(Number(p?._v7?.block)||0)===z+1):(hs.length===1?allPeople:[]);
      const map=target.length?structuralMap(entries,target):null;
      const used=new Set();let unresolved=0,ambiguous=0;
      for(let i=0;i<entries.length;i++){
        const e=entries[i];if(Math.abs(e.bal)<=.01)continue;
        let p=null,method='';const nameIdx=uniqueIndexByName(allPeople,e.name),unitIdx=uniqueIndexByUnit(allPeople,e);
        if(nameIdx>=0&&unitIdx>=0&&nameIdx!==unitIdx){ambiguous++;continue}
        if(nameIdx>=0){p=allPeople[nameIdx];method='nome esatto'}
        else if(unitIdx>=0){p=allPeople[unitIdx];method='piano/interno univoci'}
        else if(target.length&&map){const ri=rowByNeighbors(i,entries,target,map);if(ri>=0){p=target[ri];method='riga confermata da condomini sopra e sotto'}}
        if(!p||used.has(p)){unresolved++;continue}
        used.add(p);if(existingCong(p))continue;
        if(e.bal>0)(p.items||(p.items=[])).push({type:'cong',label:'Conguaglio a debito',amount:e.bal,selected:false});
        else (p.credits||(p.credits=[])).push({label:'Conguaglio / dare-avere a credito',amount:R(-e.bal),selected:false});
        p._v7=p._v7||{};p._v7.conguaglioMatched=p._v7.conguaglioMatched||[];p._v7.conguaglioMatched.push(sn+' riga '+e.sheetRow+' → '+method);
      }
      if(ambiguous)r.warnings.push('DA VERIFICARE: '+ambiguous+' conguaglio/i in '+sn+' presenta/no dati identificativi in conflitto; nessun addebito automatico.');
      if(unresolved)r.warnings.push('DA VERIFICARE: '+unresolved+' conguaglio/i in '+sn+' non ha/hanno una corrispondenza dimostrabile; nessun addebito automatico.');
      if(target.length&&map&&!map.countEqual)r.warnings.push('Controllo '+sn+': numero righe diverso da Incassi; abbinamento per riga disabilitato.');
      if(target.length&&map&&map.contradiction)r.warnings.push('Controllo '+sn+': ordine righe non coerente con Incassi; abbinamento per riga disabilitato.');
    }
  }
  r.warnings=[...new Set(r.warnings)];return r;
}
function cleanResult(r){for(const p of r.people||[]){p.items=(p.items||[]).filter(x=>x?.type==='ordinary'||x?.type==='cong').map(x=>({...x,selected:false}));p.credits=(p.credits||[]).filter(x=>/CONGUAGLIO|DARE[- /]?AVERE/i.test(String(x?.label||''))).map(x=>({...x,selected:false}));p.conflicts=(Array.isArray(p.conflicts)?p.conflicts:[]).filter(x=>typeof x==='string'&&(/ESERCIZIO CONTABILE|COLONNA RATA/i.test(x)));if(p._v7)p._v7.gross=R(p.items.reduce((s,x)=>s+(x.amount>0?x.amount:0),0))}return r}
window.condoAnalyzeGuarded=(wb,fileName)=>cleanResult(supplementConguagli(wb,base(wb,fileName)));
async function parseFileGuarded(file){loader.classList.remove('hidden');results.classList.add('hidden');try{const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array',cellDates:true,cellFormula:true}),r=window.condoAnalyzeGuarded(wb,file.name);current=r.people;if(!wb.Sheets.Frotespizio){const front=(wb.SheetNames||[]).find(s=>/FRO?NT?ESPIZIO/i.test(s));if(front)wb.Sheets.Frotespizio=wb.Sheets[front];else wb.Sheets.Frotespizio=XLSX.utils.aoa_to_sheet([[r.title]]);if(!wb.SheetNames.includes('Frotespizio'))wb.SheetNames.push('Frotespizio')}render(file.name,wb);building.textContent=r.title;source.textContent='Motore V7 TEST · solo rate ordinarie e conguagli · verifica strutturale nominativi';const v=document.querySelector('#results .card .muted');if(v)v.textContent=(r.warnings.length?r.warnings.join(' ')+' · ':'')+'Conguagli: nome esatto; in alternativa piano/interno univoci; altrimenti stessa riga solo se confermata da ancoraggi sopra e sotto. Se la corrispondenza non è dimostrabile, nessun addebito automatico.'}catch(e){console.error(e);alert('Controllo bilancio: '+e.message);throw e}finally{loader.classList.add('hidden')}}
parseFile=parseFileGuarded;
})();

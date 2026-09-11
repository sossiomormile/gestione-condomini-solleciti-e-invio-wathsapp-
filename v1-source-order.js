(()=>{
'use strict';
if(typeof XLSX==='undefined'||typeof render!=='function')return;
const nrm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const canon=x=>nrm(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
const unitNorm=x=>canon(x).replace(/\s+/g,'');
const SUMMARY_LABELS=new Set([
  'ANCORA DA INCASSARE',
  'TOTALE DA INCASSARE',
  'TOTALE PERIODO DA INCASSARE',
  'TOTALE PERIODO ANCORA DA INCASSARE',
  'TOTALE ANNUO DA INCASSARE',
  'TOTALE ANNUO ANCORA DA INCASSARE'
]);
function isSummaryName(name){return SUMMARY_LABELS.has(nrm(name))}
function scaleFromRow(row){
  for(let c=0;c<Math.min(4,(row||[]).length);c++){
    const s=nrm(row[c]).replace(/["']/g,' ');
    let m=s.match(/\bSCALA\s+([A-Z0-9]+)\b/);if(m)return m[1];
    m=s.match(/\bFABBRICATO\s+([A-Z0-9]+)\b/);if(m)return m[1];
    m=s.match(/\bFABRICATO\s+([A-Z0-9]+)\b/);if(m)return m[1];
  }
  return '';
}
function col(row,...names){const hs=(row||[]).map(nrm);for(const name of names){const i=hs.indexOf(nrm(name));if(i>=0)return i}return -1}
function findIncassi(wb){return (wb.SheetNames||[]).find(s=>nrm(s).startsWith('INCASSI '))||(wb.SheetNames||[]).find(s=>nrm(s).includes('INCASSI'))||''}
function sourceUnits(wb){
  const inc=findIncassi(wb);if(!inc||!wb.Sheets?.[inc])return [];
  const rows=XLSX.utils.sheet_to_json(wb.Sheets[inc],{header:1,defval:null,raw:true});
  let scala='',header=null,seq=0;const out=[];
  for(let r=0;r<rows.length;r++){
    const row=rows[r]||[],sc=scaleFromRow(row);if(sc)scala=sc;
    const nameCol=col(row,'CONDOMINO','NOMINATIVO');
    if(nameCol>=0){header={nameCol,pianoCol:col(row,'P','PIANO'),internoCol:col(row,'INT','INT.','INTERNO'),subCol:col(row,'SUB'),scalaCol:col(row,'SCALA','S')};continue}
    if(!header)continue;
    const name=String(row[header.nameCol]??'').trim(),nn=nrm(name);
    if(!name||nn==='CONDOMINO'||nn==='NOMINATIVO'||nn.startsWith('TOTALE')||nn.startsWith('SCALA')||isSummaryName(name))continue;
    const rec={
      name,
      canon:canon(name),
      scala:String(header.scalaCol>=0?(row[header.scalaCol]??''):'').trim()||scala,
      piano:String(header.pianoCol>=0?(row[header.pianoCol]??''):'').trim(),
      interno:String(header.internoCol>=0?(row[header.internoCol]??''):'').trim(),
      sub:String(header.subCol>=0?(row[header.subCol]??''):'').trim(),
      sourceRow:r,
      sourceOrder:seq++
    };
    if(rec.canon)out.push(rec);
  }
  return out;
}
function structuralScore(p,u){
  let score=0,conflict=false;
  for(const [field,weight] of [['scala',8],['interno',8],['piano',2],['sub',4]]){
    const a=unitNorm(p?.[field]),b=unitNorm(u?.[field]);
    if(!a||!b)continue;
    if(a===b)score+=weight;else conflict=true;
  }
  return conflict?-1000:score;
}
function reorderPeople(people,wb){
  const units=sourceUnits(wb),used=new Set(),unmatched=[],filtered=[];
  (people||[]).forEach((p,originalIndex)=>{
    if(isSummaryName(p?.name))return;
    const pc=canon(p?.name),explicitRow=Number(p?._sourceRow);let chosen=null;
    if(Number.isFinite(explicitRow)){
      const exactIndex=units.findIndex((u,i)=>!used.has(i)&&u.sourceRow===explicitRow&&u.canon===pc);
      if(exactIndex>=0)chosen={i:exactIndex,u:units[exactIndex],score:1000000};
    }
    if(!chosen){
      const candidates=[];
      for(let i=0;i<units.length;i++){
        if(used.has(i)||units[i].canon!==pc)continue;
        candidates.push({i,u:units[i],score:structuralScore(p,units[i])});
      }
      candidates.sort((a,b)=>b.score-a.score||a.u.sourceOrder-b.u.sourceOrder);
      if(candidates.length)chosen=candidates[0];
    }
    if(chosen){
      used.add(chosen.i);
      if(!p.sub&&chosen.u.sub)p.sub=chosen.u.sub;
      filtered.push({p,order:chosen.u.sourceOrder,originalIndex,sourceRow:chosen.u.sourceRow});
    }else{
      unmatched.push(p?.name||'');
      filtered.push({p,order:Number.MAX_SAFE_INTEGER,originalIndex,sourceRow:null});
    }
  });
  filtered.sort((a,b)=>a.order-b.order||a.originalIndex-b.originalIndex);
  filtered.forEach((x,i)=>{x.p.id=i;x.p._sourceOrder=x.order;x.p._sourceRow=x.sourceRow});
  window.condoV1SourceOrder.lastAudit={sourceUnits:units.length,displayed:filtered.length,unmatched:[...unmatched],removedSummary:(people||[]).filter(p=>isSummaryName(p?.name)).map(p=>p.name)};
  return filtered.map(x=>x.p);
}
const baseRender=render;
render=function(fileName,wb){
  if(typeof current!=='undefined'&&Array.isArray(current))current=reorderPeople(current,wb);
  return baseRender(fileName,wb);
};
window.condoV1SourceOrder={sourceUnits,reorderPeople,isSummaryName,lastAudit:null};
})();

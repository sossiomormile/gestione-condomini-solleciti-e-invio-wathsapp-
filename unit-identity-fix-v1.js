(()=>{
'use strict';
if(typeof window==='undefined'||typeof window.condoAnalyzeV6!=='function'||typeof XLSX==='undefined')return;
const baseAnalyze=window.condoAnalyzeV6;
const nrm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const canon=x=>nrm(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
const unitNorm=x=>canon(x).replace(/\s+/g,'');
const primaryParty=x=>{
 let s=String(x??'').trim();
 const p=s.indexOf('('),q=s.indexOf('/');
 let cut=s.length;
 if(p>=0)cut=Math.min(cut,p);
 if(q>=0)cut=Math.min(cut,q);
 return canon(s.slice(0,cut));
};
function findHeader(rows){
 const keys=['RATA','CONGUAGLIO','IMPORTO','SALDO','RESIDUO','DA INCASSARE','DA VERSARE','PAGATO','VERSATO','INCASSATO'];
 for(let i=0;i<Math.min(35,rows.length);i++){
   const hs=(rows[i]||[]).map(nrm),hasName=hs.includes('NOMINATIVO')||hs.includes('CONDOMINO');
   if(hasName&&hs.some(h=>keys.some(k=>h.includes(k))))return i;
 }
 return null;
}
function effectiveHeaders(rows,hi){
 const prev=hi>0?(rows[hi-1]||[]):[],cur=rows[hi]||[],nn=Math.max(prev.length,cur.length),out=[];
 for(let i=0;i<nn;i++){const c=cur[i],p=prev[i];out.push(c!==null&&c!==undefined&&c!==''?c:p)}
 return out;
}
function colExact(H,...names){const hs=H.map(nrm);for(const name of names){const i=hs.indexOf(nrm(name));if(i>=0)return i}return null}
function val(r,i){return i!=null&&i<r.length?r[i]:null}
function scaleFromRow(row){
 for(let c=0;c<Math.min(4,(row||[]).length);c++){
   const s=nrm(row[c]).replace(/["']/g,' ');
   let m=s.match(/\bSCALA\s+([A-Z0-9]+)\b/);if(m)return m[1];
   m=s.match(/\bFABBRICATO\s+([A-Z0-9]+)\b/);if(m)return m[1];
 }
 return '';
}
function parseUnits(rows){
 const hi=findHeader(rows);if(hi==null)return [];
 const H=effectiveHeaders(rows,hi),namec=colExact(H,'NOMINATIVO','CONDOMINO'),subc=colExact(H,'SUB'),intc=colExact(H,'INT','INT.','INTERNO'),scalac=colExact(H,'SCALA'),pianoc=colExact(H,'P','PIANO');
 let scala='';
 for(let r=0;r<hi;r++){const s=scaleFromRow(rows[r]);if(s)scala=s}
 const out=[];
 for(let r=hi+1;r<rows.length;r++){
   const row=rows[r]||[],s=scaleFromRow(row);if(s){scala=s;continue}
   const name=String(val(row,namec)??'').trim(),nn=nrm(name);
   if(!name||nn.startsWith('TOTALE')||nn.startsWith('SCALA')||nn==='CONDOMINO'||nn==='NOMINATIVO')continue;
   const interno=String(val(row,intc)??'').trim(),piano=String(val(row,pianoc)??'').trim(),sub=String(val(row,subc)??'').trim(),rowScala=String(val(row,scalac)??'').trim()||scala;
   if(!(interno||piano||sub||rowScala))continue;
   out.push({name,interno,piano,sub,scala:rowScala,rowIndex:r,nameCol:namec});
 }
 return out;
}
function unitEvidence(hist,cand){
 let score=0;const matched=[],conflicts=[];
 for(const [field,weight] of [['interno',2],['piano',1],['scala',2],['sub',3]]){
   const a=unitNorm(hist[field]),b=unitNorm(cand[field]);
   if(!a||!b)continue;
   if(a===b){score+=weight;matched.push(field)}else conflicts.push(field);
 }
 return {score,matched,conflicts};
}
function rewriteUnitIdentity(wb,unresolved){
 const inc=(wb.SheetNames||[]).find(s=>nrm(s).startsWith('INCASSI '))||(wb.SheetNames||[]).find(s=>nrm(s).includes('INCASSI'));
 if(!inc)return wb;
 const incRows=XLSX.utils.sheet_to_json(wb.Sheets[inc],{header:1,defval:null,raw:true}),current=parseUnits(incRows);
 if(!current.length)return wb;
 const clone={...wb,Sheets:{...wb.Sheets}},resolved=[],unresolvedText=(unresolved||[]).join('\n');
 for(const sn of wb.SheetNames||[]){
   const nn=nrm(sn),isCong=nn.includes('CONG')||((nn.includes('REC')||nn.includes('RECUPERO'))&&nn.includes('INCASS'));
   if(sn===inc||!isCong)continue;
   const ws0=wb.Sheets[sn],rows=XLSX.utils.sheet_to_json(ws0,{header:1,defval:null,raw:true}),hist=parseUnits(rows);
   if(!hist.length)continue;
   const ws={...ws0};let changed=false;
   for(const rec of hist){
     if(!unresolvedText.includes(`· ${rec.name}:`))continue;
     const core=primaryParty(rec.name);if(!core)continue;
     const possible=[];
     for(const cand of current){
       if(primaryParty(cand.name)!==core)continue;
       const ev=unitEvidence(rec,cand);
       if(!ev.conflicts.length&&ev.score>=2)possible.push({cand,ev});
     }
     if(!possible.length)continue;
     const bestScore=Math.max(...possible.map(x=>x.ev.score)),best=possible.filter(x=>x.ev.score===bestScore);
     if(best.length!==1)continue;
     const chosen=best[0];
     if(canon(rec.name)===canon(chosen.cand.name))continue;
     const addr=XLSX.utils.encode_cell({r:rec.rowIndex,c:rec.nameCol}),cell=ws[addr];if(!cell)continue;
     ws[addr]={...cell,v:chosen.cand.name,w:chosen.cand.name};changed=true;
     resolved.push({sheet:sn,row:rec.rowIndex+1,from:rec.name,to:chosen.cand.name,evidence:chosen.ev.matched.join('+')});
   }
   if(changed)clone.Sheets[sn]=ws;
 }
 window.condoUnitIdentityFixV1.lastResolved=resolved;
 return clone;
}
function analyzeWithUnitIdentity(wb,fileName){
 const baseline=baseAnalyze(wb,fileName);
 if(!(baseline.unresolved||[]).length){window.condoUnitIdentityFixV1.lastResolved=[];return baseline}
 const rewritten=rewriteUnitIdentity(wb,baseline.unresolved);
 if(!window.condoUnitIdentityFixV1.lastResolved.length)return baseline;
 return baseAnalyze(rewritten,fileName);
}
window.condoAnalyzeV6=analyzeWithUnitIdentity;
window.condoUnitIdentityFixV1={rewriteUnitIdentity,primaryParty,unitEvidence,lastResolved:[]};
})();

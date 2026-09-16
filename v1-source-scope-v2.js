(()=>{
'use strict';
const V='v1-source-scope-v2';
if(typeof window==='undefined'||typeof window.condoAnalyzeV6!=='function')return;
const baseAnalyze=window.condoAnalyzeV6;
const nrm=s=>String(s??'').trim().replace(/\s+/g,' ').toUpperCase();
function isConguaglioSheet(name){const x=nrm(name);return x.includes('CONG')||((x.includes('REC')||x.includes('RECUPERO'))&&x.includes('INCASS'))}
function isFrontSheet(name){return /FRO?NT?ESPIZIO/i.test(String(name||''))}
function primaryIncassi(wb){const names=wb?.SheetNames||[];return names.find(s=>nrm(s).startsWith('INCASSI '))||names.find(s=>nrm(s)==='INCASSI')||names.find(s=>nrm(s).includes('INCASSI')&&!isConguaglioSheet(s))||''}
function scopeWorkbook(wb){
 const inc=primaryIncassi(wb),names=(wb?.SheetNames||[]).filter(s=>s===inc||isConguaglioSheet(s)||isFrontSheet(s));
 const sheets={};for(const name of names)if(wb?.Sheets?.[name])sheets[name]=wb.Sheets[name];
 return {...wb,SheetNames:names,Sheets:sheets};
}
function analyzeScoped(wb,fileName){return baseAnalyze(scopeWorkbook(wb),fileName)}
window.condoAnalyzeV6=analyzeScoped;
window.condoV1SourceScopeV2={version:V,primaryIncassi,isConguaglioSheet,isFrontSheet,scopeWorkbook};
})();

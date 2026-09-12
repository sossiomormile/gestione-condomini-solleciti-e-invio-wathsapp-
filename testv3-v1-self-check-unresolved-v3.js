(()=>{
'use strict';
const api=window.condoSelfCheckV1;if(!api||typeof window.condoAnalyzeV6!=='function'||typeof XLSX==='undefined')return;
const isDuplicateCong=x=>/^Unità duplicate · .*: (?:conguagli non separabili con certezza|totale conguagli ricostruito non coincide)$/.test(String(x||''));
function findBlocking(wb,fileName){try{return(window.condoAnalyzeV6(wb,fileName)?.unresolved||[]).filter(isDuplicateCong)}catch(e){return[`Autocollaudo unità duplicate non eseguito: ${e.message}`]}}
function augment(report,wb,fileName){const blocking=findBlocking(wb,fileName);if(!blocking.length){report.duplicateConguaglioUnresolved=[];return report}report.conguagli=report.conguagli||{};report.conguagli.unresolved=(Number(report.conguagli.unresolved)||0)+blocking.length;report.duplicateConguaglioUnresolved=blocking;report.errors=[...new Set([...(report.errors||[]),...blocking.map(x=>'Conguaglio non risolto: '+x)])];report.ok=false;return report}
const baseWorkbook=api.auditWorkbook?.bind(api),baseFile=api.auditFile?.bind(api);
if(baseWorkbook)api.auditWorkbook=function(wb,people,folderName,fileName){return augment(baseWorkbook(wb,people,folderName,fileName),wb,fileName)};
if(baseFile)api.auditFile=async function(file,people,folderName,fileName){const r=await baseFile(file,people,folderName,fileName),data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array',cellDates:true,cellFormula:true});return augment(r,wb,fileName||file.name)};
window.condoSelfCheckUnresolvedV3={isDuplicateCong,findBlocking,augment};
})();

(()=>{
'use strict';
const V='update-certification-v1';
const api=window.condoSelfCheckV1;
if(!api||typeof XLSX==='undefined')return;
const EXPECTED_SOURCE={
 'CLANIO 2':'Bilancio 2025-2026.xlsx','CORSO DURANTE 207':'2026/2026.xlsx','D FERRIERO CESA':'2026-2027/Consuntivo 2026 - Preventivo 2027.xlsx','DEL SOLE':'2025-2026.xlsx','DEMACOOP':'2026-2027/Consuntivo 2026 - Preventivo 2027.xlsx','DI LORENZO':'2026/2026.xlsx','DI BE':'2025-2026/Consuntivo 2025 - Preventivo 2026 - MODIFICA.xlsx','F LLI CARUSO C SO VITT EMENUELE':'2026/2026-2027.xlsx','F LLI CARUSO VIA LUPOLI':'2026/2026 - da gen 26.xlsx','GLOBO':'2025-2026/2025-2026.xlsx','LUNA':'2026-2027/Bilancio 2026-2027.xlsx','MIMOSA VIA BUCCINI':'2026-2027/2026-2027.xlsx','NEW GATE':'2026/Bilancio 2026-2027.xlsx','PARCO ACUTIS':'2026-2027/2026-2027.xlsx','PARCO ARCOBALENO':'2026-27/Bilancio 2026-27.xlsx','PARCO GARDENIA':'2026-2027/2026-2027.xlsx','PARCO IRIS':'2025/Consuntivo 2025 - Preventivo 2026.xlsx','PARCO OLITEAMA':'2026/Maggio 26 - Aprile 27.xlsx','PARCO PANTANI':'2026/Consuntivo 2026 - Preventivo 2027.xlsx','PARCO SAN NAZARIO':'2026-2027/Consuntivo 2026-2027.xlsx','PIO IX':'2026/2026-2027.xlsx','RAFFAELLO 2':'2026 - 2027/2026.xlsx','VIA STANZIONE 132':'2026-27/2026-27.xlsx','LA PERLA CESA':'2026/Consuntivo 2026 - 2027.xlsx','PARCO DEL SOLE':'2026/Bilancio 2026.xlsx','PARCO FIORITO':'2026-27/Consuntivo 2026-2027.xlsx','PARCO KAROL':'2025/Consuntivo 2025 - Preventivo 2026.xlsx'
};
const nrm=s=>String(s??'').toUpperCase().replace(/CONDOMINIO/g,'').replace(/["'._-]+/g,' ').replace(/\s+/g,' ').trim();
const round2=n=>Math.round((Number(n)||0)*100)/100;
const finite=n=>Number.isFinite(Number(n));
const uniq=a=>[...new Set(a.map(String))];
function expectedSource(folderName){return EXPECTED_SOURCE[nrm(folderName)]||''}
function sourcePath(){return String(window.condoSourcePath||'').replace(/\\/g,'/').replace(/^\/+|\/+$/g,'')}
function moduleState(){
 const modules={deep:!!window.condoDeepCheckV2,cents:!!window.condoV1CentConsistencyV1,centGuard:!!window.condoOrdinaryCentGuardV1,unresolvedGuard:!!window.condoSelfCheckUnresolvedV3,sourceOrder:!!window.condoV1SourceOrder,engine:typeof window.condoAnalyzeV6==='function'};
 return{ok:Object.values(modules).every(Boolean),modules};
}
function inspectPeople(people,sourceMap){
 const errors=[],seenRows=new Map(),seenOrders=new Map(),activeSourceRows=new Set(),actualRows=new Set();let itemCount=0,creditCount=0,grossChecked=0;
 if(sourceMap instanceof Map)for(const [row,u] of sourceMap)if((u?.unpaid||[]).length)activeSourceRows.add(Number(row));
 for(const p of people||[]){
  const name=String(p?.name||'').trim()||'?';
  const row=Number(p?._sourceRow),order=Number(p?._sourceOrder);
  if(!Number.isFinite(row)){errors.push(`${name}: riga Incassi non valida`)}else{
   actualRows.add(row);
   if(seenRows.has(row))errors.push(`${name}: riga Incassi duplicata ${row} già usata da ${seenRows.get(row)}`);else seenRows.set(row,name);
   if(sourceMap instanceof Map&&!sourceMap.has(row))errors.push(`${name}: riga Incassi ${row} non presente nella sorgente`);
  }
  if(!Number.isFinite(order)){errors.push(`${name}: ordine Incassi non valido`)}else if(seenOrders.has(order))errors.push(`${name}: ordine Incassi duplicato ${order} già usato da ${seenOrders.get(order)}`);else seenOrders.set(order,name);
  const items=Array.isArray(p?.items)?p.items:[],credits=Array.isArray(p?.credits)?p.credits:[];let gross=0;const months=new Set();
  for(const x of items){itemCount++;const type=String(x?.type||''),label=String(x?.label||'').trim(),amount=Number(x?.amount);if(type!=='ordinary'&&type!=='cong')errors.push(`${name}: tipo voce non ammesso ${type||'(vuoto)'}`);if(!label)errors.push(`${name}: voce senza descrizione`);if(!Number.isFinite(amount)||amount<0)errors.push(`${name}: importo voce non valido ${x?.amount}`);if(Number.isFinite(amount))gross+=amount;if(type==='ordinary'){const k=nrm(label);if(months.has(k))errors.push(`${name}: rata ordinaria duplicata ${label}`);months.add(k);if(Number.isFinite(amount)&&amount<=.01)errors.push(`${name}: residuo ordinario anomalo ${label} €${amount}`)}}
  for(const x of credits){creditCount++;const label=String(x?.label||'').trim(),amount=Number(x?.amount);if(!label)errors.push(`${name}: credito senza descrizione`);if(!Number.isFinite(amount)||amount<0)errors.push(`${name}: credito non valido ${x?.amount}`)}
  if(finite(p?._v6?.gross)){grossChecked++;if(Math.abs(round2(gross)-round2(p._v6.gross))>.01)errors.push(`${name}: totale lordo incoerente (voci ${round2(gross)}, motore ${round2(p._v6.gross)})`)}
 }
 for(const row of activeSourceRows)if(!actualRows.has(row))errors.push(`Riga Incassi ${row}: rate scoperte presenti nella sorgente ma unità assente nell'app`);
 return{ok:!errors.length,errors,metrics:{people:(people||[]).length,itemCount,creditCount,grossChecked,activeSourceRows:activeSourceRows.size,actualSourceRows:actualRows.size}};
}
function certifyWorkbook(wb,people,folderName,fileName,report){
 const errors=[],checks={};
 const wanted=expectedSource(folderName),actual=sourcePath()||String(fileName||'').replace(/\\/g,'/');
 checks.sourceRule=!!wanted&&actual.toLowerCase().endsWith(wanted.toLowerCase());
 if(!wanted)errors.push(`Sorgente non certificata per ${folderName}: manca una regola esplicita`);else if(!checks.sourceRule)errors.push(`Sorgente diversa da quella certificata: attesa ${wanted}, letta ${actual||fileName}`);
 const ms=moduleState();checks.modules=ms.ok;if(!ms.ok)errors.push('Moduli di controllo mancanti: '+Object.entries(ms.modules).filter(([,v])=>!v).map(([k])=>k).join(', '));
 checks.baseReport=!!report?.ok;if(!report?.ok)errors.push('Autocollaudo base non superato');
 checks.deep=report?.deep?.ok===true;if(!checks.deep)errors.push('Deep check non superato o non disponibile');
 checks.centConsistency=report?.centConsistency?.ok===true;if(!checks.centConsistency)errors.push('Controllo centesimi non superato o non disponibile');
 checks.noFuture=(Number(report?.ordinary?.futureItems)||0)===0;if(!checks.noFuture)errors.push(`Rate future anomale: ${report?.ordinary?.futureItems}`);
 checks.noCongUnresolved=(Number(report?.conguagli?.unresolved)||0)===0&&!(report?.duplicateConguaglioUnresolved||[]).length;if(!checks.noCongUnresolved)errors.push('Conguagli non risolti presenti');
 let engine=null,engineUnresolved=[];try{engine=window.condoAnalyzeV6?.(wb,fileName);engineUnresolved=(engine?.unresolved||[]).filter(Boolean)}catch(e){errors.push('Ricalcolo indipendente del motore fallito: '+e.message)}
 checks.engineUnresolved=engineUnresolved.length===0;if(engineUnresolved.length)errors.push(...engineUnresolved.slice(0,8).map(x=>'Motore non risolto: '+x));
 let sourceMap=null;try{sourceMap=window.condoOrdinaryCentGuardV1?.sourceOrdinaryByRow?.(wb,fileName)||null}catch(e){errors.push('Rilettura indipendente Incassi fallita: '+e.message)}
 checks.sourceMap=sourceMap instanceof Map&&sourceMap.size>0;if(!checks.sourceMap)errors.push('Mappa indipendente delle righe Incassi non disponibile');
 const identity=inspectPeople(people,sourceMap);checks.identity=identity.ok;errors.push(...identity.errors);
 const precise=report?.centConsistency||{};checks.ordinaryTotals=finite(precise.expectedTotal)&&finite(precise.actualTotal)&&Math.abs(Number(precise.expectedTotal)-Number(precise.actualTotal))<=.01&&Number(precise.expectedCount)===Number(precise.actualCount);if(!checks.ordinaryTotals)errors.push('Conteggio/totale rate ordinarie non coincide al centesimo');
 const cong=report?.conguagli||{};checks.congTotals=finite(cong.source?.debit)&&finite(cong.engineDebit)&&finite(cong.appDebit)&&finite(cong.source?.credit)&&finite(cong.engineCredit)&&finite(cong.appCredit)&&Math.abs(Number(cong.source.debit)-Number(cong.engineDebit))<=.01&&Math.abs(Number(cong.engineDebit)-Number(cong.appDebit))<=.01&&Math.abs(Number(cong.source.credit)-Number(cong.engineCredit))<=.01&&Math.abs(Number(cong.engineCredit)-Number(cong.appCredit))<=.01;if(!checks.congTotals&&Number(report?.conguaglioRows||0)>0)errors.push('Totali conguagli Drive/motore/app non coincidono al centesimo');if(Number(report?.conguaglioRows||0)===0)checks.congTotals=true;
 const passed=Object.values(checks).filter(Boolean).length,total=Object.keys(checks).length;
 return{ok:errors.length===0,errors:uniq(errors),checks,passed,total,source:{expected:wanted,actual},engineUnresolved:engineUnresolved.length,identity:identity.metrics};
}
function attach(report,cert){report.certification=cert;if(!cert.ok){report.errors=uniq([...(report.errors||[]),...cert.errors.map(x=>'Certificazione AGGIORNA: '+x)]);report.ok=false}return report}
const baseWorkbook=api.auditWorkbook?.bind(api),baseFile=api.auditFile?.bind(api),baseFinalize=api.finalize?.bind(api),baseRender=api.renderBatchSummary?.bind(api);
if(baseWorkbook)api.auditWorkbook=function(wb,people,folderName,fileName){const r=baseWorkbook(wb,people,folderName,fileName);try{return attach(r,certifyWorkbook(wb,people,folderName,fileName,r))}catch(e){return attach(r,{ok:false,errors:['Certificazione non eseguita: '+e.message],checks:{},passed:0,total:0})}};
if(baseFile)api.auditFile=async function(file,people,folderName,fileName){const r=await baseFile(file,people,folderName,fileName);try{const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array',cellDates:true,cellFormula:true});return attach(r,certifyWorkbook(wb,people,folderName,fileName||file.name,r))}catch(e){return attach(r,{ok:false,errors:['Certificazione non eseguita: '+e.message],checks:{},passed:0,total:0})}};
if(baseFinalize)api.finalize=function(expectedCount){const s=baseFinalize(expectedCount),reports=api.getBatch?.()||[],certErrors=[];let certifiedFiles=0,passed=0,total=0,engineUnresolved=0;for(const r of reports){const c=r?.certification;if(c?.ok)certifiedFiles++;else certErrors.push(`${r?.folder||'?'}: certificazione estesa non superata`);passed+=Number(c?.passed)||0;total+=Number(c?.total)||0;engineUnresolved+=Number(c?.engineUnresolved)||0}if(Number.isFinite(expectedCount)&&certifiedFiles!==expectedCount)certErrors.push(`File certificati ${certifiedFiles}/${expectedCount}`);s.errors=uniq([...(s.errors||[]),...certErrors]);s.ok=!!s.ok&&certErrors.length===0;s.certification={version:V,ok:certErrors.length===0,certifiedFiles,expectedCount:Number.isFinite(expectedCount)?expectedCount:null,passed,total,engineUnresolved};s.totals=s.totals||{};s.totals.certifiedFiles=certifiedFiles;return s};
if(baseRender)api.renderBatchSummary=function(summary){baseRender(summary);const card=document.getElementById('v1SelfCheckReport');if(!card)return;card.querySelector('#updateCertificationSummary')?.remove();const c=summary?.certification||{},m=summary?.memory||{},ok=!!summary?.ok&&!!c.ok,box=document.createElement('div');box.id='updateCertificationSummary';box.style.cssText='margin-top:10px;padding-top:10px;border-top:1px solid #d0d5dd;line-height:1.55';box.innerHTML=`<b>Certificazione estesa AGGIORNA:</b> ${ok?'✅ SUPERATA':'❌ NON SUPERATA'}<br><b>File certificati:</b> ${c.certifiedFiles||0}${c.expectedCount!=null?' / '+c.expectedCount:''}<br><b>Controlli estesi superati:</b> ${c.passed||0} / ${c.total||0}<br><b>Non risolti motore:</b> ${c.engineUnresolved||0}<br><b>Sorgente bilancio:</b> regola esplicita + percorso verificato<br><b>Identità/unità:</b> righe e ordine Incassi univoci<br><b>Integrità importi:</b> centesimi, totali lordi e conguagli incrociati<br><b>Archivio finale = Drive:</b> ${m.archiveMatchesDrive===true?'OK':'verificato a fine transazione'}<br><b>Contatti/storico/configurazioni:</b> ${m.protectedDataUnchanged===true?'INALTERATI':'verificati a fine transazione'}`;card.appendChild(box)};
window.condoUpdateCertificationV1={version:V,active:true,expectedSource,certifyWorkbook,moduleState};
})();

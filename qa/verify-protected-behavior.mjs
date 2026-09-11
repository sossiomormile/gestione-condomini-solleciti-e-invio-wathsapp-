import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const read = p => fs.readFileSync(p, 'utf8');
const baseline = JSON.parse(read('qa/QA_BASELINE.json'));
const auth = JSON.parse(read('qa/CHANGE_AUTHORIZATION.json'));
const fail = msg => { console.error('\nQA LOCK FAILED: '+msg); process.exitCode = 1; };
const ok = msg => console.log('OK - '+msg);
const mustContain = (file, needles) => { const text=read(file); for(const needle of needles) if(!text.includes(needle)) fail(`${file} no longer contains protected marker: ${needle}`); };
const mustNotContain = (file, needles) => { const text=read(file); for(const needle of needles) if(text.includes(needle)) fail(`${file} contains forbidden regression marker: ${needle}`); };

const appCurrent=read('app-current.html');
const ordered=[
 'engine-v6.js?v=20260911-conguagli5',
 'unit-identity-fix-v1.js?v=20260911-unit2',
 'conguaglio-position-fix-v2.js?v=20260911-rates4',
 'v1-source-order.js?v=20260911-order1',
 'v1-focus-ordinary-conguagli.js?v=20260911-v1focus1',
 'folder-name-fix-v1.js?v=20260911-folder2',
 'whatsapp-v6.js?v=20260909h',
 'data-safety-v6.js?v=20260909h',
 'unit-contact-identity-v1.js?v=20260911-contact2',
 'v1-self-check.js?v=20260911-selfcheck1',
 'v1-self-check-cents-v2.js?v=20260911-cents1',
 'v1-deep-check-v2.js?v=20260911-deep1',
 'drive-sync-v3.js?v=20260911-fullrefresh3'
];
let last=-1;for(const marker of ordered){const i=appCurrent.indexOf(marker);if(i<0)fail(`app-current.html missing protected script ${marker}`);if(i<=last)fail(`app-current.html changed protected script order around ${marker}`);last=i}
if(appCurrent.includes('drive-sync-v1.js')||appCurrent.includes('drive-sync-v2.js'))fail('test entrypoint loads an obsolete Drive sync runtime');
if(/qa\//i.test(appCurrent))fail('QA files must never be loaded by the runtime app');else ok('entrypoint keeps protected accounting chain plus folder identity, unit contacts, deep self-check and Drive V3');

mustContain('engine-v6.js',["const unresolved=[];","if(!match.name){unresolved.push","credits=(d.crediti||[]).filter(c=>c.amount>.01).map(c=>({label:c.label,amount:round2(c.amount),selected:false}))","currentPeople.sort((a,b)=>String(a.scala).localeCompare(String(b.scala),'it',{numeric:true})"]);
mustContain('unit-identity-fix-v1.js',["if(!(baseline.unresolved||[]).length){window.condoUnitIdentityFixV1.lastResolved=[];return baseline}","if(!ev.conflicts.length&&ev.score>=2)","if(best.length!==1)continue;"]);ok('conguaglio resolver and unit-identity guard markers are present');

mustContain('conguaglio-position-fix-v2.js',["if(isFutureMonth(x.year,x.mese))continue;","const idx=records.findIndex((r,i)=>!used.has(i)&&canon(r.name)===canon(p.name))","other=(p.items||[]).filter(x=>x.type!=='ordinary')","p.items=[...ordinary,...other]","p._sourceRow=rec.sourceRow"]);
mustNotContain('conguaglio-position-fix-v2.js',["idx<0&&p.interno","String(r.interno)===String(p.interno)&&(!p.scala||!r.scala||nrm(r.scala)===nrm(p.scala))"]);ok('future-month filtering and exact ordinary-name matching remain protected');

mustContain('v1-source-order.js',["const SUMMARY_LABELS=new Set([","if(isSummaryName(p?.name))return;","current=reorderPeople(current,wb)","x.p._sourceOrder=x.order","const pc=canon(p?.name),explicitRow=Number(p?._sourceRow)","window.condoV1SourceOrder={sourceUnits,reorderPeople,isSummaryName,lastAudit:null}"]);
mustNotContain('v1-source-order.js',["p.items=","p.credits="]);ok('source-order patch only identifies/reorders units and filters summary rows');

mustContain('v1-focus-ordinary-conguagli.js',["const allowedItem=x=>x&&((x.type==='ordinary')||(x.type==='cong'))","p.items=(p.items||[]).filter(allowedItem)","p.credits=(p.credits||[]).filter(allowedCredit)","message=function(p){focusPerson(p);return baseMessage(p)}","calc=function(p){focusPerson(p);return baseCalc(p)}","V1 operativa:"]);ok('V1 operational scope excludes extraordinary/individual items before totals and messages');

mustContain('folder-name-fix-v1.js',["window.condoSetFolderTitle=function(title)","a.condomini[forcedTitle]=rec","if(building)building.textContent=forcedTitle"]);ok('Drive folder name controls displayed/archive condominium identity');

mustContain('unit-contact-identity-v1.js',["function key(p)","if(sub)return'SUB:'+sub","duplicateStructuralCount(p)>1","legacyIsUnambiguous(p)","const PENDING_KEY='condo_wa_pending_v8'","function unitHistoryKey(p){return'condo_hist_v28_'+key(p)}","if(all[old]&&legacyIsUnambiguous(p))return all[old]","function getHistoryUnit(p)","function addHistoryUnit(p,channel,amount)","location.href='https://wa.me/'+phone+'?text='+text"]);
mustNotContain('unit-contact-identity-v1.js',["all[k]={...all[old]};writeContacts(all)","localStorage.setItem(k,localStorage.getItem(old))"]);ok('contacts/history are unit-isolated and legacy fallbacks are read-only until a real user action writes the new unit key');

mustContain('v1-self-check.js',["function compareOrdinaryAndOrder(people,source)","function parseCongSource(wb)","function compareConguagli(wb,fileName,people,sourceCong)","function finalize(expectedCount)","AUTOCOLLAUDO AGGIORNAMENTO SUPERATO","window.condoSelfCheckV1={auditWorkbook,auditFile,resetBatch,add,finalize,renderBatchSummary"]);
mustContain('v1-self-check-cents-v2.js',["roundingBasis:'singola posizione arrotondata a 2 decimali'","window.condoSelfCheckCentsV2={roundedSourceConguagli,normalize}"]);
mustContain('v1-deep-check-v2.js',["function deepAudit(wb,people,fileName)","rate ordinarie complessive app","totale ordinario app","unità con rate scoperte mancanti nell'app","for(const f of ['scala','interno','piano','sub'])","window.condoDeepCheckV2={parseSource,deepAudit}"]);ok('runtime self-check verifies counts, euro totals, structural identity, source order and conguagli before commit');

mustContain('legacy-v28.html',["function setItem(pid,i,v)","function setCredit(pid,i,v)","p.items.filter(x=>x.selected)","p.credits.filter(x=>x.selected)","function toggleAll(v){current.forEach(p=>{p.items.forEach(x=>x.selected=v)"]);ok('single-item selection and manual credit compensation markers are present');

mustContain('drive-sync-v2.js',["ROOT_FOLDER_ID='1ZE0blT7_qZzxdJL54uGhZfsaFIVUk9up'","function beginFullRefreshTransaction()","function rollbackFullRefreshTransaction()"]);mustNotContain('drive-sync-v2.js',["state[key]===currentSig"]);ok('Drive V2 remains available only as rollback reference');
mustContain('drive-sync-v3.js',["ROOT_FOLDER_ID='1ZE0blT7_qZzxdJL54uGhZfsaFIVUk9up'","const UPDATE_KEY='condo_last_update_v5'","function beginFullRefreshTransaction()","update:snap(UPDATE_KEY)","restoreSnap(UPDATE_KEY,tx.update)","function verifyArchiveMatchesDrive(rows,startedAt)","missing=expected.filter(x=>!aset.has(x))","extra=actual.filter(x=>!eset.has(x))","if(!window.condoDeepCheckV2)throw new Error","const archiveCheck=verifyArchiveMatchesDrive(rows,tx.startedAt)","function resetRuntimeViewAfterRollback()",".sort((a,b)=>a.name.localeCompare(b.name,'it'))"]);
mustNotContain('drive-sync-v3.js',["state[key]===currentSig"]);ok('Drive V3 fully reloads, deep-checks, verifies exact archive membership and performs complete rollback');

mustContain('whatsapp-v6.js',["input.value='';","p.phone='';","location.href='whatsapp://send?text='+text","const k=contactKeyLocal(p);"]);ok('legacy WhatsApp ownership guard remains, then unit-contact patch strengthens duplicate/SUB isolation');

let changed=[];try{const out=execFileSync('git',['diff','--name-only',`${baseline.baseline_commit}..HEAD`,'--',...baseline.protected_runtime_files],{encoding:'utf8'});changed=out.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).sort()}catch(e){fail('Unable to calculate protected runtime diff from baseline commit: '+e.message)}
if(!changed.length)ok('no protected runtime file changed from frozen baseline');else{console.log('Protected runtime changes detected:',changed.join(', '));const approved=[...(auth.approved_changed_runtime_files||[])].sort();if(JSON.stringify(changed)!==JSON.stringify(approved))fail('protected runtime changes are not exactly listed in qa/CHANGE_AUTHORIZATION.json');const failedGates=Object.entries(auth.regression_gates||{}).filter(([,v])=>v!==true).map(([k])=>k);if(failedGates.length)fail('runtime change authorization incomplete; gates still false: '+failedGates.join(', '));else ok('protected runtime changes have explicit complete regression authorization')}
if(process.exitCode)process.exit(process.exitCode);console.log('\nQA LOCK PASSED');

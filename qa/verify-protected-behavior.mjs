import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const read = p => fs.readFileSync(p, 'utf8');
const baseline = JSON.parse(read('qa/QA_BASELINE.json'));
const auth = JSON.parse(read('qa/CHANGE_AUTHORIZATION.json'));
const fail = msg => { console.error('\nQA LOCK FAILED: '+msg); process.exitCode = 1; };
const ok = msg => console.log('OK - '+msg);
const mustContain = (file, needles) => {
  const text = read(file);
  for (const needle of needles) if (!text.includes(needle)) fail(`${file} no longer contains protected marker: ${needle}`);
};
const mustNotContain = (file, needles) => {
  const text = read(file);
  for (const needle of needles) if (text.includes(needle)) fail(`${file} contains forbidden regression marker: ${needle}`);
};

const appCurrent = read('app-current.html');
const ordered = [
  'engine-v6.js?v=20260911-conguagli5',
  'unit-identity-fix-v1.js?v=20260911-unit2',
  'conguaglio-position-fix-v2.js?v=20260911-rates4',
  'v1-source-order.js?v=20260911-order1',
  'v1-focus-ordinary-conguagli.js?v=20260911-v1focus1',
  'whatsapp-v6.js?v=20260909h',
  'v1-self-check.js?v=20260911-selfcheck1',
  'drive-sync-v2.js?v=20260911-fullrefresh2'
];
let last = -1;
for (const marker of ordered) {
  const i = appCurrent.indexOf(marker);
  if (i < 0) fail(`app-current.html missing protected script ${marker}`);
  if (i <= last) fail(`app-current.html changed protected script order around ${marker}`);
  last = i;
}
if (appCurrent.includes('drive-sync-v1.js')) fail('test entrypoint still loads obsolete drive-sync-v1.js');
if (/qa\//i.test(appCurrent)) fail('QA files must never be loaded by the runtime app');
else ok('entrypoint keeps protected accounting chain, source order, V1 focus, WhatsApp, self-check and Drive V2');

mustContain('engine-v6.js', [
  "const unresolved=[];",
  "if(!match.name){unresolved.push",
  "credits=(d.crediti||[]).filter(c=>c.amount>.01).map(c=>({label:c.label,amount:round2(c.amount),selected:false}))",
  "currentPeople.sort((a,b)=>String(a.scala).localeCompare(String(b.scala),'it',{numeric:true})"
]);
mustContain('unit-identity-fix-v1.js', [
  "if(!(baseline.unresolved||[]).length){window.condoUnitIdentityFixV1.lastResolved=[];return baseline}",
  "if(!ev.conflicts.length&&ev.score>=2)",
  "if(best.length!==1)continue;"
]);
ok('conguaglio resolver and unit-identity guard markers are present');

mustContain('conguaglio-position-fix-v2.js', [
  "if(isFutureMonth(x.year,x.mese))continue;",
  "const idx=records.findIndex((r,i)=>!used.has(i)&&canon(r.name)===canon(p.name))",
  "other=(p.items||[]).filter(x=>x.type!=='ordinary')",
  "p.items=[...ordinary,...other]"
]);
mustNotContain('conguaglio-position-fix-v2.js', [
  "idx<0&&p.interno",
  "String(r.interno)===String(p.interno)&&(!p.scala||!r.scala||nrm(r.scala)===nrm(p.scala))"
]);
ok('future-month filtering is protected and ordinary rows cannot fall back to interno-only matching');

mustContain('v1-source-order.js', [
  "const SUMMARY_LABELS=new Set([",
  "if(isSummaryName(p?.name))return;",
  "current=reorderPeople(current,wb)",
  "x.p._sourceOrder=x.order",
  "window.condoV1SourceOrder={sourceUnits,reorderPeople,isSummaryName,lastAudit:null}"
]);
mustNotContain('v1-source-order.js', ["p.items=", "p.credits="]);
ok('source-order patch only reorders/filter summary people and does not rewrite accounting items or credits');

mustContain('v1-focus-ordinary-conguagli.js', [
  "const allowedItem=x=>x&&((x.type==='ordinary')||(x.type==='cong'))",
  "p.items=(p.items||[]).filter(allowedItem)",
  "p.credits=(p.credits||[]).filter(allowedCredit)",
  "message=function(p){focusPerson(p);return baseMessage(p)}",
  "calc=function(p){focusPerson(p);return baseCalc(p)}",
  "V1 operativa:"
]);
ok('V1 operational scope excludes extraordinary/individual items before totals and messages');

mustContain('v1-self-check.js', [
  "function compareOrdinaryAndOrder(people,source)",
  "function parseCongSource(wb)",
  "function compareConguagli(wb,fileName,people,sourceCong)",
  "function finalize(expectedCount)",
  "AUTOCOLLAUDO AGGIORNAMENTO SUPERATO",
  "window.condoSelfCheckV1={auditWorkbook,auditFile,resetBatch,add,finalize,renderBatchSummary"
]);
ok('runtime self-check verifies source order, ordinary installments and conguagli before Drive commit');

mustContain('legacy-v28.html', [
  "function setItem(pid,i,v)",
  "function setCredit(pid,i,v)",
  "p.items.filter(x=>x.selected)",
  "p.credits.filter(x=>x.selected)",
  "function toggleAll(v){current.forEach(p=>{p.items.forEach(x=>x.selected=v)"
]);
ok('single-item selection and manual credit compensation markers are present');

mustContain('drive-sync-v2.js', [
  "ROOT_FOLDER_ID='1ZE0blT7_qZzxdJL54uGhZfsaFIVUk9up'",
  "function beginFullRefreshTransaction()",
  "localStorage.setItem(ARCHIVE_KEY,JSON.stringify({condomini:{}}))",
  "function rollbackFullRefreshTransaction()",
  "function recoverInterruptedTransaction()",
  "const checker=window.condoSelfCheckV1",
  "const audit=await checker.auditFile",
  "if(!audit.ok)throw new Error",
  "const auditSummary=checker.finalize(ok.length)",
  "const fresh=verifyFreshArchive(tx.startedAt)",
  "const protectedCheck=verifyProtectedData(tx)",
  "if(result.updated!==rows.length)",
  ".sort((a,b)=>a.name.localeCompare(b.name,'it'))"
]);
mustNotContain('drive-sync-v2.js', ["state[key]===currentSig"]);
ok('Drive V2 reloads every balance, runs self-check, verifies fresh memory/protected data and rolls back on failure');

mustContain('whatsapp-v6.js', [
  "input.value='';",
  "p.phone='';",
  "location.href='whatsapp://send?text='+text",
  "const k=contactKeyLocal(p);"
]);
ok('WhatsApp contact ownership isolation markers are present');

let changed = [];
try {
  const out = execFileSync('git', ['diff','--name-only',`${baseline.baseline_commit}..HEAD`,'--',...baseline.protected_runtime_files], {encoding:'utf8'});
  changed = out.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).sort();
} catch (e) {
  fail('Unable to calculate protected runtime diff from baseline commit: '+e.message);
}
if (!changed.length) ok('no protected runtime file changed from frozen baseline');
else {
  console.log('Protected runtime changes detected:', changed.join(', '));
  const approved = [...(auth.approved_changed_runtime_files||[])].sort();
  if (JSON.stringify(changed)!==JSON.stringify(approved)) fail('protected runtime changes are not exactly listed in qa/CHANGE_AUTHORIZATION.json');
  const failedGates = Object.entries(auth.regression_gates||{}).filter(([,v])=>v!==true).map(([k])=>k);
  if (failedGates.length) fail('runtime change authorization incomplete; gates still false: '+failedGates.join(', '));
  else ok('protected runtime changes have explicit complete regression authorization');
}

if (process.exitCode) process.exit(process.exitCode);
console.log('\nQA LOCK PASSED');

import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const read = p => fs.readFileSync(p, 'utf8');
const baseline = JSON.parse(read('qa/QA_BASELINE.json'));
const auth = JSON.parse(read('qa/CHANGE_AUTHORIZATION.json'));
const fail = msg => { console.error('\nQA LOCK FAILED: '+msg); process.exitCode = 1; };
const ok = msg => console.log('OK - '+msg);
const mustContain = (file, needles) => {
  const text = read(file);
  for (const needle of needles) {
    if (!text.includes(needle)) fail(`${file} no longer contains protected marker: ${needle}`);
  }
};
const mustNotContain = (file, needles) => {
  const text = read(file);
  for (const needle of needles) {
    if (text.includes(needle)) fail(`${file} contains forbidden regression marker: ${needle}`);
  }
};

// 1) Entrypoint and patch order: the test app must keep the already-tested chain.
const appCurrent = read('app-current.html');
const ordered = [
  'engine-v6.js?v=20260911-conguagli5',
  'unit-identity-fix-v1.js?v=20260911-unit2',
  'conguaglio-position-fix-v2.js?v=20260911-rates4'
];
let last = -1;
for (const marker of ordered) {
  const i = appCurrent.indexOf(marker);
  if (i < 0) fail(`app-current.html missing protected script ${marker}`);
  if (i <= last) fail(`app-current.html changed protected script order around ${marker}`);
  last = i;
}
if (/qa\//i.test(appCurrent)) fail('QA files must never be loaded by the runtime app');
else ok('test entrypoint keeps engine -> unit identity -> month fix order and QA stays non-runtime');

// 2) Conguaglio safety markers.
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

// 3) Ordinary/future-month protection markers. Real-file regression remains mandatory.
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

// 4) Credits and per-item selection must remain manual.
mustContain('legacy-v28.html', [
  "function setItem(pid,i,v)",
  "function setCredit(pid,i,v)",
  "p.items.filter(x=>x.selected)",
  "p.credits.filter(x=>x.selected)",
  "function toggleAll(v){current.forEach(p=>{p.items.forEach(x=>x.selected=v)"
]);
ok('single-item selection and manual credit compensation markers are present');

// 5) Official Drive pin, pruning, ordering.
mustContain('drive-sync-v1.js', [
  "ROOT_FOLDER_ID='1ZE0blT7_qZzxdJL54uGhZfsaFIVUk9up'",
  "function pruneLocalToDrive(rows)",
  ".sort((a,b)=>a.name.localeCompare(b.name,'it'))"
]);
ok('official Drive root, prune and order markers are present');

// 6) Contact ownership isolation and WhatsApp fallback.
mustContain('whatsapp-v6.js', [
  "input.value='';",
  "p.phone='';",
  "location.href='whatsapp://send?text='+text",
  "const k=contactKeyLocal(p);"
]);
ok('WhatsApp contact ownership isolation markers are present');

// 7) Change-control gate: any protected runtime change relative to the frozen
// baseline requires explicit authorization plus all regression gates = true.
let changed = [];
try {
  const out = execFileSync('git', ['diff','--name-only',`${baseline.baseline_commit}..HEAD`,'--',...baseline.protected_runtime_files], {encoding:'utf8'});
  changed = out.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).sort();
} catch (e) {
  fail('Unable to calculate protected runtime diff from baseline commit: '+e.message);
}

if (!changed.length) {
  ok('no protected runtime file changed from frozen baseline');
} else {
  console.log('Protected runtime changes detected:', changed.join(', '));
  const approved = [...(auth.approved_changed_runtime_files||[])].sort();
  if (JSON.stringify(changed)!==JSON.stringify(approved)) {
    fail('protected runtime changes are not exactly listed in qa/CHANGE_AUTHORIZATION.json');
  }
  const required = Object.entries(auth.regression_gates||{});
  const failedGates = required.filter(([,v])=>v!==true).map(([k])=>k);
  if (failedGates.length) fail('runtime change authorization incomplete; gates still false: '+failedGates.join(', '));
  else ok('protected runtime changes have explicit complete regression authorization');
}

if (process.exitCode) process.exit(process.exitCode);
console.log('\nQA LOCK PASSED');

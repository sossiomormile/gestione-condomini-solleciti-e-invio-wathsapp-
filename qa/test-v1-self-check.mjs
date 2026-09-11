import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=p=>fs.readFileSync(p,'utf8');
const fail=m=>{console.error('V1 SELF CHECK TEST FAILED: '+m);process.exitCode=1};
const must=(file,needles)=>{const t=read(file);for(const n of needles)if(!t.includes(n))fail(`${file} missing: ${n}`)};

try{execFileSync(process.execPath,['--check','v1-self-check.js'],{stdio:'pipe'});execFileSync(process.execPath,['--check','v1-self-check-cents-v2.js'],{stdio:'pipe'});execFileSync(process.execPath,['--check','drive-sync-v2.js'],{stdio:'pipe'})}catch(e){fail('JavaScript syntax check failed: '+String(e.stderr||e.message))}

must('v1-self-check.js',[
  'function compareOrdinaryAndOrder(people,source)',
  "filter(x=>x.type==='ordinary')",
  'if(order<=lastOrder)',
  'function parseCongSource(wb)',
  'function compareConguagli(wb,fileName,people,sourceCong)',
  '(expectedResult.unresolved||[]).filter',
  'function finalize(expectedCount)',
  'AUTOCOLLAUDO AGGIORNAMENTO SUPERATO',
  'window.condoSelfCheckV1={auditWorkbook,auditFile,resetBatch,add,finalize,renderBatchSummary'
]);

must('v1-self-check-cents-v2.js',[
  'const cents=round2(bal)',
  "roundingBasis:'singola posizione arrotondata a 2 decimali'",
  'api.auditFile=async function',
  'window.condoSelfCheckCentsV2={roundedSourceConguagli,normalize}'
]);

must('drive-sync-v2.js',[
  "const checker=window.condoSelfCheckV1",
  'const audit=await checker.auditFile',
  'if(!audit.ok)throw new Error',
  'const auditSummary=checker.finalize(ok.length)',
  'if(!auditSummary.ok)throw new Error',
  'const fresh=verifyFreshArchive(tx.startedAt)',
  'const protectedCheck=verifyProtectedData(tx)',
  'rollbackFullRefreshTransaction()',
  'renderBatchSummary(result.audit)'
]);

const app=read('app-current.html'),self=app.indexOf('v1-self-check.js?v=20260911-selfcheck1'),cents=app.indexOf('v1-self-check-cents-v2.js?v=20260911-cents1'),drive=app.indexOf('drive-sync-v2.js?v=20260911-fullrefresh2');
if(self<0||cents<0||drive<0||self>=cents||cents>=drive)fail('self-check cents correction must load after self-check and before Drive V2');
if(app.includes('drive-sync-v1.js'))fail('obsolete Drive V1 must not be loaded');

if(process.exitCode)process.exit(process.exitCode);
console.log('V1 SELF CHECK TEST PASSED');

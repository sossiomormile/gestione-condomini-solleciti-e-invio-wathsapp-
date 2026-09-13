import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=p=>fs.readFileSync(p,'utf8');
const fail=m=>{console.error('V1 SELF CHECK TEST FAILED: '+m);process.exitCode=1};
const must=(file,needles)=>{const t=read(file);for(const n of needles)if(!t.includes(n))fail(`${file} missing: ${n}`)};

try{
  for(const f of ['v1-self-check.js','v1-self-check-cents-v2.js','v1-deep-check-v2.js','v1-cent-consistency-v1.js','update-certification-v1.js','drive-sync-v4.js'])execFileSync(process.execPath,['--check',f],{stdio:'pipe'});
}catch(e){fail('JavaScript syntax check failed: '+String(e.stderr||e.message))}

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

must('v1-deep-check-v2.js',[
  'function deepAudit(wb,people,fileName)',
  'rate ordinarie complessive app',
  'totale ordinario app',
  "for(const f of ['scala','interno','piano','sub'])",
  'window.condoDeepCheckV2={parseSource,deepAudit}'
]);

must('v1-cent-consistency-v1.js',[
  'function preciseOrdinaryAudit(wb,people,fileName)',
  'expectedTotal',
  'actualTotal',
  'window.condoV1CentConsistencyV1={preciseOrdinaryAudit,reconcile,legacyOrdinaryError}'
]);

must('update-certification-v1.js',[
  "const V='update-certification-v1'",
  'function inspectPeople(people,sourceMap)',
  'function certifyWorkbook(wb,people,folderName,fileName,report)',
  'Ricalcolo indipendente del motore',
  'totale lordo incoerente',
  'Totali conguagli Drive/motore/app non coincidono al centesimo',
  'window.condoUpdateCertificationV1={version:V,active:true'
]);

must('drive-sync-v4.js',[
  "const checker=window.condoSelfCheckV1",
  "if(!window.condoDeepCheckV2)throw new Error",
  "if(!window.condoUpdateCertificationV1?.active)throw new Error",
  "rows.filter(r=>r.state!=='ok'||r.validated!==true)",
  'const audit=await checker.auditFile',
  'if(!audit.ok)throw new Error',
  'const auditSummary=checker.finalize(ok.length)',
  'if(!auditSummary.ok)throw new Error',
  'const archiveCheck=verifyArchiveMatchesDrive(rows,tx.startedAt)',
  'const protectedCheck=verifyProtectedData(tx)',
  'rollbackFullRefreshTransaction()',
  'renderBatchSummary(result.audit)',
  'window.condoDriveSyncV4=publicApi;window.condoDriveSyncV3=publicApi'
]);

const app=read('app-current.html'),self=app.indexOf('v1-self-check.js?v=20260911-selfcheck1'),cents=app.indexOf('v1-self-check-cents-v2.js?v=20260911-cents1'),deep=app.indexOf('v1-deep-check-v2.js?v=20260911-deep1'),centConsistency=app.indexOf('v1-cent-consistency-v1.js?v=20260912-centconsistency1'),cert=app.indexOf('update-certification-v1.js?v=20260913-cert1'),drive=app.indexOf('drive-sync-v4.js?v=20260913-cert1');
if(self<0||cents<0||deep<0||centConsistency<0||cert<0||drive<0||self>=cents||cents>=deep||deep>=centConsistency||centConsistency>=cert||cert>=drive)fail('self-check layers must load in order: base -> cents -> deep -> cent consistency -> certification -> Drive V4');
if(app.includes('drive-sync-v1.js')||app.includes('drive-sync-v2.js')||app.includes('drive-sync-v3.js'))fail('obsolete Drive runtime must not be loaded by app-current');

if(process.exitCode)process.exit(process.exitCode);
console.log('V1 SELF CHECK TEST PASSED');

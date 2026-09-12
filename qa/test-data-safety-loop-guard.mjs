import fs from 'node:fs';

const src=fs.readFileSync('data-safety-v6.js','utf8');
const fail=msg=>{console.error('FAIL - '+msg);process.exit(1)};
const ok=msg=>console.log('OK - '+msg);

if(src.includes("forEach(x=>x.textContent='V6')")) fail('scrittura badge V6 ancora incondizionata');
if(!src.includes("if(x.textContent!=='V6')x.textContent='V6'")) fail('manca guardia contro riscrittura badge identico');
if(!src.includes('let queued=false')) fail('manca coda anti-rientro del MutationObserver');
if(!src.includes('if(queued)return;queued=true;setTimeout(run,0)')) fail('MutationObserver non differisce il patch fuori dal callback');

let queued=false,scheduled=0,patches=0;
const timers=[];
const setLater=fn=>{scheduled++;timers.push(fn)};
const observerCallback=()=>{if(queued)return;queued=true;setLater(()=>{queued=false;patches++})};
for(let i=0;i<100;i++) observerCallback();
if(scheduled!==1) fail('raffica di 100 mutazioni pianifica piu di un patch concorrente');
while(timers.length) timers.shift()();
if(patches!==1||queued) fail('la coda non torna in stato stabile dopo il patch');
ok('MutationObserver coalesces a mutation burst and the V6 badge write is idempotent');

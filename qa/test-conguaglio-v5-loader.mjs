import fs from 'node:fs';
for (const file of ['index.html','app-current.html']) {
  const s=fs.readFileSync(file,'utf8');
  const v4=s.indexOf('duplicate-conguaglio-variant-total-fix-v4.js');
  const v5=s.indexOf('conguaglio-identity-strict-fix-v5.js');
  const cents=s.indexOf('ordinary-cent-guard-v1.js');
  if(v5<0) throw new Error(`${file}: loader V5 assente`);
  if(!(v4>=0 && v4<v5 && v5<cents)) throw new Error(`${file}: ordine loader V4 -> V5 -> cents non valido`);
}
console.log('CONGUAGLIO V5 LOADER TEST PASSED');

import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:412,height:915},isMobile:true,hasTouch:true});
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.condoUpdateCertificationV1,{timeout:20000});
  await page.waitForFunction(()=>!!window.condoDriveSyncV4,{timeout:20000});
  const state=await page.evaluate(()=>({
    cert:window.condoUpdateCertificationV1?.version,
    active:window.condoUpdateCertificationV1?.active,
    driveV4:!!window.condoDriveSyncV4,
    aliasV3:window.condoDriveSyncV3===window.condoDriveSyncV4,
    sourceRules:Object.keys(window.condoDriveSyncV4?.sourceRules||{}).length,
    current15:['Condominio Clanio 2','Condominio Demacoop','Condominio Di Lorenzo','Condominio Di.Be','Condominio F.lli Caruso C.so Vitt. Emenuele','Condominio F.lli Caruso Via Lupoli','Condominio Globo','CONDOMINIO NEW GATE','Condominio Parco Gardenia','Condominio Parco Iris','Condominio Parco Pantani','Condominio Parco San Nazario','PARCO DEL SOLE','PARCO KAROL','parco oliteama'].map(n=>[n,window.condoUpdateCertificationV1.expectedSource(n)])
  }));
  if(state.cert!=='update-certification-v1'||state.active!==true) throw new Error('Certificazione V1 non attiva');
  if(!state.driveV4||!state.aliasV3) throw new Error('Drive V4/alias V3 non attivi');
  if(state.sourceRules<15) throw new Error('Regole sorgente insufficienti');
  for(const [n,p] of state.current15) if(!p) throw new Error('Sorgente certificata mancante: '+n);
  const btn=page.locator('#folderBtn');await btn.waitFor({state:'visible'});
  const box=await btn.boundingBox();if(!box||box.x<0||box.x+box.width>413) throw new Error('AGGIORNA fuori viewport Android');
  const cardText=await btn.locator('xpath=ancestor::*[contains(@class,"card")][1]').innerText();
  for(const s of ['bilancio certificato','righe Incassi','centesimi','totali lordi','conguagli']) if(!cardText.toLowerCase().includes(s.toLowerCase())) throw new Error('Descrizione AGGIORNA manca: '+s);
  console.log('UPDATE CERTIFICATION BROWSER TEST PASSED',JSON.stringify({viewport:412,currentCondos:15,sourceRules:state.sourceRules,driveV4:true}));
} finally {await browser.close();}

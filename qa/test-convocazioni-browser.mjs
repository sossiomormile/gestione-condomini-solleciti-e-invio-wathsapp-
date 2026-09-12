import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:412,height:915},isMobile:true,hasTouch:true});
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.condoConvocazioniTemplateV2,{timeout:20000});
  const launcher=page.locator('#c2open');
  await launcher.waitFor({state:'visible'});
  const box=await launcher.boundingBox();
  if(!box||box.x<0||box.x+box.width>413) throw new Error('Launcher Convocazioni V2 fuori viewport Android');
  const before=await page.evaluate(()=>({archive:localStorage.getItem('condo_archive_v5'),contacts:localStorage.getItem('condo_contacts_v5'),last:localStorage.getItem('condo_last_update_v5')}));
  await launcher.click();
  await page.locator('#c2ov').waitFor({state:'visible'});
  const text=await page.locator('#c2ov').innerText();
  for(const s of ['CONVOCAZIONI','TEST MODELLI ORIGINALI','I modelli originali non vengono sovrascritti','Nessun file contabile viene modificato']) if(!text.includes(s)) throw new Error('Interfaccia V2 manca: '+s);
  const sample={type:'ordinaria',doc:'2026-09-12',d1:'2026-10-04',t1:'23:30',p1:'area box condominio',d2:'2026-10-06',t2:'19:00',p2:'condominio',odg:['Bilancio','Varie'],att:['Consuntivo'],note:''};
  const validation=await page.evaluate(s=>window.condoConvocazioniTemplateV2.valid(s),sample);
  if(validation.length) throw new Error('Validazione campione V2 fallita: '+validation.join(','));
  const after=await page.evaluate(()=>({archive:localStorage.getItem('condo_archive_v5'),contacts:localStorage.getItem('condo_contacts_v5'),last:localStorage.getItem('condo_last_update_v5')}));
  if(JSON.stringify(before)!==JSON.stringify(after)) throw new Error('Convocazioni V2 ha alterato chiavi core');
  console.log('CONVOCAZIONI V2 BROWSER TEST PASSED',JSON.stringify({viewport:412,launcherWidth:Math.round(box.width),protectedCore:true}));
} finally {await browser.close();}

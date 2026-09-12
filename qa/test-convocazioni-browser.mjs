import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:412,height:915},isMobile:true,hasTouch:true});
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.condoConvocazioniV1,{timeout:20000});
  const launcher=page.locator('#convOpenBtn');
  await launcher.waitFor({state:'visible'});
  const box=await launcher.boundingBox();
  if(!box||box.x<0||box.x+box.width>413) throw new Error('Launcher convocazioni fuori viewport Android');
  const protectedBefore=await page.evaluate(()=>({archive:localStorage.getItem('condo_archive_v5'),contacts:localStorage.getItem('condo_contacts_v5')}));
  await launcher.click();
  await page.locator('#convModuleOverlay').waitFor({state:'visible'});
  const title=await page.locator('#convModuleOverlay').innerText();
  if(!title.includes('CONVOCAZIONI')||!title.includes('modulo isolato')) throw new Error('Interfaccia convocazioni incompleta');
  const sample={condoName:'PARCO PANTANI',type:'ordinaria',docDate:'2026-09-12',date1:'2026-10-04',time1:'23:30',place1:'il condominio',date2:'2026-10-06',time2:'19:00',place2:'il condominio',odg:['Esame bilancio consuntivo','Conferma amministratore','Varie ed eventuali'],attachments:['Bilancio consuntivo','Bilancio preventivo'],note:'Presentare eventuali proposte economiche.'};
  const result=await page.evaluate(sample=>({html:window.condoConvocazioniV1.renderPreviewHtml(sample),print:window.condoConvocazioniV1.printablePage(sample),valid:window.condoConvocazioniV1.validate(sample)}),sample);
  if(!result.valid.ok) throw new Error('Validazione campione non superata');
  for(const s of ['PARCO PANTANI','04/10/2026','06/10/2026','Esame bilancio consuntivo','Bilancio preventivo','DELEGA']) if(!result.html.includes(s)) throw new Error('Anteprima manca: '+s);
  if(!result.print.includes('@page')||!result.print.includes('size:A4')) throw new Error('Pagina PDF A4 non configurata');
  const protectedAfter=await page.evaluate(()=>({archive:localStorage.getItem('condo_archive_v5'),contacts:localStorage.getItem('condo_contacts_v5')}));
  if(JSON.stringify(protectedBefore)!==JSON.stringify(protectedAfter)) throw new Error('Il modulo ha alterato dati core');
  console.log('CONVOCAZIONI BROWSER TEST PASSED',JSON.stringify({viewport:412,launcherWidth:Math.round(box.width),htmlChars:result.html.length,protectedCore:true}));
} finally {await browser.close();}

import { chromium } from 'playwright';

const fail=m=>{throw new Error(m)};
const url=process.env.PUBLIC_URL;
if(!url)fail('PUBLIC_URL mancante');
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({
    viewport:{width:412,height:915},screen:{width:412,height:915},deviceScaleFactor:2.625,isMobile:true,hasTouch:true,
    userAgent:'Mozilla/5.0 (Linux; Android 16; 25100RA69G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
  });
  const page=await context.newPage();
  const pageErrors=[];const failed=[];
  page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
  page.on('requestfailed',r=>failed.push(r.url()+': '+(r.failure()?.errorText||'failed')));
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  if(!response?.ok())fail('GitHub Pages non raggiungibile: HTTP '+response?.status());
  await page.waitForFunction(()=>
    typeof window.condoAnalyzeV6==='function' &&
    !!window.condoDuplicateUnitRebuildV2 &&
    !!window.condoDuplicateConguaglioPositionFixV3 &&
    !!window.condoConguaglioVariantTotalFixV4 &&
    !!window.condoSelfCheckV1 &&
    !!window.condoSelfCheckUnresolvedV3 &&
    !!window.condoDeepCheckV2 &&
    !!window.condoDriveSyncV3,
  {timeout:90000});
  const state=await page.evaluate(()=>({
    title:document.title==='Condominio_App 1.0',
    v4:!!window.condoConguaglioVariantTotalFixV4,
    driveV3:!!window.condoDriveSyncV3,
    deep:!!window.condoDeepCheckV2,
    noTestBadge:!/TEST V3|TEST V4|V3\+V4/i.test(document.body.innerText||''),
    hasUpdate:/AGGIORNA/i.test(document.body.innerText||''),
    bodyWidth:document.documentElement.scrollWidth,
    viewport:window.innerWidth
  }));
  for(const [k,v] of Object.entries(state))if(!['bodyWidth','viewport'].includes(k)&&v!==true)fail('public production check: '+k);
  if(state.viewport>430||state.bodyWidth>state.viewport+2)fail('layout Android non valido: '+JSON.stringify(state));
  if(pageErrors.length)fail('errori JavaScript: '+pageErrors.join(' | '));
  const relevantFailed=failed.filter(x=>!x.includes('google')&&!x.includes('gstatic'));
  if(relevantFailed.length)fail('richieste runtime fallite: '+relevantFailed.join(' | '));
  console.log('PUBLIC PAGES PRODUCTION SMOKE PASSED',JSON.stringify(state));
} finally {await browser.close()}

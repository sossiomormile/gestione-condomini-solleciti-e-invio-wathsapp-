import { chromium } from 'playwright';

const fail = msg => { throw new Error(msg); };
const url = process.env.TEST_URL || 'http://127.0.0.1:4173/app-current.html';
const browser = await chromium.launch({headless:true});
try {
  const context = await browser.newContext({
    viewport:{width:412,height:915},
    screen:{width:412,height:915},
    deviceScaleFactor:2.625,
    isMobile:true,
    hasTouch:true,
    userAgent:'Mozilla/5.0 (Linux; Android 16; 25100RA69G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
  });
  const page = await context.newPage();
  const pageErrors=[];
  const failedLocal=[];
  page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
  page.on('requestfailed',r=>{ if(r.url().startsWith('http://127.0.0.1:4173/')) failedLocal.push(r.url()+': '+(r.failure()?.errorText||'failed')); });
  const response = await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  if(!response?.ok()) fail('app-current non raggiungibile: HTTP '+response?.status());
  await page.waitForFunction(()=>{
    const b=document.querySelector('#boot');
    return b && getComputedStyle(b).display==='none';
  },{timeout:30000});
  const frame = page.frames().find(f=>f.url().includes('legacy-v28.html'));
  if(!frame) fail('iframe legacy-v28 non caricato');
  await frame.waitForFunction(()=>
    !!window.XLSX &&
    typeof window.condoAnalyzeV6==='function' &&
    !!window.condoDuplicateUnitRebuildV2 &&
    !!window.condoDuplicateConguaglioPositionFixV3 &&
    !!window.condoSelfCheckV1 &&
    !!window.condoSelfCheckUnresolvedV3 &&
    !!window.condoDeepCheckV2
  ,{timeout:30000});
  const state = await frame.evaluate(()=>({
    xlsx:!!window.XLSX,
    analyze:typeof window.condoAnalyzeV6==='function',
    duplicateV2:!!window.condoDuplicateUnitRebuildV2,
    duplicateV3:!!window.condoDuplicateConguaglioPositionFixV3,
    selfCheck:!!window.condoSelfCheckV1,
    unresolvedGuard:!!window.condoSelfCheckUnresolvedV3,
    deepCheck:!!window.condoDeepCheckV2,
    hasUpdate:/AGGIORNA/i.test(document.body.innerText||''),
    bodyWidth:document.documentElement.scrollWidth,
    viewport:window.innerWidth
  }));
  for(const [k,v] of Object.entries(state)){
    if(['bodyWidth','viewport'].includes(k)) continue;
    if(v!==true) fail('runtime mobile: controllo non superato: '+k);
  }
  if(state.viewport>430) fail('viewport mobile non applicato: '+state.viewport);
  if(failedLocal.length) fail('richieste locali fallite: '+failedLocal.join(' | '));
  if(pageErrors.length) fail('errori JavaScript browser: '+pageErrors.join(' | '));
  console.log('MOBILE RUNTIME BROWSER TEST PASSED',JSON.stringify(state));
} finally {
  await browser.close();
}

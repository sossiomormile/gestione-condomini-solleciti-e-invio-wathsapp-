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
  await context.addInitScript(()=>{
    window.__nativePickerCalls=0;
    try{Object.defineProperty(window,'showDirectoryPicker',{configurable:true,writable:true,value:async()=>{window.__nativePickerCalls++;return{name:'NATIVE_PICKER_SHOULD_NOT_OPEN'}}})}catch(e){}
    window.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}})}}};
  });
  const page=await context.newPage();
  page.on('dialog',d=>d.dismiss());
  const pageErrors=[];const failed=[];
  page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
  page.on('requestfailed',r=>failed.push(r.url()+': '+(r.failure()?.errorText||'failed')));
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  if(!response?.ok())fail('GitHub Pages non raggiungibile: HTTP '+response?.status());
  await page.waitForFunction(()=>
    typeof window.condoAnalyzeV6==='function' &&
    !!window.condoV1SourceScopeV2 &&
    !!window.condoDuplicateUnitRebuildV2 &&
    !!window.condoDuplicateConguaglioPositionFixV3 &&
    !!window.condoConguaglioVariantTotalFixV4 &&
    !!window.condoConguaglioIdentityStrictFixV5 &&
    !!window.condoSelfCheckV1 &&
    !!window.condoSelfCheckUnresolvedV3 &&
    !!window.condoDeepCheckV2 &&
    !!window.condoUpdateCertificationV1?.active &&
    !!window.condoAndroidLocalFolderGuardV1?.active &&
    !!window.condoDriveSyncV4,
  {timeout:90000});
  const state=await page.evaluate(()=>({
    title:document.title==='Condominio_App 1.0',
    sourceScope:window.condoV1SourceScopeV2?.version==='v1-source-scope-v2',
    v4:!!window.condoConguaglioVariantTotalFixV4,
    v5:!!window.condoConguaglioIdentityStrictFixV5,
    driveV4:!!window.condoDriveSyncV4,
    guard:window.condoAndroidLocalFolderGuardV1?.active===true,
    android:window.condoAndroidLocalFolderGuardV1?.isAndroid===true,
    pickerBlocked:window.condoAndroidLocalFolderGuardV1?.pickerBlocked===true,
    certification:window.condoUpdateCertificationV1?.active===true,
    deep:!!window.condoDeepCheckV2,
    noTestBadge:!/TEST V3|TEST V4|V3\+V4/i.test(document.body.innerText||''),
    hasUpdate:document.getElementById('folderBtn')?.textContent?.trim()==='AGGIORNA',
    native:window.__nativePickerCalls||0,
    bodyWidth:document.documentElement.scrollWidth,
    viewport:window.innerWidth
  }));
  for(const [k,v] of Object.entries(state))if(!['native','bodyWidth','viewport'].includes(k)&&v!==true)fail('public production check: '+k+' '+JSON.stringify(state));
  if(state.native!==0)fail('selettore cartella locale invocato prima del click');
  if(state.viewport>430||state.bodyWidth>state.viewport+2)fail('layout Android non valido: '+JSON.stringify(state));
  await page.locator('#folderBtn').click();
  await page.waitForTimeout(150);
  const after=await page.evaluate(()=>({
    native:window.__nativePickerCalls||0,
    blocked:window.condoAndroidLocalFolderGuardV1?.blockedNativeCalls||0,
    text:document.getElementById('folderBtn')?.textContent?.trim(),
    disabled:!!document.getElementById('folderBtn')?.disabled,
    status:document.getElementById('status')?.textContent||''
  }));
  if(after.native!==0)fail('AGGIORNA pubblico ha aperto il selettore cartella locale');
  if(after.blocked!==0)fail('vecchio handler locale ha raggiunto showDirectoryPicker');
  if(after.text!=='CERTIFICAZIONE…'||!after.disabled)fail('AGGIORNA pubblico non gestito da Drive V4: '+JSON.stringify(after));
  if(!/Collegamento a Google Drive/i.test(after.status))fail('flusso Google Drive pubblico non avviato: '+JSON.stringify(after));
  if(pageErrors.length)fail('errori JavaScript: '+pageErrors.join(' | '));
  const relevantFailed=failed.filter(x=>!x.includes('google')&&!x.includes('gstatic'));
  if(relevantFailed.length)fail('richieste runtime fallite: '+relevantFailed.join(' | '));
  console.log('PUBLIC PAGES PRODUCTION V1 SCOPE ANDROID SMOKE PASSED',JSON.stringify({state,after}));
} finally {await browser.close()}

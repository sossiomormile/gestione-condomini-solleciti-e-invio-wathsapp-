import { chromium } from 'playwright';
const base='http://127.0.0.1:4173';
const fail=m=>{throw new Error(m)};
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:412,height:915},screen:{width:412,height:915},deviceScaleFactor:2.625,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 16; 25100RA69G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'});
 await context.addInitScript(()=>{
   window.__nativePickerCalls=0;
   try{Object.defineProperty(window,'showDirectoryPicker',{configurable:true,writable:true,value:async()=>{window.__nativePickerCalls++;return{name:'NATIVE_PICKER_SHOULD_NOT_OPEN'}}})}catch(e){}
   window.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}})}}};
 });
 const page=await context.newPage();
 page.on('dialog',d=>d.dismiss());
 async function assertFrame(frame,label){
   await frame.waitForFunction(()=>!!window.condoAndroidLocalFolderGuardV1&&!!window.condoDriveSyncV4&&document.getElementById('folderBtn')?.textContent?.trim()==='AGGIORNA',{timeout:60000});
   const before=await frame.evaluate(()=>({guard:window.condoAndroidLocalFolderGuardV1?.active===true,android:window.condoAndroidLocalFolderGuardV1?.isAndroid===true,pickerBlocked:window.condoAndroidLocalFolderGuardV1?.pickerBlocked===true,blocked:window.condoAndroidLocalFolderGuardV1?.blockedNativeCalls||0,native:window.__nativePickerCalls||0,text:document.getElementById('folderBtn')?.textContent?.trim()}));
   if(!before.guard||!before.android||!before.pickerBlocked||before.blocked!==0||before.native!==0||before.text!=='AGGIORNA')fail(label+': stato iniziale guardia/Drive errato '+JSON.stringify(before));
   await frame.locator('#folderBtn').click();
   await frame.waitForTimeout(100);
   const after=await frame.evaluate(()=>({blocked:window.condoAndroidLocalFolderGuardV1?.blockedNativeCalls||0,native:window.__nativePickerCalls||0,text:document.getElementById('folderBtn')?.textContent?.trim(),disabled:!!document.getElementById('folderBtn')?.disabled,status:document.getElementById('status')?.textContent||''}));
   if(after.native!==0)fail(label+': selettore cartella nativo Android aperto');
   if(after.blocked!==0)fail(label+': vecchio handler locale ha raggiunto showDirectoryPicker');
   if(after.text!=='CERTIFICAZIONE…'||!after.disabled)fail(label+': click non gestito da AGGIORNA Drive '+JSON.stringify(after));
   if(!/Collegamento a Google Drive/i.test(after.status))fail(label+': flusso Drive non avviato '+JSON.stringify(after));
 }
 await page.goto(base+'/app-current.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.querySelector('#boot')&&getComputedStyle(document.querySelector('#boot')).display==='none',{timeout:60000});
 const iframe=page.frames().find(f=>f.url().includes('legacy-v28.html'));
 if(!iframe)fail('app-current: iframe legacy non trovato');
 await assertFrame(iframe,'app-current');
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>!!window.condoAndroidLocalFolderGuardV1&&!!window.condoDriveSyncV4,{timeout:60000});
 await assertFrame(page.mainFrame(),'index');
 console.log('ANDROID AGGIORNA NO LOCAL PICKER TEST PASSED');
} finally {await browser.close()}

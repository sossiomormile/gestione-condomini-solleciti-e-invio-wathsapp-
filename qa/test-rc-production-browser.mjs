import { chromium } from 'playwright';

const fail = msg => { throw new Error(msg); };
const base='http://127.0.0.1:4173';
const sent={
  contacts:'{"sentinel":"CONTACTS_OK"}',
  hist:'HISTORY_OK',
  cfg:'CONFIG_OK',
  archive:'{"condomini":{"SIMULAZIONE PREESISTENTE":{"people":[{"name":"Mario Rossi","items":[{"type":"ordinary","amount":100}],"credits":[]}]}}}',
  sync:'{"old":"SYNC_OK"}',
  update:'UPDATE_OK'
};
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

  await page.goto(base+'/legacy-v28.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(s=>{
    localStorage.clear();sessionStorage.clear();
    localStorage.setItem('condo_contacts_v5',s.contacts);
    localStorage.setItem('condo_hist_v28_sim',s.hist);
    localStorage.setItem('condo_cfg_v28_sim',s.cfg);
    localStorage.setItem('condo_archive_v5',s.archive);
    localStorage.setItem('condo_drive_sync_state_v7',s.sync);
    localStorage.setItem('condo_last_update_v5',s.update);
  },sent);

  const response=await page.goto(base+'/app-current.html',{waitUntil:'domcontentloaded',timeout:30000});
  if(!response?.ok())fail('RC app-current non raggiungibile: HTTP '+response?.status());
  await page.waitForFunction(()=>document.querySelector('#boot')&&getComputedStyle(document.querySelector('#boot')).display==='none',{timeout:60000});
  const frame=page.frames().find(f=>f.url().includes('legacy-v28.html'));
  if(!frame)fail('iframe legacy-v28 non caricato');
  await frame.waitForFunction(()=>
    !!window.XLSX && typeof window.condoAnalyzeV6==='function' &&
    !!window.condoDuplicateUnitRebuildV2 && !!window.condoDuplicateConguaglioPositionFixV3 &&
    !!window.condoConguaglioVariantTotalFixV4 && !!window.condoSelfCheckV1 &&
    !!window.condoSelfCheckUnresolvedV3 && !!window.condoDeepCheckV2 && !!window.condoDriveSyncV3
  ,{timeout:60000});

  const startup=await frame.evaluate(s=>({
    contacts:localStorage.getItem('condo_contacts_v5')===s.contacts,
    hist:localStorage.getItem('condo_hist_v28_sim')===s.hist,
    cfg:localStorage.getItem('condo_cfg_v28_sim')===s.cfg,
    archive:localStorage.getItem('condo_archive_v5')===s.archive,
    sync:localStorage.getItem('condo_drive_sync_state_v7')===s.sync,
    update:localStorage.getItem('condo_last_update_v5')===s.update,
    noTx:!localStorage.getItem('condo_drive_full_refresh_tx_v3'),
    v4:!!window.condoConguaglioVariantTotalFixV4,
    driveV3:!!window.condoDriveSyncV3,
    noTestBadge:!/TEST V3|TEST V4|V3\+V4/i.test(document.body.innerText||''),
    hasUpdate:/AGGIORNA/i.test(document.body.innerText||''),
    bodyWidth:document.documentElement.scrollWidth,viewport:window.innerWidth
  }),sent);
  for(const [k,v] of Object.entries(startup))if(!['bodyWidth','viewport'].includes(k)&&v!==true)fail('avvio produzione: controllo non superato: '+k);
  if(startup.bodyWidth>startup.viewport+2)fail('overflow orizzontale mobile: '+startup.bodyWidth+' > '+startup.viewport);

  const tx=await frame.evaluate(s=>{
    const api=window.condoDriveSyncV3;
    api.beginFullRefreshTransaction();
    const during={
      archive:localStorage.getItem('condo_archive_v5'),
      sync:localStorage.getItem('condo_drive_sync_state_v7'),
      update:localStorage.getItem('condo_last_update_v5'),
      contacts:localStorage.getItem('condo_contacts_v5'),
      hist:localStorage.getItem('condo_hist_v28_sim'),cfg:localStorage.getItem('condo_cfg_v28_sim'),
      tx:!!localStorage.getItem('condo_drive_full_refresh_tx_v3')
    };
    api.rollbackFullRefreshTransaction();
    const after={
      archive:localStorage.getItem('condo_archive_v5'),sync:localStorage.getItem('condo_drive_sync_state_v7'),
      update:localStorage.getItem('condo_last_update_v5'),contacts:localStorage.getItem('condo_contacts_v5'),
      hist:localStorage.getItem('condo_hist_v28_sim'),cfg:localStorage.getItem('condo_cfg_v28_sim'),
      tx:!!localStorage.getItem('condo_drive_full_refresh_tx_v3')
    };
    return {during,after};
  },sent);
  if(tx.during.archive!=='{"condomini":{}}'||tx.during.sync!==null||tx.during.update!==null||!tx.during.tx)fail('transazione AGGIORNA: stato temporaneo inatteso');
  if(tx.during.contacts!==sent.contacts||tx.during.hist!==sent.hist||tx.during.cfg!==sent.cfg)fail('transazione AGGIORNA ha modificato dati protetti');
  if(tx.after.archive!==sent.archive||tx.after.sync!==sent.sync||tx.after.update!==sent.update||tx.after.contacts!==sent.contacts||tx.after.hist!==sent.hist||tx.after.cfg!==sent.cfg||tx.after.tx)fail('rollback AGGIORNA non ha ripristinato integralmente lo stato');

  await frame.evaluate(()=>window.condoDriveSyncV3.beginFullRefreshTransaction());
  await page.reload({waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#boot')&&getComputedStyle(document.querySelector('#boot')).display==='none',{timeout:60000});
  const frame2=page.frames().find(f=>f.url().includes('legacy-v28.html'));
  await frame2.waitForFunction(()=>!!window.condoDriveSyncV3,{timeout:60000});
  const recovery=await frame2.evaluate(s=>({
    archive:localStorage.getItem('condo_archive_v5')===s.archive,
    sync:localStorage.getItem('condo_drive_sync_state_v7')===s.sync,
    update:localStorage.getItem('condo_last_update_v5')===s.update,
    contacts:localStorage.getItem('condo_contacts_v5')===s.contacts,
    hist:localStorage.getItem('condo_hist_v28_sim')===s.hist,
    cfg:localStorage.getItem('condo_cfg_v28_sim')===s.cfg,
    tx:!localStorage.getItem('condo_drive_full_refresh_tx_v3')
  }),sent);
  for(const [k,v] of Object.entries(recovery))if(v!==true)fail('recupero aggiornamento interrotto: '+k);

  if(failed.length)fail('richieste fallite: '+failed.join(' | '));
  if(pageErrors.length)fail('errori JavaScript browser: '+pageErrors.join(' | '));
  console.log('RC PRODUCTION SIMULATION PASSED',JSON.stringify({startup,transactionRollback:true,interruptedRecovery:true,protectedData:true,v4:true,driveV3:true}));
} finally { await browser.close(); }

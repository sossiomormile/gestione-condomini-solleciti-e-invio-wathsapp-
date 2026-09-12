import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync('drive-sync-v2.js','utf8');
class StorageMock{
  constructor(){this.m=new Map()}
  getItem(k){return this.m.has(k)?this.m.get(k):null}
  setItem(k,v){this.m.set(k,String(v))}
  removeItem(k){this.m.delete(k)}
}
const localStorage=new StorageMock(),sessionStorage=new StorageMock();
localStorage.setItem('condo_archive_v5',JSON.stringify({condomini:{OLD:{title:'OLD',people:[{name:'Old'}]}}}));
localStorage.setItem('condo_drive_sync_state_v7',JSON.stringify({old:'sig'}));
localStorage.setItem('condo_contacts_v5',JSON.stringify({A:{phone:'333'}}));
localStorage.setItem('condo_hist_v28_TEST',JSON.stringify([{channel:'WhatsApp'}]));
const context={
  window:{},localStorage,sessionStorage,console,URLSearchParams,Date,JSON,Promise,Set,File:class{},fetch:async()=>{throw new Error('fetch non previsto nel test')},
  document:{readyState:'loading',addEventListener:()=>{},getElementById:()=>null,createElement:()=>({}),head:{appendChild:()=>{}}},
  renderArchiveHome:()=>{}
};
vm.createContext(context);vm.runInContext(code,context);
const api=context.window.condoDriveSyncV2;if(!api)throw new Error('API drive-sync-v2 non esposta');
const oldArchive=localStorage.getItem('condo_archive_v5'),oldSync=localStorage.getItem('condo_drive_sync_state_v7'),contacts=localStorage.getItem('condo_contacts_v5'),history=localStorage.getItem('condo_hist_v28_TEST');
api.beginFullRefreshTransaction();
if(localStorage.getItem('condo_archive_v5')!==JSON.stringify({condomini:{}}))throw new Error('Archivio non svuotato prima della ricostruzione');
if(localStorage.getItem('condo_drive_sync_state_v7')!==null)throw new Error('Stato sync non azzerato');
if(!localStorage.getItem('condo_drive_full_refresh_tx_v2'))throw new Error('Backup transazione mancante');
if(localStorage.getItem('condo_contacts_v5')!==contacts||localStorage.getItem('condo_hist_v28_TEST')!==history)throw new Error('Contatti/storico alterati');
localStorage.setItem('condo_archive_v5',JSON.stringify({condomini:{PARTIAL:{}}}));localStorage.setItem('condo_drive_sync_state_v7','partial');
api.rollbackFullRefreshTransaction();
if(localStorage.getItem('condo_archive_v5')!==oldArchive||localStorage.getItem('condo_drive_sync_state_v7')!==oldSync)throw new Error('Rollback non ripristina i dati precedenti');
api.beginFullRefreshTransaction();
const fresh=JSON.stringify({condomini:{NEW:{title:'NEW',people:[{name:'New'}]}}});localStorage.setItem('condo_archive_v5',fresh);localStorage.setItem('condo_drive_sync_state_v7',JSON.stringify({new:'sig2'}));
api.commitFullRefreshTransaction();
if(localStorage.getItem('condo_archive_v5')!==fresh)throw new Error('Commit ha alterato il nuovo archivio');
if(localStorage.getItem('condo_drive_full_refresh_tx_v2')!==null)throw new Error('Backup transazione non eliminato dopo commit');
if(localStorage.getItem('condo_contacts_v5')!==contacts||localStorage.getItem('condo_hist_v28_TEST')!==history)throw new Error('Contatti/storico non preservati dopo commit');
if(code.includes('state[key]===currentSig'))throw new Error('È ancora presente il salto dei file invariati');
if(!code.includes("ROOT_FOLDER_ID='1ZE0blT7_qZzxdJL54uGhZfsaFIVUk9up'"))throw new Error('Root Drive ufficiale non protetta');
console.log('DRIVE FULL REFRESH TEST PASSED');

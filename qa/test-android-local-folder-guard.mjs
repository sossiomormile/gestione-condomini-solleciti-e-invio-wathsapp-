import fs from 'node:fs';
import vm from 'node:vm';
const guard=fs.readFileSync('android-local-folder-guard-v1.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app-current.html','utf8');
for(const [name,html] of [['index',index],['app-current',app]]){
  const g=html.indexOf('android-local-folder-guard-v1.js');
  const d=html.indexOf('drive-sync-v4.js?v=20260916-androidguard1');
  if(g<0||d<0||g>d)throw new Error(`${name}: guardia Android non caricata prima di Drive V4`);
}
if(!/showDirectoryPicker/.test(guard)||!/Android/i.test(guard)||!/stopImmediatePropagation/.test(guard))throw new Error('Guardia Android incompleta');
const listeners={};let nativeCalls=0,status={textContent:''};
const button={closest:s=>s==='#folderBtn'?button:null};
const document={getElementById:id=>id==='status'?status:null,addEventListener:(t,fn,c)=>{listeners[t]=fn}};
const context={
  navigator:{userAgent:'Mozilla/5.0 (Linux; Android 16) Chrome/140 Mobile'},
  document,
  DOMException,
  window:{showDirectoryPicker:async()=>{nativeCalls++;return{};}},
  console
};
context.window.window=context.window;context.window.document=document;context.window.navigator=context.navigator;context.window.DOMException=DOMException;
vm.createContext(context);vm.runInContext(guard,context);
const api=context.window.condoAndroidLocalFolderGuardV1;
if(!api?.active||!api.isAndroid||!api.pickerBlocked)throw new Error('Guardia Android non attiva');
let prevented=0,stopped=0,immediate=0;
listeners.click({target:button,preventDefault:()=>prevented++,stopPropagation:()=>stopped++,stopImmediatePropagation:()=>immediate++});
if(prevented!==1||stopped!==1||immediate!==1)throw new Error('Click locale pre-Drive non bloccato');
if(!/Google Drive/i.test(status.textContent))throw new Error('Messaggio di attesa Drive assente');
try{await context.window.showDirectoryPicker()}catch(e){}
if(nativeCalls!==0)throw new Error('Il selettore cartella nativo Android è stato raggiunto');
if(api.blockedNativeCalls!==1)throw new Error('Invocazione cartella locale non neutralizzata');
context.window.condoDriveSyncV4={};prevented=stopped=immediate=0;
listeners.click({target:button,preventDefault:()=>prevented++,stopPropagation:()=>stopped++,stopImmediatePropagation:()=>immediate++});
if(prevented||stopped||immediate)throw new Error('La guardia interferisce con AGGIORNA Drive pronto');
console.log('ANDROID LOCAL FOLDER GUARD TEST PASSED');

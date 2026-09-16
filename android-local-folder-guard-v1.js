(()=>{
'use strict';
const VERSION='android-local-folder-guard-v1';
const isAndroid=/Android/i.test(String(navigator?.userAgent||''));
let blockedNativeCalls=0,originalPicker=null;
function setStatus(msg){try{const el=document.getElementById('status');if(el)el.textContent=msg}catch(e){}}
function installPickerBlock(){
 if(!isAndroid||typeof window.showDirectoryPicker!=='function')return false;
 try{
   originalPicker=window.showDirectoryPicker;
   const blocked=async()=>{blockedNativeCalls++;throw new DOMException('Selettore cartella locale disattivato su Android','AbortError')};
   Object.defineProperty(window,'showDirectoryPicker',{configurable:true,writable:true,value:blocked});
   return true;
 }catch(e){return false}
}
function onClick(e){
 const btn=e?.target?.closest?.('#folderBtn');
 if(!btn||!isAndroid)return;
 if(window.condoDriveSyncV4)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 setStatus('Attendi il caricamento di AGGIORNA da Google Drive…');
}
document.addEventListener('click',onClick,true);
const pickerBlocked=installPickerBlock();
window.condoAndroidLocalFolderGuardV1={version:VERSION,active:true,isAndroid,pickerBlocked,get blockedNativeCalls(){return blockedNativeCalls},get originalPicker(){return originalPicker}};
})();

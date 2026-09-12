(()=>{
'use strict';
const ARCHIVE='condo_archive_v5';
let forcedTitle='';
function read(){try{return JSON.parse(localStorage.getItem(ARCHIVE)||'{"condomini":{}}')}catch(e){return{condomini:{}}}}
function write(a){localStorage.setItem(ARCHIVE,JSON.stringify(a))}
function cleanup(){const a=read();let changed=false;for(const k of Object.keys(a.condomini||{})){if(/^BILANCIO(?:\s|$)/i.test(k)){delete a.condomini[k];changed=true}}if(changed)write(a)}
window.condoSetFolderTitle=function(title){forcedTitle=String(title||'').trim()};
window.condoClearFolderTitle=function(){forcedTitle=''};
function patch(){if(typeof render!=='function'){setTimeout(patch,25);return}const original=render;render=function(fileName,wb){
  original(fileName,wb);
  if(!forcedTitle)return;
  const wrong=(building?.textContent||'').trim();
  const a=read();
  const rec=a.condomini?.[wrong];
  if(rec){delete a.condomini[wrong];rec.title=forcedTitle;rec.folderTitle=forcedTitle;a.condomini[forcedTitle]=rec;write(a)}
  if(building)building.textContent=forcedTitle;
  try{if(typeof renderArchiveHome==='function')renderArchiveHome()}catch(e){}
};cleanup()}
patch();
})();
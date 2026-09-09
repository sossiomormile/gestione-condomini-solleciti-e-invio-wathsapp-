(()=>{
'use strict';
const style=document.createElement('style');
style.textContent='[data-open-condo]{display:none!important}#driveCondoArea{display:none!important}.archive-dropdown-wrap{margin-top:12px}';
document.head.appendChild(style);
let timer=null,obs=null,buildingMenu=false;
function openByTitle(title){
  if(!title)return;
  try{
    if(typeof openCached==='function'){openCached(title);return;}
  }catch(e){console.warn('openCached non disponibile',e)}
  const home=document.getElementById('archiveHome');
  const b=[...(home?.querySelectorAll('[data-open-condo]')||[])].find(x=>x.dataset.openCondo===title);
  if(b)b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
}
function transformArchive(){
  if(buildingMenu)return;
  const home=document.getElementById('archiveHome');if(!home)return;
  const buttons=[...home.querySelectorAll('[data-open-condo]')];if(!buttons.length)return;
  buildingMenu=true;
  const previous=home.querySelector('#archiveCondoSelect')?.value||'';
  home.querySelector('.archive-dropdown-wrap')?.remove();
  const wrap=document.createElement('div');wrap.className='archive-dropdown-wrap';
  const select=document.createElement('select');select.id='archiveCondoSelect';select.style.cssText='width:100%;padding:14px;border:1px solid #ccd2da;border-radius:10px;background:#fff;font-size:16px';
  const first=document.createElement('option');first.value='';first.textContent='Seleziona un condominio…';select.appendChild(first);
  buttons.forEach(b=>{const title=b.dataset.openCondo||b.querySelector('b')?.textContent||'';if(!title)return;const o=document.createElement('option');o.value=title;o.textContent=title;select.appendChild(o)});
  if(previous&&[...select.options].some(o=>o.value===previous))select.value=previous;
  select.addEventListener('change',e=>{const title=e.target.value;if(title)openByTitle(title)});
  wrap.appendChild(select);home.appendChild(wrap);
  buildingMenu=false;
}
function schedule(){if(buildingMenu)return;clearTimeout(timer);timer=setTimeout(transformArchive,20)}
function start(){const home=document.getElementById('archiveHome');if(home){obs=new MutationObserver(schedule);obs.observe(home,{childList:true,subtree:true});transformArchive()}else setTimeout(start,25)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
(()=>{
'use strict';
const style=document.createElement('style');
style.textContent='[data-open-condo]{display:none!important}#driveCondoArea{display:none!important}.archive-dropdown-wrap{margin-top:12px}';
document.head.appendChild(style);
let timer=null,obs=null;
function transformArchive(){
  const home=document.getElementById('archiveHome');
  if(!home)return;
  const buttons=[...home.querySelectorAll('[data-open-condo]')];
  const old=home.querySelector('.archive-dropdown-wrap');
  if(old)old.remove();
  if(!buttons.length)return;
  const wrap=document.createElement('div');wrap.className='archive-dropdown-wrap';
  const select=document.createElement('select');select.id='archiveCondoSelect';
  select.style.cssText='width:100%;padding:14px;border:1px solid #ccd2da;border-radius:10px;background:#fff;font-size:16px';
  const first=document.createElement('option');first.value='';first.textContent='Seleziona un condominio…';first.selected=true;select.appendChild(first);
  buttons.forEach((b,i)=>{const o=document.createElement('option');o.value=String(i);const title=b.dataset.openCondo||b.querySelector('b')?.textContent||('Condominio '+(i+1));o.textContent=title;select.appendChild(o)});
  select.addEventListener('change',()=>{const i=Number(select.value);if(Number.isInteger(i)&&buttons[i])buttons[i].click()});
  wrap.appendChild(select);home.appendChild(wrap);
}
function schedule(){clearTimeout(timer);timer=setTimeout(transformArchive,0)}
function start(){const home=document.getElementById('archiveHome');if(home){obs=new MutationObserver(schedule);obs.observe(home,{childList:true,subtree:true});transformArchive()}else setTimeout(start,25)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
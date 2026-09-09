(()=>{
'use strict';
function transformArchive(){
  const home=document.getElementById('archiveHome');
  if(!home)return;
  const buttons=[...home.querySelectorAll('[data-open-condo]')];
  if(!buttons.length)return;
  const old=home.querySelector('.archive-dropdown-wrap');
  if(old)old.remove();
  buttons.forEach(b=>b.style.display='none');
  const wrap=document.createElement('div');
  wrap.className='archive-dropdown-wrap';
  wrap.style.cssText='margin-top:12px';
  const select=document.createElement('select');
  select.id='archiveCondoSelect';
  select.style.cssText='width:100%;padding:14px;border:1px solid #ccd2da;border-radius:10px;background:#fff;font-size:16px';
  const first=document.createElement('option');
  first.value='';
  first.textContent='Seleziona un condominio…';
  first.disabled=true;
  first.selected=true;
  select.appendChild(first);
  buttons.forEach((b,i)=>{
    const o=document.createElement('option');
    o.value=String(i);
    const title=b.dataset.openCondo||b.querySelector('b')?.textContent||('Condominio '+(i+1));
    const details=b.querySelector('span')?.textContent?.trim()||'';
    o.textContent=details?title+' — '+details:title;
    select.appendChild(o);
  });
  const open=document.createElement('button');
  open.textContent='APRI CONDOMINIO';
  open.disabled=true;
  open.style.cssText='width:100%;margin-top:10px;padding:14px;border:0;border-radius:10px;background:#174a7a;color:white;font-weight:800;font-size:16px';
  select.addEventListener('change',()=>{open.disabled=!select.value});
  open.addEventListener('click',()=>{const i=Number(select.value);if(Number.isInteger(i)&&buttons[i])buttons[i].click()});
  wrap.appendChild(select);wrap.appendChild(open);
  home.appendChild(wrap);
}
let timer=null;
function schedule(){clearTimeout(timer);timer=setTimeout(transformArchive,50)}
const obs=new MutationObserver(schedule);
function start(){const home=document.getElementById('archiveHome');if(home){obs.observe(home,{childList:true,subtree:true});transformArchive()}else setTimeout(start,100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
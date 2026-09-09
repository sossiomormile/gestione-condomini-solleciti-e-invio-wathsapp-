(()=>{
'use strict';
const style=document.createElement('style');
style.textContent='[data-open-condo]{display:none!important}#driveCondoArea{display:none!important}.archive-dropdown-wrap{margin-top:12px}';
document.head.appendChild(style);
let obs=null,lastSignature='';
function getButtons(){const home=document.getElementById('archiveHome');return home?[...home.querySelectorAll('[data-open-condo]')]:[]}
function openCondo(title){const b=getButtons().find(x=>(x.dataset.openCondo||'')===title);if(b){b.click();return true}return false}
function buildMenu(){
 const home=document.getElementById('archiveHome');if(!home)return;
 const buttons=getButtons();if(!buttons.length)return;
 const titles=buttons.map(b=>b.dataset.openCondo||'').filter(Boolean);
 const sig=titles.join('\u0001');
 if(sig===lastSignature && home.querySelector('#archiveCondoSelect'))return;
 lastSignature=sig;
 home.querySelector('.archive-dropdown-wrap')?.remove();
 const wrap=document.createElement('div');wrap.className='archive-dropdown-wrap';
 const select=document.createElement('select');select.id='archiveCondoSelect';select.style.cssText='width:100%;padding:14px;border:1px solid #ccd2da;border-radius:10px;background:#fff;font-size:16px;position:relative;z-index:20;pointer-events:auto';
 select.innerHTML='<option value="">Seleziona un condominio…</option>'+titles.map(t=>'<option></option>').join('');
 titles.forEach((t,i)=>{select.options[i+1].value=t;select.options[i+1].textContent=t});
 select.onchange=function(){const title=this.value;if(!title)return;openCondo(title)};
 wrap.appendChild(select);home.appendChild(wrap);
}
function start(){const home=document.getElementById('archiveHome');if(!home){setTimeout(start,50);return}buildMenu();obs=new MutationObserver(()=>{const sig=getButtons().map(b=>b.dataset.openCondo||'').filter(Boolean).join('\u0001');if(sig!==lastSignature)setTimeout(buildMenu,0)});obs.observe(home,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
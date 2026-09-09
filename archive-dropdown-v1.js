(()=>{
'use strict';
const style=document.createElement('style');style.textContent='[data-open-condo]{display:none!important}#driveCondoArea{display:none!important}.archive-dropdown-wrap{margin-top:12px}';document.head.appendChild(style);
let obs=null,lastSignature='';
function home(){return document.getElementById('archiveHome')}
function buttons(){const h=home();return h?[...h.querySelectorAll('[data-open-condo]')]:[]}
function openCondo(title){const b=buttons().find(x=>(x.dataset.openCondo||'')===title);if(b){b.click();return true}return false}
function build(){const h=home();if(!h)return;const bs=buttons(),titles=bs.map(b=>b.dataset.openCondo||'').filter(Boolean);if(!titles.length)return;const sig=titles.join('\u0001');const existing=h.querySelector('#archiveCondoSelect');if(existing&&sig===lastSignature)return;lastSignature=sig;h.querySelector('.archive-dropdown-wrap')?.remove();const wrap=document.createElement('div');wrap.className='archive-dropdown-wrap';const sel=document.createElement('select');sel.id='archiveCondoSelect';sel.setAttribute('aria-label','Seleziona condominio');sel.style.cssText='display:block!important;width:100%!important;min-height:52px;padding:12px;border:1px solid #ccd2da;border-radius:10px;background:#fff;font-size:16px;position:relative;z-index:9999;pointer-events:auto';const first=document.createElement('option');first.value='';first.textContent='Seleziona un condominio…';sel.appendChild(first);titles.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;sel.appendChild(o)});sel.addEventListener('change',()=>{if(sel.value)openCondo(sel.value)});wrap.appendChild(sel);const head=h.firstElementChild;head?.insertAdjacentElement('afterend',wrap);if(!head)h.prepend(wrap)}
function schedule(){setTimeout(build,0);setTimeout(build,100);setTimeout(build,400)}
function start(){const h=home();if(!h){setTimeout(start,50);return}build();obs=new MutationObserver(()=>schedule());obs.observe(h,{childList:true,subtree:false});window.addEventListener('condo-archive-updated',schedule)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
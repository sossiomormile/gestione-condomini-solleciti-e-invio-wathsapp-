(()=>{
'use strict';

// V1 operativa: solo rate ordinarie + conguagli + WhatsApp.
// Le spese straordinarie/spese individuali e i relativi crediti restano nel motore,
// ma vengono escluse dal flusso operativo senza modificare engine-v6 o il resolver conguagli.
const nrm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const allowedItem=x=>x&&((x.type==='ordinary')||(x.type==='cong'));
const allowedCredit=c=>{
  const s=nrm(c?.label);
  return s.includes('CONGUAGLIO')||s.includes('DARE-AVERE')||s.includes('INCASSI ORDINARI');
};
function focusPerson(p){
  if(!p)return p;
  p.items=(p.items||[]).filter(allowedItem);
  p.credits=(p.credits||[]).filter(allowedCredit);
  if(p._v6){
    p._v6.gross=Math.round(p.items.reduce((s,x)=>s+(Number(x.amount)||0),0)*100)/100;
    p._v6.v1Focus='ordinary+conguagli+whatsapp';
  }
  return p;
}
function focusCurrent(){
  if(typeof current!=='undefined'&&Array.isArray(current))current.forEach(focusPerson);
}
function hideNonV1Actions(box){
  if(!box)return;
  const mail=box.querySelector('.mail');if(mail)mail.style.display='none';
  const legal=box.querySelector('.legal');if(legal)legal.style.display='none';
  const addr=box.querySelector('input[id^="addr"]');if(addr?.parentElement)addr.parentElement.style.display='none';
  box.querySelectorAll('.required-missing').forEach(x=>x.style.display='none');
}
function simplifyGlobalUi(){
  document.querySelectorAll('.card').forEach(card=>{
    const t=nrm(card.textContent);
    if(t.includes('DATI OBBLIGATORI PER LA MESSA IN MORA'))card.style.display='none';
  });
  const src=document.getElementById('source');
  if(src&&!src.dataset.v1focus){
    src.dataset.v1focus='1';
    const note=document.createElement('div');
    note.className='muted';
    note.style.marginTop='5px';
    note.innerHTML='<b>V1 operativa:</b> rate ordinarie + conguagli + WhatsApp. Spese straordinarie temporaneamente escluse.';
    src.insertAdjacentElement('afterend',note);
  }
}

if(typeof render==='function'){
  const baseRender=render;
  render=function(fileName,wb){
    focusCurrent();
    const out=baseRender(fileName,wb);
    focusCurrent();
    simplifyGlobalUi();
    return out;
  };
}
if(typeof renderPerson==='function'){
  const baseRenderPerson=renderPerson;
  renderPerson=function(p){
    focusPerson(p);
    const out=baseRenderPerson(p);
    hideNonV1Actions(document.getElementById('p'+p.id));
    return out;
  };
}
if(typeof calc==='function'){
  const baseCalc=calc;
  calc=function(p){focusPerson(p);return baseCalc(p)};
}
if(typeof message==='function'){
  const baseMessage=message;
  message=function(p){focusPerson(p);return baseMessage(p)};
}
if(typeof toggleAll==='function'){
  const baseToggleAll=toggleAll;
  toggleAll=function(v){focusCurrent();return baseToggleAll(v)};
}

window.condoV1Focus={focusPerson,focusCurrent,allowedItem,allowedCredit};

function setup(){focusCurrent();simplifyGlobalUi();if(Array.isArray(current))current.forEach(p=>hideNonV1Actions(document.getElementById('p'+p.id)))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();

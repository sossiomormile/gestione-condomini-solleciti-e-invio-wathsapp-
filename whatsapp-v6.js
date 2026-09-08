(()=>{
'use strict';
function cleanPhone(v){return String(v||'').replace(/\D/g,'')}
function contactKey(p){return [String(window.building?.textContent||''),p.name,p.scala,p.interno].map(x=>String(x??'').trim().toUpperCase()).join('|')}
function savePhone(p,phone){
  try{
    const key='condo_contacts_v5';
    const all=JSON.parse(localStorage.getItem(key)||'{}');
    const k=contactKey(p);
    all[k]=Object.assign({},all[k]||{},{phone:String(phone||'')});
    localStorage.setItem(key,JSON.stringify(all));
    p.phone=String(phone||'');
  }catch(e){}
}
function simplifyContacts(){
  document.querySelectorAll('.v5rubrica').forEach(btn=>{btn.style.display='none';});
  document.querySelectorAll('.v5contacts').forEach(box=>{
    if(!box.querySelector('.wa-note')){
      const note=document.createElement('div');
      note.className='wa-note muted';
      note.style.marginTop='7px';
      note.textContent='Se il numero non è già memorizzato, premi WhatsApp e scegli il destinatario direttamente in WhatsApp.';
      box.appendChild(note);
    }
  });
}
function patchWhatsapp(){
  if(typeof window.whatsapp!=='function' || typeof window.calc!=='function' || typeof window.message!=='function')return;
  window.whatsapp=function(id){
    const p=window.current[id],c=window.calc(p);
    const input=document.querySelector('#p'+id+' .v5phone');
    const raw=(input?.value||p.phone||'').trim();
    const phone=cleanPhone(raw);
    const text=encodeURIComponent(window.message(p));
    if(phone){
      savePhone(p,raw);
      try{window.addHistory(p,'WhatsApp · '+raw+' · apertura invio',c.net)}catch(e){}
      try{localStorage.setItem('condo_last_whatsapp_v6',JSON.stringify({ts:new Date().toISOString(),condominio:String(window.building?.textContent||''),condomino:p.name,scala:p.scala,interno:p.interno,phone:raw,amount:c.net}))}catch(e){}
      location.href='https://wa.me/'+phone+'?text='+text;
      return;
    }
    try{window.addHistory(p,'WhatsApp · selezione destinatario',c.net)}catch(e){}
    try{localStorage.setItem('condo_last_whatsapp_v6',JSON.stringify({ts:new Date().toISOString(),condominio:String(window.building?.textContent||''),condomino:p.name,scala:p.scala,interno:p.interno,phone:'',amount:c.net}))}catch(e){}
    location.href='https://api.whatsapp.com/send?text='+text;
  };
}
function setup(){simplifyContacts();patchWhatsapp();const obs=new MutationObserver(()=>{simplifyContacts();patchWhatsapp()});obs.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
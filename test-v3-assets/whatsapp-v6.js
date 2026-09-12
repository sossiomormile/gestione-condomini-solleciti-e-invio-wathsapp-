(()=>{
'use strict';
const PENDING_KEY='condo_wa_pending_v7';
const CONTACT_KEY='condo_contacts_v5';
function cleanPhone(v){return String(v||'').replace(/\D/g,'')}
function contactKeyLocal(p){return [String(building?.textContent||''),p.name,p.scala,p.interno].map(x=>String(x??'').trim().toUpperCase()).join('|')}
function getAllContacts(){try{return JSON.parse(localStorage.getItem(CONTACT_KEY)||'{}')}catch(e){return {}}}
function getSavedContact(p){return getAllContacts()[contactKeyLocal(p)]||null}
function savePhoneLocal(p,phone){
  try{
    const all=getAllContacts();
    const k=contactKeyLocal(p);
    all[k]=Object.assign({},all[k]||{},{phone:String(phone||'')});
    localStorage.setItem(CONTACT_KEY,JSON.stringify(all));
    p.phone=String(phone||'');
    const input=document.querySelector('#p'+p.id+' .v5phone');
    if(input){input.value=String(phone||'');input.dataset.ownerChecked='1'}
  }catch(e){}
}
function protectOwnerContacts(){
  try{
    if(typeof current==='undefined'||!Array.isArray(current))return;
    current.forEach(p=>{
      const input=document.querySelector('#p'+p.id+' .v5phone');
      if(!input||input.dataset.ownerChecked==='1')return;
      const saved=getSavedContact(p);
      if(saved&&cleanPhone(saved.phone)){
        input.value=String(saved.phone||'');
        p.phone=String(saved.phone||'');
      }else{
        // Nessun contatto salvato per QUESTO nominativo: non ereditare mai il numero dell'occupante/proprietario precedente.
        input.value='';
        p.phone='';
      }
      input.dataset.ownerChecked='1';
    });
  }catch(e){}
}
function simplifyContacts(){
  document.querySelectorAll('.v5rubrica').forEach(btn=>{btn.style.display='none';});
  protectOwnerContacts();
  document.querySelectorAll('.v5contacts').forEach(box=>{
    if(!box.querySelector('.wa-note')){
      const note=document.createElement('div');
      note.className='wa-note muted';
      note.style.marginTop='7px';
      note.textContent='Primo invio: scegli il destinatario in WhatsApp. Quando torni qui, salva una sola volta il suo numero; resterà memorizzato per i prossimi invii. Se cambia proprietario, il numero non viene trasferito al nuovo nominativo.';
      box.appendChild(note);
    }
  });
}
function pendingPerson(){
  try{
    const d=JSON.parse(localStorage.getItem(PENDING_KEY)||'null');
    if(!d)return null;
    const p=(current||[]).find(x=>String(x.name||'')===String(d.name||'')&&String(x.scala||'')===String(d.scala||'')&&String(x.interno||'')===String(d.interno||''));
    return p||null;
  }catch(e){return null}
}
function askSavePending(){
  const p=pendingPerson();
  if(!p)return;
  const saved=getSavedContact(p);
  const existing=cleanPhone(saved?.phone||'');
  if(existing){localStorage.removeItem(PENDING_KEY);return}
  setTimeout(()=>{
    const value=prompt('Salva il numero WhatsApp di '+p.name+' per i prossimi invii.\nInseriscilo una sola volta (es. 3331234567):','');
    if(value===null)return;
    const phone=cleanPhone(value);
    if(!phone){alert('Numero non salvato. Potrai inserirlo al prossimo invio.');return}
    savePhoneLocal(p,value.trim());
    localStorage.removeItem(PENDING_KEY);
    alert('Numero WhatsApp salvato per '+p.name+'. Dai prossimi invii si aprirà direttamente la sua chat.');
  },350);
}
function patchWhatsapp(){
  if(typeof whatsapp!=='function' || typeof calc!=='function' || typeof message!=='function')return;
  whatsapp=function(id){
    const p=current[id],c=calc(p);
    const input=document.querySelector('#p'+id+' .v5phone');
    const saved=getSavedContact(p);
    const typed=(input?.value||'').trim();
    const raw=typed||(saved?.phone||'').trim();
    const phone=cleanPhone(raw);
    const text=encodeURIComponent(message(p));
    if(phone){
      savePhoneLocal(p,raw);
      try{addHistory(p,'WhatsApp · '+raw+' · apertura invio',c.net)}catch(e){}
      location.href='https://wa.me/'+phone+'?text='+text;
      return;
    }
    try{localStorage.setItem(PENDING_KEY,JSON.stringify({name:p.name,scala:p.scala,interno:p.interno,ts:new Date().toISOString()}))}catch(e){}
    try{addHistory(p,'WhatsApp · selezione destinatario',c.net)}catch(e){}
    location.href='whatsapp://send?text='+text;
  };
}
function onReturn(){if(document.visibilityState==='visible')askSavePending()}
function setup(){simplifyContacts();patchWhatsapp();document.addEventListener('visibilitychange',onReturn);window.addEventListener('pageshow',askSavePending);const obs=new MutationObserver(()=>{simplifyContacts();patchWhatsapp()});obs.observe(document.body,{childList:true,subtree:true});askSavePending()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
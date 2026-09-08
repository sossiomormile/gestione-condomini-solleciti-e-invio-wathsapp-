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
function enhanceRubrica(){
  document.querySelectorAll('.v5rubrica').forEach(btn=>{btn.textContent='📇 Scegli dalla rubrica';});
}
function patchWhatsapp(){
  if(typeof window.whatsapp!=='function' || typeof window.calc!=='function' || typeof window.message!=='function')return;
  window.whatsapp=function(id){
    const p=window.current[id],c=window.calc(p);
    const input=document.querySelector('#p'+id+' .v5phone');
    const raw=(input?.value||p.phone||'').trim();
    const phone=cleanPhone(raw);
    if(!phone){alert('Scegli prima il numero dalla rubrica del telefono.');return}
    savePhone(p,raw);
    try{window.addHistory(p,'WhatsApp · '+raw+' · apertura invio',c.net)}catch(e){}
    try{localStorage.setItem('condo_last_whatsapp_v6',JSON.stringify({ts:new Date().toISOString(),condominio:String(window.building?.textContent||''),condomino:p.name,scala:p.scala,interno:p.interno,phone:raw,amount:c.net}))}catch(e){}
    location.href='https://wa.me/'+phone+'?text='+encodeURIComponent(window.message(p));
  };
}
function setup(){enhanceRubrica();patchWhatsapp();const obs=new MutationObserver(()=>{enhanceRubrica();patchWhatsapp()});obs.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
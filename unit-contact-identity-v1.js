(()=>{
'use strict';
const CONTACT_KEY='condo_contacts_v5';
const PENDING_KEY='condo_wa_pending_v8';
const OLD_PENDING_KEY='condo_wa_pending_v7';
const norm=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const cleanPhone=v=>String(v||'').replace(/\D/g,'');
function currentList(){try{return typeof current!=='undefined'&&Array.isArray(current)?current:[]}catch(e){return []}}
function buildingName(){try{return String((typeof building!=='undefined'&&building?.textContent)||document.getElementById('building')?.textContent||'').trim()}catch(e){return ''}}
function legacyContactKey(p){return[buildingName(),p?.name,p?.scala,p?.interno].map(norm).join('|')}
function legacyHistoryKey(p){return'condo_hist_v28_'+norm(buildingName())+'|'+norm(p?.name)+'|'+String(p?.scala??'')+'|'+String(p?.interno??'')}
function sameLegacyUnit(a,b){return norm(a?.name)===norm(b?.name)&&norm(a?.scala)===norm(b?.scala)&&norm(a?.interno)===norm(b?.interno)}
function sameStructuralUnit(a,b){return sameLegacyUnit(a,b)&&norm(a?.piano)===norm(b?.piano)}
function duplicateStructuralCount(p){return currentList().filter(x=>sameStructuralUnit(x,p)).length}
function unitToken(p){
 const sub=norm(p?.sub);if(sub)return'SUB:'+sub;
 if(duplicateStructuralCount(p)>1){
  const row=Number(p?._sourceRow);if(Number.isFinite(row))return'ROW:'+row;
  const ord=Number(p?._sourceOrder);if(Number.isFinite(ord))return'ORD:'+ord;
  return'ID:'+String(p?.id??'');
 }
 return'UNIT';
}
function key(p){return[buildingName(),p?.name,p?.scala,p?.interno,p?.piano,unitToken(p)].map(norm).join('|')}
function legacyIsUnambiguous(p){return currentList().filter(x=>sameLegacyUnit(x,p)).length===1}
function readContacts(){try{return JSON.parse(localStorage.getItem(CONTACT_KEY)||'{}')}catch(e){return{}}}
function writeContacts(all){localStorage.setItem(CONTACT_KEY,JSON.stringify(all||{}))}
function getContact(p){
 const all=readContacts(),k=key(p);if(all[k])return all[k];
 const old=legacyContactKey(p);if(all[old]&&legacyIsUnambiguous(p)){all[k]={...all[old]};writeContacts(all);return all[k]}
 return{};
}
function setContact(p,data){const all=readContacts(),k=key(p),prev=all[k]||{};all[k]={...prev,phone:String(data?.phone||''),email:String(data?.email||'')};writeContacts(all);p.phone=all[k].phone;p.email=all[k].email;return all[k]}
function personFromInput(el){const body=el?.closest?.('.body');if(!body)return null;const m=String(body.id||'').match(/^p(\d+)$/);if(!m)return null;return currentList()[Number(m[1])]||null}
function syncInputs(){
 for(const p of currentList()){
  const box=document.getElementById('p'+p.id);if(!box)continue;const ph=box.querySelector('.v5phone'),em=box.querySelector('.v5email');if(!ph&&!em)continue;
  const saved=getContact(p);if(ph){ph.value=String(saved.phone||'');p.phone=String(saved.phone||'');ph.dataset.unitIdentityV1='1'}
  if(em){em.value=String(saved.email||'');p.email=String(saved.email||'');em.dataset.unitIdentityV1='1'}
  const badge=box.parentElement?.querySelector('summary .badge');if(badge&&p.sub&&!badge.dataset.subShown){badge.textContent=badge.textContent+' · Sub '+String(p.sub);badge.dataset.subShown='1'}
 }
}
function patchHistory(){
 const newHistKey=p=>{
  const k='condo_hist_v28_'+key(p),old=legacyHistoryKey(p);
  try{if(localStorage.getItem(k)==null&&localStorage.getItem(old)!=null&&legacyIsUnambiguous(p))localStorage.setItem(k,localStorage.getItem(old))}catch(e){}
  return k;
 };
 try{window.histKey=newHistKey;histKey=newHistKey}catch(e){window.histKey=newHistKey}
}
function pendingPerson(){
 try{const d=JSON.parse(localStorage.getItem(PENDING_KEY)||'null');if(!d)return null;return currentList().find(p=>key(p)===String(d.key||''))||null}catch(e){return null}
}
function askSavePending(){
 const p=pendingPerson();if(!p)return;const saved=getContact(p);if(cleanPhone(saved.phone)){localStorage.removeItem(PENDING_KEY);return}
 setTimeout(()=>{
  const value=prompt('Salva il numero WhatsApp di '+p.name+' per questa unità.\nInseriscilo una sola volta (es. 3331234567):','');
  if(value===null)return;const phone=cleanPhone(value);if(!phone){alert('Numero non salvato. Potrai inserirlo al prossimo invio.');return}
  setContact(p,{phone:value.trim(),email:saved.email||''});localStorage.removeItem(PENDING_KEY);syncInputs();alert('Numero WhatsApp salvato per '+p.name+' e per la sua specifica unità.');
 },350);
}
function installWhatsapp(){
 if(typeof calc!=='function'||typeof message!=='function')return;
 const fn=function(id){
  const p=currentList()[id];if(!p)return;const c=calc(p),box=document.getElementById('p'+id),input=box?.querySelector('.v5phone'),saved=getContact(p),typed=String(input?.value||'').trim(),raw=typed||String(saved.phone||'').trim(),phone=cleanPhone(raw),text=encodeURIComponent(message(p));
  if(phone){setContact(p,{phone:raw,email:saved.email||''});try{addHistory(p,'WhatsApp · '+raw+' · apertura invio',c.net)}catch(e){}location.href='https://wa.me/'+phone+'?text='+text;return}
  try{localStorage.setItem(PENDING_KEY,JSON.stringify({key:key(p),ts:new Date().toISOString()}));localStorage.removeItem(OLD_PENDING_KEY)}catch(e){}
  try{addHistory(p,'WhatsApp · selezione destinatario',c.net)}catch(e){}location.href='whatsapp://send?text='+text;
 };
 try{window.whatsapp=fn;whatsapp=fn}catch(e){window.whatsapp=fn}
}
function patchAll(){patchHistory();installWhatsapp();syncInputs()}
function onReturn(){if(document.visibilityState==='visible')askSavePending()}
function setup(){
 try{localStorage.removeItem(OLD_PENDING_KEY)}catch(e){}
 document.addEventListener('change',e=>{
  const el=e.target;if(!el?.classList?.contains('v5phone')&&!el?.classList?.contains('v5email'))return;const p=personFromInput(el);if(!p)return;e.stopImmediatePropagation();const box=document.getElementById('p'+p.id),ph=box?.querySelector('.v5phone'),em=box?.querySelector('.v5email');setContact(p,{phone:ph?.value||'',email:em?.value||''});
 },true);
 document.addEventListener('visibilitychange',onReturn);window.addEventListener('pageshow',askSavePending);
 const obs=new MutationObserver(()=>setTimeout(patchAll,0));obs.observe(document.body,{childList:true,subtree:true});patchAll();askSavePending();
}
window.condoUnitContactIdentityV1={key,legacyContactKey,legacyHistoryKey,legacyIsUnambiguous,getContact,setContact,unitToken,syncInputs,installWhatsapp};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();

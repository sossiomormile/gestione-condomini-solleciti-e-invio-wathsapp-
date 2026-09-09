(()=>{
'use strict';
const DB='condo_persistent_v1',STORE='kv';
const KEYS=['condo_archive_v5','condo_last_update_v5','condo_contacts_v5'];
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function saveAll(){try{const db=await openDb();const tx=db.transaction(STORE,'readwrite'),st=tx.objectStore(STORE);for(const k of KEYS){const v=localStorage.getItem(k);if(v)st.put(v,k)}await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close()}catch(e){console.warn('Backup archivio non disponibile',e)}}
let last='';function syncIfChanged(){const cur=KEYS.map(k=>localStorage.getItem(k)||'').join('\n');if(cur&&cur!==last){last=cur;saveAll()}}
setInterval(syncIfChanged,1500);
window.addEventListener('pagehide',saveAll);
window.addEventListener('beforeunload',saveAll);
setTimeout(syncIfChanged,500);
})();
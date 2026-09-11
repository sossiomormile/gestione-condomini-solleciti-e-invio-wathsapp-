(()=>{
'use strict';
const CLIENT_ID='697823317404-01qj6tn6qcrklsb251cdup5f7imhaoq3.apps.googleusercontent.com';
const SCOPE='https://www.googleapis.com/auth/drive.readonly';
const ROOT_FOLDER_ID='1ZE0blT7_qZzxdJL54uGhZfsaFIVUk9up';
const FOLDER_MIME='application/vnd.google-apps.folder';
const TOKEN_KEY='condo_google_token_v1';
const SYNC_KEY='condo_drive_sync_state_v7';
const ARCHIVE_KEY='condo_archive_v5';
const TX_KEY='condo_drive_full_refresh_tx_v2';
let tokenClient=null,accessToken='',tokenExpiresAt=0;
const SOURCE_RULES={
 'CLANIO 2':'Bilancio 2025-2026.xlsx','CORSO DURANTE 207':'2026/2026.xlsx','D FERRIERO CESA':'2026-2027/Consuntivo 2026 - Preventivo 2027.xlsx','DEL SOLE':'2025-2026.xlsx','DEMACOOP':'2026-2027/Consuntivo 2026 - Preventivo 2027.xlsx','DI LORENZO':'2026/2026.xlsx','DI BE':'2025-2026/Consuntivo 2025 - Preventivo 2026 - MODIFICA.xlsx','F LLI CARUSO C SO VITT EMENUELE':'2026/2026-2027.xlsx','F LLI CARUSO VIA LUPOLI':'2026/2026 - da gen 26.xlsx','GLOBO':'2025-2026/2025-2026.xlsx','LUNA':'2026-2027/Bilancio 2026-2027.xlsx','MIMOSA VIA BUCCINI':'2026-2027/2026-2027.xlsx','NEW GATE':'2026/Bilancio 2026-2027.xlsx','PARCO ACUTIS':'2026-2027/2026-2027.xlsx','PARCO ARCOBALENO':'2026-27/Bilancio 2026-27.xlsx','PARCO GARDENIA':'2026-2027/2026-2027.xlsx','PARCO IRIS':'2025/Consuntivo 2025 - Preventivo 2026.xlsx','PARCO OLITEAMA':'2026/Maggio 26 - Aprile 27.xlsx','PARCO PANTANI':'2026/Consuntivo 2026 - Preventivo 2027.xlsx','PARCO SAN NAZARIO':'2026-2027/Consuntivo 2026-2027.xlsx','PIO IX':'2026/2026-2027.xlsx','RAFFAELLO 2':'2026 - 2027/2026.xlsx','VIA STANZIONE 132':'2026-27/2026-27.xlsx','LA PERLA CESA':'2026/Consuntivo 2026 - 2027.xlsx','PARCO DEL SOLE':'2026/Bilancio 2026.xlsx','PARCO FIORITO':'2026-27/Consuntivo 2026-2027.xlsx','PARCO KAROL':'2025/Consuntivo 2025 - Preventivo 2026.xlsx'
};
const EXCLUDED_CONDOS=new Set(['STARZA','II TRAV P M VERGARA 19']);
const norm=s=>String(s||'').toUpperCase().replace(/CONDOMINIO/g,'').replace(/["'._-]+/g,' ').replace(/\s+/g,' ').trim();
function statusMsg(msg,bad=false){const el=document.getElementById('status');if(el){el.textContent=msg;el.style.color=bad?'#b42318':'#52606d'}}
function safeRenderArchive(){try{if(typeof renderArchiveHome==='function')renderArchiveHome()}catch(e){}}
function snap(key){const value=localStorage.getItem(key);return{exists:value!==null,value}}
function restoreSnap(key,s){if(s?.exists)localStorage.setItem(key,s.value);else localStorage.removeItem(key)}
function beginFullRefreshTransaction(){
 if(localStorage.getItem(TX_KEY))rollbackFullRefreshTransaction();
 const tx={startedAt:new Date().toISOString(),archive:snap(ARCHIVE_KEY),sync:snap(SYNC_KEY)};
 localStorage.setItem(TX_KEY,JSON.stringify(tx));
 localStorage.setItem(ARCHIVE_KEY,JSON.stringify({condomini:{}}));
 localStorage.removeItem(SYNC_KEY);
 safeRenderArchive();
 return tx;
}
function rollbackFullRefreshTransaction(){
 const raw=localStorage.getItem(TX_KEY);if(!raw)return false;
 try{const tx=JSON.parse(raw);restoreSnap(ARCHIVE_KEY,tx.archive);restoreSnap(SYNC_KEY,tx.sync)}catch(e){console.error('Rollback aggiornamento non riuscito',e)}
 localStorage.removeItem(TX_KEY);safeRenderArchive();return true;
}
function commitFullRefreshTransaction(){localStorage.removeItem(TX_KEY);safeRenderArchive()}
function recoverInterruptedTransaction(){if(!localStorage.getItem(TX_KEY))return false;const ok=rollbackFullRefreshTransaction();if(ok)statusMsg('Ripristinati i dati precedenti dopo un aggiornamento interrotto.');return ok}
function restoreToken(){try{const d=JSON.parse(sessionStorage.getItem(TOKEN_KEY)||'null');if(d&&d.token&&Number(d.expiresAt)>Date.now()+60000){accessToken=d.token;tokenExpiresAt=Number(d.expiresAt);return true}}catch(e){}return false}
function rememberToken(r){accessToken=r.access_token||'';tokenExpiresAt=Date.now()+Math.max(60,Number(r.expires_in)||3600)*1000;sessionStorage.setItem(TOKEN_KEY,JSON.stringify({token:accessToken,expiresAt:tokenExpiresAt}))}
function clearToken(){accessToken='';tokenExpiresAt=0;sessionStorage.removeItem(TOKEN_KEY)}
function hasValidToken(){return !!accessToken&&tokenExpiresAt>Date.now()+60000}
function loadGIS(){return new Promise((resolve,reject)=>{if(window.google?.accounts?.oauth2)return resolve();const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Impossibile caricare accesso Google'));document.head.appendChild(s)})}
async function ensureToken(){if(hasValidToken()||restoreToken())return accessToken;await loadGIS();return new Promise((resolve,reject)=>{tokenClient=google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPE,include_granted_scopes:true,callback:r=>{if(r.error)return reject(new Error(r.error));rememberToken(r);resolve(accessToken)}});tokenClient.requestAccessToken({prompt:''})})}
async function driveList(q){let files=[],pageToken='';do{const params={q,fields:'nextPageToken,files(id,name,mimeType,modifiedTime,parents)',orderBy:'name',pageSize:'1000',spaces:'drive'};if(pageToken)params.pageToken=pageToken;const r=await fetch('https://www.googleapis.com/drive/v3/files?'+new URLSearchParams(params),{headers:{Authorization:'Bearer '+accessToken}});if(r.status===401){clearToken();throw new Error('SESSION_EXPIRED')}if(!r.ok)throw new Error('Google Drive: '+r.status);const d=await r.json();files=files.concat(d.files||[]);pageToken=d.nextPageToken||''}while(pageToken);return files}
async function findFolder(){const r=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(ROOT_FOLDER_ID)+'?fields=id,name,mimeType,trashed',{headers:{Authorization:'Bearer '+accessToken}});if(r.status===401){clearToken();throw new Error('SESSION_EXPIRED')}if(!r.ok)throw new Error('Non riesco ad aprire la cartella Condomini_APP configurata.');const d=await r.json();if(d.trashed||d.mimeType!==FOLDER_MIME)throw new Error('La cartella Condomini_APP configurata non è disponibile.');return d}
function isExcel(f){return f.mimeType!==FOLDER_MIME&&/\.(xlsx|xlsm|xls)$/i.test(f.name)&&!/^~\$/.test(f.name)}
function yearValue(s){const m=String(s||'').match(/(?:19|20)\d{2}/g);return m?Math.max(...m.map(Number)):0}
function scoreCandidate(c){const p=c.path.join('/').toLowerCase();let score=0;if(c.path.some(x=>/^bilanci?$/i.test(String(x).trim())))score+=100000;if(c.path.some(x=>/^(?:19|20)\d{2}(?:\s*-\s*\d{2,4})?$/.test(String(x).trim())))score+=50000;score+=yearValue(p)*100+yearValue(c.file.name)*1000+new Date(c.file.modifiedTime||0).getTime()/1e12;return score}
async function collectExcel(folder,maxDepth=5){const out=[];async function walk(id,path,depth){const items=await driveList(`'${id}' in parents and trashed=false`);for(const f of items){if(isExcel(f))out.push({file:f,path});else if(f.mimeType===FOLDER_MIME&&depth<maxDepth&&!/ERRATO|^PREVENTIVO\b/i.test(f.name))await walk(f.id,path.concat(f.name),depth+1)}}await walk(folder.id,[],0);return out}
function badCandidate(c){const p=(c.path||[]).join('/'),n=String(c.file?.name||'');return /ERRATO|STAMPA/i.test(p+'/'+n)||(c.path||[]).some(x=>/^PREVENTIVO\b/i.test(String(x).trim()))||/^PREVENTIVO\b/i.test(n.trim())}
function chooseBalance(candidates,folderName){
 if(!candidates.length)return{state:'missing',balance:null,excel:[]};const rule=SOURCE_RULES[norm(folderName)];
 if(rule){const wanted=rule.toLowerCase().replace(/\\/g,'/');const exact=candidates.filter(c=>((c.path.length?c.path.join('/')+'/':'')+c.file.name).toLowerCase().endsWith(wanted));if(exact.length){exact.sort((a,b)=>new Date(b.file.modifiedTime||0)-new Date(a.file.modifiedTime||0));return{state:'ok',balance:exact[0].file,excel:candidates.map(c=>c.file),balancePath:exact[0].path,validated:true,rule}}return{state:'error',error:new Error('Bilancio atteso non trovato: '+rule),excel:candidates.map(c=>c.file),validated:false,rule}}
 const preferred=candidates.filter(c=>c.path.some(x=>/^bilanci?$/i.test(String(x).trim()))&&!badCandidate(c)),pool=preferred.length?preferred:candidates.filter(c=>!badCandidate(c));if(!pool.length)return{state:'error',error:new Error('Nessun bilancio valido trovato'),excel:candidates.map(c=>c.file)};pool.sort((a,b)=>scoreCandidate(b)-scoreCandidate(a));return{state:'ok',balance:pool[0].file,excel:candidates.map(c=>c.file),balancePath:pool[0].path,validated:false}
}
async function scanCondomini(root){statusMsg('Google Drive collegato · controllo completo dei condomini…');const children=await driveList(`'${root.id}' in parents and trashed=false`),folders=children.filter(f=>f.mimeType===FOLDER_MIME&&!EXCLUDED_CONDOS.has(norm(f.name))).sort((a,b)=>a.name.localeCompare(b.name,'it')),rows=new Array(folders.length);let next=0,done=0;async function worker(){while(true){const i=next++;if(i>=folders.length)return;const folder=folders[i];try{rows[i]={folder,...chooseBalance(await collectExcel(folder,5),folder.name)}}catch(e){rows[i]={folder,state:'error',error:e}}done++;statusMsg('Controllo bilanci '+done+'/'+folders.length+'…')}}await Promise.all(Array.from({length:Math.min(4,folders.length)},worker));return rows}
async function downloadExcel(meta){const r=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(meta.id)+'?alt=media',{headers:{Authorization:'Bearer '+accessToken}});if(r.status===401){clearToken();throw new Error('SESSION_EXPIRED')}if(!r.ok)throw new Error('Non riesco a scaricare '+meta.name);const b=await r.blob();return new File([b],meta.name,{type:b.type||'application/octet-stream',lastModified:meta.modifiedTime?new Date(meta.modifiedTime).getTime():Date.now()})}
function sourcePath(r){return ((r.balancePath||[]).length?(r.balancePath.join('/')+'/'):'')+(r.balance?.name||'')}
function sig(r){return[r.balance?.id||'',r.balance?.modifiedTime||'',r.balance?.name||'',r.rule||'AUTO','ENGINE_V7_ORDINARY_CONG_ROOTPIN1_FULLREFRESH2'].join('|')}
function ensureArea(){let area=document.getElementById('driveCondoArea');if(area)return area;area=document.createElement('div');area.id='driveCondoArea';const status=document.getElementById('status');status?.parentNode?.insertBefore(area,status.nextSibling);return area}
function renderRows(rows,updated=0){const area=ensureArea(),ok=rows.filter(r=>r.state==='ok');area.innerHTML='<div>Condomini Drive attivi: '+rows.length+' · ricaricati integralmente: '+updated+'</div><select id="driveCondoSelect"></select><button id="driveOpenCondo">APRI CONDOMINIO</button>';const sel=document.getElementById('driveCondoSelect');ok.forEach((r,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=r.folder.name;sel.appendChild(o)});document.getElementById('driveOpenCondo').onclick=async()=>{const r=ok[Number(sel.value||0)];try{window.condoSetFolderTitle?.(r.folder.name);window.condoSourcePath=sourcePath(r);const f=await downloadExcel(r.balance);await parseFile(f);statusMsg('Aperto: '+r.folder.name+' · '+r.balance.name)}finally{window.condoSourcePath='';window.condoClearFolderTitle?.()}}}
async function rebuildAll(rows){
 const ok=rows.filter(r=>r.state==='ok'),newState={};let updated=0;
 for(let i=0;i<ok.length;i++){
   const r=ok[i];statusMsg('Ricarico da zero '+r.folder.name+' · '+r.balance.name+' ('+(i+1)+'/'+ok.length+')…');
   window.condoSetFolderTitle?.(r.folder.name);window.condoSourcePath=sourcePath(r);
   try{const f=await downloadExcel(r.balance);await parseFile(f);newState[r.folder.id||r.folder.name]=sig(r);updated++}
   finally{window.condoSourcePath='';window.condoClearFolderTitle?.()}
 }
 localStorage.setItem(SYNC_KEY,JSON.stringify(newState));
 return{updated};
}
async function doRefresh(){
 const root=await findFolder(),rows=await scanCondomini(root),blocked=rows.filter(r=>r.state!=='ok');
 if(blocked.length)throw new Error('Aggiornamento annullato: '+blocked.length+' condomini non hanno un bilancio valido ('+blocked.map(r=>r.folder?.name||'?').join(', ')+'). I dati precedenti restano invariati.');
 beginFullRefreshTransaction();
 try{
   const result=await rebuildAll(rows);
   if(result.updated!==rows.length)throw new Error('Ricostruzione incompleta: '+result.updated+'/'+rows.length);
   commitFullRefreshTransaction();renderRows(rows,result.updated);
   statusMsg('Aggiornamento completato · archivio precedente sostituito · '+result.updated+' condomini riletti integralmente da Drive.');
   return result;
 }catch(e){rollbackFullRefreshTransaction();throw e}
}
async function refreshDrive(){const btn=document.getElementById('folderBtn');try{if(btn){btn.disabled=true;btn.textContent='AGGIORNAMENTO…'}statusMsg('Collegamento a Google Drive…');await ensureToken();await doRefresh()}catch(e){statusMsg(e.message,true);alert(e.message)}finally{if(btn){btn.disabled=false;btn.textContent='AGGIORNA'}}}
function setup(){restoreToken();recoverInterruptedTransaction();const old=document.getElementById('folderBtn');if(!old)return;const btn=old.cloneNode(true);old.replaceWith(btn);btn.removeAttribute('onclick');btn.textContent='AGGIORNA';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();refreshDrive()},{capture:true});const p=btn.closest('.card')?.querySelector('p.muted');if(p)p.innerHTML='Premi <b>AGGIORNA</b>: il gestionale verifica Drive, svuota i soli dati di bilancio in una transazione protetta e rilegge integralmente tutti i condomini. Numeri WhatsApp e storico invii non vengono cancellati.'}
window.condoDriveSyncV2={beginFullRefreshTransaction,rollbackFullRefreshTransaction,commitFullRefreshTransaction,recoverInterruptedTransaction,doRefresh,rebuildAll,keys:{ARCHIVE_KEY,SYNC_KEY,TX_KEY}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();

(()=>{
'use strict';

const VERSION='pdf-resoconto-v1';
const norm=s=>String(s??'').trim().toUpperCase().replace(/\s+/g,' ');
const escHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Math.abs(Number(n)||0));
const q=id=>document.getElementById(id);
const buildingName=()=>String(q('building')?.textContent||'Condominio').trim()||'Condominio';
const storageKey=()=>`condo_pdf_summary_test_v1_${norm(buildingName())}`;
const legacyKey=()=>`condo_cfg_v28_${norm(buildingName())}`;

function readJson(key){try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch(e){return {}}}
function inferAddress(raw){
  const s=String(raw||'').trim();
  if(!s)return {street:'',city:'',cap:''};
  const m=s.match(/^(.*?)[,\-\s]+(\d{5})\s+(.+)$/);
  if(m)return {street:m[1].replace(/[\s,\-]+$/,'').trim(),cap:m[2],city:m[3].trim()};
  return {street:s,city:'',cap:''};
}
function loadCfg(){
  const own=readJson(storageKey());
  const legacy=readJson(legacyKey());
  const inferred=inferAddress(legacy.condoAddress||'');
  return {
    street:String(own.street||inferred.street||'').trim(),
    city:String(own.city||inferred.city||'').trim(),
    cap:String(own.cap||inferred.cap||'').trim(),
    admin:String(own.admin||legacy.admin||'').trim(),
    email:String(own.email||legacy.email||'').trim(),
    iban:String(own.iban||legacy.iban||'').trim()
  };
}
function saveCfg(cfg){
  const out={street:String(cfg.street||'').trim(),city:String(cfg.city||'').trim(),cap:String(cfg.cap||'').trim(),admin:String(cfg.admin||'').trim(),email:String(cfg.email||'').trim(),iban:String(cfg.iban||'').trim()};
  localStorage.setItem(storageKey(),JSON.stringify(out));
  return out;
}
function missingCfg(cfg){
  return [
    ['Via / indirizzo',cfg.street],['Comune / Paese',cfg.city],['CAP',cfg.cap],
    ['Amministratore',cfg.admin],['Email',cfg.email],['IBAN',cfg.iban]
  ].filter(x=>!String(x[1]||'').trim()).map(x=>x[0]);
}
function calcLocal(p){
  if(typeof calc==='function')return calc(p);
  const gross=(p.items||[]).filter(x=>x.selected).reduce((s,x)=>s+(Number(x.amount)||0),0);
  const comp=(p.credits||[]).filter(x=>x.selected).reduce((s,x)=>s+(Number(x.amount)||0),0);
  return {gross,comp,net:gross-comp};
}
function ensureStyles(){
  if(q('pdfSummaryStyleV1'))return;
  const st=document.createElement('style');st.id='pdfSummaryStyleV1';
  st.textContent=`
#pdfSummaryConfig{border:1px solid #d7dee8}
#pdfSummaryConfig .pdf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
#pdfSummaryConfig .pdf-grid .full{grid-column:1/-1}
.pdf-summary-btn{background:#475569!important}
#printLetter.pdf-summary-document{font-family:Arial,Helvetica,sans-serif;color:#151515;background:#fff;padding:22mm 19mm;min-height:297mm}
#printLetter.pdf-summary-document .pdf-head{text-align:center;border-bottom:2px solid #173f69;padding-bottom:12px;margin-bottom:18px}
#printLetter.pdf-summary-document .pdf-condo{font-size:20px;font-weight:800;letter-spacing:.2px;margin-bottom:5px}
#printLetter.pdf-summary-document .pdf-address{font-size:12px;line-height:1.5}
#printLetter.pdf-summary-document .pdf-admin{margin-top:8px;font-size:12px;line-height:1.5}
#printLetter.pdf-summary-document .pdf-recipient{margin:18px 0 16px;font-size:13px;line-height:1.5}
#printLetter.pdf-summary-document .pdf-intro{font-size:13px;line-height:1.55;margin:7px 0}
#printLetter.pdf-summary-document .pdf-title{font-size:15px;font-weight:800;margin:20px 0 8px;color:#173f69}
#printLetter.pdf-summary-document table{width:100%;border-collapse:collapse;margin:8px 0 14px}
#printLetter.pdf-summary-document th{background:#f1f5f9;font-size:12px;text-align:left;border:1px solid #cbd5e1;padding:8px}
#printLetter.pdf-summary-document td{font-size:12.5px;border:1px solid #d6dde6;padding:8px;vertical-align:top}
#printLetter.pdf-summary-document th:last-child,#printLetter.pdf-summary-document td:last-child{text-align:right;white-space:nowrap;width:32%}
#printLetter.pdf-summary-document .pdf-credit td{color:#8a1c1c}
#printLetter.pdf-summary-document .pdf-total{margin:16px 0 18px;padding:12px 14px;border:2px solid #173f69;border-radius:8px;text-align:right;font-size:17px;font-weight:900;background:#f8fbff}
#printLetter.pdf-summary-document .pdf-payment{margin-top:18px;padding:12px 14px;background:#f7f7f7;border:1px solid #cfd5dc;border-radius:8px;font-size:12.5px;line-height:1.55}
#printLetter.pdf-summary-document .pdf-iban{font-size:15px;font-weight:900;letter-spacing:.35px;margin-top:6px;word-break:break-word}
#printLetter.pdf-summary-document .pdf-footer{margin-top:28px;font-size:12.5px;line-height:1.5}
@media(max-width:650px){#pdfSummaryConfig .pdf-grid{grid-template-columns:1fr}}
@media print{
  #printLetter.pdf-summary-document{display:block!important;position:absolute;left:0;top:0;width:100%;padding:17mm 18mm!important;min-height:auto!important}
  #printLetter.pdf-summary-document .pdf-total,#printLetter.pdf-summary-document .pdf-payment{break-inside:avoid}
}
`;
  document.head.appendChild(st);
}
function ensureConfigCard(){
  ensureStyles();
  const results=q('results');if(!results)return null;
  let card=q('pdfSummaryConfig');
  const condo=buildingName();
  if(!card){
    card=document.createElement('div');card.id='pdfSummaryConfig';card.className='card no-print';
    const first=results.querySelector(':scope > .card');
    if(first&&first.nextSibling)results.insertBefore(card,first.nextSibling);else results.insertBefore(card,results.firstChild);
  }
  if(card.dataset.condo!==condo){
    card.dataset.condo=condo;
    const cfg=loadCfg();
    card.innerHTML=`<b>Dati PDF resoconto</b><div class="muted" style="margin-top:5px">Questi dati sono salvati solo nella versione TEST e non modificano la versione stabile.</div><div class="pdf-grid">
      <input id="pdfCfgStreet" placeholder="Via / indirizzo condominio *" value="${escHtml(cfg.street)}">
      <input id="pdfCfgCity" placeholder="Comune / Paese *" value="${escHtml(cfg.city)}">
      <input id="pdfCfgCap" inputmode="numeric" maxlength="5" placeholder="CAP *" value="${escHtml(cfg.cap)}">
      <input id="pdfCfgAdmin" placeholder="Nome amministratore *" value="${escHtml(cfg.admin)}">
      <input id="pdfCfgEmail" class="full" type="email" placeholder="Email amministratore *" value="${escHtml(cfg.email)}">
      <input id="pdfCfgIban" class="full" placeholder="IBAN conto corrente condominiale *" value="${escHtml(cfg.iban)}">
      <button id="pdfCfgSave" class="full">💾 Salva dati PDF</button>
    </div><div id="pdfCfgStatus" class="muted" style="margin-top:8px"></div>`;
    q('pdfCfgSave')?.addEventListener('click',()=>{const saved=saveCfg(readCfgFromInputs());refreshCfgStatus(saved);alert('Dati PDF salvati per '+buildingName()+'.')});
    refreshCfgStatus(cfg);
  }
  return card;
}
function readCfgFromInputs(){
  return {street:q('pdfCfgStreet')?.value||'',city:q('pdfCfgCity')?.value||'',cap:q('pdfCfgCap')?.value||'',admin:q('pdfCfgAdmin')?.value||'',email:q('pdfCfgEmail')?.value||'',iban:q('pdfCfgIban')?.value||''};
}
function refreshCfgStatus(cfg){
  const el=q('pdfCfgStatus');if(!el)return;
  const miss=missingCfg(cfg);
  el.innerHTML=miss.length?`<span style="color:#b42318"><b>Mancano:</b> ${escHtml(miss.join(', '))}</span>`:'<span style="color:#067647"><b>Dati PDF completi.</b></span>';
}
function buildHtml(p,cfg,condo){
  const selected=(p.items||[]).filter(x=>x.selected);
  const credits=(p.credits||[]).filter(x=>x.selected);
  const c=calcLocal(p);
  const rows=selected.map(x=>`<tr><td>${escHtml(x.label||'Voce')}</td><td>${money(x.amount)}</td></tr>`).join('');
  const creditRows=credits.map(x=>`<tr class="pdf-credit"><td>${escHtml(x.label||'Compensazione')} (credito/compensazione)</td><td>- ${money(x.amount)}</td></tr>`).join('');
  const unit=[p.scala?`Scala ${escHtml(p.scala)}`:'',p.interno!==undefined&&p.interno!==null&&String(p.interno)!==''?`Interno ${escHtml(p.interno)}`:''].filter(Boolean).join(' - ');
  const finalLabel=c.net>=0?'TOTALE DA VERSARE':'CREDITO RESIDUO';
  const finalAmount=(c.net<0?'- ':'')+money(c.net);
  return `<div class="pdf-head"><div class="pdf-condo">${escHtml(condo)}</div><div class="pdf-address">${escHtml(cfg.street)} - ${escHtml(cfg.cap)} ${escHtml(cfg.city)}</div><div class="pdf-admin"><b>Amministratore:</b> ${escHtml(cfg.admin)}<br><b>Email:</b> ${escHtml(cfg.email)}</div></div>
  <div class="pdf-recipient"><b>Condomino:</b> ${escHtml(p.name||'')} ${unit?`<br><b>Unità immobiliare:</b> ${unit}`:''}</div>
  <p class="pdf-intro">Gentile Condòmino, di seguito riportiamo il riepilogo aggiornato delle quote condominiali selezionate e ad oggi risultanti da versare.</p>
  <p class="pdf-intro">La invitiamo a verificare le voci indicate e, qualora non abbia già provveduto, a effettuare il pagamento del totale riportato in calce.</p>
  <div class="pdf-title">Resoconto quote condominiali</div>
  <table><thead><tr><th>Voce</th><th>Importo</th></tr></thead><tbody>${rows}${creditRows}</tbody></table>
  <div class="pdf-total">${finalLabel}: ${finalAmount}</div>
  <div class="pdf-payment"><b>Modalità di versamento</b><br>Il versamento può essere effettuato mediante bonifico sul conto corrente condominiale, indicando nella causale il nominativo del condomino e l'unità immobiliare.<div class="pdf-iban">IBAN: ${escHtml(cfg.iban)}</div></div>
  <div class="pdf-footer">Cordiali saluti<br><b>${escHtml(cfg.admin)}</b><br>Amministratore del Condominio</div>`;
}
function renderDocument(p,cfg,condo){
  ensureStyles();
  const target=q('printLetter');if(!target)throw new Error('Area di stampa non disponibile');
  target.className='pdf-summary-document';
  target.innerHTML=buildHtml(p,cfg,condo||buildingName());
  return target.innerHTML;
}
function generate(id){
  ensureConfigCard();
  const p=(typeof current!=='undefined'&&Array.isArray(current))?current[id]:null;
  if(!p){alert('PDF resoconto non generato: condomino non disponibile.');return false}
  const selected=(p.items||[]).filter(x=>x.selected);
  const credits=(p.credits||[]).filter(x=>x.selected);
  if(!selected.length&&!credits.length){alert('PDF resoconto non generato: seleziona almeno una voce.');return false}
  const cfg=saveCfg(readCfgFromInputs());refreshCfgStatus(cfg);
  const miss=missingCfg(cfg);
  if(miss.length){alert('PDF resoconto non generato. Completa prima: '+miss.join(', '));q('pdfSummaryConfig')?.scrollIntoView({behavior:'smooth',block:'start'});return false}
  renderDocument(p,cfg,buildingName());
  try{if(typeof addHistory==='function'){const c=calcLocal(p);addHistory(p,'PDF resoconto - generato per stampa',c.net)}}catch(e){}
  const oldTitle=document.title;
  document.title=`Resoconto - ${buildingName()} - ${String(p.name||'Condomino').trim()}`;
  const restore=()=>{document.title=oldTitle;window.removeEventListener('afterprint',restore)};
  window.addEventListener('afterprint',restore);
  setTimeout(()=>window.print(),160);
  return true;
}
function injectButtonForPerson(p){
  const box=q('p'+p.id);if(!box)return;
  const actions=box.querySelector('.actions');if(!actions)return;
  let btn=[...actions.querySelectorAll('button')].find(b=>/PDF|RESOCONTO/i.test(b.textContent||''));
  if(!btn){btn=document.createElement('button');actions.appendChild(btn)}
  if(btn.className!=='pdf-summary-btn')btn.className='pdf-summary-btn';
  if(btn.textContent!=='📄 PDF resoconto')btn.textContent='📄 PDF resoconto';
  btn.type='button';
  btn.onclick=()=>generate(p.id);
  if(btn.style.display==='none')btn.style.display='';
}
function injectAll(){
  ensureConfigCard();
  try{if(typeof current!=='undefined'&&Array.isArray(current))current.forEach(injectButtonForPerson)}catch(e){}
}
if(typeof renderPerson==='function'){
  const baseRenderPerson=renderPerson;
  renderPerson=function(p){const out=baseRenderPerson(p);injectButtonForPerson(p);ensureConfigCard();return out};
}
if(typeof render==='function'){
  const baseRender=render;
  render=function(fileName,wb){const out=baseRender(fileName,wb);setTimeout(injectAll,0);return out};
}
window.condoPdfResocontoV1={version:VERSION,loadCfg,saveCfg,missingCfg,buildHtml,renderDocument,generate,ensureConfigCard,injectAll};
window.resocontoPdf=generate;

function setup(){ensureStyles();injectAll();let last=buildingName();const obs=new MutationObserver(()=>{const now=buildingName();if(now!==last){last=now;const c=q('pdfSummaryConfig');if(c)c.dataset.condo=''}injectAll()});obs.observe(document.body,{childList:true,subtree:true,characterData:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();

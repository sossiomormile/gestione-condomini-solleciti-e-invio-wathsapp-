(()=>{
  function stamp(msg){
    const s=document.getElementById('status');
    if(s){s.innerHTML=msg;}
  }
  function setup(){
    const btn=document.getElementById('folderBtn');
    if(!btn)return;
    btn.textContent='AGGIORNA';
    btn.style.width='100%';
    btn.style.fontSize='17px';
    btn.style.padding='14px';
    const card=btn.closest('.card');
    const title=card?.querySelector('b');
    if(title)title.textContent='Aggiornamento dati';
    const p=card?.querySelector('p.muted');
    if(p)p.innerHTML='Premi <b>AGGIORNA</b> e seleziona la cartella dei condomini sul PC. Il gestionale leggerà sempre i file Excel presenti nella cartella; contatti, configurazioni, IBAN e storico restano salvati sul dispositivo.';
    const old=localStorage.getItem('condo_last_update_v4');
    if(old){
      try{const d=JSON.parse(old);stamp('Ultimo aggiornamento: <b>'+new Date(d.ts).toLocaleString('it-IT')+'</b>'+(d.folder?' · '+d.folder:''));}catch(e){}
    }
    btn.addEventListener('click',()=>{
      setTimeout(()=>{
        const name=(window.rootHandle&&window.rootHandle.name)||'';
        localStorage.setItem('condo_last_update_v4',JSON.stringify({ts:new Date().toISOString(),folder:name}));
      },1200);
    },true);
    const open=document.getElementById('openSelected');
    if(open){
      open.textContent='Apri e aggiorna condominio';
      open.addEventListener('click',()=>{
        const sel=document.getElementById('condominioSelect');
        localStorage.setItem('condo_last_update_v4',JSON.stringify({ts:new Date().toISOString(),folder:(window.rootHandle&&window.rootHandle.name)||'',condominio:sel?.value||''}));
      },true);
    }
    document.querySelectorAll('header div').forEach(el=>{if(el.textContent.includes('V2.8'))el.textContent=el.textContent.replace(/V2\.8/g,'V4');});
    const h=document.querySelector('header h1');if(h)h.textContent='🏢 Gestione Condomini';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
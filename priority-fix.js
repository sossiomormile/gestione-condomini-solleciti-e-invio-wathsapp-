(()=>{
  const RED='#c62828';
  const parseEuro=s=>{
    const cleaned=String(s||'').replace(/\s/g,'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.');
    const v=Number(cleaned);return Number.isFinite(v)?v:0;
  };
  function applyPriorityColors(){
    const info=[...document.querySelectorAll('#results .card .muted')].find(el=>el.textContent.includes('Anagrafica da Incassi'));
    if(info) info.textContent='V2.8 · Anagrafica da Incassi · rosso = almeno 3 mensilità scoperte oppure conguaglio a debito > €50 · anomalie anagrafiche con ⚠';
    document.querySelectorAll('#people .person').forEach(card=>{
      const summary=card.querySelector(':scope > summary');
      const nameSpan=summary?.querySelector('span');
      if(!nameSpan) return;
      let monthlyCount=0, conguaglio=0;
      card.querySelectorAll('.section').forEach(sec=>{
        const title=(sec.querySelector('h4')?.textContent||'').trim();
        if(title==='Rate ordinarie scoperte'){
          monthlyCount=[...sec.querySelectorAll('.item')].filter(item=>{
            const label=(item.querySelector('label')?.textContent||'').trim();
            return label && !label.startsWith('Rettifica ordinario da bilancio');
          }).length;
        }
        if(title==='Conguagli a debito'){
          conguaglio=Math.max(0,...[...sec.querySelectorAll('.amt')].map(x=>parseEuro(x.textContent)));
        }
      });
      const urgent=monthlyCount>=3 || conguaglio>50;
      nameSpan.style.color=urgent?RED:'';
      nameSpan.style.fontWeight=urgent?'900':'';
    });
  }
  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;applyPriorityColors()})};
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('change',schedule,true);
  document.addEventListener('input',schedule,true);
  setTimeout(applyPriorityColors,0);
})();
(()=>{
  const RED='#c62828';
  const YELLOW='#f4c430';
  const parseEuro=s=>{
    const cleaned=String(s||'').replace(/\s/g,'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.');
    const v=Number(cleaned);return Number.isFinite(v)?v:0;
  };
  function applyPriorityColors(){
    const info=[...document.querySelectorAll('#results .card .muted')].find(el=>el.textContent.includes('Anagrafica da Incassi')||el.textContent.includes('Motore contabile V6')||el.textContent.includes('Motore V7'));
    if(info) info.textContent='Motore V7 · rosso = almeno 3 rate ordinarie effettivamente scoperte · pallino giallo = conguaglio a debito > €50';
    document.querySelectorAll('#people .person').forEach(card=>{
      const summary=card.querySelector(':scope > summary');
      const nameSpan=summary?.querySelector('span');
      if(!summary||!nameSpan) return;
      let monthlyCount=0, conguaglio=0;
      card.querySelectorAll('.section').forEach(sec=>{
        const title=(sec.querySelector('h4')?.textContent||'').trim();
        if(title==='Rate ordinarie scoperte'||title==='Rate ordinarie'){
          monthlyCount=[...sec.querySelectorAll('.item')].filter(item=>{
            const label=(item.querySelector('label')?.textContent||'').trim();
            const amount=(item.querySelector('.amt')?.textContent||'').trim();
            return label && !label.startsWith('Rettifica ordinario da bilancio') && !item.classList.contains('ordinary-negative') && !amount.startsWith('−') && !amount.startsWith('-');
          }).length;
        }
        if(title==='Conguagli a debito'){
          conguaglio=Math.max(0,...[...sec.querySelectorAll('.amt')].map(x=>parseEuro(x.textContent)));
        }
      });
      const urgent=monthlyCount>=3;
      nameSpan.style.color=urgent?RED:'';
      nameSpan.style.fontWeight=urgent?'900':'';
      let dot=summary.querySelector('.conguaglio-dot');
      if(conguaglio>50){
        if(!dot){dot=document.createElement('span');dot.className='conguaglio-dot';dot.setAttribute('aria-label','Conguaglio superiore a 50 euro');dot.style.cssText=`display:inline-block;width:10px;height:10px;border-radius:50%;background:${YELLOW};margin-left:7px;vertical-align:middle;box-shadow:0 0 0 1px rgba(0,0,0,.18)`;nameSpan.insertAdjacentElement('afterend',dot)}
      }else if(dot){dot.remove()}
    });
  }
  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;applyPriorityColors()})};
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('change',schedule,true);
  document.addEventListener('input',schedule,true);
  setTimeout(applyPriorityColors,0);
})();
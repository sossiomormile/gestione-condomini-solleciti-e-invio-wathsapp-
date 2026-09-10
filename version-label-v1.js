(()=>{
  function apply(){
    document.title='Condominio_App 1.0';
    const h=document.querySelector('header h1');
    if(h)h.textContent='🏢 Condominio_App 1.0';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  setTimeout(apply,250);
})();

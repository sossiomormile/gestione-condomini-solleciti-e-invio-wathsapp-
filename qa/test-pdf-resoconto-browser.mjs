import fs from 'node:fs';
import { chromium } from 'playwright';

const fail=m=>{throw new Error(m)};
const base='http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:412,height:915},screen:{width:412,height:915},deviceScaleFactor:2.625,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 16; 25100RA69G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
  const res=await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:30000});
  if(!res?.ok())fail('index TEST non raggiungibile');
  await page.waitForFunction(()=>!!window.condoPdfResocontoV1,{timeout:60000});
  const state=await page.evaluate(()=>{
    const api=window.condoPdfResocontoV1;
    const p={name:'Mario Rossi',scala:'A',interno:'3',items:[{type:'ordinary',label:'Gennaio',amount:100,selected:true},{type:'cong',label:'Conguaglio a debito',amount:50,selected:true}],credits:[{label:'Conguaglio / dare-avere a credito',amount:20,selected:true}]};
    const cfg={street:'Via Roma 10',city:'Orta di Atella',cap:'81030',admin:'Sossio Mormile',email:'amministratore@example.it',iban:'IT60X0542811101000000123456'};
    api.renderDocument(p,cfg,'Condominio Test');
    const target=document.getElementById('printLetter');
    return {
      text:target?.innerText||'',
      html:target?.innerHTML||'',
      introCount:target?.querySelectorAll('.pdf-intro').length||0,
      tableRows:target?.querySelectorAll('tbody tr').length||0,
      className:target?.className||''
    };
  });
  for(const needle of ['Condominio Test','Via Roma 10 - 81030 Orta di Atella','Sossio Mormile','amministratore@example.it','Mario Rossi','Gennaio','Conguaglio a debito','credito/compensazione','TOTALE DA VERSARE','130,00','IT60X0542811101000000123456'])if(!state.text.includes(needle))fail('PDF DOM incompleto: manca '+needle);
  if(state.introCount!==2)fail('Il PDF deve contenere esattamente 2 righe introduttive, trovate '+state.introCount);
  if(state.tableRows!==3)fail('Righe resoconto inattese: '+state.tableRows);
  if(state.className!=='pdf-summary-document')fail('Classe di stampa PDF non applicata');
  await page.emulateMedia({media:'print'});
  const printState=await page.evaluate(()=>{const el=document.getElementById('printLetter');const s=getComputedStyle(el);return {display:s.display,width:el.scrollWidth,height:el.scrollHeight,text:(el.innerText||'').length}});
  if(printState.display==='none'||printState.text<200||printState.height<400)fail('Area PDF vuota o non stampabile: '+JSON.stringify(printState));
  const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true,margin:{top:'0',right:'0',bottom:'0',left:'0'}});
  if(pdf.length<9000)fail('PDF generato troppo piccolo/vuoto: '+pdf.length+' byte');
  if(pdf.subarray(0,5).toString()!=='%PDF-')fail('Output non è un PDF valido');
  fs.writeFileSync('/tmp/resoconto-test.pdf',pdf);
  if(errors.length)fail('Errori JavaScript: '+errors.join(' | '));
  console.log('PDF RESOCONTO BROWSER TEST PASSED',JSON.stringify({bytes:pdf.length,printState,introCount:state.introCount,tableRows:state.tableRows}));
} finally {await browser.close()}

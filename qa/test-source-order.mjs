import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync('v1-source-order.js','utf8');
const originalPeople=[
  {name:'ALFA',scala:'A',interno:'2',piano:'1',items:[{type:'ordinary',label:'Gennaio',amount:10,selected:true}],credits:[]},
  {name:'ANCORA DA INCASSARE',scala:'',interno:'',items:[{type:'ordinary',label:'Gennaio',amount:999,selected:true}],credits:[]},
  {name:'BETA',scala:'A',interno:'3',piano:'2',items:[{type:'cong',label:'Conguaglio a debito',amount:20,selected:true}],credits:[]},
  {name:'ZETA',scala:'A',interno:'1',piano:'T',items:[{type:'ordinary',label:'Febbraio',amount:30,selected:true}],credits:[{label:'Conguaglio / dare-avere a credito',amount:5,selected:false}]}
];
const snapshots=new Map(originalPeople.filter(p=>p.name!=='ANCORA DA INCASSARE').map(p=>[p.name,JSON.stringify({items:p.items,credits:p.credits})]));
const wb={SheetNames:['Incassi 2026'],Sheets:{'Incassi 2026':{rows:[
  ['','SCALA "A"'],
  ['CONDOMINO','PIANO','INTERNO','SUB','RATA'],
  ['ZETA','T','1','10',30],
  ['ALFA','1','2','11',10],
  ['ANCORA DA INCASSARE','','','',''],
  ['BETA','2','3','12',20]
]}}};
const context={
  window:{},
  current:structuredClone(originalPeople),
  render:()=>{},
  XLSX:{utils:{sheet_to_json:ws=>ws.rows}},
  console
};
vm.createContext(context);
vm.runInContext(code,context);
context.render('mock.xlsx',wb);
const names=context.current.map(p=>p.name);
if(JSON.stringify(names)!==JSON.stringify(['ZETA','ALFA','BETA']))throw new Error('Ordine sorgente errato: '+JSON.stringify(names));
if(context.current.some(p=>p.name==='ANCORA DA INCASSARE'))throw new Error('Riga riepilogativa non eliminata');
for(const p of context.current){
  const now=JSON.stringify({items:p.items,credits:p.credits});
  if(now!==snapshots.get(p.name))throw new Error('Contenuto contabile alterato per '+p.name);
}
if((context.window.condoV1SourceOrder.lastAudit?.unmatched||[]).length)throw new Error('Unmatched inattesi: '+context.window.condoV1SourceOrder.lastAudit.unmatched.join(', '));

// Caso reale emerso in Di.Be: due unità con stesso nominativo, stessa scala/interno/piano,
// ma SUB e rata differenti. La riga sorgente Incassi deve prevalere sul pareggio strutturale.
const dupWb={SheetNames:['Incassi 2025-26'],Sheets:{'Incassi 2025-26':{rows:[
  ['CONDOMINO','SUB','SCALA','P','INT.','RATA'],
  ['BELARDO M. / DI GUIDA E.','4','NEG','P.T','0',17.30],
  ['BELARDO M. / DI GUIDA E.','5','NEG','P.T','0',17.64]
]}}};
const dupPeople=[
  {name:'BELARDO M. / DI GUIDA E.',scala:'NEG',interno:'0',piano:'P.T',_sourceRow:2,items:[{type:'ordinary',label:'Maggio',amount:17.64,selected:true}],credits:[]},
  {name:'BELARDO M. / DI GUIDA E.',scala:'NEG',interno:'0',piano:'P.T',_sourceRow:1,items:[{type:'ordinary',label:'Maggio',amount:17.30,selected:true}],credits:[]}
];
const dupOrdered=context.window.condoV1SourceOrder.reorderPeople(structuredClone(dupPeople),dupWb);
const dupAmounts=dupOrdered.map(p=>p.items[0]?.amount);
if(JSON.stringify(dupAmounts)!==JSON.stringify([17.30,17.64]))throw new Error('Unità omonime invertite: '+JSON.stringify(dupAmounts));
if(JSON.stringify(dupOrdered.map(p=>p._sourceRow))!==JSON.stringify([1,2]))throw new Error('Righe sorgente omonime non rispettate');
if(JSON.stringify(dupOrdered.map(p=>p.sub))!==JSON.stringify(['4','5']))throw new Error('SUB delle unità omonime non propagato correttamente');

console.log('SOURCE ORDER TEST PASSED');

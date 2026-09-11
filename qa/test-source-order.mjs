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
console.log('SOURCE ORDER TEST PASSED');

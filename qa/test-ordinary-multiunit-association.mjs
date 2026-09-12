import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync('conguaglio-position-fix-v2.js','utf8');
const context={
  window:{condoAnalyzeV6:()=>({people:[],unresolved:[]})},
  XLSX:{utils:{sheet_to_json:ws=>ws.rows}},
  parseFile:()=>{},
  console
};
vm.createContext(context);
vm.runInContext(code,context);
const api=context.window.condoAnalyzeAssociationFixV2;
if(!api?.fixOrdinaryByRealMonthCells||!api?.chooseRecordIndex)throw new Error('API associazione rate non disponibile');

// Caso reale Parco Pantani: stesso proprietario su unità diverse.
// L'ordine delle persone è volutamente invertito: il nome da solo NON deve decidere.
const pantaniWb={SheetNames:['Incassi 2025-26'],Sheets:{'Incassi 2025-26':{rows:[
  ['','SCALA "A"'],
  ['CONDOMINO','PIANO','INTERNO','SUB','RATA','LUG'],
  ['FRANZESE VINCENZO','2','10','13',53.77,null],
  ['ALTRO A','3','11','14',20,null],
  ['FRANZESE VINCENZO','4','20','23',53,null],
  ['','SCALA "B"'],
  ['CONDOMINO','PIANO','INTERNO','SUB','RATA','LUG'],
  ["D'ANGELO ADRIANA",'1','6','30',44.07,null],
  ["D'ANGELO ADRIANA",'2','9','33',46.01,null]
]}}};
const pantaniResult={unresolved:[],people:[
  {name:'FRANZESE VINCENZO',scala:'A',piano:'4',interno:'20',sub:'',items:[{type:'ordinary',label:'Luglio',amount:999,selected:true}],credits:[]},
  {name:'FRANZESE VINCENZO',scala:'A',piano:'2',interno:'10',sub:'',items:[{type:'ordinary',label:'Luglio',amount:998,selected:true}],credits:[]},
  {name:"D'ANGELO ADRIANA",scala:'B',piano:'2',interno:'9',sub:'',items:[{type:'ordinary',label:'Luglio',amount:997,selected:true}],credits:[]},
  {name:"D'ANGELO ADRIANA",scala:'B',piano:'1',interno:'6',sub:'',items:[{type:'ordinary',label:'Luglio',amount:996,selected:true}],credits:[]}
]};
const fixed=api.fixOrdinaryByRealMonthCells(pantaniResult,pantaniWb,'Consuntivo 2025-2026.xlsx');
const byUnit=new Map(fixed.people.filter(p=>p.name==='FRANZESE VINCENZO'||p.name==="D'ANGELO ADRIANA").map(p=>[`${p.name}|${p.scala}|${p.interno}`,p]));
const expect=[
  ['FRANZESE VINCENZO|A|10',53.77,2,'13'],
  ['FRANZESE VINCENZO|A|20',53,4,'23'],
  ["D'ANGELO ADRIANA|B|6",44.07,7,'30'],
  ["D'ANGELO ADRIANA|B|9",46.01,8,'33']
];
for(const [key,amount,row,sub] of expect){
  const p=byUnit.get(key);if(!p)throw new Error('Unità mancante: '+key);
  const got=p.items.find(x=>x.type==='ordinary')?.amount;
  if(got!==amount)throw new Error(`${key}: rata associata ${got}, attesa ${amount}`);
  if(p._sourceRow!==row)throw new Error(`${key}: sourceRow ${p._sourceRow}, attesa ${row}`);
  if(p.sub!==sub)throw new Error(`${key}: SUB ${p.sub}, atteso ${sub}`);
}
if(fixed.unresolved.length)throw new Error('Parco Pantani ha prodotto unresolved inattesi: '+fixed.unresolved.join(' | '));

// Caso già noto Di.Be: stesso nome + stessa scala/interno/piano, SUB non ancora presente sulla persona.
// Quando almeno due campi strutturali coincidono e non c'è contraddizione, la posizione relativa Incassi
// deve separare le due unità senza scambiare le rate.
const dibeWb={SheetNames:['Incassi 2025-26'],Sheets:{'Incassi 2025-26':{rows:[
  ['','SCALA "NEG"'],
  ['CONDOMINO','PIANO','INTERNO','SUB','RATA','LUG'],
  ['BELARDO M. / DI GUIDA E.','P.T','0','4',17.30,null],
  ['BELARDO M. / DI GUIDA E.','P.T','0','5',17.64,null]
]}}};
const dibeResult={unresolved:[],people:[
  {name:'BELARDO M. / DI GUIDA E.',scala:'NEG',piano:'P.T',interno:'0',sub:'',items:[],credits:[]},
  {name:'BELARDO M. / DI GUIDA E.',scala:'NEG',piano:'P.T',interno:'0',sub:'',items:[],credits:[]}
]};
const dibe=api.fixOrdinaryByRealMonthCells(dibeResult,dibeWb,'Bilancio 2025-2026.xlsx');
if(JSON.stringify(dibe.people.map(p=>p.items.find(x=>x.type==='ordinary')?.amount))!==JSON.stringify([17.30,17.64]))throw new Error('Di.Be: ordine rate unità omonime errato');
if(JSON.stringify(dibe.people.map(p=>p.sub))!==JSON.stringify(['4','5']))throw new Error('Di.Be: SUB non separati correttamente');
if(JSON.stringify(dibe.people.map(p=>p._sourceRow))!==JSON.stringify([2,3]))throw new Error('Di.Be: righe sorgente non separate correttamente');

// Se esiste solo il nome e le unità differiscono strutturalmente, NON si deve indovinare.
const records=[
  {name:'ROSSI MARIO',scala:'A',interno:'1',piano:'1',sub:'10',sourceRow:5},
  {name:'ROSSI MARIO',scala:'A',interno:'2',piano:'2',sub:'11',sourceRow:6}
];
const people=[{name:'ROSSI MARIO',scala:'',interno:'',piano:'',sub:''}];
const ambiguous=api.chooseRecordIndex(people[0],people,0,records,new Set());
if(ambiguous!==-1)throw new Error('Associazione ambigua risolta senza evidenza: '+ambiguous);

console.log('ORDINARY MULTIUNIT ASSOCIATION TEST PASSED');

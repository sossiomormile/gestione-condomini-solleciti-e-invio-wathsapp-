import fs from 'node:fs';
import vm from 'node:vm';

const clone=x=>JSON.parse(JSON.stringify(x));
const irisBase={title:'Condominio Parco Iris',frontKey:'Frotespizio',unresolved:['Rate ordinarie · CAPUANO ANIELLO: unità omonima non associabile con certezza'],people:[
 {name:'DEL PRETE NICOLA',interno:'NEG 3',sub:'19',items:[{type:'ordinary',label:'Giugno',amount:11.56,selected:true}],credits:[]},
 {name:'CAPUANO ANIELLO',interno:'BOX',sub:'',items:[{type:'ordinary',label:'Giugno',amount:4.63,selected:true},{type:'cong',label:'Conguaglio a debito',amount:479.74,selected:true}],credits:[]},
 {name:'CAPUANO ANIELLO',interno:'BOX',sub:'39',items:[{type:'ordinary',label:'Giugno',amount:4.86,selected:true}],credits:[]},
 {name:'CAPUANO ANIELLO',interno:'BOX',sub:'40',items:[{type:'ordinary',label:'Giugno',amount:4.63,selected:true}],credits:[]},
 {name:'SILVESTRO SALVATORE',interno:'P.A.',sub:'4-11',items:[{type:'ordinary',label:'Giugno',amount:.36,selected:true}],credits:[]}
]};
const pantaniBase={title:'Condominio Parco Pantani',frontKey:'Frotespizio',unresolved:[],people:[
 {name:'ALFA',scala:'A',piano:'1',interno:'9',sub:'12',items:[{type:'ordinary',label:'Luglio',amount:20,selected:true}],credits:[]},
 {name:'FRANZESE VINCENZO',scala:'A',piano:'4',interno:'20',sub:'23',items:[{type:'ordinary',label:'Luglio',amount:53.77,selected:true}],credits:[]},
 {name:'FRANZESE VINCENZO',scala:'A',piano:'2',interno:'10',sub:'13',items:[{type:'ordinary',label:'Luglio',amount:53,selected:true}],credits:[]},
 {name:'OMEGA',scala:'A',piano:'5',interno:'21',sub:'24',items:[{type:'ordinary',label:'Luglio',amount:21,selected:true}],credits:[]}
]};

const context={
 window:{condoSourcePath:'',condoAnalyzeV6:(wb,fileName)=>clone(fileName.includes('Iris')?irisBase:pantaniBase)},
 XLSX:{utils:{sheet_to_json:ws=>ws.rows,aoa_to_sheet:rows=>({rows})},read:()=>{}},
 parseFile:()=>{},console,alert:()=>{}
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('duplicate-unit-rebuild-v2.js','utf8'),context);
const api=context.window.condoDuplicateUnitRebuildV2;
if(!api?.rebuildCollapsed)throw new Error('API duplicate unit V2 non disponibile');

const irisWb={SheetNames:['Incassi 2025-26','Recupero incassi conguagli precedenti'],Sheets:{
 'Incassi 2025-26':{rows:[
  ['NOMINATIVO','P','INTERNO','SUB','RATA','GIU','LUG','AGO','SPESE INDIVIDUALI','RISCOSSE','TOTALE ANNUO DA INCASSARE','TOTALE ANNUO ANCORA DA INCASSARE'],
  ['DEL PRETE NICOLA','','NEG 3','19',11.55505,null,null,null,0,0,138.66,138.66],
  ['CAPUANO ANIELLO','','BOX','39',4.859200349872872,null,null,null,0,0,58.3104,58.3104],
  ['CAPUANO ANIELLO','','BOX','40',4.629861916010187,null,null,null,0,0,55.55834,55.55834],
  ['SILVESTRO SALVATORE','','P.A.','4-11',.3625,null,null,null,0,0,4.35,4.35]
 ]},
 'Recupero incassi conguagli precedenti':{rows:[
  ['NOMINATIVO','P','INTERNO','DA INCASSARE'],
  ['DEL PRETE NICOLA','','NEG 3',0],
  ['CAPUANO ANIELLO','','BOX',158.99],
  ['CAPUANO ANIELLO','','BOX',320.75],
  ['SILVESTRO SALVATORE','','P.A.',0]
 ]}
}};
context.window.condoSourcePath='2025/Consuntivo 2025 - Preventivo 2026.xlsx';
const iris=context.window.condoAnalyzeV6(irisWb,'Parco Iris 2025-2026.xlsx');
const cap=iris.people.filter(p=>p.name==='CAPUANO ANIELLO');
if(cap.length!==2)throw new Error('Parco Iris: devono restare esattamente 2 unità Capuano, trovate '+cap.length);
const capBySub=new Map(cap.map(p=>[p.sub,p]));
for(const [sub,rate,cong] of [['39',4.86,158.99],['40',4.63,320.75]]){
 const p=capBySub.get(sub);if(!p)throw new Error('Parco Iris: SUB '+sub+' mancante');
 const ord=p.items.filter(x=>x.type==='ordinary').map(x=>x.amount);
 if(JSON.stringify(ord)!==JSON.stringify([rate,rate,rate]))throw new Error('Parco Iris SUB '+sub+': rate '+JSON.stringify(ord));
 const debt=p.items.filter(x=>x.type==='cong').reduce((s,x)=>s+x.amount,0);
 if(Math.abs(debt-cong)>.001)throw new Error('Parco Iris SUB '+sub+': conguaglio '+debt+' atteso '+cong);
}
if(iris.unresolved.some(x=>String(x).includes('CAPUANO ANIELLO')))throw new Error('Parco Iris: unresolved Capuano non rimosso: '+iris.unresolved.join(' | '));

const pantaniWb={SheetNames:['Incassi 2026-27'],Sheets:{'Incassi 2026-27':{rows:[
 ['','SCALA "A"'],
 ['NOMINATIVO','PIANO','INTERNO','SUB','RATA','LUG','AGO','SET','TOTALE PERIODO DA INCASSARE','TOTALE PERIODO ANCORA DA INCASSARE'],
 ['ALFA','1','9','12',20,null,null,null,240,240],
 ['FRANZESE VINCENZO','2','10','13',53.77,null,null,null,645.24,645.24],
 ['OMEGA','3','11','14',21,null,null,null,252,252],
 ['FRANZESE VINCENZO','4','20','23',53,null,null,null,636,636],
 ['','SCALA "C"'],
 ['NOMINATIVO','PIANO','INTERNO','SUB','RATA','LUG','AGO','SET','TOTALE PERIODO DA INCASSARE','TOTALE PERIODO ANCORA DA INCASSARE'],
 ['FRANZESE VINCENZO','','','52',null,null,null,null,0,0],
 ['FRANZESE VINCENZO','','','61',null,null,null,null,0,0]
]}}};
context.window.condoSourcePath='2026/Consuntivo 2026 - Preventivo 2027.xlsx';
const pantani=context.window.condoAnalyzeV6(pantaniWb,'Parco Pantani 2026-2027.xlsx');
const fra=pantani.people.filter(p=>p.name==='FRANZESE VINCENZO');
if(fra.length!==2)throw new Error('Parco Pantani: attese 2 unità attive Franzese, trovate '+fra.length);
const fraBySub=new Map(fra.map(p=>[p.sub,p]));
for(const [sub,int,piano,rata] of [['13','10','2',53.77],['23','20','4',53]]){
 const p=fraBySub.get(sub);if(!p)throw new Error('Parco Pantani: SUB '+sub+' mancante');
 if(p.interno!==int||p.piano!==piano)throw new Error(`Parco Pantani SUB ${sub}: unità ${p.piano}/${p.interno}`);
 const first=p.items.find(x=>x.type==='ordinary')?.amount;if(first!==rata)throw new Error('Parco Pantani SUB '+sub+': rata '+first+' attesa '+rata);
}
if(fra.some(p=>p.sub==='52'||p.sub==='61'))throw new Error('Parco Pantani: unità senza debito entrata nella V1');

const ambiguousUnits=[
 {order:0,sourceRow:1,name:'ROSSI MARIO',canon:'ROSSI MARIO',scala:'A',interno:'1',piano:'1',sub:'10'},
 {order:1,sourceRow:2,name:'ROSSI MARIO',canon:'ROSSI MARIO',scala:'A',interno:'2',piano:'2',sub:'11'}
];
const ambiguousWb={SheetNames:['Recupero incassi conguagli'],Sheets:{'Recupero incassi conguagli':{rows:[
 ['NOMINATIVO','P','INTERNO','DA INCASSARE'],
 ['ROSSI MARIO','','',100],
 ['ROSSI MARIO','','',200]
]}}};
const amb=api.congAssignments(ambiguousWb,ambiguousUnits);
if(amb.confidence.get('ROSSI MARIO')!==false)throw new Error('Caso ambiguo: il motore ha indovinato senza evidenza');

console.log('DUPLICATE UNIT REBUILD V2 TEST PASSED');

import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync('ordinary-cent-guard-v1.js','utf8');
const wb={SheetNames:['Incassi 2025-26'],Sheets:{'Incassi 2025-26':{rows:[
  ['CONDOMINO','PIANO','INTERNO','SUB','RATA','LUG','AGO','SET'],
  ['MAGGIO EMANUELE/MAGGIO FRANCESCO (usufrutto)','4','18','21-51',46.01331746666667,46,46,46],
  ['ROSSI MARIO','2','7','99',46.01331746666667,45,45,45]
]}}};
const baseResult={people:[
  {name:'MAGGIO EMANUELE/MAGGIO FRANCESCO (usufrutto)',_sourceRow:1,items:[
    {type:'ordinary',label:'Luglio',amount:.01,selected:true},
    {type:'ordinary',label:'Agosto',amount:.01,selected:true},
    {type:'ordinary',label:'Settembre',amount:.01,selected:true}
  ],credits:[],_v6:{gross:.03}},
  {name:'ROSSI MARIO',_sourceRow:2,items:[
    {type:'ordinary',label:'Luglio',amount:1.01331746666667,selected:true},
    {type:'ordinary',label:'Agosto',amount:1.01331746666667,selected:true},
    {type:'ordinary',label:'Settembre',amount:1.01331746666667,selected:true}
  ],credits:[],_v6:{gross:3.0399524}}
],unresolved:[]};
const context={window:{condoAnalyzeV6:()=>structuredClone(baseResult)},XLSX:{utils:{sheet_to_json:ws=>ws.rows}},parseFile:()=>{},console,structuredClone};
vm.createContext(context);vm.runInContext(code,context);
const api=context.window.condoOrdinaryCentGuardV1;if(!api)throw new Error('Guardia centesimi non disponibile');
const out=api.analyzeGuarded(wb,'Bilancio 2025-2026.xlsx');
const maggio=out.people[0],rossi=out.people[1];
if(maggio.items.filter(x=>x.type==='ordinary').length!==0)throw new Error('Parco Pantani: ricreati falsi insoluti da 1 centesimo');
if(maggio._v6.gross!==0)throw new Error('Parco Pantani: totale residuo non azzerato: '+maggio._v6.gross);
const amounts=rossi.items.filter(x=>x.type==='ordinary').map(x=>x.amount);
if(JSON.stringify(amounts)!==JSON.stringify([1.01,1.01,1.01]))throw new Error('Residuo reale non normalizzato correttamente: '+JSON.stringify(amounts));
if(rossi._v6.gross!==3.03)throw new Error('Totale residuo reale errato: '+rossi._v6.gross);
if(api.lastAudit.length!==2)throw new Error('Audit centesimi incompleto');
console.log('ORDINARY CENT GUARD TEST PASSED');

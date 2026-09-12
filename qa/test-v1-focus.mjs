import fs from 'node:fs';
import vm from 'node:vm';

const fail = msg => { console.error('V1 FOCUS TEST FAILED: '+msg); process.exit(1); };
const assert = (cond,msg) => { if(!cond) fail(msg); };

const p={
  id:0,name:'TEST',scala:'A',interno:'1',
  items:[
    {type:'ordinary',label:'Settembre',amount:40,selected:true},
    {type:'cong',label:'Conguaglio a debito',amount:25,selected:true},
    {type:'extra',label:'Polizza assicurativa',amount:100,selected:true},
    {type:'extra',label:'Spese individuali',amount:12,selected:true}
  ],
  credits:[
    {label:'Eccedenza / credito da incassi ordinari',amount:10,selected:false},
    {label:'Conguaglio / dare-avere a credito',amount:5,selected:false},
    {label:'Credito / eccedenza – LAVORI INFILTRAZIONI',amount:7,selected:true}
  ],
  _v6:{gross:177}
};

const context={
  console,
  current:[p],
  window:{},
  document:{
    readyState:'complete',
    querySelectorAll:()=>[],
    getElementById:()=>null,
    addEventListener:()=>{}
  },
  render:()=>{},
  renderPerson:()=>{},
  calc:x=>{
    const gross=(x.items||[]).filter(i=>i.selected).reduce((s,i)=>s+Number(i.amount||0),0);
    const comp=(x.credits||[]).filter(i=>i.selected).reduce((s,i)=>s+Number(i.amount||0),0);
    return {gross,comp,net:gross-comp};
  },
  message:x=>(x.items||[]).filter(i=>i.selected).map(i=>i.label).join('|')+'#'+(x.credits||[]).filter(i=>i.selected).map(i=>i.label).join('|'),
  toggleAll:v=>context.current.forEach(x=>(x.items||[]).forEach(i=>i.selected=v))
};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('v1-focus-ordinary-conguagli.js','utf8'),context,{filename:'v1-focus-ordinary-conguagli.js'});

assert(context.current[0].items.length===2,'extra items were not removed');
assert(context.current[0].items[0].type==='ordinary'&&context.current[0].items[0].amount===40,'ordinary item changed');
assert(context.current[0].items[1].type==='cong'&&context.current[0].items[1].amount===25,'conguaglio item changed');
assert(context.current[0].credits.length===2,'non-V1 credit was not removed');
assert(context.current[0].credits.every(c=>/ORDINARI|CONGUAGLIO|DARE-AVERE/i.test(c.label)),'unexpected credit survived V1 filter');
const c=context.calc(context.current[0]);
assert(c.gross===65,'V1 gross must contain only ordinary + conguaglio');
assert(c.comp===0,'credits must remain unselected by default');
const text=context.message(context.current[0]);
assert(text.includes('Settembre')&&text.includes('Conguaglio a debito'),'WhatsApp source text lost V1 items');
assert(!/Polizza|Spese individuali|LAVORI INFILTRAZIONI/i.test(text),'WhatsApp source text contains excluded extraordinary data');
context.toggleAll(true);
assert(context.current[0].items.length===2&&context.current[0].items.every(i=>i.selected),'toggleAll must operate only on V1 items');
assert(context.current[0]._v6.gross===65,'diagnostic gross was not aligned to V1 items');

console.log('V1 FOCUS TEST PASSED');

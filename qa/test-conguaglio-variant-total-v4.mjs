import fs from 'node:fs';
import vm from 'node:vm';
const clone=x=>JSON.parse(JSON.stringify(x));
const canon=x=>String(x??'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
function P(name,order,sourceRow,scala='',piano='',interno='',rata=1){return{name,canon:canon(name),order,sourceRow,scala,piano,interno,sub:'',unpaid:rata?[{mese:'Giugno',amount:rata}]:[],ordinaryCredit:0}}
function R(name,position,row,balance,scala='',piano='',interno=''){return{name,canon:canon(name),position,row,balance,scala,piano,interno,sub:''}}
const units=[];for(let i=0;i<23;i++)units.push(P('X'+i,i,100+i,'A','1',String(i),1));
units[10]=P('BORZACCHIELLO RAFFAELE',10,110,'B','T','1',48);
units[11]=P('GALA COSTRUZIONI SRL (JOSEPH OMORS)',11,111,'B','T','2',37);
units[12]=P('TAMMARO ANGELO',12,112,'B','T','3',42);
units[18]=P('GALA COSTRUZIONI SRL',18,118,'B','2','9',60);
units[19]=P('GAETA SILVANA',19,119,'B','1-2','1',22);
units[20]=P('GALA COSTRUZIONI SRL',20,120,'B','T','BOX',18);
units[21]=P('GALA COSTRUZIONI SRL',21,121,'B','T','BOX',5);
units[22]=P('ESPOSITO = ESPOSITO MARIA LUISA',22,122,'B','','',0);
const rows=[];for(let i=0;i<23;i++)rows.push(R(units[i].name,i,200+i,0,units[i].scala,units[i].piano,units[i].interno));
rows[11]=R('GALA COSTRUZIONI SRL',11,211,492.98,'B','T','2');
rows[18]=R('GALA COSTRUZIONI SRL',18,218,3792.62,'B','2','9');
rows[20]=R('GALA COSTRUZIONI SRL',20,220,301.09,'B','T','BOX');
rows[21]=R('GALA COSTRUZIONI SRL',21,221,78.12,'B','T','BOX');
rows[22]=R('VERGHINO GIANCARLO = SC. A int. 10',22,222,0,'B','','');
const baseResult={unresolved:['Unità duplicate · GALA COSTRUZIONI SRL: conguagli non separabili con certezza','Recupero conguagli · riga 212 · GALA COSTRUZIONI SRL: nominativo identico presente in più unità: serve conferma di posizione/vicini'],people:[
 {name:'GALA COSTRUZIONI SRL (JOSEPH OMORS)',scala:'B',piano:'T',interno:'2',_sourceRow:111,_sourceOrder:11,items:[{type:'ordinary',label:'Giugno',amount:37,selected:true}],credits:[]},
 {name:'GALA COSTRUZIONI SRL',scala:'B',piano:'2',interno:'9',_sourceRow:118,_sourceOrder:18,items:[{type:'ordinary',label:'Giugno',amount:60,selected:true}],credits:[]},
 {name:'GALA COSTRUZIONI SRL',scala:'B',piano:'T',interno:'BOX',_sourceRow:120,_sourceOrder:20,items:[{type:'ordinary',label:'Giugno',amount:18,selected:true}],credits:[]},
 {name:'GALA COSTRUZIONI SRL',scala:'B',piano:'T',interno:'BOX',_sourceRow:121,_sourceOrder:21,items:[{type:'ordinary',label:'Giugno',amount:5,selected:true}],credits:[]}
]};
const wb={SheetNames:['Recupero conguagli'],rows:{'Recupero conguagli':rows},units,baseResult};
const ctx={window:{},console};vm.createContext(ctx);
ctx.window.condoDuplicateUnitRebuildV2={sourceUnits:x=>x.units,parseCongRows:(x,sn)=>x.rows[sn]||[]};
ctx.window.condoAnalyzeV6=x=>clone(x.baseResult);
vm.runInContext(fs.readFileSync('duplicate-conguaglio-position-fix-v3.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('duplicate-conguaglio-variant-total-fix-v4.js','utf8'),ctx);
const res=ctx.window.condoAnalyzeV6(wb,'SanNazario.xlsx');
const joseph=res.people.find(p=>p.name.includes('JOSEPH OMORS'));if(!joseph)throw new Error('V4: unità JOSEPH OMORS persa');
const jdeb=joseph.items.filter(x=>x.type==='cong').reduce((s,x)=>s+x.amount,0);if(Math.abs(jdeb-492.98)>.001)throw new Error(`V4: conguaglio variante non conservato: ${jdeb}`);
const allDeb=res.people.reduce((s,p)=>s+p.items.filter(x=>x.type==='cong').reduce((a,x)=>a+x.amount,0),0);if(Math.abs(allDeb-4664.81)>.001)throw new Error(`V4: totale economico non conservato: ${allDeb}`);
const already=clone(res);const again=ctx.window.condoConguaglioVariantTotalFixV4.applyVariantTotals(already,wb,'SanNazario.xlsx');const j2=again.people.find(p=>p.name.includes('JOSEPH OMORS'));const j2deb=j2.items.filter(x=>x.type==='cong').reduce((s,x)=>s+x.amount,0);if(Math.abs(j2deb-492.98)>.001)throw new Error(`V4: doppio conteggio variante: ${j2deb}`);
console.log('CONGUAGLIO VARIANT TOTAL V4 TEST PASSED');

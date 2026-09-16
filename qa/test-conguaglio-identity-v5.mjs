import fs from 'node:fs';
import vm from 'node:vm';
const clone=x=>JSON.parse(JSON.stringify(x));
const canon=x=>String(x??'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
function P(name,order,sourceRow,scala='',piano='',interno='',sub=''){return{name,canon:canon(name),order,sourceRow,scala,piano,interno,sub,unpaid:[],ordinaryCredit:0}}
function R(name,position,row,balance,scala='',piano='',interno='',sub=''){return{name,canon:canon(name),position,row,balance,scala,piano,interno,sub}}
const debt=p=>(p.items||[]).filter(x=>x.type==='cong').reduce((s,x)=>s+x.amount,0);
const credit=p=>(p.credits||[]).filter(x=>/CONGUAGLIO|DARE-AVERE/i.test(x.label)).reduce((s,x)=>s+x.amount,0);

// Regressione LIVIO LA MONTAGNA: due unita della stessa famiglia, debito e credito non devono incrociarsi.
const units=[];for(let i=0;i<24;i++)units.push(P('X'+i,i,100+i,'A','1',String(i),String(i)));
units[10]=P('LIVIO LA MONTAGNA',10,110,'A','2','9','25-45');
units[20]=P('LIVIO LA MONTAGNA (Mozzillo Rosaria)',20,120,'B','PT','3','10-49');
const rows=[];for(let i=0;i<24;i++)rows.push(R(units[i].name,i,200+i,0,units[i].scala,units[i].piano,units[i].interno,units[i].sub));
rows[10]=R('LIVIO LA MONTAGNA',10,210,-26.87,'A','2','9','25-45');
rows[20]=R('LIVIO LA MONTAGNA',20,220,229.63,'B','PT','3','10-49');
const baseResult={unresolved:[],people:[
 {name:'LIVIO LA MONTAGNA',scala:'A',piano:'2',interno:'9',sub:'25-45',_sourceRow:110,_sourceOrder:10,items:[{type:'ordinary',label:'Luglio',amount:45,selected:true},{type:'ordinary',label:'Agosto',amount:45,selected:true},{type:'ordinary',label:'Settembre',amount:45,selected:true},{type:'cong',label:'Conguaglio a debito',amount:229.63,selected:true}],credits:[{label:'Conguaglio / dare-avere a credito',amount:26.87,selected:false}],_v6:{}},
 {name:'LIVIO LA MONTAGNA (Mozzillo Rosaria)',scala:'B',piano:'PT',interno:'3',sub:'10-49',_sourceRow:120,_sourceOrder:20,items:[],credits:[],_v6:{}}
]};
const wb={SheetNames:['Recupero conguagli'],rows:{'Recupero conguagli':rows},units,baseResult};
const ctx={window:{},console};vm.createContext(ctx);
ctx.window.condoDuplicateUnitRebuildV2={sourceUnits:x=>x.units,parseCongRows:(x,sn)=>x.rows[sn]||[]};
ctx.window.condoAnalyzeV6=x=>clone(x.baseResult);
vm.runInContext(fs.readFileSync('duplicate-conguaglio-position-fix-v3.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('duplicate-conguaglio-variant-total-fix-v4.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('conguaglio-identity-strict-fix-v5.js','utf8'),ctx);
const res=ctx.window.condoAnalyzeV6(wb,'ParcoKarol.xlsx');
const a=res.people.find(p=>p.sub==='25-45');const b=res.people.find(p=>p.sub==='10-49');
if(!a||!b)throw new Error('V5: unità Livio non trovate');
const adeb=debt(a),acredit=credit(a),bdeb=debt(b),bcredit=credit(b);
if(Math.abs(adeb)>.001)throw new Error(`V5: debito errato rimasto su Livio A: ${adeb}`);
if(Math.abs(acredit-26.87)>.001)throw new Error(`V5: credito Livio A errato: ${acredit}`);
if(Math.abs(bdeb-229.63)>.001)throw new Error(`V5: debito Livio B errato: ${bdeb}`);
if(Math.abs(bcredit)>.001)throw new Error(`V5: credito inatteso Livio B: ${bcredit}`);
const gross=a.items.reduce((s,x)=>s+x.amount,0);if(Math.abs(gross-135)>.001)throw new Error(`V5: lordo Livio A errato: ${gross}`);
if((res.unresolved||[]).length)throw new Error('V5: casi irrisolti inattesi: '+res.unresolved.join(' | '));

// Un caso realmente ambiguo, senza SUB e con vicini discordanti, deve continuare a essere bloccato.
const ambRows=clone(rows);ambRows[9].name='DIVERSO SOPRA';ambRows[11].name='DIVERSO SOTTO';ambRows[10]={...ambRows[10],scala:'',piano:'',interno:'',sub:''};
const ambWb={...wb,rows:{'Recupero conguagli':ambRows}};const amb=ctx.window.condoConguaglioIdentityStrictFixV5.reconcileFamilies(clone(baseResult),ambWb,'ParcoKarol.xlsx');
if(!(amb.unresolved||[]).some(x=>x.includes('Conguaglio identità V5')))throw new Error('V5: ambiguità non bloccata');

// Regressione reale PARCO KAROL / G.A. NATALE: nel foglio Recupero il campo INT. contiene 8/81/75,
// mentre in Incassi gli interni reali sono 2/14/D. Il SUB esatto 8-65 / 81-40 / 75 deve prevalere.
const karolUnits=[
 P('G.A. NATALE SRL (OLIVIERI GENNARO)',0,304,'A','PT','2','8-65'),
 P('G.A. NATALE srl (ROMANO CONCETTA)',1,316,'A','3','14','81-40'),
 P('G.A. NATALE srl  (DOSSI RICCARDO)',2,335,'VILL','PT','D','75')
];
const karolRows=[
 R('G.A. NATALE SRL (OLIVIERI GENNARO)',0,3,0.50,'A','PT','8','8-65'),
 R('G.A. NATALE srl',1,15,-263.67,'A','3','81','81-40'),
 R('G.A. NATALE srl  (DOSSI RICCARDO)',2,34,-143.33,'VILL','PT','75','75')
];
const karolBase={unresolved:[],people:karolUnits.map(u=>({name:u.name,scala:u.scala,piano:u.piano,interno:u.interno,sub:u.sub,_sourceRow:u.sourceRow,_sourceOrder:u.order,items:[],credits:[],_v6:{}}))};
const karolWb={SheetNames:['RECUPERO INCASSI PRECEDENTI GESTIONI'],rows:{'RECUPERO INCASSI PRECEDENTI GESTIONI':karolRows},units:karolUnits};
const karol=ctx.window.condoConguaglioIdentityStrictFixV5.reconcileFamilies(clone(karolBase),karolWb,'Consuntivo 2025 - Preventivo 2026.xlsx');
if((karol.unresolved||[]).length)throw new Error('V5 KAROL: casi irrisolti inattesi: '+karol.unresolved.join(' | '));
const ko=karol.people.find(p=>p.sub==='8-65'),kr=karol.people.find(p=>p.sub==='81-40'),kd=karol.people.find(p=>p.sub==='75');
if(!ko||!kr||!kd)throw new Error('V5 KAROL: una o più unità G.A. NATALE mancanti');
if(Math.abs(debt(ko)-0.50)>.001||Math.abs(credit(ko))>.001)throw new Error(`V5 KAROL: OLIVIERI errato debito=${debt(ko)} credito=${credit(ko)}`);
if(Math.abs(debt(kr))>.001||Math.abs(credit(kr)-263.67)>.001)throw new Error(`V5 KAROL: ROMANO errato debito=${debt(kr)} credito=${credit(kr)}`);
if(Math.abs(debt(kd))>.001||Math.abs(credit(kd)-143.33)>.001)throw new Error(`V5 KAROL: DOSSI errato debito=${debt(kd)} credito=${credit(kd)}`);
const subAudit=(ctx.window.condoConguaglioIdentityStrictFixV5.lastAudit||[]).filter(x=>x.family==='G A NATALE SRL');
if(subAudit.length!==3||subAudit.some(x=>x.status!=='assigned'||x.reason!=='unique-sub'))throw new Error('V5 KAROL: le tre righe non sono state risolte tramite SUB univoco');

console.log('CONGUAGLIO IDENTITY STRICT V5 TEST PASSED: LIVIO + KAROL SUB PRIORITY');

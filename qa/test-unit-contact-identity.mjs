import fs from 'node:fs';
import vm from 'node:vm';

class StorageMock{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}key(i){return[...this.m.keys()][i]??null}get length(){return this.m.size}}
const localStorage=new StorageMock();
const p1={id:0,name:'DUPLICATO',scala:'A',interno:'0',piano:'PT',sub:'4',_sourceRow:10};
const p2={id:1,name:'DUPLICATO',scala:'A',interno:'0',piano:'PT',sub:'5',_sourceRow:11};
const context={console,localStorage,current:[p1,p2],building:{textContent:'Condominio Test'},window:{addEventListener:()=>{}},document:{readyState:'loading',addEventListener:()=>{},getElementById:()=>null},MutationObserver:class{},prompt:()=>null,alert:()=>{},location:{href:''},setTimeout:()=>{},Date};
context.window=context;
vm.createContext(context);vm.runInContext(fs.readFileSync('unit-contact-identity-v1.js','utf8'),context);
const api=context.window.condoUnitContactIdentityV1;if(!api)throw new Error('API identità contatti non esposta');
if(api.key(p1)===api.key(p2))throw new Error('Due SUB diversi condividono la stessa chiave contatto');
if(api.legacyContactKey(p1)!==api.legacyContactKey(p2))throw new Error('Fixture non riproduce la collisione legacy');
localStorage.setItem('condo_contacts_v5',JSON.stringify({[api.legacyContactKey(p1)]:{phone:'3330000000'}}));
if(api.getContact(p1).phone||api.getContact(p2).phone)throw new Error('Contatto legacy ambiguo migrato automaticamente');
api.setContact(p1,{phone:'3331111111',email:''});api.setContact(p2,{phone:'3332222222',email:''});
if(api.getContact(p1).phone!=='3331111111'||api.getContact(p2).phone!=='3332222222')throw new Error('Contatti SUB non restano separati');
const r1={id:0,name:'SENZA SUB',scala:'B',interno:'BOX',piano:'T',sub:'',_sourceRow:20},r2={id:1,name:'SENZA SUB',scala:'B',interno:'BOX',piano:'T',sub:'',_sourceRow:21};context.current=[r1,r2];if(api.key(r1)===api.key(r2))throw new Error('Duplicati senza SUB non usano il fallback di riga');
const unique={id:0,name:'UNICO',scala:'C',interno:'3',piano:'1',sub:'',_sourceRow:30};context.current=[unique];const old=api.legacyContactKey(unique);localStorage.setItem('condo_contacts_v5',JSON.stringify({[old]:{phone:'3339999999'}}));if(api.getContact(unique).phone!=='3339999999')throw new Error('Contatto legacy univoco non migrato');
const code=fs.readFileSync('unit-contact-identity-v1.js','utf8');if(!code.includes("const k='condo_hist_v28_'+key(p)"))throw new Error('Storico non usa la nuova identità unità');if(!code.includes("PENDING_KEY='condo_wa_pending_v8'"))throw new Error('Pending WhatsApp non separato dalla logica legacy');
console.log('UNIT CONTACT IDENTITY TEST PASSED');

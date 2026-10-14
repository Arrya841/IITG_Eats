const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const code = name => fs.readFileSync(path.join(root, name), 'utf8');
const assert = (truth, message) => { if (!truth) throw new Error(message); };

function makeApp(role) {
  const mem = {};
  const listeners = {};
  const content = {innerHTML:'', addEventListener(name,cb){listeners['main:'+name]=cb;}};
  const toast = {textContent:'', classList:{add(){},remove(){}}};
  const doc = {body:{dataset:{portal:role}},getElementById(id){if(id==='portalContent')return content;if(id==='portalToast')return toast;return null;}};
  const win = {addEventListener(name,cb){listeners['win:'+name]=cb;},dispatchEvent(e){if(e.type==='iitg:updated')listeners['win:iitg:updated']?.(e);}};
  const ctx = {window:win,document:doc,location:{search:'',href:''},console,Date,Math,setTimeout,clearTimeout,URLSearchParams,confirm:()=>true,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>mem[k]=v}};
  vm.createContext(ctx);
  for(const file of ['catalog.js','portal-data.js','portal.js'])vm.runInContext(code(file),ctx,{filename:file});
  return {ctx,mem,content,store:win.IITGStore,listeners};
}
const a = makeApp('admin');
assert(a.content.innerHTML.includes('Good morning, Admin'),'Admin overview did not render');
assert(a.store.orders().filter(o=>o.isDemo).length === 4,'Should provide 4 demo samples');
assert(JSON.parse(a.mem['iitg_orders']||'[]').length === 0,'Demo samples must not contaminate customer orders');
for(const role of ['vendor','rider']) {
 const p=makeApp(role);
 assert(p.content.innerHTML.includes('Canteen')||p.content.innerHTML.includes('delivery queue'),role+' portal did not render');
}
const s=a.store;
s.transition('DEMO-1042','accepted','vendor');
s.transition('DEMO-1042','preparing','vendor');
s.transition('DEMO-1042','ready','vendor');
s.assignRider('DEMO-1042','r1');
s.transition('DEMO-1042','picked_up','rider');
s.transition('DEMO-1042','out_for_delivery','rider');
s.transition('DEMO-1042','delivered','rider');
assert(s.orders().find(o=>o.id==='DEMO-1042').status==='delivered','Complete order flow failed');
let denied=false;
try{s.transition('DEMO-1042','accepted','vendor')}catch{denied=true}
assert(denied,'Invalid transition was not rejected');
s.setItem('lohit','l1',false);assert(s.setting('lohit').disabledItems.l1===true,'Item sold-out update failed');
s.setPrice('lohit','l1',39);assert(s.setting('lohit').prices.l1===39,'Price edit failed');
s.setOpen('lohit',false);assert(s.setting('lohit').isOpen===false,'Vendor pause failed');
s.createOrder({id:'CHECK123',restaurantId:'lohit',restaurant:'Lohit Canteen',items:[{itemId:'l1',name:'Samosa',quantity:1}],total:39,placedAt:new Date().toISOString(),status:'placed'});
s.transition('CHECK123','accepted','vendor');
assert(JSON.parse(a.mem['iitg_orders'])[0].status==='accepted','Customer order status was not persisted');
assert(!JSON.parse(a.mem['iitg_portal_demo_orders_v1']).some(o=>o.id==='CHECK123'),'Customer order entered sample storage');
console.log('PASS: all three portals render; demo isolation; vendor, rider and admin workflows; storage; menu controls');

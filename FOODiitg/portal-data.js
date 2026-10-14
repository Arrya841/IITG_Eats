/* IITG Eats operational DEMO. Shared localStorage works only for tabs on the same origin/browser.
   This is NOT a production API or access-control system. */
(function () {
  'use strict';
  const ORDER_KEY = 'iitg_orders';
  const PREF_KEY = 'iitg_portal_vendor_settings_v1';
  const DEMO_KEY = 'iitg_portal_demo_orders_v1';
  const RIDERS = [{id:'r1',name:'Aarav (demo rider)'},{id:'r2',name:'Mira (demo rider)'},{id:'r3',name:'Rahul (demo rider)'}];
  const STATES = ['placed','accepted','preparing','ready','picked_up','out_for_delivery','delivered'];
  const LABELS = {placed:'New order',accepted:'Accepted',preparing:'Preparing',ready:'Ready for pickup',picked_up:'Picked up',out_for_delivery:'On the way',delivered:'Delivered',rejected:'Rejected',cancelled:'Cancelled'};
  const LEGACY = ['placed','preparing','picked_up','out_for_delivery','delivered'];
  const catalog = window.IITG_CATALOG || [];
  let bus = null;
  try {
    if (typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined') {
      bus = new window.BroadcastChannel('iitg_portal_sync_bus_v1');
      bus.onmessage = (e) => {
        if (e.data?.key) {
          window.dispatchEvent(new CustomEvent('iitg:updated', { detail: e.data.key }));
        }
      };
    }
  } catch (_) {}
  const read = (key,fallback) => {try {const data=JSON.parse(localStorage.getItem(key));return data??fallback;}catch{return fallback;}};
  const write = (key,value) => {
    localStorage.setItem(key,JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('iitg:updated',{detail:key}));
    if (bus) { try { bus.postMessage({ key }); } catch (_) {} }
  };
  function norm(o) {
    const items=Array.isArray(o.items)?o.items:[];
    const restId=o.restaurantId||o.vendorId||items[0]?.restaurantId||catalog.find(v=>v.name===o.restaurant)?.id||'lohit';
    const computedTotal=Number(o.total)||items.reduce((s,i)=>s+(Number(i.price)||0)*(Number(i.quantity)||1),0);
    return {
      ...o,
      id: String(o.id),
      items,
      restaurantId: restId,
      restaurant: o.restaurant||catalog.find(v=>v.id===restId)?.name||'Canteen',
      status: typeof o.status==='number' ? (LEGACY[o.status]||'placed') : (STATES.includes(o.status)||['cancelled','rejected'].includes(o.status)?o.status:'placed'),
      customerName: o.customerName||o.customer||'IITG student',
      hostel: o.hostel||'Campus delivery point',
      room: o.room||'',
      deliveryNote: o.deliveryNote||'',
      riderId: o.riderId||null,
      riderName: o.riderName||null,
      history: Array.isArray(o.history)?o.history:[],
      itemTotal: o.itemTotal!=null ? Number(o.itemTotal) : computedTotal,
      delivery: o.delivery!=null ? Number(o.delivery) : 0,
      packaging: o.packaging!=null ? Number(o.packaging) : 0,
      tax: o.tax!=null ? Number(o.tax) : 0,
      total: computedTotal,
      placedAt: o.placedAt||new Date().toISOString()
    };
  }
  function orders(){return [...read(ORDER_KEY,[]),...read(DEMO_KEY,[])].filter(o=>o&&o.id).map(norm).sort((a,b)=>new Date(b.placedAt)-new Date(a.placedAt));}
  function saveOrders(arr){write(ORDER_KEY,arr);}
  function createOrder(order){const all=orders();const next=norm(order);if(all.some(o=>o.id===next.id))throw new Error('Duplicate order ID.');const current=read(ORDER_KEY,[]);current.unshift(next);saveOrders(current);return next;}
  function patch(id, fields, eventName, actor) {
    const all=orders(),index=all.findIndex(o=>o.id===id);
    if(index<0)throw new Error('Order not found');
    const current=all[index];
    const next={...current,...fields,history:[...current.history,{at:new Date().toISOString(),event:eventName,actor}]};
    const isSample=!!current.isDemo;const key=isSample?DEMO_KEY:ORDER_KEY;const group=read(key,[]);const found=group.findIndex(o=>o.id===id);if(found<0)throw Error('Cannot locate order source');group[found]=next;write(key,group);return next;
  }
  function transition(id,to,role,actorId){
    const o=orders().find(o=>o.id===id);if(!o)throw new Error('Order not found');
    const allowed={
      vendor:{placed:['accepted','rejected'],accepted:['preparing'],preparing:['ready'],ready:['picked_up']},
      rider:{placed:['picked_up'],accepted:['picked_up'],preparing:['picked_up'],ready:['picked_up'],picked_up:['out_for_delivery'],out_for_delivery:['delivered']},
      admin:{placed:['cancelled','accepted'],accepted:['cancelled','preparing','ready','picked_up'],preparing:['cancelled','ready','picked_up'],ready:['cancelled','picked_up','out_for_delivery'],picked_up:['out_for_delivery'],out_for_delivery:['delivered']}
    };
    if(!(allowed[role]?.[o.status]||[]).includes(to))throw new Error(`Cannot change ${LABELS[o.status]} to ${LABELS[to]} as ${role}.`);
    if(role==='rider' && !o.riderId){
      const rider=(actorId && RIDERS.find(r=>r.id===actorId)) || RIDERS[0];
      return patch(id,{status:to,riderId:rider.id,riderName:rider.name},`Claimed & ${LABELS[to]} by ${rider.name}`,role);
    }
    if((role==='vendor'||role==='admin') && to==='picked_up' && !o.riderId){
      const rider=RIDERS[0];
      return patch(id,{status:to,riderId:rider.id,riderName:rider.name},`Handed over to ${rider.name}`,role);
    }
    return patch(id,{status:to},`Status updated: ${LABELS[to]}`,role);
  }
  function claimOrder(orderId,riderId,andPickup=false){
    const rider=RIDERS.find(r=>r.id===riderId) || RIDERS[0];
    const o=orders().find(o=>o.id===orderId);if(!o)throw new Error('Order not found');
    const nextStatus=andPickup ? 'picked_up' : (o.status==='ready' ? 'ready' : o.status);
    const eventName=andPickup ? ('Claimed & picked up by '+rider.name) : ('Assigned to '+rider.name);
    return patch(orderId,{riderId:rider.id,riderName:rider.name,status:nextStatus},eventName,'rider');
  }
  function assignRider(orderId,riderId) {
    const rider=RIDERS.find(r=>r.id===riderId);if(!rider)throw new Error('Select a valid rider');
    const o=orders().find(o=>o.id===orderId);
    if(!o)throw new Error('Order not found');
    if(!['accepted','preparing','ready'].includes(o.status))throw new Error('Order must be accepted before assigning a rider.');
    return patch(orderId,{riderId:rider.id,riderName:rider.name},'Assigned to '+rider.name,'admin');
  }
  function allSettings(){return read(PREF_KEY,{});}
  function setting(vendorId){const s=allSettings()[vendorId]||{};return {isOpen:s.isOpen!==false,disabledItems:s.disabledItems||{},prices:s.prices||{}};}
  function setOpen(vendorId,open){if(!catalog.some(v=>v.id===vendorId))throw Error('Unknown canteen');const all=allSettings();all[vendorId]={...setting(vendorId),isOpen:!!open};write(PREF_KEY,all);}
  function setItem(vendorId,itemId,available){const vendor=catalog.find(v=>v.id===vendorId);if(!vendor||!vendor.menu.some(m=>m.id===itemId))throw Error('Unknown item');const all=allSettings();const s=setting(vendorId);s.disabledItems[itemId]=!available;all[vendorId]=s;write(PREF_KEY,all);}
  function setPrice(vendorId,itemId,price){const vendor=catalog.find(v=>v.id===vendorId);if(!vendor||!vendor.menu.some(m=>m.id===itemId))throw Error('Unknown item');const n=Number(price);if(!Number.isFinite(n)||n<1||n>10000)throw Error('Enter a price between ₹1 and ₹10,000');const all=allSettings();const s=setting(vendorId);s.prices[itemId]=Math.round(n);all[vendorId]=s;write(PREF_KEY,all);}
  function seed(){
    if(localStorage.getItem('iitg_portal_seeded_v1')==='yes')return false;
    const now=Date.now();const demo=[
      {id:'DEMO-1042',restaurantId:'lohit',restaurant:'Lohit Canteen',customerName:'Sample customer · Kameng',hostel:'Kameng',room:'H-204',status:'placed',total:125,placedAt:new Date(now-120000).toISOString(),items:[{name:'Veg Grilled Sandwich',price:50,quantity:2},{name:'Masala Chai',price:15,quantity:1}],payment:'DEMO',paymentStatus:'not_charged'},
      {id:'DEMO-1041',restaurantId:'kameng',restaurant:'Kameng Night Mess',customerName:'Sample customer · Barak',hostel:'Barak',room:'B-112',status:'preparing',total:220,placedAt:new Date(now-720000).toISOString(),items:[{name:'Chicken Dum Biryani',price:180,quantity:1}],payment:'DEMO',paymentStatus:'not_charged'},
      {id:'DEMO-1040',restaurantId:'core',restaurant:'Core Canteen',customerName:'Sample customer · Lohit',hostel:'Lohit',room:'L-101',status:'ready',total:115,placedAt:new Date(now-1200000).toISOString(),items:[{name:'Masala Dosa',price:70,quantity:1},{name:'Filter Coffee',price:30,quantity:1}],payment:'DEMO',paymentStatus:'not_charged',riderId:'r1',riderName:RIDERS[0].name},
      {id:'DEMO-1039',restaurantId:'khoka',restaurant:'Khoka Market Bites',customerName:'Sample customer · Gaurang',hostel:'Gaurang',room:'G-102',status:'out_for_delivery',total:195,placedAt:new Date(now-1800000).toISOString(),items:[{name:'Chicken Roll',price:80,quantity:2}],payment:'DEMO',paymentStatus:'not_charged',riderId:'r2',riderName:RIDERS[1].name}
    ];
    write(DEMO_KEY,demo.map(o=>({...o,isDemo:true})));localStorage.setItem('iitg_portal_seeded_v1','yes');return true;
  }
  window.IITGStore={catalog,riders:RIDERS,labels:LABELS,states:STATES,orders,createOrder,transition,claimOrder,assignRider,setting,setOpen,setItem,setPrice,seed};
})();

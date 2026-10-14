/* IITG Eats staff portal preview — intentionally client-side ONLY. */
(() => {
 'use strict';
 const store=window.IITGStore;
 const role=document.body.dataset.portal;
 const el=document.getElementById('portalContent');
 const ui={tab:role==='admin'?'overview':role==='vendor'?'orders':'tasks',vendor:'lohit',rider:'all',status:'all',search:''};
 store.seed();
 const esc=(v)=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>'₹'+Math.round(Number(n)||0).toLocaleString('en-IN');
 const date=d=>{try{return new Date(d).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}catch{return '—'}};
 const ago=d=>{const x=(Date.now()-new Date(d))/60000;return x<1?'Just now':x<60?Math.floor(x)+' min ago':x<1440?Math.floor(x/60)+' h ago':date(d)};
 const vendorName=id=>store.catalog.find(v=>v.id===id)?.name||'Unknown canteen';
 const status=o=>`<span class="badge ${esc(o.status)}">${esc(store.labels[o.status]||o.status)}</span>`;
 const userLocation=o=>`${esc(o.hostel||'Campus')} ${o.room?'<span>· '+esc(o.room)+'</span>':''}`;
 const total=o=>`<b>${money(o.total)}</b>`;
 const options=(arr,selected)=>arr.map(([value,label])=>`<option value="${esc(value)}" ${value===selected?'selected':''}>${esc(label)}</option>`).join('');
 const vendorOptions=()=>{
  const all=listed();
  return store.catalog.map(v=>{
    const pending=all.filter(o=>o.restaurantId===v.id && o.status==='placed').length;
    return [v.id, v.name + (pending ? ` (${pending} new)` : '')];
  });
 };
 const riderOptions=()=>{
  const all=listed();
  const fleetActive=all.filter(active).length;
  const list=store.riders.map(r=>{
    const ongoing=all.filter(o=>o.riderId===r.id && active(o)).length;
    return [r.id, r.name + (ongoing ? ` (${ongoing} active)` : '')];
  });
  return [['all', `🛵 All Delivery Partners (Fleet View)${fleetActive ? ` (${fleetActive} active)` : ''}`], ...list];
 };
 const toast=(message)=>{const t=document.getElementById('portalToast');t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),3100)};
 const head=(over,title,sub,actions='')=>`<header class="page-head"><div><p class="eyebrow">${esc(over)}</p><h1>${esc(title)}</h1><p class="muted">${esc(sub)}</p></div><div class="actions">${actions}</div></header>`;
 const button=(action,label,id='',kind='',icon='')=>`<button class="btn small ${kind}" data-action="${action}" ${id?'data-id="'+esc(id)+'"':''}>${icon?'<i class="'+icon+'"></i>':''}${label}</button>`;
 const empty=(title,subtitle)=>`<div class="empty"><i class="ri-inbox-2-line"></i><strong>${esc(title)}</strong><div>${esc(subtitle)}</div></div>`;
 const items=o=>o.items.map(i=>`${Number(i.quantity)||1} × ${esc(i.name)}`).join(' · ');
 const active=o=>!['delivered','rejected','cancelled'].includes(o.status);
 const listed=()=>store.orders();
 const kpi=(label,value,foot,icon)=>`<div class="kpi"><div class="kpi-head"><span class="kpi-label">${esc(label)}</span><span class="kpi-icon"><i class="${icon}"></i></span></div><div class="kpi-value">${value}</div><div class="kpi-foot">${esc(foot)}</div></div>`;
 const allFilters=(defaultLabel='All statuses')=>`<select class="select" data-control="status" aria-label="Filter order status">${options([['all',defaultLabel],['placed','New'],['accepted','Accepted'],['preparing','Preparing'],['ready','Ready'],['picked_up','Picked up'],['out_for_delivery','On the way'],['delivered','Delivered'],['rejected','Rejected'],['cancelled','Cancelled']],ui.status)}</select>`;
 function filteredOrders(source){return source.filter(o=>(ui.status==='all'||o.status===ui.status)&&(!ui.search||[o.id,o.restaurant,o.customerName,o.hostel,items(o)].join(' ').toLowerCase().includes(ui.search.toLowerCase())));}
 const searchInput=()=>`<div class="search"><i class="ri-search-line"></i><input type="search" id="orderSearch" placeholder="Search ID, hostel, dish..." value="${esc(ui.search)}" aria-label="Search orders"></div>`;
 function tableOrders(orders){
  if(!orders.length)return empty('No matching orders','Try another filter or place a demo order from the student site.');
  return `<div class="table-scroll"><table><thead><tr><th>Order</th><th>Canteen / customer</th><th>Destination</th><th>Amount</th><th>Status</th><th>Rider</th><th></th></tr></thead><tbody>${orders.map(o=>`<tr><td><strong>${esc(o.id)}</strong><small>${ago(o.placedAt)}${o.isDemo?' · Sample':''}</small></td><td><strong>${esc(o.restaurant)}</strong><small>${esc(o.customerName)}</small></td><td>${userLocation(o)}</td><td>${total(o)}</td><td>${status(o)}</td><td>${esc(o.riderName||'Unassigned')}</td><td>${button('view','Details',o.id,'','ri-eye-line')}</td></tr>`).join('')}</tbody></table></div>`;
 }
 function activity(){const events=listed().flatMap(o=>(o.history||[]).map(h=>({...h,order:o.id}))).sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,8);
 return events.length?`<div class="audit">${events.map(h=>`<div class="event"><i class="ri-checkbox-circle-line"></i><div><b>${esc(h.event)}</b><p>${esc(h.order)} · ${esc(h.actor)} · ${date(h.at)}</p></div></div>`).join('')}</div>`:empty('No activity yet','Accept, prepare or deliver an order to see activity here.');}
 function adminOverview(){const all=listed(),pending=all.filter(o=>o.status==='placed').length,progress=all.filter(active).length,unassigned=all.filter(o=>['accepted','preparing','ready'].includes(o.status)&&!o.riderId).length;
  return head('CONTROL CENTER','Good morning, Admin','Everything happening across IITG Eats, all in one place.',`${button('switch','View all orders','orders','primary','ri-arrow-right-line')}`)+
   `<div class="hero-mini"><div><strong>Your campus operations, simplified.</strong><p>Monitor canteens, coordinate deliveries and keep orders moving.</p></div><i class="ri-restaurant-line"></i></div>`+
   `<section class="kpis">${kpi('Active orders',progress,'Not yet completed','ri-shopping-basket-line')}${kpi('New requests',pending,'Waiting for canteen','ri-notification-3-line')}${kpi('Unassigned deliveries',unassigned,'Accepted or ready orders','ri-bike-line')}${kpi('Demo order value',money(all.reduce((s,o)=>s+(!['rejected','cancelled'].includes(o.status)?o.total:0),0)),'Order totals, not actual revenue','ri-line-chart-line')}</section>`+
   `<div class="layout-2"><section class="panel"><div class="panel-head"><div><h2>Recent orders</h2><p>Most recent activity across canteens</p></div>${button('switch','See all','orders','','ri-arrow-right-line')}</div>${tableOrders(all.slice(0,6))}</section><section class="panel"><div class="panel-head"><h2>Latest activity</h2></div><div class="panel-body">${activity()}</div></section></div>`;
 }
 function adminOrders(){const all=filteredOrders(listed());return head('ORDER MANAGEMENT','All orders','View requests, assign riders and resolve order issues.')+`<div class="toolbar">${searchInput()}${allFilters()}</div><section class="order-stack">${all.length?all.map(o=>adminCard(o)).join(''):empty('No matching orders','Clear the filters to see other orders.')}</section>`;}
 function adminCard(o){const canAssign=['accepted','preparing','ready'].includes(o.status);const riders=riderOptions().filter(r=>r[0]!=='all');
  const acceptAction = o.status==='placed' ? button('accept','Accept order',o.id,'primary','ri-check-line') : '';
  const readyAction = o.status==='ready' ? button('picked_up','Dispatch for delivery',o.id,'success','ri-bike-line') : '';
  return `<article class="order-card"><div class="order-top"><div><div class="item-title">${esc(o.id)} <a href="vendor.html?canteen=${encodeURIComponent(o.restaurantId)}" style="text-decoration:none;color:inherit"><span class="muted" style="text-decoration:underline">· ${esc(o.restaurant)}</span></a></div><div class="order-meta"><span><i class="ri-user-line"></i>${esc(o.customerName)}</span><span><i class="ri-map-pin-line"></i>${userLocation(o)}</span><span><i class="ri-time-line"></i>${ago(o.placedAt)}</span><span><i class="ri-bike-line"></i>${esc(o.riderName||'Unassigned')}</span></div></div>${status(o)}</div><div class="order-items">${items(o)} ${o.deliveryNote?`<div class="mini-note">Note: ${esc(o.deliveryNote)}</div>`:''}</div><div class="order-foot"><div><div class="price">${money(o.total)}</div><span class="item-sub">${o.isDemo?'Sample order · No payment':'Demo checkout · Payment not verified'}</span></div><div class="actions">${acceptAction}${readyAction}${canAssign?`<select class="select" id="assign-${esc(o.id)}" aria-label="Rider for ${esc(o.id)}">${options([['','Choose rider'],...riders],o.riderId||'')}</select>${button('assign','Assign rider',o.id,'primary','ri-bike-line')}`:''}${active(o)?button('cancel','Cancel order',o.id,'danger','ri-close-line'):''}${button('view','Timeline',o.id,'','ri-file-list-2-line')}</div></div></article>`;
 }
 function adminVendors(){return head('PARTNERS','Canteen partners','Control preview outlet availability and explore the menus.')+`<div class="grid-vendors">${store.catalog.map(v=>{const s=store.setting(v.id),off=v.menu.filter(m=>s.disabledItems[m.id]).length;return `<article class="panel vendor-card"><div class="vendor-head"><div class="vendor-symbol"><i class="ri-store-2-line"></i></div><div><h3>${esc(v.name)}</h3><p class="vendor-desc">${esc(v.cuisines)}</p></div></div><div class="vendor-desc">${v.menu.length} menu items · ${off} paused</div><div class="vendor-footer"><button class="toggle ${s.isOpen?'on':''}" data-action="toggle-vendor" data-id="${esc(v.id)}"><i class="ri-${s.isOpen?'checkbox-circle':'close-circle'}-line"></i> ${s.isOpen?'Accepting orders':'Paused'}</button>${button('open-vendor','Manage menu',v.id,'','ri-arrow-right-line')}</div></article>`}).join('')}</div><div class="notice"><i class="ri-information-line"></i><span>Restaurant listings and menu prices are illustrative data from your original website, not verified partnerships or vendor-approved prices.</span></div>`;}
 function adminRiders(){const all=listed();return head('FLEET OPERATIONS','Delivery partners','Coordinate sample riders and their assigned deliveries.')+`<section class="kpis">${kpi('Sample riders',store.riders.length,'Preview identities only','ri-team-line')}${kpi('Deliveries in progress',all.filter(o=>o.riderId&&['ready','picked_up','out_for_delivery'].includes(o.status)).length,'Assigned, not completed','ri-bike-line')}${kpi('Unassigned',all.filter(o=>['accepted','preparing','ready'].includes(o.status)&&!o.riderId).length,'Need rider coordination','ri-user-add-line')}${kpi('Delivered',all.filter(o=>o.status==='delivered').length,'Demo order history','ri-check-double-line')}</section><div class="grid-vendors">${store.riders.map(r=>{const os=all.filter(o=>o.riderId===r.id);return `<article class="panel vendor-card"><div class="vendor-head"><div class="vendor-symbol"><i class="ri-bike-line"></i></div><div><h3>${esc(r.name)}</h3><p class="vendor-desc">Sample delivery partner</p></div></div><p class="vendor-desc">${os.filter(active).length} active · ${os.filter(o=>o.status==='delivered').length} delivered</p><div class="vendor-footer"><span class="badge ready">Preview account</span>${button('open-rider','View tasks',r.id,'','ri-arrow-right-line')}</div></article>`}).join('')}</div>`;}
 function vendorOrders(){const v=store.catalog.find(v=>v.id===ui.vendor)||store.catalog[0];const s=store.setting(v.id);const all=listed().filter(o=>o.restaurantId===v.id),filtered=filteredOrders(all);
 return head('CANTEEN WORKSPACE',v.name,'Manage incoming orders and mark meals ready.',`<select class="select" data-control="vendor" aria-label="Select demo canteen">${options(vendorOptions(),v.id)}</select>`)+
 `<div class="hero-mini"><div><strong>Kitchen operations</strong><p>Accept orders → Start preparing → Mark ready for delivery.</p></div><i class="ri-restaurant-line"></i></div>`+
 `<div class="kpis">${kpi('New orders',all.filter(o=>o.status==='placed').length,'Need acceptance','ri-notification-line')}${kpi('In kitchen',all.filter(o=>['accepted','preparing'].includes(o.status)).length,'Accepted or preparing','ri-fire-line')}${kpi('Ready to collect',all.filter(o=>o.status==='ready').length,'Awaiting pickup','ri-check-double-line')}${kpi('Menu items',v.menu.length,`${v.menu.filter(m=>s.disabledItems[m.id]).length} currently paused`,'ri-restaurant-2-line')}</div>`+
 `<div class="toolbar">${searchInput()}${allFilters()}</div>`+
 `<div class="order-stack">${filtered.length?filtered.map(o=>vendorCard(o)).join(''):empty('No orders at this stage','Orders from the selected canteen appear here.')}</div>`;
 }
 function vendorCard(o){let actions='';
 if(o.status==='placed')actions=`${button('accept','Accept order',o.id,'primary','ri-check-line')}${button('reject','Reject',o.id,'danger','ri-close-line')}`;
 if(o.status==='accepted')actions=button('preparing','Start preparing',o.id,'primary','ri-fire-line');
 if(o.status==='preparing')actions=button('ready','Mark food ready',o.id,'success','ri-check-double-line');
 if(o.status==='ready')actions=button('picked_up','Handover to rider',o.id,'primary','ri-shopping-bag-line');
 return `<article class="order-card"><div class="order-top"><div><div class="item-title">${esc(o.id)} · ${esc(o.customerName)}</div><div class="order-meta"><span><i class="ri-map-pin-line"></i>${userLocation(o)}</span><span><i class="ri-time-line"></i>${ago(o.placedAt)}</span><span><i class="ri-bike-line"></i>${esc(o.riderName||'Rider pending')}</span></div></div>${status(o)}</div><div class="order-items">${items(o)} ${o.deliveryNote?`<div class="mini-note">Note: ${esc(o.deliveryNote)}</div>`:''}</div><div class="order-foot"><span class="price">${money(o.total)}</span><div class="actions">${actions}${button('view','Details',o.id,'','ri-file-list-line')}</div></div></article>`;
 }
 function vendorMenu(){const v=store.catalog.find(v=>v.id===ui.vendor)||store.catalog[0],s=store.setting(v.id);
 return head('MENU MANAGEMENT',v.name,'Update item availability and demo prices.',`<select class="select" data-control="vendor" aria-label="Select demo canteen">${options(vendorOptions(),v.id)}</select>`)+
 `<section class="panel"><div class="panel-head"><div><h2>Menu availability</h2><p>Changes also appear in the student catalogue in this browser after refresh.</p></div><button class="toggle ${s.isOpen?'on':''}" data-action="toggle-vendor" data-id="${esc(v.id)}">${s.isOpen?'Open for orders':'Currently paused'}</button></div><div class="panel-body"><div class="menu-list">${v.menu.map(item=>{const available=!s.disabledItems[item.id],price=s.prices[item.id]||item.price;return `<div class="menu-row"><div class="menu-dot"><i class="ri-restaurant-line"></i></div><div class="menu-text"><b>${esc(item.name)}</b><small>${esc(item.cat)} · ${item.isVeg?'Vegetarian':'Non-vegetarian'}</small></div><div class="menu-controls"><label><span class="inline-label">Price ₹</span><input class="number" type="number" min="1" max="10000" step="1" value="${esc(price)}" data-price-item="${esc(item.id)}" aria-label="Price for ${esc(item.name)}"></label><button class="toggle ${available?'on':''}" data-action="toggle-item" data-id="${esc(item.id)}">${available?'Available':'Sold out'}</button></div></div>`}).join('')}</div></div></section><p class="muted" style="font-size:12px;margin-top:12px">Change a price and press Enter or click outside the input to save.</p>`;
 }
 function readyPoolCard(o, rider, isFleet){
  const isMine = rider && o.riderId === rider.id;
  const isOther = rider && o.riderId && o.riderId !== rider.id;
  const riderBadge = !o.riderId
    ? `<span class="badge ready" style="background:#fed7aa;color:#9a3412;"><i class="ri-time-line"></i> Awaiting pickup</span>`
    : isMine
    ? `<span class="badge preparing" style="background:#dcfce7;color:#166534;"><i class="ri-user-check-line"></i> Assigned to you</span>`
    : `<span class="badge" style="background:#e0f2fe;color:#0369a1;"><i class="ri-user-line"></i> Assigned to ${esc(o.riderName)}</span>`;
  const pickupBtn = isMine
    ? button('picked_up','Confirm pickup',o.id,'primary','ri-shopping-bag-line')
    : isOther
    ? button('claim-pickup','Take over & pick up',o.id,'primary','ri-arrow-left-right-line')
    : button('claim-pickup','Pick up order',o.id,'primary','ri-shopping-bag-line');
  return `<article class="order-card" style="border-left: 4px solid #f47b20; background: #fffcf8;"><div class="order-top"><div><div class="item-title">${esc(o.restaurant)} <span class="muted">→ ${esc(o.hostel)} Hostel</span></div><div class="order-meta"><span><i class="ri-hashtag"></i>${esc(o.id)}</span><span><i class="ri-time-line"></i>${ago(o.placedAt)}</span><span>${esc(o.customerName)}</span><span style="color:#c2410c;font-weight:600"><i class="ri-store-2-line"></i>Ready at ${esc(o.restaurant)}</span></div></div><div style="display:flex;gap:6px;align-items:center;">${riderBadge}${status(o)}</div></div><div class="order-items">${items(o)}${o.deliveryNote?`<div class="mini-note">Note: ${esc(o.deliveryNote)}</div>`:''}</div><div class="order-foot"><div><div class="price">${money(o.total)}</div><div class="item-sub">${esc(o.room||'Campus meeting point')} · ${o.riderName ? 'Assigned: '+esc(o.riderName) : 'Ready at canteen counter'}</div></div><div class="actions">${pickupBtn}${button('view','Details',o.id,'','ri-file-list-line')}</div></div></article>`;
 }
 function readyPoolSection(pool, rider, isFleet){
  return `<section class="panel section-spacer" style="border: 2px solid #f47b20; background: #fffaf5;">`+
   `<div class="panel-head" style="border-bottom: 1px solid #fed7aa; padding: 14px 18px;">`+
     `<div><h2 style="color: #c2410c; display: flex; align-items: center; gap: 8px;"><i class="ri-shopping-bag-3-fill"></i> Food ready at canteen counter (${pool.length})</h2><p class="muted" style="margin: 4px 0 0;">These orders are cooked, packed, and waiting for delivery. Click <strong>Pick up order</strong> to claim and start your run.</p></div>`+
   `</div>`+
   `<div class="panel-body" style="padding: 14px 18px;"><div class="order-stack">${pool.map(o=>readyPoolCard(o, rider, isFleet)).join('')}</div></div>`+
  `</section>`;
 }
 function kitchenCard(o){
  return `<article class="order-card" style="opacity: 0.95; background: #f8fafc;"><div class="order-top"><div><div class="item-title">${esc(o.restaurant)} <span class="muted">→ ${esc(o.hostel)} Hostel</span></div><div class="order-meta"><span><i class="ri-hashtag"></i>${esc(o.id)}</span><span><i class="ri-time-line"></i>${ago(o.placedAt)}</span><span>${esc(o.customerName)}</span><span style="color:#475569;font-weight:600"><i class="ri-fire-line"></i>In kitchen at ${esc(o.restaurant)}</span></div></div><div style="display:flex;gap:6px;align-items:center;">${status(o)}</div></div><div class="order-items">${items(o)}${o.deliveryNote?`<div class="mini-note">Note: ${esc(o.deliveryNote)}</div>`:''}</div><div class="order-foot"><div><div class="price">${money(o.total)}</div><div class="item-sub">${esc(o.room||'Campus meeting point')} · ${o.riderName ? 'Assigned: '+esc(o.riderName) : 'Preparing meal in kitchen'}</div></div><div class="actions">${button('claim-pickup','Pick up from counter',o.id,'','ri-shopping-bag-line')}${button('view','Details',o.id,'','ri-file-list-line')}</div></div></article>`;
 }
 function kitchenPoolSection(pool){
  return `<section class="panel section-spacer" style="border: 1px dashed #94a3b8; background: #f8fafc;">`+
   `<div class="panel-head" style="padding: 12px 18px; border-bottom: 1px dashed #cbd5e1;">`+
     `<div><h3 style="color: #334155; display: flex; align-items: center; gap: 8px; font-size: 15px; margin: 0;"><i class="ri-restaurant-line"></i> Cooking at canteens (${pool.length})</h3><p class="muted" style="margin: 4px 0 0; font-size: 12px;">Meals being prepared right now. If already handed over at the counter, click <strong>Pick up from counter</strong>.</p></div>`+
   `</div>`+
   `<div class="panel-body" style="padding: 14px 18px;"><div class="order-stack">${pool.map(o=>kitchenCard(o)).join('')}</div></div>`+
  `</section>`;
 }
 function riderTasks(){
  const isFleet = ui.rider === 'all';
  const rider = !isFleet ? (store.riders.find(r=>r.id===ui.rider)||store.riders[0]) : null;
  const all = listed();
  const allActive = all.filter(active);
  const myAssigned = isFleet ? allActive : all.filter(o=>o.riderId===rider?.id && active(o));
  const activeOrders = filteredOrders(myAssigned);
  
  const readyOrders = all.filter(o=>o.status==='ready');
  const readyPool = (ui.status==='all'||ui.status==='ready') ? (!ui.search ? readyOrders : filteredOrders(readyOrders)) : [];
  
  const kitchenOrders = all.filter(o=>['accepted','preparing'].includes(o.status));
  const kitchenPool = (ui.status==='all'||['accepted','preparing'].includes(ui.status)) ? (!ui.search ? kitchenOrders : filteredOrders(kitchenOrders)) : [];
  
  const otherTasks = (!isFleet && rider) ? allActive.filter(o=>o.riderId && o.riderId!==rider.id) : [];
  const currentRiderId = isFleet ? 'all' : rider.id;
  
  const noticeBanner = (!isFleet && otherTasks.length > 0) ? (
    `<div style="margin-bottom:18px;padding:12px 18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;color:#1e40af;">`+
      `<span><i class="ri-information-line"></i> <strong>Campus deliveries active:</strong> ${readyPool.length ? `${readyPool.length} order(s) ready at counter · ` : ''}${otherTasks.length ? `${otherTasks.length} task(s) assigned to other riders (${[...new Set(otherTasks.map(o=>o.riderName||'Other'))].join(', ')})` : ''}</span>`+
      `<div style="display:flex;gap:8px;">`+
        `${button('switch-rider','View all fleet tasks','all','primary','ri-dashboard-line')}`+
        `${otherTasks[0]?.riderId ? button('switch-rider',`Switch to ${esc(otherTasks[0].riderName.split(' ')[0])}`,otherTasks[0].riderId,'','ri-user-line') : ''}`+
      `</div>`+
    `</div>`
  ) : '';

  const subtitle = isFleet ? 'All active campus deliveries and canteen pickups across the fleet.' : `Deliveries and canteen pickups for ${esc(rider.name)}.`;
  const tasksTitle = isFleet ? `All active fleet tasks (${activeOrders.length})` : `My active tasks (${activeOrders.length})`;
  const tasksSubtitle = isFleet ? 'Ongoing deliveries across all campus delivery partners' : `Deliveries currently assigned to ${esc(rider.name)}`;

  return head('RIDER WORKSPACE','Your delivery queue',subtitle,`<select class="select" data-control="rider" aria-label="Select demo delivery partner">${options(riderOptions(),currentRiderId)}</select>`)+
  `<div class="hero-mini"><div><strong>Every handoff matters.</strong><p>Go to the canteen → confirm pickup → head to the hostel → mark delivered.</p></div><i class="ri-bike-line"></i></div>`+
  `<div class="kpis">${kpi(isFleet?'Active fleet orders':'Assigned to you',myAssigned.length,'Active deliveries','ri-archive-line')}${kpi('Ready for pickup',readyOrders.length,readyOrders.length?`${readyOrders.length} ready at counters`:'All picked up','ri-store-line')}${kpi('On the road',all.filter(o=>['picked_up','out_for_delivery'].includes(o.status)&&(isFleet||o.riderId===rider?.id)).length,'In transit','ri-bike-line')}${kpi('Completed',all.filter(o=>o.status==='delivered'&&(isFleet||o.riderId===rider?.id)).length,'Delivered orders','ri-checkbox-circle-line')}</div>`+
  `<div class="toolbar">${searchInput()}${allFilters()}</div>`+
  noticeBanner +
  (readyPool.length ? readyPoolSection(readyPool, rider, isFleet) : '')+
  `<section class="panel section-spacer"><div class="panel-head"><h2>${tasksTitle}</h2><p>${tasksSubtitle}</p></div><div class="panel-body"><section class="order-stack">${activeOrders.length?activeOrders.map(o=>riderCard(o, rider, isFleet)).join(''):empty('No active assigned deliveries',readyPool.length?'Food is ready at the canteen counter above — click Pick up order!':kitchenPool.length?'Canteens are currently preparing food below.':'Check back when canteen marks food ready, or pick up an order from the counter.')}</section></div></section>`+
  (kitchenPool.length ? kitchenPoolSection(kitchenPool) : '');
 }
 function riderHistory(){
  const isFleet = ui.rider === 'all';
  const r = !isFleet ? (store.riders.find(r=>r.id===ui.rider)||store.riders[0]) : null;
  const o = listed().filter(o=>(isFleet || o.riderId===r?.id)&&!active(o));
  const currentRiderId = isFleet ? 'all' : r.id;
  return head('DELIVERY HISTORY','Completed & closed',isFleet?'All completed and closed deliveries across the fleet.':`Delivery history for ${esc(r.name)}.`,`<select class="select" data-control="rider">${options(riderOptions(),currentRiderId)}</select>`)+tableOrders(o);
 }
 function riderCard(o, rider, isFleet){
  let action='';
  if(o.status==='ready')action=button('picked_up','Confirm pickup',o.id,'primary','ri-shopping-bag-line');
  if(o.status==='picked_up')action=button('out_for_delivery','Start delivery',o.id,'primary','ri-bike-line');
  if(o.status==='out_for_delivery')action=button('delivered','Mark delivered',o.id,'success','ri-check-double-line');
  if(['accepted','preparing'].includes(o.status))action=button('claim-pickup','Pick up from counter',o.id,'','ri-shopping-bag-line');
  
  const riderBadge = isFleet
    ? `<span class="badge" style="background:#e0f2fe;color:#0369a1;"><i class="ri-bike-line"></i> ${esc(o.riderName||'Unassigned')}</span>`
    : (rider && o.riderId && o.riderId !== rider.id ? `<span class="badge" style="background:#fee2e2;color:#991b1b;"><i class="ri-user-line"></i> ${esc(o.riderName)}</span>` : '');

  return `<article class="order-card"><div class="order-top"><div><div class="item-title">${esc(o.restaurant)} <span class="muted">→ ${esc(o.hostel)} Hostel</span></div><div class="order-meta"><span><i class="ri-hashtag"></i>${esc(o.id)}</span><span><i class="ri-time-line"></i>${ago(o.placedAt)}</span><span>${esc(o.customerName)}</span></div></div><div style="display:flex;gap:6px;align-items:center;">${riderBadge}${status(o)}</div></div><div class="order-items">${items(o)}${o.deliveryNote?`<div class="mini-note">Delivery note: ${esc(o.deliveryNote)}</div>`:''}</div><div class="order-foot"><div><div class="price">${money(o.total)}</div><div class="item-sub">${esc(o.room||'Approved meeting point')} · Verify customer before handoff</div></div><div class="actions">${action}${button('view','Timeline',o.id,'','ri-file-list-line')}</div></div>${['accepted','preparing'].includes(o.status)?'<div class="mini-note">Food in kitchen prep. Pick up if ready at counter.</div>':''}</article>`;
 }
 function guide(){return `<div class="panel section-spacer"><div class="panel-head"><h2>How the portals connect</h2></div><div class="panel-body quick-guide">${[['Student','Places an order from the food website'],['Canteen','Accepts and prepares the meal'],['Admin','Assigns a demo rider'],['Delivery','Picks up food and confirms handoff']].map(([title,desc],i)=>`<div class="step"><span class="step-num">${i+1}</span><div><b>${title}</b><p>${desc}</p></div></div>`).join('')}</div></div>`;}
 function render(){let html='';
 if(role==='admin'){html=ui.tab==='overview'?adminOverview():ui.tab==='orders'?adminOrders():ui.tab==='vendors'?adminVendors():adminRiders();}
 if(role==='vendor'){html=ui.tab==='menu'?vendorMenu():vendorOrders();}
 if(role==='rider'){html=ui.tab==='history'?riderHistory():riderTasks();}
 el.innerHTML=`${role==='vendor'?`<div class="filter-tabs section-spacer">${[['orders','Orders'],['menu','Menu & availability']].map(([x,l])=>`<button class="filter-tab ${ui.tab===x?'active':''}" data-action="switch" data-id="${x}">${l}</button>`).join('')}</div>`:''}${role==='admin'?`<div class="filter-tabs section-spacer">${[['overview','Overview'],['orders','Orders'],['vendors','Canteens'],['riders','Riders']].map(([x,l])=>`<button class="filter-tab ${ui.tab===x?'active':''}" data-action="switch" data-id="${x}">${l}</button>`).join('')}</div>`:role==='rider'?`<div class="filter-tabs section-spacer">${[['tasks','My tasks'],['history','Delivery history']].map(([x,l])=>`<button class="filter-tab ${ui.tab===x?'active':''}" data-action="switch" data-id="${x}">${l}</button>`).join('')}</div>`:''}${html}${role==='rider'&&ui.tab==='tasks'?guide():''}`;
 }
 function viewTimeline(id){const o=listed().find(x=>x.id===id);if(!o)return toast('Order not found');
 const hasInitial = (o.history||[]).some(h=>/create|submit/i.test(h.event));
 const history=hasInitial ? (o.history||[]) : [{at:o.placedAt,event:'Order created',actor:'customer'},...(o.history||[])];
 const dialog=document.getElementById('orderDialog');
 document.getElementById('orderDialogBody').innerHTML=`<p class="eyebrow">ORDER DETAILS</p><div class="dialog-title">${esc(o.id)}</div><div class="dialog-row"><b>${esc(o.restaurant)}</b>${status(o)}</div><div class="dialog-meta"><b>${esc(o.customerName)}</b><p>${esc(o.hostel)}${o.room?', '+esc(o.room):''}</p><p>${items(o)}</p><div class="dialog-row"><span>Order value (demo)</span><b>${money(o.total)}</b></div><p>Rider: ${esc(o.riderName||'Not assigned')}</p></div><h3>Activity timeline</h3><ol class="timeline-list">${history.map(h=>`<li>${esc(h.event)}<small>${date(h.at)} · ${esc(h.actor)}</small></li>`).join('')}</ol><p class="muted" style="font-size:12px">Demo only — no payment was collected.</p>`;
 dialog.showModal();
 }
 el.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b)return;
 const action=b.dataset.action,id=b.dataset.id;
 try{
  if(action==='switch'){ui.tab=id;ui.search='';ui.status='all';render();return;}
  if(action==='switch-rider'){ui.rider=id;render();return;}
  if(action==='view'){viewTimeline(id);return;}
  if(action==='open-vendor'){ui.vendor=id;location.href='vendor.html?canteen='+encodeURIComponent(id)+'&tab=menu';return;}
  if(action==='open-rider'){ui.rider=id;location.href='rider.html?rider='+encodeURIComponent(id);return;}
  if(action==='toggle-vendor'){const s=store.setting(id);store.setOpen(id,!s.isOpen);toast('Canteen '+(!s.isOpen?'opened':'paused')+' in preview');render();return;}
  if(action==='toggle-item'){const s=store.setting(ui.vendor);store.setItem(ui.vendor,id,!!s.disabledItems[id]);toast('Menu availability updated');render();return;}
  if(action==='assign'){const select=document.getElementById('assign-'+id);if(!select?.value)throw Error('Choose a rider first.');store.assignRider(id,select.value);toast('Rider assigned');render();return;}
  if(action==='claim-pickup'){
    const riderId = (ui.rider && ui.rider !== 'all') ? ui.rider : 'r1';
    store.claimOrder(id,riderId,true);
    toast(`Order ${id} picked up! Ready for delivery.`);
    render();
    return;
  }
  const transitions={accept:['accepted','vendor'],reject:['rejected','vendor'],preparing:['preparing','vendor'],ready:['ready','vendor'],picked_up:['picked_up','rider'],out_for_delivery:['out_for_delivery','rider'],delivered:['delivered','rider'],cancel:['cancelled','admin']};
  if(transitions[action]){
    const [next,defaultWho]=transitions[action];
    const who = role==='admin' ? 'admin' : defaultWho;
    if(['cancel','reject'].includes(action)&&!confirm(`Are you sure you want to ${action} order ${id}?`))return;
    const o=listed().find(o=>o.id===id);
    if(who==='vendor'&&o.restaurantId!==ui.vendor)throw Error('Wrong canteen preview selected');
    const currentRider = (ui.rider && ui.rider !== 'all') ? ui.rider : (o?.riderId || 'r1');
    store.transition(id,next,who,currentRider);
    toast(`${id}: ${store.labels[next]}`);
    render();
    return;
  }
 }catch(err){toast(err.message||'Action failed');}
 });
 el.addEventListener('change',e=>{
 const t=e.target;
 try{
  if(t.dataset.control==='vendor'){ui.vendor=t.value;ui.search='';ui.status='all';render();}
  if(t.dataset.control==='rider'){ui.rider=t.value;ui.search='';ui.status='all';render();}
  if(t.dataset.control==='status'){ui.status=t.value;render();}
  if(t.dataset.priceItem){store.setPrice(ui.vendor,t.dataset.priceItem,t.value);toast('Menu price saved');render();}
 }catch(err){toast(err.message||'Could not update');render();}
 });
 el.addEventListener('input',e=>{if(e.target.id==='orderSearch'){const pos=e.target.selectionStart;ui.search=e.target.value;render();const next=document.getElementById('orderSearch');if(next){next.focus();try{next.setSelectionRange(pos,pos)}catch{}}}});
 const params=new URLSearchParams(location.search);
 if(role==='vendor'&&store.catalog.some(v=>v.id===params.get('canteen')))ui.vendor=params.get('canteen');
 if(role==='rider'&&(params.get('rider')==='all'||store.riders.some(r=>r.id===params.get('rider'))))ui.rider=params.get('rider');
 if(role==='vendor'&&params.get('tab')==='menu')ui.tab='menu';
 window.addEventListener('storage',e=>{if(['iitg_orders','iitg_portal_demo_orders_v1','iitg_portal_vendor_settings_v1'].includes(e.key))render();});
 window.addEventListener('iitg:updated',render);
 render();
})();

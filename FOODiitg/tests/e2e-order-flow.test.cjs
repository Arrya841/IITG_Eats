const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const code = name => fs.readFileSync(path.join(root, name), 'utf8');
const assert = (truth, message) => { if (!truth) throw new Error(message); };

console.log('--- STARTING E2E ORDER FLOW & CORRELATION VERIFICATION ---');

// Simulated storage and broadcast bus across portals
const sharedStorage = {};
const busListeners = [];

class FakeBroadcastChannel {
  constructor(name) {
    this.name = name;
    busListeners.push(this);
  }
  postMessage(data) {
    for (const b of busListeners) {
      if (b !== this && typeof b.onmessage === 'function') {
        b.onmessage({ data });
      }
    }
  }
}

function createPortalEnvironment(role) {
  const listeners = {};
  const content = {
    innerHTML: '',
    addEventListener(name, cb) { listeners['main:' + name] = cb; },
    click(action, id) {
      const fakeEvent = {
        target: {
          closest(sel) {
            if (sel === '[data-action]') return { dataset: { action, id } };
            return null;
          }
        }
      };
      listeners['main:click']?.(fakeEvent);
    }
  };

  const toast = { textContent: '', classList: { add() {}, remove() {} } };
  const doc = {
    body: { dataset: { portal: role } },
    getElementById(id) {
      if (id === 'portalContent') return content;
      if (id === 'portalToast') return toast;
      if (id === 'orderDialog') return { showModal() {} };
      if (id === 'orderDialogBody') return { innerHTML: '' };
      if (id.startsWith('assign-')) return { value: 'r1' };
      return null;
    }
  };

  const win = {
    addEventListener(name, cb) { listeners['win:' + name] = cb; },
    dispatchEvent(e) {
      listeners['win:' + e.type]?.(e);
    },
    BroadcastChannel: FakeBroadcastChannel
  };

  const ctx = {
    window: win,
    document: doc,
    location: { search: '', href: '' },
    console,
    Date,
    Math,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    confirm: () => true,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    localStorage: {
      getItem: k => sharedStorage[k] ?? null,
      setItem: (k, v) => { sharedStorage[k] = String(v); }
    }
  };

  vm.createContext(ctx);
  vm.runInContext(code('catalog.js'), ctx, { filename: 'catalog.js' });
  vm.runInContext(code('portal-data.js'), ctx, { filename: 'portal-data.js' });
  vm.runInContext(code('portal.js'), ctx, { filename: 'portal.js' });

  return { ctx, content, store: win.IITGStore, listeners };
}

// 1. Initialize staff portals
const adminPortal = createPortalEnvironment('admin');
const vendorPortal = createPortalEnvironment('vendor');
const riderPortal = createPortalEnvironment('rider');

// 2. Simulate Student placing an order from Lohit Canteen
const testOrderId = 'DEMO-TEST-' + Date.now();
const studentOrder = {
  id: testOrderId,
  restaurantId: 'lohit',
  restaurant: 'Lohit Canteen',
  customerName: 'Rohit Sharma (IITG Student)',
  hostel: 'Kameng',
  room: 'Room B-204',
  deliveryNote: 'Leave at Kameng entrance if blocked',
  items: [
    { itemId: 'l1', name: 'Veg Samosa (2 pcs)', price: 30, quantity: 2 },
    { itemId: 'l6', name: 'Masala Chai', price: 15, quantity: 1 }
  ],
  itemTotal: 75,
  delivery: 25,
  tax: 5,
  total: 105,
  status: 'placed',
  payment: 'UPI (DEMO – not charged)',
  paymentStatus: 'not_charged',
  placedAt: new Date().toISOString()
};

console.log('Step 1: Student places order ->', studentOrder.id);
adminPortal.store.createOrder(studentOrder);

// Verify order is saved in shared storage under iitg_orders
const rawStoredOrders = JSON.parse(sharedStorage['iitg_orders'] || '[]');
assert(rawStoredOrders.some(o => o.id === testOrderId), 'Order must be saved in iitg_orders');
console.log('✔ Order persisted in customer storage');

// Verify order is visible in Admin Portal
const allAdminOrders = adminPortal.store.orders();
const adminView = allAdminOrders.find(o => o.id === testOrderId);
assert(adminView, 'Admin portal must see the student order');
assert(adminView.status === 'placed', 'Initial status must be placed');
assert(adminView.customerName === 'Rohit Sharma (IITG Student)', 'Customer name must correlate');
assert(adminView.total === 105, 'Total must match 105');
assert(adminView.itemTotal === 75, 'Item total must correlate');
console.log('✔ Admin portal successfully retrieved order with full metadata');

// Verify order is visible in Lohit Canteen (vendor portal)
const vendorOrders = vendorPortal.store.orders().filter(o => o.restaurantId === 'lohit');
const vendorView = vendorOrders.find(o => o.id === testOrderId);
assert(vendorView, 'Lohit Canteen must see the order');
assert(vendorView.status === 'placed', 'Vendor sees placed status');
console.log('✔ Canteen portal sees incoming order');

// Step 3: Canteen accepts order
console.log('Step 2: Canteen accepts order');
vendorPortal.store.transition(testOrderId, 'accepted', 'vendor');
assert(vendorPortal.store.orders().find(o => o.id === testOrderId).status === 'accepted', 'Order must be accepted');
console.log('✔ Canteen status: accepted');

// Step 4: Canteen starts preparing
console.log('Step 3: Canteen starts preparing');
vendorPortal.store.transition(testOrderId, 'preparing', 'vendor');
assert(vendorPortal.store.orders().find(o => o.id === testOrderId).status === 'preparing', 'Order must be preparing');
console.log('✔ Canteen status: preparing');

// Step 5: Canteen marks food ready
console.log('Step 4: Canteen marks food ready');
vendorPortal.store.transition(testOrderId, 'ready', 'vendor');
assert(vendorPortal.store.orders().find(o => o.id === testOrderId).status === 'ready', 'Order must be ready');
console.log('✔ Canteen status: ready');

// Step 6: Admin assigns rider 'r1' (Aarav)
console.log('Step 5: Admin assigns rider Aarav (r1)');
adminPortal.store.assignRider(testOrderId, 'r1');
const assignedOrder = adminPortal.store.orders().find(o => o.id === testOrderId);
assert(assignedOrder.riderId === 'r1', 'Rider ID must be r1');
assert(assignedOrder.riderName === 'Aarav (demo rider)', 'Rider Name must be Aarav (demo rider)');
console.log('✔ Admin assigned rider: Aarav (demo rider)');

// Step 7: Rider views task in rider queue
console.log('Step 6: Rider Aarav checks tasks');
const riderTasks = riderPortal.store.orders().filter(o => o.riderId === 'r1');
const riderView = riderTasks.find(o => o.id === testOrderId);
assert(riderView, 'Rider r1 must find this order in tasks');
assert(riderView.status === 'ready', 'Rider sees order is ready for pickup');
console.log('✔ Rider sees assigned ready order');

// Step 8: Rider confirms pickup
console.log('Step 7: Rider confirms pickup');
riderPortal.store.transition(testOrderId, 'picked_up', 'rider');
assert(riderPortal.store.orders().find(o => o.id === testOrderId).status === 'picked_up', 'Order must be picked_up');
console.log('✔ Status: picked_up');

// Step 9: Rider starts delivery
console.log('Step 8: Rider starts delivery');
riderPortal.store.transition(testOrderId, 'out_for_delivery', 'rider');
assert(riderPortal.store.orders().find(o => o.id === testOrderId).status === 'out_for_delivery', 'Order must be out_for_delivery');
console.log('✔ Status: out_for_delivery');

// Step 10: Rider marks delivered
console.log('Step 9: Rider marks delivered');
riderPortal.store.transition(testOrderId, 'delivered', 'rider');
const deliveredOrder = riderPortal.store.orders().find(o => o.id === testOrderId);
assert(deliveredOrder.status === 'delivered', 'Order must be delivered');
console.log('✔ Status: delivered');

// Step 11: Verify audit timeline contains all actors and events
console.log('Step 10: Checking audit timeline');
const finalHistory = deliveredOrder.history;
assert(finalHistory.length >= 6, 'Audit history must record all steps');
console.log('Timeline events:');
for (const h of finalHistory) {
  console.log(`  - [${h.actor.toUpperCase()}] ${h.event}`);
}

// Step 12: Verify student sees final delivered state without NaN or missing values
console.log('Step 11: Verifying student tracking correlation');
assert(deliveredOrder.total === 105, 'Total is preserved');
assert(deliveredOrder.itemTotal === 75, 'ItemTotal is preserved');
assert(deliveredOrder.delivery === 25, 'Delivery fee is preserved');
assert(deliveredOrder.tax === 5, 'Tax is preserved');
assert(deliveredOrder.riderName === 'Aarav (demo rider)', 'Assigned rider visible to student');
assert(deliveredOrder.hostel === 'Kameng', 'Hostel destination preserved');

console.log('\n--- TESTING FLOW 2: READY FOOD DIRECT PICKUP IN DELIVERY PORTAL ---');
const order2Id = 'DEMO-FLOW2-' + Date.now();
adminPortal.store.createOrder({
  id: order2Id,
  restaurantId: 'kameng',
  restaurant: 'Kameng Night Mess',
  customerName: 'Priya Patel',
  hostel: 'Subansiri',
  room: 'Room S-108',
  items: [{ itemId: 'k1', name: 'Chicken Dum Biryani', price: 180, quantity: 1 }],
  itemTotal: 180,
  delivery: 0,
  tax: 9,
  total: 189,
  status: 'placed',
  placedAt: new Date().toISOString()
});

console.log('Flow 2 - Step 1: Order created ->', order2Id);
vendorPortal.store.transition(order2Id, 'accepted', 'vendor');
vendorPortal.store.transition(order2Id, 'preparing', 'vendor');
vendorPortal.store.transition(order2Id, 'ready', 'vendor');
console.log('Flow 2 - Step 2: Food marked ready at canteen (NO rider assigned yet)');

// Now Rider opens delivery portal (simulated)
// Re-render rider portal
riderPortal.ctx.window.dispatchEvent(new riderPortal.ctx.CustomEvent('iitg:updated', { detail: 'iitg_orders' }));

// Check that the rider portal DOM contains the ready pool section and the order
assert(riderPortal.content.innerHTML.includes('Food ready at canteen counter'), 'Delivery portal MUST display ready orders at canteen counter');
assert(riderPortal.content.innerHTML.includes(order2Id), 'Delivery portal MUST show the ready order ID');
assert(riderPortal.content.innerHTML.includes('Pick up order'), 'Delivery portal MUST have Pick up order button');
console.log('✔ Delivery portal successfully displays ready unassigned order waiting at counter');

// Rider clicks "Pick up order"
console.log('Flow 2 - Step 3: Delivery rider clicks Pick up order');
riderPortal.content.click('claim-pickup', order2Id);

// Verify order is now picked up and assigned to Aarav (r1)
const pickedUpOrder = riderPortal.store.orders().find(o => o.id === order2Id);
assert(pickedUpOrder.status === 'picked_up', 'Order status must be picked_up');
assert(pickedUpOrder.riderId === 'r1', 'Order must be assigned to rider r1');
assert(pickedUpOrder.riderName === 'Aarav (demo rider)', 'Order must have riderName Aarav');
console.log('✔ Order claimed and picked up by rider:', pickedUpOrder.riderName);

// Rider starts delivery and completes it
riderPortal.store.transition(order2Id, 'out_for_delivery', 'rider');
riderPortal.store.transition(order2Id, 'delivered', 'rider');
assert(riderPortal.store.orders().find(o => o.id === order2Id).status === 'delivered', 'Order must be delivered');
console.log('✔ Delivery completed successfully');

console.log('\n--- ALL E2E FLOW & CORRELATION CHECKS PASSED SUCCESSFULLY ---');

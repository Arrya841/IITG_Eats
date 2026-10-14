const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const code = name => fs.readFileSync(path.join(root, name), 'utf8');
const assert = (truth, message) => { if (!truth) throw new Error(message); };

console.log('--- STARTING DELIVERY PORTAL VISIBILITY & HANDOFF VERIFICATION ---');

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

function createPortalEnvironment(role, query = '') {
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
    },
    changeControl(control, value) {
      listeners['main:change']?.({
        target: { dataset: { control }, value }
      });
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
      return null;
    }
  };

  const win = {
    addEventListener(name, cb) { listeners['win:' + name] = cb; },
    dispatchEvent(e) {
      if (e.type === 'iitg:updated') {
        listeners['win:iitg:updated']?.(e);
        listeners['win:storage']?.({ key: e.detail });
      }
    },
    BroadcastChannel: FakeBroadcastChannel
  };

  class CustomEvent { constructor(type, opt) { this.type = type; this.detail = opt?.detail; } }
  win.CustomEvent = CustomEvent;

  const ctx = {
    window: win,
    document: doc,
    location: { search: query, href: '' },
    console,
    Date,
    Math,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    confirm: () => true,
    CustomEvent,
    localStorage: {
      getItem: k => sharedStorage[k] ?? null,
      setItem: (k, v) => {
        sharedStorage[k] = String(v);
        win.dispatchEvent(new CustomEvent('iitg:updated', { detail: k }));
      }
    }
  };

  vm.createContext(ctx);
  for (const f of ['catalog.js', 'portal-data.js', 'portal.js']) {
    vm.runInContext(code(f), ctx, { filename: f });
  }

  return { ctx, content, store: win.IITGStore };
}

// 1. Initial State: Delivery portal opens by default in Fleet View (all)
console.log('Test 1: Default Rider portal view');
const riderEnv = createPortalEnvironment('rider');
assert(riderEnv.content.innerHTML.includes('All Delivery Partners (Fleet View)'), 'Default view must include Fleet View');
assert(riderEnv.content.innerHTML.includes('All active fleet tasks'), 'Default view title should reflect fleet tasks');
console.log('✔ Rider portal loads in Fleet View by default');

// 2. Create an order, mark ready at Lohit Canteen, assign to Mira (r2)
console.log('\nTest 2: Order assigned to Mira (r2) is visible in Delivery Portal');
const miraOrderId = 'ORDER-MIRA-' + Date.now();
riderEnv.store.createOrder({
  id: miraOrderId,
  restaurantId: 'lohit',
  restaurant: 'Lohit Canteen',
  customerName: 'Aman Sharma',
  hostel: 'Barak',
  room: 'Room 201',
  items: [{ name: 'Veg Grilled Sandwich', price: 50, quantity: 2 }],
  total: 100,
  status: 'placed'
});

// Canteen accepts, prepares, marks ready
riderEnv.store.transition(miraOrderId, 'accepted', 'vendor');
riderEnv.store.transition(miraOrderId, 'preparing', 'vendor');
riderEnv.store.transition(miraOrderId, 'ready', 'vendor');

// Admin assigns to Mira (r2)
riderEnv.store.assignRider(miraOrderId, 'r2');

// Trigger update in riderEnv
riderEnv.ctx.window.dispatchEvent(new riderEnv.ctx.CustomEvent('iitg:updated', { detail: 'iitg_orders' }));

// Verify order is visible in Fleet View
assert(riderEnv.content.innerHTML.includes(miraOrderId), 'Order assigned to Mira must be visible in Fleet View');
assert(riderEnv.content.innerHTML.includes('Food ready at canteen counter'), 'Ready counter section must be displayed');
console.log('✔ Order assigned to Mira is clearly visible in Fleet View');

// Switch to Aarav (r1) specifically
console.log('\nTest 3: Switch to Aarav (r1) - Notice banner indicates Mira has a task, and Ready counter is still visible');
riderEnv.content.changeControl('rider', 'r1');

// Aarav should see the Notice Banner alerting him about Mira's active task
assert(riderEnv.content.innerHTML.includes('Campus deliveries active'), 'Notice banner must appear when other riders have tasks');
assert(riderEnv.content.innerHTML.includes('Mira'), 'Notice banner must mention Mira');
// Aarav should STILL see the ready counter with Take over & pick up
assert(riderEnv.content.innerHTML.includes(miraOrderId), 'Ready counter must show all ready orders across campus');
assert(riderEnv.content.innerHTML.includes('Take over &amp; pick up') || riderEnv.content.innerHTML.includes('Take over & pick up'), 'Aarav should have option to take over and pick up');
console.log('✔ Notice banner and Take-over pickup work seamlessly for individual rider view');

// Switch to Mira (r2) specifically
console.log('\nTest 4: Switch to Mira (r2) - Sees her own assigned task');
riderEnv.content.changeControl('rider', 'r2');
assert(riderEnv.content.innerHTML.includes(miraOrderId), 'Mira must see her assigned order');
assert(riderEnv.content.innerHTML.includes('Assigned to you'), 'Card indicates Assigned to you');
console.log('✔ Mira sees assigned order with "Assigned to you" badge');

// Mira confirms pickup
riderEnv.content.click('picked_up', miraOrderId);
assert(riderEnv.store.orders().find(o => o.id === miraOrderId).status === 'picked_up', 'Order must transition to picked_up');
console.log('✔ Mira successfully confirmed pickup');

// 3. Test Canteen direct handover
console.log('\nTest 5: Canteen portal direct handover');
const vendorEnv = createPortalEnvironment('vendor');
const canteenOrderId = 'ORDER-CANTEEN-' + Date.now();
vendorEnv.store.createOrder({
  id: canteenOrderId,
  restaurantId: 'lohit',
  restaurant: 'Lohit Canteen',
  customerName: 'Rohan Gupta',
  hostel: 'Umiam',
  items: [{ name: 'Cold Coffee', price: 45, quantity: 1 }],
  total: 45,
  status: 'placed'
});
vendorEnv.store.transition(canteenOrderId, 'accepted', 'vendor');
vendorEnv.store.transition(canteenOrderId, 'preparing', 'vendor');
vendorEnv.store.transition(canteenOrderId, 'ready', 'vendor');

// Check that vendorCard displays "Handover to rider"
vendorEnv.ctx.window.dispatchEvent(new vendorEnv.ctx.CustomEvent('iitg:updated', { detail: 'iitg_orders' }));
assert(vendorEnv.content.innerHTML.includes('Handover to rider'), 'Vendor card must have "Handover to rider" button when food is ready');

// Click "Handover to rider" from Canteen portal
vendorEnv.content.click('picked_up', canteenOrderId);
const handedOverOrder = vendorEnv.store.orders().find(o => o.id === canteenOrderId);
assert(handedOverOrder.status === 'picked_up', 'Order must be picked_up after canteen handover');
assert(handedOverOrder.riderName === 'Aarav (demo rider)', 'Auto-assigned to demo rider upon handover');
console.log('✔ Canteen portal successfully executed direct handover to rider');

// 4. Test In-Kitchen Queue in Delivery portal
console.log('\nTest 6: In-Kitchen Queue (Cooking at canteens) visible in Delivery Portal');
const prepOrderId = 'ORDER-PREP-' + Date.now();
vendorEnv.store.createOrder({
  id: prepOrderId,
  restaurantId: 'kameng',
  restaurant: 'Kameng Night Mess',
  customerName: 'Sneha Roy',
  hostel: 'Disang',
  items: [{ name: 'Butter Chicken', price: 220, quantity: 1 }],
  total: 220,
  status: 'placed'
});
vendorEnv.store.transition(prepOrderId, 'accepted', 'vendor');
vendorEnv.store.transition(prepOrderId, 'preparing', 'vendor');

// In Delivery portal, check that prep order is visible under Cooking at canteens
riderEnv.content.changeControl('rider', 'all');
riderEnv.ctx.window.dispatchEvent(new riderEnv.ctx.CustomEvent('iitg:updated', { detail: 'iitg_orders' }));
assert(riderEnv.content.innerHTML.includes('Cooking at canteens'), 'Cooking at canteens section must be present');
assert(riderEnv.content.innerHTML.includes(prepOrderId), 'Prep order must appear in Kitchen queue');
assert(riderEnv.content.innerHTML.includes('Pick up from counter'), 'Rider can pick up directly from counter if ready');

// Rider clicks "Pick up from counter"
riderEnv.content.click('claim-pickup', prepOrderId);
const counterPickedOrder = riderEnv.store.orders().find(o => o.id === prepOrderId);
assert(counterPickedOrder.status === 'picked_up', 'Order picked up directly from counter');
console.log('✔ In-Kitchen Queue visible and 1-click counter pickup works');

console.log('\n🎉 ALL DELIVERY PORTAL VISIBILITY & HANDOFF TESTS PASSED 100%!');

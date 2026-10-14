/* ============================================================
   IITG EATS — Full Zomato-style Food Delivery Frontend
   Pure vanilla JS + localStorage. No backend.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

/* ---------- Helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const money = (n) => '₹' + Math.round(Number(n) || 0);
const foodPhoto = (prompt) => {
    const style = "cinematic food photography, dramatic studio lighting, rustic wooden table, shallow depth of field, bokeh, ultra detailed, 8k, mouth-watering, premium restaurant quality, warm moody tones, food styling, micro garnishes, sauce drizzle, steam, deconstructed props, top or angled shot, nano banana style";
    return "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=" + encodeURIComponent(prompt + ", " + style) + "&image_size=landscape_4_3";
};
const toast = (msg) => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
};
window.scrollEl = (id, dir) => {
    const el = document.getElementById(id);
    if (el) el.scrollBy({ left: dir * 300, behavior: 'smooth' });
};

/* ---------- State ---------- */
const state = {
    cart: JSON.parse(localStorage.getItem('iitg_cart') || '[]'),
    orders: JSON.parse(localStorage.getItem('iitg_orders') || '[]'),
    user: JSON.parse(localStorage.getItem('iitg_user') || 'null'),
    vegOnly: false,
    activeCuisines: new Set(),
    costFilter: 'all',
    sortBy: 'relevance',
    activeCategory: null,
    searchQuery: '',
    coupon: null,
    currentRestaurant: null,
};
const saveCart = () => localStorage.setItem('iitg_cart', JSON.stringify(state.cart));
const saveOrders = () => localStorage.setItem('iitg_orders', JSON.stringify(state.orders));
const portalStore = window.IITGStore;
const vendorPrefs = id => portalStore.setting(id);
const vendorOpen = id => vendorPrefs(id).isOpen;
const availableItem = (restId, itemId) => !vendorPrefs(restId).disabledItems[itemId];
const priceFor = (restId, item) => vendorPrefs(restId).prices[item.id] || item.price;
const statusKey = o => typeof o.status === 'number' ? (['placed','preparing','picked_up','out_for_delivery','delivered'][o.status] || 'placed') : o.status;
const statusTitle = o => portalStore.labels[statusKey(o)] || 'Order placed';
const saveUser = () => localStorage.setItem('iitg_user', JSON.stringify(state.user));

/* ---------- Data: Categories ---------- */
const categories = [
    { name: 'Biryani', icon: '🍲' }, { name: 'Pizza', icon: '🍕' },
    { name: 'Burger', icon: '🍔' }, { name: 'Rolls', icon: '🌯' },
    { name: 'Chinese', icon: '🍜' }, { name: 'South Indian', icon: '🥘' },
    { name: 'Desserts', icon: '🍨' }, { name: 'Coffee', icon: '☕' },
    { name: 'North Indian', icon: '🍛' }, { name: 'Street Food', icon: '🥟' },
    { name: 'Beverages', icon: '🥤' }, { name: 'Healthy', icon: '🥗' },
];

/* ---------- Data: Offers ---------- */
const offers = [
    { title: '50% OFF', sub: 'Up to ₹100 on your first order', grad: 'linear-gradient(135deg, #FFF8ED, #F47B2033)' },
    { title: 'Free Delivery', sub: 'On all orders above ₹199', grad: 'linear-gradient(135deg, #FFF8ED, #E9DED3)' },
    { title: 'Craving?', sub: 'Late night delivery till 3 AM', grad: 'linear-gradient(135deg, #FFF8ED, #C9233233)' },
    { title: 'Buy 1 Get 1', sub: 'On selected desserts & shakes', grad: 'linear-gradient(135deg, #FFF8ED, #247A4533)' },
    { title: 'Flat ₹75 OFF', sub: 'On orders above ₹299', grad: 'linear-gradient(135deg, #FFF8ED, #F47B2055)' },
];

/* ---------- Data: Collections ---------- */
const collections = [
    { title: 'Late Night Eats', sub: 'Open past midnight', icon: '🌙', color: '#2c1b4e' },
    { title: 'Budget Bites', sub: 'Under ₹150 for two', icon: '💰', color: '#1b3b2c' },
    { title: 'Best of Biryani', sub: 'Top rated biryani spots', icon: '🍲', color: '#3d2b1b' },
    { title: 'Sweet Tooth', sub: 'Desserts & shakes', icon: '🍰', color: '#4a1b3d' },
    { title: 'Quick Bites', sub: 'Under 20 min delivery', icon: '⚡', color: '#2b2b4a' },
    { title: 'Pure Veg', sub: '100% vegetarian', icon: '🥬', color: '#1b4a2c' },
    { title: 'Exam Fuel', sub: 'Heavy meals for late nights', icon: '📚', color: '#3d3d1b' },
];

/* ---------- Data: Restaurants (full menus, reviews) ---------- */
const restaurants = [
    {
        id: 'lohit', name: 'Lohit Canteen', rating: 4.2, time: '25-30 mins', timeMin: 25,
        cuisines: 'Fast Food, Snacks, Beverages', cuisineList: ['Fast Food','Snacks','Beverages'],
        price: 150, offer: '20% OFF', isVeg: false,
        img: foodPhoto('Indian canteen snacks platter: crispy vegetable pakoras, grilled sandwiches, samosas, masala chai in glass cup, on rustic wooden table, scattered chickpea flour, mint chutney bowls'),
        about: 'The iconic Lohit Canteen — a student favourite for quick bites, hot snacks and endless cups of chai. Open all day with a bustling vibe.',
        hours: '7:00 AM – 11:30 PM',
        menu: [
            { id:'l1', cat:'Snacks', name:'Veg Samosa (2 pcs)', price:30, isVeg:true, bestseller:true, rating:4.3, desc:'Crispy golden samosas stuffed with spiced potatoes and peas.', img: foodPhoto('crispy golden Indian samosas stuffed with spiced potatoes on wooden plate, mint chutney') },
            { id:'l2', cat:'Snacks', name:'Paneer Pakora', price:60, isVeg:true, bestseller:true, rating:4.5, desc:'Cottage cheese fritters dipped in chickpea batter, deep fried.', img: foodPhoto('paneer pakora fritters with mint chutney, Indian snack, rustic wooden surface') },
            { id:'l3', cat:'Snacks', name:'Chicken Pakora', price:80, isVeg:false, rating:4.2, desc:'Boneless chicken pieces marinated and fried crisp.', img: foodPhoto('crispy chicken pakora Indian snack with chutney on wooden board') },
            { id:'l4', cat:'Snacks', name:'Veg Grilled Sandwich', price:50, isVeg:true, rating:4.1, desc:'Toasted sandwich with veggies, cheese and mint chutney.', img: foodPhoto('grilled vegetable cheese sandwich cut in half on wooden board') },
            { id:'l5', cat:'Snacks', name:'Chicken Sandwich', price:70, isVeg:false, rating:4.0, desc:'Grilled sandwich with chicken mayo and lettuce.', img: foodPhoto('grilled chicken sandwich with lettuce and mayo on wooden board') },
            { id:'l6', cat:'Beverages', name:'Masala Chai', price:15, isVeg:true, bestseller:true, rating:4.6, desc:'Spiced Indian milk tea with ginger and cardamom.', img: foodPhoto('Indian masala chai in glass cup with tea biscuits, steam rising') },
            { id:'l7', cat:'Beverages', name:'Cold Coffee', price:45, isVeg:true, rating:4.4, desc:'Creamy chilled coffee blended with milk and ice cream.', img: foodPhoto('cold coffee in glass with whipped cream and chocolate drizzle') },
            { id:'l8', cat:'Beverages', name:'Fresh Lime Soda', price:30, isVeg:true, rating:4.0, desc:'Refreshing lime with soda, sweet or salty.', img: foodPhoto('fresh lime soda in glass with mint and ice on wooden table') },
        ],
        reviews: [
            { name:'Aarav S.', rating:5, text:'Best samosa on campus! Chai is perfect.', date:'2 days ago' },
            { name:'Priya M.', rating:4, text:'Quick service and affordable. Pakora is amazing.', date:'1 week ago' },
            { name:'Rohan K.', rating:4, text:'Late night saviour during exams. 4 stars only because it gets crowded.', date:'2 weeks ago' },
        ],
    },
    {
        id: 'kameng', name: 'Kameng Night Mess', rating: 4.5, time: '35-40 mins', timeMin: 35,
        cuisines: 'North Indian, Chinese, Biryani', cuisineList: ['North Indian','Chinese','Biryani'],
        price: 250, offer: 'FREE DELIVERY', isVeg: false,
        img: foodPhoto('Hyderabadi chicken biryani in copper handi, saffron basmati rice layers, fried onions, mint, raita bowl on side, steam rising, dark moody background, Indian thali style'),
        about: 'Kameng Night Mess — famous for its late-night North Indian and Chinese spreads. The biryani here is legendary among IITG students.',
        hours: '7:00 PM – 3:00 AM',
        menu: [
            { id:'k1', cat:'Biryani', name:'Chicken Dum Biryani', price:180, isVeg:false, bestseller:true, rating:4.7, desc:'Hyderabadi-style dum biryani with tender chicken, saffron rice and fried onions.', img: foodPhoto('Hyderabadi chicken biryani in copper handi, saffron rice, fried onions, raita') },
            { id:'k2', cat:'Biryani', name:'Veg Biryani', price:140, isVeg:true, rating:4.3, desc:'Aromatic basmati with mixed vegetables and whole spices.', img: foodPhoto('vegetable biryani in copper handi with raita, Indian food') },
            { id:'k3', cat:'North Indian', name:'Butter Chicken', price:220, isVeg:false, bestseller:true, rating:4.6, desc:'Creamy tomato-based chicken curry, served with butter naan.', img: foodPhoto('butter chicken curry in black bowl with butter naan, Indian food') },
            { id:'k4', cat:'North Indian', name:'Paneer Butter Masala', price:180, isVeg:true, rating:4.4, desc:'Cottage cheese in rich tomato-butter gravy.', img: foodPhoto('paneer butter masala curry in white bowl with naan, Indian food') },
            { id:'k5', cat:'North Indian', name:'Dal Makhani', price:120, isVeg:true, rating:4.2, desc:'Slow-cooked black lentils with butter and cream.', img: foodPhoto('dal makhani in black bowl with naan, Indian food') },
            { id:'k6', cat:'North Indian', name:'Butter Naan', price:30, isVeg:true, rating:4.5, desc:'Soft tandoor-baked naan brushed with butter.', img: foodPhoto('butter naan bread stacked on wooden board, Indian food') },
            { id:'k7', cat:'Chinese', name:'Chicken Hakka Noodles', price:150, isVeg:false, rating:4.3, desc:'Stir-fried noodles with chicken, veggies and soy sauce.', img: foodPhoto('chicken hakka noodles in black bowl, Chinese food') },
            { id:'k8', cat:'Chinese', name:'Veg Fried Rice', price:110, isVeg:true, rating:4.1, desc:'Wok-tossed rice with vegetables.', img: foodPhoto('vegetable fried rice in bowl with chopsticks, Chinese food') },
        ],
        reviews: [
            { name:'Sneha R.', rating:5, text:'The butter chicken biryani combo is to die for!', date:'3 days ago' },
            { name:'Karan T.', rating:5, text:'Best biryani in IITG. Period.', date:'1 week ago' },
            { name:'Ananya P.', rating:4, text:'Great food, delivery takes a bit long but worth it.', date:'2 weeks ago' },
        ],
    },
    {
        id: 'khoka', name: 'Khoka Market Bites', rating: 4.0, time: '15-20 mins', timeMin: 15,
        cuisines: 'Street Food, Maggi, Tea', cuisineList: ['Street Food','Snacks','Beverages'],
        price: 100, offer: '₹50 OFF', isVeg: false,
        img: foodPhoto('Indian street style maggi noodles in steel bowl with cheese, veggies, fried egg on top, cutting chai in glass, roadside stall vibes, wooden surface, scattered masala packets'),
        about: 'The legendary Khoka Market — the heart of student street food. Maggi, rolls, chai and everything in between, open till the wee hours.',
        hours: '10:00 AM – 2:00 AM',
        menu: [
            { id:'kh1', cat:'Maggi', name:'Classic Masala Maggi', price:40, isVeg:true, bestseller:true, rating:4.4, desc:'The OG maggi with masala and veggies.', img: foodPhoto('Indian street style masala maggi noodles in steel bowl') },
            { id:'kh2', cat:'Maggi', name:'Cheese Maggi', price:60, isVeg:true, bestseller:true, rating:4.6, desc:'Maggi loaded with melted cheese.', img: foodPhoto('cheese maggi noodles in bowl, Indian street food') },
            { id:'kh3', cat:'Maggi', name:'Egg Maggi', price:70, isVeg:false, rating:4.3, desc:'Maggi topped with a fried egg.', img: foodPhoto('maggi noodles with fried egg on top, Indian street food') },
            { id:'kh4', cat:'Rolls', name:'Veg Roll', price:50, isVeg:true, rating:4.1, desc:'Kathi roll stuffed with spiced veggies.', img: foodPhoto('veg kathi roll wrap cut in half, Indian street food') },
            { id:'kh5', cat:'Rolls', name:'Chicken Roll', price:80, isVeg:false, rating:4.4, desc:'Kathi roll with grilled chicken and onions.', img: foodPhoto('chicken kathi roll wrap, Indian street food') },
            { id:'kh6', cat:'Rolls', name:'Paneer Roll', price:70, isVeg:true, rating:4.2, desc:'Kathi roll with spiced paneer.', img: foodPhoto('paneer kathi roll wrap on wooden board') },
            { id:'kh7', cat:'Beverages', name:'Cutting Chai', price:10, isVeg:true, rating:4.5, desc:'Half-glass strong cutting chai.', img: foodPhoto('Indian cutting chai in small glass cup') },
            { id:'kh8', cat:'Street Food', name:'Pani Puri (6 pcs)', price:40, isVeg:true, rating:4.3, desc:'Crispy puris with spicy mint water and fillings.', img: foodPhoto('pani puri Indian street food on plate with mint water') },
        ],
        reviews: [
            { name:'Vikram J.', rating:5, text:'Cheese maggi + cutting chai = happiness.', date:'1 day ago' },
            { name:'Nisha A.', rating:4, text:'Affordable and tasty. Chicken roll is good.', date:'5 days ago' },
        ],
    },
    {
        id: 'core', name: 'Core Canteen', rating: 4.3, time: '20-25 mins', timeMin: 20,
        cuisines: 'South Indian, Meals, Shakes', cuisineList: ['South Indian','Beverages'],
        price: 200, offer: '10% OFF', isVeg: true,
        img: foodPhoto('South Indian dosa and idli platter, crispy golden dosa, sambar in white bowl, coconut chutney, tomato onion chutney, banana leaf background, brass utensils, filter coffee'),
        about: 'Core Canteen — the pure-veg South Indian hub. Authentic dosas, idlis and filter coffee in a clean, spacious setting.',
        hours: '7:30 AM – 10:00 PM',
        menu: [
            { id:'c1', cat:'South Indian', name:'Masala Dosa', price:70, isVeg:true, bestseller:true, rating:4.6, desc:'Crispy rice crepe stuffed with spiced potato masala.', img: foodPhoto('masala dosa crispy South Indian with sambar and chutney') },
            { id:'c2', cat:'South Indian', name:'Idli (2 pcs)', price:40, isVeg:true, rating:4.3, desc:'Soft steamed rice cakes with sambar and chutney.', img: foodPhoto('idli South Indian with sambar and coconut chutney') },
            { id:'c3', cat:'South Indian', name:'Mysore Masala Dosa', price:90, isVeg:true, rating:4.5, desc:'Red chutney smeared dosa with potato filling.', img: foodPhoto('Mysore masala dosa with red chutney, South Indian food') },
            { id:'c4', cat:'South Indian', name:'Medu Vada (2 pcs)', price:45, isVeg:true, rating:4.2, desc:'Crispy lentil doughnuts with sambar.', img: foodPhoto('medu vada South Indian snack with sambar and chutney') },
            { id:'c5', cat:'Meals', name:'South Indian Thali', price:120, isVeg:true, bestseller:true, rating:4.4, desc:'Full meal: rice, sambar, rasam, curd, 2 veggies, papad.', img: foodPhoto('South Indian vegetarian thali meal on banana leaf') },
            { id:'c6', cat:'Beverages', name:'Filter Coffee', price:30, isVeg:true, bestseller:true, rating:4.7, desc:'Traditional South Indian filter coffee with milk.', img: foodPhoto('South Indian filter coffee in steel tumbler') },
            { id:'c7', cat:'Beverages', name:'Mango Lassi', price:50, isVeg:true, rating:4.5, desc:'Thick sweet yogurt smoothie with mango.', img: foodPhoto('mango lassi in glass with mint garnish') },
        ],
        reviews: [
            { name:'Divya S.', rating:5, text:'Best dosa and filter coffee on campus!', date:'4 days ago' },
            { name:'Arjun R.', rating:4, text:'Pure veg, clean and tasty. Thali is value for money.', date:'1 week ago' },
        ],
    },
    {
        id: 'subansiri', name: 'Subansiri Delights', rating: 4.6, time: '30-35 mins', timeMin: 30,
        cuisines: 'Desserts, Bakery, Fast Food', cuisineList: ['Desserts','Beverages','Fast Food'],
        price: 300, offer: 'BUY 1 GET 1', isVeg: true,
        img: foodPhoto('Artisan dessert platter: chocolate cake slice with molten lava dripping, red velvet pastry, macarons, fresh strawberries, powdered sugar, marble board, gold leaf garnish'),
        about: 'Subansiri Delights — the premium dessert destination. Handcrafted cakes, pastries, shakes and bakery items that make every day sweeter.',
        hours: '10:00 AM – 11:00 PM',
        menu: [
            { id:'s1', cat:'Desserts', name:'Chocolate Lava Cake', price:120, isVeg:true, bestseller:true, rating:4.8, desc:'Warm chocolate cake with molten centre, served with vanilla ice cream.', img: foodPhoto('chocolate lava cake with molten centre and vanilla ice cream') },
            { id:'s2', cat:'Desserts', name:'Red Velvet Pastry', price:90, isVeg:true, rating:4.6, desc:'Moist red velvet with cream cheese frosting.', img: foodPhoto('red velvet pastry slice on plate') },
            { id:'s3', cat:'Desserts', name:'Blueberry Cheesecake', price:150, isVeg:true, rating:4.7, desc:'Creamy cheesecake with blueberry compote.', img: foodPhoto('blueberry cheesecake slice on white plate') },
            { id:'s4', cat:'Bakery', name:'Chocolate Truffle Pastry', price:80, isVeg:true, rating:4.4, desc:'Rich chocolate truffle on a soft base.', img: foodPhoto('chocolate truffle pastry dessert on plate') },
            { id:'s5', cat:'Beverages', name:'Oreo Shake', price:110, isVeg:true, bestseller:true, rating:4.7, desc:'Thick milkshake blended with Oreo cookies.', img: foodPhoto('oreo milkshake in glass with whipped cream and oreo') },
            { id:'s6', cat:'Beverages', name:'Cold Coffee with Ice Cream', price:130, isVeg:true, rating:4.5, desc:'Creamy cold coffee topped with a scoop of ice cream.', img: foodPhoto('cold coffee with vanilla ice cream scoop in glass') },
            { id:'s7', cat:'Desserts', name:'Macaron Box (6 pcs)', price:200, isVeg:true, rating:4.5, desc:'Assorted French macarons.', img: foodPhoto('colorful French macarons assortment on plate') },
        ],
        reviews: [
            { name:'Meera K.', rating:5, text:'Lava cake is heavenly! Best dessert place in IITG.', date:'2 days ago' },
            { name:'Sahil M.', rating:5, text:'Oreo shake + cheesecake combo is unbeatable.', date:'1 week ago' },
            { name:'Tanya R.', rating:5, text:'Everything here is so pretty and tasty!', date:'3 weeks ago' },
        ],
    },
    {
        id: 'barak', name: 'Barak Food Court', rating: 4.1, time: '40-45 mins', timeMin: 40,
        cuisines: 'Pizzas, Burgers, Pasta', cuisineList: ['Fast Food','Pizza','Beverages'],
        price: 350, offer: '30% OFF', isVeg: false,
        img: foodPhoto('Loaded margherita pizza slice with stretchy mozzarella cheese, fresh basil, tomato sauce drizzle, crinkle cut fries, zinger burger, creamy pasta, fast food feast on wooden table'),
        about: 'Barak Food Court — the campus food court for indulgent fast food. Pizzas, burgers, pasta and more, perfect for group hangs.',
        hours: '11:00 AM – 11:00 PM',
        menu: [
            { id:'b1', cat:'Pizza', name:'Margherita Pizza (Medium)', price:220, isVeg:true, bestseller:true, rating:4.3, desc:'Classic pizza with tomato sauce, mozzarella and fresh basil.', img: foodPhoto('margherita pizza with mozzarella and basil on wooden board') },
            { id:'b2', cat:'Pizza', name:'Pepperoni Pizza (Medium)', price:280, isVeg:false, rating:4.4, desc:'Loaded with pepperoni and extra cheese.', img: foodPhoto('pepperoni pizza with extra cheese on wooden board') },
            { id:'b3', cat:'Pizza', name:'Farmhouse Pizza (Medium)', price:260, isVeg:true, rating:4.2, desc:'Loaded with onions, capsicum, tomato, corn and olives.', img: foodPhoto('farmhouse vegetable pizza with olives and corn') },
            { id:'b4', cat:'Burgers', name:'Zinger Burger', price:160, isVeg:false, bestseller:true, rating:4.5, desc:'Crispy fried chicken fillet burger with spicy mayo.', img: foodPhoto('crispy zinger chicken burger with fries') },
            { id:'b5', cat:'Burgers', name:'Veg Cheese Burger', price:110, isVeg:true, rating:4.0, desc:'Crispy veg patty with cheese and lettuce.', img: foodPhoto('vegetable cheese burger with lettuce on wooden board') },
            { id:'b6', cat:'Pasta', name:'White Sauce Pasta', price:150, isVeg:true, rating:4.3, desc:'Creamy white sauce penne pasta with herbs.', img: foodPhoto('creamy white sauce pasta in white bowl with herbs') },
            { id:'b7', cat:'Pasta', name:'Red Sauce Pasta', price:140, isVeg:true, rating:4.1, desc:'Tomato-based marinara penne pasta.', img: foodPhoto('red sauce pasta in bowl with basil') },
            { id:'b8', cat:'Sides', name:'French Fries', price:80, isVeg:true, rating:4.2, desc:'Crispy golden crinkle-cut fries.', img: foodPhoto('crispy french fries in red container with ketchup') },
            { id:'b9', cat:'Beverages', name:'Coca-Cola (500ml)', price:40, isVeg:true, rating:4.0, desc:'Chilled Coca-Cola.', img: foodPhoto('coca cola can with ice on wooden table') },
        ],
        reviews: [
            { name:'Rohit D.', rating:4, text:'Zinger burger and fries combo is fire!', date:'3 days ago' },
            { name:'Pooja N.', rating:4, text:'Good pizzas, delivery is slow though.', date:'1 week ago' },
        ],
    },
];

const allCuisines = [...new Set(restaurants.flatMap(r => r.cuisineList))].sort();

/* ============================================================
   RENDER: HOME PAGE
   ============================================================ */

function renderOffers() {
    $('#offersContainer').innerHTML = offers.map(o => `
        <div class="offer-card glass-panel" style="background: ${o.grad};">
            <div class="offer-info">
                <h3>${o.title}</h3>
                <p>${o.sub}</p>
            </div>
        </div>
    `).join('');
}

function renderCollections() {
    $('#collectionsGrid').innerHTML = collections.map(col => `
        <div class="collection-card" style="background: linear-gradient(135deg, ${col.color}, #000);" onclick="filterByCollection('${col.title}')">
            <div class="collection-icon">${col.icon}</div>
            <div class="collection-text">
                <h4>${col.title}</h4>
                <p>${col.sub}</p>
            </div>
        </div>
    `).join('');
}

function renderCategories() {
    $('#categoriesGrid').innerHTML = categories.map(cat => `
        <div class="category-item" onclick="filterByCategory('${cat.name}')">
            <div class="category-icon">${cat.icon}</div>
            <span>${cat.name}</span>
        </div>
    `).join('');
}

function getFilteredRestaurants() {
    let list = [...restaurants];
    if (state.vegOnly) list = list.filter(r => r.isVeg);
    if (state.activeCategory) list = list.filter(r => r.cuisineList.some(c => c.toLowerCase().includes(state.activeCategory.toLowerCase())));
    if (state.activeCuisines.size) list = list.filter(r => r.cuisineList.some(c => state.activeCuisines.has(c)));
    if (state.costFilter === 'low') list = list.filter(r => r.price <= 150);
    if (state.costFilter === 'mid') list = list.filter(r => r.price > 150 && r.price <= 300);
    if (state.costFilter === 'high') list = list.filter(r => r.price > 300);
    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        list = list.filter(r => r.name.toLowerCase().includes(q) || r.cuisines.toLowerCase().includes(q) || r.menu.some(m => m.name.toLowerCase().includes(q)));
    }
    if (state.sortBy === 'rating') list.sort((a,b) => b.rating - a.rating);
    if (state.sortBy === 'time') list.sort((a,b) => a.timeMin - b.timeMin);
    if (state.sortBy === 'cost') list.sort((a,b) => a.price - b.price);
    return list;
}

function renderRestaurants() {
    const list = getFilteredRestaurants();
    const grid = $('#restaurantsGrid');
    const empty = $('#emptyState');
    if (!list.length) {
        grid.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }
    empty.style.display = 'none';
    grid.innerHTML = list.map(r => `
        <div class="restaurant-card glass-panel" onclick="openRestaurant('${r.id}')">
            <div class="rest-img-wrapper">
                <img src="${r.img}" alt="${r.name}" loading="lazy">
                <div class="rest-offer">${r.offer}</div>
                ${r.isVeg ? '<div class="veg-badge rest-veg"><span class="veg-dot"></span> Pure Veg</div>' : ''}
            </div>
            <div class="rest-info">
                <div class="rest-title-row">
                    <h3>${r.name}</h3>
                    <div class="rest-rating"><i class="ri-star-fill"></i> ${r.rating}</div>
                </div>
                <div class="rest-meta">
                    <span class="rest-time"><i class="ri-timer-line"></i> ${r.time}</span>
                    <span class="rest-price">• ₹${r.price} for two</span>
                </div>
                <p class="rest-cuisines">${r.cuisines}</p>
                <div class="rest-divider"></div>
                <div class="rest-footer">
                    <span class="safe-tag"><i class="ri-shield-check-fill"></i> Safe and Hygienic</span>
                </div>
            </div>
        </div>
    `).join('');
}

/* ---------- Filter / Sort UI ---------- */
function renderCuisineFilters() {
    $('#cuisineFilters').innerHTML = allCuisines.map(c => `
        <label class="cuisine-check">
            <input type="checkbox" value="${c}" ${state.activeCuisines.has(c)?'checked':''}>
            <span>${c}</span>
        </label>
    `).join('');
    $$('#cuisineFilters input').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) state.activeCuisines.add(cb.value);
            else state.activeCuisines.delete(cb.value);
            applyFilters();
        });
    });
}

function applyFilters() {
    renderRestaurants();
    updateClearBtn();
}

function updateClearBtn() {
    const has = state.vegOnly || state.activeCuisines.size || state.costFilter !== 'all' || state.activeCategory;
    $('#clearFilters').style.display = has ? 'flex' : 'none';
}

/* ---------- Filter chips (quick filters) ---------- */
function setupQuickFilters() {
    $$('.filter-btn.chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const f = btn.dataset.filter;
            const wasActive = btn.classList.contains('active');
            // reset quick state
            state.costFilter = 'all';
            state.vegOnly = false;
            $$('.filter-btn.chip').forEach(b => b.classList.remove('active'));
            if (f === 'fast') {
                state.sortBy = wasActive ? 'relevance' : 'time';
                if (!wasActive) btn.classList.add('active');
            } else if (f === 'rating') {
                state.sortBy = wasActive ? 'relevance' : 'rating';
                if (!wasActive) btn.classList.add('active');
            } else if (f === 'pureveg') {
                state.vegOnly = !wasActive;
                if (state.vegOnly) btn.classList.add('active');
                $('#vegToggle').classList.toggle('on', state.vegOnly);
            } else if (f === 'offers') {
                // filter restaurants that have an offer (all do) — just mark active
                if (!wasActive) btn.classList.add('active');
            }
            applyFilters();
        });
    });
}

/* ============================================================
   RESTAURANT MENU PAGE
   ============================================================ */

window.openRestaurant = (id) => {
    const r = restaurants.find(x => x.id === id);
    if (!r) return;
    state.currentRestaurant = r;
    // hide other pages
    $('#homePage').style.display = 'none';
    $('#profilePage').style.display = 'none';
    $('#checkoutPage').style.display = 'none';
    $('#trackingPage').style.display = 'none';
    $('#menuPage').style.display = 'block';
    renderMenu(r);
    window.scrollTo(0, 0);
};

function renderMenu(r) {
    $('#menuRestName').textContent = r.name + (vendorOpen(r.id) ? '' : ' · Currently paused');
    $('#menuRating').textContent = r.rating;
    $('#menuTime').textContent = r.time;
    $('#menuPrice').textContent = '₹' + r.price + ' for two';
    $('#menuCuisines').textContent = r.cuisines;
    $('#menuOfferBanner').innerHTML = `<i class="ri-percent-line"></i> ${r.offer} | ${r.isVeg ? 'Pure Veg' : 'Veg & Non-Veg'}`;
    $('#menuHeroImg').style.backgroundImage = `url('${r.img}')`;
    $('#menuAboutText').textContent = r.about;
    $('#menuHours').textContent = r.hours;
    $('#menuCuisinesList').textContent = r.cuisines;

    // category nav
    const cats = [...new Set(r.menu.map(m => m.cat))];
    $('#menuCats').innerHTML = cats.map((c,i) => `
        <a href="#mcat-${i}" class="menu-cat-link ${i===0?'active':''}" data-i="${i}">${c}</a>
    `).join('');

    // menu items grouped
    let itemsHtml = '';
    cats.forEach((c, i) => {
        const items = r.menu.filter(m => m.cat === c);
        itemsHtml += `<div class="menu-cat-section" id="mcat-${i}">
            <h3 class="menu-cat-title">${c} (${items.length})</h3>`;
        items.forEach(item => {
            const itemCanOrder = vendorOpen(r.id) && availableItem(r.id, item.id);
            const inCart = state.cart.find(c => c.itemId === item.id && c.restaurantId === r.id);
            const qty = inCart ? inCart.quantity : 0;
            itemsHtml += `
                <div class="dish-card">
                    <div class="dish-info">
                        <div class="dish-name-row">
                            <span class="veg-nonveg ${item.isVeg?'veg':'nonveg'}"></span>
                            ${item.bestseller ? '<span class="bestseller-tag"><i class="ri-fire-fill"></i> Bestseller</span>' : ''}
                            <h4>${item.name}</h4>
                        </div>
                        <div class="dish-price">₹${priceFor(r.id,item)}</div>
                        <p class="dish-desc">${item.desc}</p>
                        <div class="dish-rating"><i class="ri-star-fill"></i> ${item.rating}</div>
                    </div>
                    <div class="dish-right">
                        <div class="dish-img" style="background-image:url('${item.img}')"></div>
                        <div class="add-btn-wrap">
                            ${!itemCanOrder ? `<span style="font-size:12px;color:#a04432;font-weight:700">Unavailable</span>` : qty === 0
                                ? `<button class="add-btn" onclick="addToCart('${r.id}','${item.id}')">ADD</button>`
                                : `<div class="qty-control">
                                        <button onclick="changeQty('${r.id}','${item.id}',-1)">−</button>
                                        <span>${qty}</span>
                                        <button onclick="changeQty('${r.id}','${item.id}',1)">+</button>
                                    </div>`
                            }
                        </div>
                    </div>
                </div>`;
        });
        itemsHtml += `</div>`;
    });
    $('#menuItems').innerHTML = itemsHtml;

    // reviews
    renderReviews(r);

    // menu tab switching
    $$('.menu-tab').forEach(t => t.onclick = () => {
        $$('.menu-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        const tab = t.dataset.mtab;
        $('#menuItems').style.display = tab === 'menu' ? 'block' : 'none';
        $('#menuCats').style.display = tab === 'menu' ? 'block' : 'none';
        $('#menuReviews').style.display = tab === 'reviews' ? 'block' : 'none';
        $('#menuAbout').style.display = tab === 'about' ? 'block' : 'none';
    });

    // category nav active on scroll
    const sections = $$('.menu-cat-section');
    const links = $$('.menu-cat-link');
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const idx = [...sections].indexOf(e.target);
                links.forEach(l => l.classList.remove('active'));
                if (links[idx]) links[idx].classList.add('active');
            }
        });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(s => obs.observe(s));
}

function renderReviews(r) {
    const total = r.reviews.length;
    const avg = (r.reviews.reduce((s,x) => s+x.rating,0)/total).toFixed(1);
    $('#reviewBigRating').innerHTML = `<div class="big-rating-num">${avg}</div><div class="big-rating-stars">${'★'.repeat(Math.round(avg))}</div><div class="big-rating-count">${total} reviews</div>`;
    const dist = [5,4,3,2,1].map(star => ({star, count: r.reviews.filter(x=>x.rating===star).length}));
    $('#ratingBars').innerHTML = dist.map(d => `
        <div class="rating-bar-row">
            <span>${d.star}★</span>
            <div class="rating-bar"><div style="width:${(d.count/total)*100}%"></div></div>
            <span>${d.count}</span>
        </div>
    `).join('');
    $('#reviewsList').innerHTML = r.reviews.map(rv => `
        <div class="review-card">
            <div class="review-head">
                <div class="review-avatar">${rv.name.charAt(0)}</div>
                <div>
                    <h5>${rv.name}</h5>
                    <div class="review-rating"><i class="ri-star-fill"></i> ${rv.rating}</div>
                </div>
            </div>
            <p>${rv.text}</p>
            <div class="review-date">${rv.date}</div>
        </div>
    `).join('');
}

/* ============================================================
   CART
   ============================================================ */

window.addToCart = (restId, itemId) => {
    const r = restaurants.find(x => x.id === restId);
    const item = r?.menu.find(m => m.id === itemId);
    if (!item || !vendorOpen(restId) || !availableItem(restId,itemId)) { toast('This dish is unavailable right now'); return; }
    if (state.cart.length && state.cart.some(c => c.restaurantId !== restId)) { toast('Please order from one canteen at a time'); return; }
    const existing = state.cart.find(c => c.itemId === itemId && c.restaurantId === restId);
    if (existing) existing.quantity++;
    else state.cart.push({ itemId, restaurantId: restId, restaurantName: r.name, name: item.name, price: priceFor(restId,item), isVeg: item.isVeg, quantity: 1, img: item.img });
    saveCart();
    updateCart();
    renderMenu(r); // refresh qty buttons
    toast(`Added ${item.name}`);
};

window.changeQty = (restId, itemId, delta) => {
    const r = restaurants.find(x => x.id === restId);
    const idx = state.cart.findIndex(c => c.itemId === itemId && c.restaurantId === restId);
    if (idx === -1) return;
    if (delta > 0 && (!vendorOpen(restId) || !availableItem(restId,itemId))) { toast('This dish is unavailable'); return; }
    state.cart[idx].quantity += delta;
    if (state.cart[idx].quantity <= 0) state.cart.splice(idx, 1);
    saveCart();
    updateCart();
    renderMenu(r);
};

function refreshCartPrices() {
    let changed = false;
    state.cart.forEach(c => {
        const item = restaurants.find(r=>r.id===c.restaurantId)?.menu.find(m=>m.id===c.itemId);
        if (item && c.price !== priceFor(c.restaurantId,item)) {c.price=priceFor(c.restaurantId,item); changed=true;}
    });
    if (changed) saveCart();
}
function cartTotals() {
    refreshCartPrices();
    const itemTotal = state.cart.reduce((s,c) => s + c.price*c.quantity, 0);
    const count = state.cart.reduce((s,c) => s+c.quantity, 0);
    const delivery = itemTotal > 199 ? 0 : (itemTotal > 0 ? 25 : 0);
    const packaging = Math.round(itemTotal * 0.05);
    const tax = Math.round(itemTotal * 0.05);
    let discount = 0;
    if (state.coupon === 'FIRST50') discount = Math.min(100, Math.round(itemTotal*0.5));
    else if (state.coupon === 'FLAT75') discount = itemTotal >= 299 ? 75 : 0;
    const total = itemTotal + delivery + packaging + tax - discount;
    return { itemTotal, count, delivery, packaging, tax, discount, total };
}

function updateCart() {
    const { count } = cartTotals();
    $('#cartCount').textContent = count;
    const bar = $('#stickyCartBar');
    if (count > 0) {
        bar.style.display = 'flex';
        $('#stickyCartCount').textContent = count + (count>1?' items':' item');
        $('#stickyCartTotal').textContent = '₹' + cartTotals().total;
    } else {
        bar.style.display = 'none';
    }
    renderCartPanel();
}

function renderCartPanel() {
    const body = $('#cartBody');
    const empty = $('#cartEmpty');
    const footer = $('#cartFooter');
    if (state.cart.length === 0) {
        body.innerHTML = '';
        empty.style.display = 'flex';
        footer.style.display = 'none';
        return;
    }
    empty.style.display = 'none';
    footer.style.display = 'block';
    body.innerHTML = state.cart.map(c => `
        <div class="cart-item">
            <div class="cart-item-info">
                <span class="veg-nonveg ${c.isVeg?'veg':'nonveg'}"></span>
                <div>
                    <h5>${c.name}</h5>
                    <p>${c.restaurantName}</p>
                </div>
            </div>
            <div class="cart-item-right">
                <div class="qty-control small">
                    <button onclick="changeQty('${c.restaurantId}','${c.itemId}',-1)">−</button>
                    <span>${c.quantity}</span>
                    <button onclick="changeQty('${c.restaurantId}','${c.itemId}',1)">+</button>
                </div>
                <div class="cart-item-price">₹${c.price*c.quantity}</div>
            </div>
        </div>
    `).join('');
    const t = cartTotals();
    $('#billItemTotal').textContent = money(t.itemTotal);
    $('#billDelivery').textContent = t.delivery === 0 ? 'FREE' : money(t.delivery);
    $('#billPackaging').textContent = money(t.packaging);
    $('#billTax').textContent = money(t.tax);
    $('#billDiscount').textContent = '-₹' + t.discount;
    $('#billTotal').textContent = money(t.total);
}

function openCart() {
    $('#cartPanel').classList.add('open');
    $('#cartOverlay').classList.add('show');
}
function closeCart() {
    $('#cartPanel').classList.remove('open');
    $('#cartOverlay').classList.remove('show');
}

/* ============================================================
   CHECKOUT
   ============================================================ */

function openCheckout() {
    if (!state.cart.length) { toast('Cart is empty'); return; }
    if (state.cart.some(c => !vendorOpen(c.restaurantId) || !availableItem(c.restaurantId,c.itemId))) { toast('Remove unavailable items before checkout'); return; }
    if (new Set(state.cart.map(c=>c.restaurantId)).size>1) { toast('Orders must be from one canteen only'); return; }
    closeCart();
    $('#homePage').style.display='none';
    $('#menuPage').style.display='none';
    $('#profilePage').style.display='none';
    $('#trackingPage').style.display='none';
    $('#checkoutPage').style.display='block';
    renderCheckout();
    window.scrollTo(0,0);
}

function renderCheckout() {
    // address
    if (state.user) {
        $('#defaultAddress').textContent = `${state.user.name}, ${state.user.room}, ${state.user.hostel} Hostel, IIT Guwahati, Assam 781039`;
    } else {
        $('#defaultAddress').textContent = 'IIT Guwahati Campus, Guwahati, Assam 781039';
    }
    const hostelSelect=$('#deliveryHostel');
    if (hostelSelect && state.user?.hostel && [...hostelSelect.options].some(o=>o.value===state.user.hostel)) hostelSelect.value=state.user.hostel;
    const t = cartTotals();
    $('#summaryItems').innerHTML = state.cart.map(c => `
        <div class="sum-item"><span>${c.quantity}x ${c.name}</span><span>₹${c.price*c.quantity}</span></div>
    `).join('');
    $('#coItemTotal').textContent = money(t.itemTotal);
    $('#coDelivery').textContent = t.delivery === 0 ? 'FREE' : money(t.delivery);
    $('#coPackaging').textContent = money(t.packaging);
    $('#coTax').textContent = money(t.tax);
    $('#coDiscount').textContent = '-₹' + t.discount;
    $('#coTotal').textContent = money(t.total);
}

function applyCoupon() {
    const code = $('#couponInput').value.trim().toUpperCase();
    const valid = ['FIRST50','FLAT75','IITG10'];
    if (!valid.includes(code)) {
        state.coupon = null;
        $('#couponMsg').textContent = 'Invalid coupon code';
        $('#couponMsg').className = 'coupon-msg error';
    } else {
        state.coupon = code;
        $('#couponMsg').textContent = `Coupon ${code} applied!`;
        $('#couponMsg').className = 'coupon-msg success';
    }
    renderCheckout();
}

/* ============================================================
   ORDER PLACEMENT & TRACKING
   ============================================================ */

const TRACK_STAGES = [
    { key:'placed', label:'Order Placed', icon:'ri-checkbox-circle-line', desc:'Waiting for the canteen to confirm' },
    { key:'accepted', label:'Canteen Accepted', icon:'ri-store-2-line', desc:'The canteen accepted the request' },
    { key:'preparing', label:'Preparing', icon:'ri-restaurant-line', desc:'Your meal is being prepared' },
    { key:'ready', label:'Ready for Pickup', icon:'ri-shopping-bag-line', desc:'Meal is ready at the canteen' },
    { key:'picked_up', label:'Picked Up', icon:'ri-bike-line', desc:'Rider has collected your meal' },
    { key:'out_for_delivery', label:'On the Way', icon:'ri-map-pin-line', desc:'Delivery is on the way' },
    { key:'delivered', label:'Delivered', icon:'ri-home-smile-line', desc:'Order completed' },
];

function placeOrder() {
    if (!state.cart.length) { toast('Your cart is empty'); return; }
    if (new Set(state.cart.map(c=>c.restaurantId)).size !== 1) { toast('Please order from one canteen only'); return; }
    if (state.cart.some(c => !vendorOpen(c.restaurantId) || !availableItem(c.restaurantId,c.itemId))) { toast('One or more items are unavailable'); return; }
    const hostel = $('#deliveryHostel').value;
    if (!hostel) { toast('Please select a hostel or campus point'); $('#deliveryHostel').focus(); return; }
    const schedule = document.querySelector('input[name="schedule"]:checked').value;
    const scheduledTime = schedule==='later' ? $('#scheduleTime').value : null;
    if (schedule==='later' && (!scheduledTime || new Date(scheduledTime)<=new Date())) { toast('Select a future delivery date and time'); return; }
    const t = cartTotals();
    const method=document.querySelector('input[name="payment"]:checked').value;
    const order = {
        id:'DEMO-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,5).toUpperCase(),
        items:state.cart.map(c=>({...c})),
        restaurantId:state.cart[0].restaurantId,
        restaurant:state.cart[0].restaurantName,
        customerName:state.user?.name||'Student (demo)',
        customerId:state.user?.id||null,
        hostel,
        room:(state.user?.hostel === hostel ? (state.user?.room||'') : '') || $('#deliveryNote').value.trim(),
        deliveryNote:$('#deliveryNote').value.trim(),
        itemTotal:t.itemTotal,delivery:t.delivery,packaging:t.packaging,tax:t.tax,
        total:t.total,discount:t.discount,coupon:state.coupon,
        payment:method.toUpperCase()+' (DEMO – not charged)',
        paymentStatus:'not_charged',
        schedule,scheduledTime,
        placedAt:new Date().toISOString(),status:'placed',
        history:[{at:new Date().toISOString(),event:'Order submitted (demo)',actor:'student'}]
    };
    try { portalStore.createOrder(order); }
    catch (err) {toast(err.message||'Failed to create order');return;}
    syncOrderToSupabase(order);
    state.orders=JSON.parse(localStorage.getItem('iitg_orders')||'[]');
    state.cart=[];state.coupon=null;saveCart();updateCart();
    showTracking(order.id);
    toast('Demo order sent! Open Canteen portal to accept it.');
}

async function syncOrderToSupabase(order) {
    try {
        const sb = getSupabase();
        if (!sb) return;
        const uid = state.user?.id || 'demo_user';
        await sb.from('customer_orders').insert([{
            id: order.id,
            user_id: uid,
            restaurant_id: order.restaurantId,
            restaurant_name: order.restaurant,
            items: order.items,
            total: order.total,
            status: order.status || 'placed',
            created_at: order.placedAt || new Date().toISOString()
        }]);
    } catch (e) {
        console.warn('Supabase order sync error:', e);
    }
}

let trackedOrderId=null;
function showTracking(orderId) {
    const order=portalStore.orders().find(o=>o.id===orderId) || state.orders.find(o=>o.id===orderId);
    if (!order) {toast('Order not found');return;}
    trackedOrderId=order.id;
    $('#homePage').style.display='none';
    $('#menuPage').style.display='none';
    $('#checkoutPage').style.display='none';
    $('#profilePage').style.display='none';
    $('#trackingPage').style.display='block';
    renderTracking(order);window.scrollTo(0,0);
}
function renderTracking(order) {
    $('#trackOrderId').textContent=order.id;
    $('#trackConfTitle').textContent=order.status==='delivered'?'Order Delivered!':(['cancelled','rejected'].includes(order.status)?statusTitle(order):'Order Tracking');
    $('#trackRestName').textContent=order.restaurant;
    $('#trackItems').textContent=order.items.map(i=>i.quantity+'x '+i.name).join(', ');
    const itemTotal = order.itemTotal!=null ? Number(order.itemTotal) : order.items.reduce((s,i)=>s+(Number(i.price)||0)*(Number(i.quantity)||1),0);
    const delivery = Number(order.delivery)||0;
    const tax = Number(order.tax)||0;
    const total = Number(order.total)||(itemTotal + delivery + tax);
    $('#trackItemTotal').textContent=money(itemTotal);
    $('#trackDelivery').textContent=delivery===0?'FREE':money(delivery);
    $('#trackTax').textContent=money(tax);
    $('#trackTotal').textContent=money(total);
    $('#trackPayMethod').textContent=order.payment||'DEMO — not charged';
    const key=statusKey(order);
    const ix=TRACK_STAGES.findIndex(s=>s.key===key);
    $('#trackTimeline').innerHTML=TRACK_STAGES.map((s,i)=>{
        const done=ix>=0&&i<=ix;
        const active=ix===i;
        return `<div class="track-stage ${done?'done':''} ${active?'active':''}"><div class="stage-icon"><i class="${s.icon}"></i></div><div class="stage-info"><h5>${s.label}</h5><p>${s.desc}</p></div></div>`;
    }).join('')+(ix===-1?`<div class="track-stage active"><div class="stage-icon"><i class="ri-error-warning-line"></i></div><div class="stage-info"><h5>${statusTitle(order)}</h5><p>This order is ${statusTitle(order).toLowerCase()} and is not being fulfilled.</p></div></div>`:'');
    const etaText = key === 'delivered'
        ? 'Delivered · Enjoy your meal!'
        : key === 'out_for_delivery'
        ? (order.riderName ? `On the way with ${order.riderName}` : 'On the way to your hostel')
        : key === 'picked_up'
        ? (order.riderName ? `Picked up by ${order.riderName}` : 'Picked up · Heading your way')
        : key === 'ready'
        ? 'Ready for pickup at canteen'
        : key === 'preparing'
        ? 'Kitchen is preparing your food'
        : key === 'accepted'
        ? 'Accepted by canteen'
        : ix === -1
        ? statusTitle(order)
        : 'Order Placed · Awaiting canteen confirmation';
    $('#trackEta').textContent=etaText;
    $('#trackDelPartner').style.display=order.riderId?'flex':'none';
    if (order.riderName) $('#dpName').textContent=order.riderName;
}

function syncStoreUpdates(key) {
    if (!key || key==='iitg_orders' || key==='iitg_portal_demo_orders_v1') {
        state.orders=JSON.parse(localStorage.getItem('iitg_orders')||'[]');
        if(trackedOrderId && $('#trackingPage').style.display!=='none'){
            const fresh=portalStore.orders().find(o=>o.id===trackedOrderId);
            if(fresh) renderTracking(fresh);
        }
        if($('#profilePage').style.display!=='none') showProfile();
    }
    if (!key || key==='iitg_portal_vendor_settings_v1') {
        refreshCartPrices();
        updateCart();
        renderRestaurants();
        if(state.currentRestaurant) renderMenu(state.currentRestaurant);
    }
}

window.addEventListener('storage', e => syncStoreUpdates(e.key));
window.addEventListener('iitg:updated', e => syncStoreUpdates(e.detail));

/* ============================================================
   SUPABASE CLIENT & AUTH
   ============================================================ */

const SUPABASE_URL = 'https://crilpczcrfkihlrvlouk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyaWxwY3pjcmZraWhscnZsb3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MTUwMjIsImV4cCI6MjEwNzI5MTAyMn0.84B_hivJv8Mslfi3JqJrfrzjyC-fa0RwAS27xDBIw1I';
let supabaseClient = null;

function getSupabase() {
    if (!supabaseClient && window.supabase && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

/* ============================================================
   PROFILE / ORDERS
   ============================================================ */

function showProfile() {
    state.orders = JSON.parse(localStorage.getItem('iitg_orders') || '[]');
    $('#homePage').style.display = 'none';
    $('#menuPage').style.display = 'none';
    $('#checkoutPage').style.display = 'none';
    $('#trackingPage').style.display = 'none';
    $('#profilePage').style.display = 'block';

    $('#profileUserName').textContent = state.user?.name || 'Guest';
    $('#profileUserEmail').textContent = state.user?.email || 'Not signed in';

    const avatarEl = $('.profile-avatar');
    if (avatarEl) {
        if (state.user?.avatar_url) {
            avatarEl.innerHTML = `<img src="${state.user.avatar_url}" alt="${state.user.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            avatarEl.innerHTML = `<i class="ri-user-3-line"></i>`;
        }
    }

    const locEl = $('#profileUserLocation');
    const hostelRoomEl = $('#profileUserHostelRoom');
    if (state.user?.hostel && state.user?.room) {
        if (locEl) locEl.style.display = 'inline-flex';
        if (hostelRoomEl) hostelRoomEl.textContent = `${state.user.room}, ${state.user.hostel} Hostel`;
    } else if (locEl) {
        locEl.style.display = 'none';
    }

    $('#orderHistoryList').innerHTML = state.orders.length
        ? state.orders.map(o => `
            <div class="order-history-card" onclick="showTracking('${o.id}')">
                <div class="ohc-head">
                    <h4>${o.restaurant}</h4>
                    <span class="order-status">${statusTitle(o)}</span>
                </div>
                <p>${o.items.map(i=>i.quantity+'x '+i.name).join(', ')}</p>
                <div class="ohc-foot">
                    <span>₹${o.total}</span>
                    <span>${new Date(o.placedAt).toLocaleDateString()}</span>
                </div>
            </div>`).join('')
        : `<p class="no-orders">No orders yet. Start ordering delicious food!</p>`;
    window.scrollTo(0,0);
}

/* ============================================================
   AUTH MODAL & SUPABASE METHODS
   ============================================================ */

function clearAuthMessages() {
    ['loginMsg', 'signupMsg', 'forgotMsg'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.textContent = ''; el.className = 'auth-msg'; }
    });
}

function switchAuthTab(tab = 'login') {
    clearAuthMessages();
    $$('.auth-form').forEach(f => f.classList.remove('active'));
    const target = document.getElementById(`${tab}Form`);
    if (target) target.classList.add('active');

    const heading = $('#authModalHeading');
    if (heading) {
        if (tab === 'signup') heading.textContent = 'Sign up';
        else if (tab === 'forgot') heading.textContent = 'Reset Password';
        else heading.textContent = 'Log in';
    }
}

function showAuth(tab = 'login') {
    switchAuthTab(tab);
    $('#authModal').classList.add('show');
}

function hideAuth() {
    clearAuthMessages();
    $('#authModal').classList.remove('show');
}

function fillDemoAccount() {
    switchAuthTab('login');
    const emailInput = $('#loginEmail');
    const pwdInput = $('#loginPassword');
    if (emailInput && pwdInput) {
        emailInput.value = 'test_student_iitg@gmail.com';
        pwdInput.value = 'password123';
        toast('Demo credentials loaded! Tap Login.');
        emailInput.focus();
    }
}

function setupPasswordToggles() {
    $$('.pwd-toggle').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;
            const isPwd = input.type === 'password';
            input.type = isPwd ? 'text' : 'password';
            btn.innerHTML = `<i class="${isPwd ? 'ri-eye-off-line' : 'ri-eye-line'}"></i>`;
        };
    });
}

async function doGoogleAuth(e) {
    const sb = getSupabase();
    if (!sb) {
        toast('Unable to initialize Supabase client.');
        return;
    }

    const clickedBtn = (e && e.currentTarget) ? e.currentTarget : ($('#signupForm.active') ? $('#googleAuthBtnSignup') : $('#googleAuthBtn'));
    const originalText = clickedBtn ? clickedBtn.innerHTML : '';
    if (clickedBtn) {
        clickedBtn.disabled = true;
        clickedBtn.innerHTML = `<span>Connecting to Google...</span>`;
    }

    try {
        const redirectUrl = window.location.origin + window.location.pathname;
        const { data, error } = await sb.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        });

        if (error) {
            console.warn('Supabase Google OAuth response:', error);
            const activeMsg = $('#signupForm.active') ? $('#signupMsg') : $('#loginMsg');
            if (activeMsg) {
                activeMsg.className = 'auth-msg error';
                activeMsg.innerHTML = `<strong>Google Sign-In:</strong> ${error.message}<br><small style="margin-top:4px;display:block;">You can sign in with your student email or click <strong>1-Click Demo Fill</strong>.</small>`;
                activeMsg.style.display = 'block';
            } else {
                toast(error.message);
            }
        }
    } catch (err) {
        console.error('OAuth call failed:', err);
        toast('Google auth error: ' + (err.message || 'Check connection'));
    } finally {
        if (clickedBtn) {
            clickedBtn.disabled = false;
            clickedBtn.innerHTML = originalText || `
                <svg class="google-svg" viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Continue with Google</span>
            `;
        }
    }
}

async function doForgotPassword(e) {
    e.preventDefault();
    const sb = getSupabase();
    const email = $('#forgotEmail').value.trim();
    const submitBtn = $('#forgotSubmitBtn');
    const msgEl = $('#forgotMsg');

    if (!sb) {
        toast('Unable to connect to Supabase.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Sending Link...</span>`;
    msgEl.style.display = 'none';

    try {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname
        });

        if (error) {
            msgEl.className = 'auth-msg error';
            msgEl.textContent = error.message;
            msgEl.style.display = 'block';
        } else {
            msgEl.className = 'auth-msg success';
            msgEl.textContent = 'Password reset instructions sent! Check your inbox.';
            msgEl.style.display = 'block';
            toast('Password reset link sent to ' + email);
        }
    } catch (err) {
        msgEl.className = 'auth-msg error';
        msgEl.textContent = err.message || 'Failed to send reset email.';
        msgEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Send Reset Link</span> <i class="ri-mail-send-line"></i>`;
    }
}

async function loadUserProfile(authUser) {
    if (!authUser) return;
    const sb = getSupabase();
    const meta = authUser.user_metadata || {};
    let profileData = {
        id: authUser.id,
        email: authUser.email || '',
        name: meta.full_name || meta.name || authUser.email?.split('@')[0] || 'IITG Student',
        hostel: meta.hostel || 'Lohit',
        room: meta.room || 'H-101',
        avatar_url: meta.avatar_url || meta.picture || ''
    };

    if (sb) {
        try {
            const { data, error } = await sb
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle();

            if (!error && data) {
                if (data.full_name) profileData.name = data.full_name;
                if (data.hostel) profileData.hostel = data.hostel;
                if (data.room) profileData.room = data.room;
                if (data.avatar_url) profileData.avatar_url = data.avatar_url;
            }
        } catch (err) {
            console.warn('Profiles table read error:', err);
        }
    }

    state.user = profileData;
    saveUser();
    updateUserUI();
    if ($('#profilePage').style.display !== 'none') {
        showProfile();
    }
}

async function doLogin(e) {
    e.preventDefault();
    const sb = getSupabase();
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    const submitBtn = $('#loginSubmitBtn');
    const msgEl = $('#loginMsg');

    if (!sb) {
        toast('Unable to connect to Supabase. Check your connection.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Logging in...</span>`;
    msgEl.style.display = 'none';

    try {
        let { data, error } = await sb.auth.signInWithPassword({
            email,
            password
        });

        // If email confirmation is required, auto-confirm via RPC and retry login
        if (error && (error.message?.toLowerCase().includes('email not confirmed') || error.code === 'email_not_confirmed')) {
            try {
                await sb.rpc('confirm_user_email', { user_email: email });
                const retry = await sb.auth.signInWithPassword({ email, password });
                data = retry.data;
                error = retry.error;
            } catch (autoErr) {
                console.warn('Auto-confirm retry error:', autoErr);
            }
        }

        if (error) {
            msgEl.className = 'auth-msg error';
            msgEl.textContent = error.message;
            msgEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Log in`;
            return;
        }

        if (data?.user) {
            await loadUserProfile(data.user);
            hideAuth();
            $('#loginForm').reset();
            toast('Welcome back, ' + state.user.name + '!');
        }
    } catch (err) {
        msgEl.className = 'auth-msg error';
        msgEl.textContent = err.message || 'Login failed. Please try again.';
        msgEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Log in`;
    }
}

async function doSignup(e) {
    e.preventDefault();
    const sb = getSupabase();
    const name = $('#signupName').value.trim();
    const email = $('#signupEmail').value.trim();
    const hostel = $('#signupHostel').value;
    const room = $('#signupRoom').value.trim();
    const password = $('#signupPassword').value;
    const submitBtn = $('#signupSubmitBtn');
    const msgEl = $('#signupMsg');

    if (!sb) {
        toast('Unable to connect to Supabase. Check your connection.');
        return;
    }

    if (password.length < 6) {
        msgEl.className = 'auth-msg error';
        msgEl.textContent = 'Password must be at least 6 characters long.';
        msgEl.style.display = 'block';
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Creating Account...</span>`;
    msgEl.style.display = 'none';

    try {
        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    hostel: hostel,
                    room: room
                }
            }
        });

        if (error) {
            msgEl.className = 'auth-msg error';
            msgEl.textContent = error.message;
            msgEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Create account`;
            return;
        }

        // Auto-confirm the user in Supabase so they don't get stuck waiting for external email delivery
        try {
            await sb.rpc('confirm_user_email', { user_email: email });
        } catch (confErr) {
            console.warn('RPC confirm error:', confErr);
        }

        // Immediately sign the user in with the credentials they just created
        let activeUser = data?.user;
        let hasSession = !!data?.session;

        if (!hasSession) {
            try {
                const signInRes = await sb.auth.signInWithPassword({ email, password });
                if (signInRes.data?.user) {
                    activeUser = signInRes.data.user;
                    hasSession = true;
                }
            } catch (autoLoginErr) {
                console.warn('Auto sign-in error:', autoLoginErr);
            }
        }

        if (activeUser) {
            // Write into public.profiles
            try {
                await sb.from('profiles').upsert({
                    id: activeUser.id,
                    email: activeUser.email,
                    full_name: name,
                    hostel: hostel,
                    room: room
                });
            } catch (profileErr) {
                console.warn('Profiles table upsert fallback:', profileErr);
            }
        }

        if (hasSession && activeUser) {
            await loadUserProfile(activeUser);
            hideAuth();
            $('#signupForm').reset();
            toast('Welcome to IITG Eats, ' + name + '!');
        } else {
            msgEl.className = 'auth-msg success';
            msgEl.textContent = 'Account created successfully! You can now log in.';
            msgEl.style.display = 'block';
            toast('Account created! Please log in.');
        }
    } catch (err) {
        msgEl.className = 'auth-msg error';
        msgEl.textContent = err.message || 'Signup failed. Please try again.';
        msgEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Create account`;
    }
}

function updateUserUI() {
    const loginBtn = $('#loginBtn');
    const signupBtn = $('#signupBtn');
    const profileBtn = $('#profileBtn');
    if (state.user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (profileBtn) profileBtn.style.display = 'block';
        const firstName = (state.user.name || 'Student').split(' ')[0];
        const nameEl = $('#profileName');
        if (nameEl) nameEl.textContent = firstName;
        const avatarCircle = $('#userAvatarCircle');
        if (avatarCircle) {
            if (state.user.avatar_url) {
                avatarCircle.innerHTML = `<img src="${state.user.avatar_url}" alt="${firstName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                avatarCircle.textContent = (firstName[0] || 'U').toUpperCase();
            }
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (signupBtn) signupBtn.style.display = 'block';
        if (profileBtn) profileBtn.style.display = 'none';
    }
}

async function logout() {
    const sb = getSupabase();
    if (sb) {
        try {
            await sb.auth.signOut();
        } catch (err) {
            console.warn('Logout error:', err);
        }
    }
    state.user = null;
    saveUser();
    updateUserUI();
    showHome();
    toast('Logged out successfully');
}

async function initSupabaseAuth() {
    const sb = getSupabase();
    if (!sb) return;

    try {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) {
            await loadUserProfile(session.user);
        }

        sb.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
                await loadUserProfile(session.user);
            } else if (event === 'SIGNED_OUT') {
                state.user = null;
                saveUser();
                updateUserUI();
            }
        });
    } catch (err) {
        console.warn('Supabase Auth init error:', err);
    }
}

/* ============================================================
   NAVIGATION
   ============================================================ */

function showHome() {
    $('#homePage').style.display='block';
    $('#menuPage').style.display='none';
    $('#checkoutPage').style.display='none';
    $('#trackingPage').style.display='none';
    $('#profilePage').style.display='none';
    window.scrollTo(0,0);
}

window.filterByCategory = (cat) => {
    state.activeCategory = state.activeCategory === cat ? null : cat;
    showHome();
    applyFilters();
    document.getElementById('restaurantsGrid').scrollIntoView({behavior:'smooth'});
};

window.filterByCollection = (title) => {
    state.activeCuisines.clear();
    state.costFilter='all';
    if (title === 'Late Night Eats') { state.sortBy='time'; }
    else if (title === 'Budget Bites') { state.costFilter='low'; }
    else if (title === 'Best of Biryani') { state.activeCategory='Biryani'; }
    else if (title === 'Sweet Tooth') { state.activeCategory='Desserts'; }
    else if (title === 'Quick Bites') { state.sortBy='time'; }
    else if (title === 'Pure Veg') { state.vegOnly=true; $('#vegToggle').classList.add('on'); }
    else if (title === 'Exam Fuel') { state.sortBy='rating'; }
    showHome();
    applyFilters();
    document.getElementById('restaurantsGrid').scrollIntoView({behavior:'smooth'});
};

/* ============================================================
   EVENT WIRING
   ============================================================ */

function wireEvents() {
    // home / logo
    $('#homeLogo').onclick = showHome;
    // cart
    $('#cartBtn').onclick = (e) => { e.preventDefault(); openCart(); };
    $('#closeCart').onclick = closeCart;
    $('#cartOverlay').onclick = closeCart;
    $('#cartBrowseBtn').onclick = () => { closeCart(); showHome(); };
    $('#stickyViewCart').onclick = openCart;
    $('#checkoutBtn').onclick = openCheckout;
    // checkout
    $('#backToCart').onclick = () => { $('#checkoutPage').style.display='none'; showHome(); openCart(); };
    $('#applyCoupon').onclick = applyCoupon;
    $('#placeOrderBtn').onclick = placeOrder;
    $('#deliveryHostel').addEventListener('change', e => {
        const location=e.target.value;
        if (location) $('#defaultAddress').textContent=location==='Other approved campus point' ? location+', IIT Guwahati' : location+' Hostel, IIT Guwahati';
    });
    $$('.pay-opt').forEach(p => p.onclick = () => {
        $$('.pay-opt').forEach(x => x.classList.remove('active'));
        p.classList.add('active');
        p.querySelector('input').checked = true;
        $('#upiInput').style.display = p.querySelector('input').value === 'upi' ? 'block' : 'none';
    });
    $$('.schedule-opt').forEach(s => s.onclick = () => {
        $$('.schedule-opt').forEach(x => x.classList.remove('active'));
        s.classList.add('active');
        s.querySelector('input').checked = true;
    });
    // tracking back
    $('#trackBack').onclick = () => { $('#trackingPage').style.display='none'; showHome(); };
    $('#trackOrderMore').onclick = () => { $('#trackingPage').style.display='none'; showHome(); };
    // profile
    $('#profileBtn').onclick = (e) => { e.preventDefault(); showProfile(); };
    $('#profileBack').onclick = showHome;
    $('#logoutBtn').onclick = logout;
    // back from menu
    $('#backToHome').onclick = showHome;
    // auth
    const loginNav = $('#loginBtn');
    if (loginNav) loginNav.onclick = (e) => { e.preventDefault(); showAuth('login'); };
    const signupNav = $('#signupBtn');
    if (signupNav) signupNav.onclick = (e) => { e.preventDefault(); showAuth('signup'); };

    $('#closeModal').onclick = hideAuth;
    $('#loginForm').addEventListener('submit', doLogin);
    $('#signupForm').addEventListener('submit', doSignup);
    const forgotForm = $('#forgotForm');
    if (forgotForm) forgotForm.addEventListener('submit', doForgotPassword);

    const googleBtn = $('#googleAuthBtn');
    if (googleBtn) googleBtn.onclick = doGoogleAuth;
    const googleBtnSignup = $('#googleAuthBtnSignup');
    if (googleBtnSignup) googleBtnSignup.onclick = doGoogleAuth;

    const demoFillBtn = $('#quickDemoFillBtn');
    if (demoFillBtn) demoFillBtn.onclick = fillDemoAccount;

    const forgotLink = $('#forgotPwdLink');
    if (forgotLink) forgotLink.onclick = (e) => { e.preventDefault(); switchAuthTab('forgot'); };

    const backToLogin = $('#backToLoginFromForgot');
    if (backToLogin) backToLogin.onclick = (e) => { e.preventDefault(); switchAuthTab('login'); };

    const switchToSignup = $('#switchToSignup');
    if (switchToSignup) switchToSignup.onclick = (e) => { e.preventDefault(); switchAuthTab('signup'); };

    const switchToLogin = $('#switchToLogin');
    if (switchToLogin) switchToLogin.onclick = (e) => { e.preventDefault(); switchAuthTab('login'); };

    $('#authModal').onclick = (e) => { if (e.target.id === 'authModal') hideAuth(); };
    setupPasswordToggles();
    // search
    $('#searchInput').oninput = (e) => {
        state.searchQuery = e.target.value;
        renderRestaurants();
    };
    // veg toggle
    $('#vegToggle').onclick = () => {
        state.vegOnly = !state.vegOnly;
        $('#vegToggle').classList.toggle('on', state.vegOnly);
        applyFilters();
    };
    // filter / sort panels
    $('#filterBtn').onclick = () => {
        $('#filterPanel').classList.toggle('open');
        $('#sortPanel').classList.remove('open');
    };
    $('#sortBtn').onclick = () => {
        $('#sortPanel').classList.toggle('open');
        $('#filterPanel').classList.remove('open');
    };
    $$('.sort-option').forEach(s => s.onclick = () => {
        state.sortBy = s.dataset.sort;
        $('#sortPanel').classList.remove('open');
        applyFilters();
    });
    $$('.range-chip').forEach(c => c.onclick = () => {
        $$('.range-chip').forEach(x=>x.classList.remove('active'));
        c.classList.add('active');
        state.costFilter = c.dataset.cost;
        applyFilters();
    });
    $('#clearFilters').onclick = () => {
        state.vegOnly=false; state.activeCuisines.clear(); state.costFilter='all';
        state.activeCategory=null; state.sortBy='relevance';
        $('#vegToggle').classList.remove('on');
        $$('.filter-btn.chip').forEach(b=>b.classList.remove('active'));
        $$('.range-chip').forEach(x=>x.classList.remove('active'));
        renderCuisineFilters();
        applyFilters();
    };
    // close panels on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#filterBtn') && !e.target.closest('#filterPanel')) $('#filterPanel').classList.remove('open');
        if (!e.target.closest('#sortBtn') && !e.target.closest('#sortPanel')) $('#sortPanel').classList.remove('open');
    });
    // chatbot
    let chatInited = false;
    $('#chatFab').onclick = () => { if (!chatInited) { initChat(); chatInited = true; } openChat(); };
    $('#chatClose').onclick = closeChat;
    $('#chatOverlay').onclick = closeChat;
    $('#chatSend').onclick = () => handleUserInput($('#chatInput').value);
    $('#chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') handleUserInput($('#chatInput').value); });
}

/* ============================================================
   AI CHATBOT — Live Menu, Supabase & Order History Recommender
   Combines live eatery menus, customer history & AI explanations
   ============================================================ */

const RECOMMEND_API_URL = 'https://crilpczcrfkihlrvlouk.supabase.co/functions/v1/recommend-combos';

let userPreferences = {
    diet_pref: 'any',
    allergies: [],
    favorite_cuisines: [],
    spicy_preference: 'medium',
    typical_budget: 180,
    use_history: true
};

const chatState = {
    combos: [],
    lastFactors: null,
    inited: false,
    loading: false
};

// Flatten all dishes across restaurants for fallback recommendation
const allDishes = (window.IITG_CATALOG || restaurants).flatMap(r => r.menu.map(m => ({
    ...m, restaurantId: r.id, restaurantName: r.name, restRating: r.rating || 4.2
})));

/* ---------- Supabase Preferences Sync ---------- */
async function loadPreferencesFromSupabase() {
    try {
        const sb = getSupabase();
        if (!sb) return;
        const uid = state.user?.id || 'demo_user';
        const { data, error } = await sb.from('customer_preferences').select('*').eq('user_id', uid).maybeSingle();
        if (data && !error) {
            userPreferences = {
                diet_pref: data.diet_pref || 'any',
                allergies: data.allergies || [],
                favorite_cuisines: data.favorite_cuisines || [],
                spicy_preference: data.spicy_preference || 'medium',
                typical_budget: Number(data.typical_budget) || 180,
                use_history: data.use_history !== false
            };
            updatePreferencesUI();
        }
    } catch (e) {
        console.warn('Could not load preferences from Supabase:', e);
    }
}

async function savePreferencesToSupabase() {
    try {
        const sb = getSupabase();
        const uid = state.user?.id || 'demo_user';
        const payload = {
            user_id: uid,
            diet_pref: userPreferences.diet_pref,
            allergies: userPreferences.allergies,
            favorite_cuisines: userPreferences.favorite_cuisines,
            spicy_preference: userPreferences.spicy_preference,
            typical_budget: userPreferences.typical_budget,
            use_history: userPreferences.use_history,
            updated_at: new Date().toISOString()
        };
        if (sb) {
            await sb.from('customer_preferences').upsert(payload, { onConflict: 'user_id' });
        }
        localStorage.setItem('iitg_saved_prefs', JSON.stringify(userPreferences));
        toast('✅ Preferences saved to Supabase!');
        $('#chatPrefsPanel').style.display = 'none';
        chatBotMsg(`Updated your preferences! ✨ (Diet: <strong>${userPreferences.diet_pref}</strong>, Budget: <strong>₹${userPreferences.typical_budget}</strong>, History: <strong>${userPreferences.use_history ? 'Active' : 'Off'}</strong>). What can I find for you now?`);
        setQuickReplies(['Under ₹150 filling meal', 'Comfort food', 'Late night snack', 'Surprise me']);
    } catch (e) {
        toast('Error saving preferences');
        console.error(e);
    }
}

function updatePreferencesUI() {
    const historyCheck = $('#prefUseHistoryToggle');
    if (historyCheck) historyCheck.checked = userPreferences.use_history;

    const dietBtns = $$('#prefDietGroup .pref-tag-btn');
    dietBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.val === userPreferences.diet_pref));

    const spiceBtns = $$('#prefSpiceGroup .pref-tag-btn');
    spiceBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.val === userPreferences.spicy_preference));

    const budgetInput = $('#prefBudgetInput');
    const budgetText = $('#prefBudgetText');
    if (budgetInput && budgetText) {
        budgetInput.value = userPreferences.typical_budget;
        budgetText.textContent = '₹' + userPreferences.typical_budget;
    }

    const allergenChecks = $$('.pref-allergen-check');
    allergenChecks.forEach(ch => {
        ch.checked = (userPreferences.allergies || []).includes(ch.value);
    });
}

function wireChatPreferencesUI() {
    $('#chatPrefsBtn').onclick = () => {
        updatePreferencesUI();
        $('#chatPrefsPanel').style.display = 'flex';
    };
    $('#chatPrefsCloseBtn').onclick = () => {
        $('#chatPrefsPanel').style.display = 'none';
    };
    $('#prefBudgetInput').oninput = (e) => {
        $('#prefBudgetText').textContent = '₹' + e.target.value;
        userPreferences.typical_budget = Number(e.target.value);
    };
    $('#prefUseHistoryToggle').onchange = (e) => {
        userPreferences.use_history = e.target.checked;
    };
    $$('#prefDietGroup .pref-tag-btn').forEach(b => {
        b.onclick = () => {
            $$('#prefDietGroup .pref-tag-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            userPreferences.diet_pref = b.dataset.val;
        };
    });
    $$('#prefSpiceGroup .pref-tag-btn').forEach(b => {
        b.onclick = () => {
            $$('#prefSpiceGroup .pref-tag-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            userPreferences.spicy_preference = b.dataset.val;
        };
    });
    $$('.pref-allergen-check').forEach(ch => {
        ch.onchange = () => {
            const set = new Set(userPreferences.allergies || []);
            if (ch.checked) set.add(ch.value);
            else set.delete(ch.value);
            userPreferences.allergies = Array.from(set);
        };
    });
    $('#btnSavePrefs').onclick = savePreferencesToSupabase;
}

/* ---------- Supabase Feedback Logging ---------- */
async function recordRecommendationFeedback(combo, feedbackType, comment = '') {
    try {
        const uid = state.user?.id || 'demo_user';
        const payload = {
            action: 'feedback',
            user_id: uid,
            query_text: chatState.lastPrompt || '',
            combo_title: combo.items.map(i => i.dish.name).join(' + '),
            combo_items: combo.items.map(i => i.dish.id),
            restaurant_id: combo.eatery.id,
            total_price: combo.total_price,
            recommendation_type: combo.type || 'best_match',
            feedback_type: feedbackType,
            comment
        };
        // 1. Edge function
        fetch(RECOMMEND_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(() => {});

        // 2. Direct Supabase fallback
        const sb = getSupabase();
        if (sb) {
            await sb.from('recommendation_feedback').insert([{
                user_id: uid,
                query_text: chatState.lastPrompt || '',
                combo_title: payload.combo_title,
                combo_items: payload.combo_items,
                restaurant_id: combo.eatery.id,
                total_price: combo.total_price,
                recommendation_type: combo.type || 'best_match',
                feedback_type: feedbackType,
                comment
            }]);
        }
    } catch (e) {
        console.warn('Feedback log warning:', e);
    }
}

/* ---------- Chat UI Messaging ---------- */
function chatBotMsg(html, opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg bot';
    wrap.innerHTML = (opts.withName ? `<div class="bot-name">IITG Eats AI Assistant</div>` : '') + html;
    $('#chatMessages').appendChild(wrap);
    scrollChat();
    return wrap;
}
function chatUserMsg(text) {
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg user';
    wrap.textContent = text;
    $('#chatMessages').appendChild(wrap);
    scrollChat();
}
function scrollChat() {
    const el = $('#chatMessages');
    if (el) el.scrollTop = el.scrollHeight;
}
function showTyping() {
    if ($('#chatTyping')) return;
    const t = document.createElement('div');
    t.className = 'chat-typing'; t.id = 'chatTyping';
    t.innerHTML = '<span></span><span></span><span></span>';
    $('#chatMessages').appendChild(t);
    scrollChat();
}
function hideTyping() {
    const t = $('#chatTyping');
    if (t) t.remove();
}
function setQuickReplies(chips) {
    const box = $('#chatQuickReplies');
    box.innerHTML = chips.map(c => `<button class="chat-chip" data-val="${c}">${c}</button>`).join('');
    box.querySelectorAll('.chat-chip').forEach(btn => {
        btn.onclick = () => handleUserInput(btn.dataset.val);
    });
}
function clearQuickReplies() {
    $('#chatQuickReplies').innerHTML = '';
}

/* ---------- Recommendation Card Rendering & Cart Flow ---------- */
function renderComboCards(combos, factors) {
    if (!combos || !combos.length) return;
    chatState.combos = combos;

    const cardsHtml = combos.map((combo, index) => {
        const badgeTitles = {
            best_match: '✨ Best Match',
            budget_saver: '💰 Budget Saver',
            adventurous: '🌟 Something Different'
        };
        const badgeLabel = badgeTitles[combo.type] || '✨ Verified Combo';

        const itemsHtml = combo.items.map(item => `
            <div class="combo-item-row">
                <div class="combo-item-left">
                    <span class="combo-role-tag ${item.role || 'main'}">${item.role || 'main'}</span>
                    <span class="combo-item-title">${item.dish.name}</span>
                    <span class="combo-item-qty">×${item.qty}</span>
                </div>
                <div class="combo-item-price">${money(item.dish.price * item.qty)}</div>
            </div>
        `).join('');

        const allergenText = combo.items.flatMap(i => i.dish.allergens || []).filter(Boolean);
        const uniqueAllergens = Array.from(new Set(allergenText));
        const allergenBadge = uniqueAllergens.length
            ? `<span style="font-size:0.68rem;color:#854d0e;background:#fef9c3;padding:2px 6px;border-radius:4px;">Contains: ${uniqueAllergens.join(', ')}</span>`
            : `<span style="font-size:0.68rem;color:#166534;background:#dcfce7;padding:2px 6px;border-radius:4px;">No common allergens</span>`;

        return `
            <div class="combo-card" id="comboCard_${index}">
                <div class="combo-card-header">
                    <span class="combo-badge ${combo.type}">${badgeLabel}</span>
                    <span class="combo-eatery-meta">
                        <strong>${combo.eatery.name}</strong> • ⏱️ ${combo.prep_minutes || 15}m
                    </span>
                </div>
                <div class="combo-items-box">
                    ${itemsHtml}
                    <div style="margin-top:2px;">${allergenBadge}</div>
                </div>
                <div class="combo-explanation-box">
                    💬 <strong>AI Note:</strong> ${combo.explanation || 'Curated combo from live menu.'}
                </div>
                <div class="combo-price-breakdown">
                    <span>Items: <strong>${money(combo.items_total)}</strong> + Delivery: <strong>${money(combo.delivery_fee)}</strong></span>
                    <span class="grand-total">${money(combo.total_price)}</span>
                </div>
                <div class="combo-actions-box">
                    <button class="btn-add-combo" data-idx="${index}" id="btnAddCombo_${index}">
                        🛒 Add Combo to Cart (${money(combo.items_total)})
                    </button>
                    <div class="combo-feedback-row" id="fbRow_${index}">
                        <span>Was this helpful?</span>
                        <div class="combo-fb-btns">
                            <button class="btn-fb-chip" data-type="good_suggestion" data-idx="${index}">👍 Good</button>
                            <button class="btn-fb-chip" data-type="too_expensive" data-idx="${index}">💸 Too pricey</button>
                            <button class="btn-fb-chip" data-type="not_my_taste" data-idx="${index}">🌶️ Not my taste</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const introSummary = `Here are <strong>${combos.length} verified combos</strong> built from our live eatery menus and calculated before & after delivery:`;
    const msgEl = chatBotMsg(introSummary + cardsHtml);

    // Wire Add Combo buttons
    msgEl.querySelectorAll('.btn-add-combo').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx, 10);
            const combo = combos[idx];
            if (!combo) return;

            // Live availability check before adding
            const eateryOpen = vendorOpen(combo.eatery.id);
            if (!eateryOpen) {
                toast(`⚠️ ${combo.eatery.name} is currently closed.`);
                return;
            }
            const unavailable = combo.items.find(i => !availableItem(combo.eatery.id, i.dish.id));
            if (unavailable) {
                toast(`⚠️ "${unavailable.dish.name}" is currently sold out.`);
                return;
            }

            // Check if cart has items from another eatery
            if (state.cart.length > 0 && state.cart[0].restaurantId !== combo.eatery.id) {
                const conf = confirm(`Your cart has items from ${state.cart[0].restaurantName}. Clear cart and add this combo from ${combo.eatery.name}?`);
                if (!conf) return;
                state.cart = [];
            }

            // Add each item in combo
            combo.items.forEach(it => {
                for (let q = 0; q < it.qty; q++) {
                    addToCart(combo.eatery.id, it.dish.id);
                }
            });

            btn.textContent = '✅ Added to Cart!';
            btn.classList.add('added');
            btn.disabled = true;
            recordRecommendationFeedback(combo, 'ordered');
            toast(`✨ Added ${combo.items.map(i=>i.dish.name).join(' + ')} to cart!`);
        };
    });

    // Wire Feedback buttons
    msgEl.querySelectorAll('.btn-fb-chip').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx, 10);
            const fbType = btn.dataset.type;
            const combo = combos[idx];
            const row = $(`#fbRow_${idx}`);
            if (row) {
                row.innerHTML = `<span style="color:#247A45;font-weight:700;"><i class="ri-check-line"></i> Thanks! Feedback saved to Supabase.</span>`;
            }
            recordRecommendationFeedback(combo, fbType);
        };
    });

    setQuickReplies(['Under ₹100 snack', 'Something spicy 🔥', 'Vegetarian only 🥬', 'Start over']);
}

/* ---------- Local Fallback Recommendation Engine ---------- */
function runClientFallbackEngine(prompt, factors) {
    const budget = Number(factors.budget) || 200;
    const diet = factors.diet || userPreferences.diet_pref;
    const allergies = factors.allergies || userPreferences.allergies || [];
    const mood = factors.mood || null;
    const hunger = factors.hunger_level || 'regular';
    const taste = factors.taste || null;

    // Gather live portal state
    const candidates = [];

    restaurants.forEach(rest => {
        if (!vendorOpen(rest.id)) return;
        const dishes = rest.menu.filter(m => {
            if (!availableItem(rest.id, m.id)) return false;
            if (diet === 'vegetarian' && !m.isVeg) return false;
            if (allergies.length && m.allergens && allergies.some(a => m.allergens.includes(a))) return false;
            return true;
        }).map(m => ({ ...m, price: priceFor(rest.id, m) }));

        const mains = dishes.filter(d => (d.meal_role === 'main' || ['Biryani','North Indian','South Indian','Pizza','Burgers','Pasta','Maggi','Meals','Rolls'].includes(d.cat)));
        const sides = dishes.filter(d => (d.meal_role === 'side' || ['Snacks','Sides','Street Food'].includes(d.cat)));
        const drinks = dishes.filter(d => (d.meal_role === 'drink' || d.cat === 'Beverages'));

        const eateryMeta = {
            id: rest.id,
            name: rest.name,
            delivery_fee: rest.delivery_fee || 15,
            delivery_mins: rest.timeMin || 25
        };

        // Formulate combos
        mains.forEach(m => {
            drinks.forEach(dr => {
                const total = m.price + dr.price;
                if (total <= budget) {
                    candidates.push({
                        eatery: eateryMeta,
                        items: [{ dish: m, qty: 1, role: 'main' }, { dish: dr, qty: 1, role: 'drink' }],
                        items_total: total,
                        delivery_fee: eateryMeta.delivery_fee,
                        total_price: total + eateryMeta.delivery_fee,
                        prep_minutes: m.prep_minutes || 15,
                        score: (m.rating || 4.2) + (m.bestseller ? 1.5 : 0) + (dr.rating || 4.0),
                        type: 'best_match',
                        explanation: `${m.name} + ${dr.name} — ${money(total)} before delivery. Both items are available from ${rest.name}. Add combo?`
                    });
                }
            });
        });

        sides.forEach(s => {
            drinks.forEach(dr => {
                const total = s.price + dr.price;
                if (total <= budget) {
                    candidates.push({
                        eatery: eateryMeta,
                        items: [{ dish: s, qty: 1, role: 'side' }, { dish: dr, qty: 1, role: 'drink' }],
                        items_total: total,
                        delivery_fee: eateryMeta.delivery_fee,
                        total_price: total + eateryMeta.delivery_fee,
                        prep_minutes: s.prep_minutes || 10,
                        score: (s.rating || 4.0) + (dr.rating || 4.0),
                        type: 'budget_saver',
                        explanation: `${s.name} + ${dr.name} — ${money(total)} before delivery. Quick satisfying combo under budget. Add combo?`
                    });
                }
            });
        });
    });

    if (!candidates.length) {
        chatBotMsg(`
            <div class="combo-bottleneck-card">
                <h6><i class="ri-error-warning-line"></i> No combinations matched your budget (₹${budget})</h6>
                <p>Try increasing your budget or relaxing dietary/allergy constraints.</p>
            </div>
        `);
        setQuickReplies(['Budget ₹200', 'Budget ₹300', 'Show Snacks', 'Start over']);
        return;
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = { ...candidates[0], type: 'best_match' };
    const cheapest = { ...[...candidates].sort((a,b)=>a.items_total-b.items_total)[0], type: 'budget_saver' };
    const diff = { ...(candidates.find(c => c.eatery.id !== best.eatery.id) || candidates[1] || best), type: 'adventurous' };

    const selected = [best];
    if (cheapest !== best) selected.push(cheapest);
    if (diff !== best && diff !== cheapest) selected.push(diff);

    renderComboCards(selected, factors);
}

/* ---------- Chat Controller ---------- */
async function fetchRecommendations(prompt) {
    showTyping();
    chatState.lastPrompt = prompt;

    // Collect live disabled items and price overrides
    const disabledItems = [];
    const priceOverrides = {};
    restaurants.forEach(r => {
        const pref = portalStore.setting(r.id);
        if (pref && pref.disabledItems) {
            Object.keys(pref.disabledItems).forEach(id => {
                if (pref.disabledItems[id]) disabledItems.push(id);
            });
        }
        if (pref && pref.prices) {
            Object.assign(priceOverrides, pref.prices);
        }
    });

    const payload = {
        action: 'recommend',
        message: prompt,
        user_id: state.user?.id || 'demo_user',
        disabled_items: disabledItems,
        price_overrides: priceOverrides,
        use_history: userPreferences.use_history,
        budget: userPreferences.typical_budget,
        diet: userPreferences.diet_pref !== 'any' ? userPreferences.diet_pref : null,
        allergies: userPreferences.allergies
    };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(RECOMMEND_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        hideTyping();

        if (!res.ok) throw new Error('Backend HTTP error');
        const data = await res.json();

        if (data.status === 'ok' && data.combos && data.combos.length > 0) {
            renderComboCards(data.combos, data.factors_understood);
        } else if (data.status === 'no_match') {
            chatBotMsg(`
                <div class="combo-bottleneck-card">
                    <h6><i class="ri-error-warning-line"></i> ${data.message || 'No matching combos found'}</h6>
                    <p>We checked all live eateries and current stock. Try relaxing one of the filters below:</p>
                </div>
            `);
            setQuickReplies(data.suggestions || ['Increase budget to ₹200', 'Vegetarian options', 'Start over']);
        } else {
            runClientFallbackEngine(prompt, payload);
        }
    } catch (err) {
        console.warn('Falling back to local combo engine:', err);
        hideTyping();
        runClientFallbackEngine(prompt, payload);
    }
}

function handleUserInput(text) {
    const raw = (text || '').trim();
    if (!raw) return;
    chatUserMsg(raw);
    clearQuickReplies();
    $('#chatInput').value = '';

    // Quick command handling
    if (/start over|reset|clear|hello|hi\b/i.test(raw)) {
        chatBotMsg(`Let's start fresh! 😊 Tell me your mood, what you're craving, or your budget (e.g. <em>"Filling veg combo under ₹150"</em>):`);
        setQuickReplies(['Feeling tired, want something filling under ₹150', 'Spicy veg dinner under ₹200', 'Light snack & chai under ₹80', '⚙️ Preferences']);
        return;
    }
    if (/pref|diet|settings|allergy|allergies/i.test(raw)) {
        updatePreferencesUI();
        $('#chatPrefsPanel').style.display = 'flex';
        return;
    }

    // Call live recommendation engine
    fetchRecommendations(raw);
}

/* ---------- Chat Open/Close & Initialization ---------- */
function openChat() {
    $('#chatPanel').classList.add('open');
    $('#chatOverlay').classList.add('open');
    $('#chatFab').style.display = 'none';
    setTimeout(() => $('#chatInput').focus(), 300);
}
function closeChat() {
    $('#chatPanel').classList.remove('open');
    $('#chatOverlay').classList.remove('open');
    $('#chatFab').style.display = 'flex';
}
function initChat() {
    wireChatPreferencesUI();
    loadPreferencesFromSupabase();

    chatBotMsg(`Hey there! 👋 I'm your <strong>IITG Eats AI Assistant</strong>.<br>I understand your cravings, calculate live combo prices from open campus eateries, and personalize dishes based on your order history!`, { withName: true });
    
    setTimeout(() => {
        chatBotMsg(`What are you in the mood for right now? Try asking something like:`, {});
        setQuickReplies([
            'Feeling tired, want something filling under ₹150',
            'Comfort food under ₹120',
            'Spicy veg dinner under ₹200',
            'Quick tea & snacks',
            '⚙️ Preferences & Diet'
        ]);
    }, 500);
}

/* ============================================================
   INIT
   ============================================================ */

function init() {
    renderOffers();
    renderCollections();
    renderCategories();
    renderRestaurants();
    renderCuisineFilters();
    setupQuickFilters();
    updateCart();
    updateUserUI();
    wireEvents();
    initSupabaseAuth();
    if (!localStorage.getItem('iitg_shown_auth')) {
        setTimeout(() => { if (!state.user) showAuth('login'); localStorage.setItem('iitg_shown_auth','1'); }, 1500);
    }
}

init();
});

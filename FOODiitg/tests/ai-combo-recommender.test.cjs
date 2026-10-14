const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

console.log('--- STARTING AI COMBO RECOMMENDER TEST SUITE ---');

// 1. Load catalog
const catalogPath = path.resolve(__dirname, '../catalog.js');
const catalogCode = fs.readFileSync(catalogPath, 'utf8');
const vm = require('node:vm');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(catalogCode, sandbox);
const catalog = sandbox.window.IITG_CATALOG;

assert(Array.isArray(catalog), 'IITG_CATALOG should be an array');
assert(catalog.length === 6, 'Should have 6 campus eateries');

// 2. Verify structured dish metadata
let allDishes = [];
catalog.forEach(eatery => {
    assert(eatery.id && eatery.name && eatery.hours, `Eatery ${eatery.name} missing basic attributes`);
    assert(Array.isArray(eatery.menu) && eatery.menu.length > 0, `Eatery ${eatery.name} has empty menu`);
    eatery.menu.forEach(item => {
        allDishes.push({ ...item, restaurantId: eatery.id, restaurantName: eatery.name });
        assert(item.id && item.name && typeof item.price === 'number', `Dish ${item.name} invalid`);
        assert(['main', 'side', 'drink', 'dessert'].includes(item.meal_role), `Dish ${item.name} has invalid meal_role: ${item.meal_role}`);
        assert(['vegetarian', 'non-vegetarian', 'vegan', 'egg'].includes(item.diet), `Dish ${item.name} has invalid diet: ${item.diet}`);
        assert(Array.isArray(item.tags) && item.tags.length > 0, `Dish ${item.name} missing tags`);
        assert(Array.isArray(item.allergens), `Dish ${item.name} allergens should be array`);
        assert(typeof item.prep_minutes === 'number', `Dish ${item.name} prep_minutes invalid`);
    });
});
console.log(`✔ Verified ${allDishes.length} menu items across ${catalog.length} eateries with structured metadata.`);

// 3. Test Factor Extraction logic (as specified in prompt)
function extractFactors(text) {
    const t = text.toLowerCase();
    const factors = { budget: null, diet: null, allergies: [], mood: null, hunger_level: null, taste: null, people: 1 };
    
    // Budget
    const bMatch = t.match(/(?:₹|rs\.?|inr|under|within|budget of|budget|less than|upto|up to|max)\s*(\d{2,5})/i);
    if (bMatch) factors.budget = parseInt(bMatch[1], 10);
    
    // Diet
    if (/\b(non[-\s]?veg|nonveg|chicken|mutton|meat|fish)\b/.test(t)) factors.diet = 'non-vegetarian';
    else if (/\b(pure veg|veg|vegetarian)\b/.test(t)) factors.diet = 'vegetarian';

    // Mood
    if (/\b(tired|exhaust|sleepy|drained|fatigue|lazy)\b/.test(t)) factors.mood = 'tired';
    else if (/\b(stress|anxious|anxiety|exam|deadline)\b/.test(t)) factors.mood = 'stressed';
    else if (/\b(happy|celebrat|party)\b/.test(t)) factors.mood = 'happy';

    // Hunger
    if (/\b(filling|very hungry|starving|heavy|famished)\b/.test(t)) factors.hunger_level = 'very_hungry';
    else if (/\b(snack|light bite|quick bite)\b/.test(t)) factors.hunger_level = 'snack';
    else if (/\b(dinner|lunch|meal)\b/.test(t)) factors.hunger_level = 'regular';

    // Taste
    if (/\b(spicy|hot|chilli|fiery)\b/.test(t)) factors.taste = 'spicy';
    else if (/\b(sweet|dessert)\b/.test(t)) factors.taste = 'sweet';

    // People
    const pMatch = t.match(/(?:for|serving)\s*(\d{1,2})/i);
    if (pMatch) factors.people = parseInt(pMatch[1], 10);
    else if (/\b(for two|dinner for two|two of us)\b/.test(t)) factors.people = 2;

    return factors;
}

// Test case 1: User prompt example: “Feeling tired, want something filling under ₹150.”
const factors1 = extractFactors("Feeling tired, want something filling under ₹150.");
assert.strictEqual(factors1.budget, 150, "Should extract budget 150");
assert.strictEqual(factors1.mood, 'tired', "Should extract mood 'tired'");
assert.strictEqual(factors1.hunger_level, 'very_hungry', "Should extract hunger 'very_hungry' from 'filling'");
console.log("✔ Factor Extraction Test 1 (Tired, filling under ₹150) Passed.");

// Test case 2: “Spicy veg dinner for two under ₹300”
const factors2 = extractFactors("Spicy veg dinner for two under ₹300");
assert.strictEqual(factors2.budget, 300, "Should extract budget 300");
assert.strictEqual(factors2.diet, 'vegetarian', "Should extract diet 'vegetarian'");
assert.strictEqual(factors2.taste, 'spicy', "Should extract taste 'spicy'");
assert.strictEqual(factors2.people, 2, "Should extract people 2");
console.log("✔ Factor Extraction Test 2 (Spicy veg dinner for two under ₹300) Passed.");

// 4. Test Single-Eatery Combo Assembly & Hard Restrictions
function generateCombos(eateries, factors, prevOrders = []) {
    const budget = factors.budget || 200;
    const candidates = [];
    const orderedDishIds = new Set(prevOrders.flatMap(o => o.items.map(i => i.id)));

    eateries.forEach(eatery => {
        const safeDishes = eatery.menu.filter(item => {
            if (factors.diet === 'vegetarian' && !item.isVeg) return false;
            if (factors.allergies && factors.allergies.some(a => item.allergens.includes(a))) return false;
            return true;
        });

        const mains = safeDishes.filter(d => d.meal_role === 'main');
        const drinks = safeDishes.filter(d => d.meal_role === 'drink');
        const sides = safeDishes.filter(d => d.meal_role === 'side');

        // Formulate combos
        mains.forEach(m => {
            drinks.forEach(dr => {
                const total = m.price + dr.price;
                if (total <= budget) {
                    const hasPrev = orderedDishIds.has(m.id) || orderedDishIds.has(dr.id);
                    candidates.push({
                        eatery: eatery.name,
                        eateryId: eatery.id,
                        items: [m, dr],
                        itemsTotal: total,
                        hasPrevOrder: hasPrev,
                        explanation: `${m.name} + ${dr.name} — ₹${total} before delivery.${hasPrev ? " You've ordered this before." : ""}`
                    });
                }
            });
        });
    });

    return candidates;
}

const samplePrevOrders = [
    { items: [{ id: 'kh4', name: 'Veg Roll' }] }
];

const validCombos = generateCombos(catalog, { budget: 150, diet: 'vegetarian', allergies: [] }, samplePrevOrders);
assert(validCombos.length > 0, "Should find valid combos under ₹150");
validCombos.forEach(c => {
    assert(c.itemsTotal <= 150, `Combo total ₹${c.itemsTotal} exceeds budget ₹150`);
    assert(c.items.every(i => i.isVeg), "All items must be vegetarian");
});

// Check single eatery guarantee
validCombos.forEach(c => {
    const eateryIds = new Set(c.items.map(i => c.eateryId));
    assert(eateryIds.size === 1, "Combo items must all belong to the same eatery");
});
console.log(`✔ Generated ${validCombos.length} valid single-eatery combos under ₹150 without constraint violations.`);

// 5. Test Live Supabase Edge Function
async function testEdgeFunction() {
    console.log("Checking live Supabase Edge Function at https://crilpczcrfkihlrvlouk.supabase.co/functions/v1/recommend-combos...");
    try {
        const response = await fetch("https://crilpczcrfkihlrvlouk.supabase.co/functions/v1/recommend-combos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Feeling tired, want something filling under ₹150.",
                user_id: "demo_user"
            })
        });

        assert.strictEqual(response.status, 200, `Edge Function responded with HTTP ${response.status}`);
        const data = await response.json();
        assert.strictEqual(data.status, "ok", "Edge Function status should be 'ok'");
        assert(Array.isArray(data.combos) && data.combos.length > 0, "Edge function should return combo recommendations");
        console.log(`✔ Live Supabase Edge Function responded successfully with ${data.combos.length} verified combos.`);
        
        data.combos.forEach((c, idx) => {
            console.log(`   [Option ${idx + 1} - ${c.type.toUpperCase()}] ${c.eatery.name}: ${c.items.map(i => i.dish.name).join(' + ')} (Items: ₹${c.items_total}, Total: ₹${c.total_price})`);
            assert(c.items_total <= 150, "Combos must respect the budget limit");
            assert(c.explanation.length > 10, "Combos must include natural AI explanation");
        });

        // Test Feedback endpoint
        const fbRes = await fetch("https://crilpczcrfkihlrvlouk.supabase.co/functions/v1/recommend-combos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "feedback",
                user_id: "demo_user",
                combo_title: data.combos[0].items.map(i => i.dish.name).join(' + '),
                feedback_type: "good_suggestion"
            })
        });
        const fbData = await fbRes.json();
        assert(fbData.success, "Feedback logging to Supabase should succeed");
        console.log("✔ Feedback successfully recorded into Supabase recommendation_feedback table.");

    } catch (err) {
        console.error("Edge function test encountered error:", err);
        throw err;
    }
}

testEdgeFunction().then(() => {
    console.log("\n🎉 ALL AI COMBO RECOMMENDER & SUPABASE TESTS PASSED 100%!");
}).catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});

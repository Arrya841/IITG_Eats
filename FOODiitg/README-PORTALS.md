# IITG Eats — Multi-Portal Demo (October 2026)

This project extends the **existing vanilla HTML/CSS/JavaScript IITG Eats website**. No Next.js migration is required. The original student experience remains in `index.html`.

## Open the four interfaces

From the `FOODiitg` directory, on Windows open a terminal and run:

```powershell
py -m http.server 8080
```

Alternatively, double-click `START-LOCAL.bat` on Windows. While the server is running, visit:

| Audience | Address |
| --- | --- |
| Students | http://localhost:8080/index.html |
| Admin | http://localhost:8080/admin.html |
| Canteen | http://localhost:8080/vendor.html |
| Delivery partner | http://localhost:8080/rider.html |

Open them **in separate tabs of the same browser** at **the same origin** (`localhost:8080` for all). Avoid changing between `localhost`, `127.0.0.1`, or different ports; their browser storage is separate.

## What is working in this prototype

**Student:** original food discovery, menu, cart, checkout, demo order submission, campus hostel selection, order history, and status updates controlled by staff previews. The cart now enforces one canteen per checkout, uses demo menu overrides, and prevents ordering unavailable items.

**Admin:** overview statistics, full order list and search/status filters, detailed order history, rider assignment, cancellation, preview canteen open/paused controls, menu management links, sample rider lists, activity stream.

**Canteen:** select a demo canteen, accept/reject orders, start preparation, mark food ready, pause a canteen, toggle dishes available/sold out, and edit demo item prices.

**Rider:** select a sample delivery partner, view only the assigned tasks for that partner, confirm pickup, start delivery, mark completed, and view delivery history.

Each portal is deliberately designed with a responsive mobile-friendly interface. The main operational script is `portal.js`; all three staff HTML pages use the **same `portal.css` and `portal-data.js`** so you don't maintain three separate backends.

## Test the entire flow

1. Open `admin.html`. You will see four **clearly labeled sample orders**. They are stored separately from real student browser order history.
2. In `vendor.html`, choose **Lohit Canteen**. Accept the new sample order `DEMO-1042`, click **Start preparing**, then **Mark food ready**.
3. In `admin.html`, select **Orders**, find `DEMO-1042`, select **Aarav (demo rider)**, and click **Assign rider**.
4. In `rider.html`, choose **Aarav (demo rider)**. Click **Confirm pickup**, **Start delivery**, then **Mark delivered**.
5. Check the order timeline from the admin dashboard. Your progress is saved between reloads.
6. Optionally, open the student website, add food from one canteen, select a hostel and click **Place DEMO Order**. Then process it using the staff portals. **This does not take any money.**
7. In the canteen portal, choose **Menu & availability**, pause an item or edit its price. Refresh that dish in the student website to see the change.

## Source files added or updated

| File | Purpose |
| --- | --- |
| `admin.html` | Admin portal |
| `vendor.html` | Canteen portal |
| `rider.html` | Delivery partner portal |
| `portal.css` | All staff UI styling, desktop + mobile |
| `catalog.js` | Catalog extracted from existing student website; six sample canteens |
| `portal-data.js` | Local demo store, normalized orders, validated workflow transitions |
| `portal.js` | Shared staff dashboard rendering and event handlers |
| `script.js` | Student order integration, customer tracking, menu availability controls |
| `index.html` | Hostel selector, demo checkout notice, staff links |
| `styles.css` | Prototype warning banner |
| `START-LOCAL.bat` | Local Windows launcher |
| `tests/portal-smoke.test.cjs` | Node smoke tests |

## VERY IMPORTANT: This is not production-ready

- The **staff portals do not authenticate or authorize users**. Anyone who knows their URLs can open them. Role selection is a **demo switcher**. Do not deploy publicly with real customer/vendor data.
- Orders and settings live in **browser localStorage**, not Supabase/PostgreSQL. Sync works only between tabs on the **same origin and browser profile**, not on different phones, computers or vendor devices.
- The existing student website has Supabase authentication, but **that authentication is not connected to staff permissions or order storage**.
- No payment processing, payment verification, refunds, real vendor settlements, GPS tracking, dispatch optimization, messaging or kitchen printers are implemented.
- All listed eateries, menus, ratings and prices come from the original prototype. Do not represent them as verified, current or partnered. Obtain consent from real canteen operators and verify prices before launch.
- Existing sample meal values in admin dashboards are **not collected revenue**.
- The system deliberately does not auto-advance orders. Canteen and rider staff must press the appropriate status buttons.
- Don't collect real customer personal information or accept commercial orders in this version.

## Production integration architecture (next stage)

Use one hosted app plus a database. Recommended entities: `profiles`, `staff_memberships` (`user_id`, `role`, `vendor_id`), `vendors`, `menu_items`, `orders`, `order_items`, `order_events`, `delivery_assignments`, `payments`, `refunds`, `vendor_settlements`.

1. Configure Supabase Auth for **verified staff accounts**. Only administrators can grant vendor/rider roles. Map each vendor employee to their vendor, and each rider to their own identity.
2. Create PostgreSQL tables plus **Row Level Security** and protected backend APIs. Customers must see their own orders only; canteens must see their own vendor orders; riders only their assignments; admins see data needed for operation. Never rely only on hidden UI elements or user-supplied role IDs.
3. Move status changes from `portal-data.js` to **server-authorized transactional functions** with explicit allowed transitions and audit logs; enforce unique order IDs and idempotency keys.
4. Move prices, stock/availability and vendor onboarding into the authoritative database. Validate order prices and capacity server-side.
5. Integrate a payment gateway's test mode. For actual production, verify **signed server-side payment callbacks**, handle failed and duplicate events, refunds, and vendor settlements correctly. Don't call an order “paid” because the browser reports success.
6. Add a realtime subscription or an authenticated polling layer so separate devices see status changes.
7. Add notifications, monitoring, backup/restore, support processes and appropriate privacy/legal disclosures; obtain IITG operating/delivery permissions and vendor agreements.
8. Remove demo banners, sample vendors/orders, and unrestricted `/admin`, `/vendor`, `/rider` access **only after** full end-to-end security and payment testing.

For this version, no Supabase backend changes have been made and no secrets have been added. Please don't put a Supabase service-role key in browser JavaScript.

## Smoke tests

If Node.js is installed:

```powershell
node tests/portal-smoke.test.cjs
```

The test checks seeded sample separation, ordering, workflow transitions, rider assignments and menu toggles without needing a server. Visual QA and an actual multi-device test should still be performed before any launch.

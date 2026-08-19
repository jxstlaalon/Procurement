# Procurement Admin Assistant — Folder Structure

## Overview

A hybrid web application serving two user types from a single codebase:

- **Public** (no login): Department staff browse the Items catalog and Place Orders
- **Admin** (Supabase Auth): Procurement staff manage inventory, process orders, and export data

**Tech Stack:** React 19 + Vite 8 + Supabase (PostgreSQL + Storage + Auth)

---

## Hybrid Architecture

```
┌─────────────────────────────────────────────────────┐
│                      App.jsx                         │
│  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │  Auth State   │  │  Conditional Navigation      │  │
│  │  (Supabase)   │  │                              │  │
│  │               │  │  Public:  Items, Place Order │  │
│  │  user = null  │  │  Admin:   All 7 tabs         │  │
│  │  user = auth  │  │                              │  │
│  └──────────────┘  └──────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Shared Cart State (localStorage persisted)     │  │
│  │  Items tab ←→ Place Order tab (shared cart)     │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

- Triple-clicking the USC logo opens the Admin login modal
- Auth state managed by Supabase SDK (persisted in browser localStorage automatically)
- Cart state persisted in `localStorage` across both Items and Place Order tabs
- Cart clears on successful order submission

---

## Root Files

```
Procurement/
├── .env                    # Supabase URL + anon key (VITE_SUPABASE_*)
├── .gitignore              # Git ignore rules
├── index.html              # Vite HTML entry point
├── package.json            # Dependencies + scripts
├── vite.config.js          # Vite build config
├── folder-structure.md     # This file
├── README.md               # Project readme
├── stock_usage_table.sql   # SQL to create stock_usage table
└── seed_inventory.sql      # SQL to seed 591 inventory items
```

---

## public/ — Static Assets

Served as-is at the root URL. Not processed by Vite bundler.

```
public/
├── usc.png                 # USC logo (header + triple-click login target)
├── usclogo.png             # USC footer logo
├── favicon.svg             # Browser tab icon
└── icons.svg               # Icon sprite sheet
```

---

## src/ — Source Code

### src/App.jsx — Root Component + Router

The single orchestrator. Handles:

- **Auth state** — `supabase.auth.onAuthStateChange()` listener, `user` state
- **View routing** — `view` state switches between tabs (no React Router)
- **Conditional nav** — `PUBLIC_NAV` vs `ADMIN_NAV` based on `user`
- **Cart state** — Lifted here, shared between Items and Place Order, persisted to `localStorage`
- **Real-time subscriptions** — Supabase `postgres_changes` for live inventory, orders, and units
- **Settings seed** — One-time function list initialization
- **Login modal** — Triple-click logo → password input → `supabase.auth.signInWithPassword()`
- **Toast notifications** — Global success/error messages

### src/main.jsx — Entry Point

Mounts `<App />` into the DOM. Standard React 19 createRoot.

### src/costCentres.js — USC Cost Centre Data

Full list of 126 USC department cost centres (code + name). Used in the Place Order form's Department/Account autocomplete dropdown.

### src/index.css — Global Styles

Minimal global CSS reset.

---

## src/shared/ — Reusable UI Components + Config

Cross-cutting concerns used by every module. No feature-specific logic.

```
src/shared/
├── theme.js                # Color tokens + font families
├── constants.js            # App-wide enums (categories, statuses)
├── helpers.js              # Utility functions (formatMoney, todayISO, formatUnit, formatDate*)
├── Modal.jsx               # Base modal (backdrop + card + close button)
├── ConfirmModal.jsx        # Confirmation dialog (Are you sure?)
├── DateField.jsx           # Styled date input
├── ImageCropModal.jsx      # Camera/upload choice → crop → return JPEG
└── ItemImageViewer.jsx     # Click-to-view large image + name + description
```

### theme.js — Design Tokens

```js
C.primary    = '#5eb76a'   // Green (buttons, active states)
C.bg         = '#FAF8F3'   // Warm off-white background
C.ink        = '#2B2319'   // Dark brown text
C.card       = '#FFFFFF'   // Card backgrounds
C.line       = '#E8E2D5'   // Borders
FONT_DISPLAY = 'Fraunces'  // Headings (serif)
FONT_BODY    = 'Instrument Sans'  // Body text (sans-serif)
```

### constants.js — Enums

- `ITEM_CATEGORIES` — Stationery, Office Supplies, Cleaning, Maintenance, Electronics, Furniture, Other
- `ORDER_STATUSES` — Pending, Ready, Picked Up, Cancelled
- `STOCK_ADJUSTMENT_REASONS` — Restock, Damaged, Correction, Other
- `UNASSIGNED_CATEGORY` — Fallback for items without a category

### helpers.js — Utility Functions

- `formatMoney(n)` — Format as `$1,234.56`
- `todayISO()` — Today's date as `YYYY-MM-DD`
- `formatUnit(qty, label)` — Smart pluralization (`1 box` / `2 boxes`)
- `formatDateShort(iso)` — `Mon, Aug 16, 2026`
- `formatDateLong(iso)` — `Aug 16th 2026`
- `formatDateVoucher(iso)` — `08/16/26`
- `to12h(t)` — `14:30` → `2:30 PM`
- `formatOrdinal(n)` — `1` → `1st`, `2` → `2nd`
- `usePreventWheel()` — Hook to prevent scroll-on-number-input

### ImageCropModal.jsx — Image Pipeline

Two-step modal:
1. **Choose** — "Take Photo" (device camera) or "Upload Image" (file picker with HEIC support)
2. **Crop** — `react-easy-crop` with zoom slider → returns cropped JPEG `File`

HEIC files auto-converted via `heic2any`. Output compressed to <50KB.

---

## src/lib/ — Data Layer (Supabase)

All Supabase interaction is isolated here. Components never call Supabase directly.

```
src/lib/
├── supabase.js             # Client initialization
├── db.js                   # All database queries (CRUD + RPCs)
├── storage.js              # Image upload/delete (Supabase Storage)
└── imageUtils.js           # Image compression + HEIC conversion + crop
```

### supabase.js — Client Init

Creates and exports the Supabase client using env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### db.js — Database Queries

| Function | Table | Purpose |
|----------|-------|---------|
| `getInventory()` | `inventory` | Fetch all items |
| `addItem()` | `inventory` | Insert new item |
| `updateItem()` | `inventory` | Update item fields |
| `deleteItem()` | `inventory` | Delete item |
| `adjustStock()` | `inventory` | Set stock count directly |
| `decrementStock()` | RPC `decrement_stock` | Atomic stock decrement on order pickup |
| `getOrders()` | `orders` | Fetch all orders |
| `createOrder()` | `orders` | Insert new order |
| `updateOrder()` | `orders` | Update order status |
| `deleteOrder()` | `orders` | Delete order |
| `getNextInvoiceNumber()` | RPC `increment_invoice_counter` | Atomic invoice number generation |
| `getUnits()` | `units` | Fetch all units |
| `addUnit()` | `units` | Insert new unit |
| `updateUnit()` | `units` | Update unit |
| `deleteUnitDb()` | `units` | Delete unit |
| `getConfig()` | `settings` | Fetch app config (categories) |
| `updateConfig()` | `settings` | Upsert app config |
| `logStockUsage()` | `stock_usage` | Log stock movement (increase/decrease) |
| `getStockUsage()` | `stock_usage` | Fetch stock movements by date range + direction |

All fields use **snake_case** (matching Supabase column names).

### storage.js — Image Storage

- `uploadInventoryImage(file, itemId)` — HEIC convert → compress → upload to `inventory-images` bucket → return public URL
- `deleteInventoryImage(itemId)` — Remove all files matching the item ID prefix

### imageUtils.js — Image Processing

- `compressImageToSizeLimit(file, maxBytes)` — Canvas resize to 800px max + iterative JPEG quality reduction until under 50KB
- `getCroppedImg(imageSrc, croppedArea)` — Renders cropped region from `react-easy-crop` coordinates to JPEG blob
- `convertHeicToJpeg(file)` — Detects HEIC/HEIF by MIME type or extension, converts via `heic2any`

---

## src/items/ — Public Catalog

```
src/items/
└── ItemsPage.jsx           # Browse all items, add to cart
```

### ItemsPage.jsx

The default landing page (visible to everyone). Features:
- **Category folder grid** — Click a folder to see its items
- **Item cards** — Image, name, price, stock status, add-to-cart
- **Search + filter** — By name and category
- **Pagination** — 18 items per page
- **Sticky cart sidebar** — Same `OrderCart` component used in Place Order
- **Image interactions** — Hover shows description tooltip, click opens `ItemImageViewer`

This is the public-facing catalog. No auth required.

---

## src/order/ — Order Creation

```
src/order/
├── OrderPage.jsx           # Full order flow (contact → catalog → cart → submit)
├── CatalogItem.jsx         # Single item card (image, price, add-to-cart)
└── OrderCart.jsx           # Cart sidebar (items, quantities, total)
```

### OrderPage.jsx

The complete order workflow:
1. **Start Order** landing page (centered CTA)
2. **Contact form** — Email, name, phone, department (autocomplete)
3. **Catalog browsing** — Category folders → item grid with folder/all-items toggle
4. **Cart sidebar** — Shared state with Items tab via `localStorage`
5. **Pickup details** — Date + time
6. **Submit** — Creates order in Supabase, clears cart + localStorage

Accepts `cart`, `addToCart`, `updateCartQty`, `removeFromCart`, `clearCart`, `setCart` as props from `App.jsx`.

### CatalogItem.jsx

Reusable item card used in both ItemsPage and OrderPage:
- Image with hover tooltip (description)
- Click image → `ItemImageViewer` modal
- Quantity selector + "Add to Cart" button
- Stock status badge (In Stock / Low / Out of Stock)

### OrderCart.jsx

Shared cart sidebar component:
- Thumbnail image per item (with hover tooltip + click modal)
- Quantity +/- controls
- Remove item button
- Order total
- "Clear" button

---

## src/orders/ — Staff Order Management

```
src/orders/
└── OrdersPage.jsx          # View/update/process orders
```

### OrdersPage.jsx

Staff-facing order management:
- Lists all orders with status badges
- Filter by status (Pending, Ready, Picked Up, Cancelled)
- Update order status (Pending → Ready → Picked Up)
- Invoice number required before marking as Ready
- Print Voucher (PDF) for ready orders
- Email notifications via Gmail compose URL
- Delete orders with confirmation
- Edit order modal with all fields
- Real-time updates via Supabase subscriptions
- Order workflow: `pending → ready → picked_up`
- Stock decremented on `picked_up` (not on `ready`)

---

## src/inventory/ — Staff Inventory Management

```
src/inventory/
├── InventoryPage.jsx       # Category folder view + item table + picture view
├── ItemForm.jsx            # Add/edit item form with image crop
├── ItemModal.jsx           # Modal wrapper for ItemForm
└── StockAdjustModal.jsx    # Manual stock adjustment with reason
```

### InventoryPage.jsx

Admin-only inventory management with 3 view modes:
- **Folder View** — Browse items by category
- **All Items View** — Table with code, name, category, stock, unit, price, actions
- **Picture View** — Cards showing image, name, code, category, description, stock, cost
- **Low Stock Alert** — Collapsible dropdown showing items below threshold (20 per page)
- **Settings dropdown** — Category Manager + Unit Manager
- **Pagination** — 20 items per page (table views), 18 per page (picture view)
- Category filter in picture view for easy sorting

### ItemForm.jsx

Full item creation/editing form:
- Name + description fields
- Image upload via `ImageCropModal` (camera/upload → crop → compress)
- Category, unit (dynamic from database), price, stock count, low stock threshold
- Auto-compresses images to <50KB before upload

### StockAdjustModal.jsx

Manual stock adjustment (when new goods arrive from supplier):
- Increase/Decrease toggle
- Quantity input
- Reason dropdown (Restock, Damaged, Correction, Other)
- Updates `stock_count` directly in Supabase
- Logs to `stock_usage` table with `direction: 'increase'` or `direction: 'decrease'`

---

## src/pastorders/ — Past Order History

```
src/pastorders/
└── PastOrdersPage.jsx      # View picked up and cancelled orders
```

### PastOrdersPage.jsx

Read-only view of completed/cancelled orders:
- Filter by status (Picked Up, Cancelled)
- Search by invoice number, customer name, or account
- Click to view order detail modal
- Print Voucher (PDF) for picked up orders
- Real-time updates via Supabase subscriptions

---

## src/export/ — Staff Excel Export

```
src/export/
└── ExportPage.jsx          # Excel file generation (3 modes)
```

### ExportPage.jsx

Three export modes:
1. **Procurement Report** — Completed orders to Excel with accounting columns
2. **Purchased Items Spreadsheet** — Stock decreases per item per month (with live preview table)
3. **Restocking Spreadsheet** — Stock increases per item per month (with live preview table)

Features:
- Date range picker with presets (This Month, Last Month, Last 7 Days, This Year)
- Live preview table for spreadsheet modes
- Dynamic month columns based on date range
- All inventory items shown (0s for no activity)
- REORDER column highlighted (placeholder for future)
- Uses `xlsx` library (SheetJS)

---

## src/print/ — PDF Generation

```
src/print/
├── generatePDF.js          # jsPDF invoice generation (legacy)
└── generateVoucherPDF.js   # jsPDF voucher generation
```

### generatePDF.js

Generates a formatted PDF invoice for a transaction (legacy, not currently used).

### generateVoucherPDF.js

Generates a pickup voucher PDF:
- USC logo (90x90pt) from `public/usc.png`
- Order details (invoice number, date, time, department, contact)
- Itemized list with quantities and costs
- Signature lines with centered labels
- A4 portrait format

---

## Data Flow Summary

```
User Action → Component → lib/db.js → Supabase → Real-time → App.jsx → Component re-renders
                ↑
         lib/storage.js → Supabase Storage (images)
         lib/imageUtils.js → Canvas compression
```

- **Reads** go through `lib/db.js` functions
- **Writes** go through `lib/db.js` functions
- **Images** go through `lib/storage.js` → `lib/imageUtils.js` → Supabase Storage
- **Real-time** via Supabase `postgres_changes` subscriptions in `App.jsx`
- **Auth** via Supabase SDK (`signInWithPassword`, `signOut`, `onAuthStateChange`)
- **Cart** persisted in `localStorage`, shared between Items and Place Order tabs
- **Stock usage** logged to `stock_usage` table on every decrease/increase

---

## Supabase Schema

| Table | Purpose |
|-------|---------|
| `inventory` | Item catalog (name, description, category, price, stock, image, code, unit) |
| `orders` | Customer orders (contact, items, status, pickup details, invoice number) |
| `settings` | App config (categories as JSONB) |
| `counters` | Auto-increment counters (invoice numbers) |
| `units` | Dynamic unit labels (with sort order) |
| `stock_usage` | Stock movement log (item, quantity, direction, reason, month) |

| RPC | Purpose |
|-----|---------|
| `decrement_stock` | Atomic stock decrement (prevents overselling) |
| `increment_invoice_counter` | Atomic invoice number generation |

| Storage Bucket | Purpose |
|----------------|---------|
| `inventory-images` | Item photos (public, 5MB limit, image/*) |

---

## Key Features

- **Hybrid auth** — Public catalog + admin management from one codebase
- **Real-time updates** — Orders, inventory, and units update live via Supabase subscriptions
- **Smart unit pluralization** — `1 box` / `2 boxes` via `formatUnit()` helper
- **Low stock alerts** — Collapsible banner with paginated table
- **Image handling** — HEIC conversion, auto-compression to <50KB, crop before upload
- **Order workflow** — `pending → ready → picked_up` with stock decrement on pickup
- **Invoice numbers** — Auto-generated via Supabase RPC
- **Voucher PDF** — Generated with jsPDF, USC branding
- **Stock usage tracking** — All increases/decreases logged for spreadsheet exports
- **3 view modes** — Folder, Table, Picture views for inventory
- **18/20 per page pagination** — Catalog items (18), inventory items (20)

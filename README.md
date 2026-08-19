# Procurement Admin Assistant

A hybrid web application for the **USC Procurement Department** that serves two user types from a single codebase:

- **Public** (no login): Department staff browse the Items catalog and Place Orders
- **Admin** (Supabase Auth): Procurement staff manage inventory, process orders, and export data

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 8 |
| Backend | Supabase (PostgreSQL + Storage + Auth) |
| PDF | jsPDF |
| Excel | xlsx (SheetJS) |
| Images | heic2any + react-easy-crop |
| Icons | lucide-react |

---

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run development server
npm run dev
```

### Environment Variables (.env)

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Features

### Public (No Login)

- **Items Catalog** — Browse all inventory items by category
- **Item Details** — View images, descriptions, and stock status
- **Place Orders** — Select items, quantities, pickup date/time
- **Cart System** — Shared cart between Items and Place Order tabs
- **Search & Filter** — Find items by name or category

### Admin (Login Required)

- **Order Management** — View, update, and process orders
- **Inventory Management** — Add, edit, delete items with images
- **Category Management** — Organize items into categories
- **Unit Management** — Dynamic unit labels (box, each, ream, etc.)
- **Stock Adjustments** — Track restocks, damages, corrections
- **Low Stock Alerts** — Visual alerts for items below threshold
- **Excel Export** — Procurement reports and stock spreadsheets
- **Voucher PDF** — Generate pickup vouchers for orders
- **Real-time Updates** — Orders and inventory update live

### Order Workflow

```
Pending → Ready → Picked Up
   ↓        ↓         ↓
Cancel   Cancel    (stock decremented)
```

- Stock is decremented when order is marked as **Picked Up**
- Invoice number required before marking as Ready
- Voucher PDF generated for pickup

---

## Project Structure

```
src/
├── App.jsx                 # Root component (auth, routing, cart, real-time)
├── main.jsx                # Entry point
├── costCentres.js          # 126 USC department cost centres
├── index.css               # Global styles
│
├── shared/                 # Reusable components + config
│   ├── theme.js            # Color tokens + fonts
│   ├── constants.js        # App enums
│   ├── helpers.js          # Utility functions
│   ├── Modal.jsx           # Base modal
│   ├── ConfirmModal.jsx    # Confirmation dialog
│   ├── DateField.jsx       # Styled date input
│   ├── ImageCropModal.jsx  # Camera/upload → crop
│   └── ItemImageViewer.jsx # Click-to-view image
│
├── lib/                    # Data layer (Supabase)
│   ├── supabase.js         # Client init
│   ├── db.js               # Database queries
│   ├── storage.js          # Image upload/delete
│   └── imageUtils.js       # Image compression
│
├── items/                  # Public catalog
│   └── ItemsPage.jsx       # Browse items, add to cart
│
├── order/                  # Order creation
│   ├── OrderPage.jsx       # Full order flow
│   ├── CatalogItem.jsx     # Item card
│   └── OrderCart.jsx       # Cart sidebar
│
├── orders/                 # Staff order management
│   └── OrdersPage.jsx      # Process orders
│
├── pastorders/             # Past order history
│   └── PastOrdersPage.jsx  # View completed orders
│
├── inventory/              # Staff inventory management
│   ├── InventoryPage.jsx   # 3 view modes + settings
│   ├── ItemForm.jsx        # Add/edit form
│   ├── ItemModal.jsx       # Modal wrapper
│   └── StockAdjustModal.jsx# Stock adjustment
│
├── export/                 # Excel export
│   └── ExportPage.jsx      # 3 export modes
│
└── print/                  # PDF generation
    ├── generatePDF.js      # Invoice PDF
    └── generateVoucherPDF.js # Voucher PDF
```

---

## Supabase Setup

### Required Tables

| Table | Purpose |
|-------|---------|
| `inventory` | Item catalog (591 items seeded) |
| `orders` | Customer orders |
| `settings` | App config (categories JSONB) |
| `counters` | Auto-increment counters |
| `units` | Dynamic unit labels |
| `stock_usage` | Stock movement log |

### Required RPCs

- `decrement_stock` — Atomic stock decrement
- `increment_invoice_counter` — Atomic invoice number generation

### Required Storage Bucket

- `inventory-images` — Public, 5MB limit, image/* MIME types

### SQL Migrations

Run these in the Supabase SQL Editor:

1. `seed_inventory.sql` — Seeds 591 inventory items
2. `stock_usage_table.sql` — Creates stock_usage table

### Enable RLS + Realtime

Run `enable_rls.sql` to:
- Enable RLS on all tables
- Add Realtime to `units` and `inventory` tables

---

## Key Behaviors

### Authentication

- Triple-click USC logo to open admin login
- Supabase Auth with email/password
- Auth state persisted in browser localStorage

### Cart System

- Shared between Items and Place Order tabs
- Persisted in `localStorage`
- Cleared on successful order submission
- Supports quantity updates and item removal

### Real-time Updates

- Supabase `postgres_changes` subscriptions
- Orders and inventory update live across tabs
- No polling required

### Unit Pluralization

```javascript
formatUnit(1, 'box')  // → "1 box"
formatUnit(2, 'box')  // → "2 boxes"
formatUnit(1, 'can')  // → "1 can"
formatUnit(5, 'can')  // → "5 cans"
```

### Image Handling

- HEIC files auto-converted to JPEG
- Images compressed to <50KB before upload
- Crop before upload via react-easy-crop
- Stored in Supabase Storage (public bucket)

---

## Export Modes

### 1. Procurement Report

Exports completed orders to Excel with accounting columns:
- Date, Invoice Number, Account Code (888110), Fund (10), Cost Centre, Description, Qty, Amount

### 2. Purchased Items Spreadsheet

Stock decreases per item per month:
- Code, Name, Item Name, monthly columns, Total
- Live preview table before export

### 3. Restocking Spreadsheet

Stock increases per item per month:
- Code, Name, Item Name, monthly columns, Total
- Live preview table before export

---

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## License

USC Procurement Department — Internal Use Only

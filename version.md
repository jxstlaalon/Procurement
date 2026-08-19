# Version History

## Version 1.0 — Initial Launch

**Release Date:** August 31, 2026

---

### Public Features (No Login Required)

- **Items Catalog** — Browse all inventory items with category folder navigation
- **Category Folder View** — Items grouped into clickable folder cards with item counts
- **Unassigned Category** — Items without a category auto-grouped under "Unassigned"
- **Item Search** — Real-time text search by item name
- **Category Filtering** — Dropdown filter to show items from a specific category
- **Item Images** — Full-width product images with cover-fit display
- **Image Hover Tooltip** — Hover over item image to see description overlay
- **Image Click-to-View** — Click item image to open a large modal with image, name, and description
- **Stock Status Badges** — Color-coded badges: In Stock (green), Low Stock (gold), Out of Stock (red)
- **Out-of-Stock Dimming** — Cards for out-of-stock items visually dimmed
- **Quantity Selector** — Per-item quantity input with minus/plus controls
- **Add to Cart** — Add items to shopping cart from catalog
- **Shared Shopping Cart** — Cart persisted in localStorage, shared between Items and Place Order tabs
- **Cart Thumbnails** — Small product thumbnails in cart with hover tooltip and click-to-view
- **Cart Quantity Controls** — Adjust quantities directly in cart
- **Cart Remove Items** — Remove individual items from cart
- **Cart Clear** — Clear all items from cart
- **Cart Total** — Running order total displayed in cart
- **Pagination** — 18 items per page in catalog views
- **Place Order — Start Screen** — Landing page with "Start Order" call-to-action
- **Place Order — Contact Form** — Email, telephone, first name, last name fields
- **Place Order — Department Autocomplete** — Typeahead search across 126 USC cost centres with keyboard navigation
- **Place Order — Pickup Details** — Date and time selection with preparation notice
- **Place Order — Order Submission** — Creates order in Supabase with auto-generated invoice number
- **Place Order — Success Modal** — Confirmation modal after successful submission
- **Place Order — Cart Clear on Submit** — Cart and localStorage cleared after order is placed
- **Responsive Design** — Three breakpoints: desktop, tablet, mobile

---

### Admin Features (Login Required)

- **Admin Login** — Triple-click USC logo to reveal hidden login modal
- **Supabase Auth** — Email/password authentication with session persistence
- **Admin Badge** — Shield icon + "Admin" label in header when logged in
- **Logout Button** — Signs out and resets to public Items view
- **Conditional Navigation** — Public sees 2 tabs (Items, Place Order); Admin sees all 7 tabs

#### Inventory Management

- **Inventory Management** — Full CRUD for inventory items (add, edit, delete)
- **3 View Modes** — Folder view, Table view, Picture view
- **Inventory Category Folders** — Browse inventory by category with item counts
- **Inventory Items Table** — Sortable columns (Code, Name, Category, Stock, Unit, Price) within each category
- **Picture View** — Card-based view showing image, name, code, category, description, stock, cost
- **Picture View Category Filter** — Dropdown to filter picture view by category
- **Item Form — All Fields** — Name, description, category, unit (dynamic), price, stock count, low stock threshold
- **Item Image Upload** — Camera capture or file upload with crop modal
- **Image Crop Tool** — Interactive crop with 1:1 aspect ratio and zoom slider (1x–3x)
- **HEIC/HEIF Support** — Automatic conversion of iPhone photos to JPEG
- **Image Auto-Compression** — Compresses all uploaded images to under 50KB
- **Image Cleanup on Delete** — Automatically removes images from Supabase Storage when item is deleted
- **Description Field** — Optional item description shown in catalog tooltips and image viewer
- **Stock Adjustment Modal** — Manual stock increase/decrease with quantity and reason tracking
- **Stock Adjustment Reasons** — Restock, Damaged, Correction, Other
- **Stock Usage Logging** — Every stock change logged to `stock_usage` table with direction (increase/decrease)
- **Low Stock Alert Banner** — Collapsible banner showing count of items below threshold
- **Low Stock Alert Table** — Expandable table listing all low stock items with details
- **Pagination** — 20 items per page in table views, 18 per page in picture view

#### Category & Unit Management

- **Category Manager** — Add, edit, delete, reorder categories (stored in `settings` table as JSONB)
- **Unit Manager** — Add, edit, delete, reorder units (stored in separate `units` table)
- **Dynamic Units** — Units loaded from database, not hardcoded constants
- **Settings Dropdown** — Access Category Manager and Unit Manager from inventory page

#### Order Management

- **Order Management** — Browse and process all customer orders
- **Order Status Workflow** — 3-state pipeline: Pending → Ready → Picked Up (with Cancel)
- **Orders Page Filter** — Shows only `pending` and `ready` orders
- **Past Orders Page** — Shows only `picked_up` and `cancelled` orders
- **Invoice Number** — Required before marking order as Ready, auto-generated via Supabase RPC
- **Order Mark Ready** — Marks order ready with optional email notification via Gmail compose URL
- **Order Mark Picked Up** — Marks order as picked up, decrements stock, logs to stock_usage
- **Order Cancel** — Cancels order (terminal state) with confirmation modal
- **Order Delete** — Deletes order permanently with confirmation modal
- **Order Edit Modal** — Edit all order fields (contact, items, pickup details)
- **Order Detail Modal** — Full order view with items, contact info, pickup details
- **Print Voucher** — Generates PDF voucher for ready/picked up orders
- **Email Notifications** — Gmail compose URL with pre-filled recipient, subject, body
- **Email Template (Ready)** — Items listed on separate lines with total, date, time
- **Email Template (General)** — Regarding procurement order scheduled for pickup

#### Export

- **Export Page** — 3 export modes with toggleable preview tables
- **Procurement Report** — Completed orders to Excel with accounting columns
- **Purchased Items Spreadsheet** — Stock decreases per item per month with live preview
- **Restocking Spreadsheet** — Stock increases per item per month with live preview
- **Export Date Range** — Custom start/end date with preset buttons (This Month, Last Month, Last 7 Days, This Year)
- **Export Preview** — Shows order count, line item count, and total before exporting
- **Spreadsheet Preview Toggle** — Collapsible preview table showing item activity before export
- **Export Column Mapping** — Date, Invoice Number, Acct Code (888110), Account Name, Fund (10), Fnct (cost centre), Description, Quantity, Amount (TTD)
- **REORDER Column** — Placeholder column highlighted in yellow for future use

---

### Technical Features

- **Supabase Real-Time** — Live data updates via Postgres changes subscriptions on orders, inventory, and units tables
- **Supabase Auth Session Persistence** — Login sessions persist across browser restarts via Supabase SDK localStorage
- **Cart localStorage Persistence** — Shopping cart survives page refreshes and browser restarts
- **Atomic Stock Decrement** — Server-side RPC `decrement_stock` prevents overselling race conditions
- **Atomic Invoice Number Generation** — Server-side RPC `increment_invoice_counter` ensures unique sequential invoice numbers
- **Stock Usage Tracking** — All stock movements logged with direction, reason, and month for spreadsheet exports
- **Image Processing Pipeline** — HEIC conversion → Canvas resize (800px max) → Iterative JPEG quality reduction → Upload
- **Supabase Storage** — Item images stored in public `inventory-images` bucket with cache-busting URLs
- **Unit Pluralization** — Smart plural display (`1 box` / `2 boxes`) via `formatUnit()` helper
- **Date Formatting** — Multiple formats: `Mon, Aug 16, 2026` (short), `Aug 16th 2026` (long), `08/16/26` (voucher)
- **12-Hour Time** — All times displayed in 12-hour format (`2:30 PM`)
- **Order Number Display** — Hidden from UI, only invoice number shown
- **Responsive Breakpoints** — Desktop (>1024px), tablet (640–1024px), mobile (<640px)
- **Toast Notifications** — Non-intrusive success/error messages with auto-dismiss
- **Click-Outside-to-Close** — Modals and dropdowns close on outside click
- **Keyboard Navigation** — Department autocomplete supports arrow keys, Enter, and Escape
- **Cost Centre Data** — 126 USC departments with codes and display names
- **Wheel Prevention** — Number inputs prevent scroll-wheel value changes
- **No React Router** — View switching via state, no URL routing

---

### Supabase Schema

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

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| PDF Generation | jsPDF |
| Excel Export | SheetJS (xlsx) |
| Image Crop | react-easy-crop |
| HEIC Conversion | heic2any |
| Icons | Lucide React |
| Hosting | Static (Vite build) |

---

### File Count

| Category | Files |
|----------|-------|
| Source files | 27 |
| Shared components | 7 |
| Library/services | 4 |
| Feature modules | 11 |
| Config/root | 6 |
| **Total** | **55** |

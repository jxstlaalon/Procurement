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
- **Image Hover Tooltip** — Hover over item image to see name + description overlay
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
- **Place Order — Start Screen** — Landing page with "Start Order" call-to-action
- **Place Order — Contact Form** — Email, telephone, first name, last name fields
- **Place Order — Department Autocomplete** — Typeahead search across 126 USC cost centres with keyboard navigation
- **Place Order — Function Selector** — Dropdown loaded from configurable settings
- **Place Order — Pickup Details** — Date and time selection with preparation notice
- **Place Order — Order Submission** — Creates order in Supabase with auto-generated order ID
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
- **Inventory Management** — Full CRUD for inventory items (add, edit, delete)
- **Inventory Category Folders** — Browse inventory by category with item counts
- **Inventory Items Table** — Sortable columns (Name, Stock, Unit, Price) within each category
- **Item Form — All Fields** — Name, description, category, unit, price, stock count, low stock threshold
- **Item Image Upload** — Camera capture or file upload with crop modal
- **Image Crop Tool** — Interactive crop with 1:1 aspect ratio and zoom slider (1x–3x)
- **HEIC/HEIF Support** — Automatic conversion of iPhone photos to JPEG
- **Image Auto-Compression** — Compresses all uploaded images to under 50KB
- **Description Field** — Optional item description shown in catalog tooltips and image viewer
- **Stock Adjustment** — Manual stock increase/decrease with reason tracking (Restock, Damaged, Correction, Other)
- **Low Stock Alert Banner** — Highlights items at or below their stock threshold
- **New Entry — Transaction Logging** — Staff enter transactions when goods are handed to customers
- **New Entry — Invoice Fields** — Date, invoice number, department autocomplete, function selector
- **New Entry — Line Items** — Add multiple items with inventory autocomplete, auto-fill price, quantity
- **New Entry — Invoice Total** — Running total computed from line items
- **Transaction History** — Browseable list of all transactions with date range filtering
- **Transaction Date Filters** — This Month, Last Month, Last 7 Days, All (26th billing cycle)
- **Transaction Status Filters** — All, Pending, Confirmed, Cancelled
- **Transaction Confirm** — Confirms transaction and decrements stock via atomic RPC
- **Transaction Cancel** — Cancels pending transaction
- **Transaction Detail Modal** — Full transaction view with line items, totals, timestamps
- **PDF Invoice Generation** — Generates formatted PDF invoice via jsPDF with USC branding
- **Order Management** — Browse and process all customer orders
- **Order Status Workflow** — 5-state pipeline: Pending → Confirmed → Ready → Picked Up → Cancelled
- **Order Confirm** — Confirms order and decrements stock via atomic RPC
- **Order Mark Ready** — Marks order ready with optional email notification (mailto:)
- **Order Mark Picked Up** — Marks order as picked up (terminal state)
- **Order Cancel** — Cancels order (terminal state)
- **Order Detail Modal** — Full order view with items, contact info, pickup details
- **Excel Export** — Export confirmed/ready/picked_up orders to Excel spreadsheet
- **Export Date Range** — Custom start/end date with preset buttons (This Month, Last Month, Last 7 Days, This Year)
- **Export Preview** — Shows order count, line item count, and total before exporting
- **Export Column Mapping** — Date, Transaction Ref, Acct Code (888110), Account Name, Fund (10), Fnct (cost centre), Description, Quantity, Amount (TTD)

---

### Technical Features

- **Supabase Real-Time** — Live data updates via Postgres changes subscriptions on inventory, orders, and transactions tables
- **Supabase Auth Session Persistence** — Login sessions persist across browser restarts via Supabase SDK localStorage
- **Cart localStorage Persistence** — Shopping cart survives page refreshes and browser restarts
- **Atomic Stock Decrement** — Server-side RPC prevents overselling race conditions
- **Atomic Order Number Generation** — Server-side counter ensures unique sequential order IDs
- **Image Processing Pipeline** — HEIC conversion → Canvas resize (800px max) → Iterative JPEG quality reduction → Upload
- **Supabase Storage** — Item images stored in public `inventory-images` bucket with cache-busting URLs
- **Settings Auto-Seed** — Function/purpose list auto-populated on first load
- **Responsive Breakpoints** — Desktop (>1024px), tablet (640–1024px), mobile (<640px)
- **Toast Notifications** — Non-intrusive success/error messages with auto-dismiss
- **Click-Outside-to-Close** — Modals and dropdowns close on outside click
- **Keyboard Navigation** — Department autocomplete supports arrow keys, Enter, and Escape
- **Cost Centre Data** — 126 USC departments with codes and display names

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
| Source files | 26 |
| Shared components | 7 |
| Library/services | 4 |
| Feature modules | 10 |
| Config/root | 6 |
| **Total** | **53** |

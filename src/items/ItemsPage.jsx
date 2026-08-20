import { useState, useMemo, useEffect } from 'react';
import { C, FONT_DISPLAY, FONT_BODY } from '../shared/theme';
import { UNASSIGNED_CATEGORY } from '../shared/constants';
import { Search, Folder, ChevronRight, Package, LayoutGrid } from 'lucide-react';
import CatalogItem from '../order/CatalogItem';
import OrderCart from '../order/OrderCart';
import FloatingCart from '../order/FloatingCart';
import ItemImageViewer from '../shared/ItemImageViewer';

export default function ItemsPage({ inventory, categories, cart, addToCart, updateCartQty, removeFromCart, clearCart }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState('all');
  const [viewingItem, setViewingItem] = useState(null);
  const [itemsPage, setItemsPage] = useState(1);
  const ITEMS_PER_PAGE = 18;

  const categoriesWithCounts = useMemo(() => {
    const counts = {};
    (inventory || []).forEach(item => {
      const catId = item.category || '_unassigned';
      counts[catId] = (counts[catId] || 0) + 1;
    });

    const cats = categories
      .filter(c => counts[c.id])
      .map(c => ({ ...c, count: counts[c.id] }));

    if (counts['_unassigned']) {
      cats.push({ ...UNASSIGNED_CATEGORY, count: counts['_unassigned'] });
    }

    return cats;
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    let result = inventory || [];
    if (selectedCategory) {
      if (selectedCategory === '_unassigned') {
        result = result.filter(i => !i.category || i.category === '');
      } else {
        result = result.filter(i => i.category === selectedCategory);
      }
    }
    if (categoryFilter !== 'all' && !selectedCategory) {
      result = result.filter(item => item.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(q));
    }
    return result;
  }, [inventory, search, categoryFilter, selectedCategory]);

  const itemsTotalPages = Math.ceil(filteredInventory.length / ITEMS_PER_PAGE);
  const itemsPageItems = filteredInventory.slice(
    (itemsPage - 1) * ITEMS_PER_PAGE,
    itemsPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setItemsPage(1);
  }, [search, categoryFilter, selectedCategory, viewMode]);

  return (
    <div className="fade-in">
      <style>{`
        .items-grid { display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: start; }
        .floating-cart-toggle { display: none; }
        .items-catalog { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        .items-folder-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; }
        .items-folder { display: flex; flex-direction: column; align-items: center; padding: 24px 16px; background: ${C.card}; border: 1px solid ${C.line}; border-radius: 10px; cursor: pointer; transition: all .15s; }
        .items-folder:hover { border-color: ${C.primary}; box-shadow: 0 4px 12px ${C.primary}15; }
        @media (max-width: 1024px) {
          .items-grid { grid-template-columns: 1fr; }
          .items-cart { display: none !important; }
          .floating-cart-toggle { display: block !important; }
        }
        @media (max-width: 640px) {
          .items-catalog { grid-template-columns: 1fr; }
          .items-folder-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
        }
      `}</style>

      {viewingItem && <ItemImageViewer item={viewingItem} onClose={() => setViewingItem(null)} />}

      {/* Header */}
      <div style={{ marginBottom: 26 }}>
        <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 500, letterSpacing: '-0.015em' }}>
          Item Catalog
        </h2>
        <p style={{ margin: '6px 0 0', color: C.mute, fontSize: 14, maxWidth: 620 }}>
          Browse available items and add them to your cart. When ready, go to Place Order to submit your request.
        </p>
      </div>

      <div className="items-grid">
        {/* Left: Catalog */}
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, fontFamily: FONT_DISPLAY, letterSpacing: '0.01em' }}>
              All Items
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.mute }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  style={{ width: 180, padding: '8px 12px 8px 30px', border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 12, fontFamily: FONT_BODY, color: C.ink, background: C.card }} />
              </div>
              {!selectedCategory && (
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ padding: '8px 10px', border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 12, fontFamily: FONT_BODY, color: C.ink, background: C.card, cursor: 'pointer' }}>
                  <option value="all">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              )}
              {!selectedCategory && (
                <div style={{ display: 'flex', border: `1px solid ${C.lineStrong}`, borderRadius: 6, overflow: 'hidden' }}>
                  <button type="button" onClick={() => setViewMode('folders')}
                    title="Folder view"
                    style={{
                      padding: '6px 8px', background: viewMode === 'folders' ? C.primary : 'transparent',
                      border: 'none', cursor: 'pointer', color: viewMode === 'folders' ? '#fff' : C.mute,
                      display: 'flex', alignItems: 'center',
                    }}>
                    <Folder size={14} />
                  </button>
                  <button type="button" onClick={() => setViewMode('all')}
                    title="All items view"
                    style={{
                      padding: '6px 8px', background: viewMode === 'all' ? C.primary : 'transparent',
                      border: 'none', borderLeft: `1px solid ${C.lineStrong}`, cursor: 'pointer',
                      color: viewMode === 'all' ? '#fff' : C.mute, display: 'flex', alignItems: 'center',
                    }}>
                    <LayoutGrid size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Folders Mode */}
          {viewMode === 'folders' && !selectedCategory && (
            <div className="items-folder-grid">
              {categoriesWithCounts.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: C.faint, fontStyle: 'italic' }}>
                  <Package size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <div>No categories with items yet</div>
                </div>
              ) : (
                categoriesWithCounts
                  .filter(cat => categoryFilter === 'all' || cat.id === categoryFilter)
                  .filter(cat => !search.trim() || cat.label.toLowerCase().includes(search.toLowerCase()))
                  .map(cat => (
                    <button key={cat.id} type="button" className="items-folder" onClick={() => setSelectedCategory(cat.id)}>
                      <Folder size={40} style={{ color: C.primary, marginBottom: 12 }} />
                      <span style={{ fontWeight: 600, fontSize: 14, color: C.ink, textAlign: 'center' }}>{cat.label}</span>
                      <span style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>{cat.count} items</span>
                    </button>
                  ))
              )}
            </div>
          )}

          {/* All Items Flat Grid Mode */}
          {viewMode === 'all' && !selectedCategory && (
            <div>
              <div className="items-catalog">
                {filteredInventory.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', padding: 32, textAlign: 'center', color: C.faint, fontSize: 13 }}>
                    <Package size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <div>No items found</div>
                  </div>
                ) : (
                  itemsPageItems.map(item => (
                    <CatalogItem key={item.id} item={item} onAddToCart={addToCart} onImageClick={setViewingItem} />
                  ))
                )}
              </div>
              {itemsTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                  <button type="button" onClick={() => setItemsPage(p => Math.max(1, p - 1))} disabled={itemsPage === 1}
                    style={{ padding: '4px 12px', background: C.card, border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 12, cursor: itemsPage === 1 ? 'default' : 'pointer', color: itemsPage === 1 ? C.faint : C.ink }}>
                    Prev
                  </button>
                  <span style={{ fontSize: 12, color: C.mute }}>
                    {itemsPage} / {itemsTotalPages}
                  </span>
                  <button type="button" onClick={() => setItemsPage(p => Math.min(itemsTotalPages, p + 1))} disabled={itemsPage === itemsTotalPages}
                    style={{ padding: '4px 12px', background: C.card, border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 12, cursor: itemsPage === itemsTotalPages ? 'default' : 'pointer', color: itemsPage === itemsTotalPages ? C.faint : C.ink }}>
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Items in Category View */}
          {selectedCategory && (
            <div>
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button"
                  onClick={() => { setSelectedCategory(null); setSearch(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: C.primary, fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
                  Back
                </button>
                <span style={{ color: C.lineStrong }}>|</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>
                  {categoriesWithCounts.find(c => c.id === selectedCategory)?.label || selectedCategory}
                </span>
                <span style={{ fontSize: 12, color: C.mute }}>({filteredInventory.length} items)</span>
              </div>

              <div className="items-catalog">
                {itemsPageItems.map(item => (
                  <CatalogItem key={item.id} item={item} onAddToCart={addToCart} onImageClick={setViewingItem} />
                ))}
                {filteredInventory.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', padding: 32, textAlign: 'center', color: C.faint, fontSize: 13 }}>
                    No items found
                  </div>
                )}
              </div>
              {itemsTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                  <button type="button" onClick={() => setItemsPage(p => Math.max(1, p - 1))} disabled={itemsPage === 1}
                    style={{ padding: '4px 12px', background: C.card, border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 12, cursor: itemsPage === 1 ? 'default' : 'pointer', color: itemsPage === 1 ? C.faint : C.ink }}>
                    Prev
                  </button>
                  <span style={{ fontSize: 12, color: C.mute }}>
                    {itemsPage} / {itemsTotalPages}
                  </span>
                  <button type="button" onClick={() => setItemsPage(p => Math.min(itemsTotalPages, p + 1))} disabled={itemsPage === itemsTotalPages}
                    style={{ padding: '4px 12px', background: C.card, border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 12, cursor: itemsPage === itemsTotalPages ? 'default' : 'pointer', color: itemsPage === itemsTotalPages ? C.faint : C.ink }}>
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div className="items-cart" style={{ position: 'sticky', top: 20 }}>
          <OrderCart cart={cart} onUpdateQty={updateCartQty} onRemoveItem={removeFromCart} onClearCart={clearCart} onImageClick={setViewingItem} />
        </div>
      </div>

      {/* Floating Cart (mobile/tablet) */}
      <div className="floating-cart-toggle">
        <FloatingCart cart={cart} onUpdateQty={updateCartQty} onRemoveItem={removeFromCart} onClearCart={clearCart} onImageClick={setViewingItem} />
      </div>
    </div>
  );
}

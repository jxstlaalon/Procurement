import { useState, useRef, useEffect, useMemo } from 'react';
import { C, FONT_DISPLAY, FONT_BODY } from '../shared/theme';
import { todayISO, formatMoney, to12h } from '../shared/helpers';
import { COST_CENTRES } from '../costCentres';
import { UNASSIGNED_CATEGORY } from '../shared/constants';
import { createOrder, getNextOrderNumber } from '../lib/db';
import { Send, CheckCircle, AlertCircle, Search, ShoppingCart, ClipboardPlus, Folder, ChevronRight, Package, LayoutGrid } from 'lucide-react';
import CatalogItem from './CatalogItem';
import OrderCart from './OrderCart';
import FloatingCart from './FloatingCart';
import ItemImageViewer from '../shared/ItemImageViewer';

const TIME_SLOTS = [
  '08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30','15:00',
  '15:30','16:00','16:30',
];

function getAvailableSlots(pickupDate) {
  if (!pickupDate) return TIME_SLOTS;
  const today = todayISO();
  if (pickupDate < today) return [];
  if (pickupDate !== today) return TIME_SLOTS;

  const now = new Date();
  const cutoff = new Date(now.getTime() + 30 * 60 * 1000);
  const cutoffMinutes = cutoff.getHours() * 60 + cutoff.getMinutes();

  return TIME_SLOTS.filter(slot => {
    const [h, m] = slot.split(':').map(Number);
    return (h * 60 + m) >= cutoffMinutes;
  });
}

export default function OrderPage({ inventory, categories, units, cart, addToCart, updateCartQty, removeFromCart, clearCart, setCart }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    telephone: '',
    accountName: '',
    pickupDate: todayISO(),
    pickupTime: '',
  });
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [viewMode, setViewMode] = useState('folders');
  const [viewingItem, setViewingItem] = useState(null);
  const [orderPage, setOrderPage] = useState(1);
  const ORDER_PER_PAGE = 18;
  const wrapperRef = useRef(null);

  const filtered = query.trim() === ''
    ? COST_CENTRES
    : COST_CENTRES.filter(
        c => c.name.toLowerCase().includes(query.toLowerCase()) ||
             c.code.toLowerCase().includes(query.toLowerCase())
      );

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

  const orderTotalPages = Math.ceil(filteredInventory.length / ORDER_PER_PAGE);
  const orderPageItems = filteredInventory.slice(
    (orderPage - 1) * ORDER_PER_PAGE,
    orderPage * ORDER_PER_PAGE
  );

  useEffect(() => {
    setOrderPage(1);
  }, [search, categoryFilter, selectedCategory, viewMode]);

  const selectAccount = (entry) => {
    setForm(f => ({ ...f, accountName: entry.name }));
    setSelectedCode(entry.code);
    setQuery(entry.name);
    setShowDropdown(false);
  };

  const handleAccountInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    setForm(f => ({ ...f, accountName: val }));
    if (!val.trim()) setSelectedCode('');
    setShowDropdown(true);
    setHighlightIdx(-1);
  };

  const handleAccountKeyDown = (e) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0 && filtered[highlightIdx]) {
      e.preventDefault();
      selectAccount(filtered[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const orderTotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  const isPastDate = form.pickupDate && form.pickupDate < todayISO();

  const canSubmit = form.email && form.firstName && form.lastName && form.telephone &&
    selectedCode && cart.length > 0 && form.pickupDate && form.pickupTime && !isPastDate;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setStatus({ type: 'error', msg: 'Please fill all required fields and add at least one item.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const orderNum = await getNextOrderNumber();
      await createOrder({
        id: orderNum,
        email: form.email,
        first_name: form.firstName,
        last_name: form.lastName,
        telephone: form.telephone,
        account_code: selectedCode,
        account_name: form.accountName,
        items: cart.map(item => ({
          itemId: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.unitPrice * item.quantity,
        })),
        order_total: orderTotal,
        pickup_date: form.pickupDate,
        pickup_time: form.pickupTime,
        status: 'pending',
      });

      setShowSuccess(true);
      setStatus({ type: 'success', msg: 'Order submitted successfully!' });
      setForm({ email: '', firstName: '', lastName: '', telephone: '', accountName: '', pickupDate: todayISO(), pickupTime: '' });
      setQuery('');
      setSelectedCode('');
      setCart([]);
      localStorage.removeItem('procurement_cart');
    } catch (err) {
      setStatus({ type: 'error', msg: err?.message || 'Failed to submit order.' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    border: `1px solid ${C.lineStrong}`, borderRadius: 6,
    background: C.card, fontSize: 14, fontFamily: FONT_BODY, color: C.ink,
  };

  const labelStyle = {
    display: 'block', fontSize: 11, color: C.mute, fontWeight: 500,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  return (
    <div className="fade-in">
      <style>{`
        .ord-grid { display: grid; grid-template-columns: 1fr 340px; gap: 24px; align-items: start; }
        .floating-cart-toggle { display: none; }
        .ord-catalog { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        .ord-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .ord-folder-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; }
        .ord-folder { display: flex; flex-direction: column; align-items: center; padding: 24px 16px; background: ${C.card}; border: 1px solid ${C.line}; border-radius: 10px; cursor: pointer; transition: all .15s; }
        .ord-folder:hover { border-color: ${C.primary}; box-shadow: 0 4px 12px ${C.primary}15; }
        @media (max-width: 1024px) {
          .ord-grid { grid-template-columns: 1fr; }
          .ord-sidebar-cart { display: none !important; }
          .ord-cart { position: static !important; }
          .floating-cart-toggle { display: block !important; }
        }
        @media (max-width: 768px) {
          .ord-catalog { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important; gap: 10px !important; }
        }
        @media (max-width: 640px) {
          .ord-form-grid { grid-template-columns: 1fr; }
          .ord-folder-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
        }
      `}</style>

      {viewingItem && <ItemImageViewer item={viewingItem} onClose={() => setViewingItem(null)} />}

      {/* Header */}
      <div style={{ marginBottom: 26 }}>
        <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 500, letterSpacing: '-0.015em' }}>
          Place a Procurement Order
        </h2>
        <p style={{ margin: '6px 0 0', color: C.mute, fontSize: 14, maxWidth: 620 }}>
          Browse available items, add them to your cart, and submit your order for pickup.
        </p>
      </div>

      {!showForm ? (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{
            background: C.card, border: `2px dashed ${C.lineStrong}`,
            borderRadius: 16, padding: '60px 40px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center', gap: 20,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: C.successBg, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <ClipboardPlus size={32} style={{ color: C.primary }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 500, color: C.ink }}>
                Department Order Portal
              </h3>
              <p style={{ margin: '8px 0 0', color: C.mute, fontSize: 14, maxWidth: 400, lineHeight: 1.5 }}>
                Select items from our inventory catalog and submit your order. Procurement staff will prepare your items for pickup.
              </p>
            </div>
            <button type="button" onClick={() => setShowForm(true)}
              style={{
                padding: '14px 36px', border: 'none', borderRadius: 8,
                background: C.primary, color: '#FAF8F3',
                cursor: 'pointer', fontSize: 15, fontWeight: 600, fontFamily: FONT_BODY,
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 2px 8px rgba(94,183,106,0.25)',
              }}>
              <ClipboardPlus size={18} />
              Start Order
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="ord-grid">
            {/* Left: Contact + Catalog */}
            <div>
              {/* Contact Info */}
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 14, fontFamily: FONT_DISPLAY, letterSpacing: '0.01em' }}>
                  Contact Information
                </div>

                <div className="ord-form-grid">
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@usc.edu.tt" style={inputStyle} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Telephone *</label>
                    <input type="tel" value={form.telephone} onChange={(e) => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="+1 (868) 555-0123" style={inputStyle} required />
                  </div>
                  <div>
                    <label style={labelStyle}>First Name *</label>
                    <input type="text" value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="John" style={inputStyle} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name *</label>
                    <input type="text" value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Doe" style={inputStyle} required />
                  </div>
                </div>

                <div className="ord-form-grid" style={{ marginTop: 14 }}>
                  <div style={{ position: 'relative' }} ref={wrapperRef}>
                    <label style={labelStyle}>Department / Account *</label>
                    <input
                      type="text" value={query} onChange={handleAccountInput}
                      onFocus={() => { setShowDropdown(true); setHighlightIdx(-1); }}
                      onKeyDown={handleAccountKeyDown}
                      placeholder="Type to search..." style={inputStyle} autoComplete="off" required />
                    {showDropdown && filtered.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                        background: C.card, border: `1px solid ${C.lineStrong}`,
                        borderRadius: 6, boxShadow: '0 8px 24px rgba(43,35,25,0.12)',
                        maxHeight: 220, overflowY: 'auto', marginTop: 4,
                      }}>
                        {filtered.slice(0, 50).map((entry, i) => (
                          <button type="button" key={entry.code} onClick={() => selectAccount(entry)}
                            onMouseEnter={() => setHighlightIdx(i)}
                            style={{
                              width: '100%', textAlign: 'left', padding: '10px 14px',
                              background: i === highlightIdx ? C.softBg : 'transparent',
                              border: 'none', cursor: 'pointer', fontFamily: FONT_BODY,
                              fontSize: 13, color: C.ink,
                            }}>
                            {entry.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Catalog */}
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 20 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, fontFamily: FONT_DISPLAY, letterSpacing: '0.01em' }}>
                    Item Catalog
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: '1 1 140px', maxWidth: 180 }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.mute }} />
                      <input value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search..."
                        style={{ width: '100%', padding: '8px 12px 8px 30px', border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 12, fontFamily: FONT_BODY, color: C.ink, background: C.card }} />
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
                  <div className="ord-folder-grid">
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
                          <button key={cat.id} type="button" className="ord-folder" onClick={() => setSelectedCategory(cat.id)}>
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
                    <div className="ord-catalog">
                      {filteredInventory.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', padding: 32, textAlign: 'center', color: C.faint, fontSize: 13 }}>
                          <Package size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                          <div>No items found</div>
                        </div>
                      ) : (
                        orderPageItems.map(item => (
                          <CatalogItem key={item.id} item={item} units={units} onAddToCart={addToCart} onImageClick={setViewingItem} />
                        ))
                      )}
                    </div>
                    {orderTotalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                        <button type="button" onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1}
                          style={{ padding: '4px 12px', background: C.card, border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 12, cursor: orderPage === 1 ? 'default' : 'pointer', color: orderPage === 1 ? C.faint : C.ink }}>
                          Prev
                        </button>
                        <span style={{ fontSize: 12, color: C.mute }}>
                          {orderPage} / {orderTotalPages}
                        </span>
                        <button type="button" onClick={() => setOrderPage(p => Math.min(orderTotalPages, p + 1))} disabled={orderPage === orderTotalPages}
                          style={{ padding: '4px 12px', background: C.card, border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 12, cursor: orderPage === orderTotalPages ? 'default' : 'pointer', color: orderPage === orderTotalPages ? C.faint : C.ink }}>
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

                    <div className="ord-catalog">
                      {orderPageItems.map(item => (
                        <CatalogItem key={item.id} item={item} units={units} onAddToCart={addToCart} onImageClick={setViewingItem} />
                      ))}
                      {filteredInventory.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: 32, textAlign: 'center', color: C.faint, fontSize: 13 }}>
                          No items found
                        </div>
                      )}
                    </div>
                    {orderTotalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                        <button type="button" onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1}
                          style={{ padding: '4px 12px', background: C.card, border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 12, cursor: orderPage === 1 ? 'default' : 'pointer', color: orderPage === 1 ? C.faint : C.ink }}>
                          Prev
                        </button>
                        <span style={{ fontSize: 12, color: C.mute }}>
                          {orderPage} / {orderTotalPages}
                        </span>
                        <button type="button" onClick={() => setOrderPage(p => Math.min(orderTotalPages, p + 1))} disabled={orderPage === orderTotalPages}
                          style={{ padding: '4px 12px', background: C.card, border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 12, cursor: orderPage === orderTotalPages ? 'default' : 'pointer', color: orderPage === orderTotalPages ? C.faint : C.ink }}>
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Cart + Pickup + Submit */}
            <div className="ord-cart" style={{ position: 'sticky', top: 20 }}>
              <div className="ord-sidebar-cart">
                <OrderCart cart={cart} onUpdateQty={updateCartQty} onRemoveItem={removeFromCart} onClearCart={clearCart} onImageClick={setViewingItem} />
              </div>

              {/* Pickup */}
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 12, fontFamily: FONT_DISPLAY, letterSpacing: '0.01em' }}>
                  Pickup Details
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Pickup Date *</label>
                  <input type="date" value={form.pickupDate} onChange={(e) => setForm(f => ({ ...f, pickupDate: e.target.value, pickupTime: '' }))} style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>Pickup Time *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxHeight: 200, overflowY: 'auto', padding: 2 }}>
                    {getAvailableSlots(form.pickupDate).map(slot => (
                      <button key={slot} type="button" onClick={() => setForm(f => ({ ...f, pickupTime: slot }))}
                        style={{
                          padding: '8px 4px', fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500, cursor: 'pointer',
                          background: form.pickupTime === slot ? C.primary : C.softBg,
                          color: form.pickupTime === slot ? '#FAF8F3' : C.ink,
                          border: `1px solid ${form.pickupTime === slot ? C.primary : C.lineStrong}`,
                          borderRadius: 6, textAlign: 'center',
                        }}>
                        {to12h(slot)}
                      </button>
                    ))}
                    {getAvailableSlots(form.pickupDate).length === 0 && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 12, fontSize: 12, color: C.mute }}>
                        {isPastDate ? 'Cannot select a past date' : 'No times available — pick a later date'}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.mute, marginTop: 8, fontStyle: 'italic' }}>
                  Please allow at least 30 minutes for order preparation.
                </div>
              </div>

              {/* Status */}
              {status && (
                <div style={{
                  marginTop: 16, padding: '12px 16px', borderRadius: 8,
                  display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                  background: status.type === 'success' ? C.successBg : C.dangerBg,
                  color: status.type === 'success' ? C.success : C.danger,
                }}>
                  {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  <span>{status.msg}</span>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={submitting || !canSubmit}
                style={{
                  width: '100%', marginTop: 16, padding: '14px 18px',
                  background: submitting || !canSubmit ? C.softBg : C.primary,
                  color: submitting || !canSubmit ? C.faint : '#FAF8F3',
                  border: 'none', borderRadius: 8,
                  cursor: submitting || !canSubmit ? 'not-allowed' : 'pointer',
                  fontSize: 15, fontWeight: 600, fontFamily: FONT_BODY,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                <Send size={16} />
                {submitting ? 'Submitting...' : 'Submit Order'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Floating Cart (mobile/tablet) */}
      <div className="floating-cart-toggle">
        <FloatingCart cart={cart} onUpdateQty={updateCartQty} onRemoveItem={removeFromCart} onClearCart={clearCart} onImageClick={setViewingItem} />
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(43,35,25,0.5)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 200, padding: 20,
        }} onClick={() => setShowSuccess(false)}>
          <div style={{
            background: C.card, borderRadius: 16, padding: 32, maxWidth: 480, width: '100%',
            boxShadow: '0 20px 60px rgba(43,35,25,0.25)', textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: C.successBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <CheckCircle size={28} style={{ color: C.success }} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, color: C.ink }}>
              Order Submitted
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 15, color: C.mute, lineHeight: 1.6 }}>
              Your order has been submitted successfully. Procurement staff will prepare your items for pickup. You will receive a notification when your order is ready.
            </p>
            <button onClick={() => setShowSuccess(false)}
              style={{
                padding: '12px 32px', border: 'none', borderRadius: 8,
                background: C.primary, color: '#fff', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY,
              }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

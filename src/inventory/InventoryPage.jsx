import { useState, useMemo, useEffect, useRef } from 'react';
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from '../shared/theme';
import { formatMoney, formatUnit } from '../shared/helpers';
import { UNASSIGNED_CATEGORY } from '../shared/constants';
import { addItem, updateItem, deleteItem as deleteItemDb, adjustStock, getConfig, updateConfig, addUnit, updateUnit, deleteUnitDb, logStockUsage } from '../lib/db';
import { deleteInventoryImage } from '../lib/storage';
import { Package, Plus, Search, AlertCircle, Edit2, Trash2, ArrowUpDown, Folder, ChevronRight, ChevronDown, ChevronUp, Settings, X, GripVertical, RefreshCw, LayoutGrid, Image } from 'lucide-react';
import ItemModal from './ItemModal';
import StockAdjustModal from './StockAdjustModal';
import ConfirmModal from '../shared/ConfirmModal';
import Modal from '../shared/Modal';

export default function InventoryPage({ inventory, categories, setCategories, units, setUnits, showToast, onRefresh }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [adjustItem, setAdjustItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [viewMode, setViewMode] = useState('all');
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatLabel, setEditingCatLabel] = useState('');
  const [deleteCat, setDeleteCat] = useState(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showUnitManager, setShowUnitManager] = useState(false);
  const [newUnitLabel, setNewUnitLabel] = useState('');
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [editingUnitLabel, setEditingUnitLabel] = useState('');
  const [deleteUnit, setDeleteUnit] = useState(null);
  const settingsMenuRef = useRef(null);
  const [lowStockPage, setLowStockPage] = useState(1);
  const [showLowStock, setShowLowStock] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const LOW_STOCK_PER_PAGE = 20;
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const handleClick = (e) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target)) {
        setShowSettingsMenu(false);
      }
    };
    if (showSettingsMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettingsMenu]);

  const lowStock = useMemo(() =>
    inventory.filter(item => item.stock_count <= (item.low_stock_threshold || 10)),
    [inventory]
  );

  const lowStockTotalPages = Math.ceil(lowStock.length / LOW_STOCK_PER_PAGE);
  const lowStockPageItems = lowStock.slice(
    (lowStockPage - 1) * LOW_STOCK_PER_PAGE,
    lowStockPage * LOW_STOCK_PER_PAGE
  );

  useEffect(() => {
    setLowStockPage(1);
  }, [lowStock.length]);

  const categoriesWithCounts = useMemo(() => {
    const counts = {};
    inventory.forEach(item => {
      const catId = item.category || '_unassigned';
      counts[catId] = (counts[catId] || 0) + 1;
    });

    const cats = categories.map(c => ({ ...c, count: counts[c.id] || 0 }));

    if (counts['_unassigned']) {
      cats.push({ ...UNASSIGNED_CATEGORY, count: counts['_unassigned'] });
    }

    return cats;
  }, [inventory, categories]);

  const filteredItems = useMemo(() => {
    let items = inventory;
    if (selectedCategory) {
      if (selectedCategory === '_unassigned') {
        items = items.filter(i => !i.category || i.category === '');
      } else {
        items = items.filter(i => i.category === selectedCategory);
      }
    }
    if (categoryFilter !== 'all') {
      items = items.filter(i => i.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q));
    }
    items.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [inventory, selectedCategory, categoryFilter, search, sortField, sortDir]);

  const itemsTotalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const itemsPageItems = filteredItems.slice(
    (itemsPage - 1) * ITEMS_PER_PAGE,
    itemsPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setItemsPage(1);
  }, [selectedCategory, categoryFilter, search, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleSaveItem = async (data) => {
    try {
      if (data.id) {
        const { id, ...updateData } = data;
        await updateItem(id, updateData);
        showToast('success', 'Item updated.');
      } else {
        const { id, ...newData } = data;
        await addItem(newData);
        showToast('success', 'Item added.');
      }
      setShowItemForm(false);
      setEditingItem(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast('error', err.message || 'Failed to save item.');
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItem) return;
    try {
      await deleteItemDb(deleteItem.id);
      if (deleteItem.image_url) {
        await deleteInventoryImage(deleteItem.id).catch(() => {});
      }
      showToast('success', 'Item deleted.');
      setDeleteItem(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast('error', err.message || 'Failed to delete item.');
    }
  };

  const handleAdjust = async (data) => {
    try {
      await adjustStock(data.productId, data.newStock);
      const now = new Date();
      const usageMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const item = inventory.find(i => i.id === data.productId);
      await logStockUsage({
        item_id: data.productId,
        item_name: item?.name || data.productName,
        item_code: item?.code || '',
        unit: item?.unit || '',
        quantity: data.quantity,
        direction: data.type === 'increase' ? 'increase' : 'decrease',
        reason: data.type === 'increase' ? 'restock' : 'manual_decrease',
        usage_month: usageMonth,
      });
      setAdjustItem(null);
      showToast('success', 'Stock adjusted.');
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast('error', err.message || 'Failed to adjust stock.');
    }
  };

  const saveCategories = async (newCategories) => {
    try {
      await updateConfig({ categories: newCategories });
      setCategories(newCategories);
      showToast('success', 'Categories updated.');
    } catch (err) {
      showToast('error', err.message || 'Failed to update categories.');
    }
  };

  const handleAddCategory = () => {
    const label = newCatLabel.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (categories.find(c => c.id === id)) {
      showToast('error', 'A category with this name already exists.');
      return;
    }
    const updated = [...categories, { id, label }];
    saveCategories(updated);
    setNewCatLabel('');
  };

  const handleUpdateCategory = () => {
    if (!editingCatId) return;
    const label = editingCatLabel.trim();
    if (!label) return;
    const updated = categories.map(c => c.id === editingCatId ? { ...c, label } : c);
    saveCategories(updated);
    setEditingCatId(null);
    setEditingCatLabel('');
  };

  const handleDeleteCategory = async () => {
    if (!deleteCat) return;
    const updated = categories.filter(c => c.id !== deleteCat.id);
    saveCategories(updated);
    setDeleteCat(null);
  };

  const handleMoveCategory = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= categories.length) return;
    const updated = [...categories];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    saveCategories(updated);
  };

  const getCategoryLabel = (id) => categories.find(c => c.id === id)?.label || categories.find(c => c.label === id)?.label || id;
  const getUnitLabel = (id) => (units || []).find(u => u.id === id)?.label || id;

  // --- Unit handlers ---
  const saveUnits = async (newUnits) => {
    try {
      for (let i = 0; i < newUnits.length; i++) {
        await updateUnit(newUnits[i].id, { sort_order: i, label: newUnits[i].label });
      }
      setUnits(newUnits);
      showToast('success', 'Units updated.');
    } catch (err) {
      showToast('error', err.message || 'Failed to update units.');
    }
  };

  const handleAddUnit = async () => {
    const label = newUnitLabel.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if ((units || []).find(u => u.id === id)) {
      showToast('error', 'A unit with this name already exists.');
      return;
    }
    try {
      await addUnit({ id, label, sort_order: (units || []).length });
      setUnits([...(units || []), { id, label, sort_order: (units || []).length }]);
      setNewUnitLabel('');
      showToast('success', 'Unit added.');
    } catch (err) {
      showToast('error', err.message || 'Failed to add unit.');
    }
  };

  const handleUpdateUnit = async () => {
    if (!editingUnitId) return;
    const label = editingUnitLabel.trim();
    if (!label) return;
    try {
      await updateUnit(editingUnitId, { label });
      setUnits((units || []).map(u => u.id === editingUnitId ? { ...u, label } : u));
      setEditingUnitId(null);
      setEditingUnitLabel('');
      showToast('success', 'Unit updated.');
    } catch (err) {
      showToast('error', err.message || 'Failed to update unit.');
    }
  };

  const handleDeleteUnit = async () => {
    if (!deleteUnit) return;
    try {
      await deleteUnitDb(deleteUnit.id);
      setUnits((units || []).filter(u => u.id !== deleteUnit.id));
      setDeleteUnit(null);
      showToast('success', 'Unit deleted.');
    } catch (err) {
      showToast('error', err.message || 'Failed to delete unit.');
    }
  };

  const handleMoveUnit = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= (units || []).length) return;
    const updated = [...units];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    saveUnits(updated);
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    border: `1px solid ${C.lineStrong}`, borderRadius: 8,
    fontSize: 13, fontFamily: FONT_BODY, color: C.ink, background: C.card,
  };

  return (
    <div className="fade-in">
      <style>{`
        .inv-folder-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; }
        .inv-folder { display: flex; flex-direction: column; align-items: center; padding: 24px 16px; background: ${C.card}; border: 1px solid ${C.line}; border-radius: 10px; cursor: pointer; transition: all .15s; }
        .inv-folder:hover { border-color: ${C.primary}; box-shadow: 0 4px 12px ${C.primary}15; }
        .inv-picture-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        .inv-picture-card { background: ${C.card}; border: 1px solid ${C.line}; border-radius: 10px; overflow: hidden; cursor: pointer; transition: all .15s; }
        .inv-picture-card:hover { border-color: ${C.primary}; box-shadow: 0 4px 12px ${C.primary}15; }
        @media (max-width: 768px) {
          .inv-picture-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important; gap: 10px !important; }
        }
        @media (max-width: 640px) {
          .inv-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .inv-folder-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
        }
      `}</style>

      {/* Header */}
      <div className="inv-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 500, letterSpacing: '-0.015em' }}>
            Inventory
          </h2>
          <p style={{ margin: '4px 0 0', color: C.mute, fontSize: 14 }}>
            Manage stock items and unit prices
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onRefresh}
            style={{
              padding: '10px 14px', background: 'transparent', border: `1px solid ${C.lineStrong}`, borderRadius: 8,
              cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: FONT_BODY, color: C.mute,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <RefreshCw size={15} /> Refresh
          </button>
          <div ref={settingsMenuRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              style={{
                padding: '10px 14px', background: showSettingsMenu ? `${C.primary}12` : 'transparent', border: `1px solid ${showSettingsMenu ? C.primary : C.lineStrong}`, borderRadius: 8,
                cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: FONT_BODY, color: showSettingsMenu ? C.primary : C.mute,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <Settings size={15} /> Settings
            </button>
            {showSettingsMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 100,
                background: C.card, border: `1px solid ${C.line}`, borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 160, padding: 4,
              }}>
                <button onClick={() => { setShowCatManager(true); setShowSettingsMenu(false); }}
                  style={{
                    width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderRadius: 6,
                    cursor: 'pointer', fontSize: 13, fontFamily: FONT_BODY, color: C.ink, textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                  onMouseEnter={e => e.target.style.background = `${C.primary}10`}
                  onMouseLeave={e => e.target.style.background = 'transparent'}>
                  <Folder size={15} /> Categories
                </button>
                <button onClick={() => { setShowUnitManager(true); setShowSettingsMenu(false); }}
                  style={{
                    width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderRadius: 6,
                    cursor: 'pointer', fontSize: 13, fontFamily: FONT_BODY, color: C.ink, textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                  onMouseEnter={e => e.target.style.background = `${C.primary}10`}
                  onMouseLeave={e => e.target.style.background = 'transparent'}>
                  <Package size={15} /> Units
                </button>
              </div>
            )}
          </div>
          <button onClick={() => { setEditingItem(null); setShowItemForm(true); }}
            style={{
              padding: '10px 20px', background: C.primary, border: 'none', borderRadius: 8,
              cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, color: '#FAF8F3',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 2px 8px rgba(94,183,106,0.25)',
            }}>
            <Plus size={16} />
            Add Item
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div style={{ background: C.dangerBg, border: `1px solid ${C.danger}30`, borderRadius: 10, marginBottom: 20, overflow: 'hidden' }}>
          <button type="button" onClick={() => setShowLowStock(!showLowStock)}
            style={{
              width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: C.danger, display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
            }}>
            <AlertCircle size={16} />
            Low Stock Alert ({lowStock.length} items)
            <span style={{ marginLeft: 'auto' }}>
              {showLowStock ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
          {showLowStock && (
            <div style={{ padding: '0 16px 16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, color: C.ink }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: `2px solid ${C.danger}50`, fontWeight: 600 }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: `2px solid ${C.danger}50`, fontWeight: 600 }}>Category</th>
                    <th style={{ textAlign: 'right', padding: '6px 10px', borderBottom: `2px solid ${C.danger}50`, fontWeight: 600 }}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockPageItems.map(item => (
                    <tr key={item.id}>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${C.danger}30` }}>{item.name}</td>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${C.danger}30` }}>{getCategoryLabel(item.category)}</td>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${C.danger}30`, textAlign: 'right', fontWeight: 600 }}>{item.stock_count} {formatUnit(item.stock_count, getUnitLabel(item.unit))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lowStockTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12 }}>
                  <button type="button" onClick={() => setLowStockPage(p => Math.max(1, p - 1))} disabled={lowStockPage === 1}
                    style={{ padding: '4px 12px', background: C.card, border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 12, cursor: lowStockPage === 1 ? 'default' : 'pointer', color: lowStockPage === 1 ? C.faint : C.ink }}>
                    Prev
                  </button>
                  <span style={{ fontSize: 12, color: C.mute }}>
                    {lowStockPage} / {lowStockTotalPages}
                  </span>
                  <button type="button" onClick={() => setLowStockPage(p => Math.min(lowStockTotalPages, p + 1))} disabled={lowStockPage === lowStockTotalPages}
                    style={{ padding: '4px 12px', background: C.card, border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 12, cursor: lowStockPage === lowStockTotalPages ? 'default' : 'pointer', color: lowStockPage === lowStockTotalPages ? C.faint : C.ink }}>
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.mute }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={selectedCategory ? "Search items in category..." : "Search items..."}
            style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>
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
            <button type="button" onClick={() => setViewMode('pictures')}
              title="Picture view"
              style={{
                padding: '6px 8px', background: viewMode === 'pictures' ? C.primary : 'transparent',
                border: 'none', borderLeft: `1px solid ${C.lineStrong}`, cursor: 'pointer',
                color: viewMode === 'pictures' ? '#fff' : C.mute, display: 'flex', alignItems: 'center',
              }}>
              <Image size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Category Manager Modal */}
      {showCatManager && (
        <Modal onClose={() => setShowCatManager(false)} maxWidth={420}>
          <div style={{ padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 500, color: C.ink }}>
                Manage Categories
              </h3>
            </div>

            {/* Category List */}
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
              {categories.map((cat, idx) => {
                const itemCount = inventory.filter(i => i.category === cat.id).length;
                return (
                  <div key={cat.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    borderBottom: `1px solid ${C.line}`,
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button onClick={() => handleMoveCategory(idx, -1)} disabled={idx === 0}
                        style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? C.faint : C.mute, padding: 0, lineHeight: 0 }}>
                        <GripVertical size={10} />
                      </button>
                      <button onClick={() => handleMoveCategory(idx, 1)} disabled={idx === categories.length - 1}
                        style={{ background: 'none', border: 'none', cursor: idx === categories.length - 1 ? 'default' : 'pointer', color: idx === categories.length - 1 ? C.faint : C.mute, padding: 0, lineHeight: 0 }}>
                        <GripVertical size={10} />
                      </button>
                    </div>
                    {editingCatId === cat.id ? (
                      <input value={editingCatLabel} onChange={e => setEditingCatLabel(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleUpdateCategory(); if (e.key === 'Escape') { setEditingCatId(null); setEditingCatLabel(''); } }}
                        autoFocus
                        style={{ flex: 1, padding: '4px 8px', border: `1px solid ${C.primary}`, borderRadius: 4, fontSize: 13, fontFamily: FONT_BODY, color: C.ink }} />
                    ) : (
                      <span style={{ flex: 1, fontSize: 13, color: C.ink }}>
                        {cat.label}
                        <span style={{ fontSize: 11, color: C.mute, marginLeft: 6 }}>({itemCount} items)</span>
                      </span>
                    )}
                    {editingCatId === cat.id ? (
                      <button onClick={handleUpdateCategory}
                        style={{ padding: '3px 8px', background: C.primary, color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontFamily: FONT_BODY }}>
                        Save
                      </button>
                    ) : (
                      <button onClick={() => { setEditingCatId(cat.id); setEditingCatLabel(cat.label); }}
                        style={{ padding: '3px 8px', background: 'transparent', border: `1px solid ${C.lineStrong}`, borderRadius: 4, fontSize: 11, color: C.mute, cursor: 'pointer', fontFamily: FONT_BODY }}>
                        <Edit2 size={11} />
                      </button>
                    )}
                    <button onClick={() => setDeleteCat(cat)}
                      style={{ padding: '3px 8px', background: 'transparent', border: `1px solid ${C.danger}40`, borderRadius: 4, fontSize: 11, color: C.danger, cursor: 'pointer', fontFamily: FONT_BODY }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
              {categories.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: C.faint, fontSize: 13, fontStyle: 'italic' }}>
                  No categories yet
                </div>
              )}
            </div>

            {/* Add Category */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                placeholder="New category name..."
                style={{ flex: 1, padding: '8px 12px', border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 13, fontFamily: FONT_BODY, color: C.ink }} />
              <button onClick={handleAddCategory}
                style={{
                  padding: '8px 16px', background: C.primary, color: '#fff', border: 'none',
                  borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY,
                }}>
                Add
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Category Confirmation */}
      {deleteCat && (
        <ConfirmModal
          title="Delete Category"
          message={`Are you sure you want to delete "${deleteCat.label}"? Items in this category will become "Unassigned".`}
          onConfirm={handleDeleteCategory}
          onCancel={() => setDeleteCat(null)}
          confirmLabel="Delete"
          danger
        />
      )}

      {/* Unit Manager Modal */}
      {showUnitManager && (
        <Modal onClose={() => setShowUnitManager(false)} maxWidth={420}>
          <div style={{ padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 500, color: C.ink }}>
                Manage Units
              </h3>
            </div>

            {/* Unit List */}
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
              {(units || []).map((unit, idx) => (
                <div key={unit.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  borderBottom: `1px solid ${C.line}`,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button onClick={() => handleMoveUnit(idx, -1)} disabled={idx === 0}
                      style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? C.faint : C.mute, padding: 0, lineHeight: 0 }}>
                      <GripVertical size={10} />
                    </button>
                    <button onClick={() => handleMoveUnit(idx, 1)} disabled={idx === (units || []).length - 1}
                      style={{ background: 'none', border: 'none', cursor: idx === (units || []).length - 1 ? 'default' : 'pointer', color: idx === (units || []).length - 1 ? C.faint : C.mute, padding: 0, lineHeight: 0 }}>
                      <GripVertical size={10} />
                    </button>
                  </div>
                  {editingUnitId === unit.id ? (
                    <input value={editingUnitLabel} onChange={e => setEditingUnitLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdateUnit(); if (e.key === 'Escape') { setEditingUnitId(null); setEditingUnitLabel(''); } }}
                      autoFocus
                      style={{ flex: 1, padding: '4px 8px', border: `1px solid ${C.primary}`, borderRadius: 4, fontSize: 13, fontFamily: FONT_BODY, color: C.ink }} />
                  ) : (
                    <span style={{ flex: 1, fontSize: 13, color: C.ink }}>
                      {unit.label}
                    </span>
                  )}
                  {editingUnitId === unit.id ? (
                    <button onClick={handleUpdateUnit}
                      style={{ padding: '3px 8px', background: C.primary, color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontFamily: FONT_BODY }}>
                      Save
                    </button>
                  ) : (
                    <button onClick={() => { setEditingUnitId(unit.id); setEditingUnitLabel(unit.label); }}
                      style={{ padding: '3px 8px', background: 'transparent', border: `1px solid ${C.lineStrong}`, borderRadius: 4, fontSize: 11, color: C.mute, cursor: 'pointer', fontFamily: FONT_BODY }}>
                      <Edit2 size={11} />
                    </button>
                  )}
                  <button onClick={() => setDeleteUnit(unit)}
                    style={{ padding: '3px 8px', background: 'transparent', border: `1px solid ${C.danger}40`, borderRadius: 4, fontSize: 11, color: C.danger, cursor: 'pointer', fontFamily: FONT_BODY }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
              {(units || []).length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: C.faint, fontSize: 13, fontStyle: 'italic' }}>
                  No units yet
                </div>
              )}
            </div>

            {/* Add Unit */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newUnitLabel} onChange={e => setNewUnitLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddUnit(); }}
                placeholder="New unit name..."
                style={{ flex: 1, padding: '8px 12px', border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 13, fontFamily: FONT_BODY, color: C.ink }} />
              <button onClick={handleAddUnit}
                style={{
                  padding: '8px 16px', background: C.primary, color: '#fff', border: 'none',
                  borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY,
                }}>
                Add
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteUnit && (
        <ConfirmModal
          title="Delete Unit"
          message={`Are you sure you want to delete "${deleteUnit.label}"?`}
          onConfirm={handleDeleteUnit}
          onCancel={() => setDeleteUnit(null)}
          confirmLabel="Delete"
          danger
        />
      )}

      {/* Item Form Modal */}
      {showItemForm && (
        <ItemModal
          item={editingItem}
          categories={categories}
          units={units}
          onSave={handleSaveItem}
          onCancel={() => { setShowItemForm(false); setEditingItem(null); }}
        />
      )}

      {/* Stock Adjust Modal */}
      {adjustItem && (
        <StockAdjustModal
          item={adjustItem}
          units={units}
          onSave={handleAdjust}
          onCancel={() => setAdjustItem(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteItem && (
        <ConfirmModal
          title="Delete Item"
          message={`Are you sure you want to delete "${deleteItem.name}"? This action cannot be undone.`}
          onConfirm={handleDeleteItem}
          onCancel={() => setDeleteItem(null)}
          confirmLabel="Delete"
          danger
        />
      )}

      {/* Category Folders View */}
      {viewMode === 'folders' && !selectedCategory && (
        <div className="inv-folder-grid">
          {categoriesWithCounts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: C.faint, fontStyle: 'italic' }}>
              <Package size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <div>No categories yet. Add one via the Categories button.</div>
            </div>
          ) : (
            categoriesWithCounts
              .filter(cat => !search.trim() || cat.label.toLowerCase().includes(search.toLowerCase()))
              .map(cat => (
                <button key={cat.id} className="inv-folder" onClick={() => setSelectedCategory(cat.id)}>
                  <Folder size={40} style={{ color: C.primary, marginBottom: 12 }} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: C.ink, textAlign: 'center' }}>{cat.label}</span>
                  <span style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>{cat.count} items</span>
                </button>
              ))
          )}
        </div>
      )}

      {/* All Items Flat Table View */}
      {viewMode === 'all' && !selectedCategory && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>All Items</span>
            <span style={{ fontSize: 12, color: C.mute }}>({filteredItems.length} items)</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
            <thead>
              <tr style={{ background: C.softBg }}>
                {[
                  { key: 'code', label: 'Code', align: 'left' },
                  { key: 'name', label: 'Name', align: 'left' },
                  { key: 'category', label: 'Category', align: 'left' },
                  { key: 'stock_count', label: 'Stock', align: 'center' },
                  { key: 'unit', label: 'Unit', align: 'left' },
                  { key: 'unit_price', label: 'Price', align: 'right' },
                  { key: 'actions', label: 'Actions', align: 'center' },
                ].map(col => (
                  <th key={col.key}
                    onClick={() => col.key !== 'actions' && handleSort(col.key)}
                    style={{
                      padding: '10px 12px', textAlign: col.align,
                      fontWeight: 600, color: C.mute, fontSize: 11,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      cursor: col.key !== 'actions' ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {sortField === col.key && (
                        <ArrowUpDown size={12} style={{ opacity: 0.5 }} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itemsPageItems.map(item => {
                const isLow = item.stock_count <= (item.low_stock_threshold || 10);
                return (
                  <tr key={item.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: C.mute, fontFamily: FONT_MONO }}>{item.code || '—'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{item.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: C.mute }}>
                      {getCategoryLabel(item.category)}
                    </td>
                    <td style={{
                      padding: '10px 12px', textAlign: 'center', fontFamily: FONT_MONO,
                      color: isLow ? C.danger : C.ink, fontWeight: isLow ? 600 : 400,
                    }}>
                      {item.stock_count}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{getUnitLabel(item.unit)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: FONT_MONO }}>
                      {formatMoney(item.unit_price)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button onClick={() => { setEditingItem(item); setShowItemForm(true); }}
                          style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.lineStrong}`, borderRadius: 5, fontSize: 11, color: C.mute, cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Edit2 size={12} /> Edit
                        </button>
                        <button onClick={() => setAdjustItem(item)}
                          style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.primary}`, borderRadius: 5, fontSize: 11, color: C.primary, cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ArrowUpDown size={12} /> Adjust
                        </button>
                        <button onClick={() => setDeleteItem(item)}
                          style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.danger}`, borderRadius: 5, fontSize: 11, color: C.danger, cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.faint, fontStyle: 'italic' }}>
                    <Package size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <div>No items found</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          {itemsTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: `1px solid ${C.line}` }}>
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

      {/* All Items Picture View */}
      {viewMode === 'pictures' && !selectedCategory && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
          <div style={{ padding: '0 0 12px', borderBottom: `1px solid ${C.line}`, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>All Items</span>
              <span style={{ fontSize: 12, color: C.mute }}>({filteredItems.length} items)</span>
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '6px 10px', border: `1px solid ${C.lineStrong}`, borderRadius: 6, fontSize: 12, fontFamily: FONT_BODY, color: C.ink, background: C.card, cursor: 'pointer' }}>
              <option value="all">All Categories</option>
              {categoriesWithCounts.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          {filteredItems.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.faint, fontStyle: 'italic' }}>
              <Package size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <div>No items found</div>
            </div>
          ) : (
            <>
              <div className="inv-picture-grid">
                {itemsPageItems.map(item => {
                  const isLow = item.stock_count <= (item.low_stock_threshold || 10);
                  return (
                    <div key={item.id} className="inv-picture-card" onClick={() => { setEditingItem(item); setShowItemForm(true); }}>
                      <div style={{ width: '100%', height: 160, background: C.softBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <Package size={32} style={{ color: C.faint }} />
                        )}
                      </div>
                      <div style={{ padding: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: C.mute, fontFamily: FONT_MONO, marginBottom: 6 }}>{item.code || '—'}</div>
                        <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: C.softBg, color: C.mute, marginBottom: 6 }}>
                          {getCategoryLabel(item.category)}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: 11, color: C.mute, lineHeight: 1.4, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.description}
                          </div>
                        )}
                        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: isLow ? C.danger : C.mute, fontWeight: isLow ? 600 : 400 }}>
                            Stock: {item.stock_count} {formatUnit(item.stock_count, getUnitLabel(item.unit))}
                          </span>
                          <span style={{ fontWeight: 600, fontFamily: FONT_MONO, color: C.ink }}>
                            {formatMoney(item.unit_price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
            </>
          )}
        </div>
      )}

      {/* Items Table View (selected category) */}
      {selectedCategory && viewMode !== 'pictures' && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
          {/* Breadcrumb */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => { setSelectedCategory(null); setSearch(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: C.primary, fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
              Back
            </button>
            <span style={{ color: C.lineStrong }}>|</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>
              {categoriesWithCounts.find(c => c.id === selectedCategory)?.label || selectedCategory}
            </span>
            <span style={{ fontSize: 12, color: C.mute }}>({filteredItems.length} items)</span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
            <thead>
              <tr style={{ background: C.softBg }}>
                {[
                  { key: 'code', label: 'Code', align: 'left' },
                  { key: 'name', label: 'Name', align: 'left' },
                  { key: 'stock_count', label: 'Stock', align: 'center' },
                  { key: 'unit', label: 'Unit', align: 'left' },
                  { key: 'unit_price', label: 'Price', align: 'right' },
                  { key: 'actions', label: 'Actions', align: 'center' },
                ].map(col => (
                  <th key={col.key}
                    onClick={() => col.key !== 'actions' && handleSort(col.key)}
                    style={{
                      padding: '10px 12px', textAlign: col.align,
                      fontWeight: 600, color: C.mute, fontSize: 11,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      cursor: col.key !== 'actions' ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {sortField === col.key && (
                        <ArrowUpDown size={12} style={{ opacity: 0.5 }} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itemsPageItems.map(item => {
                const isLow = item.stock_count <= (item.low_stock_threshold || 10);
                return (
                  <tr key={item.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: C.mute, fontFamily: FONT_MONO }}>{item.code || '—'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{item.name}</td>
                    <td style={{
                      padding: '10px 12px', textAlign: 'center', fontFamily: FONT_MONO,
                      color: isLow ? C.danger : C.ink, fontWeight: isLow ? 600 : 400,
                    }}>
                      {item.stock_count}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{getUnitLabel(item.unit)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: FONT_MONO }}>
                      {formatMoney(item.unit_price)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button onClick={() => { setEditingItem(item); setShowItemForm(true); }}
                          style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.lineStrong}`, borderRadius: 5, fontSize: 11, color: C.mute, cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Edit2 size={12} /> Edit
                        </button>
                        <button onClick={() => setAdjustItem(item)}
                          style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.primary}`, borderRadius: 5, fontSize: 11, color: C.primary, cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ArrowUpDown size={12} /> Adjust
                        </button>
                        <button onClick={() => setDeleteItem(item)}
                          style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.danger}`, borderRadius: 5, fontSize: 11, color: C.danger, cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: C.faint, fontStyle: 'italic' }}>
                    <Package size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <div>No items in this category</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          {itemsTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: `1px solid ${C.line}` }}>
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

      {/* Items Picture View (selected category) */}
      {selectedCategory && viewMode === 'pictures' && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
          <div style={{ padding: '0 0 12px', borderBottom: `1px solid ${C.line}`, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => { setSelectedCategory(null); setSearch(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: C.primary, fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
              Back
            </button>
            <span style={{ color: C.lineStrong }}>|</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>
              {categoriesWithCounts.find(c => c.id === selectedCategory)?.label || selectedCategory}
            </span>
            <span style={{ fontSize: 12, color: C.mute }}>({filteredItems.length} items)</span>
          </div>
          {filteredItems.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.faint, fontStyle: 'italic' }}>
              <Package size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <div>No items in this category</div>
            </div>
          ) : (
            <>
              <div className="inv-picture-grid">
                {itemsPageItems.map(item => {
                  const isLow = item.stock_count <= (item.low_stock_threshold || 10);
                  return (
                    <div key={item.id} className="inv-picture-card" onClick={() => { setEditingItem(item); setShowItemForm(true); }}>
                      <div style={{ width: '100%', height: 160, background: C.softBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <Package size={32} style={{ color: C.faint }} />
                        )}
                      </div>
                      <div style={{ padding: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: C.mute, fontFamily: FONT_MONO, marginBottom: 6 }}>{item.code || '—'}</div>
                        <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: C.softBg, color: C.mute, marginBottom: 6 }}>
                          {getCategoryLabel(item.category)}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: 11, color: C.mute, lineHeight: 1.4, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.description}
                          </div>
                        )}
                        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: isLow ? C.danger : C.mute, fontWeight: isLow ? 600 : 400 }}>
                            Stock: {item.stock_count} {formatUnit(item.stock_count, getUnitLabel(item.unit))}
                          </span>
                          <span style={{ fontWeight: 600, fontFamily: FONT_MONO, color: C.ink }}>
                            {formatMoney(item.unit_price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

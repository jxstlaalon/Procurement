import { useState, useMemo } from 'react';
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from '../shared/theme';
import { formatDateShort, formatDateLong, formatDateVoucher, formatMoney, to12h } from '../shared/helpers';
import { ShoppingCart, Search, CheckCircle, XCircle, Clock, Eye, ChevronDown, ChevronRight, Truck, RefreshCw, Trash2, FileText } from 'lucide-react';
import Modal from '../shared/Modal';
import ConfirmModal from '../shared/ConfirmModal';
import { deleteOrder } from '../lib/db';
import generateVoucherPDF from '../print/generateVoucherPDF';

const PRESETS = [
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'Last 7 Days', value: 'last7' },
  { label: 'All', value: 'all' },
];

export default function PastOrdersPage({ orders, onRefresh, showToast }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('picked_up');
  const [datePreset, setDatePreset] = useState('thisMonth');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [deletingOrder, setDeletingOrder] = useState(null);

  const getPresetRange = (preset) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const fmt = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    if (preset === 'thisMonth') {
      const start = d >= 26 ? new Date(y, m, 26) : new Date(y, m - 1, 26);
      const end = d >= 26 ? new Date(y, m + 1, 25) : new Date(y, m, 25);
      return { start: fmt(start), end: fmt(end) };
    } else if (preset === 'lastMonth') {
      const start = d >= 26 ? new Date(y, m - 1, 26) : new Date(y, m - 2, 26);
      const end = d >= 26 ? new Date(y, m, 25) : new Date(y, m - 1, 25);
      return { start: fmt(start), end: fmt(end) };
    } else if (preset === 'last7') {
      const start = new Date(y, m, now.getDate() - 6);
      return { start: fmt(start), end: fmt(now) };
    }
    return { start: '', end: '' };
  };

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else {
      const range = getPresetRange(preset);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  const filtered = useMemo(() => {
    let result = [...(orders || [])];
    result = result.filter(o => o.status === 'picked_up' || o.status === 'cancelled');
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }
    if (startDate) result = result.filter(o => {
      const oDate = o.created_at ? new Date(o.created_at).toISOString().slice(0, 10) : '';
      return oDate >= startDate;
    });
    if (endDate) result = result.filter(o => {
      const oDate = o.created_at ? new Date(o.created_at).toISOString().slice(0, 10) : '';
      return oDate <= endDate;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.id?.toLowerCase().includes(q) ||
        o.account_name?.toLowerCase().includes(q) ||
        o.first_name?.toLowerCase().includes(q) ||
        o.last_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, statusFilter, startDate, endDate, search]);

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: C.gold + '20', color: C.gold, icon: Clock, label: 'Pending' },
      ready: { bg: C.successBg, color: C.success, icon: Truck, label: 'Ready' },
      picked_up: { bg: C.softBg, color: C.mute, icon: CheckCircle, label: 'Picked Up' },
      cancelled: { bg: C.dangerBg, color: C.danger, icon: XCircle, label: 'Cancelled' },
    };
    const s = styles[status] || styles.pending;
    const Icon = s.icon;
    return (
      <span style={{
        padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
        background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        <Icon size={12} />
        {s.label}
      </span>
    );
  };

  const toggleRow = (orderId) => {
    setExpandedRows(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleDelete = async (order) => {
    try {
      await deleteOrder(order.id);
      showToast('success', 'Order deleted successfully.');
      setDeletingOrder(null);
      onRefresh();
    } catch (err) {
      showToast('error', err.message || 'Failed to delete order.');
    }
  };

  return (
    <div className="fade-in">
      <style>{`
        @media (max-width: 640px) {
          .po-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .po-filters { flex-direction: column !important; }
        }
      `}</style>

      <div className="po-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 500, letterSpacing: '-0.015em' }}>
            Past Orders
          </h2>
          <p style={{ margin: '4px 0 0', color: C.mute, fontSize: 14 }}>
            View historical orders from departments
          </p>
        </div>
        <button onClick={onRefresh}
          style={{
            padding: '10px 14px', background: 'transparent', border: `1px solid ${C.lineStrong}`, borderRadius: 8,
            cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: FONT_BODY, color: C.mute,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="po-filters" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.mute }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, department, name..."
            style={{
              width: '100%', padding: '10px 14px', paddingLeft: 36,
              border: `1px solid ${C.lineStrong}`, borderRadius: 8,
              fontSize: 13, fontFamily: FONT_BODY, color: C.ink, background: C.card,
            }} />
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {PRESETS.map(p => (
            <button key={p.value} onClick={() => handlePresetChange(p.value)}
              style={{
                padding: '8px 12px', borderRadius: 6, border: 'none',
                background: datePreset === p.value ? C.primary : C.softBg,
                color: datePreset === p.value ? '#fff' : C.mute,
                fontSize: 12, fontWeight: 500, fontFamily: FONT_BODY, cursor: 'pointer',
              }}>
              {p.label}
            </button>
          ))}
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 12px', border: `1px solid ${C.lineStrong}`, borderRadius: 8,
            fontSize: 13, fontFamily: FONT_BODY, color: C.ink, background: C.card, cursor: 'pointer',
          }}>
          <option value="all">All Status</option>
          <option value="picked_up">Picked Up</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
          <thead>
            <tr style={{ background: C.softBg }}>
              {[
                { label: '', align: 'center' },
                { label: 'Invoice #', align: 'left' },
                { label: 'Date', align: 'left' },
                { label: 'Department', align: 'left' },
                { label: 'Items', align: 'center' },
                { label: 'Total', align: 'right' },
                { label: 'Pickup', align: 'left' },
                { label: 'Status', align: 'center' },
              ].map((col, i) => (
                <th key={i} style={{
                  padding: '10px 12px', textAlign: col.align,
                  fontWeight: 600, color: C.mute, fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => (
              <>
                <tr key={order.id} style={{ borderTop: `1px solid ${C.line}`, cursor: 'pointer' }}
                  onClick={() => toggleRow(order.id)}>
                  <td style={{ padding: '10px 12px', textAlign: 'center', width: 36 }}>
                    {expandedRows[order.id]
                      ? <ChevronDown size={14} style={{ color: C.mute }} />
                      : <ChevronRight size={14} style={{ color: C.mute }} />}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 500, fontFamily: FONT_MONO, fontSize: 12 }}>{order.invoice_number || '—'}</td>
                  <td style={{ padding: '10px 12px', fontFamily: FONT_MONO, fontSize: 12 }}>
                    {order.created_at ? formatDateShort(new Date(order.created_at).toISOString().slice(0, 10)) : '-'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 500 }}>{order.account_name}</div>
                    <div style={{ fontSize: 11, color: C.mute }}>{order.first_name} {order.last_name}</div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{order.items?.length || 0}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: FONT_MONO }}>{formatMoney(order.order_total)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 12 }}>{formatDateShort(order.pickup_date)}</div>
                    <div style={{ fontSize: 11, color: C.mute }}>{to12h(order.pickup_time)}</div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{getStatusBadge(order.status)}</td>
                </tr>
                {expandedRows[order.id] && (
                  <tr key={order.id + '-detail'}>
                    <td colSpan={8} style={{ padding: '0 16px 12px 48px', background: C.softBg }}>
                      <div style={{ padding: 12, borderRadius: 8, border: `1px solid ${C.line}` }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                          Items Ordered
                        </div>
                        {order.items?.length > 0 ? (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr>
                                <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: C.mute, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Item</th>
                                <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600, color: C.mute, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Qty</th>
                                <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: C.mute, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Price</th>
                                <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: C.mute, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item, idx) => (
                                <tr key={idx} style={{ borderTop: `1px solid ${C.line}` }}>
                                  <td style={{ padding: '6px 8px', fontWeight: 500 }}>{item.name}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: FONT_MONO }}>{item.quantity}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: FONT_MONO }}>{formatMoney(item.unitPrice)}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: FONT_MONO, fontWeight: 500 }}>{formatMoney(item.lineTotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div style={{ padding: 8, color: C.faint, fontStyle: 'italic', fontSize: 12 }}>No items</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                        <button onClick={() => generateVoucherPDF({
                          voucherNo: order.invoice_number || '',
                          date: formatDateVoucher(order.pickup_date),
                          debit: order.account_name,
                          items: (order.items || []).map(i => ({ qty: String(i.quantity), desc: i.name, price: formatMoney(i.lineTotal) })),
                          total: formatMoney(order.order_total),
                        })}
                          style={{ padding: '8px 14px', border: 'none', borderRadius: 6, background: '#3B82F6', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileText size={13} /> Print Voucher
                        </button>
                        <button onClick={() => setDeletingOrder(order)}
                          style={{ padding: '8px 14px', border: `1px solid ${C.danger}`, borderRadius: 6, background: 'transparent', color: C.danger, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: C.faint, fontStyle: 'italic' }}>
                  <ShoppingCart size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <div>No orders found</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 20 }}>
          <div style={{ padding: '10px 16px', background: C.card, border: `1px solid ${C.line}`, borderRadius: 8 }}>
            <span style={{ fontSize: 11, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Orders: </span>
            <span style={{ fontWeight: 600, fontFamily: FONT_MONO }}>{filtered.length}</span>
          </div>
          <div style={{ padding: '10px 16px', background: C.card, border: `1px solid ${C.line}`, borderRadius: 8 }}>
            <span style={{ fontSize: 11, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total: </span>
            <span style={{ fontWeight: 600, fontFamily: FONT_MONO }}>{formatMoney(filtered.reduce((sum, o) => sum + (o.order_total || 0), 0))}</span>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal onClose={() => setSelectedOrder(null)} maxWidth={600}>
          <h3 style={{ margin: '0 0 4px', fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 500, color: C.ink }}>
            Order Detail
          </h3>
          <div style={{ fontSize: 13, color: C.mute, marginBottom: 16 }}>{selectedOrder.invoice_number || ''}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16, background: C.softBg, borderRadius: 8, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Name</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedOrder.first_name} {selectedOrder.last_name}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Email</div>
              <div style={{ fontSize: 14 }}>{selectedOrder.email}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Department</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedOrder.account_name}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Pickup</div>
              <div style={{ fontSize: 14 }}>{formatDateLong(selectedOrder.pickup_date)} at {to12h(selectedOrder.pickup_time)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Status</div>
              {getStatusBadge(selectedOrder.status)}
            </div>
          </div>

          {/* Items */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 10 }}>Items</div>
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.softBg }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: C.mute, fontSize: 11 }}>Item</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: C.mute, fontSize: 11 }}>Qty</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: C.mute, fontSize: 11 }}>Price</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: C.mute, fontSize: 11 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item, idx) => (
                    <tr key={idx} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{item.name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: FONT_MONO }}>{item.quantity}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: FONT_MONO }}>{formatMoney(item.unitPrice)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: FONT_MONO, fontWeight: 500 }}>{formatMoney(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, padding: '12px 16px', background: C.softBg, borderRadius: 8 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: C.mute, textTransform: 'uppercase' }}>Order Total</div>
              <div style={{ fontSize: 20, fontWeight: 600, fontFamily: FONT_BODY, color: C.ink }}>{formatMoney(selectedOrder.order_total)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setSelectedOrder(null)}
              style={{ padding: '10px 20px', border: `1px solid ${C.lineStrong}`, borderRadius: 8, background: C.card, cursor: 'pointer', fontSize: 13, fontFamily: FONT_BODY, color: C.ink }}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deletingOrder && (
        <ConfirmModal
          title="Delete Order"
          message={`Are you sure you want to permanently delete order ${deletingOrder.invoice_number || deletingOrder.id} from ${deletingOrder.account_name}? This cannot be undone.`}
          onConfirm={() => handleDelete(deletingOrder)}
          onCancel={() => setDeletingOrder(null)}
          confirmLabel="Delete"
          danger
        />
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { updateOrder, decrementStock, deleteOrder, getNextInvoiceNumber, logStockUsage } from '../lib/db';
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from '../shared/theme';
import { formatDateShort, formatDateLong, formatDateVoucher, formatMoney, to12h, firstOfMonth, todayISO } from '../shared/helpers';
import { ShoppingCart, Search, CheckCircle, XCircle, Clock, Eye, Truck, Mail, Edit2, Trash2, RefreshCw, FileText } from 'lucide-react';
import Modal from '../shared/Modal';
import generateVoucherPDF from '../print/generateVoucherPDF';
import ConfirmModal from '../shared/ConfirmModal';

const PRESETS = [
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'Last 7 Days', value: 'last7' },
  { label: 'All', value: 'all' },
];

export default function OrdersPage({ orders, showToast, onRefresh }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('thisMonth');
  const [startDate, setStartDate] = useState(firstOfMonth(todayISO()));
  const [endDate, setEndDate] = useState(todayISO());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [readyOrder, setReadyOrder] = useState(null);
  const [sendEmail, setSendEmail] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [pickingUpOrder, setPickingUpOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({});

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
    result = result.filter(o => o.status === 'pending' || o.status === 'ready');
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
        o.last_name?.toLowerCase().includes(q) ||
        o.email?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, statusFilter, startDate, endDate, search]);

  const handleMarkReady = async (order) => {
    try {
      const nextInvoiceNum = await getNextInvoiceNumber();
      const invoiceNum = String(nextInvoiceNum);

      await updateOrder(order.id, { status: 'ready', ready_at: new Date().toISOString(), invoice_number: invoiceNum });
      showToast('success', `Order marked as ready. Invoice #${invoiceNum}`);
      setReadyOrder(null);

      if (sendEmail) {
        const subject = encodeURIComponent(`Your Procurement Order is Ready for Pickup`);
        const body = encodeURIComponent(
          `Dear ${order.first_name},\n\n` +
          `Your procurement order ${invoiceNum} is ready for pickup.\n\n` +
          `Order Details:\n` +
          order.items.map(i => `  ${i.name} (${i.quantity})`).join('\n') +
          `\n  Total: ${formatMoney(order.order_total)}\n\n` +
          `Pickup Date: ${formatDateLong(order.pickup_date)}\n` +
          `Pickup Time: ${to12h(order.pickup_time)}\n\n` +
          `USC Procurement Department`
        );
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${order.email}&subject=${subject}&body=${body}`, '_blank');
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to mark order as ready.');
    }
  };

  const handlePickedUp = async (order) => {
    try {
      const now = new Date();
      const usageMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      for (const item of order.items) {
        await decrementStock(item.itemId, item.quantity);
        await logStockUsage({
          item_id: item.itemId,
          item_name: item.name,
          item_code: item.code || '',
          unit: item.unit || '',
          quantity: item.quantity,
          direction: 'decrease',
          reason: 'order_pickup',
          usage_month: usageMonth,
        });
      }
      await updateOrder(order.id, { status: 'picked_up', picked_up_at: now.toISOString() });
      showToast('success', 'Order picked up. Stock decremented.');
      setSelectedOrder(null);
    } catch (err) {
      showToast('error', err.message || 'Failed to update order.');
    }
  };

  const handleCancel = async (order) => {
    try {
      await updateOrder(order.id, { status: 'cancelled', cancelled_at: new Date().toISOString() });
      showToast('success', 'Order cancelled.');
      setSelectedOrder(null);
    } catch (err) {
      showToast('error', err.message || 'Failed to cancel order.');
    }
  };

  const handleDelete = async (order) => {
    try {
      await deleteOrder(order.id);
      showToast('success', 'Order deleted.');
      setDeletingOrder(null);
      setSelectedOrder(null);
    } catch (err) {
      showToast('error', err.message || 'Failed to delete order.');
    }
  };

  const handleEditSave = async () => {
    try {
      await updateOrder(editingOrder.id, editForm);
      showToast('success', 'Order updated.');
      setEditingOrder(null);
    } catch (err) {
      showToast('error', err.message || 'Failed to update order.');
    }
  };

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

  return (
    <div className="fade-in">
      <style>{`
        @media (max-width: 640px) {
          .ord-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .ord-filters { flex-direction: column !important; }
        }
      `}</style>

      <div className="ord-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 500, letterSpacing: '-0.015em' }}>
            Department Orders
          </h2>
          <p style={{ margin: '4px 0 0', color: C.mute, fontSize: 14 }}>
            Manage incoming orders from departments
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
      <div className="ord-filters" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.mute }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, name, email..."
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
          <option value="pending">Pending</option>
          <option value="ready">Ready</option>
        </select>
      </div>

      {/* Orders Table */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
          <thead>
            <tr style={{ background: C.softBg }}>
              {[
                { label: 'Invoice #', align: 'left' },
                { label: 'Date', align: 'left' },
                { label: 'Department', align: 'left' },
                { label: 'Items', align: 'center' },
                { label: 'Total', align: 'right' },
                { label: 'Pickup', align: 'left' },
                { label: 'Status', align: 'center' },
                { label: 'Actions', align: 'center' },
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
              <tr key={order.id} style={{ borderTop: `1px solid ${C.line}` }}>
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
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button onClick={() => setSelectedOrder(order)}
                      style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.lineStrong}`, borderRadius: 5, fontSize: 11, color: C.mute, cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Eye size={12} /> View
                    </button>
                    {order.status === 'pending' && (
                      <>
                        <button onClick={() => { setReadyOrder(order); setSendEmail(false); }}
                          style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.success}`, borderRadius: 5, fontSize: 11, color: C.success, cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Truck size={12} /> Ready
                        </button>
                        <button onClick={() => setCancellingOrder(order)}
                          style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.danger}`, borderRadius: 5, fontSize: 11, color: C.danger, cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <XCircle size={12} /> Cancel
                        </button>
                      </>
                    )}
                    {order.status === 'ready' && (
                      <button onClick={() => setPickingUpOrder(order)}
                        style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.mute}`, borderRadius: 5, fontSize: 11, color: C.mute, cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} /> Picked Up
                      </button>
                    )}
                    <button onClick={() => setDeletingOrder(order)}
                      style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.danger}60`, borderRadius: 5, fontSize: 11, color: C.danger, cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
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
              <div style={{ fontSize: 11, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Contact</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{selectedOrder.telephone || '—'}</div>
              {selectedOrder.invoice_number ? (
                <button type="button" onClick={() => {
                  const subject = encodeURIComponent(`Order ${selectedOrder.invoice_number || selectedOrder.id} - ${selectedOrder.account_name}`);
                  const body = encodeURIComponent(
                    `Dear ${selectedOrder.first_name},\n\n` +
                    `Regarding your procurement order scheduled for pickup at ${formatDateLong(selectedOrder.pickup_date)} at ${to12h(selectedOrder.pickup_time)}:\n\n` +
                    `USC Procurement Department`
                  );
                  window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${selectedOrder.email}&subject=${subject}&body=${body}`, '_blank');
                }}
                  style={{ padding: '4px 10px', border: `1px solid ${C.lineStrong}`, borderRadius: 5, background: C.card, cursor: 'pointer', fontSize: 11, fontFamily: FONT_BODY, color: C.ink, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={12} /> Gmail
                </button>
              ) : (
                <div style={{ fontSize: 11, color: C.mute, fontStyle: 'italic' }}>Add invoice # to email</div>
              )}
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
            {selectedOrder.invoice_number && (
              <div>
                <div style={{ fontSize: 11, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Invoice #</div>
                <div style={{ fontSize: 14, fontWeight: 500, fontFamily: FONT_MONO }}>{selectedOrder.invoice_number}</div>
              </div>
            )}
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
            <button onClick={() => {
              setEditingOrder(selectedOrder);
              setEditForm({
                first_name: selectedOrder.first_name,
                last_name: selectedOrder.last_name,
                email: selectedOrder.email,
                telephone: selectedOrder.telephone || '',
                account_name: selectedOrder.account_name,
                pickup_date: selectedOrder.pickup_date,
                pickup_time: selectedOrder.pickup_time,
                status: selectedOrder.status,
              });
              setSelectedOrder(null);
            }}
              style={{ padding: '10px 20px', border: `1px solid ${C.lineStrong}`, borderRadius: 8, background: C.card, cursor: 'pointer', fontSize: 13, fontFamily: FONT_BODY, color: C.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Edit2 size={14} /> Edit
            </button>
            <button onClick={() => { setDeletingOrder(selectedOrder); setSelectedOrder(null); }}
              style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: C.danger, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={14} /> Delete
            </button>
            {selectedOrder.status === 'ready' && (
              <button onClick={() => generateVoucherPDF({
                voucherNo: selectedOrder.invoice_number || '',
                date: formatDateVoucher(selectedOrder.pickup_date),
                debit: selectedOrder.account_name,
                items: (selectedOrder.items || []).map(i => ({ qty: String(i.quantity), desc: i.name, price: formatMoney(i.lineTotal) })),
                total: formatMoney(selectedOrder.order_total),
              })}
                style={{ padding: '10px 20px', border: 'none', borderRadius: 6, background: '#3B82F6', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={14} /> Print Voucher
              </button>
            )}
            {selectedOrder.status === 'pending' && (
              <>
                <button onClick={() => { setReadyOrder(selectedOrder); setSendEmail(false); setSelectedOrder(null); }}
                  style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: C.success, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Truck size={14} /> Mark Ready
                </button>
                <button onClick={() => { setCancellingOrder(selectedOrder); setSelectedOrder(null); }}
                  style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: C.danger, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY }}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Cancel Confirmation */}
      {cancellingOrder && (
        <ConfirmModal
          title="Cancel Order"
          message={`Are you sure you want to cancel order ${cancellingOrder.invoice_number || cancellingOrder.id} from ${cancellingOrder.account_name}? This action cannot be undone.`}
          onConfirm={() => { handleCancel(cancellingOrder); setCancellingOrder(null); }}
          onCancel={() => setCancellingOrder(null)}
          confirmLabel="Cancel Order"
          danger
        />
      )}

      {/* Ready Modal */}
      {readyOrder && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(43,35,25,0.5)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 200, padding: 20,
        }} onClick={() => setReadyOrder(null)}>
          <div style={{
            background: C.card, borderRadius: 16, padding: 32, maxWidth: 480, width: '100%',
            boxShadow: '0 20px 60px rgba(43,35,25,0.25)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, color: C.ink, textAlign: 'center' }}>
              Mark Order as Ready
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: C.mute, textAlign: 'center' }}>
              Order from <strong>{readyOrder.account_name}</strong> will be marked as ready for pickup.
            </p>
            <div style={{ marginBottom: 20, padding: 12, background: C.softBg, borderRadius: 8, fontSize: 13, color: C.mute, textAlign: 'center' }}>
              Invoice number will be auto-generated (starting from 10000).
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: C.softBg, borderRadius: 8, cursor: 'pointer', marginBottom: 20 }}>
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: C.primary }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>Send email notification</div>
                <div style={{ fontSize: 12, color: C.mute }}>Opens mail client with pre-filled email</div>
              </div>
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setReadyOrder(null)}
                style={{ padding: '12px 24px', border: `1px solid ${C.lineStrong}`, borderRadius: 8, background: C.card, cursor: 'pointer', fontSize: 14, fontFamily: FONT_BODY, color: C.ink }}>
                Cancel
              </button>
              <button onClick={() => handleMarkReady(readyOrder)}
                style={{ padding: '12px 24px', border: 'none', borderRadius: 8, background: C.success, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Truck size={14} /> Mark Ready
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingOrder && (
        <ConfirmModal
          title="Delete Order"
          message={`Are you sure you want to permanently delete order ${deletingOrder.invoice_number || deletingOrder.id}? This cannot be undone.`}
          onConfirm={() => handleDelete(deletingOrder)}
          onCancel={() => setDeletingOrder(null)}
          confirmLabel="Delete"
          danger
        />
      )}

      {/* Picked Up Confirmation */}
      {pickingUpOrder && (
        <ConfirmModal
          title="Mark as Picked Up"
          message={`Mark order ${pickingUpOrder.invoice_number || pickingUpOrder.id} from ${pickingUpOrder.account_name} as picked up?`}
          onConfirm={() => { handlePickedUp(pickingUpOrder); setPickingUpOrder(null); }}
          onCancel={() => setPickingUpOrder(null)}
          confirmLabel="Mark Picked Up"
        />
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <Modal onClose={() => setEditingOrder(null)} maxWidth={500}>
          <h3 style={{ margin: '0 0 16px', fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 500, color: C.ink }}>
            Edit Order <span style={{ fontFamily: FONT_MONO, fontSize: 14, color: C.mute }}>{editingOrder.id}</span>
          </h3>

          {(() => {
            const inputStyle = {
              width: '100%', padding: '10px 12px',
              border: `1px solid ${C.lineStrong}`, borderRadius: 6,
              background: C.card, fontSize: 13, fontFamily: FONT_BODY, color: C.ink,
            };
            const labelStyle = {
              display: 'block', fontSize: 11, color: C.mute, fontWeight: 500,
              marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
            };
            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                  <div>
                    <label style={labelStyle}>First Name</label>
                    <input value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name</label>
                    <input value={editForm.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Telephone</label>
                    <input value={editForm.telephone} onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Department</label>
                    <input value={editForm.account_name} onChange={e => setEditForm(f => ({ ...f, account_name: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Status</label>
                    <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="pending">Pending</option>
                      <option value="ready">Ready</option>
                      <option value="picked_up">Picked Up</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Pickup Date</label>
                    <input type="date" value={editForm.pickup_date} onChange={e => setEditForm(f => ({ ...f, pickup_date: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Pickup Time</label>
                    <input type="time" value={editForm.pickup_time} onChange={e => setEditForm(f => ({ ...f, pickup_time: e.target.value }))} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditingOrder(null)}
                    style={{ padding: '10px 20px', border: `1px solid ${C.lineStrong}`, borderRadius: 8, background: C.card, cursor: 'pointer', fontSize: 13, fontFamily: FONT_BODY, color: C.ink }}>
                    Cancel
                  </button>
                  <button onClick={handleEditSave}
                    style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: C.primary, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY }}>
                    Save Changes
                  </button>
                </div>
              </>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}

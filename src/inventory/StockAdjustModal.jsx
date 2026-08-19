import { useState } from 'react';
import { C, FONT_BODY } from '../shared/theme';
import { STOCK_ADJUSTMENT_REASONS } from '../shared/constants';
import { usePreventWheel, formatUnit } from '../shared/helpers';
import Modal from '../shared/Modal';

export default function StockAdjustModal({ item, units, onSave, onCancel }) {
  const [type, setType] = useState('increase');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Restock');
  const [notes, setNotes] = useState('');
  const wheelRef = usePreventWheel();

  const qty = parseInt(quantity, 10) || 0;
  const maxDecrease = item?.stock_count || 0;
  const canSave = qty > 0 && (type === 'increase' || qty <= maxDecrease);

  const getUnitLabel = (id) => (units || []).find(u => u.id === id)?.label || id;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    const newStock = type === 'increase'
      ? item.stock_count + qty
      : item.stock_count - qty;
    onSave({
      productId: item.id,
      productName: item.name,
      type,
      quantity: qty,
      newStock,
      reason,
      notes: notes.trim(),
    });
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${C.lineStrong}`,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: C.ink,
    background: C.card,
  };

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    color: C.mute,
    fontWeight: 500,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  };

  return (
    <Modal onClose={onCancel} maxWidth={420}>
      <h3 style={{ margin: '0 0 16px', fontFamily: FONT_BODY, fontSize: 18, fontWeight: 500, color: C.ink }}>
        Adjust Stock
      </h3>

      <div style={{ marginBottom: 16, padding: '12px 14px', background: C.softBg, borderRadius: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{item?.name}</div>
        <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>
          Current stock: {item?.stock_count} {formatUnit(item?.stock_count, getUnitLabel(item?.unit))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button type="button" onClick={() => setType('increase')} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${type === 'increase' ? C.success : C.lineStrong}`,
            background: type === 'increase' ? C.success + '15' : 'transparent',
            color: type === 'increase' ? C.success : C.mute,
            fontWeight: 600, fontSize: 13, fontFamily: FONT_BODY, cursor: 'pointer',
          }}>+ Increase</button>
          <button type="button" onClick={() => setType('decrease')} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${type === 'decrease' ? C.danger : C.lineStrong}`,
            background: type === 'decrease' ? C.dangerBg : 'transparent',
            color: type === 'decrease' ? C.danger : C.mute,
            fontWeight: 600, fontSize: 13, fontFamily: FONT_BODY, cursor: 'pointer',
          }}>- Decrease</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Quantity *</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
            min="1" max={type === 'decrease' ? maxDecrease : undefined}
            placeholder="0" style={inputStyle} ref={wheelRef} />
          {type === 'decrease' && qty > maxDecrease && (
            <div style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>
              Cannot exceed available stock ({maxDecrease})
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {STOCK_ADJUSTMENT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" style={inputStyle} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} style={{
            padding: '10px 20px', background: 'transparent', border: `1px solid ${C.lineStrong}`,
            borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: FONT_BODY, color: C.mute, cursor: 'pointer',
          }}>Cancel</button>
          <button type="submit" disabled={!canSave} style={{
            padding: '10px 24px', background: canSave ? (type === 'increase' ? C.success : C.danger) : C.faint,
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, color: '#FAF8F3',
            cursor: canSave ? 'pointer' : 'not-allowed',
          }}>Apply</button>
        </div>
      </form>
    </Modal>
  );
}

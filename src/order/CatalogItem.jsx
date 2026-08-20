import { useState } from 'react';
import { C, FONT_BODY, FONT_MONO } from '../shared/theme';
import { formatMoney, usePreventWheel } from '../shared/helpers';
import { Plus, Minus, AlertCircle, Package } from 'lucide-react';

export default function CatalogItem({ item, units, onAddToCart, onImageClick }) {
  const [qty, setQty] = useState(1);
  const [hovering, setHovering] = useState(false);
  const wheelRef = usePreventWheel();

  const getUnitLabel = (id) => (units || []).find(u => u.id === id)?.label || id;
  const outOfStock = item.stock_count <= 0;
  const lowStock = !outOfStock && item.stock_count <= 10;

  const handleAdd = () => {
    if (outOfStock) return;
    const cappedQty = Math.min(qty, item.stock_count);
    onAddToCart({ ...item, quantity: cappedQty });
    setQty(1);
  };

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.line}`, borderRadius: 10,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Image / Photo placeholder */}
      <div
        onClick={() => item.image_url && onImageClick?.({ name: item.name, description: item.description, imageUrl: item.image_url })}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          width: '100%', height: 180, borderRadius: 8,
          background: C.softBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative',
          cursor: item.image_url ? 'pointer' : 'default',
        }}
      >
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <Package size={32} style={{ color: C.faint }} />
        )}
        {hovering && item.description && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(43,35,25,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 12, borderRadius: 8,
          }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 1.4 }}>
              {item.description}
            </div>
          </div>
        )}
      </div>

      {/* Name & Category */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
          {item.name}
        </div>
        <div style={{
          display: 'inline-block', padding: '2px 8px', borderRadius: 4,
          fontSize: 11, fontWeight: 500, background: C.softBg, color: C.mute,
          textTransform: 'capitalize',
        }}>
          {item.category || 'Other'}
        </div>
      </div>

      {/* Price */}
      <div style={{ fontSize: 16, fontWeight: 600, fontFamily: FONT_MONO, color: C.ink }}>
        {formatMoney(item.unit_price)}
        <span style={{ fontSize: 11, fontWeight: 400, color: C.mute }}> / {getUnitLabel(item.unit)}</span>
      </div>

      {lowStock && (
        <div style={{
          padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
          background: C.gold + '20', color: C.gold,
        }}>
          {item.stock_count} left in stock
        </div>
      )}

      {outOfStock && (
        <div style={{
          padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
          background: C.dangerBg, color: C.danger, textTransform: 'uppercase',
        }}>
          Out of Stock
        </div>
      )}

      {/* Quantity + Add */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: outOfStock ? 0.5 : 1, pointerEvents: outOfStock ? 'none' : 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.lineStrong}`, borderRadius: 6, overflow: 'hidden' }}>
          <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))}
            style={{ padding: '6px 10px', background: C.softBg, border: 'none', cursor: 'pointer', color: C.mute }}>
            <Minus size={14} />
          </button>
          <input type="number" min="1" max={item.stock_count > 0 ? item.stock_count : 1} value={qty}
            onChange={(e) => setQty(Math.min(item.stock_count, Math.max(1, parseInt(e.target.value) || 1)))}
            ref={wheelRef}
            style={{ width: 40, textAlign: 'center', border: 'none', fontSize: 13, fontFamily: FONT_MONO, background: C.card }} />
          <button type="button" onClick={() => setQty(q => Math.min(item.stock_count, q + 1))}
            style={{ padding: '6px 10px', background: C.softBg, border: 'none', cursor: 'pointer', color: C.mute }}>
            <Plus size={14} />
          </button>
        </div>
        <button type="button" onClick={handleAdd} disabled={outOfStock}
          style={{
            flex: 1, padding: '8px 12px',
            background: outOfStock ? C.lineStrong : C.primary,
            color: outOfStock ? C.mute : '#fff',
            border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY,
            cursor: outOfStock ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          {outOfStock ? 'Out of Stock' : <><Plus size={14} /> Add to Cart</>}
        </button>
      </div>
    </div>
  );
}

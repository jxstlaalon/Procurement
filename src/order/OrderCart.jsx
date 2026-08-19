import { useState } from 'react';
import { C, FONT_BODY, FONT_MONO } from '../shared/theme';
import { formatMoney } from '../shared/helpers';
import { ShoppingCart, X, Trash2, Package } from 'lucide-react';

export default function OrderCart({ cart, onUpdateQty, onRemoveItem, onClearCart, onImageClick }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const orderTotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  if (cart.length === 0) {
    return (
      <div style={{
        background: C.card, border: `1px solid ${C.line}`, borderRadius: 10,
        padding: 24, textAlign: 'center',
      }}>
        <ShoppingCart size={32} style={{ color: C.faint, marginBottom: 8 }} />
        <div style={{ fontSize: 13, color: C.mute }}>Your cart is empty</div>
        <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>Add items from the catalog</div>
      </div>
    );
  }

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.line}`, borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: C.softBg,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: `1px solid ${C.line}`,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShoppingCart size={16} />
          Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
        </div>
        <button type="button" onClick={onClearCart}
          style={{
            padding: '4px 8px', background: 'transparent', border: `1px solid ${C.danger}`,
            borderRadius: 4, fontSize: 11, color: C.danger, cursor: 'pointer', fontFamily: FONT_BODY,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
          <Trash2 size={12} /> Clear
        </button>
      </div>

      {/* Items */}
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {cart.map((item, idx) => (
          <div key={item.id || idx} style={{
            padding: '10px 16px', borderBottom: `1px solid ${C.line}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {/* Thumbnail */}
            <div
              onClick={() => item.image_url && onImageClick?.({ name: item.name, description: item.description, imageUrl: item.image_url })}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                width: 40, height: 40, borderRadius: 6, overflow: 'hidden', flexShrink: 0,
                background: C.softBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: item.image_url ? 'pointer' : 'default', position: 'relative',
              }}
            >
              {item.image_url ? (
                <>
                  <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {hoveredIdx === idx && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                      background: C.ink, color: '#fff', padding: '6px 10px', borderRadius: 6,
                      fontSize: 12, whiteSpace: 'nowrap', zIndex: 10, marginBottom: 4,
                      maxWidth: 200, whiteSpace: 'normal', textAlign: 'center', lineHeight: 1.3,
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: item.description ? 2 : 0 }}>{item.name}</div>
                      {item.description && <div style={{ fontSize: 11, opacity: 0.85 }}>{item.description}</div>}
                    </div>
                  )}
                </>
              ) : (
                <Package size={16} style={{ color: C.faint }} />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </div>
              <div style={{ fontSize: 12, color: C.mute, fontFamily: FONT_MONO }}>
                {formatMoney(item.unitPrice)} × {item.quantity}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT_MONO, color: C.ink, flexShrink: 0 }}>
              {formatMoney(item.unitPrice * item.quantity)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <button type="button" onClick={() => onUpdateQty(idx, Math.max(1, item.quantity - 1))}
                style={{ padding: '2px 6px', background: C.softBg, border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 12, color: C.mute }}>
                -
              </button>
              <span style={{ fontSize: 12, fontFamily: FONT_MONO, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
              <button type="button" onClick={() => onUpdateQty(idx, Math.min(item.stockCount || 999, item.quantity + 1))}
                style={{ padding: '2px 6px', background: C.softBg, border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 12, color: C.mute }}>
                +
              </button>
            </div>
            <button type="button" onClick={() => onRemoveItem(idx)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint, padding: 2, flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{
        padding: '12px 16px', borderTop: `1px solid ${C.lineStrong}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Order Total</div>
        <div style={{ fontSize: 18, fontWeight: 600, fontFamily: FONT_MONO, color: C.ink }}>
          {formatMoney(orderTotal)}
        </div>
      </div>
    </div>
  );
}

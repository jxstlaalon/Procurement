import { useState } from 'react';
import { C, FONT_BODY, FONT_MONO } from '../shared/theme';
import { formatMoney } from '../shared/helpers';
import { ShoppingCart, X, Trash2, Package } from 'lucide-react';

export default function FloatingCart({ cart, onUpdateQty, onRemoveItem, onClearCart, onImageClick }) {
  const [open, setOpen] = useState(false);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const orderTotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 150,
          width: 56, height: 56, borderRadius: '50%',
          background: C.primary, color: '#FAF8F3',
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(94,183,106,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ShoppingCart size={22} />
        {totalItems > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 22, height: 22, borderRadius: '50%',
            background: C.danger, color: '#fff',
            fontSize: 11, fontWeight: 700, fontFamily: FONT_MONO,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {totalItems}
          </span>
        )}
      </button>

      {totalItems > 0 && !open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 150,
          background: C.card, border: `1px solid ${C.line}`, borderRadius: 8,
          padding: '6px 12px', boxShadow: '0 4px 12px rgba(43,35,25,0.12)',
          fontSize: 13, fontWeight: 600, fontFamily: FONT_MONO, color: C.ink,
        }}>
          {formatMoney(orderTotal)}
        </div>
      )}

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 160,
            background: 'rgba(43,35,25,0.4)', backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 170,
        background: C.card, borderRadius: '16px 16px 0 0',
        boxShadow: '0 -8px 32px rgba(43,35,25,0.2)',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .25s ease',
        pointerEvents: open ? 'auto' : 'none',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '10px 0 4px', cursor: 'pointer',
        }} onClick={() => setOpen(false)}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.lineStrong }} />
        </div>

        <div style={{
          padding: '8px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: `1px solid ${C.line}`,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={18} />
            Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {cart.length > 0 && (
              <button type="button" onClick={onClearCart}
                style={{
                  padding: '4px 10px', background: 'transparent', border: `1px solid ${C.danger}`,
                  borderRadius: 4, fontSize: 11, color: C.danger, cursor: 'pointer', fontFamily: FONT_BODY,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <Trash2 size={12} /> Clear
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.mute, padding: 4 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {cart.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <ShoppingCart size={32} style={{ color: C.faint, marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: C.mute }}>Your cart is empty</div>
            <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>Add items from the catalog</div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
            {cart.map((item, idx) => (
              <div key={item.id || idx} style={{
                padding: '12px 0', borderBottom: `1px solid ${C.line}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0,
                  background: C.softBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: item.image_url ? 'pointer' : 'default',
                }}
                  onClick={() => item.image_url && onImageClick?.({ name: item.name, description: item.description, imageUrl: item.image_url })}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Package size={16} style={{ color: C.faint }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.mute, fontFamily: FONT_MONO }}>
                    {formatMoney(item.unitPrice)} x {item.quantity}
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT_MONO, color: C.ink, flexShrink: 0 }}>
                  {formatMoney(item.unitPrice * item.quantity)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <button type="button" onClick={() => onUpdateQty(idx, Math.max(1, item.quantity - 1))}
                    style={{ padding: '4px 8px', background: C.softBg, border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 14, color: C.mute }}>
                    -
                  </button>
                  <span style={{ fontSize: 13, fontFamily: FONT_MONO, minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                  <button type="button" onClick={() => onUpdateQty(idx, Math.min(item.stockCount || 999, item.quantity + 1))}
                    style={{ padding: '4px 8px', background: C.softBg, border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 14, color: C.mute }}>
                    +
                  </button>
                </div>

                <button type="button" onClick={() => onRemoveItem(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint, padding: 4, flexShrink: 0 }}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && (
          <div style={{
            padding: '14px 20px', borderTop: `1px solid ${C.lineStrong}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>Order Total</div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: FONT_MONO, color: C.ink }}>
              {formatMoney(orderTotal)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

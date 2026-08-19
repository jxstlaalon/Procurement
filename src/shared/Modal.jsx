import { X } from 'lucide-react';
import { C } from './theme';

export default function Modal({ children, onClose, maxWidth = 400 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(43,35,25,0.4)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 100, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.card, borderRadius: 14, padding: 28,
          maxWidth, width: '100%', position: 'relative', maxHeight: '80vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(43,35,25,0.25)',
        }}
      >
        <button onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
            cursor: 'pointer', color: C.faint, padding: 4, display: 'flex',
          }}>
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

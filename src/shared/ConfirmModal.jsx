import Modal from './Modal';
import { C, FONT_BODY } from './theme';

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal onClose={onCancel} maxWidth={380}>
      <h3 style={{ margin: '0 0 8px', fontFamily: FONT_BODY, fontSize: 18, fontWeight: 500, color: C.ink }}>
        {title}
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: C.mute, lineHeight: 1.5 }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel}
          style={{
            padding: '10px 20px', border: `1px solid ${C.lineStrong}`, borderRadius: 8,
            background: C.card, cursor: 'pointer', fontSize: 13, color: C.ink, fontFamily: FONT_BODY,
          }}>
          Cancel
        </button>
        <button onClick={onConfirm}
          style={{
            padding: '10px 20px', border: 'none', borderRadius: 8,
            background: danger ? C.danger : C.primary, color: '#fff',
            cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY,
          }}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

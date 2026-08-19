import { C, FONT_DISPLAY, FONT_BODY } from './theme';
import Modal from './Modal';

export default function ItemImageViewer({ item, onClose }) {
  return (
    <Modal onClose={onClose} maxWidth={420}>
      <div style={{ padding: 0, width: '100%', textAlign: 'center' }}>
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.name}
            style={{
              width: '100%', height: 'auto', objectFit: 'contain',
              borderRadius: '10px 10px 0 0', background: '#f5f5f5',
            }}
          />
        )}
        <div style={{ background: 'rgba(94,183,106,0.12)', borderRadius: '0 0 10px 10px', padding: 16 }}>
          <h3 style={{
            margin: '0 0 4px', fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 500,
            color: C.ink,
          }}>
            {item.name}
          </h3>
          {item.description && (
            <p style={{
              margin: 0, fontFamily: FONT_BODY, fontSize: 13, color: C.mute,
              lineHeight: 1.4,
            }}>
              {item.description}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

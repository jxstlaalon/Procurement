import { C, FONT_MONO } from './theme';

export default function DateField({ label, value, onChange }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 11, color: C.mute, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <input type="date" value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 12px',
          border: `1px solid ${C.lineStrong}`, borderRadius: 6,
          background: C.card, fontSize: 14, fontFamily: FONT_MONO, color: C.ink,
        }}
      />
    </label>
  );
}

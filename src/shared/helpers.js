import { useEffect, useRef } from 'react';

export function usePreventWheel() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e) => e.preventDefault();
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);
  return ref;
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export const firstOfMonth = (iso) => iso.slice(0, 8) + '01';

export const formatDateShort = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m-1, d).toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatMoney = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const to12h = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const formatCreatedAt = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  let h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${date} - ${h}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const formatMonth = (ds) => {
  if (!ds) return '';
  const [y, m] = ds.split('-').map(Number);
  return new Date(y, m-1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const formatDateTime = (ds) => {
  if (!ds) return '';
  const [y, m, d] = ds.split('-').map(Number);
  return new Date(y, m-1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatOrdinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const formatDateLong = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${month} ${formatOrdinal(d)} ${y}`;
};

export const formatDateVoucher = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const yy = String(y).slice(-2);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${yy}`;
};

const PLURALS = { box: 'boxes', piece: 'pieces' };

export const formatUnit = (qty, label) => {
  const s = (label || '').toLowerCase();
  if (qty === 1) return s;
  return PLURALS[s] || s + 's';
};

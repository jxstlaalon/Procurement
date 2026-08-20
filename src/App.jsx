import { useState, useEffect, useRef } from 'react';
import { Package, ShoppingCart, ClipboardList, FileDown, ShieldCheck, User, X } from 'lucide-react';
import { C, FONT_DISPLAY, FONT_BODY } from './shared/theme';
import { todayISO } from './shared/helpers';
import { ITEM_CATEGORIES } from './shared/constants';
import { getInventory, getOrders, getUnits, getConfig, updateConfig } from './lib/db';
import { supabase } from './lib/supabase';

import ItemsPage from './items/ItemsPage';
import InventoryPage from './inventory/InventoryPage';
import PastOrdersPage from './pastorders/PastOrdersPage';
import OrderPage from './order/OrderPage';
import OrdersPage from './orders/OrdersPage';
import ExportPage from './export/ExportPage';

const PUBLIC_NAV = [
  { id: 'items',     label: 'Items',       icon: Package },
  { id: 'order',     label: 'Place Order', icon: ClipboardList },
];

const ADMIN_NAV = [
  { id: 'items',       label: 'Items',         icon: Package },
  { id: 'order',       label: 'Place Order',   icon: ClipboardList },
  { id: 'inventory',   label: 'Inventory',     icon: Package },
  { id: 'orders',      label: 'Orders',        icon: ShoppingCart },
  { id: 'pastorders',  label: 'Past Orders',   icon: ClipboardList },
  { id: 'export',      label: 'Export',        icon: FileDown },
];

export default function App() {
  const [view, setView] = useState('items');
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [toast, setToast] = useState(null);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('procurement_cart')) || []; }
    catch { return []; }
  });
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef(null);

  useEffect(() => {
    localStorage.setItem('procurement_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    }).catch(() => {});

    let sub;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      sub = data?.subscription;
    } catch {}

    return () => sub?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) setView('items');
  }, [user]);

  const NAV_ITEMS = user ? ADMIN_NAV : PUBLIC_NAV;

  const loadInventory = async () => {
    try {
      const data = await getInventory();
      setInventory(data);
    } catch (err) {
      console.warn('Inventory load error:', err.message);
    }
  };

  const loadOrders = async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (err) {
      console.warn('Orders load error:', err.message);
    }
  };

  const loadUnits = async () => {
    try {
      const data = await getUnits();
      setUnits(data);
    } catch (err) {
      console.warn('Units load error:', err.message);
    }
  };

  useEffect(() => {
    loadInventory();
    loadOrders();
    loadUnits();

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        loadInventory();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, () => {
        loadUnits();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime channel error, reconnecting...');
          setTimeout(() => channel.subscribe(), 3000);
        }
      });

    const heartbeat = setInterval(() => {
      if (channel.state === 'closed') {
        console.warn('Realtime channel closed, resubscribing...');
        channel.subscribe();
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem('settingsSeeded')) return;
    (async () => {
      try {
        const existing = await getConfig();
        if (!existing) {
          await updateConfig({
            categories: ITEM_CATEGORIES.map(c => ({ id: c.id, label: c.label })),
          });
        } else if (!existing.categories || existing.categories.length === 0) {
          await updateConfig({
            categories: ITEM_CATEGORIES.map(c => ({ id: c.id, label: c.label })),
          });
        }
        sessionStorage.setItem('settingsSeeded', '1');
      } catch (err) {
        console.warn('Settings seed error:', err.message);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const config = await getConfig();
        if (config?.categories?.length) {
          setCategories(config.categories);
        } else {
          setCategories(ITEM_CATEGORIES.map(c => ({ id: c.id, label: c.label })));
        }
      } catch {
        setCategories(ITEM_CATEGORIES.map(c => ({ id: c.id, label: c.label })));
      }
    })();
  }, []);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async () => {
    if (!loginPassword) { setLoginError('Enter a password.'); return; }
    setLoginError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'procurement@usc.edu.tt',
        password: loginPassword,
      });
      if (error) throw error;
      setShowLogin(false);
      setLoginPassword('');
    } catch (err) {
      setLoginError(err.message?.replace('Auth session missing:', 'Invalid credentials.') || 'Login failed');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('items');
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id
          ? { ...c, quantity: c.quantity + item.quantity }
          : c
        );
      }
      return [...prev, {
        id: item.id, name: item.name, unitPrice: item.unit_price,
        quantity: item.quantity, stockCount: item.stock_count,
        image_url: item.image_url || '', description: item.description || '',
      }];
    });
  };

  const updateCartQty = (idx, qty) => {
    setCart(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const capped = Math.min(qty, item.stockCount || 999);
      return { ...item, quantity: Math.max(1, capped) };
    }));
  };

  const removeFromCart = (idx) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const clearCart = () => setCart([]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, color: C.ink, fontFamily: FONT_BODY }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        input:focus, button:focus, select:focus { outline: none; }
        input:focus-visible, button:focus-visible { box-shadow: 0 0 0 3px ${C.softBg}, 0 0 0 4px ${C.primary}; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        .fade-in { animation: fadeIn .25s ease; }

        @media (max-width: 1024px) {
          .app-header { flex-direction: column !important; gap: 16px !important; padding: 16px 20px !important; }
          .app-logo-img { width: 140px !important; height: 78px !important; }
          .app-title { font-size: 22px !important; }
          .app-main { padding: 20px 16px 16px !important; }
          .app-footer { padding: 24px 20px !important; }
          .app-footer-logo { width: 260px !important; }
        }

        @media (max-width: 768px) {
          .app-header { max-width: 100% !important; padding: 16px 14px !important; }
          .app-main { max-width: 100% !important; }
          .app-footer { max-width: 100% !important; }
          .app-footer > div { max-width: 100% !important; }
          .app-nav { max-width: 100% !important; padding: 0 14px !important; }
        }

        @media (max-width: 640px) {
          .app-header { padding: 12px 14px !important; gap: 12px !important; flex-direction: column !important; align-items: center !important; text-align: center !important; }
          .app-header-left { flex-direction: column !important; align-items: center !important; gap: 8px !important; }
          .app-logo-img { width: 120px !important; height: 66px !important; }
          .app-subtitle { display: none !important; }
          .app-title { font-size: 18px !important; }
          .app-main { padding: 16px 12px 12px !important; }
          .app-nav { gap: 0 !important; padding: 0 12px !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; scrollbar-width: none !important; }
          .app-nav::-webkit-scrollbar { display: none !important; }
          .app-nav-btn { padding: 12px 12px !important; font-size: 12px !important; white-space: nowrap !important; flex-shrink: 0 !important; }
          .app-footer { padding: 20px 14px !important; gap: 8px !important; }
          .app-footer-logo { width: 200px !important; }
          .app-footer-brand { font-size: 14px !important; }
        }
      `}</style>

      {/* ================ HEADER ================ */}
      <header style={{ backgroundColor: C.card, borderBottom: `1px solid ${C.line}` }}>
        <div className="app-header" style={{ maxWidth: 1200, margin: '0 auto', padding: '18px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, position: 'relative' }}>
          <div className="app-header-left" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img
              className="app-logo-img"
              src="usc.png"
              alt="USC Procurement"
              onClick={() => {
                if (!user) {
                  logoClickCount.current++;
                  if (logoClickCount.current === 3) {
                    clearTimeout(logoClickTimer.current);
                    logoClickCount.current = 0;
                    setShowLogin(true);
                    setLoginMode(null);
                    setLoginPassword('');
                    setLoginError('');
                  } else {
                    clearTimeout(logoClickTimer.current);
                    logoClickTimer.current = setTimeout(() => {
                      logoClickCount.current = 0;
                    }, 500);
                  }
                }
              }}
              style={{ width: 180, height: 100, objectFit: 'contain', flexShrink: 0, cursor: user ? 'default' : 'pointer' }}
            />
            <div>
              <div className="app-subtitle" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.28em', color: C.mute, fontWeight: 500 }}>
                Procurement Department
              </div>
              <h1 className="app-title" style={{ margin: '2px 0 0', fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 500, letterSpacing: '-0.015em', color: C.ink }}>
                Procurement Admin Assistant
              </h1>
            </div>
          </div>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.ink }}>
                <ShieldCheck size={16} style={{ color: C.primary }} />
                <span style={{ fontWeight: 600 }}>Admin</span>
              </div>
              <button onClick={handleLogout}
                style={{
                  padding: '6px 14px', background: 'transparent', border: `1px solid ${C.lineStrong}`,
                  borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: FONT_BODY, color: C.mute,
                  cursor: 'pointer', transition: 'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.danger; e.currentTarget.style.color = C.danger; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.lineStrong; e.currentTarget.style.color = C.mute; }}>
                Logout
              </button>
            </div>
          )}
        </div>

        {NAV_ITEMS.length > 0 && (
        <nav className="app-nav" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', display: 'flex', gap: 2, borderTop: `1px solid ${C.line}` }}>
          {NAV_ITEMS.map(t => {
            const active = view === t.id;
            const Ico = t.icon;
            return (
              <button
                key={t.id}
                className="app-nav-btn"
                onClick={() => setView(t.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '14px 18px', fontSize: 13, fontWeight: 500, fontFamily: FONT_BODY,
                  color: active ? C.primary : C.mute,
                  borderBottom: `2px solid ${active ? C.primary : 'transparent'}`,
                  marginBottom: -1,
                  display: 'flex', alignItems: 'center', gap: 8,
                  letterSpacing: '0.02em',
                  transition: 'color .15s',
                }}
              >
                <Ico size={15} strokeWidth={active ? 2.2 : 1.8} />
                {t.label}
              </button>
            );
          })}
        </nav>
        )}
      </header>

      {/* ================ MAIN ================ */}
      <main className="app-main" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 28px 24px' }}>
        {view === 'items' && <ItemsPage inventory={inventory} categories={categories} cart={cart} addToCart={addToCart} updateCartQty={updateCartQty} removeFromCart={removeFromCart} clearCart={clearCart} />}
        {view === 'order' && <OrderPage inventory={inventory} categories={categories} units={units} cart={cart} addToCart={addToCart} updateCartQty={updateCartQty} removeFromCart={removeFromCart} clearCart={clearCart} setCart={setCart} />}
        {view === 'inventory' && <InventoryPage inventory={inventory} categories={categories} setCategories={setCategories} units={units} setUnits={setUnits} showToast={showToast} onRefresh={loadInventory} />}
        {view === 'orders' && <OrdersPage orders={orders} showToast={showToast} onRefresh={loadOrders} />}
        {view === 'pastorders' && <PastOrdersPage orders={orders} onRefresh={loadOrders} showToast={showToast} />}
        {view === 'export' && <ExportPage orders={orders} inventory={inventory} showToast={showToast} />}
      </main>

      {/* ================ FOOTER ================ */}
      <footer className="app-footer" style={{ borderTop: `1px solid ${C.line}`, backgroundColor: C.card, marginTop: 40 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <img className="app-footer-logo" src="usclogo.png" alt="USC" style={{ width: 340, maxWidth: '100%', height: 'auto' }} />
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <div className="app-footer-brand" style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 500, color: C.ink, letterSpacing: '0.01em' }}>
              USC Procurement Department
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.mute, fontStyle: 'italic', textAlign: 'center', maxWidth: 600, lineHeight: 1.6 }}>
            &ldquo;For I know the plans I have for you,&rdquo; declares the LORD, &ldquo;plans to prosper you and not to harm you, plans to give you hope and a future.&rdquo;
          </div>
          <div style={{ fontSize: 12, color: C.mute, textAlign: 'center', marginTop: -4 }}>
            Jeremiah 29:11
          </div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.28em', color: C.faint, fontWeight: 500, textAlign: 'center', lineHeight: 1.8 }}>
            Made by Aalon Peters · 2026<br />Version 1.0
          </div>
        </div>
      </footer>

      {/* ================ LOGIN MODAL ================ */}
      {showLogin && !user && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setShowLogin(false); setLoginMode(null); setLoginPassword(''); setLoginError(''); } }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(43,35,25,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}>
          <div style={{
            background: C.card, borderRadius: 14, width: '100%', maxWidth: 320,
            boxShadow: '0 12px 40px rgba(43,35,25,0.25)', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 0' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Sign in as
              </span>
              <button onClick={() => { setShowLogin(false); setLoginMode(null); setLoginPassword(''); setLoginError(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint, padding: 2, display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {!loginMode ? (
              <div style={{ padding: '8px 18px 18px' }}>
                <button onClick={() => { setLoginMode('admin'); setLoginPassword(''); setLoginError(''); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer',
                    borderRadius: 8, fontSize: 14, fontFamily: FONT_BODY, color: C.ink,
                    transition: 'background .1s', textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.softBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <ShieldCheck size={18} style={{ color: C.primary }} />
                  <span style={{ fontWeight: 600 }}>Admin</span>
                </button>
              </div>
            ) : (
              <div style={{ padding: '8px 18px 18px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 16 }}>
                  Admin Login
                </div>
                <input type="password" value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
                  placeholder="Enter password"
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 12px', border: `1px solid ${C.lineStrong}`,
                    borderRadius: 6, background: C.card, fontSize: 16, fontFamily: FONT_BODY,
                    color: C.ink, marginBottom: 8,
                  }} />
                {loginError && <div style={{ fontSize: 12, color: C.danger, marginBottom: 8 }}>{loginError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setLoginMode(null); setLoginError(''); setLoginPassword(''); }}
                    style={{
                      flex: 1, padding: '10px', background: 'transparent', color: C.mute,
                      border: `1px solid ${C.lineStrong}`, borderRadius: 6, cursor: 'pointer',
                      fontSize: 13, fontWeight: 500, fontFamily: FONT_BODY,
                    }}>
                    Back
                  </button>
                  <button onClick={handleLogin}
                    style={{
                      flex: 1, padding: '10px', background: C.primary, color: '#fff',
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY,
                    }}>
                    Sign In
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================ TOAST ================ */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          padding: '12px 20px', borderRadius: 8,
          background: toast.type === 'success' ? C.successBg : C.dangerBg,
          color: toast.type === 'success' ? C.success : C.danger,
          fontSize: 13, fontWeight: 500, fontFamily: FONT_BODY,
          boxShadow: '0 8px 24px rgba(43,35,25,0.15)',
          animation: 'fadeIn .2s ease',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

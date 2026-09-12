import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Plus, Trash2, Pencil, X, ChevronDown,
  Package, BarChart3, TrendingUp, RefreshCw, Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import TabBar     from '../components/ui/TabBar';
import { INPUT_CLS } from '../components/ui/Input';
import { ModalHeader } from '../components/ui/Modal';

const CANTEEN_TABS = [
  { id: 'sales',  label: 'Daily Sales' },
  { id: 'items',  label: 'Items' },
  { id: 'wallet', label: 'Student Wallets' },
  { id: 'report', label: 'Monthly Report' },
];
import {
  getItems, createItem, updateItem, deleteItem,
  getSales, createSale, deleteSale, getMonthlySalesReport,
  getWallet, topupWallet,
} from '../api/canteen';
import { useStudentsPicker } from '../hooks/useReferenceData';

const inp = INPUT_CLS;
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);
const fmtCur = (n) => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 });

const CATEGORIES = ['food', 'snacks', 'drinks', 'stationery', 'other'];

function ItemModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState(
    item ? { name: item.name, category: item.category || 'food', price: item.price, unit: item.unit || 'pcs', available: item.available !== false }
         : { name: '', category: 'food', price: '', unit: 'pcs', available: true }
  );
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name required');
    if (!form.price) return toast.error('Price required');
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price) };
      if (item) { await updateItem(item.id, payload); toast.success('Item updated'); }
      else { await createItem(payload); toast.success('Item created'); }
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <ModalHeader title={item ? 'Edit Item' : 'Add Canteen Item'} onClose={onClose} />
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Item name *" className={inp} />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <select value={form.category} onChange={e => set('category', e.target.value)} className={`${inp} appearance-none pr-8`}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
            <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="Price (Rs) *" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="Unit (pcs, plate…)" className={inp} />
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input type="checkbox" checked={form.available} onChange={e => set('available', e.target.checked)} className="w-4 h-4 accent-indigo-600" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Available</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {saving ? 'Saving…' : item ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── WALLET TAB ──────────────────────────────────────────────── */
function WalletTab() {
  // No status filter here (unlike the default picker) — canteen wallet top-ups
  // apply to any student regardless of active/inactive status.
  const { data: students = [] }     = useStudentsPicker({ status: undefined });
  const [studentId,  setStudentId]  = useState('');
  const [wallet,     setWallet]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [topupAmt,   setTopupAmt]   = useState('');
  const [topupNote,  setTopupNote]  = useState('');
  const [topping,    setTopping]    = useState(false);

  const loadWallet = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true);
    try {
      const r = await getWallet(sid);
      setWallet(r.data?.data ?? r.data ?? null);
    } catch { toast.error('Failed to load wallet'); }
    finally { setLoading(false); }
  }, []);

  const handleTopup = async () => {
    if (!studentId || !topupAmt || +topupAmt <= 0) { toast.error('Select student and enter amount'); return; }
    setTopping(true);
    try {
      await topupWallet({ student_id: +studentId, amount: +topupAmt, note: topupNote || 'Manual top-up' });
      toast.success(`Rs ${topupAmt} added`);
      setTopupAmt(''); setTopupNote('');
      loadWallet(studentId);
    } catch (err) { toast.error(err.response?.data?.message || 'Top-up failed'); }
    finally { setTopping(false); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
          <Wallet size={15} /> Student Canteen Wallet
        </h3>
        <select value={studentId} onChange={e => { setStudentId(e.target.value); loadWallet(e.target.value); setWallet(null); }}
          className="w-full max-w-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30">
          <option value="">— Select a student —</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name || s.full_name} ({s.roll_number})</option>)}
        </select>
      </div>

      {studentId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Balance + Top-up */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 py-4"><div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Wallet size={22} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Current Balance</p>
                  <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Rs {fmtCur(wallet?.balance ?? 0)}</p>
                </div>
              </div>
            )}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500">Add Balance</p>
              <div className="flex gap-2">
                <input type="number" min="1" value={topupAmt} onChange={e => setTopupAmt(e.target.value)}
                  placeholder="Amount (Rs)" className={inp + ' flex-1'} />
                <input value={topupNote} onChange={e => setTopupNote(e.target.value)}
                  placeholder="Note (optional)" className={inp + ' flex-1'} />
              </div>
              <button onClick={handleTopup} disabled={topping}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold disabled:opacity-50 transition">
                {topping ? 'Adding…' : '+ Add Balance'}
              </button>
            </div>
          </div>

          {/* Transaction history */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Recent Transactions</h4>
            </div>
            {!wallet?.transactions?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Wallet size={28} className="mb-2 opacity-30" />
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>{['Date','Type','Amount','Balance After','Note'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {wallet.transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${t.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.type}</span>
                      </td>
                      <td className={`px-4 py-2.5 text-xs font-bold ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'credit' ? '+' : '-'}Rs {fmtCur(t.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400">Rs {fmtCur(t.balance_after)}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{t.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CanteenPage() {
  const [tab, setTab] = useState('sales');
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Daily Sales
  const [saleDate, setSaleDate] = useState(today());
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [cart, setCart] = useState([]); // [{item, qty}]
  const [recordingSale, setRecordingSale] = useState(false);

  // Items tab
  const [modal, setModal] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  // Monthly Report
  const [reportMonth, setReportMonth] = useState(thisMonth());
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const r = await getItems();
      const d = r.data?.data ?? r.data ?? [];
      setItems(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load items'); }
    finally { setLoadingItems(false); }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const loadSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      const r = await getSales({ date: saleDate });
      const d = r.data?.data ?? r.data ?? [];
      setSales(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load sales'); }
    finally { setLoadingSales(false); }
  }, [saleDate]);

  useEffect(() => { if (tab === 'sales') loadSales(); }, [tab, loadSales]);

  const loadReport = useCallback(async () => {
    setLoadingReport(true);
    try {
      const r = await getMonthlySalesReport({ month: reportMonth });
      setReport(r.data?.data ?? r.data ?? null);
    } catch { toast.error('Failed to load report'); }
    finally { setLoadingReport(false); }
  }, [reportMonth]);

  useEffect(() => { if (tab === 'report') loadReport(); }, [tab, loadReport]);

  const addToCart = (item) => {
    setCart(c => {
      const existing = c.find(x => x.item.id === item.id);
      if (existing) return c.map(x => x.item.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { item, qty: 1 }];
    });
  };

  const updateCartQty = (itemId, qty) => {
    if (qty <= 0) { setCart(c => c.filter(x => x.item.id !== itemId)); return; }
    setCart(c => c.map(x => x.item.id === itemId ? { ...x, qty } : x));
  };

  const cartTotal = cart.reduce((sum, x) => sum + Number(x.item.price) * x.qty, 0);

  const handleRecordSale = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    setRecordingSale(true);
    try {
      for (const { item, qty } of cart) {
        await createSale({ item_id: item.id, quantity: qty, sale_date: saleDate, unit_price: item.price });
      }
      toast.success('Sales recorded');
      setCart([]);
      loadSales();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to record sales'); }
    finally { setRecordingSale(false); }
  };

  const handleDeleteSale = async (id) => {
    try {
      await deleteSale(id);
      toast.success('Sale deleted');
      loadSales();
    } catch { toast.error('Delete failed'); }
  };

  const handleDeleteItem = async (id) => {
    try {
      await deleteItem(id);
      toast.success('Item deleted');
      setDeletingItem(null);
      loadItems();
    } catch { toast.error('Delete failed'); }
  };

  const todayRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <PageHeader
            icon={ShoppingCart}
            title="Canteen"
            subtitle="POS & canteen revenue tracking"
          />

          {/* Tabs */}
          <TabBar tabs={CANTEEN_TABS} active={tab} onChange={setTab} />

          {/* ── Daily Sales Tab ── */}
          {tab === 'sales' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none" />
                <button onClick={loadSales} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <RefreshCw className={`w-4 h-4 ${loadingSales ? 'animate-spin' : ''}`} />
                </button>
                {todayRevenue > 0 && (
                  <div className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Rs {fmtCur(todayRevenue)} today</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Items Grid */}
                <div className="lg:col-span-2">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Menu Items</h3>
                    {loadingItems ? (
                      <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {items.filter(i => i.available !== false).map(item => (
                          <button key={item.id} onClick={() => addToCart(item)}
                            className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/10 text-left transition-all group">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"
                              style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                              <Package className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-0.5">Rs {fmtCur(item.price)}</p>
                            <p className="text-[10px] text-slate-400">{item.category}</p>
                          </button>
                        ))}
                        {items.filter(i => i.available !== false).length === 0 && (
                          <p className="col-span-3 text-center text-sm text-slate-400 py-6">No items available. Add items in the Items tab.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cart */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-amber-500" /> Current Sale
                  </h3>
                  {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                      <ShoppingCart className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-2" />
                      <p className="text-sm text-slate-400">Click items to add to sale</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 space-y-2">
                        {cart.map(({ item, qty }) => (
                          <div key={item.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                              <p className="text-xs text-slate-400">Rs {fmtCur(item.price)} each</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => updateCartQty(item.id, qty - 1)}
                                className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold">−</button>
                              <span className="w-6 text-center text-sm font-bold text-slate-900 dark:text-white">{qty}</span>
                              <button onClick={() => updateCartQty(item.id, qty + 1)}
                                className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold">+</button>
                            </div>
                            <p className="text-sm font-bold text-amber-600 w-16 text-right">{fmtCur(Number(item.price) * qty)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total</span>
                          <span className="text-lg font-bold text-slate-900 dark:text-white">Rs {fmtCur(cartTotal)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setCart([])} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Clear</button>
                          <button onClick={handleRecordSale} disabled={recordingSale}
                            className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                            {recordingSale ? 'Recording…' : 'Record Sale'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Today's Sales Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Sales on {saleDate} <span className="text-xs font-normal text-slate-400">({sales.length})</span>
                  </h3>
                </div>
                {loadingSales ? (
                  <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : sales.length === 0 ? (
                  <div className="py-10 text-center">
                    <ShoppingCart className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No sales recorded for this date</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 uppercase tracking-wide">
                          <th className="text-left px-5 py-3 font-semibold">Item</th>
                          <th className="text-center px-4 py-3 font-semibold">Qty</th>
                          <th className="text-right px-5 py-3 font-semibold">Unit Price</th>
                          <th className="text-right px-5 py-3 font-semibold">Total</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sales.map(s => (
                          <tr key={s.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{s.item_name || '—'}</td>
                            <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">{s.quantity}</td>
                            <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-400">Rs {fmtCur(s.unit_price)}</td>
                            <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-white">Rs {fmtCur(s.total_amount)}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => handleDeleteSale(s.id)}
                                className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Items Tab ── */}
          {tab === 'items' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setModal('new')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                {loadingItems ? (
                  <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : items.length === 0 ? (
                  <div className="py-12 text-center">
                    <Package className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No items yet. Add your first menu item.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 uppercase tracking-wide">
                          <th className="text-left px-5 py-3 font-semibold">Name</th>
                          <th className="text-left px-5 py-3 font-semibold">Category</th>
                          <th className="text-right px-5 py-3 font-semibold">Price</th>
                          <th className="text-left px-5 py-3 font-semibold">Unit</th>
                          <th className="text-center px-4 py-3 font-semibold">Available</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {items.map(item => (
                          <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{item.name}</td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">{item.category}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right font-semibold text-amber-600">Rs {fmtCur(item.price)}</td>
                            <td className="px-5 py-3.5 text-slate-500">{item.unit}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${item.available !== false ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                {item.available !== false ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setModal(item)} className="p-1.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-500">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {deletingItem === item.id ? (
                                  <div className="flex gap-1">
                                    <button onClick={() => handleDeleteItem(item.id)} className="px-2 py-1 rounded text-xs font-bold bg-red-600 text-white">Yes</button>
                                    <button onClick={() => setDeletingItem(null)} className="px-2 py-1 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600">No</button>
                                  </div>
                                ) : (
                                  <button onClick={() => setDeletingItem(item.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Wallet Tab ── */}
          {tab === 'wallet' && <WalletTab />}

          {/* ── Monthly Report Tab ── */}
          {tab === 'report' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none" />
                <button onClick={loadReport} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <RefreshCw className={`w-4 h-4 ${loadingReport ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingReport ? (
                <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : !report ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-12 text-center">
                  <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No report data available</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Revenue</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">Rs {fmtCur(report.total_revenue)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Transactions</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">{report.total_sales || 0}</p>
                    </div>
                  </div>

                  {Array.isArray(report.daily) && report.daily.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 uppercase tracking-wide">
                              <th className="text-left px-5 py-3 font-semibold">Date</th>
                              <th className="text-center px-4 py-3 font-semibold">Transactions</th>
                              <th className="text-right px-5 py-3 font-semibold">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {report.daily.map((d, i) => (
                              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{d.date}</td>
                                <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">{d.count || 0}</td>
                                <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-white">Rs {fmtCur(d.revenue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {modal && (
        <ItemModal
          item={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadItems(); }}
        />
      )}
    </Layout>
  );
}

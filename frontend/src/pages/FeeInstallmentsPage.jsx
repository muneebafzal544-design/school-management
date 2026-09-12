import { useState, useEffect, useCallback } from 'react';
import {
  Layers, Plus, Search, CheckCircle2, Clock, AlertTriangle,
  RefreshCw, Trash2, X, CreditCard, Calendar, ChevronDown, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import {
  getInstallments, getUpcoming, getOverdue,
  createInstallmentPlan, payInstallment, deleteInstallmentPlan,
} from '../api/installments';
import { getInvoices } from '../api/fees';

// ── Status config ─────────────────────────────────────────────
const S = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
  partial: { label: 'Partial', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',         icon: Clock },
  unpaid:  { label: 'Unpaid',  cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',                icon: Clock },
  overdue: { label: 'Overdue', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',                 icon: AlertTriangle },
};
const TABS = ['All Installments', 'Upcoming (7 days)', 'Overdue', 'Create Plan'];
const METHODS = ['cash', 'bank', 'online', 'cheque'];
const PKR = n => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

export default function FeeInstallmentsPage() {
  const [tab,       setTab]       = useState(0);
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [payModal,  setPayModal]  = useState(null);   // installment row
  const [delModal,  setDelModal]  = useState(null);   // invoice_id
  const [paying,    setPaying]    = useState(false);

  // Create plan form
  const [invoices,  setInvoices]  = useState([]);
  const [form,      setForm]      = useState({ invoice_id: '', count: 3, start_date: new Date().toISOString().slice(0,10), interval_days: 30 });
  const [creating,  setCreating]  = useState(false);
  const [planPreview, setPlanPreview] = useState([]);

  // Pay form
  const [payForm,   setPayForm]   = useState({ amount: '', payment_method: 'cash', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (tab === 0) res = await getInstallments({ limit: 200 });
      else if (tab === 1) res = await getUpcoming(7);
      else if (tab === 2) res = await getOverdue();
      else { setLoading(false); return; }
      setRows(res.data?.data ?? res.data ?? []);
    } catch { toast.error('Failed to load installments'); }
    finally  { setLoading(false); }
  }, [tab]);

  useEffect(() => {
    load();
    if (tab === 3) {
      getInvoices({ has_installments: false, status: 'unpaid,partial,overdue', limit: 200 })
        .then(r => setInvoices(r.data?.data ?? r.data ?? []))
        .catch(() => {});
    }
  }, [load, tab]);

  // Preview installment schedule
  useEffect(() => {
    if (!form.invoice_id || !form.count || !form.start_date) { setPlanPreview([]); return; }
    const inv = invoices.find(i => String(i.id) === String(form.invoice_id));
    if (!inv) { setPlanPreview([]); return; }
    const net = parseFloat(inv.total_amount) + parseFloat(inv.fine_amount || 0) - parseFloat(inv.discount_amount || 0);
    const per = net / form.count;
    const preview = [];
    for (let i = 0; i < form.count; i++) {
      const d = new Date(form.start_date);
      d.setDate(d.getDate() + i * (form.interval_days || 30));
      preview.push({ no: i + 1, amount: per.toFixed(2), due_date: d.toISOString().slice(0, 10) });
    }
    setPlanPreview(preview);
  }, [form, invoices]);

  const filtered = rows.filter(r =>
    !search || r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.invoice_no?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.invoice_id) return toast.error('Select an invoice');
    setCreating(true);
    try {
      await createInstallmentPlan(form);
      toast.success('Installment plan created');
      setForm({ invoice_id: '', count: 3, start_date: new Date().toISOString().slice(0,10), interval_days: 30 });
      setTab(0);
    } catch (err) { toast.error(err.response?.data?.message || 'Creation failed'); }
    finally { setCreating(false); }
  }

  async function handlePay(e) {
    e.preventDefault();
    if (!payForm.amount) return toast.error('Enter amount');
    setPaying(true);
    try {
      await payInstallment(payModal.id, payForm);
      toast.success('Payment recorded');
      setPayModal(null);
      setPayForm({ amount: '', payment_method: 'cash', notes: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Payment failed'); }
    finally { setPaying(false); }
  }

  async function handleDelete() {
    try {
      await deleteInstallmentPlan(delModal);
      toast.success('Installment plan removed');
      setDelModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  }

  if (loading && tab !== 3) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="text-indigo-500" size={24} />
              Fee Installment Plans
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Split invoices into scheduled payments</p>
          </div>
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit flex-wrap">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                ${tab === i ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {t}
              {i === 2 && rows.length > 0 && tab !== 2 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">!</span>
              )}
            </button>
          ))}
        </div>

        {/* Create Plan Tab */}
        {tab === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Configure Plan</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Invoice</label>
                  <select value={form.invoice_id} onChange={e => setForm(p => ({ ...p, invoice_id: e.target.value }))} required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— Select unpaid invoice —</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.student_name} · {inv.invoice_no} · PKR {PKR(inv.total_amount)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Installments</label>
                    <select value={form.count} onChange={e => setForm(p => ({ ...p, count: +e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                      {[2,3,4,6,12].map(n => <option key={n} value={n}>{n} installments</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Interval (days)</label>
                    <select value={form.interval_days} onChange={e => setForm(p => ({ ...p, interval_days: +e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value={7}>Weekly (7d)</option>
                      <option value={15}>Bi-weekly (15d)</option>
                      <option value={30}>Monthly (30d)</option>
                      <option value={60}>Bi-monthly (60d)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">First Payment Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <button type="submit" disabled={creating || !form.invoice_id}
                  className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                  {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  {creating ? 'Creating…' : 'Create Installment Plan'}
                </button>
              </form>
            </div>

            {/* Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Schedule Preview</h3>
              {planPreview.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Select an invoice to preview</div>
              ) : (
                <div className="space-y-2">
                  {planPreview.map(p => (
                    <div key={p.no} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600">{p.no}</div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Installment {p.no}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={11} />{p.due_date}</p>
                        </div>
                      </div>
                      <p className="font-bold text-indigo-600">PKR {PKR(p.amount)}</p>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      PKR {PKR(planPreview.reduce((s, p) => s + parseFloat(p.amount), 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* List Tabs */}
        {tab < 3 && (
          <>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search student or invoice…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <span className="text-xs text-gray-400">{filtered.length} records</span>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Student</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Invoice</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Amount</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Paid</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Due</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {loading ? (
                      <tr><td colSpan={8} className="text-center py-10"><Loader2 size={20} className="animate-spin text-indigo-500 mx-auto" /></td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-gray-400">No installments found</td></tr>
                    ) : filtered.map(r => {
                      const cfg = S[r.status] || S.unpaid;
                      return (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-3 text-gray-400 text-xs">#{r.installment_no}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">{r.student_name}</p>
                            <p className="text-xs text-gray-400">{r.roll_number}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{r.invoice_no}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">PKR {PKR(r.amount)}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-medium">PKR {PKR(r.paid_amount)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{r.due_date}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
                              <cfg.icon size={11} />{cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {r.status !== 'paid' && (
                                <button onClick={() => { setPayModal(r); setPayForm({ amount: String(parseFloat(r.amount) - parseFloat(r.paid_amount)), payment_method: 'cash', notes: '' }); }}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg">
                                  <CreditCard size={14} />
                                </button>
                              )}
                              {r.installment_no === 1 && (
                                <button onClick={() => setDelModal(r.invoice_id)}
                                  className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Record Payment</h3>
              <button onClick={() => setPayModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-4 text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{payModal.student_name}</p>
              <p className="text-gray-500">Installment #{payModal.installment_no} · Due {payModal.due_date}</p>
              <p className="text-indigo-600 font-semibold mt-1">Balance: PKR {PKR(parseFloat(payModal.amount) - parseFloat(payModal.paid_amount))}</p>
            </div>
            <form onSubmit={handlePay} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Amount (PKR)</label>
                <input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Method</label>
                <select value={payForm.payment_method} onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                  {METHODS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Notes</label>
                <input value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button type="submit" disabled={paying}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {paying ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                {paying ? 'Processing…' : 'Record Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Plan Modal */}
      {delModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Remove Installment Plan?</h3>
            <p className="text-sm text-gray-500 mb-5">This will delete all installment records for this invoice. Any recorded payments will also be lost.</p>
            <div className="flex gap-3">
              <button onClick={() => setDelModal(null)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

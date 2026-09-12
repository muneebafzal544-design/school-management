import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { Smartphone, RefreshCw, Search, CheckCircle2, XCircle, Clock3, AlertTriangle } from 'lucide-react';
import { listPayments } from '../api/onlinePayments';

const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const STATUS_CFG = {
  completed: { label: 'Completed', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  Icon: CheckCircle2  },
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',  Icon: Clock3        },
  failed:    { label: 'Failed',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',          Icon: XCircle       },
  expired:   { label: 'Expired',   cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',     Icon: AlertTriangle },
};

const GATEWAY_COLORS = { jazzcash: '#e01f3d', easypaisa: '#3cb043' };

export default function OnlinePaymentsPage() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: '', gateway: '', q: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = { limit: 100 };
      if (filters.status)  p.status  = filters.status;
      if (filters.gateway) p.gateway = filters.gateway;
      const r = await listPayments(p);
      let data = r.data?.data || [];
      if (filters.q) {
        const q = filters.q.toLowerCase();
        data = data.filter(x =>
          x.student_name?.toLowerCase().includes(q) ||
          x.invoice_no?.toLowerCase().includes(q) ||
          x.txn_ref?.toLowerCase().includes(q) ||
          x.phone?.includes(q)
        );
      }
      setRows(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const totals = {
    completed: rows.filter(r => r.status === 'completed').reduce((s, r) => s + parseFloat(r.amount || 0), 0),
    pending:   rows.filter(r => r.status === 'pending').length,
    failed:    rows.filter(r => r.status === 'failed').length,
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Smartphone size={22} className="text-violet-500" />
              Online Payments
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">JazzCash & EasyPaisa transaction history</p>
          </div>
          <button onClick={load} className="text-gray-400 hover:text-violet-500 transition-colors">
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Collected', value: `Rs. ${fmt(totals.completed)}`, color: '#16a34a' },
            { label: 'Pending',   value: totals.pending,                 color: '#d97706' },
            { label: 'Failed',    value: totals.failed,                  color: '#dc2626' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
              <div className="text-xl font-bold mt-1" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={filters.q} onChange={e => set('q', e.target.value)}
              placeholder="Search name, invoice, txn ref, phone…"
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400" />
          </div>
          <select value={filters.gateway} onChange={e => set('gateway', e.target.value)}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white">
            <option value="">All Gateways</option>
            <option value="jazzcash">JazzCash</option>
            <option value="easypaisa">EasyPaisa</option>
          </select>
          <select value={filters.status} onChange={e => set('status', e.target.value)}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white">
            <option value="">All Statuses</option>
            {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  {['Date', 'Student', 'Invoice', 'Gateway', 'Phone', 'Amount', 'Status', 'Txn Ref'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400"><RefreshCw size={18} className="animate-spin inline mr-2" />Loading…</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">
                    <Smartphone size={32} className="mx-auto mb-2 opacity-30" />
                    <p>No transactions found</p>
                  </td></tr>
                )}
                {!loading && rows.map(row => {
                  const cfg = STATUS_CFG[row.status] || STATUS_CFG.failed;
                  const StatusIcon = cfg.Icon;
                  return (
                    <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {row.initiated_at ? new Date(row.initiated_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{row.student_name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{row.invoice_no}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: (GATEWAY_COLORS[row.gateway] || '#6366f1') + '18', color: GATEWAY_COLORS[row.gateway] || '#6366f1' }}>
                          {row.gateway === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{row.phone}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">Rs. {fmt(row.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${cfg.cls}`}>
                          <StatusIcon size={11} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs max-w-[140px] truncate" title={row.txn_ref}>{row.txn_ref || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, TrendingDown, TrendingUp, Minus,
  Wallet, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudentLedger } from '../api/feeAdvanced';

const PKR = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const TYPE_META = {
  invoice:  { label: 'Invoice',   color: 'text-red-600  dark:text-red-400',   bg: 'bg-red-50  dark:bg-red-900/20',   icon: TrendingDown },
  fine:     { label: 'Fine',      color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: AlertCircle },
  discount: { label: 'Discount',  color: 'text-sky-600   dark:text-sky-400',   bg: 'bg-sky-50   dark:bg-sky-900/20',   icon: TrendingUp },
  payment:  { label: 'Payment',   color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', icon: CheckCircle2 },
};

function EntryRow({ entry, idx }) {
  const meta = TYPE_META[entry.type] || TYPE_META.invoice;
  const Icon = meta.icon;
  const isCredit = entry.credit > 0;

  return (
    <tr className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
      {/* Date */}
      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {new Date(entry.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
      </td>
      {/* Type badge */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.bg} ${meta.color}`}>
          <Icon size={10} />
          {meta.label}
        </span>
      </td>
      {/* Description */}
      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
        {entry.description}
        {entry.reference && (
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{entry.reference}</div>
        )}
      </td>
      {/* Debit */}
      <td className="px-4 py-3 text-sm text-right">
        {entry.debit > 0
          ? <span className="text-red-600 dark:text-red-400 font-medium">{PKR(entry.debit)}</span>
          : <span className="text-slate-300 dark:text-slate-600">—</span>}
      </td>
      {/* Credit */}
      <td className="px-4 py-3 text-sm text-right">
        {entry.credit > 0
          ? <span className="text-green-600 dark:text-green-400 font-medium">{PKR(entry.credit)}</span>
          : <span className="text-slate-300 dark:text-slate-600">—</span>}
      </td>
      {/* Balance */}
      <td className="px-4 py-3 text-sm text-right font-semibold">
        <span className={entry.balance > 0
          ? 'text-red-600 dark:text-red-400'
          : entry.balance < 0
            ? 'text-green-600 dark:text-green-400'
            : 'text-slate-400'}>
          {entry.balance === 0 ? '—' : PKR(Math.abs(entry.balance))}
          {entry.balance < 0 && <span className="text-[10px] font-normal ml-1">CR</span>}
        </span>
      </td>
    </tr>
  );
}

export default function FeeLedgerPage() {
  const { studentId } = useParams();
  const navigate      = useNavigate();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [from,    setFrom]    = useState('');
  const [to,      setTo]      = useState('');
  const [filter,  setFilter]  = useState('all');

  const printRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getStudentLedger(studentId, { from: from || undefined, to: to || undefined });
      setData(res.data?.data ?? res.data);
    } catch {
      toast.error('Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [studentId]);

  const handlePrint = () => window.print();

  const filteredEntries = data?.entries?.filter(e =>
    filter === 'all' ? true : e.type === filter
  ) || [];

  const summary = data?.summary || {};
  const student = data?.student || {};

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 print:bg-white">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft size={18} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Fee Ledger</h1>
            {student.full_name && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {student.full_name} · {student.roll_number} · {student.class_name}
              </p>
            )}
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            <Download size={15} /> Download PDF
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6" ref={printRef}>
        {/* ── Print Header ── */}
        <div className="hidden print:block mb-6">
          <h2 className="text-xl font-bold">Fee Ledger — {student.full_name}</h2>
          <p className="text-sm text-gray-600">{student.roll_number} · {student.class_name}</p>
          <p className="text-xs text-gray-400 mt-1">Generated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
          </div>
          <button onClick={load}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
            Apply
          </button>
          {(from || to) && (
            <button onClick={() => { setFrom(''); setTo(''); }} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">
              Clear
            </button>
          )}
          <div className="ml-auto flex gap-1">
            {['all','invoice','payment','discount','fine'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors capitalize
                  ${filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50'
                  }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ── Summary Cards ── */}
        {!loading && summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Billed',    value: summary.total_billed,    icon: TrendingDown, color: 'red'   },
              { label: 'Total Paid',      value: summary.total_paid,      icon: CheckCircle2, color: 'green' },
              { label: 'Discounts',       value: summary.total_discounts, icon: Minus,        color: 'sky'   },
              { label: 'Balance Due',     value: summary.current_balance, icon: Wallet,       color: summary.current_balance > 0 ? 'red' : 'green' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
                  <div className={`p-1.5 rounded-lg bg-${color}-50 dark:bg-${color}-900/20`}>
                    <Icon size={13} className={`text-${color}-500`} />
                  </div>
                </div>
                <p className={`text-lg font-bold ${color === 'green' ? 'text-green-600 dark:text-green-400' : color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-white'}`}>
                  {PKR(value)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Ledger Table ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Transaction History
              {filteredEntries.length > 0 && (
                <span className="ml-2 text-xs text-slate-400">({filteredEntries.length} entries)</span>
              )}
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              <Clock size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Debit</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Credit</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {/* Opening balance row */}
                  <tr className="bg-slate-50 dark:bg-slate-700/30">
                    <td colSpan={5} className="px-4 py-2 text-xs text-slate-400 font-medium">Opening Balance</td>
                    <td className="px-4 py-2 text-xs text-right font-semibold text-slate-500">PKR 0</td>
                  </tr>
                  {filteredEntries.map((entry, i) => (
                    <EntryRow key={i} entry={entry} idx={i} />
                  ))}
                  {/* Closing balance row */}
                  <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-semibold border-t-2 border-indigo-100 dark:border-indigo-800">
                    <td colSpan={5} className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300 font-semibold">
                      Closing Balance
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-indigo-700 dark:text-indigo-300">
                      {PKR(summary.current_balance)}
                      {summary.current_balance <= 0 && (
                        <span className="ml-1 text-green-600 text-xs">✓ Cleared</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Late Fines note ── */}
        {!loading && summary.total_fines > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg text-sm text-orange-700 dark:text-orange-300">
            <AlertCircle size={15} className="shrink-0" />
            <span>
              This account has accumulated <strong>{PKR(summary.total_fines)}</strong> in late payment fines.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

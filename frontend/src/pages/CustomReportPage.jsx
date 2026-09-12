import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ClipboardList, Play, Download, ChevronDown,
  Users, GraduationCap, Banknote, BookOpen, Receipt,
} from 'lucide-react';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import Spinner from '../components/ui/Spinner';
import { getCustomReport } from '../api/analytics';
import { downloadBlob } from '../utils';

// ── Entity config ─────────────────────────────────────────────
const ENTITIES = [
  {
    id: 'students',
    label: 'Students',
    icon: Users,
    color: '#6366f1',
    columns: [
      { key: 'full_name',       label: 'Name' },
      { key: 'admission_number',label: 'Adm No' },
      { key: 'roll_number',     label: 'Roll No' },
      { key: 'class_name',      label: 'Class' },
      { key: 'gender',          label: 'Gender' },
      { key: 'date_of_birth',   label: 'Date of Birth' },
      { key: 'father_name',     label: 'Father Name' },
      { key: 'phone',           label: 'Phone' },
      { key: 'parent_phone',    label: 'Parent Phone' },
      { key: 'parent_email',    label: 'Parent Email' },
      { key: 'is_active',       label: 'Active' },
      { key: 'admission_date',  label: 'Admission Date' },
    ],
    filters: [
      { key: 'class_id', label: 'Class (leave blank for all)', type: 'text' },
      { key: 'gender',   label: 'Gender', type: 'select', options: [{ v: '', l: 'All' }, { v: 'male', l: 'Male' }, { v: 'female', l: 'Female' }] },
      { key: 'is_active',label: 'Status', type: 'select', options: [{ v: '', l: 'All' }, { v: 'true', l: 'Active' }, { v: 'false', l: 'Inactive' }] },
    ],
  },
  {
    id: 'teachers',
    label: 'Teachers',
    icon: GraduationCap,
    color: '#8b5cf6',
    columns: [
      { key: 'full_name',     label: 'Name' },
      { key: 'employee_id',   label: 'Employee ID' },
      { key: 'designation',   label: 'Designation' },
      { key: 'qualification', label: 'Qualification' },
      { key: 'email',         label: 'Email' },
      { key: 'phone',         label: 'Phone' },
      { key: 'joining_date',  label: 'Joining Date' },
      { key: 'salary',        label: 'Salary' },
      { key: 'subjects',      label: 'Subjects' },
      { key: 'is_active',     label: 'Active' },
    ],
    filters: [
      { key: 'is_active', label: 'Status', type: 'select', options: [{ v: '', l: 'All' }, { v: 'true', l: 'Active' }, { v: 'false', l: 'Inactive' }] },
    ],
  },
  {
    id: 'fees',
    label: 'Fee Invoices',
    icon: Banknote,
    color: '#10b981',
    columns: [
      { key: 'invoice_no',     label: 'Invoice No' },
      { key: 'student_name',   label: 'Student' },
      { key: 'admission_number',label: 'Adm No' },
      { key: 'class_name',     label: 'Class' },
      { key: 'billing_month',  label: 'Month' },
      { key: 'total_amount',   label: 'Total' },
      { key: 'net_amount',     label: 'Net' },
      { key: 'paid_amount',    label: 'Paid' },
      { key: 'status',         label: 'Status' },
      { key: 'due_date',       label: 'Due Date' },
    ],
    filters: [
      { key: 'status',    label: 'Status', type: 'select', options: [{ v: '', l: 'All' }, { v: 'paid', l: 'Paid' }, { v: 'unpaid', l: 'Unpaid' }, { v: 'overdue', l: 'Overdue' }, { v: 'partial', l: 'Partial' }] },
      { key: 'date_from', label: 'Due Date From', type: 'date' },
      { key: 'date_to',   label: 'Due Date To',   type: 'date' },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: BookOpen,
    color: '#0ea5e9',
    columns: [
      { key: 'date',             label: 'Date' },
      { key: 'student_name',     label: 'Student' },
      { key: 'roll_number',      label: 'Roll No' },
      { key: 'admission_number', label: 'Adm No' },
      { key: 'class_name',       label: 'Class' },
      { key: 'status',           label: 'Status' },
    ],
    filters: [
      { key: 'status',    label: 'Status', type: 'select', options: [{ v: '', l: 'All' }, { v: 'present', l: 'Present' }, { v: 'absent', l: 'Absent' }, { v: 'late', l: 'Late' }] },
      { key: 'date_from', label: 'Date From', type: 'date' },
      { key: 'date_to',   label: 'Date To',   type: 'date' },
    ],
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: Receipt,
    color: '#f97316',
    columns: [
      { key: 'expense_date',    label: 'Date' },
      { key: 'category',        label: 'Category' },
      { key: 'amount',          label: 'Amount' },
      { key: 'description',     label: 'Description' },
      { key: 'payment_method',  label: 'Payment Method' },
      { key: 'vendor',          label: 'Vendor' },
      { key: 'receipt_no',      label: 'Receipt No' },
    ],
    filters: [
      { key: 'date_from', label: 'Date From', type: 'date' },
      { key: 'date_to',   label: 'Date To',   type: 'date' },
    ],
  },
];

const fmtCell = (val, key) => {
  if (val === null || val === undefined) return '—';
  if (key === 'is_active') return val === true || val === 'true' ? 'Yes' : 'No';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (key.endsWith('_date') || key === 'date') return val?.toString().slice(0, 10) || '—';
  return String(val);
};

export default function CustomReportPage() {
  const [entityId,  setEntityId]  = useState('students');
  const [filters,   setFilters]   = useState({});
  const [selCols,   setSelCols]   = useState(null); // null = all
  const [limit,     setLimit]     = useState(200);
  const [rows,      setRows]      = useState(null);
  const [loading,   setLoading]   = useState(false);

  const entity = ENTITIES.find(e => e.id === entityId);
  const visibleCols = selCols ?? entity.columns.map(c => c.key);

  const handleRun = useCallback(async () => {
    setLoading(true);
    setRows(null);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      );
      if (cleanFilters.is_active !== undefined) cleanFilters.is_active = cleanFilters.is_active === 'true';

      const res = await toast.promise(
        getCustomReport({ entity: entityId, filters: cleanFilters, limit }),
        {
          loading: 'Running report…',
          success: (r) => {
            const rows = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
            return `Report ready — ${rows.length} row(s)`;
          },
          error: (err) => err?.response?.data?.message || 'Failed to run report',
        }
      );
      const { data } = res;
      setRows(Array.isArray(data) ? data : (data?.data ?? []));
    } catch { }
    finally { setLoading(false); }
  }, [entityId, filters, limit]);

  const handleExportCSV = () => {
    if (!rows?.length) return;
    const cols = entity.columns.filter(c => visibleCols.includes(c.key));
    const header = cols.map(c => c.label).join(',');
    const body   = rows.map(row =>
      cols.map(c => {
        const v = fmtCell(row[c.key], c.key);
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');
    const csv  = `${header}\n${body}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, `${entityId}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${rows.length} rows`);
  };

  const toggleCol = (key) => {
    const cur = selCols ?? entity.columns.map(c => c.key);
    if (cur.includes(key)) {
      if (cur.length === 1) return; // keep at least 1
      setSelCols(cur.filter(k => k !== key));
    } else {
      setSelCols([...cur, key]);
    }
  };

  // Reset state when entity changes
  const handleEntityChange = (id) => {
    setEntityId(id);
    setFilters({});
    setSelCols(null);
    setRows(null);
  };

  const cardCls = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm';

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Header */}
        <PageHeader
          icon={ClipboardList}
          title="Custom Report Builder"
          subtitle="Select entity → apply filters → preview → export"
        />

        {/* Builder panel */}
        <div className={`${cardCls} p-5 space-y-5`}>

          {/* Entity selector */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">1. Select Entity</p>
            <div className="flex flex-wrap gap-2">
              {ENTITIES.map(e => {
                const Icon = e.icon;
                const active = e.id === entityId;
                return (
                  <button
                    key={e.id}
                    onClick={() => handleEntityChange(e.id)}
                    className={[
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all',
                      active
                        ? 'text-white border-transparent shadow-md'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300',
                    ].join(' ')}
                    style={active ? { background: `linear-gradient(135deg,${e.color},${e.color}cc)` } : {}}>
                    <Icon size={14} />{e.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          {entity.filters.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">2. Filters (optional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {entity.filters.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{f.label}</label>
                    {f.type === 'select' ? (
                      <div className="relative">
                        <select
                          value={filters[f.key] ?? ''}
                          onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                                     bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                          {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    ) : (
                      <input
                        type={f.type || 'text'}
                        value={filters[f.key] ?? ''}
                        onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                                   bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        placeholder={f.label}
                      />
                    )}
                  </div>
                ))}
                {/* Limit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Max Rows</label>
                  <div className="relative">
                    <select value={limit} onChange={e => setLimit(Number(e.target.value))}
                      className="w-full appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                                 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                      {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n} rows</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Column selector */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">3. Columns</p>
            <div className="flex flex-wrap gap-2">
              {entity.columns.map(c => {
                const active = visibleCols.includes(c.key);
                return (
                  <button
                    key={c.key}
                    onClick={() => toggleCol(c.key)}
                    className={[
                      'px-3 py-1 rounded-lg text-xs font-semibold border transition-all',
                      active
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40'
                        : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700',
                    ].join(' ')}>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Run button */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleRun}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {loading ? <Spinner size="sm" /> : <Play size={14} />}
              {loading ? 'Running…' : 'Run Report'}
            </button>
          </div>
        </div>

        {/* Results */}
        {rows !== null && (
          <div className={cardCls}>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList size={15} className="text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                  Results
                  <span className="ml-2 text-slate-400 font-normal">{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
                </h2>
              </div>
              {rows.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 transition-colors">
                  <Download size={12} /> Export CSV
                </button>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-400 gap-2">
                <ClipboardList size={32} strokeWidth={1.3} />
                <p className="text-sm">No results match the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
                      {entity.columns.filter(c => visibleCols.includes(c.key)).map(c => (
                        <th key={c.key}
                          className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                        {entity.columns.filter(c => visibleCols.includes(c.key)).map(c => (
                          <td key={c.key} className="px-4 py-2.5 text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs">
                            {fmtCell(row[c.key], c.key)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

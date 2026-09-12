import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { ShieldCheck, Search, RefreshCw, ChevronDown, X, Monitor, Clock, User, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { getAuditLogs, getAuditSummary } from '../api/audit';

const ACTION_COLORS = {
  CREATE: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  UPDATE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  DELETE: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  LOGIN:  'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  EXPORT: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
};

function actionBadge(action = '') {
  const prefix = action.split('_')[0];
  return ACTION_COLORS[prefix] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
}

function AuditDetailDrawer({ log, onClose }) {
  const details = typeof log.details === 'string'
    ? (() => { try { return JSON.parse(log.details); } catch { return log.details; } })()
    : (log.details || {});

  const before = details?.before || details?.old || null;
  const after  = details?.after  || details?.new  || null;
  const hasDiff = before || after;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${actionBadge(log.action)}`}>{log.action}</span>
          <span className="text-xs text-gray-400">#{log.id}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-5 grid sm:grid-cols-2 gap-5">
        {/* Meta info */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Context</h4>
          {[
            { Icon: User,    label: 'User',     value: `${log.user_name || `#${log.user_id}`} (${log.user_role || '—'})` },
            { Icon: Clock,   label: 'Time',     value: new Date(log.created_at).toLocaleString('en-PK') },
            { Icon: Globe,   label: 'IP',       value: log.ip_address || log.ip || '—' },
            { Icon: Monitor, label: 'Resource', value: log.resource ? `${log.resource}${log.resource_id ? ` #${log.resource_id}` : ''}` : '—' },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2">
              <Icon size={13} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-gray-400">{label}</div>
                <div className="text-sm text-gray-800 dark:text-gray-200 font-medium break-all">{value}</div>
              </div>
            </div>
          ))}
          {log.user_agent && (
            <div className="text-xs text-gray-400 font-mono bg-gray-50 dark:bg-gray-900 rounded-lg px-2 py-1.5 truncate" title={log.user_agent}>
              {log.user_agent.slice(0, 80)}
            </div>
          )}
        </div>

        {/* Diff or raw details */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {hasDiff ? 'Changes (before → after)' : 'Details'}
          </h4>

          {hasDiff ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.keys({ ...before, ...after }).map(key => {
                const bVal = JSON.stringify(before?.[key] ?? null);
                const aVal = JSON.stringify(after?.[key]  ?? null);
                const changed = bVal !== aVal;
                return (
                  <div key={key} className={`rounded-lg border px-3 py-2 text-xs ${changed ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10' : 'border-gray-100 dark:border-gray-700'}`}>
                    <div className="font-semibold text-gray-600 dark:text-gray-400 mb-1">{key}</div>
                    {changed ? (
                      <>
                        {before?.[key] !== undefined && <div className="text-red-600 dark:text-red-400 line-through truncate">- {bVal}</div>}
                        {after?.[key]  !== undefined && <div className="text-green-600 dark:text-green-400 truncate">+ {aVal}</div>}
                      </>
                    ) : (
                      <div className="text-gray-500 truncate">{aVal}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <pre className="text-xs bg-gray-50 dark:bg-gray-900 rounded-xl p-3 overflow-auto max-h-64 text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">
              {typeof details === 'object'
                ? JSON.stringify(details, null, 2)
                : String(details || '(no details)')}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  const [logs,     setLogs]     = useState([]);
  const [summary,  setSummary]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState(null); // detail drawer

  // Filters
  const [search,   setSearch]   = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [from,     setFrom]     = useState('');
  const [to,       setTo]       = useState('');
  const PER_PAGE = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: PER_PAGE, offset: (page - 1) * PER_PAGE };
      if (from)           params.from   = from;
      if (to)             params.to     = to;
      if (debouncedSearch) params.action = debouncedSearch;
      const [logsRes, summaryRes] = await Promise.all([
        getAuditLogs(params),
        getAuditSummary(),
      ]);
      setLogs(logsRes.data?.data ?? logsRes.data ?? []);
      setTotal(logsRes.data?.total ?? 0);
      setSummary(summaryRes.data?.data ?? summaryRes.data ?? []);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, from, to, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PER_PAGE);

  if (loading && page === 1) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="text-indigo-500" size={24} />
              Audit Logs
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Full record of all admin actions in the system
            </p>
          </div>
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Top actions summary */}
        {summary.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {summary.slice(0, 8).map(s => (
              <button key={s.action}
                onClick={() => { setSearch(s.action); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-transparent hover:border-gray-200 dark:hover:border-gray-700 ${actionBadge(s.action)}`}>
                {s.action}
                <span className="font-bold">{s.count}</span>
              </button>
            ))}
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2">
                <X size={12} /> Clear
              </button>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Filter by action (e.g. CREATE_STUDENT)…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
            className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none" />
          <span className="text-gray-400 text-sm">→</span>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
            className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none" />
          <span className="text-xs text-gray-400">{total} records</span>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Time</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Entity</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">IP</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {logs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">No audit logs found</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                    onClick={() => setSelected(selected?.id === log.id ? null : log)}>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white text-xs">{log.user_name || `User ${log.user_id}`}</p>
                      <p className="text-xs text-gray-400">{log.user_role}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold ${actionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                      {log.entity}{log.entity_id ? ` #${log.entity_id}` : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{log.ip || '—'}</td>
                    <td className="px-4 py-3">
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${selected?.id === log.id ? 'rotate-180' : ''}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="text-sm text-indigo-600 disabled:text-gray-300 hover:underline">Previous</button>
              <span className="text-xs text-gray-400">Page {page} of {totalPages} ({total} records)</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="text-sm text-indigo-600 disabled:text-gray-300 hover:underline">Next</button>
            </div>
          )}
        </div>

        {/* Detail drawer */}
        {selected && <AuditDetailDrawer log={selected} onClose={() => setSelected(null)} />}
      </div>
    </Layout>
  );
}

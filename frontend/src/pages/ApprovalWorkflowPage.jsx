import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, Send, Trash2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createWorkflow, getWorkflows, getMyApprovals, respondWorkflow, cancelBatch,
} from '../api/approvals';
import { getExams } from '../api/exams';
import { useAuth } from '../context/AuthContext';
import { useClasses } from '../hooks/useReferenceData';

// ── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  icon: <Clock size={12} />         },
  approved:  { color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-200',icon: <CheckCircle size={12} />   },
  rejected:  { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: <XCircle size={12} />       },
  expired:   { color: 'text-slate-600',  bg: 'bg-slate-50',  border: 'border-slate-200',  icon: <Clock size={12} />         },
  cancelled: { color: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200',  icon: <XCircle size={12} />       },
};

function StatusChip({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${c.color} ${c.bg} ${c.border}`}>
      {c.icon} {status}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Admin: create new workflow form ─────────────────────────────────────────
function CreateWorkflowForm({ dark, onCreated }) {
  const { data: classes = [] } = useClasses({ limit: 100 });
  const [exams,   setExams]   = useState([]);
  const [form, setForm] = useState({
    workflow_type: 'grade_publication',
    class_id:      '',
    reference_id:  '',
    reference_name:'',
    expires_days:  7,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getExams({ limit: 100 }).then(r => setExams(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, []);

  const input = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ' +
    (dark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.class_id || !form.reference_name) {
      toast.error('Class and reference name are required');
      return;
    }
    setBusy(true);
    try {
      const r = await createWorkflow({
        ...form,
        class_id:     +form.class_id,
        reference_id: form.reference_id ? +form.reference_id : undefined,
        expires_days: +form.expires_days,
      });
      toast.success(r.data?.message || 'Workflow batch created');
      onCreated?.();
      setForm(f => ({ ...f, reference_name: '', reference_id: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create workflow');
    } finally {
      setBusy(false);
    }
  }

  const label = dark ? 'text-slate-300 text-sm font-medium mb-1' : 'text-slate-600 text-sm font-medium mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className={label}>Workflow Type</p>
          <select className={input} value={form.workflow_type}
            onChange={e => setForm(f => ({ ...f, workflow_type: e.target.value }))}>
            <option value="grade_publication">Grade Publication Approval</option>
            <option value="student_promotion">Student Promotion Consent</option>
          </select>
        </div>
        <div>
          <p className={label}>Class</p>
          <select className={input} value={form.class_id}
            onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
            <option value="">Select class…</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {form.workflow_type === 'grade_publication' && (
          <div>
            <p className={label}>Exam (optional)</p>
            <select className={input} value={form.reference_id}
              onChange={e => {
                const exam = exams.find(ex => String(ex.id) === e.target.value);
                setForm(f => ({
                  ...f,
                  reference_id: e.target.value,
                  reference_name: exam ? exam.exam_name || exam.name : f.reference_name,
                }));
              }}>
              <option value="">Select exam…</option>
              {exams.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.exam_name || ex.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <p className={label}>Reference Name</p>
          <input className={input} placeholder="e.g. Annual Exam 2025" value={form.reference_name}
            onChange={e => setForm(f => ({ ...f, reference_name: e.target.value }))} />
        </div>
        <div>
          <p className={label}>Expires After (days)</p>
          <input type="number" min={1} max={30} className={input} value={form.expires_days}
            onChange={e => setForm(f => ({ ...f, expires_days: e.target.value }))} />
        </div>
      </div>
      <button type="submit" disabled={busy}
        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
        <Send size={15} /> {busy ? 'Sending…' : 'Create & Notify Parents'}
      </button>
    </form>
  );
}

// ── Admin: workflow list grouped by batch ─────────────────────────────────────
function WorkflowList({ dark }) {
  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter]     = useState({ workflow_type: '', status: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getWorkflows({ ...filter, limit: 200 });
      setRows(r.data?.data ?? []);
      setTotal(r.data?.total ?? 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Group by batch_ref
  const batches = rows.reduce((acc, row) => {
    const key = row.batch_ref || 'no-batch';
    if (!acc[key]) acc[key] = { batch_ref: row.batch_ref, rows: [], meta: row };
    acc[key].rows.push(row);
    return acc;
  }, {});

  async function handleCancel(batchRef) {
    if (!window.confirm('Cancel all pending requests in this batch?')) return;
    toast.promise(cancelBatch(batchRef).then(() => load()), {
      loading: 'Cancelling…', success: 'Batch cancelled', error: 'Failed',
    });
  }

  const cell = dark ? 'text-slate-300 text-xs' : 'text-slate-600 text-xs';
  const th   = dark ? 'text-slate-400 text-[11px] font-semibold uppercase' : 'text-slate-500 text-[11px] font-semibold uppercase';

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={filter.workflow_type}
          onChange={e => setFilter(f => ({ ...f, workflow_type: e.target.value }))}
          className={`px-3 py-1.5 rounded-lg border text-sm ${dark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}>
          <option value="">All types</option>
          <option value="grade_publication">Grade Publication</option>
          <option value="student_promotion">Student Promotion</option>
        </select>
        <select value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className={`px-3 py-1.5 rounded-lg border text-sm ${dark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={load} className="text-slate-400 hover:text-slate-600">
          <RefreshCw size={16} />
        </button>
        <span className={`ml-auto text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{total} record(s)</span>
      </div>

      {loading && (
        <div className={`text-center py-8 text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Loading…</div>
      )}

      {!loading && Object.values(batches).length === 0 && (
        <div className={`text-center py-12 text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          No approval workflows found. Create one using the form above.
        </div>
      )}

      <div className="space-y-3">
        {Object.values(batches).map(({ batch_ref, rows: batchRows, meta }) => {
          const pending   = batchRows.filter(r => r.status === 'pending').length;
          const approved  = batchRows.filter(r => r.status === 'approved').length;
          const rejected  = batchRows.filter(r => r.status === 'rejected').length;
          const isOpen    = expanded[batch_ref];

          return (
            <div key={batch_ref}
              className={`rounded-xl border overflow-hidden ${dark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
              {/* Batch header */}
              <div
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none ${dark ? 'hover:bg-slate-750' : 'hover:bg-slate-50'}`}
                onClick={() => setExpanded(e => ({ ...e, [batch_ref]: !e[batch_ref] }))}
              >
                {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${dark ? 'text-white' : 'text-slate-800'}`}>
                    {meta.reference_name}
                    <span className={`ml-2 text-xs font-normal ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      ({meta.workflow_type?.replace('_', ' ')})
                    </span>
                  </p>
                  <p className={`text-[11px] mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {meta.class_name || 'All classes'} · Created {fmtDate(meta.created_at)} · {batchRows.length} request(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {pending  > 0 && <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{pending} pending</span>}
                  {approved > 0 && <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{approved} approved</span>}
                  {rejected > 0 && <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{rejected} rejected</span>}
                  {pending  > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); handleCancel(batch_ref); }}
                      className="text-red-400 hover:text-red-600 p-1 rounded"
                      title="Cancel pending"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded rows */}
              {isOpen && (
                <div className={`border-t ${dark ? 'border-slate-700' : 'border-slate-100'} overflow-x-auto`}>
                  <table className="w-full text-left text-xs">
                    <thead className={dark ? 'bg-slate-750' : 'bg-slate-50'}>
                      <tr>
                        {['Student','Roll No','Class','Parent','Status','Responded','Remarks'].map(h => (
                          <th key={h} className={`px-3 py-2 ${th}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {batchRows.map(row => (
                        <tr key={row.id} className={`border-t ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
                          <td className={`px-3 py-2 font-medium ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{row.student_name || '—'}</td>
                          <td className={`px-3 py-2 ${cell}`}>{row.roll_number || '—'}</td>
                          <td className={`px-3 py-2 ${cell}`}>{row.class_name || '—'}</td>
                          <td className={`px-3 py-2 ${cell}`}>{row.parent_name || '—'}</td>
                          <td className="px-3 py-2"><StatusChip status={row.status} /></td>
                          <td className={`px-3 py-2 ${cell}`}>{fmtDate(row.responded_at)}</td>
                          <td className={`px-3 py-2 ${cell} max-w-[200px] truncate`}>{row.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Parent: my pending approvals ──────────────────────────────────────────────
function MyApprovals({ dark }) {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getMyApprovals();
      setRows(r.data?.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRespond(id, status) {
    const remarks = status === 'rejected'
      ? window.prompt('Reason for rejection (optional):') ?? ''
      : '';
    setResponding(p => ({ ...p, [id]: true }));
    toast.promise(
      respondWorkflow(id, { status, remarks }).then(load),
      { loading: 'Submitting…', success: `Response ${status}`, error: 'Failed to submit' }
    ).finally(() => setResponding(p => ({ ...p, [id]: false })));
  }

  if (loading) return (
    <div className={`text-center py-12 text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Loading…</div>
  );

  const pending = rows.filter(r => r.status === 'pending');
  const done    = rows.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-4">
      {pending.length === 0 && done.length === 0 && (
        <div className={`text-center py-16 ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
          <CheckCircle size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No approval requests for you</p>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <h3 className={`font-semibold text-sm mb-3 ${dark ? 'text-amber-400' : 'text-amber-700'}`}>
            Awaiting your response ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map(row => (
              <div key={row.id}
                className={`rounded-xl border p-4 ${dark ? 'border-slate-700 bg-slate-800' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                      {row.reference_name}
                    </p>
                    <p className={`text-xs mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {row.workflow_type?.replace('_', ' ')} ·
                      Student: <strong>{row.student_name}</strong> ({row.class_name}) ·
                      Requested by: {row.requested_by_name}
                    </p>
                    <p className={`text-xs mt-1 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                      Expires: {fmtDate(row.expires_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={responding[row.id]}
                      onClick={() => handleRespond(row.id, 'approved')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle size={13} /> Approve
                    </button>
                    <button
                      disabled={responding[row.id]}
                      onClick={() => handleRespond(row.id, 'rejected')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <h3 className={`font-semibold text-sm mb-3 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            Past responses
          </h3>
          <div className="space-y-2">
            {done.map(row => (
              <div key={row.id}
                className={`rounded-lg border p-3 flex items-center gap-3 ${dark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                <StatusChip status={row.status} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {row.reference_name} — {row.student_name}
                  </p>
                  {row.remarks && (
                    <p className={`text-xs mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{row.remarks}</p>
                  )}
                </div>
                <span className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{fmtDate(row.responded_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ApprovalWorkflowPage({ dark = false }) {
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'admin';
  const [tab, setTab] = useState(isAdmin ? 'create' : 'my');
  const [listKey, setListKey] = useState(0);

  const TABS = isAdmin
    ? [{ id: 'create', label: 'New Request' }, { id: 'list', label: 'All Workflows' }]
    : [{ id: 'my', label: 'My Approvals' }];

  const card = dark ? 'bg-slate-800 rounded-2xl border border-slate-700 p-6' : 'bg-white rounded-2xl border border-slate-200 p-6 shadow-sm';

  return (
    <div className={`min-h-screen p-6 ${dark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>
            Approval Workflows
          </h1>
          <p className={`text-sm mt-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isAdmin
              ? 'Create grade publication or promotion consent requests for parents.'
              : 'Review and respond to approval requests from the school.'}
          </p>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-xl w-fit ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? dark ? 'bg-slate-600 text-white shadow' : 'bg-white text-slate-800 shadow'
                  : dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'create' && isAdmin && (
          <div className={card}>
            <h2 className={`font-semibold mb-5 ${dark ? 'text-white' : 'text-slate-800'}`}>
              Create New Approval Request
            </h2>
            <CreateWorkflowForm dark={dark} onCreated={() => { setListKey(k => k + 1); setTab('list'); }} />
          </div>
        )}

        {tab === 'list' && isAdmin && (
          <div className={card}>
            <h2 className={`font-semibold mb-5 ${dark ? 'text-white' : 'text-slate-800'}`}>
              All Workflows
            </h2>
            <WorkflowList key={listKey} dark={dark} />
          </div>
        )}

        {tab === 'my' && (
          <div className={card}>
            <h2 className={`font-semibold mb-5 ${dark ? 'text-white' : 'text-slate-800'}`}>
              Approval Requests
            </h2>
            <MyApprovals dark={dark} />
          </div>
        )}
      </div>
    </div>
  );
}

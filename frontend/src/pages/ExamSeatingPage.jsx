import { useState, useEffect, useCallback } from 'react';
import {
  LayoutGrid, Plus, RefreshCw, Trash2, X, Loader2, Building2,
  Printer, ChevronDown, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import {
  getHalls, createHall, deleteHall,
  getPlans, getPlan, generatePlan, deletePlan,
} from '../api/examSeating';
import { getExams } from '../api/exams';

const STRATEGIES = [
  { value: 'roll_alternating',  label: 'Roll Number Order' },
  { value: 'class_alternating', label: 'Class Interleaved' },
  { value: 'alphabetical',      label: 'Alphabetical' },
  { value: 'random',            label: 'Random Shuffle' },
];

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const TABS = ['Seating Plans', 'Exam Halls', 'Generate Plan'];

export default function ExamSeatingPage() {
  const [tab,        setTab]        = useState(0);
  const [halls,      setHalls]      = useState([]);
  const [plans,      setPlans]      = useState([]);
  const [exams,      setExams]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [viewPlan,   setViewPlan]   = useState(null);  // full plan with seats
  const [viewLoading,setViewLoading]= useState(false);
  const [deleteModal,setDeleteModal]= useState(null);

  // Hall form
  const [hallForm,   setHallForm]   = useState({ name: '', capacity: 30, rows: 5, cols: 6 });
  const [creatingHall, setCreatingHall] = useState(false);

  // Generate form
  const [genForm,    setGenForm]    = useState({
    exam_id: '', hall_id: '', strategy: 'roll_alternating', title: '',
  });
  const [generating, setGenerating] = useState(false);

  const loadHalls = useCallback(async () => {
    try {
      const r = await getHalls();
      setHalls(r.data ?? []);
    } catch { toast.error('Failed to load halls'); }
  }, []);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getPlans();
      setPlans(r.data ?? []);
    } catch { toast.error('Failed to load plans'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadPlans();
    loadHalls();
    getExams({ limit: 200 })
      .then(r => setExams(r.data?.data ?? r.data ?? []))
      .catch(() => {});
  }, [loadPlans, loadHalls]);

  async function handleCreateHall(e) {
    e.preventDefault();
    if (!hallForm.name) { toast.error('Hall name required'); return; }
    setCreatingHall(true);
    try {
      await createHall(hallForm);
      toast.success('Hall created');
      setHallForm({ name: '', capacity: 30, rows: 5, cols: 6 });
      loadHalls();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setCreatingHall(false); }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!genForm.exam_id || !genForm.hall_id) { toast.error('Select exam and hall'); return; }
    setGenerating(true);
    try {
      const r = await generatePlan(genForm);
      toast.success('Seating plan generated!');
      setViewPlan(r.data?.data);
      setTab(0);
      loadPlans();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to generate'); }
    finally { setGenerating(false); }
  }

  async function handleViewPlan(id) {
    setViewLoading(true);
    try {
      const r = await getPlan(id);
      setViewPlan(r.data?.data);
    } catch { toast.error('Failed to load plan'); }
    finally { setViewLoading(false); }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    try {
      if (deleteModal.type === 'plan') await deletePlan(deleteModal.id);
      else await deleteHall(deleteModal.id);
      toast.success('Deleted');
      setDeleteModal(null);
      deleteModal.type === 'plan' ? loadPlans() : loadHalls();
    } catch { toast.error('Failed to delete'); }
  }

  function printPlan(plan) {
    if (!plan?.seats?.length) { toast.error('No seats to print'); return; }
    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const grid = buildGrid(plan);
    const rows = grid.map((row, ri) => `
      <tr>
        <th style="background:#e0e0e0;font-size:12px;padding:4px 6px;">${ALPHA[ri] || ri + 1}</th>
        ${row.map((seat, ci) => `
          <td style="border:1px solid #ccc;padding:4px 6px;text-align:center;min-width:80px;font-size:10px;vertical-align:top;background:${seat ? '#f0f4ff' : '#fafafa'}">
            ${seat ? `<b style="color:#4f46e5">${seat.seat_label}</b><br/>${seat.student_name || ''}<br/><span style="color:#888">${seat.roll_number || ''}</span><br/><span style="color:#aaa;font-size:9px">${seat.class_name || ''}</span>` : '<span style="color:#ccc">Empty</span>'}
          </td>`).join('')}
      </tr>`).join('');

    const colHeaders = Array.from({ length: grid[0]?.length || 0 }, (_, i) => `<th style="background:#e0e0e0;font-size:12px;padding:4px 6px;">${i + 1}</th>`).join('');

    const html = `<!DOCTYPE html><html><head><title>Seating - ${plan.exam_title}</title>
      <style>body{font-family:Arial,sans-serif;margin:16px}h1{font-size:16px;margin:0 0 4px}p{font-size:12px;color:#555;margin:0 0 12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px}@media print{body{margin:8px}}</style>
      </head><body>
      <h1>Seating Plan: ${plan.exam_title || ''}</h1>
      <p>Hall: ${plan.hall_name || ''} &nbsp;|&nbsp; Students: ${plan.seats.length} &nbsp;|&nbsp; Strategy: ${plan.strategy?.replace(/_/g,' ') || ''}</p>
      <div style="text-align:center;background:#1e1e2e;color:#fff;padding:6px;border-radius:4px;margin-bottom:10px;font-weight:bold;font-size:12px;">FRONT / BOARD</div>
      <table><thead><tr><th></th>${colHeaders}</tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=()=>{window.print();}</script></body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  // Build grid from seats
  function buildGrid(plan) {
    if (!plan?.seats?.length) return [];
    const grid = [];
    for (let r = 1; r <= plan.hall_rows; r++) {
      const row = [];
      for (let c = 1; c <= plan.hall_cols; c++) {
        const seat = plan.seats.find(s => s.seat_row === r && s.seat_col === c);
        row.push(seat || null);
      }
      grid.push(row);
    }
    return grid;
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LayoutGrid className="text-indigo-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exam Seating</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Auto-generate seating plans for exams</p>
            </div>
          </div>
          <button onClick={() => setTab(2)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Generate Plan
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === i ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >{t}</button>
          ))}
        </div>

        {/* Plans Tab */}
        {tab === 0 && (
          loading ? <PageLoader /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.length === 0 && (
                <div className="col-span-3 text-center py-16 text-gray-500 dark:text-gray-400">
                  No seating plans yet — generate one!
                </div>
              )}
              {plans.map(p => (
                <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{p.exam_title}</p>
                      <p className="text-xs text-gray-500">{p.hall_name} · {p.seat_count} seats</p>
                    </div>
                    <button onClick={() => setDeleteModal({ id: p.id, type: 'plan' })}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400"
                    ><Trash2 size={14} /></button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="capitalize">{p.strategy?.replace(/_/g, ' ')}</span>
                    <span>·</span>
                    <span>{new Date(p.generated_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleViewPlan(p.id)}
                      className="flex-1 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-100 transition-colors"
                    >View Grid</button>
                    <button onClick={async () => { const r = await getPlan(p.id); printPlan(r.data?.data); }}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      title="Print seating chart"
                    ><Printer size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Halls Tab */}
        {tab === 1 && (
          <div className="space-y-6">
            {/* Add Hall Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Add Exam Hall</h3>
              <form onSubmit={handleCreateHall} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hall Name *</label>
                  <input value={hallForm.name} onChange={e => setHallForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Main Hall A"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rows</label>
                  <input type="number" min="1" max="20" value={hallForm.rows}
                    onChange={e => setHallForm(f => ({ ...f, rows: +e.target.value, capacity: +e.target.value * f.cols }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cols</label>
                  <input type="number" min="1" max="20" value={hallForm.cols}
                    onChange={e => setHallForm(f => ({ ...f, cols: +e.target.value, capacity: f.rows * +e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div className="col-span-2 md:col-span-4 flex items-center gap-3">
                  <p className="text-xs text-gray-500">Capacity: <strong>{hallForm.rows * hallForm.cols}</strong> seats</p>
                  <button type="submit" disabled={creatingHall}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors ml-auto"
                  >
                    {creatingHall ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                    Add Hall
                  </button>
                </div>
              </form>
            </div>

            {/* Hall list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {halls.map(h => (
                <div key={h.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{h.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{h.rows} rows × {h.cols} cols = {h.capacity} seats</p>
                    <p className="text-xs text-gray-400 mt-0.5">{h.plan_count} plan{h.plan_count !== '1' ? 's' : ''} generated</p>
                  </div>
                  <button onClick={() => setDeleteModal({ id: h.id, type: 'hall' })}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400"
                  ><Trash2 size={14} /></button>
                </div>
              ))}
              {halls.length === 0 && <p className="text-sm text-gray-500 col-span-3">No halls yet.</p>}
            </div>
          </div>
        )}

        {/* Generate Tab */}
        {tab === 2 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Seating Plan</h2>
              <button onClick={loadHalls} className="text-gray-400 hover:text-indigo-500 transition-colors" title="Refresh halls">
                <RefreshCw size={15} />
              </button>
            </div>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exam *</label>
                <select value={genForm.exam_id} onChange={e => setGenForm(f => ({ ...f, exam_id: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select exam...</option>
                  {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hall *</label>
                <select value={genForm.hall_id} onChange={e => setGenForm(f => ({ ...f, hall_id: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select hall...</option>
                  {halls.map(h => <option key={h.id} value={h.id}>{h.name} ({h.capacity} seats)</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Strategy</label>
                <select value={genForm.strategy} onChange={e => setGenForm(f => ({ ...f, strategy: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                >
                  {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan Title (optional)</label>
                <input type="text" value={genForm.title} onChange={e => setGenForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Mid-Term Seating — Hall A"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <button type="submit" disabled={generating}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {generating ? <Loader2 className="animate-spin" size={16} /> : <LayoutGrid size={16} />}
                {generating ? 'Generating...' : 'Generate Seating Plan'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Seat Grid Viewer */}
      {viewPlan && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl shadow-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">{viewPlan.exam_title}</h2>
                <p className="text-xs text-gray-500">{viewPlan.hall_name} · {viewPlan.seats?.length} students</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => printPlan(viewPlan)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                ><Printer size={14} /> Print</button>
                <button onClick={() => setViewPlan(null)}><X size={20} className="text-gray-500" /></button>
              </div>
            </div>
            <div className="p-5 overflow-x-auto">
              {viewLoading ? <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-indigo-500" size={28} /></div> : (
                <div className="space-y-2">
                  {/* Front label */}
                  <div className="text-center py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs font-bold rounded-lg mb-4">
                    FRONT / BOARD
                  </div>
                  {buildGrid(viewPlan).map((row, ri) => (
                    <div key={ri} className="flex gap-2 items-center">
                      <span className="text-xs text-gray-400 w-5 shrink-0 text-center">{ALPHA[ri]}</span>
                      {row.map((seat, ci) => (
                        <div key={ci} className={`flex-1 min-w-[100px] border rounded-lg p-2 text-center text-xs transition-colors ${
                          seat
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-40'
                        }`}>
                          {seat ? (
                            <>
                              <p className="font-bold text-indigo-700 dark:text-indigo-400">{seat.seat_label}</p>
                              <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{seat.student_name}</p>
                              <p className="text-gray-500 truncate">{seat.roll_number}</p>
                              <p className="text-gray-400 truncate">{seat.class_name}</p>
                            </>
                          ) : (
                            <p className="text-gray-300 dark:text-gray-600">Empty</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Delete {deleteModal.type === 'hall' ? 'Hall' : 'Plan'}?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium">Delete</button>
              <button onClick={() => setDeleteModal(null)} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );

  function buildGrid(plan) {
    if (!plan?.seats?.length) return [];
    const grid = [];
    for (let r = 1; r <= plan.hall_rows; r++) {
      const row = [];
      for (let c = 1; c <= plan.hall_cols; c++) {
        const seat = plan.seats.find(s => s.seat_row === r && s.seat_col === c);
        row.push(seat || null);
      }
      grid.push(row);
    }
    return grid;
  }
}

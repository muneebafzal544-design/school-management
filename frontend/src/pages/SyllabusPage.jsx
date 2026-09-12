import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Plus, Pencil, Trash2, CheckCircle2, Circle,
  ChevronDown, ChevronRight, BarChart3, X, Save, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { getTopics, getStats, createTopic, updateTopic, markComplete, deleteTopic } from '../api/syllabus';
import { useClasses, useSubjects } from '../hooks/useReferenceData';

const YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

function pct(done, total) { return total ? Math.round((done / total) * 100) : 0; }

function ProgressBar({ value, color = '#6366f1' }) {
  return (
    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

export default function SyllabusPage() {
  const { user } = useAuth();
  const isAdmin   = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  const { data: classes = [] }  = useClasses();
  const { data: subjects = [] } = useSubjects();
  const [topics,   setTopics]   = useState([]);
  const [stats,    setStats]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  const [selClass, setSelClass] = useState('');
  const [selSubj,  setSelSubj]  = useState('');
  const [selYear,  setSelYear]  = useState('2024-25');

  // Collapsed subject groups
  const [collapsed, setCollapsed] = useState({});

  // Modal
  const [modal, setModal]   = useState(null); // null | 'add' | 'edit'
  const [form,  setForm]    = useState({ topic: '', description: '', order_no: 1 });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!selClass) { setTopics([]); setStats([]); setLoading(false); return; }
    setLoading(true);
    try {
      const p = { class_id: selClass, academic_year: selYear, ...(selSubj ? { subject_id: selSubj } : {}) };
      const [tr, sr] = await Promise.all([getTopics(p), getStats({ class_id: selClass, academic_year: selYear })]);
      setTopics(Array.isArray(tr.data) ? tr.data : []);
      setStats(Array.isArray(sr.data) ? sr.data : []);
    } catch { toast.error('Failed to load syllabus'); }
    setLoading(false);
  }, [selClass, selSubj, selYear]);

  useEffect(() => { load(); }, [load]);

  // Group topics by subject
  const grouped = topics.reduce((acc, t) => {
    const key = t.subject_id;
    if (!acc[key]) acc[key] = { subject_id: key, subject_name: t.subject_name, items: [] };
    acc[key].items.push(t);
    return acc;
  }, {});

  const totalTopics    = topics.length;
  const completedCount = topics.filter(t => t.is_completed).length;
  const overallPct     = pct(completedCount, totalTopics);

  const openAdd = () => {
    setForm({ topic: '', description: '', order_no: topics.length + 1 });
    setEditId(null);
    setModal('add');
  };

  const openEdit = (t) => {
    setForm({ topic: t.topic, description: t.description || '', order_no: t.order_no });
    setEditId(t.id);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.topic.trim()) return toast.error('Topic name is required');
    if (modal === 'add' && (!selClass || !selSubj)) return toast.error('Select a class and subject first');
    setSaving(true);
    try {
      if (modal === 'add') {
        await createTopic({ class_id: selClass, subject_id: selSubj, ...form, academic_year: selYear });
        toast.success('Topic added');
      } else {
        await updateTopic(editId, form);
        toast.success('Topic updated');
      }
      setModal(null);
      load();
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const handleToggle = async (topic) => {
    try {
      await markComplete(topic.id, { is_completed: !topic.is_completed });
      setTopics(prev => prev.map(t => t.id === topic.id
        ? { ...t, is_completed: !t.is_completed, completed_date: !t.is_completed ? new Date().toISOString().slice(0, 10) : null }
        : t));
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this topic?')) return;
    try { await deleteTopic(id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const ringColor = overallPct >= 80 ? '#10b981' : overallPct >= 50 ? '#f59e0b' : '#6366f1';

  return (
    <Layout>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <PageHeader
          icon={BookOpen}
          title="Syllabus Tracker"
          subtitle="Curriculum coverage per class & subject"
          actions={(isAdmin || isTeacher) && selClass && selSubj && (
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow-sm transition-colors">
              <Plus size={15} /> Add Topic
            </button>
          )}
        />

        {/* Filters */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Class</label>
            <select value={selClass} onChange={e => setSelClass(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">— All classes —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Subject</label>
            <select value={selSubj} onChange={e => setSelSubj(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">— All subjects —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Academic Year</label>
            <select value={selYear} onChange={e => setSelYear(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-6">
        {!selClass ? (
          <div className="text-center py-20">
            <BookOpen size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
            <p className="text-slate-500 font-medium">Select a class to view its syllabus</p>
          </div>
        ) : loading ? <PageLoader /> : (
          <>
            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Overall ring */}
              <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-4 shadow-sm">
                <svg width={64} height={64} className="rotate-[-90deg] shrink-0">
                  <circle cx={32} cy={32} r={26} fill="none" stroke="currentColor" strokeWidth={8} className="text-slate-100 dark:text-slate-800" />
                  <circle cx={32} cy={32} r={26} fill="none" stroke={ringColor} strokeWidth={8} strokeLinecap="round"
                    strokeDasharray={`${(overallPct / 100) * 163} 163`} style={{ transition: 'stroke-dasharray 1s ease' }} />
                  <foreignObject x={0} y={0} width={64} height={64}>
                    <div className="rotate-90 w-full h-full flex items-center justify-center">
                      <span className="text-sm font-extrabold text-slate-800 dark:text-white">{overallPct}%</span>
                    </div>
                  </foreignObject>
                </svg>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Overall</p>
                  <p className="text-xl font-extrabold text-slate-800 dark:text-white">{completedCount}/{totalTopics}</p>
                  <p className="text-[10px] text-slate-400">topics done</p>
                </div>
              </div>

              {stats.slice(0, 3).map(s => (
                <div key={s.subject_id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate mb-2">{s.subject_name}</p>
                  <p className="text-lg font-extrabold text-slate-800 dark:text-white mb-1">{pct(s.completed, s.total)}%</p>
                  <ProgressBar value={pct(s.completed, s.total)}
                    color={pct(s.completed, s.total) >= 80 ? '#10b981' : pct(s.completed, s.total) >= 50 ? '#f59e0b' : '#6366f1'} />
                  <p className="text-[10px] text-slate-400 mt-1">{s.completed}/{s.total} topics</p>
                </div>
              ))}
            </div>

            {/* ── Subject progress bars (all) ── */}
            {stats.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={16} className="text-indigo-500" />
                  <h2 className="font-bold text-slate-800 dark:text-white text-sm">Subject-wise Progress</h2>
                </div>
                <div className="space-y-3">
                  {stats.map(s => {
                    const p = pct(s.completed, s.total);
                    const color = p >= 80 ? '#10b981' : p >= 50 ? '#f59e0b' : '#6366f1';
                    return (
                      <div key={s.subject_id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.subject_name}</span>
                          <span className="text-xs font-bold" style={{ color }}>{s.completed}/{s.total} ({p}%)</span>
                        </div>
                        <ProgressBar value={p} color={color} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Topic list grouped by subject ── */}
            {topics.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <BookOpen size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                <p className="text-slate-500 font-medium">No topics yet</p>
                {(isAdmin || isTeacher) && selSubj && (
                  <button onClick={openAdd}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    <Plus size={14} /> Add First Topic
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.values(grouped).map(grp => {
                  const isOpen = collapsed[grp.subject_id] !== true;
                  const done   = grp.items.filter(t => t.is_completed).length;
                  const p      = pct(done, grp.items.length);
                  const color  = p >= 80 ? '#10b981' : p >= 50 ? '#f59e0b' : '#6366f1';
                  return (
                    <div key={grp.subject_id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                      {/* Subject header */}
                      <button
                        onClick={() => setCollapsed(c => ({ ...c, [grp.subject_id]: isOpen }))}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                          {grp.subject_name?.[0]}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{grp.subject_name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <div className="flex-1 max-w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${p}%`, background: color }} />
                            </div>
                            <span className="text-[11px] font-semibold" style={{ color }}>{done}/{grp.items.length}</span>
                          </div>
                        </div>
                        {isOpen ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
                      </button>

                      {/* Topics */}
                      {isOpen && (
                        <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                          {grp.items.map((t, idx) => (
                            <div key={t.id} className={`flex items-start gap-3 px-5 py-3 ${t.is_completed ? 'bg-emerald-50/40 dark:bg-emerald-900/5' : ''}`}>
                              {/* Order number */}
                              <span className="text-[11px] text-slate-400 font-mono w-5 text-right shrink-0 mt-0.5">{idx + 1}</span>

                              {/* Completion toggle */}
                              <button
                                onClick={() => handleToggle(t)}
                                className="shrink-0 mt-0.5 transition-colors"
                                title={t.is_completed ? 'Mark incomplete' : 'Mark complete'}>
                                {t.is_completed
                                  ? <CheckCircle2 size={18} className="text-emerald-500" />
                                  : <Circle size={18} className="text-slate-300 dark:text-slate-600 hover:text-indigo-400" />}
                              </button>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold ${t.is_completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                                  {t.topic}
                                </p>
                                {t.description && (
                                  <p className="text-[11px] text-slate-400 mt-0.5">{t.description}</p>
                                )}
                                {t.is_completed && t.completed_date && (
                                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                    <CheckCircle2 size={9} /> Completed {t.completed_date}{t.completed_by_name ? ` by ${t.completed_by_name}` : ''}
                                  </p>
                                )}
                              </div>

                              {/* Actions (admin/teacher only) */}
                              {(isAdmin || isTeacher) && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => openEdit(t)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                    <Pencil size={13} />
                                  </button>
                                  {isAdmin && (
                                    <button onClick={() => handleDelete(t.id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-white">
                {modal === 'add' ? 'Add Topic' : 'Edit Topic'}
              </h3>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Topic Name *</label>
                <input type="text" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="e.g. Introduction to Algebra"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description (optional)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Brief notes about this topic…"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Order</label>
                <input type="number" min={1} value={form.order_no} onChange={e => setForm(f => ({ ...f, order_no: Number(e.target.value) }))}
                  className="w-24 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-5">
              <button onClick={() => setModal(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

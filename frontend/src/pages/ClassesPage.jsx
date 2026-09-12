import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Users, Pencil, Trash2, Eye, Search, TrendingUp, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { StatCard } from '../components/ui/Card';
import { PageLoader } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ui/Modal';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { getClasses, createClass, updateClass, deleteClass } from '../api/classes';
import { toPct } from '../utils';
import ClassFormModal from '../components/ClassFormModal';

/* ── Gradient palette for class cards ── */
const CARD_GRADIENTS = [
  ['#8b5cf6','#9333ea'], ['#3b82f6','#4f46e5'], ['#06b6d4','#3b82f6'],
  ['#14b8a6','#10b981'], ['#10b981','#0d9488'], ['#f59e0b','#ea580c'],
  ['#f97316','#dc2626'], ['#ec4899','#f43f5e'], ['#6366f1','#7c3aed'],
  ['#64748b','#475569'],
];
function pickCardGradient(grade) {
  const idx = (grade?.charCodeAt(grade.length - 1) || 0) % CARD_GRADIENTS.length;
  return CARD_GRADIENTS[idx];
}

/* ── Class card ── */
function ClassCard({ cls, onEdit, onDelete, onView }) {
  const pct = toPct(cls.student_count, cls.capacity);
  const [from, to] = pickCardGradient(cls.grade);
  const barColor = pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400';
  const barTrack = pct >= 90 ? 'bg-red-100 dark:bg-red-900/20' : pct >= 70 ? 'bg-amber-100 dark:bg-amber-900/20' : 'bg-emerald-100 dark:bg-emerald-900/20';

  return (
    <div className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-950/50 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
      {/* Header */}
      <div className="relative px-5 pt-5 pb-8 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />

        <div className="relative flex items-start justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="font-extrabold text-white text-lg leading-tight truncate">{cls.name}</h3>
            <p className="text-white/60 text-xs mt-0.5">{cls.academic_year}</p>
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls.status === 'active' ? 'bg-white/20 border-white/30 text-white' : 'bg-black/20 border-black/20 text-white/60'}`}>
            {cls.status}
          </span>
        </div>

        <div className="relative flex flex-wrap gap-1.5 mt-3">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">{cls.grade}</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">Sec {cls.section}</span>
          {cls.room_number && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">Rm {cls.room_number}</span>}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-5 pt-4 pb-4 gap-3.5 -mt-2">
        {cls.class_teacher && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Users size={11} className="text-slate-500 dark:text-slate-400" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate font-medium">{cls.class_teacher}</p>
          </div>
        )}

        {/* Capacity bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Users size={11} /> Enrollment
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {cls.student_count}<span className="text-slate-400 font-normal">/{cls.capacity}</span>
            </span>
          </div>
          <div className={`h-2 ${barTrack} rounded-full overflow-hidden`}>
            <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <p className={`text-right text-[10px] font-semibold mt-1 ${pct >= 90 ? 'text-red-500' : pct >= 70 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {pct}% full
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1 mt-auto border-t border-slate-100 dark:border-slate-800">
          <button onClick={() => onView(cls)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 transition-all hover:shadow-md">
            <Eye size={13} /> View
          </button>
          <button onClick={() => onEdit(cls)}
            className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-all">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(cls)}
            className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-100 dark:hover:border-red-900 transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClassesPage() {
  const navigate = useNavigate();
  const [classes,      setClasses]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try { const res = await getClasses(); setClasses(Array.isArray(res.data) ? res.data : []); }
    catch { toast.error('Failed to load classes'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.grade.toLowerCase().includes(search.toLowerCase()) ||
    (c.class_teacher || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (form) => {
    try {
      if (editTarget) { await updateClass(editTarget.id, form); toast.success('Class updated'); }
      else { await createClass(form); toast.success('Class created'); }
      setModalOpen(false); setEditTarget(null); fetchClasses();
    } catch (err) { toast.error(err.displayMessage || 'Something went wrong'); }
  };

  const handleDelete = async () => {
    try {
      await deleteClass(deleteTarget.id);
      toast.success('Class deleted');
      setDeleteTarget(null); fetchClasses();
    } catch (err) { toast.error(err.displayMessage || 'Failed to delete'); }
  };

  const totalStudents = classes.reduce((s, c) => s + (c.student_count || 0), 0);
  const totalCapacity = classes.reduce((s, c) => s + (c.capacity || 0), 0);

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 pb-20"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea, #4f46e5)' }}>
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <BookOpen size={13} className="text-white" />
                </div>
                <span className="text-white/60 text-xs font-semibold uppercase tracking-widest">SchoolMS</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Classes</h1>
              <p className="text-white/60 text-sm mt-1">Manage classes, sections and enrollments</p>
            </div>
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-violet-700 text-sm font-bold rounded-xl shadow-lg hover:bg-violet-50 transition-all hover:scale-105 self-start sm:self-auto shrink-0"
            >
              <Plus size={16} /> New Class
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 -mt-10 pb-10 space-y-5">

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total Classes"  value={classes.length}  icon={BookOpen}   gradientFrom="#8b5cf6" gradientTo="#9333ea" iconBg="bg-violet-50 dark:bg-violet-500/10"  textColor="text-violet-600 dark:text-violet-400" />
            <StatCard label="Active"         value={classes.filter(c => c.status === 'active').length} icon={TrendingUp} gradientFrom="#10b981" gradientTo="#0d9488" iconBg="bg-emerald-50 dark:bg-emerald-500/10" textColor="text-emerald-600 dark:text-emerald-400" />
            <StatCard label="Enrolled"       value={totalStudents}   icon={Users}      gradientFrom="#3b82f6" gradientTo="#06b6d4" iconBg="bg-blue-50 dark:bg-blue-500/10"     textColor="text-blue-600 dark:text-blue-400" />
            <StatCard label="Capacity"       value={totalCapacity}   icon={Users}      gradientFrom="#f59e0b" gradientTo="#ea580c" iconBg="bg-amber-50 dark:bg-amber-500/10"   textColor="text-amber-600 dark:text-amber-400" />
          </div>

          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search classes, teachers…"
                className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
            {search && <p className="text-xs text-slate-400 font-medium shrink-0">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>}
          </div>

          {/* Grid */}
          {loading ? (
            <PageLoader />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No classes found"
              description={search ? 'Try a different search' : 'Create your first class to get started'}
              actionLabel={!search ? 'Create Class' : undefined}
              onAction={() => { setEditTarget(null); setModalOpen(true); }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filtered.map(cls => (
                <ClassCard
                  key={cls.id} cls={cls}
                  onEdit={c => { setEditTarget(c); setModalOpen(true); }}
                  onDelete={c => setDeleteTarget(c)}
                  onView={c => navigate(`/classes/${c.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ClassFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSubmit={handleSubmit}
        classData={editTarget}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Class"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
}

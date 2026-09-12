import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen, Plus, Send, Edit2, Trash2, ChevronLeft, ChevronRight,
  Calendar, Share2, AlertCircle, Loader2, X, BookMarked, FileText,
  Paperclip, Eye, GraduationCap, Star, MessageSquare, Globe,
  Lock, Unlock, RefreshCw, CheckCircle2, Clock, BookText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getClasses } from '../api/classes';
import { getClassSubjects } from '../api/subjects';
import { getStudent } from '../api/students';
import {
  getDiaries, createDiary, updateDiary, deleteDiary, submitDiary,
  getClassDiary, publishDiary, unpublishDiary,
  getWeekOverview, getInchargeClasses, getTeacherSubjects,
} from '../api/diary';

/* ═══════════════════════════════════════════════════════
   CONSTANTS & HELPERS
═══════════════════════════════════════════════════════ */
const TODAY = new Date().toISOString().slice(0, 10);
const DAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_META = {
  draft:     { label: 'Draft',     cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',           dot: 'bg-slate-400' },
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',         dot: 'bg-amber-400' },
  published: { label: 'Published', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-400' },
};

const SUBJECT_PALETTE = [
  ['#6366f1','#8b5cf6'],['#0ea5e9','#06b6d4'],['#10b981','#14b8a6'],
  ['#f59e0b','#f97316'],['#ec4899','#f43f5e'],['#84cc16','#10b981'],
  ['#8b5cf6','#a855f7'],['#ef4444','#f97316'],
];
const subjectGrad = (name = '') => SUBJECT_PALETTE[(name.charCodeAt(0) || 0) % SUBJECT_PALETTE.length];

function fmtLong(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-PK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function getMondayOf(dateStr) {
  const d   = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}
function classLabel(c) {
  return c?.name || `${c?.grade || ''}-${c?.section || ''}`;
}

/* ═══════════════════════════════════════════════════════
   SMALL SHARED UI
═══════════════════════════════════════════════════════ */

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.dot}`} />
      {m.label}
    </span>
  );
}

function SubjectAvatar({ name, size = 'md' }) {
  const [a, b] = subjectGrad(name);
  const sz = size === 'lg' ? 'w-11 h-11 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div className={`${sz} rounded-xl flex items-center justify-center text-white font-extrabold shrink-0`}
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
      {(name || '?')[0]}
    </div>
  );
}

function InfoRow({ icon: Icon, label, content, dark }) {
  if (!content?.trim()) return null;
  return (
    <div className={`rounded-xl p-3 ${dark ? 'bg-slate-800/70' : 'bg-slate-50'}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={12} className="text-indigo-400 shrink-0" />
        <span className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
      </div>
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{content}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ENTRY FORM  (create / edit — teacher & admin)
═══════════════════════════════════════════════════════ */
function EntryForm({ dark, editEntry, teacherSubjects, isAdmin, onSaved, onClose, prefillClass, prefillDate }) {
  /* For admin we fetch subjects per-class; for teacher we use teacherSubjects */
  const [form, setForm] = useState({
    class_id:   editEntry?.class_id   ?? prefillClass ?? '',
    subject_id: editEntry?.subject_id ?? '',
    date:       editEntry?.date?.slice(0, 10) ?? prefillDate ?? TODAY,
    homework:   editEntry?.homework   ?? '',
    classwork:  editEntry?.classwork  ?? '',
    notes:      editEntry?.notes      ?? '',
  });
  const [adminSubjects, setAdminSubjects] = useState([]);
  const [adminClasses,  setAdminClasses]  = useState([]);
  const [file,   setFile]   = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  /* Admin: load all classes once */
  useEffect(() => {
    if (!isAdmin) return;
    getClasses({ status: 'active' }).then(r => {
      const rows = r.data?.data ?? r.data ?? [];
      setAdminClasses(Array.isArray(rows) ? rows : []);
    }).catch(() => {});
  }, [isAdmin]);

  /* Admin: fetch subjects when class changes */
  useEffect(() => {
    if (!isAdmin || !form.class_id) { setAdminSubjects([]); return; }
    getClassSubjects(form.class_id).then(r => {
      const rows = r.data?.data ?? r.data ?? [];
      setAdminSubjects(Array.isArray(rows) ? rows : []);
    }).catch(() => setAdminSubjects([]));
  }, [isAdmin, form.class_id]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  /* Teacher mode: unique classes from their assignments */
  const myClasses  = [...new Map((teacherSubjects || []).map(ts => [ts.class_id, ts])).values()];
  const mySubjects = (teacherSubjects || []).filter(ts => String(ts.class_id) === String(form.class_id));

  /* Displayed subjects list */
  const subjectList = isAdmin
    ? adminSubjects.map(s => ({ subject_id: s.subject_id ?? s.id, subject_name: s.subject_name ?? s.name }))
    : mySubjects;

  const classListForForm = isAdmin ? adminClasses : myClasses.map(ts => ({
    id: ts.class_id, name: ts.class_name, grade: ts.grade, section: ts.section,
  }));

  const handleSave = async (submit = false) => {
    if (!form.class_id || !form.date) { toast.error('Class and date are required'); return; }
    if (!form.homework?.trim() && !form.classwork?.trim() && !form.notes?.trim()) {
      toast.error('Fill in at least one of homework, classwork, or notes'); return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (file) fd.append('attachment', file);

      let entryId = editEntry?.id;
      if (entryId) {
        await updateDiary(entryId, fd);
        toast.success('Entry updated');
      } else {
        const r = await createDiary(fd);
        entryId = r.data?.data?.id;
        toast.success('Saved as draft');
      }
      if (submit && entryId) {
        await submitDiary(entryId);
        toast.success('Submitted for review');
      }
      onSaved?.();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const inp = `w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors focus:ring-2 focus:ring-indigo-500/30 ${
    dark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
         : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'}`;
  const lbl = `text-xs font-semibold uppercase tracking-wide mb-1.5 block ${dark ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className={`rounded-2xl border overflow-hidden ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-100 bg-slate-50/60'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/30">
            <BookOpen size={15} className="text-white" />
          </div>
          <div>
            <p className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>
              {editEntry?.id ? 'Edit Diary Entry' : 'New Diary Entry'}
            </p>
            <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Draft → Submit for review → Published by incharge</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Class */}
          <div>
            <label className={lbl}>Class</label>
            <select value={form.class_id}
              onChange={e => { set('class_id', e.target.value); set('subject_id', ''); }}
              className={inp} disabled={!!editEntry?.id}>
              <option value="">— Select class —</option>
              {classListForForm.map(c => (
                <option key={c.id} value={c.id}>{classLabel(c)}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className={lbl}>Subject</label>
            <select value={form.subject_id} onChange={e => set('subject_id', e.target.value)}
              className={inp} disabled={!!editEntry?.id || (!form.class_id)}>
              <option value="">— Select subject —</option>
              {subjectList.map(s => (
                <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className={lbl}>Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className={inp} disabled={!!editEntry?.id} />
          </div>
        </div>

        {/* Classwork */}
        <div>
          <label className={lbl}>
            <BookMarked size={11} className="inline mr-1 -mt-0.5" />Classwork
          </label>
          <textarea rows={2} value={form.classwork} onChange={e => set('classwork', e.target.value)}
            placeholder="Topics covered in class today…" className={`${inp} resize-none`} />
        </div>

        {/* Homework */}
        <div>
          <label className={lbl}>
            <Edit2 size={11} className="inline mr-1 -mt-0.5" />Homework
          </label>
          <textarea rows={2} value={form.homework} onChange={e => set('homework', e.target.value)}
            placeholder="e.g. Complete Exercise 3B Q1–Q5" className={`${inp} resize-none`} />
        </div>

        {/* Notes */}
        <div>
          <label className={lbl}>
            <MessageSquare size={11} className="inline mr-1 -mt-0.5" />Notes / Reminders
          </label>
          <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Special instructions, test alert, bring items…" className={`${inp} resize-none`} />
        </div>

        {/* Attachment */}
        <div>
          <label className={lbl}><Paperclip size={11} className="inline mr-1 -mt-0.5" />Attachment (optional)</label>
          <div onClick={() => fileRef.current?.click()}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
              dark ? 'bg-slate-800 border-slate-600 hover:border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-400'
            }`}>
            <Paperclip size={14} className="text-indigo-400 shrink-0" />
            <span className={`text-sm flex-1 truncate ${file || editEntry?.attachment_name ? (dark ? 'text-white' : 'text-slate-700') : (dark ? 'text-slate-500' : 'text-slate-400')}`}>
              {file?.name || editEntry?.attachment_name || 'Click to attach PDF or image…'}
            </span>
            {(file || editEntry?.attachment_name) && (
              <button onClick={e => { e.stopPropagation(); setFile(null); }}
                className={`shrink-0 ${dark ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>
                <X size={12} />
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
            onChange={e => setFile(e.target.files?.[0] || null)} />
        </div>
      </div>

      {/* Footer */}
      <div className={`px-5 py-4 border-t flex items-center justify-between gap-3 flex-wrap ${dark ? 'border-slate-700 bg-slate-800/30' : 'border-slate-100 bg-slate-50/50'}`}>
        <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          Save draft → submit for review → class incharge publishes.
        </p>
        <div className="flex gap-2">
          <button onClick={() => handleSave(false)} disabled={saving}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
              dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save Draft'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90 disabled:opacity-50 shadow-md shadow-indigo-500/20 transition-opacity">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
            Submit for Review
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ENTRY CARD
═══════════════════════════════════════════════════════ */
function EntryCard({ entry, dark, onEdit, onDelete, isIncharge, onRemarkSaved }) {
  const [editingRemark, setEditingRemark] = useState(false);
  const [remark,  setRemark]  = useState(entry.incharge_remark || '');
  const [saving,  setSaving]  = useState(false);
  const [a, b] = subjectGrad(entry.subject_name || '');

  const saveRemark = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('incharge_remark', remark);
      await updateDiary(entry.id, fd);
      toast.success('Remark saved');
      setEditingRemark(false);
      onRemarkSaved?.();
    } catch { toast.error('Failed to save remark'); }
    setSaving(false);
  };

  return (
    <div className={`rounded-2xl border overflow-hidden flex flex-col ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      {/* Color bar */}
      <div className="h-1 shrink-0" style={{ background: `linear-gradient(to right, ${a}, ${b})` }} />

      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <SubjectAvatar name={entry.subject_name || '?'} />
            <div>
              <p className={`font-bold text-sm leading-tight ${dark ? 'text-white' : 'text-slate-800'}`}>
                {entry.subject_name || 'General'}
              </p>
              <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{entry.teacher_name || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={entry.status} />
            {entry.status !== 'published' && (
              <>
                {onEdit && (
                  <button onClick={() => onEdit(entry)}
                    className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-slate-500 hover:text-indigo-400 hover:bg-slate-800' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                    <Edit2 size={12} />
                  </button>
                )}
                {onDelete && (
                  <button onClick={() => onDelete(entry.id)}
                    className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-slate-500 hover:text-red-400 hover:bg-slate-800' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}>
                    <Trash2 size={12} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2 flex-1">
          <InfoRow icon={BookMarked}    label="Classwork" content={entry.classwork} dark={dark} />
          <InfoRow icon={Edit2}         label="Homework"  content={entry.homework}  dark={dark} />
          <InfoRow icon={MessageSquare} label="Notes"     content={entry.notes}     dark={dark} />
        </div>

        {/* Attachment */}
        {entry.attachment_url && (
          <a href={entry.attachment_url} target="_blank" rel="noreferrer"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}>
            <FileText size={13} className="text-indigo-400 shrink-0" />
            <span className="truncate flex-1">{entry.attachment_name || 'View Attachment'}</span>
            <Eye size={12} className="shrink-0 opacity-60" />
          </a>
        )}

        {/* Incharge remark section */}
        {isIncharge && (
          <div className={`pt-3 border-t ${dark ? 'border-slate-700/60' : 'border-slate-100'}`}>
            {editingRemark ? (
              <div className="space-y-2">
                <textarea rows={2} value={remark} onChange={e => setRemark(e.target.value)}
                  placeholder="Add your remark for this entry…"
                  className={`w-full px-3 py-2 rounded-xl text-xs border resize-none outline-none focus:ring-1 focus:ring-indigo-500/40 ${
                    dark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
                         : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400'
                  }`} />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingRemark(false)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${dark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    Cancel
                  </button>
                  <button onClick={saveRemark} disabled={saving}
                    className="px-3 py-1.5 text-xs rounded-lg bg-indigo-500 text-white font-semibold hover:bg-indigo-600 flex items-center gap-1">
                    {saving ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} Save
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEditingRemark(true)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  entry.incharge_remark
                    ? (dark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700')
                    : (dark ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600')
                }`}>
                <Star size={11} />
                {entry.incharge_remark
                  ? <span className="italic">"{entry.incharge_remark}"</span>
                  : 'Add incharge remark…'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   WEEK STRIP CALENDAR
═══════════════════════════════════════════════════════ */
function WeekStrip({ classId, selectedDate, onSelectDate, dark }) {
  const [week, setWeek]       = useState([]);
  const [weekStart, setWS]    = useState(() => getMondayOf(selectedDate || TODAY));

  const load = useCallback(async (ws) => {
    if (!classId) return;
    try {
      const r = await getWeekOverview(classId, ws);
      setWeek(r.data?.data ?? []);
    } catch { setWeek([]); }
  }, [classId]);

  useEffect(() => { load(weekStart); }, [weekStart, load]);

  const cells = week.length ? week : Array.from({ length: 6 }, (_, i) => ({ date: addDays(weekStart, i) }));

  return (
    <div className={`rounded-2xl border p-4 ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Weekly Overview</span>
        <div className="flex gap-1">
          <button onClick={() => setWS(d => addDays(d, -7))}
            className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => setWS(d => addDays(d, 7))}
            className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {cells.map((d, i) => {
          const dateStr    = (d.date || addDays(weekStart, i)).slice(0, 10);
          const isSelected = dateStr === selectedDate?.slice(0, 10);
          const isToday    = dateStr === TODAY;
          const dayObj     = new Date(dateStr + 'T00:00:00');

          return (
            <button key={i} onClick={() => onSelectDate(dateStr)}
              className={`flex flex-col items-center py-2.5 px-1 rounded-xl transition-all duration-150 ${
                isSelected
                  ? 'bg-gradient-to-b from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30'
                  : dark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}>
              <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">
                {DAYS[dayObj.getDay()]}
              </span>
              <span className={`text-lg font-extrabold mt-0.5 leading-none ${isSelected ? 'text-white' : isToday ? 'text-indigo-500 dark:text-indigo-400' : ''}`}>
                {dayObj.getDate()}
              </span>
              <div className="flex gap-0.5 mt-1.5 h-1.5 items-center">
                {d.published_count > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Published" />}
                {(d.pending_count > 0 || d.draft_count > 0) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Pending/Draft" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-700/50">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />Published</span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />Draft/Pending</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PUBLISH PANEL
═══════════════════════════════════════════════════════ */
function PublishPanel({ classId, date, publish, entries, teacherId, dark, onRefresh }) {
  const [remarks, setRemarks] = useState(publish?.general_remarks || '');
  const [busy,    setBusy]    = useState(false);
  const [showWA,  setShowWA]  = useState(false);

  /* Sync remarks when publish changes */
  useEffect(() => { setRemarks(publish?.general_remarks || ''); }, [publish?.general_remarks]);

  const isPublished    = !!publish;
  const totalEntries   = entries.length;
  const draftOrPending = entries.filter(e => e.status !== 'published').length;

  const handlePublish = async () => {
    if (!totalEntries) { toast.error('No diary entries found for this date'); return; }
    setBusy(true);
    try {
      await publishDiary(classId, date, { general_remarks: remarks, teacher_id: teacherId });
      toast.success('📢 Diary published! Students & parents can now view it.');
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to publish'); }
    setBusy(false);
  };

  const handleUnpublish = async () => {
    setBusy(true);
    try {
      await unpublishDiary(classId, date);
      toast.success('Diary unpublished');
      onRefresh();
    } catch { toast.error('Failed to unpublish'); }
    setBusy(false);
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      {/* Status bar */}
      <div className={`flex items-center justify-between px-5 py-3 border-b ${
        isPublished
          ? (dark ? 'bg-emerald-900/20 border-emerald-800/30' : 'bg-emerald-50 border-emerald-100')
          : (dark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100')
      }`}>
        <div className="flex items-center gap-2">
          {isPublished
            ? <Globe size={15} className="text-emerald-500" />
            : <Lock  size={15} className={dark ? 'text-slate-500' : 'text-slate-400'} />}
          <span className={`text-sm font-bold ${isPublished ? 'text-emerald-600 dark:text-emerald-400' : (dark ? 'text-slate-300' : 'text-slate-600')}`}>
            {isPublished ? 'Published' : 'Not Published Yet'}
          </span>
          {isPublished && publish?.published_at && (
            <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              · {new Date(publish.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {draftOrPending > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {draftOrPending} not yet published
            </span>
          )}
          <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{totalEntries} total entries</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Remarks textarea */}
        <div>
          <label className={`text-xs font-semibold uppercase tracking-wide mb-1.5 block ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            General Instructions / Remarks
          </label>
          <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)}
            disabled={isPublished}
            placeholder="e.g. Please bring lab coat tomorrow. PTA meeting on Friday at 2pm…"
            className={`w-full px-3 py-2.5 rounded-xl text-sm border resize-none outline-none transition-colors focus:ring-2 focus:ring-indigo-500/30 ${
              dark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500 disabled:opacity-40'
                   : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 disabled:opacity-40'
            }`} />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {!isPublished ? (
            <button onClick={handlePublish} disabled={busy || !totalEntries}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 shadow-sm transition-colors">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              Publish Diary
            </button>
          ) : (
            <>
              <button onClick={handleUnpublish} disabled={busy}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Unlock size={13} />}
                Unpublish
              </button>
              <button onClick={() => setShowWA(v => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#25D366] text-white hover:bg-[#20b558] transition-colors">
                <Share2 size={13} />
                {showWA ? 'Hide' : 'WhatsApp Text'}
              </button>
            </>
          )}
        </div>

        {/* WhatsApp preview */}
        {showWA && publish?.whatsapp_text && (
          <div className={`rounded-xl border overflow-hidden ${dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`flex items-center justify-between px-4 py-2.5 border-b ${dark ? 'border-slate-700 bg-[#075E54]/30' : 'border-slate-200 bg-[#25D366]/10'}`}>
              <span className={`text-xs font-bold ${dark ? 'text-emerald-400' : 'text-emerald-700'}`}>WhatsApp Format — Ready to Copy</span>
              <button onClick={() => { navigator.clipboard.writeText(publish.whatsapp_text); toast.success('Copied to clipboard!'); }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#25D366] text-white hover:bg-[#20b558] transition-colors">
                <Share2 size={11} /> Copy
              </button>
            </div>
            <pre className={`px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap font-mono max-h-72 overflow-y-auto ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
              {publish.whatsapp_text}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STUDENT / PARENT READ VIEW
═══════════════════════════════════════════════════════ */
function StudentDiaryView({ dark, classId }) {
  const [date,    setDate]    = useState(TODAY);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const r = await getClassDiary(classId, date);
      setData(r.data?.data ?? null);
    } catch { setData(null); }
    setLoading(false);
  }, [classId, date]);

  useEffect(() => { load(); }, [load]);

  const published   = (data?.entries || []).filter(e => e.status === 'published');
  const isPublished = !!data?.publish;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Date navigator */}
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <button onClick={() => setDate(d => addDays(d, -1))}
          className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{fmtLong(date)}</p>
          {date === TODAY && <p className="text-xs text-indigo-500 font-semibold">Today</p>}
        </div>
        <button onClick={() => setDate(d => addDays(d, 1))} disabled={date >= TODAY}
          className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
          <ChevronRight size={16} />
        </button>
      </div>

      {!classId ? (
        <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border gap-3 ${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <AlertCircle size={28} className={dark ? 'text-slate-600' : 'text-slate-400'} />
          <p className={`text-sm ${dark ? 'text-slate-500' : 'text-slate-400'}`}>No class assigned to your account yet.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="text-indigo-400 animate-spin" />
        </div>
      ) : !isPublished ? (
        <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border gap-4 ${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <Clock size={28} className={dark ? 'text-slate-600' : 'text-slate-400'} />
          </div>
          <div className="text-center">
            <p className={`font-bold ${dark ? 'text-slate-300' : 'text-slate-600'}`}>Diary not published yet</p>
            <p className={`text-sm mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Check back once the class teacher publishes it.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Hero banner */}
          <div className="rounded-2xl p-5 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #a78bfa 0%, transparent 60%)' }} />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                <BookText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-lg leading-tight">{data?.class?.name || 'My Class'} — Daily Diary</p>
                <p className="text-indigo-200 text-sm">{fmtLong(date)}</p>
              </div>
            </div>
            <div className="relative flex gap-5 mt-4 pt-4 border-t border-white/20 text-sm">
              <span className="flex items-center gap-1.5 font-semibold">
                <BookMarked size={13} /> {published.length} Subjects
              </span>
              {published.some(e => e.homework) && (
                <span className="flex items-center gap-1.5 font-semibold"><Edit2 size={13} /> Homework</span>
              )}
              {published.some(e => e.attachment_url) && (
                <span className="flex items-center gap-1.5 font-semibold"><Paperclip size={13} /> Attachments</span>
              )}
            </div>
          </div>

          {/* Subject cards */}
          {published.length === 0 ? (
            <p className={`text-center py-10 text-sm ${dark ? 'text-slate-500' : 'text-slate-400'}`}>No entries for this date.</p>
          ) : (
            <div className="space-y-3">
              {published.map(e => {
                const [a, b] = subjectGrad(e.subject_name || '');
                return (
                  <div key={e.id} className={`rounded-2xl border overflow-hidden ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="h-1" style={{ background: `linear-gradient(to right, ${a}, ${b})` }} />
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <SubjectAvatar name={e.subject_name || '?'} size="lg" />
                        <div>
                          <p className={`font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{e.subject_name || 'General'}</p>
                          <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{e.teacher_name}</p>
                        </div>
                      </div>
                      <InfoRow icon={BookMarked}    label="Classwork" content={e.classwork} dark={dark} />
                      <InfoRow icon={Edit2}         label="Homework"  content={e.homework}  dark={dark} />
                      <InfoRow icon={MessageSquare} label="Notes"     content={e.notes}     dark={dark} />
                      {e.attachment_url && (
                        <a href={e.attachment_url} target="_blank" rel="noreferrer"
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                            dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}>
                          <FileText size={13} className="text-indigo-400 shrink-0" />
                          <span className="truncate flex-1">{e.attachment_name || 'View Attachment'}</span>
                          <Eye size={12} className="shrink-0 opacity-60" />
                        </a>
                      )}
                      {e.incharge_remark && (
                        <div className={`flex items-start gap-2 px-3 py-2 rounded-xl text-xs ${dark ? 'bg-amber-900/20 text-amber-400 border border-amber-800/20' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          <Star size={11} className="mt-0.5 shrink-0" />
                          <span className="italic">{e.incharge_remark}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* General remarks */}
          {data?.publish?.general_remarks && (
            <div className={`rounded-2xl border p-4 ${dark ? 'bg-amber-900/10 border-amber-800/30' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-amber-500 shrink-0" />
                <span className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-amber-400' : 'text-amber-700'}`}>General Instructions</span>
              </div>
              <p className={`text-sm leading-relaxed ${dark ? 'text-amber-200' : 'text-amber-900'}`}>{data.publish.general_remarks}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function DiaryPage() {
  const { user }         = useAuth();
  const { isDark: dark } = useTheme();

  const role     = user?.role;
  const entityId = user?.entity_id;   // teacher_id for teacher, student_id for student/parent

  const isAdmin   = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent  = role === 'parent';

  /* ── Data state ── */
  const [allClasses,      setAllClasses]      = useState([]);
  const [inchargeClasses, setInchargeClasses] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [studentClassId,  setStudentClassId]  = useState(null); // for student/parent view
  const [selectedClass,   setSelectedClass]   = useState('');
  const [selectedDate,    setSelectedDate]    = useState(TODAY);
  const [classDiary,      setClassDiary]      = useState(null);
  const [myEntries,       setMyEntries]       = useState([]);
  const [loadingInit,     setLoadingInit]     = useState(true);
  const [loadingDiary,    setLoadingDiary]    = useState(false);

  /* ── UI state ── */
  const [activeTab,  setActiveTab]  = useState(isStudent || isParent ? 'view' : 'write');
  const [showForm,   setShowForm]   = useState(false);
  const [editEntry,  setEditEntry]  = useState(null);

  const isIncharge = inchargeClasses.some(c => String(c.id) === String(selectedClass));

  /* ── Boot ── */
  useEffect(() => {
    const init = async () => {
      setLoadingInit(true);
      try {
        if (isAdmin) {
          const r = await getClasses({ status: 'active' });
          const rows = r.data?.data ?? r.data ?? [];
          setAllClasses(Array.isArray(rows) ? rows : []);

        } else if (isTeacher && entityId) {
          const [inchR, subjR] = await Promise.all([
            getInchargeClasses(entityId),
            getTeacherSubjects(entityId),
          ]);
          const inchArr = inchR.data?.data ?? [];
          const subjArr = subjR.data?.data ?? [];
          setInchargeClasses(Array.isArray(inchArr) ? inchArr : []);
          setTeacherSubjects(Array.isArray(subjArr) ? subjArr : []);
          // Unique class list for selectors
          const uniqueCls = [...new Map(subjArr.map(s => [s.class_id, {
            id: s.class_id, name: s.class_name, grade: s.grade, section: s.section,
          }])).values()];
          setAllClasses(uniqueCls);
          if (uniqueCls.length) setSelectedClass(String(uniqueCls[0].id));

        } else if ((isStudent || isParent) && entityId) {
          // Fetch student record to get their class_id
          const r = await getStudent(entityId);
          const student = r.data?.data ?? r.data;
          if (student?.class_id) setStudentClassId(String(student.class_id));
        }
      } catch { /* silent */ }
      setLoadingInit(false);
    };
    init();
  }, [isAdmin, isTeacher, isStudent, isParent, entityId]);

  /* ── Load teacher's own entries for selected date ── */
  const loadMyEntries = useCallback(async () => {
    if (!isTeacher && !isAdmin) return;
    try {
      const params = { date: selectedDate };
      if (isTeacher && entityId) params.teacher_id = entityId;
      if (selectedClass) params.class_id = selectedClass;
      const r = await getDiaries(params);
      setMyEntries(r.data?.data ?? []);
    } catch { setMyEntries([]); }
  }, [isTeacher, isAdmin, entityId, selectedClass, selectedDate]);

  /* ── Load full class diary (for incharge/admin tab) ── */
  const loadClassDiary = useCallback(async () => {
    if (!selectedClass) { setClassDiary(null); return; }
    setLoadingDiary(true);
    try {
      const r = await getClassDiary(selectedClass, selectedDate);
      setClassDiary(r.data?.data ?? null);
    } catch { setClassDiary(null); }
    setLoadingDiary(false);
  }, [selectedClass, selectedDate]);

  useEffect(() => {
    loadMyEntries();
    if ((isAdmin || isIncharge) && activeTab === 'diary') loadClassDiary();
  }, [selectedClass, selectedDate, loadMyEntries, loadClassDiary, isAdmin, isIncharge, activeTab]);

  /* ── Entry actions ── */
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this diary entry?')) return;
    try {
      await deleteDiary(id);
      toast.success('Entry deleted');
      loadMyEntries();
      if (activeTab === 'diary') loadClassDiary();
    } catch { toast.error('Failed to delete'); }
  };

  const handleEdit = (entry) => {
    setEditEntry(entry);
    setShowForm(true);
    setActiveTab('write');
  };

  const onSaved = () => {
    setShowForm(false);
    setEditEntry(null);
    loadMyEntries();
    if (activeTab === 'diary') loadClassDiary();
  };

  /* ── Tabs ── */
  const tabs = [];
  if (isTeacher || isAdmin) {
    tabs.push({ id: 'write', label: 'Write Entry',   icon: Edit2     });
    if (isAdmin || isIncharge)
      tabs.push({ id: 'diary', label: 'Class Diary',  icon: BookOpen  });
  }
  if (isStudent || isParent) {
    tabs.push({ id: 'view', label: "Today's Diary", icon: Eye });
  }

  const diaryEntries = classDiary?.entries || [];
  const diaryPublish = classDiary?.publish  || null;

  if (loadingInit) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 size={32} className="text-indigo-400 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={`min-h-screen ${dark ? 'bg-slate-950' : 'bg-slate-50'}`}>

        {/* ─── Hero Header ─── */}
        <div className="relative overflow-hidden px-6 pt-8 pb-16"
          style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81, #4f46e5)' }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 75% 50%, #a78bfa 0%, transparent 55%)' }} />
          <div className="relative max-w-5xl mx-auto flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <BookText size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">School Diary</h1>
              <p className="text-indigo-300 text-sm mt-0.5">
                {isAdmin   ? 'Manage & publish daily class diaries for all classes'   :
                 isTeacher ? 'Write diary entries for your subjects & publish as class incharge' :
                 isParent  ? "View your child's published daily diary"               :
                             'View your daily class diary & homework'}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Main Content ─── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8 pb-12">

          {/* Tabs pill */}
          {tabs.length > 1 && (
            <div className={`flex gap-1 p-1 rounded-2xl mb-6 w-fit shadow-xl ${dark ? 'bg-slate-800' : 'bg-white'} relative`}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => {
                  setActiveTab(t.id);
                  if (t.id === 'diary' && selectedClass) loadClassDiary();
                }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    activeTab === t.id
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30'
                      : dark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}>
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
          )}

          {/* ══════════════════════════════════════════
              TAB: WRITE ENTRY  (teacher + admin)
          ══════════════════════════════════════════ */}
          {activeTab === 'write' && (
            <div className="space-y-6">
              {/* Controls */}
              <div className={`flex flex-wrap items-center gap-3 px-5 py-4 rounded-2xl border ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <Calendar size={15} className={dark ? 'text-slate-400' : 'text-slate-500'} />
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  className={`text-sm px-3 py-2 rounded-xl border outline-none cursor-pointer ${
                    dark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`} />

                {allClasses.length > 0 && (
                  <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                    className={`text-sm px-3 py-2 rounded-xl border outline-none ${
                      dark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                    <option value="">All my classes</option>
                    {allClasses.map(c => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
                  </select>
                )}

                <button onClick={() => { setEditEntry(null); setShowForm(v => !v); }}
                  className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90 shadow-md shadow-indigo-500/25 transition-opacity">
                  {showForm && !editEntry ? <X size={14} /> : <Plus size={14} />}
                  {showForm && !editEntry ? 'Close' : 'New Entry'}
                </button>
              </div>

              {/* Form */}
              {showForm && (
                <EntryForm
                  dark={dark}
                  isAdmin={isAdmin}
                  editEntry={editEntry}
                  teacherSubjects={teacherSubjects}
                  prefillClass={selectedClass}
                  prefillDate={selectedDate}
                  onSaved={onSaved}
                  onClose={() => { setShowForm(false); setEditEntry(null); }}
                />
              )}

              {/* My entries list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {selectedDate === TODAY ? "Today's Entries" : `Entries — ${fmtLong(selectedDate)}`}
                  </p>
                  <button onClick={loadMyEntries}
                    className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}>
                    <RefreshCw size={13} />
                  </button>
                </div>

                {myEntries.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border ${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <BookOpen size={32} className={`mb-3 ${dark ? 'text-slate-700' : 'text-slate-300'}`} />
                    <p className={`text-sm font-semibold ${dark ? 'text-slate-500' : 'text-slate-400'}`}>No entries for this date</p>
                    <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-indigo-500 hover:text-indigo-400 font-semibold transition-colors">
                      + Write your first entry
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {myEntries.map(e => (
                      <EntryCard key={e.id} entry={e} dark={dark}
                        onEdit={handleEdit} onDelete={handleDelete}
                        isIncharge={false} onRemarkSaved={loadMyEntries} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              TAB: CLASS DIARY  (incharge + admin)
          ══════════════════════════════════════════ */}
          {activeTab === 'diary' && (
            <div className="space-y-6">
              {/* Controls */}
              <div className={`flex flex-wrap items-center gap-3 px-5 py-4 rounded-2xl border ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <GraduationCap size={15} className={dark ? 'text-slate-400' : 'text-slate-500'} />
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                  className={`text-sm px-3 py-2 rounded-xl border outline-none ${
                    dark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                  <option value="">— Select class —</option>
                  {(isAdmin ? allClasses : inchargeClasses).map(c => (
                    <option key={c.id} value={c.id}>{classLabel(c)}</option>
                  ))}
                </select>

                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  className={`text-sm px-3 py-2 rounded-xl border outline-none cursor-pointer ${
                    dark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`} />

                <button onClick={loadClassDiary}
                  className={`p-2.5 rounded-xl transition-colors ${dark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  <RefreshCw size={14} />
                </button>
              </div>

              {!selectedClass ? (
                <div className={`flex flex-col items-center justify-center py-24 rounded-2xl border ${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <GraduationCap size={40} className={`mb-4 ${dark ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={`text-sm font-semibold ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Select a class to view or publish its diary</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Week strip */}
                  <WeekStrip classId={selectedClass} selectedDate={selectedDate}
                    onSelectDate={(d) => { setSelectedDate(d); }} dark={dark} />

                  {/* Date heading */}
                  <div className="flex items-center gap-3">
                    <div>
                      <h2 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-800'}`}>{fmtLong(selectedDate)}</h2>
                      <p className={`text-xs mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {diaryEntries.length} subject {diaryEntries.length === 1 ? 'entry' : 'entries'}
                        {classDiary?.class?.incharge_name ? ` · Incharge: ${classDiary.class.incharge_name}` : ''}
                      </p>
                    </div>
                    {selectedDate === TODAY && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">Today</span>
                    )}
                  </div>

                  {loadingDiary ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 size={28} className="text-indigo-400 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Publish panel */}
                      <PublishPanel classId={selectedClass} date={selectedDate}
                        publish={diaryPublish} entries={diaryEntries}
                        teacherId={entityId} dark={dark}
                        onRefresh={() => { loadClassDiary(); loadMyEntries(); }} />

                      {/* Entries grid */}
                      {diaryEntries.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border ${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <BookOpen size={32} className={`mb-3 ${dark ? 'text-slate-700' : 'text-slate-300'}`} />
                          <p className={`text-sm font-semibold ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                            No subject diary entries submitted yet
                          </p>
                          <p className={`text-xs mt-1 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
                            Subject teachers need to submit their entries first
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {diaryEntries.map(e => (
                            <EntryCard key={e.id} entry={e} dark={dark}
                              onEdit={isAdmin ? handleEdit : undefined}
                              onDelete={isAdmin ? handleDelete : undefined}
                              isIncharge={true}
                              onRemarkSaved={loadClassDiary} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════
              TAB: STUDENT / PARENT VIEW
          ══════════════════════════════════════════ */}
          {activeTab === 'view' && (
            <StudentDiaryView dark={dark} classId={studentClassId} />
          )}
        </div>
      </div>
    </Layout>
  );
}

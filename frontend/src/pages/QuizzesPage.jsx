import { useState, useEffect, useCallback } from 'react';
import {
  FileCheck, Plus, Pencil, Trash2, X, ChevronDown,
  Eye, BarChart3, Clock, BookOpen, CheckCircle2, AlertCircle,
  ChevronRight, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import TabBar     from '../components/ui/TabBar';
import { INPUT_CLS } from '../components/ui/Input';
import { ModalHeader } from '../components/ui/Modal';

const QUIZ_STATUS_TABS = [
  { id: '',          label: 'All' },
  { id: 'draft',     label: 'Draft' },
  { id: 'published', label: 'Published' },
  { id: 'closed',    label: 'Closed' },
];
import {
  getQuizzes, createQuiz, updateQuiz, deleteQuiz,
  addQuestion, deleteQuestion, getQuizResults, getQuizById,
} from '../api/quizzes';
import { useClasses, useSubjects } from '../hooks/useReferenceData';

const inp = INPUT_CLS;
const lbl = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5';

const STATUS_BADGE = {
  draft:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  closed:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function CreateQuizWizard({ classes, subjects, onClose, onSaved }) {
  const [wizStep, setWizStep] = useState(0);
  const [basicInfo, setBasicInfo] = useState({
    title: '', class_id: '', subject_id: '', duration_min: 30,
    open_from: '', open_until: '', instructions: '',
  });
  const [questions, setQuestions] = useState([]);
  const [quizId, setQuizId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [qForm, setQForm] = useState({ type: 'mcq', question_text: '', marks: 1, option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' });
  const setBasic = (k, v) => setBasicInfo(f => ({ ...f, [k]: v }));
  const setQ = (k, v) => setQForm(f => ({ ...f, [k]: v }));

  const handleCreateQuiz = async () => {
    if (!basicInfo.title.trim()) return toast.error('Title required');
    setSaving(true);
    try {
      const payload = { ...basicInfo, class_id: basicInfo.class_id || undefined, subject_id: basicInfo.subject_id || undefined };
      const r = await createQuiz(payload);
      const id = r.data?.data?.id ?? r.data?.id;
      setQuizId(id);
      toast.success('Quiz created');
      setWizStep(1);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create quiz'); }
    finally { setSaving(false); }
  };

  const handleAddQuestion = async () => {
    if (!qForm.question_text.trim()) return toast.error('Question text required');
    if (!quizId) return;
    setSaving(true);
    try {
      const payload = { ...qForm, marks: Number(qForm.marks) };
      if (qForm.type === 'short_answer') {
        delete payload.option_a; delete payload.option_b; delete payload.option_c; delete payload.option_d; delete payload.correct_option;
      }
      await addQuestion(quizId, payload);
      setQuestions(q => [...q, { ...qForm }]);
      setQForm({ type: 'mcq', question_text: '', marks: 1, option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' });
      toast.success('Question added');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add question'); }
    finally { setSaving(false); }
  };

  const handleFinish = async () => {
    if (!quizId) return;
    setSaving(true);
    try {
      await updateQuiz(quizId, { status: 'published' });
      toast.success('Quiz published');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to publish'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <ModalHeader title="Create Quiz" subtitle={`Step ${wizStep + 1} of 3`} onClose={onClose} sticky />

        <div className="p-5">
          {/* Step indicator */}
          <div className="flex gap-1 mb-5">
            {['Basic Info', 'Questions', 'Review'].map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i <= wizStep ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>{i + 1}</span>
                <span className={`text-xs font-medium ${i <= wizStep ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>{s}</span>
                {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 mx-1" />}
              </div>
            ))}
          </div>

          {/* Step 0: Basic Info */}
          {wizStep === 0 && (
            <div className="space-y-3">
              <div>
                <label className={lbl}>Quiz Title *</label>
                <input value={basicInfo.title} onChange={e => setBasic('title', e.target.value)} placeholder="e.g. Chapter 5 Test" className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Class</label>
                  <div className="relative">
                    <select value={basicInfo.class_id} onChange={e => setBasic('class_id', e.target.value)} className={`${inp} appearance-none pr-8`}>
                      <option value="">All Classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Subject</label>
                  <div className="relative">
                    <select value={basicInfo.subject_id} onChange={e => setBasic('subject_id', e.target.value)} className={`${inp} appearance-none pr-8`}>
                      <option value="">Any Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className={lbl}>Duration (minutes)</label>
                <input type="number" min="1" value={basicInfo.duration_min} onChange={e => setBasic('duration_min', Number(e.target.value))} className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Open From</label>
                  <input type="datetime-local" value={basicInfo.open_from} onChange={e => setBasic('open_from', e.target.value)} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Open Until</label>
                  <input type="datetime-local" value={basicInfo.open_until} onChange={e => setBasic('open_until', e.target.value)} className={inp} />
                </div>
              </div>
              <div>
                <label className={lbl}>Instructions</label>
                <textarea rows={2} value={basicInfo.instructions} onChange={e => setBasic('instructions', e.target.value)}
                  placeholder="Quiz instructions for students…" className={`${inp} resize-none`} />
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={handleCreateQuiz} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  {saving ? 'Creating…' : 'Create & Continue'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Questions */}
          {wizStep === 1 && (
            <div className="space-y-4">
              {questions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{questions.length} question{questions.length !== 1 ? 's' : ''} added</p>
                  {questions.map((q, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Q{i + 1}: {q.question_text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold uppercase">{q.type}</span>
                        <span className="text-xs text-slate-400">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3 border border-slate-100 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Add Question</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Type</label>
                    <div className="relative">
                      <select value={qForm.type} onChange={e => setQ('type', e.target.value)} className={`${inp} appearance-none pr-8`}>
                        <option value="mcq">Multiple Choice (MCQ)</option>
                        <option value="short_answer">Short Answer</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Marks</label>
                    <input type="number" min="0.5" step="0.5" value={qForm.marks} onChange={e => setQ('marks', e.target.value)} className={inp} />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Question Text *</label>
                  <textarea rows={2} value={qForm.question_text} onChange={e => setQ('question_text', e.target.value)}
                    placeholder="Enter question…" className={`${inp} resize-none`} />
                </div>
                {qForm.type === 'mcq' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <div key={opt} className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            qForm.correct_option === opt ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}>{opt}</span>
                          <input value={qForm[`option_${opt.toLowerCase()}`]} onChange={e => setQ(`option_${opt.toLowerCase()}`, e.target.value)}
                            placeholder={`Option ${opt}`} className={inp} />
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className={lbl}>Correct Option</label>
                      <div className="relative">
                        <select value={qForm.correct_option} onChange={e => setQ('correct_option', e.target.value)} className={`${inp} appearance-none pr-8`}>
                          {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>Option {o}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </>
                )}
                <button onClick={handleAddQuestion} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <Plus className="w-4 h-4" /> {saving ? 'Adding…' : 'Add Question'}
                </button>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setWizStep(0)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Back</button>
                <button onClick={() => setWizStep(2)} disabled={questions.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  Review & Publish <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {wizStep === 2 && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2">
                <p className="font-bold text-slate-900 dark:text-white">{basicInfo.title}</p>
                <p className="text-sm text-slate-500">{questions.length} questions · {basicInfo.duration_min} minutes</p>
                {basicInfo.open_from && <p className="text-xs text-slate-400">Opens: {new Date(basicInfo.open_from).toLocaleString()}</p>}
                {basicInfo.open_until && <p className="text-xs text-slate-400">Closes: {new Date(basicInfo.open_until).toLocaleString()}</p>}
              </div>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Q{i + 1}: {q.question_text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold uppercase">{q.type}</span>
                      <span className="text-xs text-slate-400">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                      {q.type === 'mcq' && <span className="text-xs text-emerald-600">Correct: {q.correct_option}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setWizStep(1)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Back</button>
                <button onClick={handleFinish} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <CheckCircle2 className="w-4 h-4" /> {saving ? 'Publishing…' : 'Publish Quiz'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultsModal({ quiz, onClose }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQuizResults(quiz.id)
      .then(r => setResults(r.data?.data ?? r.data ?? null))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, [quiz.id]);

  const attempts = results?.attempts ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <ModalHeader title={`Results: ${quiz.title}`} onClose={onClose} sticky />
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : attempts.length === 0 ? (
          <div className="py-12 text-center"><p className="text-sm text-slate-400">No attempts yet</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-semibold">Student</th>
                  <th className="text-center px-4 py-3 font-semibold">Score</th>
                  <th className="text-center px-4 py-3 font-semibold">%</th>
                  <th className="text-center px-4 py-3 font-semibold">Result</th>
                  <th className="text-left px-5 py-3 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {attempts.map(a => {
                  const pct = a.total_marks > 0 ? Math.round((a.score / a.total_marks) * 100) : 0;
                  const passed = pct >= 50;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{a.student_name || '—'}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-slate-900 dark:text-white">{a.score ?? '—'}/{a.total_marks}</td>
                      <td className="px-4 py-3.5 text-center font-semibold text-slate-600 dark:text-slate-400">{pct}%</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {passed ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [resultsQuiz, setResultsQuiz] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const r = await getQuizzes(params);
      const d = r.data?.data ?? r.data ?? [];
      setQuizzes(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load quizzes'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleToggleStatus = async (quiz) => {
    const newStatus = quiz.status === 'published' ? 'closed' : 'published';
    try {
      await updateQuiz(quiz.id, { status: newStatus });
      toast.success(`Quiz ${newStatus}`);
      load();
    } catch { toast.error('Failed to update status'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteQuiz(deleteTarget.id);
      toast.success('Quiz deleted');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Delete failed'); }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <PageHeader
            icon={FileCheck}
            title="Quizzes & Assessments"
            subtitle="Create and manage online quizzes"
            actions={
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors">
                <Plus className="w-4 h-4" /> Create Quiz
              </button>
            }
          />

          {/* Status filter tabs */}
          <TabBar tabs={QUIZ_STATUS_TABS} active={statusFilter} onChange={setStatusFilter} />

          {/* Quiz Cards */}
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : quizzes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-12 text-center">
              <FileCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">No quizzes found</p>
              <button onClick={() => setShowCreate(true)} className="mt-4 text-indigo-600 hover:underline text-sm font-medium">+ Create first quiz</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map(quiz => (
                <div key={quiz.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{quiz.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {quiz.class_name && (
                          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{quiz.class_name}</span>
                        )}
                        {quiz.subject_name && (
                          <span className="text-xs text-slate-400">{quiz.subject_name}</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize shrink-0 ml-2 ${STATUS_BADGE[quiz.status] || STATUS_BADGE.draft}`}>
                      {quiz.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{quiz.question_count || 0} questions</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{quiz.duration_min || '—'} min</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => setResultsQuiz(quiz)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 transition-colors">
                      <BarChart3 className="w-3.5 h-3.5" /> Results
                    </button>
                    <button onClick={() => handleToggleStatus(quiz)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        quiz.status === 'published'
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
                          : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                      }`}>
                      {quiz.status === 'published' ? 'Close' : 'Publish'}
                    </button>
                    <button onClick={() => setDeleteTarget(quiz)}
                      className="ml-auto p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {showCreate && (
        <CreateQuizWizard
          classes={classes}
          subjects={subjects}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); }}
        />
      )}

      {resultsQuiz && (
        <ResultsModal quiz={resultsQuiz} onClose={() => setResultsQuiz(null)} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">Delete Quiz?</h3>
            <p className="text-sm text-slate-500 text-center mt-2">"{deleteTarget.title}" and all its questions will be permanently deleted.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

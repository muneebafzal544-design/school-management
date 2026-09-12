import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, BookOpen, AlertTriangle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { getAttemptResults, gradeShortAnswers } from '../api/quizzes';

export default function QuizResultsPage() {
  const { id } = useParams(); // attempt id
  const navigate = useNavigate();
  const { user } = useAuth();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  // Grading state
  const [grades, setGrades] = useState({}); // {answerId: {marks_awarded, feedback}}
  const [savingGrades, setSavingGrades] = useState(false);

  useEffect(() => {
    getAttemptResults(id)
      .then(r => setAttempt(r.data?.data ?? r.data ?? null))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, [id]);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const answers = attempt?.answers || [];
  const score = attempt?.score ?? null;
  const totalMarks = attempt?.total_marks ?? null;
  const pct = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : null;
  const passed = pct !== null ? pct >= 50 : null;

  const shortAnswerPending = answers.filter(a => a.question_type === 'short_answer' && a.marks_awarded === null);

  const setGrade = (answerId, k, v) => {
    setGrades(g => ({ ...g, [answerId]: { ...(g[answerId] || {}), [k]: v } }));
  };

  const handleSaveGrades = async () => {
    const gradeEntries = Object.entries(grades).map(([answerId, data]) => ({
      answer_id: Number(answerId),
      marks_awarded: data.marks_awarded !== undefined ? Number(data.marks_awarded) : null,
      feedback: data.feedback || '',
    })).filter(e => e.marks_awarded !== null);

    if (gradeEntries.length === 0) return toast.error('No grades entered');
    setSavingGrades(true);
    try {
      await gradeShortAnswers(id, { grades: gradeEntries });
      toast.success('Grades saved');
      // Reload
      const r = await getAttemptResults(id);
      setAttempt(r.data?.data ?? r.data ?? null);
      setGrades({});
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save grades'); }
    finally { setSavingGrades(false); }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!attempt) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-slate-500">Results not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Back */}
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Score summary */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                passed ? 'bg-emerald-100 dark:bg-emerald-900/30' : passed === false ? 'bg-red-100 dark:bg-red-900/30' : 'bg-slate-100 dark:bg-slate-800'
              }`}>
                {passed ? <CheckCircle2 className="w-9 h-9 text-emerald-600" /> :
                 passed === false ? <XCircle className="w-9 h-9 text-red-600" /> :
                 <BookOpen className="w-9 h-9 text-slate-500" />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Quiz Results</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{attempt.quiz_title || 'Quiz'}</p>
                <p className="text-sm text-slate-500 mt-0.5">{attempt.student_name || '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-5">
              <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{score ?? '—'}</p>
                <p className="text-xs text-slate-400">Scored</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalMarks ?? '—'}</p>
                <p className="text-xs text-slate-400">Total Marks</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <p className={`text-2xl font-extrabold ${pct >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>{pct !== null ? `${pct}%` : '—'}</p>
                <p className="text-xs text-slate-400">Percentage</p>
              </div>
            </div>
            {passed !== null && (
              <div className={`mt-4 text-center py-2 rounded-xl text-sm font-bold ${
                passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {passed ? 'PASS' : 'FAIL'}
              </div>
            )}
            {shortAnswerPending.length > 0 && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">{shortAnswerPending.length} short answer question{shortAnswerPending.length !== 1 ? 's' : ''} pending grading. Final score may change.</p>
              </div>
            )}
          </div>

          {/* Per-question breakdown */}
          {answers.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Question Breakdown</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {answers.map((a, i) => {
                  const isCorrect = a.is_correct;
                  const isPending = a.question_type === 'short_answer' && a.marks_awarded === null;
                  const gradeEntry = grades[a.id];

                  return (
                    <div key={a.id} className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          isPending ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          isCorrect ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.question_text}</p>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 mt-1 inline-block">{a.question_type}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {a.marks_awarded !== null && a.marks_awarded !== undefined ? `${a.marks_awarded}/${a.marks}` : `—/${a.marks}`}
                          </p>
                          <p className="text-xs text-slate-400">marks</p>
                        </div>
                      </div>

                      <div className="ml-10 space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-400 font-medium mb-0.5">Your answer</p>
                            <p className={`text-sm px-3 py-2 rounded-xl ${
                              a.question_type === 'mcq' ?
                                (isCorrect ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300') :
                                'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                              {a.student_answer || <em className="text-slate-400">Not answered</em>}
                            </p>
                          </div>
                          {a.question_type === 'mcq' && a.correct_option && (
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400 font-medium mb-0.5">Correct answer</p>
                              <p className="text-sm px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                                {a.correct_option}
                              </p>
                            </div>
                          )}
                        </div>

                        {a.feedback && (
                          <p className="text-xs text-slate-500 italic">Teacher: "{a.feedback}"</p>
                        )}

                        {/* Grading input for teacher/admin on short answer pending */}
                        {isTeacher && a.question_type === 'short_answer' && isPending && (
                          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl space-y-2">
                            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Grade this answer</p>
                            <div className="flex gap-2">
                              <input
                                type="number" min="0" max={a.marks} step="0.5"
                                placeholder={`Marks (max ${a.marks})`}
                                value={gradeEntry?.marks_awarded ?? ''}
                                onChange={e => setGrade(a.id, 'marks_awarded', e.target.value)}
                                className="w-32 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none"
                              />
                              <input
                                placeholder="Feedback (optional)"
                                value={gradeEntry?.feedback ?? ''}
                                onChange={e => setGrade(a.id, 'feedback', e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Save grades button */}
          {isTeacher && Object.keys(grades).length > 0 && (
            <div className="flex justify-end">
              <button onClick={handleSaveGrades} disabled={savingGrades}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {savingGrades ? 'Saving…' : 'Save Grades'}
              </button>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}

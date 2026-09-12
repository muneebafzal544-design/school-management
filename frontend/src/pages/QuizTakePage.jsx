import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { getQuizById, startAttempt, submitAttempt } from '../api/quizzes';

function useCountdown(seconds) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (seconds <= 0) return;
    setRemaining(seconds);
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(intervalRef.current); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [seconds]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return { remaining, display: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` };
}

export default function QuizTakePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({}); // {questionId: answer}
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [quizRes, attemptRes] = await Promise.all([
          getQuizById(id),
          startAttempt(id),
        ]);
        setQuiz(quizRes.data?.data ?? quizRes.data ?? null);
        setAttempt(attemptRes.data?.data ?? attemptRes.data ?? null);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to start quiz');
        navigate('/quizzes');
      } finally { setLoading(false); }
    };
    init();
  }, [id]);

  const questions = quiz?.questions || [];
  const durationSeconds = (quiz?.duration_min || 30) * 60;
  const { remaining, display: timerDisplay } = useCountdown(durationSeconds);

  // Auto-submit when time runs out
  useEffect(() => {
    if (remaining === 0 && !submitted && attempt) {
      toast.error('Time is up! Submitting quiz…');
      handleSubmit(true);
    }
  }, [remaining]);

  const handleSubmit = async (forced = false) => {
    if (!attempt) return;
    setSubmitting(true);
    setShowConfirm(false);
    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: Number(questionId),
        answer,
      }));
      const r = await submitAttempt(id, { attempt_id: attempt.id, answers: answersArray });
      setSubmitResult(r.data?.data ?? r.data ?? null);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit quiz');
    } finally { setSubmitting(false); }
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

  if (!quiz || questions.length === 0) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500">Quiz not found or has no questions.</p>
            <button onClick={() => navigate('/quizzes')} className="mt-4 text-indigo-600 hover:underline text-sm">Back to Quizzes</button>
          </div>
        </div>
      </Layout>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const totalQ = questions.length;

  // ── Submitted view ──
  if (submitted) {
    const mcqScore = submitResult?.mcq_score ?? submitResult?.score ?? null;
    const totalMarks = submitResult?.total_marks ?? null;
    const hasPending = submitResult?.has_pending_grading ?? false;

    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Quiz Submitted!</h2>
            {mcqScore !== null && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 my-4">
                <p className="text-3xl font-extrabold text-indigo-600">{mcqScore}</p>
                {totalMarks && <p className="text-sm text-slate-500 mt-1">out of {totalMarks} marks (MCQ)</p>}
              </div>
            )}
            {hasPending && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl text-left mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">Short answer questions are pending teacher grading. Final results will be updated soon.</p>
              </div>
            )}
            <button onClick={() => navigate('/student-dashboard')}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold mt-2"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const q = questions[currentQ];

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-white truncate">{quiz.title}</p>
            <p className="text-xs text-slate-500">{answeredCount} of {totalQ} answered</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-sm font-bold shrink-0 ${
            remaining <= 60 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
            remaining <= 300 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            <Clock className="w-4 h-4" /> {timerDisplay}
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
          {/* Question grid */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Questions</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((_, i) => (
                <button key={i} onClick={() => setCurrentQ(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    i === currentQ ? 'text-white shadow-md' :
                    answers[questions[i].id] !== undefined ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                  style={i === currentQ ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Question */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Q{currentQ + 1} of {totalQ}</span>
              <span className="text-xs text-slate-400">· {q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{q.type}</span>
            </div>
            <p className="text-base font-semibold text-slate-900 dark:text-white mb-5 leading-relaxed">{q.question_text}</p>

            {q.type === 'mcq' ? (
              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map(opt => {
                  const text = q[`option_${opt.toLowerCase()}`];
                  if (!text) return null;
                  const selected = answers[q.id] === opt;
                  return (
                    <button key={opt} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                        selected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500' :
                        'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>{opt}</span>
                      <span className={`text-sm ${selected ? 'text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>{text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                rows={5}
                value={answers[q.id] || ''}
                onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                placeholder="Type your answer here…"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentQ(i => Math.max(0, i - 1))} disabled={currentQ === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {currentQ < totalQ - 1 ? (
              <button onClick={() => setCurrentQ(i => i + 1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => setShowConfirm(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <CheckCircle2 className="w-4 h-4" /> Submit Quiz
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm submit modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">Submit Quiz?</h3>
            <div className="my-4 space-y-2 text-sm text-center text-slate-500">
              <p>You have answered <strong className="text-slate-900 dark:text-white">{answeredCount}</strong> out of <strong className="text-slate-900 dark:text-white">{totalQ}</strong> questions.</p>
              {answeredCount < totalQ && (
                <p className="text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> {totalQ - answeredCount} question{totalQ - answeredCount !== 1 ? 's' : ''} unanswered
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={() => handleSubmit()} disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                {submitting ? 'Submitting…' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

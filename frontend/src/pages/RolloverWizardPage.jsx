import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, RotateCcw, ArrowRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import { getRolloverPreview, bulkPromote, activateNewYear } from '../api/rollover';
import { useClasses } from '../hooks/useReferenceData';

const STEP_LABELS = ['Review', 'Map Promotions', 'Confirm', 'Done'];

function Stepper({ step }) {
  return (
    <div className="flex items-center gap-0">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
            i === step ? 'bg-indigo-600 text-white' :
            i < step ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
            'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              i < step ? 'bg-emerald-500 text-white' :
              i === step ? 'bg-white text-indigo-600' :
              'bg-slate-200 dark:bg-slate-700 text-slate-500'
            }`}>
              {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className="text-xs font-semibold">{label}</span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function RolloverWizardPage() {
  const [step, setStep] = useState(0);
  const { data: classes = [] } = useClasses();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  // Step 2: promotion map {sourceClassId: targetClassId or 'graduate' or 'drop'}
  const [promotionMap, setPromotionMap] = useState({});

  // Step 3/4
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState(null);

  // New year activation
  const [newYearLabel, setNewYearLabel] = useState('');
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const previewRes = await getRolloverPreview();
        setPreview(previewRes.data?.data ?? previewRes.data ?? null);
      } catch { toast.error('Failed to load data'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const applyDefaultMap = () => {
    if (!preview) return;
    const defaultMap = {};
    (preview.classes || []).forEach((cls, i) => {
      // Auto-map: last class graduates, others go to next class
      const classList = preview.classes || [];
      if (i === classList.length - 1) {
        defaultMap[cls.id] = 'graduate';
      } else {
        const nextClass = classList[i + 1];
        defaultMap[cls.id] = nextClass ? String(nextClass.id) : 'graduate';
      }
    });
    setPromotionMap(defaultMap);
    toast.success('Default mappings applied');
  };

  const handleExecute = async () => {
    const promotions = Object.entries(promotionMap)
      .filter(([, v]) => v !== '')
      .map(([sourceId, targetId]) => ({
        source_class_id: Number(sourceId),
        target_class_id: targetId === 'graduate' || targetId === 'drop' ? null : Number(targetId),
        action: targetId === 'graduate' ? 'graduate' : targetId === 'drop' ? 'drop' : 'promote',
      }));

    if (promotions.length === 0) return toast.error('No promotions mapped');
    setExecuting(true);
    try {
      const r = await bulkPromote({ promotions });
      setResults(r.data?.data ?? r.data ?? null);
      toast.success('Promotions executed successfully');
      setStep(3);
    } catch (err) { toast.error(err.response?.data?.message || 'Promotion failed'); }
    finally { setExecuting(false); }
  };

  const handleActivateYear = async () => {
    if (!newYearLabel.trim()) return toast.error('Enter new year label');
    setActivating(true);
    try {
      await activateNewYear({ year_label: newYearLabel });
      toast.success(`Academic year "${newYearLabel}" activated`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to activate year'); }
    finally { setActivating(false); }
  };

  // Summary for step 3
  const promotionSummary = Object.entries(promotionMap).map(([srcId, tgtId]) => {
    const srcClass = (preview?.classes || []).find(c => String(c.id) === srcId);
    const tgtClass = classes.find(c => String(c.id) === tgtId);
    return {
      from: srcClass?.name || `Class ${srcId}`,
      to: tgtId === 'graduate' ? 'Graduate' : tgtId === 'drop' ? 'Drop' : (tgtClass?.name || `Class ${tgtId}`),
      count: srcClass?.student_count || 0,
      action: tgtId === 'graduate' ? 'graduate' : tgtId === 'drop' ? 'drop' : 'promote',
    };
  });

  const totalPromoted  = promotionSummary.filter(p => p.action === 'promote').reduce((s, p) => s + p.count, 0);
  const totalGraduated = promotionSummary.filter(p => p.action === 'graduate').reduce((s, p) => s + p.count, 0);
  const totalDropped   = promotionSummary.filter(p => p.action === 'drop').reduce((s, p) => s + p.count, 0);

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <PageHeader
            icon={RotateCcw}
            title="Year Rollover Wizard"
            subtitle="Promote students to next academic year"
          />

          {/* Warning banner */}
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-400">Warning: This action cannot be undone</p>
              <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">
                Bulk promotion will move all students to the selected target classes. Review carefully before executing.
              </p>
            </div>
          </div>

          {/* Stepper */}
          <div className="overflow-x-auto">
            <Stepper step={step} />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Step 0: Review ── */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Classes</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 uppercase tracking-wide">
                            <th className="text-left px-5 py-3 font-semibold">Class</th>
                            <th className="text-center px-4 py-3 font-semibold">Students</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {(preview?.classes || []).map(cls => (
                            <tr key={cls.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{cls.name}</td>
                              <td className="px-4 py-3.5 text-center">
                                <span className="px-3 py-1 rounded-full text-sm font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                  {cls.student_count || 0}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(preview?.classes || []).length === 0 && (
                            <tr><td colSpan={2} className="px-5 py-8 text-center text-slate-400">No active classes found</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => setStep(1)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 1: Map Promotions ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Map Each Class to Target</h3>
                      <button onClick={applyDefaultMap}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                        Use Defaults
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(preview?.classes || []).map(cls => (
                        <div key={cls.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{cls.name}</p>
                            <p className="text-xs text-slate-400">{cls.student_count || 0} students</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="relative w-52">
                            <select
                              value={promotionMap[cls.id] || ''}
                              onChange={e => setPromotionMap(m => ({ ...m, [cls.id]: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none appearance-none pr-8">
                              <option value="">— Select target —</option>
                              {classes.filter(c => String(c.id) !== String(cls.id)).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                              <option value="graduate">Graduate (leave school)</option>
                              <option value="drop">Drop (no action)</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 justify-between">
                    <button onClick={() => setStep(0)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Back</button>
                    <button onClick={() => setStep(2)}
                      disabled={Object.keys(promotionMap).length === 0}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                      Review Summary <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Confirm ── */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Promoted', value: totalPromoted, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                      { label: 'Graduated', value: totalGraduated, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                      { label: 'Dropped', value: totalDropped, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} className={`${bg} rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-800`}>
                        <p className={`text-3xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-slate-500 mt-1">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Promotion Summary</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 uppercase tracking-wide">
                            <th className="text-left px-5 py-3 font-semibold">From Class</th>
                            <th className="text-left px-5 py-3 font-semibold">To Class</th>
                            <th className="text-center px-4 py-3 font-semibold">Students</th>
                            <th className="text-left px-4 py-3 font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {promotionSummary.map((p, i) => (
                            <tr key={i}>
                              <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{p.from}</td>
                              <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{p.to}</td>
                              <td className="px-4 py-3.5 text-center font-bold text-slate-900 dark:text-white">{p.count}</td>
                              <td className="px-4 py-3.5">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                                  p.action === 'promote'  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                  p.action === 'graduate' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {p.action}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-2xl">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                      This action cannot be undone. {totalPromoted + totalGraduated + totalDropped} students will be affected.
                    </p>
                  </div>

                  <div className="flex gap-3 justify-between">
                    <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Back</button>
                    <button onClick={handleExecute} disabled={executing}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-md transition-colors disabled:opacity-60">
                      <RotateCcw className="w-4 h-4" />
                      {executing ? 'Executing…' : 'Execute Promotion'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Done ── */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 shadow-sm p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Promotions Complete!</h2>
                    <p className="text-sm text-slate-500 mt-2">
                      {results ? `${results.promoted || 0} promoted, ${results.graduated || 0} graduated, ${results.dropped || 0} dropped.` : 'Promotions executed successfully.'}
                    </p>
                  </div>

                  {/* Activate New Year */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Activate New Academic Year</h3>
                    <p className="text-xs text-slate-500 mb-4">Optionally set the label for the new academic year (e.g. "2025–2026")</p>
                    <div className="flex gap-3">
                      <input value={newYearLabel} onChange={e => setNewYearLabel(e.target.value)}
                        placeholder="e.g. 2025–2026" className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                      <button onClick={handleActivateYear} disabled={activating}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        {activating ? 'Activating…' : 'Activate Year'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </Layout>
  );
}

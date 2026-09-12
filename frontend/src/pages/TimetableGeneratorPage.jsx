import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Play, Save, RefreshCw, CheckCircle2, AlertTriangle,
  Calendar, Clock, Users, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { generateTimetable, saveGeneratedTimetable } from '../api/timetableGenerator';
import { useClasses } from '../hooks/useReferenceData';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIOD_OPTIONS = [4, 5, 6, 7, 8];

const STEP_LABELS = ['Configure', 'Generate', 'Review & Save'];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-2">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold
            ${i < current ? 'bg-emerald-500 text-white' : i === current ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
            {i < current ? <CheckCircle2 size={14} /> : i + 1}
          </div>
          <span className={`text-sm ${i === current ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-400'}`}>{label}</span>
          {i < STEP_LABELS.length - 1 && <ChevronRight size={14} className="text-gray-300 ml-1" />}
        </div>
      ))}
    </div>
  );
}

export default function TimetableGeneratorPage() {
  const [step,       setStep]       = useState(0);
  const { data: classes = [], isLoading: loading, isError: classesError } = useClasses();
  const [generating, setGenerating] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [result,     setResult]     = useState(null);

  // Config state
  const [selectedDays,      setSelectedDays]      = useState([...DAYS]);
  const [periodsPerDay,     setPeriodsPerDay]      = useState(6);
  const [selectedClassIds,  setSelectedClassIds]   = useState([]);

  // Initialize the selection once, when classes first load — don't clobber
  // the user's manual toggles on a later background refetch.
  const classesInitRef = useRef(false);
  useEffect(() => {
    if (!classesInitRef.current && classes.length) {
      setSelectedClassIds(classes.map(c => c.id));
      classesInitRef.current = true;
    }
  }, [classes]);

  useEffect(() => {
    if (classesError) toast.error('Failed to load classes');
  }, [classesError]);

  function toggleDay(day) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }
  function toggleClass(id) {
    setSelectedClassIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  async function handleGenerate() {
    if (selectedDays.length === 0)  return toast.error('Select at least one day');
    if (selectedClassIds.length === 0) return toast.error('Select at least one class');
    setGenerating(true);
    try {
      const res = await generateTimetable({
        days: selectedDays,
        periods_per_day: periodsPerDay,
        class_ids: selectedClassIds,
      });
      setResult(res.data?.data ?? res.data);
      setStep(2);
      if ((res.data?.data?.conflicts || []).length > 0) {
        toast(`Generated with ${res.data.data.conflicts.length} conflict(s) — review before saving`, { icon: '⚠️' });
      } else {
        toast.success('Timetable generated successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!result?.slots?.length) return toast.error('No slots to save');
    setSaving(true);
    try {
      await saveGeneratedTimetable({ slots: result.slots });
      toast.success(`${result.slots.length} timetable slots saved`);
      setStep(0);
      setResult(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Layout><PageLoader /></Layout>;

  // Group slots by class for preview
  const slotsByClass = {};
  (result?.slots || []).forEach(s => {
    const key = s.class_id;
    if (!slotsByClass[key]) slotsByClass[key] = {};
    if (!slotsByClass[key][s.day]) slotsByClass[key][s.day] = [];
    slotsByClass[key][s.day].push(s);
  });
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="text-indigo-500" size={24} />
            AI Timetable Generator
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Automatically solve timetable constraints — no teacher double-booked, no class conflict
          </p>
        </div>

        <StepIndicator current={step} />

        {/* Step 0 / 1 — Configure + Generate */}
        {step < 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Days */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-indigo-500" /> School Days
              </h3>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(d => (
                  <button key={d} onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all
                      ${selectedDays.includes(d)
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Periods */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Clock size={16} className="text-indigo-500" /> Periods Per Day
              </h3>
              <div className="flex gap-2">
                {PERIOD_OPTIONS.map(n => (
                  <button key={n} onClick={() => setPeriodsPerDay(n)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all
                      ${periodsPerDay === n
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Classes */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users size={16} className="text-indigo-500" /> Classes to Include
                </h3>
                <button onClick={() =>
                  setSelectedClassIds(selectedClassIds.length === classes.length ? [] : classes.map(c => c.id))
                } className="text-xs text-indigo-600 hover:underline">
                  {selectedClassIds.length === classes.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {classes.map(c => (
                  <button key={c.id} onClick={() => toggleClass(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all
                      ${selectedClassIds.includes(c.id)
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Generate / Review buttons */}
        {step < 2 && (
          <button onClick={handleGenerate} disabled={generating}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 text-base">
            {generating
              ? <><RefreshCw size={18} className="animate-spin" /> Solving constraints…</>
              : <><Play size={18} /> Generate Timetable</>}
          </button>
        )}

        {/* Step 2 — Review */}
        {step === 2 && result && (
          <>
            {/* Summary */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-2.5 text-sm">
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{result.slots?.length || 0}</span>
                <span className="text-emerald-600 dark:text-emerald-500"> slots generated</span>
              </div>
              {result.conflicts?.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">{result.conflicts.length}</span>
                  <span className="text-amber-600 dark:text-amber-500"> unresolved conflicts</span>
                </div>
              )}
              <button onClick={() => setStep(0)} className="text-sm text-gray-500 hover:text-indigo-600 ml-auto">
                ← Reconfigure
              </button>
            </div>

            {/* Preview grid — show first 3 classes */}
            {Object.entries(slotsByClass).slice(0, 3).map(([classId, daySlots]) => (
              <div key={classId} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{classMap[classId] || `Class ${classId}`}</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <th className="px-3 py-2 text-left text-gray-500 font-semibold">Period</th>
                        {selectedDays.map(d => (
                          <th key={d} className="px-3 py-2 text-center text-gray-500 font-semibold">{d.slice(0, 3)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                      {Array.from({ length: periodsPerDay }, (_, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium text-gray-500">P{i + 1}</td>
                          {selectedDays.map(day => {
                            const slot = (daySlots[day] || []).find(s => s.period === i + 1);
                            return (
                              <td key={day} className="px-3 py-2 text-center">
                                {slot
                                  ? <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg px-2 py-0.5 text-xs">
                                      {slot.subject_name || `Sub ${slot.subject_id}`}
                                    </span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {Object.keys(slotsByClass).length > 3 && (
              <p className="text-sm text-gray-400 text-center">…and {Object.keys(slotsByClass).length - 3} more classes</p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                Reconfigure
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving…' : 'Save to Timetable'}
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

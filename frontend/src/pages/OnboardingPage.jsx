import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Circle, ChevronRight, School, Users, BookOpen,
  Banknote, MessageCircle, ArrowRight, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOnboardingProgress, saveSchoolInfo, completeOnboarding } from '../api/onboarding';

const STEP_ICONS = {
  school_info:   <School size={20} />,
  admin_account: <CheckCircle2 size={20} />,
  classes:       <Users size={20} />,
  subjects:      <BookOpen size={20} />,
  teachers:      <Users size={20} />,
  fee_structure: <Banknote size={20} />,
  whatsapp:      <MessageCircle size={20} />,
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolForm, setSchoolForm] = useState({ name: '', address: '', phone: '', logo_url: '' });

  useEffect(() => {
    getOnboardingProgress()
      .then(r => setProgress(r.data.data))
      .catch(() => toast.error('Could not load onboarding progress'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSchoolSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSchoolInfo(schoolForm);
      toast.success('School info saved');
      const r = await getOnboardingProgress();
      setProgress(r.data.data);
    } catch {
      toast.error('Failed to save school info');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    try {
      await completeOnboarding();
      toast.success('Onboarding complete! Welcome aboard.');
      navigate('/dashboard');
    } catch {
      toast.error('Could not mark onboarding complete');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  const allRequired = progress?.steps.filter(s => s.required).every(s => s.completed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
            <School size={32} className="text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Set Up Your School</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Complete the steps below to get started</p>
        </div>

        {/* Progress bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {progress?.completed_count} of {progress?.total} steps completed
            </span>
            <span className="text-sm font-bold text-indigo-600">{progress?.percent}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress?.percent}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700 mb-6">
          {progress?.steps.map((step) => (
            <div key={step.key} className="flex items-center gap-4 p-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                ${step.completed
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                {step.completed ? <CheckCircle2 size={20} /> : (STEP_ICONS[step.key] || <Circle size={20} />)}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${step.completed ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  {step.label}
                </p>
                {step.required && !step.completed && (
                  <p className="text-xs text-red-500">Required</p>
                )}
              </div>
              {step.completed && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />}
            </div>
          ))}
        </div>

        {/* School info form */}
        {!progress?.steps.find(s => s.key === 'school_info')?.completed && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">School Information</h2>
            <form onSubmit={handleSchoolSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">School Name *</label>
                <input
                  required
                  value={schoolForm.name}
                  onChange={e => setSchoolForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Greenvalley Academy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input
                  value={schoolForm.phone}
                  onChange={e => setSchoolForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="+92 300 0000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <input
                  value={schoolForm.address}
                  onChange={e => setSchoolForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="123 Main Street, City"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                Save School Info
              </button>
            </form>
          </div>
        )}

        {/* Complete button */}
        {allRequired && (
          <button
            onClick={handleComplete}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2 text-base"
          >
            Continue to Dashboard <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

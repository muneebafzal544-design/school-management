import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [form, setForm]       = useState({ current: '', next: '', confirm: '' });
  const [show, setShow]       = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const toggle = (field) => setShow(s => ({ ...s, [field]: !s[field] }));

  const validate = () => {
    const e = {};
    if (!form.current)           e.current = 'Current password is required.';
    if (form.next.length < 8)    e.next    = 'New password must be at least 8 characters.';
    if (form.next === form.current) e.next  = 'New password must differ from current password.';
    if (form.next !== form.confirm) e.confirm = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        current_password: form.current,
        new_password:     form.next,
      });
      toast.success('Password changed. Please log in again.');
      signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      if (msg.toLowerCase().includes('current')) {
        setErrors({ current: msg });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ id, label, value, error }) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show[id] ? 'text' : 'password'}
          value={value}
          onChange={e => { setForm(f => ({ ...f, [id]: e.target.value })); setErrors(er => ({ ...er, [id]: '' })); }}
          className={`w-full px-4 py-2.5 pr-10 rounded-xl border text-sm bg-white dark:bg-slate-800 dark:text-white outline-none transition-colors
            ${error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'}`}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
        <button type="button" onClick={() => toggle(id)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          {show[id] ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">

          {/* Header */}
          <div className="px-8 py-7 text-center border-b border-slate-100 dark:border-slate-800"
            style={{ background: 'linear-gradient(135deg, #1e1b4b, #4f46e5)' }}>
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={26} className="text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-white">Set Your Password</h1>
            <p className="text-indigo-200 text-sm mt-1.5">
              Your account was created with a temporary password.<br />
              Please set a new one to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            <Field id="current" label="Temporary Password"  value={form.current}  error={errors.current} />
            <Field id="next"    label="New Password"        value={form.next}     error={errors.next} />
            <Field id="confirm" label="Confirm New Password" value={form.confirm} error={errors.confirm} />

            {/* Strength hint */}
            <div className="flex flex-wrap gap-2">
              {[
                { ok: form.next.length >= 8,       label: '8+ chars' },
                { ok: /[A-Z]/.test(form.next),     label: 'Uppercase' },
                { ok: /[0-9]/.test(form.next),     label: 'Number' },
                { ok: /[^A-Za-z0-9]/.test(form.next), label: 'Symbol' },
              ].map(({ ok, label }) => (
                <span key={label}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors
                    ${ok ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                         : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  {label}
                </span>
              ))}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {loading ? 'Saving…' : 'Set New Password & Continue'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          <Lock size={11} className="inline mr-1" />
          Your session will end after this. You'll need to log in again with your new password.
        </p>
      </div>
    </div>
  );
}

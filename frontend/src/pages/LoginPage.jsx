import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, LogIn, ArrowRight, ArrowLeft, CheckCircle2, Building2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { resolveSchool } from '../api/auth';

const ROLE_HOME = {
  admin:   '/',
  teacher: '/teacher-dashboard',
  student: '/student-dashboard',
  parent:  '/parent-dashboard',
};

const DEMO_ACCOUNTS = [
  { role: 'Admin',       username: 'admin',      password: 'admin123',      color: '#6366f1', bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.3)'  },
  { role: 'Teacher',     username: 'teacher',    password: 'teacher123',    color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)',  border: 'rgba(14,165,233,0.3)'  },
  { role: 'Student',     username: 'student',    password: 'student123',    color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)'  },
  { role: 'Super Admin', username: 'superadmin', password: 'superadmin123', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)'  },
];

// ── input class shared between both steps ─────────────────────────────────────
const INPUT = 'w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepDots({ step }) {
  const total = step === 3 ? 3 : 2;
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => i + 1).map(n => (
        <div key={n} className={`h-1.5 rounded-full transition-all duration-300 ${
          n === step ? 'w-8 bg-indigo-400' : 'w-3 bg-white/20'
        }`} />
      ))}
    </div>
  );
}

// ── School badge shown after successful resolve ───────────────────────────────
function SchoolBadge({ school, onClear }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/20 border border-indigo-400/30 mb-4">
      <div className="w-8 h-8 rounded-lg bg-indigo-500/30 flex items-center justify-center shrink-0">
        {school.logo_url
          ? <img src={school.logo_url} alt="" className="w-6 h-6 object-contain rounded" />
          : <Building2 size={16} className="text-indigo-300" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{school.name}</p>
        <p className="text-[11px] text-indigo-300">{school.city || school.school_code}</p>
      </div>
      <button type="button" onClick={onClear} className="text-[10px] text-indigo-400 hover:text-indigo-200 shrink-0 underline">
        Change
      </button>
    </div>
  );
}

export default function LoginPage() {
  const { signIn, verify2FALogin } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = location.state?.from?.pathname || null;

  // ── Step 1: School code ───────────────────────────────────────────────────
  const [step,          setStep]          = useState(1);      // 1 = school code, 2 = credentials, 3 = TOTP
  const [schoolCode,    setSchoolCode]    = useState('');
  const [schoolInfo,    setSchoolInfo]    = useState(null);   // resolved school object
  const [resolving,     setResolving]     = useState(false);
  const [resolveError,  setResolveError]  = useState('');
  const codeRef = useRef(null);

  // ── Step 2: Credentials ───────────────────────────────────────────────────
  const [form,    setForm]    = useState({ username: '', password: '' });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Step 3: TOTP (2FA) ────────────────────────────────────────────────────
  const [tempToken, setTempToken] = useState('');
  const [totpCode,  setTotpCode]  = useState('');

  // Auto-focus code input on mount
  useEffect(() => { codeRef.current?.focus(); }, []);

  // Debounced auto-resolve as the user types a 2–6 char code
  useEffect(() => {
    const code = schoolCode.trim().toUpperCase();
    if (code.length < 2) { setSchoolInfo(null); setResolveError(''); return; }
    if (code.length > 10) return;

    const t = setTimeout(async () => {
      setResolving(true);
      setResolveError('');
      try {
        const res = await resolveSchool(code);
        const d   = res.data?.data ?? res.data;
        setSchoolInfo(d);
      } catch (err) {
        setSchoolInfo(null);
        const msg = err.response?.data?.message;
        // Only show error once they've typed a plausible code (≥3 chars)
        if (code.length >= 3) setResolveError(msg || 'School not found');
      } finally {
        setResolving(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [schoolCode]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCodeContinue = (e) => {
    e.preventDefault();
    if (!schoolInfo) {
      toast.error('Enter a valid school code first');
      return;
    }
    setStep(2);
  };

  const handleSkipCode = () => {
    // Single-tenant / existing install — skip school selection entirely
    setSchoolInfo(null);
    setSchoolCode('');
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setForm({ username: '', password: '' });
    setTimeout(() => codeRef.current?.focus(), 100);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error('Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      const result = await signIn(
        form.username.trim(),
        form.password,
        schoolInfo ? schoolInfo.school_code : null,
      );
      if (result?.requires_2fa) {
        setTempToken(result.temp_token);
        setTotpCode('');
        setStep(3);
        return;
      }
      toast.success(`Welcome back, ${result.name}!`);
      navigate(result.is_super_admin ? '/super-admin' : (from || ROLE_HOME[result.role] || '/'), { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.displayMessage || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    if (!totpCode) { toast.error('Enter the 6-digit code from your authenticator app'); return; }
    setLoading(true);
    try {
      const user = await verify2FALogin(tempToken, totpCode);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.is_super_admin ? '/super-admin' : (from || ROLE_HOME[user.role] || '/'), { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid authenticator code';
      toast.error(msg);
      setTotpCode('');
    } finally {
      setLoading(false);
    }
  };

  // ── Demo account quick-fill ───────────────────────────────────────────────
  const handleDemoLogin = (account) => {
    setSchoolInfo(null);
    setSchoolCode('');
    setStep(2);
    setForm({ username: account.username, password: account.password });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-950 via-indigo-950 to-slate-950 p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">SchoolMS</h1>
          <p className="text-slate-400 text-sm mt-1">
            {step === 1 ? 'Enter your school code to continue'
             : step === 2 ? 'Sign in to your account'
             : 'Two-factor authentication'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <StepDots step={step} />

          {/* ── Step 1: School Code ── */}
          {step === 1 && (
            <form onSubmit={handleCodeContinue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                  School Code
                </label>
                <div className="relative">
                  <input
                    ref={codeRef}
                    type="text"
                    value={schoolCode}
                    onChange={e => setSchoolCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GVPS"
                    maxLength={20}
                    className={`${INPUT} pr-10 font-mono tracking-widest uppercase`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {resolving && <Loader2 size={16} className="text-slate-400 animate-spin" />}
                    {!resolving && schoolInfo && <CheckCircle2 size={16} className="text-emerald-400" />}
                  </div>
                </div>

                {/* Resolve error */}
                {resolveError && !resolving && (
                  <p className="text-xs text-red-400 mt-1.5">{resolveError}</p>
                )}

                {/* Resolved school preview */}
                {schoolInfo && !resolving && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-400/20">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">{schoolInfo.name}</p>
                      {schoolInfo.city && <p className="text-[11px] text-slate-400">{schoolInfo.city}</p>}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!schoolInfo || resolving}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                Continue <ArrowRight size={15} />
              </button>

              {/* Single-tenant bypass */}
              <p className="text-center text-xs text-slate-500">
                No school code?{' '}
                <button type="button" onClick={handleSkipCode} className="text-indigo-400 hover:text-indigo-300 underline">
                  Sign in directly
                </button>
              </p>
            </form>
          )}

          {/* ── Step 2: Credentials ── */}
          {step === 2 && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* School badge */}
              {schoolInfo && (
                <SchoolBadge school={schoolInfo} onClear={handleBack} />
              )}

              {/* Back button when no school selected */}
              {!schoolInfo && (
                <button type="button" onClick={handleBack}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 mb-2 transition-colors">
                  <ArrowLeft size={13} /> Back to school code
                </button>
              )}

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="Enter your username"
                  autoComplete="username"
                  autoFocus
                  className={INPUT}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={`${INPUT} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
                  : <><LogIn size={16} /> Sign In</>
                }
              </button>
            </form>
          )}

          {/* ── Step 3: TOTP 2FA ── */}
          {step === 3 && (
            <form onSubmit={handleTotpSubmit} className="space-y-5">
              <div className="text-center space-y-1 pb-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 mx-auto mb-3">
                  <span className="text-2xl">🔐</span>
                </div>
                <p className="text-sm text-slate-300">Open your authenticator app and enter the 6-digit code for this account.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                  Authenticator Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                  className={`${INPUT} text-center text-2xl tracking-[0.5em] font-mono`}
                />
              </div>
              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
                  : <><LogIn size={16} /> Verify &amp; Sign In</>
                }
              </button>
              <button type="button" onClick={() => { setStep(2); setTotpCode(''); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors">
                <ArrowLeft size={13} /> Back
              </button>
            </form>
          )}

          {/* First-time setup */}
          <p className="text-center text-xs text-slate-500 mt-5">
            New installation?{' '}
            <Link to="/setup" className="text-indigo-400 hover:text-indigo-300 font-medium">
              First time setup
            </Link>
          </p>
        </div>

        {/* ── Demo Accounts — only rendered in dev / when VITE_SHOW_DEMO_ACCOUNTS=true ── */}
        {DEMO_ACCOUNTS.length > 0 && <div className="mt-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-white/10" />
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
              Demo Accounts
            </p>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleDemoLogin(acc)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: acc.bg, borderColor: acc.border }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black text-white"
                  style={{ background: acc.color }}>
                  {acc.role[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white leading-none">{acc.role}</p>
                  <p className="text-[10px] mt-0.5 font-mono truncate" style={{ color: acc.color }}>
                    {acc.username}
                  </p>
                  <p className="text-[10px] font-mono truncate text-slate-500">
                    {acc.password}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-center text-[10px] text-slate-600 mt-2">
            Click any card to auto-fill credentials
          </p>
        </div>}

      </div>
    </div>
  );
}

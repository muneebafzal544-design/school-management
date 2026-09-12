import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, CheckCircle2, ArrowUpRight, Zap, Building2,
  Crown, Star, RefreshCw, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { getPlans, getSubscription, getPayments, requestUpgrade } from '../api/billing';

const PLAN_ICONS = { Starter: Star, Growth: Zap, Institution: Crown };
const PLAN_COLORS = {
  Starter:     { bg: 'bg-slate-50 dark:bg-slate-900/40',   border: 'border-slate-200 dark:border-slate-700',   btn: 'bg-slate-700 hover:bg-slate-800',     badge: '' },
  Growth:      { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-400',                         btn: 'bg-indigo-600 hover:bg-indigo-700',    badge: 'Popular' },
  Institution: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-400',                         btn: 'bg-purple-600 hover:bg-purple-700',    badge: 'Enterprise' },
};

const STATUS_COLOR = {
  completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  pending:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  failed:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  refunded:  'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
};

export default function BillingPage() {
  const [plans,    setPlans]    = useState([]);
  const [sub,      setSub]      = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [upgrading, setUpgrading] = useState(null); // plan_id being upgraded to

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, subRes, payRes] = await Promise.allSettled([
        getPlans(),
        getSubscription(),
        getPayments(),
      ]);
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data?.data ?? plansRes.value.data ?? []);
      if (subRes.status === 'fulfilled')   setSub(subRes.value.data?.data ?? subRes.value.data);
      if (payRes.status === 'fulfilled')   setPayments(payRes.value.data?.data ?? payRes.value.data ?? []);
    } catch {
      toast.error('Failed to load billing info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpgrade(planId) {
    setUpgrading(planId);
    try {
      const res = await requestUpgrade({ plan_id: planId });
      toast.success(res.data?.message || 'Upgrade request submitted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Request failed');
    } finally {
      setUpgrading(null);
    }
  }

  if (loading) return <Layout><PageLoader /></Layout>;

  const currentPlanId = sub?.plan_id;

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-indigo-500" size={24} />
            Billing & Subscription
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your school's plan and payment history</p>
        </div>

        {/* Current plan */}
        {sub ? (
          <div className="bg-indigo-600 text-white rounded-2xl p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-indigo-200 text-sm mb-1">Current Plan</p>
                <h2 className="text-2xl font-bold">{sub.plan_name}</h2>
                <p className="text-indigo-200 text-sm mt-1">
                  PKR {Number(sub.price_monthly || 0).toLocaleString()} / month
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full capitalize">{sub.status}</span>
                {sub.expires_at && (
                  <p className="text-indigo-200 text-xs mt-2">
                    Renews {new Date(sub.expires_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
            {/* Usage bars */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              {[
                { label: 'Students', used: sub.students_count || 0, max: sub.max_students },
                { label: 'Teachers', used: sub.teachers_count || 0, max: sub.max_teachers },
              ].map(u => (
                <div key={u.label}>
                  <div className="flex justify-between text-xs text-indigo-200 mb-1">
                    <span>{u.label}</span>
                    <span>{u.used} / {u.max}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-white transition-all"
                      style={{ width: `${Math.min(100, (u.used / u.max) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-center gap-3">
            <AlertCircle className="text-amber-500 shrink-0" size={20} />
            <p className="text-amber-700 dark:text-amber-400 text-sm">No active subscription found. Choose a plan below.</p>
          </div>
        )}

        {/* Plans */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map(plan => {
              const Icon = PLAN_ICONS[plan.name] || Star;
              const colors = PLAN_COLORS[plan.name] || PLAN_COLORS.Starter;
              const isCurrent = plan.id === currentPlanId;
              return (
                <div key={plan.id}
                  className={`rounded-2xl border-2 p-5 flex flex-col ${colors.bg} ${isCurrent ? 'border-indigo-500' : colors.border}`}>
                  {colors.badge && (
                    <span className="self-start mb-3 text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-600 text-white">{colors.badge}</span>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={20} className="text-indigo-600" />
                    <h3 className="font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
                    PKR {Number(plan.price_monthly).toLocaleString()}
                    <span className="text-sm font-normal text-gray-400">/mo</span>
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    PKR {Number(plan.price_yearly).toLocaleString()} / year
                  </p>
                  <ul className="space-y-1.5 mb-5 flex-1">
                    <li className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      Up to {plan.max_students} students
                    </li>
                    <li className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      Up to {plan.max_teachers} teachers
                    </li>
                    {(plan.features || []).map(f => (
                      <li key={f} className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        {f.replace(/_/g, ' ')}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className="w-full text-center py-2.5 rounded-xl text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
                      Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgrading === plan.id}
                      className={`w-full text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${colors.btn} disabled:opacity-50`}>
                      {upgrading === plan.id
                        ? <RefreshCw size={14} className="animate-spin" />
                        : <ArrowUpRight size={14} />}
                      {upgrading === plan.id ? 'Requesting…' : 'Request Upgrade'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Upgrade requests are processed manually. Our team will contact you within 24 hours.
          </p>
        </div>

        {/* Payment history */}
        {payments.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment History</h2>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Plan</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Amount</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(p.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{p.plan_name || `Plan #${p.plan_id}`}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        PKR {Number(p.amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLOR[p.status] || ''}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

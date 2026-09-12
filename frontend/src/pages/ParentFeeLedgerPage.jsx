import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Banknote, CheckCircle2, Clock, AlertTriangle,
  Download, CreditCard, X, ExternalLink, Receipt,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { getStudentFeeAccount } from '../api/fees';
import { useSettings } from '../hooks/useReferenceData';
import toast from 'react-hot-toast';

const PKR = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

const STATUS_STYLE = {
  paid:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  unpaid:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

/* ── Pay Now Modal ── */
function PayNowModal({ invoice, settings, onClose }) {
  const jazzCash  = settings?.jazzcash_account  || settings?.bank_account_number;
  const easyPaisa = settings?.easypaisa_account || settings?.bank_account_title;
  const bankName  = settings?.bank_name;
  const bankIban  = settings?.bank_iban || settings?.bank_account_number;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CreditCard size={16} className="text-emerald-500" /> Pay Now
          </h2>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Invoice summary */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500 mb-1">Payment for</p>
            <p className="font-bold text-slate-800 dark:text-white">
              {invoice.items?.[0]?.fee_head_name || invoice.invoice_no || 'Invoice'}
              {invoice.billing_month && ` · ${invoice.billing_month}`}
            </p>
            <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-1">
              PKR {PKR(invoice.balance)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Balance due</p>
          </div>

          {/* Payment options */}
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Methods</p>

          {/* JazzCash */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                <span className="text-white text-[10px] font-extrabold">JC</span>
              </div>
              <p className="font-bold text-slate-800 dark:text-white text-sm">JazzCash</p>
            </div>
            {jazzCash ? (
              <>
                <p className="text-xs text-slate-500 mb-1">Send to this number:</p>
                <p className="font-mono text-sm font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 select-all">
                  {jazzCash}
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  After payment, share the transaction ID with the school office.
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-400">Contact school for JazzCash details</p>
            )}
          </div>

          {/* EasyPaisa */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
                <span className="text-white text-[10px] font-extrabold">EP</span>
              </div>
              <p className="font-bold text-slate-800 dark:text-white text-sm">EasyPaisa</p>
            </div>
            {easyPaisa ? (
              <>
                <p className="text-xs text-slate-500 mb-1">Account name:</p>
                <p className="font-bold text-sm text-slate-800 dark:text-white">{easyPaisa}</p>
              </>
            ) : (
              <p className="text-xs text-slate-400">Contact school for EasyPaisa details</p>
            )}
          </div>

          {/* Bank transfer */}
          {bankIban && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Banknote size={14} className="text-white" />
                </div>
                <p className="font-bold text-slate-800 dark:text-white text-sm">Bank Transfer</p>
              </div>
              {bankName && <p className="text-xs text-slate-500">{bankName}</p>}
              <p className="font-mono text-xs font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 mt-1 select-all">
                {bankIban}
              </p>
            </div>
          )}

          <p className="text-[11px] text-slate-400 text-center">
            After payment, visit the school office with your receipt to get it recorded.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function ParentFeeLedgerPage() {
  const { user }        = useAuth();
  const [searchParams]  = useSearchParams();
  // Multi-child: prefer ?student_id= param, fall back to entity_id
  const childId = parseInt(searchParams.get('student_id') || '') || user.entity_id;

  const [account,  setAccount]  = useState(null);
  const { data: settings = {} } = useSettings();
  const [loading,  setLoading]  = useState(true);
  const [payModal, setPayModal] = useState(null); // invoice object
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'payments'

  useEffect(() => {
    const load = async () => {
      try {
        const accRes = childId ? await getStudentFeeAccount(childId) : { data: null };
        // getStudentFeeAccount returns { success, student, invoices, payments, totals }
        const acc = accRes.data;
        setAccount(acc?.student ? acc : (acc?.data || null));
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
  }, [childId]);

  const handlePrint = (invoiceId) => {
    window.open(`/fees/invoice/${invoiceId}/print`, '_blank');
  };

  if (loading) return <Layout><PageLoader /></Layout>;

  if (!account) return (
    <Layout>
      <div className="p-8 text-center">
        <AlertTriangle size={32} className="mx-auto mb-3 text-amber-400" />
        <p className="text-slate-500">No fee account found. Please contact the school admin.</p>
      </div>
    </Layout>
  );

  const invoices  = Array.isArray(account.invoices)  ? account.invoices  : [];
  const payments  = Array.isArray(account.payments)  ? account.payments  : [];
  const student   = account.student || {};

  const totalCharged  = account.totals?.billed    ?? invoices.reduce((s, i) => s + Number(i.net_amount || 0), 0);
  const totalPaid     = account.totals?.collected ?? payments.reduce((s, p) => s + Number(p.amount    || 0), 0);
  const totalBalance  = account.totals?.balance   ?? invoices.reduce((s, i) => s + Number(i.balance   || 0), 0);
  const unpaidCount   = invoices.filter(i => i.status === 'unpaid' || i.status === 'partial').length;

  return (
    <Layout>
      {payModal && (
        <PayNowModal
          invoice={payModal}
          settings={settings}
          onClose={() => setPayModal(null)}
        />
      )}

      {/* Header */}
      <div
        className="relative overflow-hidden px-6 pt-10 pb-20"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #a78bfa 0%, transparent 60%)' }} />
        <div className="relative">
          <p className="text-violet-300 text-sm font-semibold mb-1">Fee Ledger</p>
          <h1 className="text-2xl font-extrabold text-white">{student.full_name || 'Student'}</h1>
          <p className="text-violet-200 text-sm">{student.class_name || '—'} · Roll #{student.roll_number || '—'}</p>
        </div>
      </div>

      <div className="relative z-10 px-4 sm:px-6 -mt-12 pb-12 space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Charged</p>
            <p className="text-lg font-extrabold text-slate-800 dark:text-white">PKR {PKR(totalCharged)}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Paid</p>
            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">PKR {PKR(totalPaid)}</p>
          </div>
          <div className={`rounded-2xl p-4 shadow-sm border text-center ${
            totalBalance > 0
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
          }`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Balance Due</p>
            <p className={`text-lg font-extrabold ${totalBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              PKR {PKR(totalBalance)}
            </p>
          </div>
        </div>

        {/* Pay Now banner — only if there's a balance */}
        {unpaidCount > 0 && (
          <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-4 flex items-center gap-4">
            <AlertTriangle size={20} className="text-white shrink-0" />
            <div className="flex-1">
              <p className="text-white font-bold text-sm">{unpaidCount} unpaid invoice{unpaidCount > 1 ? 's' : ''}</p>
              <p className="text-red-100 text-xs">Total balance: PKR {PKR(totalBalance)}</p>
            </div>
            <button
              onClick={() => {
                const first = invoices.find(i => i.status === 'unpaid' || i.status === 'partial');
                if (first) setPayModal(first);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-red-600 text-sm font-bold hover:bg-red-50 transition-colors shrink-0"
            >
              <CreditCard size={14} /> Pay Now
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="flex border-b border-slate-100 dark:border-slate-800">
            {[
              { key: 'invoices', label: `Invoices (${invoices.length})`, icon: Banknote },
              { key: 'payments', label: `Payments (${payments.length})`, icon: Receipt },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                  activeTab === key
                    ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-500'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* Invoices tab */}
          {activeTab === 'invoices' && (
            invoices.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">No invoices found</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map(inv => (
                  <div key={inv.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                        inv.status === 'paid' ? 'bg-emerald-400' : inv.status === 'partial' ? 'bg-amber-400' : 'bg-red-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-800 dark:text-white">
                            {inv.items?.[0]?.fee_head_name || inv.invoice_no || 'Invoice'}
                            {inv.billing_month && ` · ${inv.billing_month}`}
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[inv.status] || STATUS_STYLE.unpaid}`}>
                            {inv.status}
                          </span>
                        </div>
                        <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-slate-500">
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase tracking-wide">Charged</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">PKR {PKR(inv.net_amount)}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase tracking-wide">Paid</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              PKR {PKR(inv.paid_amount || (Number(inv.net_amount) - Number(inv.balance || 0)))}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase tracking-wide">Balance</span>
                            <span className={`font-semibold ${Number(inv.balance) > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              PKR {PKR(inv.balance)}
                            </span>
                          </div>
                        </div>
                        {inv.due_date && (
                          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <Clock size={10} /> Due: {inv.due_date}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {(inv.status === 'unpaid' || inv.status === 'partial') && (
                          <button
                            onClick={() => setPayModal(inv)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold transition-colors"
                          >
                            <CreditCard size={10} /> Pay
                          </button>
                        )}
                        <button
                          onClick={() => handlePrint(inv.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-colors"
                        >
                          <ExternalLink size={10} /> View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Payments tab */}
          {activeTab === 'payments' && (
            payments.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">No payments recorded</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map(pay => (
                  <div key={pay.id} className="px-5 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">
                        Receipt #{pay.receipt_number || pay.invoice_no || pay.id}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {pay.payment_date} · {pay.payment_method || 'cash'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                        PKR {PKR(pay.amount)}
                      </p>
                      <button
                        onClick={() => window.open(`/fees/receipt/${pay.id}`, '_blank')}
                        className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5 mt-0.5 ml-auto"
                      >
                        <Download size={9} /> Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

      </div>
    </Layout>
  );
}

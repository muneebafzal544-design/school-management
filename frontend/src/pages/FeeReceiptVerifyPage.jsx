import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, GraduationCap } from 'lucide-react';
import { verifyReceipt } from '../api/feeAdvanced';

const PKR = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function FeeReceiptVerifyPage() {
  const { receiptNo } = useParams();
  const [status, setStatus] = useState('loading'); // loading | verified | invalid | voided
  const [data,   setData]   = useState(null);

  useEffect(() => {
    verifyReceipt(receiptNo)
      .then(r => {
        const d = r.data?.data ?? r.data;
        setData(d);
        setStatus(d?.verified ? 'verified' : d?.voided ? 'voided' : 'invalid');
      })
      .catch(() => setStatus('invalid'));
  }, [receiptNo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl mb-3">
            <GraduationCap size={28} className="text-white" />
          </div>
          <p className="text-slate-400 text-sm">Receipt Verification</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl text-center">
          {status === 'loading' && (
            <div className="py-8">
              <Loader2 size={40} className="mx-auto text-indigo-400 animate-spin mb-3" />
              <p className="text-slate-300 text-sm">Verifying receipt…</p>
            </div>
          )}

          {status === 'verified' && (
            <>
              <CheckCircle2 size={52} className="mx-auto text-green-400 mb-4" />
              <h2 className="text-xl font-bold text-white mb-1">Verified ✓</h2>
              <p className="text-green-400 text-sm mb-6">This is a genuine payment receipt</p>

              <div className="space-y-3 text-left">
                {[
                  { label: 'Receipt No',      value: data.receipt_no },
                  { label: 'Student',         value: data.student_name },
                  { label: 'Roll Number',     value: data.roll_number },
                  { label: 'Class',           value: data.class_name },
                  { label: 'Amount Paid',     value: PKR(data.amount) },
                  { label: 'Payment Date',    value: new Date(data.payment_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' }) },
                  { label: 'Payment Method',  value: (data.payment_method || '').toUpperCase() },
                  { label: 'Invoice No',      value: data.invoice_no },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400 text-xs">{label}</span>
                    <span className="text-white text-xs font-medium text-right max-w-[55%] truncate">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {status === 'voided' && (
            <>
              <XCircle size={52} className="mx-auto text-orange-400 mb-4" />
              <h2 className="text-xl font-bold text-white mb-1">Payment Voided</h2>
              <p className="text-orange-300 text-sm">
                Receipt <span className="font-mono">{receiptNo}</span> was found but this payment has been voided/reversed.
              </p>
            </>
          )}

          {status === 'invalid' && (
            <>
              <XCircle size={52} className="mx-auto text-red-400 mb-4" />
              <h2 className="text-xl font-bold text-white mb-1">Not Found</h2>
              <p className="text-red-300 text-sm">
                Receipt <span className="font-mono">{receiptNo}</span> does not exist in our records. This may be a fake receipt.
              </p>
            </>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          Powered by SchoolMS
        </p>
      </div>
    </div>
  );
}

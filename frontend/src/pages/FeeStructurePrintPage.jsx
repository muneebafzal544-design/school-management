import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, GraduationCap } from 'lucide-react';
import { getFeeStructures } from '../api/fees';
import { useClasses, useSettings } from '../hooks/useReferenceData';

const PKR = (n) => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const CAT_LABEL = { admission: 'Admission', monthly: 'Monthly', one_time: 'One-Time' };
const CAT_ORDER = ['monthly', 'admission', 'one_time'];

export default function FeeStructurePrintPage() {
  const [params]   = useSearchParams();
  const year       = params.get('year') || '2024-25';
  const classParam = params.get('class_id') || '';

  const [structures, setStructures] = useState([]);
  const { data: classes = [] }      = useClasses();
  const { data: settingsRaw = {} }  = useSettings();
  const settings = Array.isArray(settingsRaw) ? Object.fromEntries(settingsRaw.map(r => [r.key, r.value])) : settingsRaw;
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    getFeeStructures({ academic_year: year, ...(classParam ? { class_id: classParam } : {}) })
      .then(sRes => setStructures(Array.isArray(sRes.data) ? sRes.data : []))
      .catch(() => {}).finally(() => setLoading(false));
  }, [year, classParam]);

  // Group structures by class_id
  const grouped = (() => {
    const map = new Map();
    structures.forEach(s => {
      const key = s.class_id ?? '__global';
      if (!map.has(key)) {
        map.set(key, {
          class_id:   s.class_id,
          class_name: s.class_name || 'All Classes',
          grade:      s.grade,
          section:    s.section,
          items:      [],
        });
      }
      map.get(key).items.push(s);
    });
    // Sort by grade then section
    return [...map.values()].sort((a, b) => {
      const ga = Number(a.grade) || 999;
      const gb = Number(b.grade) || 999;
      return ga !== gb ? ga - gb : (a.class_name || '').localeCompare(b.class_name || '');
    });
  })();

  const schoolName   = settings.school_name   || 'School Management System';
  const schoolAddress = settings.school_address || '';
  const schoolPhone  = settings.school_phone   || '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading fee structure…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print toolbar — hidden when printing */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <GraduationCap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Fee Structure</p>
            <p className="text-xs text-gray-500">Academic Year {year}</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
        >
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      {/* Printable content */}
      <div className="print-page bg-white min-h-screen p-8 max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-indigo-600 pb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <GraduationCap size={24} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-extrabold text-gray-900">{schoolName}</h1>
              {schoolAddress && <p className="text-xs text-gray-500">{schoolAddress}</p>}
              {schoolPhone   && <p className="text-xs text-gray-500">Tel: {schoolPhone}</p>}
            </div>
          </div>
          <div className="mt-3 inline-block px-6 py-1.5 rounded-full text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            FEE STRUCTURE — ACADEMIC YEAR {year}
          </div>
          <p className="text-xs text-gray-400 mt-2">Printed on {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {grouped.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-semibold">No fee structures found</p>
            <p className="text-sm mt-1">Set up fee structures in the Fees page first.</p>
          </div>
        )}

        {/* One section per class */}
        {grouped.map((grp, gi) => {
          // Group items by category within this class
          const byCategory = CAT_ORDER.map(cat => ({
            cat,
            label: CAT_LABEL[cat] || cat,
            items: grp.items.filter(i => i.category === cat),
          })).filter(g => g.items.length > 0);

          const totalMonthly    = grp.items.filter(i => i.category === 'monthly').reduce((s, i) => s + Number(i.amount), 0);
          const totalAdmission  = grp.items.filter(i => i.category === 'admission').reduce((s, i) => s + Number(i.amount), 0);
          const totalOneTime    = grp.items.filter(i => i.category === 'one_time').reduce((s, i) => s + Number(i.amount), 0);

          return (
            <div key={gi} className="mb-8 break-inside-avoid">
              {/* Class heading */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                  style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>
                  {grp.grade || grp.class_name?.[0] || 'C'}
                </div>
                <h2 className="text-base font-extrabold text-gray-900">
                  {grp.class_name}
                  {grp.section ? ` — Section ${grp.section}` : ''}
                </h2>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <table className="w-full text-sm border-collapse mb-2">
                <thead>
                  <tr className="text-white text-xs" style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}>
                    <th className="px-4 py-2 text-left font-semibold rounded-tl-lg">Fee Head</th>
                    <th className="px-4 py-2 text-center font-semibold">Category</th>
                    <th className="px-4 py-2 text-right font-semibold rounded-tr-lg">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map(({ cat, label, items }) => (
                    items.map((item, idx) => (
                      <tr key={item.id}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-gray-800 font-medium border-b border-gray-100">
                          {item.fee_head_name}
                        </td>
                        <td className="px-4 py-2 text-center border-b border-gray-100">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cat === 'monthly'   ? 'bg-emerald-100 text-emerald-700' :
                            cat === 'admission' ? 'bg-blue-100 text-blue-700' :
                                                  'bg-purple-100 text-purple-700'
                          }`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-gray-800 font-semibold border-b border-gray-100">
                          {PKR(item.amount)}
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>
                <tfoot>
                  {totalMonthly > 0 && (
                    <tr className="bg-emerald-50">
                      <td colSpan={2} className="px-4 py-2 text-xs font-bold text-emerald-700">Monthly Total</td>
                      <td className="px-4 py-2 text-right font-extrabold text-emerald-700">{PKR(totalMonthly)}</td>
                    </tr>
                  )}
                  {totalAdmission > 0 && (
                    <tr className="bg-blue-50">
                      <td colSpan={2} className="px-4 py-2 text-xs font-bold text-blue-700">Admission Total</td>
                      <td className="px-4 py-2 text-right font-extrabold text-blue-700">{PKR(totalAdmission)}</td>
                    </tr>
                  )}
                  {totalOneTime > 0 && (
                    <tr className="bg-purple-50">
                      <td colSpan={2} className="px-4 py-2 text-xs font-bold text-purple-700">One-Time Total</td>
                      <td className="px-4 py-2 text-right font-extrabold text-purple-700">{PKR(totalOneTime)}</td>
                    </tr>
                  )}
                  <tr style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}>
                    <td colSpan={2} className="px-4 py-2.5 text-xs font-extrabold text-white rounded-bl-lg">
                      GRAND TOTAL (All Categories)
                    </td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-white rounded-br-lg">
                      PKR {PKR(totalMonthly + totalAdmission + totalOneTime)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}

        {/* Summary table if multiple classes */}
        {grouped.length > 1 && (
          <div className="mt-6 break-inside-avoid">
            <h2 className="text-base font-extrabold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-indigo-500 inline-block" />
              Summary — All Classes
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-white text-xs" style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}>
                  <th className="px-4 py-2 text-left font-semibold rounded-tl-lg">Class</th>
                  <th className="px-4 py-2 text-right font-semibold">Monthly</th>
                  <th className="px-4 py-2 text-right font-semibold">Admission</th>
                  <th className="px-4 py-2 text-right font-semibold rounded-tr-lg">One-Time</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((grp, i) => {
                  const m = grp.items.filter(x => x.category === 'monthly').reduce((s, x) => s + Number(x.amount), 0);
                  const a = grp.items.filter(x => x.category === 'admission').reduce((s, x) => s + Number(x.amount), 0);
                  const o = grp.items.filter(x => x.category === 'one_time').reduce((s, x) => s + Number(x.amount), 0);
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 font-semibold text-gray-800 border-b border-gray-100">{grp.class_name}</td>
                      <td className="px-4 py-2 text-right text-emerald-700 font-medium border-b border-gray-100">{m ? PKR(m) : '—'}</td>
                      <td className="px-4 py-2 text-right text-blue-700 font-medium border-b border-gray-100">{a ? PKR(a) : '—'}</td>
                      <td className="px-4 py-2 text-right text-purple-700 font-medium border-b border-gray-100">{o ? PKR(o) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-400">
          <span>{schoolName}</span>
          <span>Academic Year: {year}</span>
          <span>Page 1 of 1</span>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { padding: 16px !important; max-width: 100% !important; }
          body { margin: 0; }
          @page { margin: 12mm; size: A4; }
        }
      `}</style>
    </>
  );
}

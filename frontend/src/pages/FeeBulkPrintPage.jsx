import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBulkPrintData } from '../api/fees';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const STATUS_LABEL = {
  paid: 'PAID', partial: 'PARTIAL', unpaid: 'UNPAID',
  overdue: 'OVERDUE', cancelled: 'CANCELLED', waived: 'WAIVED',
};
const STATUS_COLOR = {
  paid: '#16a34a', partial: '#d97706', unpaid: '#dc2626',
  overdue: '#7c3aed', cancelled: '#94a3b8', waived: '#0ea5e9',
};
const TYPE_LABEL = { admission: 'Admission', monthly: 'Monthly Fee', one_time: 'One-Time' };

function Slip({ inv, copy }) {
  const net     = parseFloat(inv.net_amount     || 0);
  const balance = parseFloat(inv.balance        || 0);
  const statusColor = STATUS_COLOR[inv.status] || '#dc2626';

  return (
    <div className="slip">
      {/* ── Header ── */}
      <div className="slip-header">
        <div className="school-logo">S</div>
        <div className="school-info">
          <div className="school-name">SCHOOL MANAGEMENT SYSTEM</div>
          <div className="school-sub">Fee Challan / Invoice</div>
        </div>
        <div className="slip-meta">
          <div className="invoice-no">{inv.invoice_no}</div>
          <div className="copy-label">{copy}</div>
          <div
            className="status-badge"
            style={{ background: statusColor + '18', color: statusColor, borderColor: statusColor + '44' }}>
            {STATUS_LABEL[inv.status] || inv.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Student Info ── */}
      <div className="info-grid">
        <div className="info-row">
          <span className="info-label">Student Name</span>
          <span className="info-value bold">{inv.student_name}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Father Name</span>
          <span className="info-value">{inv.father_name || '—'}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Class / Section</span>
          <span className="info-value">{inv.class_name || '—'}{inv.section ? ` – ${inv.section}` : ''}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Roll Number</span>
          <span className="info-value">{inv.roll_number || '—'}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Invoice Type</span>
          <span className="info-value">{TYPE_LABEL[inv.invoice_type] || inv.invoice_type}</span>
        </div>
        {inv.billing_month && (
          <div className="info-row">
            <span className="info-label">Billing Month</span>
            <span className="info-value">{inv.billing_month}</span>
          </div>
        )}
        <div className="info-row">
          <span className="info-label">Issue Date</span>
          <span className="info-value">{inv.created_at ? String(inv.created_at).slice(0, 10) : '—'}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Due Date</span>
          <span className="info-value" style={{ color: balance > 0 && inv.due_date && new Date(inv.due_date) < new Date() ? '#dc2626' : 'inherit' }}>
            {inv.due_date || '—'}
          </span>
        </div>
      </div>

      {/* ── Fee Items ── */}
      <table className="fee-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left', width: '70%' }}>Description</th>
            <th style={{ textAlign: 'right' }}>Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {(inv.items || []).map((item, i) => (
            <tr key={i} style={{ textDecoration: item.is_waived ? 'line-through' : 'none', opacity: item.is_waived ? 0.5 : 1 }}>
              <td>{item.description}</td>
              <td style={{ textAlign: 'right' }}>{fmt(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totals ── */}
      <div className="totals">
        <div className="total-row">
          <span>Subtotal</span>
          <span>Rs. {fmt(inv.total_amount)}</span>
        </div>
        {parseFloat(inv.discount_amount || 0) > 0 && (
          <div className="total-row discount">
            <span>Discount</span>
            <span>- Rs. {fmt(inv.discount_amount)}</span>
          </div>
        )}
        {parseFloat(inv.fine_amount || 0) > 0 && (
          <div className="total-row fine">
            <span>Late Fine</span>
            <span>+ Rs. {fmt(inv.fine_amount)}</span>
          </div>
        )}
        <div className="total-row net">
          <span>Net Payable</span>
          <span>Rs. {fmt(net)}</span>
        </div>
        {parseFloat(inv.paid_amount || 0) > 0 && (
          <div className="total-row paid">
            <span>Paid</span>
            <span>Rs. {fmt(inv.paid_amount)}</span>
          </div>
        )}
        {balance > 0.01 && (
          <div className="total-row balance">
            <span>Balance Due</span>
            <span>Rs. {fmt(balance)}</span>
          </div>
        )}
      </div>

      {/* ── Signature ── */}
      <div className="sig-row">
        <div className="sig-box">
          <div className="sig-line" />
          <div className="sig-label">Cashier / Accountant</div>
        </div>
        <div className="sig-box" style={{ textAlign: 'right' }}>
          <div className="sig-line" />
          <div className="sig-label">Principal / Authorized</div>
        </div>
      </div>
    </div>
  );
}

export default function FeeBulkPrintPage() {
  const [params]   = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const p = {};
    ['billing_month', 'class_id', 'status', 'invoice_type', 'ids'].forEach(k => {
      if (params.get(k)) p[k] = params.get(k);
    });
    getBulkPrintData(p)
      .then(r => {
        const data = r.data?.data ?? r.data;
        setInvoices(Array.isArray(data) ? data : []);
      })
      .catch(() => setError('Failed to load invoices. Please close this tab and try again.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && invoices.length > 0) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading, invoices]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial, sans-serif', fontSize: 14 }}>
      Loading {params.get('billing_month') ? `invoices for ${params.get('billing_month')}` : 'invoices'}…
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#dc2626', fontFamily: 'Arial, sans-serif', fontSize: 14 }}>
      {error}
    </div>
  );

  if (invoices.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial, sans-serif', fontSize: 14, color: '#64748b' }}>
      No invoices found for the selected filters.
    </div>
  );

  // Pair invoices: [school copy, parent copy] from each invoice → 2 slips per page
  const pages = [];
  invoices.forEach(inv => {
    pages.push(
      <div key={`${inv.id}-page`} className="page">
        <Slip inv={inv} copy="SCHOOL COPY" />
        <div className="cut-line">
          <span className="cut-label">✂ — — — — — — — — — — CUT HERE — — — — — — — — — — ✂</span>
        </div>
        <Slip inv={inv} copy="PARENT / STUDENT COPY" />
      </div>
    );
  });

  const month     = params.get('billing_month') || '';
  const className = params.get('class_name')    || '';

  return (
    <>
      {/* Print button — hidden when actually printing */}
      <div className="no-print toolbar">
        <div className="toolbar-info">
          <strong>{invoices.length}</strong> invoice{invoices.length !== 1 ? 's' : ''}
          {month     ? ` · Month: ${month}`   : ''}
          {className ? ` · Class: ${className}` : ''}
        </div>
        <button className="print-btn" onClick={() => window.print()}>
          🖨 Print All
        </button>
        <button className="close-btn" onClick={() => window.close()}>
          ✕ Close
        </button>
      </div>

      {pages}

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; background: #f0f0f0; }

        /* ── Screen toolbar ── */
        .toolbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: #1e293b; color: #e2e8f0;
          padding: 10px 20px; display: flex; align-items: center; gap: 12px;
        }
        .toolbar-info { flex: 1; font-size: 13px; }
        .print-btn {
          background: #10b981; color: #fff; border: none; border-radius: 8px;
          padding: 7px 18px; font-size: 13px; font-weight: 600; cursor: pointer;
        }
        .close-btn {
          background: #475569; color: #fff; border: none; border-radius: 8px;
          padding: 7px 14px; font-size: 13px; cursor: pointer;
        }

        /* ── Page ── */
        .page {
          width: 210mm;
          min-height: 297mm;
          margin: 48px auto 24px;
          background: #fff;
          box-shadow: 0 2px 20px rgba(0,0,0,0.12);
          padding: 8mm 10mm;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* ── Slip ── */
        .slip { flex: 1; padding: 6mm 4mm; }

        /* ── Cut line ── */
        .cut-line {
          border-top: 1.5px dashed #94a3b8;
          text-align: center;
          margin: 2mm 0;
          position: relative;
        }
        .cut-label {
          background: #fff;
          padding: 0 8px;
          color: #94a3b8;
          font-size: 8px;
          letter-spacing: 0.04em;
          position: relative;
          top: -7px;
        }

        /* ── Slip Header ── */
        .slip-header {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding-bottom: 5px;
          border-bottom: 2px solid #1e293b;
          margin-bottom: 6px;
        }
        .school-logo {
          width: 36px; height: 36px; border-radius: 8px;
          background: #1e293b; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 900; flex-shrink: 0;
        }
        .school-info { flex: 1; }
        .school-name { font-size: 13px; font-weight: 800; color: #1e293b; letter-spacing: 0.02em; }
        .school-sub  { font-size: 9px; color: #64748b; margin-top: 1px; text-transform: uppercase; letter-spacing: 0.08em; }
        .slip-meta   { text-align: right; }
        .invoice-no  { font-size: 11px; font-weight: 700; color: #4338ca; font-family: monospace; }
        .copy-label  { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }
        .status-badge {
          display: inline-block;
          font-size: 8px; font-weight: 800;
          letter-spacing: 0.06em;
          padding: 2px 6px; border-radius: 20px;
          border: 1px solid;
          margin-top: 3px;
        }

        /* ── Info Grid ── */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px 12px;
          margin-bottom: 6px;
          padding: 5px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .info-row { display: flex; gap: 4px; align-items: baseline; }
        .info-label { font-size: 9px; color: #64748b; white-space: nowrap; min-width: 72px; }
        .info-value { font-size: 10px; color: #0f172a; flex: 1; }
        .info-value.bold { font-weight: 700; }

        /* ── Fee Table ── */
        .fee-table {
          width: 100%; border-collapse: collapse;
          margin-bottom: 5px;
          font-size: 10px;
        }
        .fee-table thead tr {
          background: #f1f5f9;
          border-bottom: 1px solid #cbd5e1;
        }
        .fee-table th { padding: 4px 6px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; font-weight: 700; }
        .fee-table td { padding: 3px 6px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
        .fee-table tbody tr:last-child td { border-bottom: none; }

        /* ── Totals ── */
        .totals {
          border-top: 1px solid #cbd5e1;
          padding-top: 4px;
          margin-bottom: 6px;
        }
        .total-row {
          display: flex; justify-content: space-between;
          padding: 2px 6px; font-size: 10px; color: #334155;
        }
        .total-row.discount { color: #16a34a; }
        .total-row.fine     { color: #dc2626; }
        .total-row.net      { font-weight: 800; font-size: 11px; border-top: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; padding: 3px 6px; margin: 2px 0; background: #f8fafc; }
        .total-row.paid     { color: #16a34a; font-weight: 600; }
        .total-row.balance  { color: #dc2626; font-weight: 700; font-size: 11px; }

        /* ── Signature ── */
        .sig-row   { display: flex; justify-content: space-between; margin-top: 8px; }
        .sig-box   { width: 38%; }
        .sig-line  { border-bottom: 1px solid #94a3b8; height: 16px; margin-bottom: 2px; }
        .sig-label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }

        /* ── Print Media ── */
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .page {
            margin: 0;
            box-shadow: none;
            page-break-after: always;
            width: 100%;
            min-height: auto;
          }
          .page:last-child { page-break-after: avoid; }
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
        }
      `}</style>
    </>
  );
}

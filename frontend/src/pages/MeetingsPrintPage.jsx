import { useState, useEffect } from 'react';
import { getBookings } from '../api/meetings';

export default function MeetingsPrintPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date') || '';
    const teacherParam = params.get('teacher_id') || '';
    setDate(dateParam);

    const fetchData = async () => {
      try {
        const p = {};
        if (dateParam) p.date = dateParam;
        if (teacherParam) p.teacher_id = teacherParam;
        const r = await getBookings(p);
        const d = r.data?.data ?? r.data ?? [];
        setBookings(Array.isArray(d) ? d : []);
      } catch {
        setError('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && bookings.length > 0) {
      setTimeout(() => window.print(), 300);
    }
  }, [loading, bookings]);

  // Group by teacher
  const grouped = bookings.reduce((acc, b) => {
    const key = b.teacher_name || 'Unknown Teacher';
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>;
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-family: Arial, sans-serif; }
          table { page-break-inside: avoid; }
        }
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; font-weight: bold; }
        h1 { text-align: center; margin-bottom: 4px; }
        h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #333; padding-bottom: 4px; }
        .subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 24px; }
        .no-print { margin-bottom: 20px; }
        .print-btn { padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
      `}</style>

      <div className="no-print" style={{ marginBottom: 20 }}>
        <button className="print-btn" onClick={() => window.print()}>Print Schedule</button>
        <button style={{ marginLeft: 8, padding: '8px 16px', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          onClick={() => window.close()}>Close</button>
      </div>

      <h1>PTM Schedule</h1>
      <p className="subtitle">
        {date ? `Date: ${fmtDate(date)}` : 'All Dates'} · Total Bookings: {bookings.length}
      </p>

      {Object.keys(grouped).length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>No bookings found</p>
      ) : (
        Object.entries(grouped).map(([teacherName, teacherBookings]) => (
          <div key={teacherName}>
            <h2>{teacherName}</h2>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Student Name</th>
                  <th>Parent Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {teacherBookings
                  .sort((a, b) => (a.slot_time || '').localeCompare(b.slot_time || ''))
                  .map(b => (
                    <tr key={b.id}>
                      <td>{b.slot_time || '—'}</td>
                      <td>{b.student_name || '—'}</td>
                      <td>{b.parent_name || '—'}</td>
                      <td>{b.parent_phone || '—'}</td>
                      <td>{b.status || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </>
  );
}

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import DocumentManager from '../components/DocumentManager';
import { useStudentsPicker } from '../hooks/useReferenceData';

export default function DocumentsPage() {
  // No status filter here (unlike the default picker) — documents can be
  // managed for any student regardless of active/inactive status.
  const { data: students = [], isError: studentsError } = useStudentsPicker({ status: undefined });
  const [search,     setSearch]     = useState('');
  const [studentId,  setStudentId]  = useState('');
  const [filtered,   setFiltered]   = useState([]);

  useEffect(() => {
    if (studentsError) toast.error('Failed to load students');
  }, [studentsError]);

  useEffect(() => {
    if (!search) { setFiltered(students); return; }
    const q = search.toLowerCase();
    setFiltered(students.filter(s =>
      s.full_name?.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q)
    ));
  }, [search, students]);

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Manager</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Upload and manage student documents, certificates, and school records
          </p>
        </div>

        {/* Student selector */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter by Student (optional)
          </label>
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search student name or roll number…"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {studentId && (
              <button onClick={() => { setStudentId(''); setSearch(''); }}
                className="text-sm text-indigo-600 hover:underline whitespace-nowrap">
                View All
              </button>
            )}
          </div>
          {search && filtered.length > 0 && !studentId && (
            <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {filtered.slice(0, 10).map(s => (
                <button key={s.id}
                  onClick={() => { setStudentId(s.id); setSearch(s.name); setFiltered([]); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{s.full_name}</span>
                  <span className="text-xs text-gray-400">#{s.roll_number}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <DocumentManager studentId={studentId || null} />
      </div>
    </Layout>
  );
}

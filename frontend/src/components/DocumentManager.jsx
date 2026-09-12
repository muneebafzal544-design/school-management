import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Trash2, Download, Search, Loader2, File, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDocuments, uploadDocument, deleteDocument } from '../api/documents';

const CATEGORIES = ['general', 'admission', 'fee', 'medical', 'academic', 'certificate', 'other'];

export default function DocumentManager({ studentId = null }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'general' });
  const fileRef = useRef();

  useEffect(() => {
    fetchDocs();
  }, [studentId, category]);

  async function fetchDocs() {
    setLoading(true);
    try {
      const params = {};
      if (studentId) params.student_id = studentId;
      if (category) params.category = category;
      const r = await getDocuments(params);
      setDocs(r.data.data);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!form.title) return toast.error('Title is required');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      if (studentId) fd.append('student_id', studentId);
      if (fileRef.current?.files[0]) fd.append('file', fileRef.current.files[0]);
      await uploadDocument(fd);
      toast.success('Document uploaded');
      setShowUpload(false);
      setForm({ title: '', description: '', category: 'general' });
      fetchDocs();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this document?')) return;
    try {
      await deleteDocument(id);
      toast.success('Deleted');
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch {
      toast.error('Delete failed');
    }
  }

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.file_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-indigo-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Documents</h3>
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full px-2 py-0.5">{docs.length}</span>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700"
        >
          <Upload size={14} /> Upload
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <form onSubmit={handleUpload} className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-gray-100 dark:border-gray-700 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Upload New Document</p>
            <button type="button" onClick={() => setShowUpload(false)}><X size={16} className="text-gray-400" /></button>
          </div>
          <input
            required value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Title *"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <select
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input ref={fileRef} type="file" className="flex-1 text-sm text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-indigo-100 file:text-indigo-700" />
          </div>
          <button
            type="submit" disabled={uploading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={category} onChange={e => setCategory(e.target.value)}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 outline-none"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="animate-spin text-indigo-600 mx-auto" size={24} /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No documents found</div>
        ) : (
          filtered.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                <File size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400 capitalize">{doc.category}</span>
                  {doc.file_size && (
                    <span className="text-xs text-gray-400">· {(doc.file_size / 1024).toFixed(0)} KB</span>
                  )}
                  <span className="text-xs text-gray-400">· {new Date(doc.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noreferrer"
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                    <Download size={14} />
                  </a>
                )}
                <button onClick={() => handleDelete(doc.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

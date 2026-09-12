import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Trash2, X, Loader2, RefreshCw, Edit2,
  MapPin, Phone, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../api/branches';

const emptyForm = { name: '', code: '', city: '', phone: '', address: '', notes: '' };

export default function BranchesPage() {
  const [branches,  setBranches]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [form,      setForm]      = useState(emptyForm);
  const [editId,    setEditId]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getBranches();
      setBranches(r.data?.data ?? []);
    } catch { toast.error('Failed to load branches'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(branch) {
    setForm({
      name: branch.name || '', code: branch.code || '',
      city: branch.city || '', phone: branch.phone || '',
      address: branch.address || '', notes: branch.notes || '',
    });
    setEditId(branch.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) { toast.error('Branch name required'); return; }
    setSaving(true);
    try {
      if (editId) await updateBranch(editId, form);
      else await createBranch(form);
      toast.success(editId ? 'Branch updated' : 'Branch created');
      setForm(emptyForm); setEditId(null); setShowForm(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    try {
      await deleteBranch(deleteModal.id);
      toast.success('Branch deleted');
      setDeleteModal(null);
      load();
    } catch { toast.error('Failed to delete'); }
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="text-blue-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Branches & Campuses</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage multi-campus school locations</p>
            </div>
          </div>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          ><Plus size={16} /> Add Branch</button>
        </div>

        {loading ? <PageLoader /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-500 dark:text-gray-400">
                No branches yet. Create your first campus!
              </div>
            )}
            {branches.map(b => (
              <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 dark:text-white">{b.name}</p>
                      {b.code && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                          {b.code}
                        </span>
                      )}
                      {!b.active && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full text-xs">Inactive</span>
                      )}
                    </div>
                    {b.principal_name && <p className="text-xs text-gray-500 mt-0.5">Principal: {b.principal_name}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(b)}
                      className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"
                    ><Edit2 size={13} /></button>
                    <button onClick={() => setDeleteModal(b)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400"
                    ><Trash2 size={13} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    { label: 'Students', value: b.student_count || 0, color: 'text-green-600' },
                    { label: 'Classes',  value: b.class_count || 0,   color: 'text-purple-600' },
                    { label: 'Teachers', value: b.teacher_count || 0, color: 'text-blue-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 dark:bg-gray-700 rounded-lg py-2">
                      <p className={`font-bold text-lg ${s.color}`}>{s.value}</p>
                      <p className="text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-xs text-gray-500">
                  {b.city    && <div className="flex items-center gap-1.5"><MapPin size={11} />{b.city}</div>}
                  {b.phone   && <div className="flex items-center gap-1.5"><Phone size={11} />{b.phone}</div>}
                  {b.address && <div className="flex items-center gap-1.5"><MapPin size={11} className="shrink-0" /><span className="truncate">{b.address}</span></div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900 dark:text-white">{editId ? 'Edit Branch' : 'Add Branch'}</h2>
              <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}><X size={18} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Branch Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    required placeholder="e.g. Main Campus"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Branch Code</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    placeholder="e.g. MAIN"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">City</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Address</label>
                <textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {saving ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                  {editId ? 'Update' : 'Create Branch'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300"
                >Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Delete Branch?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Delete <strong>{deleteModal.name}</strong>? Students and classes will be unlinked.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium">Delete</button>
              <button onClick={() => setDeleteModal(null)} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Plus, Trash2, X, Loader2, RefreshCw,
  Edit2, CheckCircle2, TrendingUp, TrendingDown, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import {
  getPlans, getPlan, createPlan, updatePlan, approvePlan, deletePlan,
  createItem, updateItem, deleteItem,
} from '../api/budget';

const STATUS = {
  draft:    { label: 'Draft',    cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
  approved: { label: 'Approved', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  active:   { label: 'Active',   cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  closed:   { label: 'Closed',   cls: 'bg-gray-100 dark:bg-gray-700 text-gray-500' },
};

const PKR = n => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
const pct = (actual, budget) => budget > 0 ? Math.min(100, Math.round((actual / budget) * 100)) : 0;

const CATEGORIES = [
  'Salaries', 'Infrastructure', 'Utilities', 'Stationery', 'Events',
  'Technology', 'Transport', 'Marketing', 'Maintenance', 'Miscellaneous',
];

export default function BudgetPage() {
  const [plans,     setPlans]    = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [selected,  setSelected] = useState(null);  // full plan with items
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Plan form
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({
    title: '', fiscal_year: '', start_date: '', end_date: '', total_budget: '', notes: '',
  });
  const [savingPlan, setSavingPlan] = useState(false);

  // Item form
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItemId, setEditItemId] = useState(null);
  const [itemForm, setItemForm] = useState({
    category: '', subcategory: '', type: 'expense', description: '', budgeted: '', notes: '',
  });
  const [savingItem, setSavingItem] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getPlans();
      setPlans(r.data?.data ?? []);
    } catch { toast.error('Failed to load budgets'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadPlan(id) {
    setLoadingDetail(true);
    try {
      const r = await getPlan(id);
      setSelected(r.data?.data ?? null);
    } catch { toast.error('Failed to load plan details'); }
    finally  { setLoadingDetail(false); }
  }

  async function handleCreatePlan(e) {
    e.preventDefault();
    if (!planForm.title || !planForm.fiscal_year || !planForm.start_date || !planForm.end_date) {
      toast.error('All required fields must be filled'); return;
    }
    setSavingPlan(true);
    try {
      const r = await createPlan({ ...planForm, total_budget: +planForm.total_budget || 0 });
      toast.success('Budget plan created');
      setShowPlanForm(false);
      setPlanForm({ title: '', fiscal_year: '', start_date: '', end_date: '', total_budget: '', notes: '' });
      load();
      loadPlan(r.data.data.id);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingPlan(false); }
  }

  async function handleApprovePlan(id) {
    try {
      await approvePlan(id);
      toast.success('Plan approved');
      load();
      if (selected?.id === id) loadPlan(id);
    } catch { toast.error('Failed'); }
  }

  async function handleSaveItem(e) {
    e.preventDefault();
    if (!itemForm.category || !itemForm.description || itemForm.budgeted === '') {
      toast.error('Category, description and budgeted amount are required'); return;
    }
    setSavingItem(true);
    try {
      if (editItemId) {
        await updateItem(selected.id, editItemId, { ...itemForm, budgeted: +itemForm.budgeted });
      } else {
        await createItem(selected.id, { ...itemForm, budgeted: +itemForm.budgeted });
      }
      toast.success(editItemId ? 'Item updated' : 'Item added');
      setShowItemForm(false);
      setEditItemId(null);
      setItemForm({ category: '', subcategory: '', type: 'expense', description: '', budgeted: '', notes: '' });
      loadPlan(selected.id);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingItem(false); }
  }

  async function handleDeleteItem() {
    try {
      if (deleteModal.type === 'item') await deleteItem(selected.id, deleteModal.id);
      else await deletePlan(deleteModal.id);
      toast.success('Deleted');
      setDeleteModal(null);
      if (deleteModal.type === 'plan') { setSelected(null); load(); }
      else loadPlan(selected.id);
    } catch { toast.error('Failed'); }
  }

  // Group items by type
  const incomeItems  = selected?.items?.filter(i => i.type === 'income') ?? [];
  const expenseItems = selected?.items?.filter(i => i.type === 'expense') ?? [];
  const totalIncomeBudget  = incomeItems.reduce((a, i) => a + +i.budgeted, 0);
  const totalExpenseBudget = expenseItems.reduce((a, i) => a + +i.budgeted, 0);
  const totalIncomeActual  = incomeItems.reduce((a, i) => a + +i.actual, 0);
  const totalExpenseActual = expenseItems.reduce((a, i) => a + +i.actual, 0);

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PieChart className="text-emerald-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Planning</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Annual budget plans, items & actuals tracking</p>
            </div>
          </div>
          <button onClick={() => setShowPlanForm(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          ><Plus size={16} /> New Budget Plan</button>
        </div>

        <div className="flex gap-6">
          {/* Left: Plan List */}
          <div className="w-72 shrink-0 space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Budget Plans</p>
            {loading ? <PageLoader /> : plans.length === 0 ? (
              <p className="text-sm text-gray-500">No plans yet.</p>
            ) : plans.map(p => (
              <button key={p.id} onClick={() => loadPlan(p.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selected?.id === p.id
                    ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{p.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.fiscal_year}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS[p.status]?.cls}`}>
                    {STATUS[p.status]?.label}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Budget: PKR {PKR(p.total_expense_budget || p.total_budget)}
                </div>
              </button>
            ))}
          </div>

          {/* Right: Plan Detail */}
          <div className="flex-1 min-w-0">
            {loadingDetail ? <PageLoader /> : !selected ? (
              <div className="text-center py-20 text-gray-400 dark:text-gray-600">
                <PieChart size={48} className="mx-auto mb-3 opacity-30" />
                <p>Select a budget plan to view details</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Plan Header */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selected.title}</h2>
                      <p className="text-sm text-gray-500">{selected.fiscal_year} · {selected.start_date} to {selected.end_date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selected.status === 'draft' && (
                        <button onClick={() => handleApprovePlan(selected.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
                        ><CheckCircle2 size={12} /> Approve</button>
                      )}
                      <button onClick={() => setDeleteModal({ id: selected.id, type: 'plan' })}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400"
                      ><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {/* Summary Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {[
                      { label: 'Income Budget',  val: totalIncomeBudget,  color: 'text-emerald-600' },
                      { label: 'Income Actual',  val: totalIncomeActual,  color: 'text-emerald-500' },
                      { label: 'Expense Budget', val: totalExpenseBudget, color: 'text-red-600' },
                      { label: 'Expense Actual', val: totalExpenseActual, color: 'text-red-500' },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500">{s.label}</p>
                        <p className={`text-lg font-bold mt-1 ${s.color}`}>PKR {PKR(s.val)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Item Button */}
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Budget Items</p>
                  <button onClick={() => { setShowItemForm(true); setEditItemId(null); setItemForm({ category: '', subcategory: '', type: 'expense', description: '', budgeted: '', notes: '' }); }}
                    className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  ><Plus size={14} /> Add Item</button>
                </div>

                {/* Income Items */}
                {incomeItems.length > 0 && (
                  <ItemTable title="Income" items={incomeItems} color="emerald"
                    onEdit={item => { setItemForm({ ...item, budgeted: item.budgeted }); setEditItemId(item.id); setShowItemForm(true); }}
                    onDelete={item => setDeleteModal({ id: item.id, type: 'item' })}
                  />
                )}

                {/* Expense Items */}
                {expenseItems.length > 0 && (
                  <ItemTable title="Expenses" items={expenseItems} color="red"
                    onEdit={item => { setItemForm({ ...item, budgeted: item.budgeted }); setEditItemId(item.id); setShowItemForm(true); }}
                    onDelete={item => setDeleteModal({ id: item.id, type: 'item' })}
                  />
                )}

                {selected.items?.length === 0 && (
                  <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm">
                    No budget items yet. Add income and expense items above.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Plan Modal */}
      {showPlanForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900 dark:text-white">New Budget Plan</h2>
              <button onClick={() => setShowPlanForm(false)}><X size={18} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreatePlan} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title *</label>
                <input value={planForm.title} onChange={e => setPlanForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Annual Budget 2025-26"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fiscal Year *</label>
                <input value={planForm.fiscal_year} onChange={e => setPlanForm(f => ({ ...f, fiscal_year: e.target.value }))}
                  placeholder="e.g. 2025-2026"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start Date *</label>
                  <input type="date" value={planForm.start_date} onChange={e => setPlanForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">End Date *</label>
                  <input type="date" value={planForm.end_date} onChange={e => setPlanForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Budget (PKR)</label>
                <input type="number" value={planForm.total_budget} onChange={e => setPlanForm(f => ({ ...f, total_budget: e.target.value }))}
                  placeholder="Optional overall budget cap"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={savingPlan}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {savingPlan ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Create Plan
                </button>
                <button type="button" onClick={() => setShowPlanForm(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300"
                >Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Form Modal */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900 dark:text-white">{editItemId ? 'Edit' : 'Add'} Budget Item</h2>
              <button onClick={() => { setShowItemForm(false); setEditItemId(null); }}><X size={18} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                  <select value={itemForm.type} onChange={e => setItemForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category *</label>
                  <select value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Select...</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description *</label>
                <input value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Teacher salaries for Q1"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Budgeted Amount (PKR) *</label>
                <input type="number" value={itemForm.budgeted} onChange={e => setItemForm(f => ({ ...f, budgeted: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  required
                />
              </div>
              {editItemId && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Actual Amount (PKR)</label>
                  <input type="number" value={itemForm.actual || ''} onChange={e => setItemForm(f => ({ ...f, actual: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={savingItem}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {savingItem ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Save
                </button>
                <button type="button" onClick={() => { setShowItemForm(false); setEditItemId(null); }}
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
            <h2 className="font-semibold text-gray-900 dark:text-white">Delete?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={handleDeleteItem} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium">Delete</button>
              <button onClick={() => setDeleteModal(null)} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function ItemTable({ title, items, color, onEdit, onDelete }) {
  const total = items.reduce((a, i) => a + +i.budgeted, 0);
  const actualTotal = items.reduce((a, i) => a + +i.actual, 0);
  const PKR = n => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-${color}-50 dark:bg-${color}-900/10`}>
        <p className={`text-sm font-semibold text-${color}-700 dark:text-${color}-400`}>{title}</p>
        <p className="text-xs text-gray-500">
          Budget: PKR {PKR(total)} · Actual: PKR {PKR(actualTotal)}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400 text-xs">Category</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400 text-xs">Description</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-gray-400 text-xs">Budgeted</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-gray-400 text-xs">Actual</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-gray-400 text-xs">%</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map(item => {
              const p = +item.budgeted > 0 ? Math.round((+item.actual / +item.budgeted) * 100) : 0;
              return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{item.category}</td>
                  <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{item.description}</td>
                  <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">PKR {PKR(item.budgeted)}</td>
                  <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">PKR {PKR(item.actual)}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`text-xs font-semibold ${p > 100 ? 'text-red-600' : p > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {p}%
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => onEdit(item)} className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"><Edit2 size={12} /></button>
                      <button onClick={() => onDelete(item)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

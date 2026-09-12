import { useEffect, useState, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import toast from 'react-hot-toast';
import { downloadBlob } from '../utils';
import {
  Package, Plus, Pencil, Trash2, Search, X, AlertTriangle,
  BoxSelect, Wrench, FlaskConical, Printer, BookOpen, Dumbbell,
  Monitor, MoreHorizontal, TrendingDown, AlertCircle, BarChart3,
  Upload, Download,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import {
  getInventoryItems, getInventorySummary, getLowStockItems,
  createInventoryItem, updateInventoryItem, deleteInventoryItem,
  getInventoryImportTemplate, importInventory, exportInventory,
} from '../api/inventory';
import ImportModal      from '../components/ui/ImportModal';
import { INPUT_CLS }   from '../components/ui/Input';

const CATEGORIES = [
  { value: 'furniture',   label: 'Furniture',     icon: BoxSelect },
  { value: 'lab',         label: 'Lab Equipment', icon: FlaskConical },
  { value: 'stationery',  label: 'Stationery',    icon: BookOpen },
  { value: 'sports',      label: 'Sports',        icon: Dumbbell },
  { value: 'electronics', label: 'Electronics',   icon: Monitor },
  { value: 'printing',    label: 'Printing',      icon: Printer },
  { value: 'tools',       label: 'Tools',         icon: Wrench },
  { value: 'other',       label: 'Other',         icon: MoreHorizontal },
];

const CONDITIONS = [
  { value: 'good',    label: 'Good' },
  { value: 'fair',    label: 'Fair' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'lost',    label: 'Lost' },
];

const COND_STYLE = {
  good:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40',
  fair:    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40',
  damaged: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/40',
  lost:    'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40',
};

const fmt      = (n) => parseFloat(n || 0).toLocaleString('en-PK');
const fmtPrice = (n) => parseFloat(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 });

const EMPTY = {
  name: '', category: 'other', quantity: '', unit: 'pcs',
  condition: 'good', location: '', purchase_date: '',
  purchase_price: '', supplier: '', notes: '',
};

const inputCls = INPUT_CLS;
const labelCls = 'block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide';

function ItemModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState(item ? {
    name: item.name, category: item.category, quantity: item.quantity,
    unit: item.unit, condition: item.condition, location: item.location || '',
    purchase_date: item.purchase_date ? item.purchase_date.slice(0, 10) : '',
    purchase_price: item.purchase_price || '', supplier: item.supplier || '',
    notes: item.notes || '',
  } : { ...EMPTY });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Item name is required');
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity:       parseInt(form.quantity)          || 0,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        purchase_date:  form.purchase_date  || null,
        location:       form.location       || null,
        supplier:       form.supplier       || null,
        notes:          form.notes          || null,
      };
      if (item) { await updateInventoryItem(item.id, payload); toast.success('Item updated'); }
      else      { await createInventoryItem(payload);          toast.success('Item added');   }
      onSaved();
    } catch { toast.error('Failed to save item'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><Package size={18} className="text-white" /></div>
            <div>
              <h2 className="text-base font-bold text-white">{item ? 'Edit Item' : 'Add Inventory Item'}</h2>
              <p className="text-white/70 text-xs mt-0.5">{item ? 'Update item details' : 'Add a new asset or stock item'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="overflow-y-auto flex-1">
          <div className="p-6 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Item Name <span className="text-red-400">*</span></label>
              <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Plastic Chair" />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Condition</label>
              <select className={inputCls} value={form.condition} onChange={e => set('condition', e.target.value)}>
                {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Quantity</label>
              <input type="number" min="0" className={inputCls} value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Unit</label>
              <select className={inputCls} value={form.unit} onChange={e => set('unit', e.target.value)}>
                {['pcs','sets','boxes','reams','pairs','kg','liters','rolls','other'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Location / Room</label>
              <input className={inputCls} value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Staff Room, Lab 2, Store Room" />
            </div>
            <div>
              <label className={labelCls}>Purchase Date</label>
              <input type="date" className={inputCls} value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Purchase Price (Rs)</label>
              <input type="number" min="0" className={inputCls} value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} placeholder="0" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Supplier / Vendor</label>
              <input className={inputCls} value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Supplier name" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea rows={2} className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional info..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {item ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SumCard({ label, value, icon: Icon, gradient, textColor, onClick, clickable }) {
  return (
    <div onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 flex items-center gap-3 ${clickable ? 'cursor-pointer hover:border-orange-300 dark:hover:border-orange-600 transition-colors' : ''}`}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: gradient }}>
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <p className={"text-lg font-extrabold " + textColor}>{value}</p>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [items,       setItems]      = useState([]);
  const [summary,     setSummary]    = useState(null);
  const [lowStock,    setLowStock]   = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [search,      setSearch]     = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterCat,   setFilterCat]  = useState('');
  const [filterCond,  setFilterCond] = useState('');
  const [showLowOnly, setShowLowOnly]= useState(false);
  const [modal,       setModal]      = useState(null);
  const [deleting,    setDeleting]   = useState(null);
  const [showImport,  setShowImport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, sumRes, lowRes] = await Promise.all([
        getInventoryItems({ category: filterCat || undefined, condition: filterCond || undefined, search: debouncedSearch || undefined }),
        getInventorySummary(),
        getLowStockItems(),
      ]);
      const d = itemsRes.data?.data ?? itemsRes.data;
      setItems(Array.isArray(d) ? d : []);
      setSummary(sumRes.data?.data ?? sumRes.data);
      setLowStock(Array.isArray(lowRes.data?.data) ? lowRes.data.data : (lowRes.data?.data ?? []));
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  }, [filterCat, filterCond, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try {
      await deleteInventoryItem(id);
      toast.success('Item deleted');
      setDeleting(null);
      load();
    } catch { toast.error('Failed to delete item'); }
  };

  const getCatLabel = (cat) => CATEGORIES.find(c => c.value === cat)?.label || cat;
  const getCatIcon  = (cat) => {
    const Icon = CATEGORIES.find(c => c.value === cat)?.icon || Package;
    return <Icon size={13} />;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        <div className="sticky top-14 lg:top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">
            <div>
              <h1 className="text-sm font-bold text-slate-800 dark:text-white">Inventory</h1>
              <p className="text-xs text-slate-400 hidden sm:block">School assets and stock management</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Upload size={14} /> Import
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await exportInventory({ format: 'xlsx' });
                    downloadBlob(res.data, 'inventory.xlsx');
                  } catch { toast.error('Export failed'); }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Download size={14} /> Export
              </button>
              <Button onClick={() => setModal('add')} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <Plus size={14} /> Add Item
              </Button>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5 max-w-7xl mx-auto">

          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              <SumCard label="Total Items"  value={fmt(summary.total_items)}              icon={Package}       gradient="linear-gradient(135deg,#6366f1,#8b5cf6)" textColor="text-violet-600 dark:text-violet-400" />
              <SumCard label="Total Units"  value={fmt(summary.total_units)}              icon={BarChart3}     gradient="linear-gradient(135deg,#3b82f6,#6366f1)" textColor="text-blue-600 dark:text-blue-400" />
              <SumCard label="Total Value"  value={"Rs " + fmtPrice(summary.total_value)} icon={TrendingDown}  gradient="linear-gradient(135deg,#10b981,#0d9488)"  textColor="text-emerald-600 dark:text-emerald-400" />
              <SumCard label="Out of Stock" value={fmt(summary.out_of_stock)}             icon={AlertCircle}   gradient="linear-gradient(135deg,#f59e0b,#d97706)"  textColor="text-amber-600 dark:text-amber-400" />
              <SumCard label="Low Stock"    value={fmt(summary.low_stock_count)}          icon={TrendingDown}  gradient="linear-gradient(135deg,#f97316,#ea580c)"  textColor="text-orange-600 dark:text-orange-400"
                onClick={() => setShowLowOnly(v => !v)} clickable />
              <SumCard label="Damaged"      value={fmt(summary.damaged_count)}            icon={Wrench}        gradient="linear-gradient(135deg,#fb923c,#dc2626)"  textColor="text-orange-600 dark:text-orange-400" />
              <SumCard label="Lost"         value={fmt(summary.lost_count)}               icon={AlertTriangle} gradient="linear-gradient(135deg,#ef4444,#dc2626)"  textColor="text-red-600 dark:text-red-400" />
            </div>
          )}

          {/* ── Low-stock warning banner ── */}
          {lowStock.length > 0 && (
            <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${showLowOnly ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'}`}
              onClick={() => setShowLowOnly(v => !v)}>
              <AlertTriangle size={16} className="text-orange-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                  {lowStock.length} item{lowStock.length > 1 ? 's are' : ' is'} running low on stock
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 truncate">
                  {lowStock.map(i => i.name).join(' · ')}
                </p>
              </div>
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 shrink-0">
                {showLowOnly ? 'Show all' : 'View low stock →'}
              </span>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-48 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none"
                placeholder="Search items, supplier, location..."
                value={search} onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')}><X size={13} className="text-slate-400 hover:text-slate-600" /></button>
              )}
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={filterCond} onChange={e => setFilterCond(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
              <option value="">All Conditions</option>
              {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {loading ? (
              <PageLoader />
            ) : (showLowOnly ? lowStock : items).length === 0 ? (
              <EmptyState
                icon={Package}
                title="No inventory items"
                description={search || filterCat || filterCond ? 'Try adjusting your filters.' : 'Add your first asset or stock item.'}
              />
            ) : (
              <div className="overflow-x-auto">
                {showLowOnly && (
                  <div className="px-5 py-2 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800 text-xs font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2">
                    <AlertTriangle size={12} /> Showing {lowStock.length} low-stock item{lowStock.length !== 1 ? 's' : ''} only
                    <button onClick={() => setShowLowOnly(false)} className="ml-auto underline">Show all</button>
                  </div>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                      {['Item', 'Category', 'Qty', 'Condition', 'Location', 'Price', 'Supplier', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.08em] whitespace-nowrap first:pl-5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {(showLowOnly ? lowStock : items).map(item => (
                      <tr key={item.id} className="group hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 pl-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white"
                              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                              {getCatIcon(item.category)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-40">{item.name}</p>
                              {item.notes && <p className="text-[10px] text-slate-400 truncate max-w-40">{item.notes}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {getCatIcon(item.category)} {getCatLabel(item.category)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={"font-bold text-sm " + (item.quantity === 0 ? 'text-red-500' : item.min_quantity > 0 && item.quantity <= item.min_quantity ? 'text-orange-500' : 'text-slate-800 dark:text-slate-200')}>
                              {item.quantity}
                            </span>
                            {item.min_quantity > 0 && item.quantity <= item.min_quantity && item.quantity > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 uppercase tracking-wide">LOW</span>
                            )}
                          </div>
                          <span className="ml-1 text-xs text-slate-400">{item.unit}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={"text-xs px-2 py-0.5 rounded-full border font-medium capitalize " + (COND_STYLE[item.condition] || '')}>
                            {item.condition}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{item.location || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {item.purchase_price ? "Rs " + fmtPrice(item.purchase_price) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{item.supplier || '—'}</td>
                        <td className="px-4 py-3 pr-5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setModal(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors">
                              <Pencil size={13} />
                            </button>
                            {deleting === item.id ? (
                              <div className="flex gap-1">
                                <button onClick={() => handleDelete(item.id)} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-red-600 text-white">Yes</button>
                                <button onClick={() => setDeleting(null)} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">No</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleting(item.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <ItemModal
          item={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}

      <ImportModal
        isOpen={showImport}
        onClose={() => { setShowImport(false); load(); }}
        title="Import Inventory"
        templateFn={getInventoryImportTemplate}
        importFn={importInventory}
        templateName="inventory_template.csv"
        description="Upload a CSV with columns: name, category, quantity, unit, condition, location, purchase_date, purchase_price, supplier, notes"
      />
    </Layout>
  );
}

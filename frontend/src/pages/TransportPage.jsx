import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  Bus, MapPin, Users, PlusCircle, Pencil, Trash2,
  Search, RefreshCw, X, ChevronDown, Navigation,
  Phone, UserCheck, AlertCircle, CheckCircle2,
  Wrench, BarChart3, Route, ArrowRightLeft, Download,
  IdCard, ShieldCheck, User, ChevronLeft, ChevronRight,
  FileText, Car,
} from 'lucide-react';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import {
  getTransportSummary, getStudentsWithoutTransport,
  getBuses, createBus, updateBus, deleteBus,
  getDrivers, createDriver, updateDriver, deleteDriver,
  getRoutes, createRoute, updateRoute, deleteRoute,
  getStops, addStop, deleteStop,
  getAssignments, createAssignment, deleteAssignment,
  transferStudent, downloadTransportSlip,
} from '../api/transport';

// ─── Palette helpers ──────────────────────────────────────────────────────────
const STATUS_BUS = {
  active:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  inactive:    'bg-slate-100   text-slate-600   dark:bg-slate-700      dark:text-slate-400',
  maintenance: 'bg-amber-100   text-amber-700   dark:bg-amber-900/30   dark:text-amber-400',
};
const STATUS_ASSIGN = {
  active:    'bg-emerald-100 text-emerald-700',
  inactive:  'bg-slate-100   text-slate-600',
  suspended: 'bg-red-100     text-red-700',
};
const VEHICLE_TYPES = ['bus','van','coaster','mini_bus','car'];
const DRIVER_STATUS = ['active','inactive','suspended'];

const TABS = [
  { id: 'overview',    label: 'Overview',      icon: BarChart3  },
  { id: 'vehicles',    label: 'Vehicles',      icon: Bus        },
  { id: 'drivers',     label: 'Drivers',       icon: User       },
  { id: 'routes',      label: 'Routes',        icon: Route      },
  { id: 'assignments', label: 'Assignments',   icon: UserCheck  },
  { id: 'tracking',   label: 'Live Tracking',  icon: Navigation },
];

// ─── Shared micro-components ─────────────────────────────────────────────────
function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '', required, options, rows }) {
  const cls = 'w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-400 focus:border-transparent';
  const lbl = (
    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
  if (options) return (
    <div>
      {lbl}
      <div className="relative">
        <select value={value} onChange={onChange} required={required} className={cls + ' appearance-none pr-8'}>
          {options.map(o => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
  if (rows) return (
    <div>
      {lbl}
      <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder}
        className={cls + ' resize-none'} />
    </div>
  );
  return (
    <div>
      {lbl}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className={cls} />
    </div>
  );
}

function Modal({ title, onClose, children, size = 'lg' }) {
  const maxW = size === 'xl' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${maxW} max-h-[92vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDelete({ title, detail, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{detail}</p>
        <div className="flex gap-3">
          <button onClick={onClose}   className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );
}

function OccupancyBar({ bus_number, driver_name, route_name, assigned_students, capacity, occupancy_pct, bus_status }) {
  const pct   = Number(occupancy_pct) || 0;
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${STATUS_BUS[bus_status]}`}>
        <Bus size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">{bus_number}</span>
            {route_name && <span className="text-xs text-slate-400 truncate hidden sm:inline">{route_name}</span>}
          </div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0 ml-2">
            {assigned_students}/{capacity}
          </span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
        </div>
        {driver_name && <p className="text-[11px] text-slate-400 mt-0.5">{driver_name} · {pct}% full</p>}
      </div>
    </div>
  );
}

// ─── Vehicle Modal ────────────────────────────────────────────────────────────
function VehicleModal({ bus, drivers, onSave, onClose }) {
  const isEdit = Boolean(bus?.id);
  const [form, setForm] = useState({
    bus_number:       bus?.bus_number       ?? '',
    vehicle_number:   bus?.vehicle_number   ?? '',
    capacity:         bus?.capacity         ?? '',
    make_model:       bus?.make_model       ?? '',
    manufacture_year: bus?.manufacture_year ?? '',
    vehicle_type:     bus?.vehicle_type     ?? 'bus',
    driver_id:        bus?.driver_id        ?? '',
    status:           bus?.status           ?? 'active',
    notes:            bus?.notes            ?? '',
  });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally { setSaving(false); }
  };

  const driverOptions = [
    { value: '', label: '— No driver assigned —' },
    ...drivers.map(d => ({ value: d.id, label: `${d.full_name} (${d.phone})` })),
  ];

  return (
    <Modal title={isEdit ? 'Edit Vehicle' : 'Add Vehicle'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vehicle No." value={form.bus_number} onChange={set('bus_number')} placeholder="Bus-01" required />
          <Field label="Reg. Plate" value={form.vehicle_number} onChange={set('vehicle_number')} placeholder="LEA-1234" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" value={form.vehicle_type} onChange={set('vehicle_type')} options={VEHICLE_TYPES.map(v => ({ value: v, label: v.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase()) }))} />
          <Field label="Capacity" type="number" value={form.capacity} onChange={set('capacity')} placeholder="35" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Make / Model" value={form.make_model} onChange={set('make_model')} placeholder="Toyota Coaster" />
          <Field label="Year" type="number" value={form.manufacture_year} onChange={set('manufacture_year')} placeholder="2020" />
        </div>
        <Field label="Assign Driver" value={form.driver_id} onChange={set('driver_id')} options={driverOptions} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" value={form.status} onChange={set('status')} options={['active','inactive','maintenance'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} />
        </div>
        <Field label="Notes" value={form.notes} onChange={set('notes')} rows={2} placeholder="Optional…" />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? <RefreshCw size={14} className="animate-spin mx-auto" /> : (isEdit ? 'Save Changes' : 'Add Vehicle')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Driver Modal ─────────────────────────────────────────────────────────────
function DriverModal({ driver, onSave, onClose }) {
  const isEdit = Boolean(driver?.id);
  const [form, setForm] = useState({
    full_name:       driver?.full_name       ?? '',
    cnic:            driver?.cnic            ?? '',
    license_number:  driver?.license_number  ?? '',
    license_expiry:  driver?.license_expiry  ? driver.license_expiry.slice(0, 10) : '',
    phone:           driver?.phone           ?? '',
    emergency_phone: driver?.emergency_phone ?? '',
    address:         driver?.address         ?? '',
    date_of_birth:   driver?.date_of_birth   ? driver.date_of_birth.slice(0, 10) : '',
    status:          driver?.status          ?? 'active',
    notes:           driver?.notes           ?? '',
  });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const [saving, setSaving]     = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(driver?.photo_url ?? null);
  const fileRef = useRef();

  const handlePhotoChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG or WebP images allowed'); return;
    }
    if (file.size > 3 * 1024 * 1024) { toast.error('Image must be under 3 MB'); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      // Build FormData so photo is included in the multipart request
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      if (photoFile) fd.append('photo', photoFile);
      await onSave(fd);
    } finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? 'Edit Driver' : 'Add Driver'} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Photo */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
            {photoPreview
              ? <img src={photoPreview} alt="driver" className="w-full h-full object-cover" />
              : <User size={24} className="text-slate-400" />}
          </div>
          <div>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
              {photoPreview ? 'Change Photo' : 'Upload Photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange} className="hidden" />
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP · max 3 MB</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Full Name" value={form.full_name} onChange={set('full_name')} placeholder="Muhammad Arif" required />
          </div>
          <Field label="Phone" value={form.phone} onChange={set('phone')} placeholder="0300-1234567" required />
          <Field label="Emergency Phone" value={form.emergency_phone} onChange={set('emergency_phone')} placeholder="0300-0000000" />
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Identity Documents</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CNIC" value={form.cnic} onChange={set('cnic')} placeholder="35202-1234567-1" />
            <Field label="Date of Birth" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
            <Field label="Driving License No." value={form.license_number} onChange={set('license_number')} placeholder="LHR-1234567" />
            <Field label="License Expiry" type="date" value={form.license_expiry} onChange={set('license_expiry')} />
          </div>
        </div>

        <Field label="Address" value={form.address} onChange={set('address')} rows={2} placeholder="Full residential address…" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" value={form.status} onChange={set('status')} options={DRIVER_STATUS.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} />
        </div>
        <Field label="Notes" value={form.notes} onChange={set('notes')} rows={2} placeholder="Optional…" />

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? <RefreshCw size={14} className="animate-spin mx-auto" /> : (isEdit ? 'Save Changes' : 'Add Driver')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Assignment Modal ─────────────────────────────────────────────────────────
function AssignModal({ buses, routes, unassigned, onSave, onClose, academicYear }) {
  const [form, setForm] = useState({
    student_id: '', route_id: '', bus_id: '', stop_id: '',
    transport_type: 'both', monthly_fee: '', academic_year: academicYear || '2024-25',
  });
  const [stops, setStops] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (!form.route_id) { setStops([]); return; }
    getStops(form.route_id)
      .then(r => { const d = r.data; setStops(Array.isArray(d) ? d : (d?.data ?? [])); })
      .catch(() => {});
  }, [form.route_id]);

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const activeBuses = buses.filter(b => b.status === 'active');

  return (
    <Modal title="Assign Student to Transport" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Field label="Student" value={form.student_id} onChange={set('student_id')} required
          options={[
            { value: '', label: '— Select student —' },
            ...unassigned.map(s => ({ value: s.id, label: `${s.student_name} (${s.roll_number || 'No roll'}) — ${s.class_section || ''}` })),
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Route" value={form.route_id} onChange={set('route_id')} required
            options={[
              { value: '', label: '— Select route —' },
              ...routes.map(r => ({ value: r.id, label: r.route_name })),
            ]}
          />
          <Field label="Vehicle" value={form.bus_id} onChange={set('bus_id')} required
            options={[
              { value: '', label: '— Select vehicle —' },
              ...activeBuses.map(b => ({ value: b.id, label: `${b.bus_number} (${b.assigned_students}/${b.capacity} seats)` })),
            ]}
          />
        </div>
        {stops.length > 0 && (
          <Field label="Pickup / Drop Stop" value={form.stop_id} onChange={set('stop_id')}
            options={[
              { value: '', label: '— Select stop (optional) —' },
              ...stops.map(s => ({ value: s.id, label: `${s.stop_name}${s.pickup_time ? ` (${s.pickup_time})` : ''}` })),
            ]}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Transport Type" value={form.transport_type} onChange={set('transport_type')}
            options={[
              { value: 'both',    label: 'Both (Pickup & Drop)' },
              { value: 'pickup',  label: 'Pickup Only' },
              { value: 'dropoff', label: 'Drop Only' },
            ]}
          />
          <Field label="Monthly Fee (PKR)" type="number" value={form.monthly_fee} onChange={set('monthly_fee')} placeholder="1500" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? <RefreshCw size={14} className="animate-spin mx-auto" /> : 'Assign'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Transfer Modal ───────────────────────────────────────────────────────────
function TransferModal({ assignment, buses, routes, onSave, onClose }) {
  const [form, setForm] = useState({
    to_bus_id: '', to_route_id: '', to_stop_id: '', transfer_reason: '',
  });
  const [stops, setStops] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (!form.to_route_id) { setStops([]); return; }
    getStops(form.to_route_id).then(r => { const d = r.data; setStops(Array.isArray(d) ? d : (d?.data ?? [])); }).catch(() => {});
  }, [form.to_route_id]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.to_bus_id || !form.to_route_id) {
      toast.error('Select both a new vehicle and route');
      return;
    }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const activeBuses = buses.filter(b => b.status === 'active' && String(b.id) !== String(assignment.bus_id));

  return (
    <Modal title="Transfer Student" onClose={onClose}>
      <div className="px-6 pt-4 pb-2">
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
          <p className="font-semibold text-amber-800 dark:text-amber-300">{assignment.student_name}</p>
          <p className="text-amber-600 dark:text-amber-400 text-xs mt-0.5">
            Currently on <strong>{assignment.bus_number}</strong> · {assignment.route_name}
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="New Vehicle" value={form.to_bus_id} onChange={set('to_bus_id')} required
            options={[
              { value: '', label: '— Select vehicle —' },
              ...activeBuses.map(b => ({ value: b.id, label: `${b.bus_number} (${b.assigned_students}/${b.capacity})` })),
            ]}
          />
          <Field label="New Route" value={form.to_route_id} onChange={set('to_route_id')} required
            options={[
              { value: '', label: '— Select route —' },
              ...routes.map(r => ({ value: r.id, label: r.route_name })),
            ]}
          />
        </div>
        {stops.length > 0 && (
          <Field label="New Stop" value={form.to_stop_id} onChange={set('to_stop_id')}
            options={[
              { value: '', label: '— Select stop —' },
              ...stops.map(s => ({ value: s.id, label: s.stop_name })),
            ]}
          />
        )}
        <Field label="Reason for Transfer" value={form.transfer_reason} onChange={set('transfer_reason')}
          rows={2} placeholder="e.g. Changed home address, route conflict…" />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? <RefreshCw size={14} className="animate-spin mx-auto" /> : 'Transfer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Route Modal ──────────────────────────────────────────────────────────────
function RouteModal({ route, onSave, onClose }) {
  const isEdit = Boolean(route?.id);
  const [form, setForm] = useState({
    route_name:     route?.route_name     ?? '',
    start_point:    route?.start_point    ?? '',
    end_point:      route?.end_point      ?? '',
    description:    route?.description    ?? '',
    estimated_time: route?.estimated_time ?? '',
    distance_km:    route?.distance_km    ?? '',
    is_active:      route?.is_active      ?? true,
  });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? 'Edit Route' : 'Add Route'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Field label="Route Name" value={form.route_name} onChange={set('route_name')} placeholder="City Centre → School" required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Point" value={form.start_point} onChange={set('start_point')} placeholder="Main Chowk" required />
          <Field label="End Point" value={form.end_point} onChange={set('end_point')} placeholder="School Gate" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Distance (km)" type="number" value={form.distance_km} onChange={set('distance_km')} placeholder="12.5" />
          <Field label="Est. Time (min)" type="number" value={form.estimated_time} onChange={set('estimated_time')} placeholder="30" />
        </div>
        <Field label="Description" value={form.description} onChange={set('description')} rows={2} placeholder="Via Gulberg, Model Town…" />
        {isEdit && (
          <Field label="Status" value={form.is_active ? 'true' : 'false'}
            onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'true' }))}
            options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
        )}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? <RefreshCw size={14} className="animate-spin mx-auto" /> : (isEdit ? 'Save Changes' : 'Add Route')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  LIVE TRACKING TAB
// ═════════════════════════════════════════════════════════════════════════════
function LiveTrackingTab({ buses, routes }) {
  const [selectedRoute, setSelectedRoute] = useState('');
  const [stops, setStops] = useState([]);

  const route = routes.find(r => String(r.id) === selectedRoute);

  useEffect(() => {
    if (!selectedRoute) { setStops([]); return; }
    getStops(selectedRoute)
      .then(r => { const d = r.data; setStops(Array.isArray(d) ? d : (d?.data ?? [])); })
      .catch(() => setStops([]));
  }, [selectedRoute]);

  const activeBuses = selectedRoute
    ? buses.filter(b => String(b.route_id) === selectedRoute)
    : buses.filter(b => b.bus_status === 'active');

  return (
    <div className="space-y-4">
      {/* GPS notice banner */}
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4">
        <AlertCircle size={17} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">GPS Hardware Not Connected</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
            Real-time vehicle tracking requires GPS tracker units installed in each vehicle. Contact your hardware vendor to activate live location streaming. Route stops and vehicle info are shown below.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: route selector + stops */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Select Route</label>
            <div className="relative">
              <select value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">— All Active Buses —</option>
                {routes.map(r => (
                  <option key={r.id} value={r.id}>{r.route_name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {route && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Route Stops</p>
              {stops.length > 0 ? (
                <div className="space-y-0">
                  {stops.map((stop, i) => (
                    <div key={stop.id ?? i} className="flex items-start gap-2.5">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full border-2 border-indigo-500 bg-white dark:bg-slate-800 shrink-0 mt-1" />
                        {i < stops.length - 1 && <div className="w-0.5 h-8 bg-indigo-200 dark:bg-indigo-800" />}
                      </div>
                      <div className="pb-2">
                        <p className="text-sm font-medium text-slate-800 dark:text-white">{stop.stop_name}</p>
                        {stop.pickup_time && <p className="text-xs text-slate-400">{stop.pickup_time}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No stops added yet. Use Routes tab to add stops.</p>
              )}
              {(route.distance_km || route.estimated_time) && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex gap-4 text-xs text-slate-500">
                  {route.distance_km && <span>{route.distance_km} km</span>}
                  {route.estimated_time && <span>~{route.estimated_time} min</span>}
                </div>
              )}
            </div>
          )}

          {!route && (
            <p className="text-xs text-slate-400 italic">Select a route to view its stops.</p>
          )}
        </div>

        {/* Right: map placeholder + bus cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Static map placeholder */}
          <div className="bg-slate-100 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 overflow-hidden" style={{ height: 260 }}>
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Grid lines to simulate a map */}
              <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
              {/* Simulated road lines */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <line x1="0" y1="130" x2="100%" y2="130" stroke="#94a3b8" strokeWidth="4" strokeDasharray="0" opacity="0.5" />
                <line x1="200" y1="0" x2="200" y2="100%" stroke="#94a3b8" strokeWidth="4" opacity="0.4" />
                <line x1="500" y1="0" x2="500" y2="100%" stroke="#94a3b8" strokeWidth="3" opacity="0.3" />
                <line x1="0" y1="60" x2="100%" y2="60" stroke="#94a3b8" strokeWidth="2" opacity="0.25" />
                <line x1="0" y1="200" x2="100%" y2="200" stroke="#94a3b8" strokeWidth="2" opacity="0.25" />
              </svg>
              <div className="relative z-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center mx-auto mb-2">
                  <MapPin size={26} className="text-indigo-500" />
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Live Map — GPS Pending</p>
                <p className="text-xs text-slate-400 mt-0.5">Install GPS tracker units to see real-time locations</p>
              </div>
              {/* Simulated bus icon */}
              <div className="absolute top-8 left-1/3 w-8 h-8 rounded-full bg-indigo-600 border-2 border-white shadow flex items-center justify-center opacity-60">
                <Bus size={14} className="text-white" />
              </div>
              <div className="absolute bottom-10 right-1/4 w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow flex items-center justify-center opacity-60">
                <Bus size={14} className="text-white" />
              </div>
            </div>
          </div>

          {/* Bus cards */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {selectedRoute ? 'Buses on this Route' : 'Active Vehicles'} ({activeBuses.length})
            </p>
            {activeBuses.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center text-sm text-slate-400">
                No active vehicles found
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeBuses.map(b => (
                  <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                      <Bus size={18} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-white text-sm">{b.bus_number}</p>
                      <p className="text-xs text-slate-400 capitalize">{(b.vehicle_type || 'bus').replace('_', ' ')} · Cap. {b.capacity ?? '—'}</p>
                      {b.driver_full_name && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{b.driver_full_name}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge className={STATUS_BUS[b.bus_status] || STATUS_BUS.inactive}>
                        {b.bus_status}
                      </Badge>
                      <span className="text-xs text-slate-400 flex items-center gap-0.5">
                        <MapPin size={10} />
                        No signal
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function TransportPage() {
  const [tab,      setTab]      = useState('overview');
  const [summary,  setSummary]  = useState(null);
  const [buses,    setBuses]    = useState([]);
  const [drivers,  setDrivers]  = useState([]);
  const [routes,   setRoutes]   = useState([]);
  const [assigns,  setAssigns]  = useState([]);
  const [unassigned, setUnassigned] = useState([]);

  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  // Modals
  const [busModal,     setBusModal]     = useState(null); // null | 'new' | bus-obj
  const [driverModal,  setDriverModal]  = useState(null);
  const [routeModal,   setRouteModal]   = useState(null); // null | 'new' | route-obj
  const [assignModal,  setAssignModal]  = useState(false);
  const [transferModal,setTransferModal]= useState(null); // assignment obj
  const [delConfirm,   setDelConfirm]   = useState(null); // { type, id, name }
  const [pdfLoading,   setPdfLoading]   = useState(null); // assignment id

  // Academic year — users can change this without reloading the whole page
  const currentYear = new Date().getFullYear();
  const YEAR_OPTIONS = [`${currentYear-1}-${String(currentYear).slice(2)}`, `${currentYear}-${String(currentYear+1).slice(2)}`];
  const [academicYear, setAcademicYear] = useState('2024-25');

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    const [sumR, busR, drvR, rteR, asnR, unaR] = await Promise.allSettled([
      getTransportSummary({ academic_year: academicYear }),
      getBuses(),
      getDrivers(),
      getRoutes(),
      getAssignments({ status: 'active', academic_year: academicYear }),
      getStudentsWithoutTransport({ academic_year: academicYear }),
    ]);
    // Axios interceptor unwraps { success, data: [...] } → response.data IS the array.
    // For non-array responses (summary object) it stays wrapped — check both patterns.
    const val = r => {
      if (r.status !== 'fulfilled') return null;
      const d = r.value?.data;
      return Array.isArray(d) ? d : (d?.data ?? null);
    };
    if (val(sumR) !== null) setSummary(val(sumR));
    setBuses(val(busR) ?? []);
    setDrivers(val(drvR) ?? []);
    setRoutes(val(rteR) ?? []);
    setAssigns(val(asnR) ?? []);
    setUnassigned(val(unaR) ?? []);
    const failed = [sumR,busR,drvR,rteR,asnR,unaR].filter(r => r.status === 'rejected');
    if (failed.length) {
      console.error('Transport load errors:', failed.map(r => r.reason?.response?.data?.message || r.reason?.message));
      toast.error('Some transport data failed to load');
    }
    setLoading(false);
  }, [academicYear]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Vehicle CRUD ──────────────────────────────────────────────────────────
  const handleSaveBus = async form => {
    try {
      if (busModal?.id) {
        await updateBus(busModal.id, form);
        toast.success('Vehicle updated');
      } else {
        await createBus(form);
        toast.success('Vehicle added');
      }
      setBusModal(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDeleteBus = async id => {
    try {
      await deleteBus(id);
      toast.success('Vehicle deleted');
      setDelConfirm(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // ── Driver CRUD ───────────────────────────────────────────────────────────
  const handleSaveDriver = async formData => {
    // formData is a FormData instance (supports photo upload)
    try {
      if (driverModal?.id) {
        await updateDriver(driverModal.id, formData);
        toast.success('Driver updated');
      } else {
        await createDriver(formData);
        toast.success('Driver added');
      }
      setDriverModal(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDeleteDriver = async id => {
    try {
      await deleteDriver(id);
      toast.success('Driver deleted');
      setDelConfirm(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // ── Route CRUD ────────────────────────────────────────────────────────────
  const handleSaveRoute = async form => {
    try {
      if (routeModal?.id) {
        await updateRoute(routeModal.id, form);
        toast.success('Route updated');
      } else {
        await createRoute(form);
        toast.success('Route created');
      }
      setRouteModal(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDeleteRoute = async id => {
    try {
      await deleteRoute(id);
      toast.success('Route deleted');
      setDelConfirm(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // ── Assignment CRUD ───────────────────────────────────────────────────────
  const handleAssign = async form => {
    try {
      await createAssignment(form);
      toast.success('Student assigned');
      setAssignModal(false);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    }
  };

  const handleDelete = async () => {
    const { type, id } = delConfirm;
    if (type === 'bus')        { await handleDeleteBus(id); return; }
    if (type === 'driver')     { await handleDeleteDriver(id); return; }
    if (type === 'route')      { await handleDeleteRoute(id); return; }
    if (type === 'assignment') {
      try {
        await deleteAssignment(id);
        toast.success('Assignment removed');
        setDelConfirm(null);
        loadAll();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Delete failed');
      }
    }
  };

  // ── Transfer ──────────────────────────────────────────────────────────────
  const handleTransfer = async form => {
    try {
      await transferStudent(transferModal.id, form);
      toast.success('Student transferred');
      setTransferModal(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    }
  };

  // ── PDF download ──────────────────────────────────────────────────────────
  const handlePdf = async assignmentId => {
    setPdfLoading(assignmentId);
    try {
      const res = await downloadTransportSlip(assignmentId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `transport-slip-${assignmentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(null);
    }
  };

  // ── Search filter ─────────────────────────────────────────────────────────
  const filtered = {
    buses:   buses.filter(b   => !search || b.bus_number?.toLowerCase().includes(search.toLowerCase()) || (b.driver_full_name || b.driver_name || '').toLowerCase().includes(search.toLowerCase())),
    drivers: drivers.filter(d => !search || d.full_name?.toLowerCase().includes(search.toLowerCase()) || d.phone?.includes(search)),
    assigns: assigns.filter(a => !search || a.student_name?.toLowerCase().includes(search.toLowerCase()) || a.roll_number?.toLowerCase().includes(search.toLowerCase())),
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-indigo-500" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">

        <PageHeader title="Transport Management" subtitle="Vehicles, drivers, routes & student assignments">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Academic year selector (shown when relevant) */}
            {['assignments','overview'].includes(tab) && (
              <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            {tab === 'assignments' && (
              <button onClick={() => setAssignModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
                <PlusCircle size={15} /> Assign Student
              </button>
            )}
            {tab === 'vehicles' && (
              <button onClick={() => setBusModal('new')}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
                <PlusCircle size={15} /> Add Vehicle
              </button>
            )}
            {tab === 'drivers' && (
              <button onClick={() => setDriverModal('new')}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
                <PlusCircle size={15} /> Add Driver
              </button>
            )}
            {tab === 'routes' && (
              <button onClick={() => setRouteModal('new')}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
                <PlusCircle size={15} /> Add Route
              </button>
            )}
            <button onClick={loadAll} className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">
              <RefreshCw size={15} className="text-slate-500" />
            </button>
          </div>
        </PageHeader>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Search bar (not on overview or tracking) */}
        {tab !== 'overview' && tab !== 'tracking' && (
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${tab}…`}
              className="pl-8 pr-4 py-2 w-full border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* ── OVERVIEW ────────────────────────────────────────────────────── */}
        {tab === 'overview' && summary && (
          <div className="space-y-5">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Vehicles', value: summary.buses?.total, icon: Bus, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' },
                { label: 'Active Drivers', value: summary.drivers?.active, icon: User, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' },
                { label: 'Active Routes',  value: summary.routes?.total, icon: Route, color: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30' },
                { label: 'Students Assigned', value: summary.assignments?.active, icon: Users, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30' },
              ].map(stat => (
                <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                    <stat.icon size={18} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value ?? 0}</p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Occupancy */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
              <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-4">Vehicle Occupancy</h3>
              <div className="space-y-3">
                {(summary.occupancy || []).slice(0, 8).map(b => (
                  <OccupancyBar key={b.bus_number} {...b} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── VEHICLES ────────────────────────────────────────────────────── */}
        {tab === 'vehicles' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.buses.map(b => (
              <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Car size={16} className="text-indigo-500" />
                      <span className="font-bold text-slate-800 dark:text-white">{b.bus_number}</span>
                      <Badge className={STATUS_BUS[b.status]}>{b.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{b.vehicle_number} · {b.make_model || '—'}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setBusModal(b)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500"><Pencil size={14} /></button>
                    <button onClick={() => setDelConfirm({ type: 'bus', id: b.id, name: b.bus_number })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Capacity</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{b.assigned_students}/{b.capacity}</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min((b.assigned_students/b.capacity)*100, 100)}%` }} />
                </div>

                {(b.driver_full_name || b.driver_name) && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <User size={12} />
                    <span>{b.driver_full_name || b.driver_name}</span>
                    {b.driver_mobile && <><Phone size={11} /><span>{b.driver_mobile}</span></>}
                  </div>
                )}
                {b.route_name && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin size={11} />
                    <span>{b.route_name}</span>
                  </div>
                )}
              </div>
            ))}
            {filtered.buses.length === 0 && (
              <div className="col-span-3 py-12 text-center text-slate-400 text-sm">No vehicles found</div>
            )}
          </div>
        )}

        {/* ── DRIVERS ──────────────────────────────────────────────────────── */}
        {tab === 'drivers' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.drivers.map(d => (
              <div key={d.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                      {d.photo_url
                        ? <img src={d.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                        : <User size={18} className="text-indigo-500" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{d.full_name}</p>
                      <Badge className={STATUS_BUS[d.status] || STATUS_BUS.active}>{d.status}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setDriverModal(d)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500"><Pencil size={14} /></button>
                    <button onClick={() => setDelConfirm({ type: 'driver', id: d.id, name: d.full_name })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5"><Phone size={11} /><span>{d.phone}</span></div>
                  {d.cnic           && <div className="flex items-center gap-1.5"><IdCard size={11} /><span>CNIC: {d.cnic}</span></div>}
                  {d.license_number && <div className="flex items-center gap-1.5"><ShieldCheck size={11} /><span>Lic: {d.license_number}</span></div>}
                  {d.bus_number     && <div className="flex items-center gap-1.5"><Bus size={11} /><span>{d.bus_number} · {d.route_name || 'No route'}</span></div>}
                </div>

                {d.assigned_students > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400">
                    <Users size={11} />
                    <span>{d.assigned_students} student{d.assigned_students !== 1 ? 's' : ''} assigned</span>
                  </div>
                )}
              </div>
            ))}
            {filtered.drivers.length === 0 && (
              <div className="col-span-3 py-12 text-center text-slate-400 text-sm">No drivers found</div>
            )}
          </div>
        )}

        {/* ── ROUTES ───────────────────────────────────────────────────────── */}
        {tab === 'routes' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {routes.map(r => (
              <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{r.route_name}</p>
                    <p className="text-xs text-slate-400">{r.start_point} → {r.end_point}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge className={r.is_active ? STATUS_BUS.active : STATUS_BUS.inactive}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <button onClick={() => setRouteModal(r)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDelConfirm({ type: 'route', id: r.id, name: r.route_name })}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span><MapPin size={11} className="inline mr-1" />{r.total_stops} stops</span>
                  <span><Users size={11} className="inline mr-1" />{r.assigned_students} students</span>
                  {r.distance_km && <span>{r.distance_km} km</span>}
                </div>
                {r.bus_number && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Bus size={11} />{r.bus_number}
                  </p>
                )}
              </div>
            ))}
            {routes.length === 0 && (
              <div className="col-span-3 py-12 text-center text-slate-400 text-sm">No routes found. Click "Add Route" to create one.</div>
            )}
          </div>
        )}

        {/* ── ASSIGNMENTS ──────────────────────────────────────────────────── */}
        {tab === 'assignments' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Vehicle</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Route / Stop</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Driver</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {filtered.assigns.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{a.student_name}</p>
                        <p className="text-xs text-slate-400">{a.roll_number} · {a.class_section}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="font-medium text-slate-700 dark:text-slate-200">{a.bus_number}</p>
                        <p className="text-xs text-slate-400 capitalize">{(a.vehicle_type || 'bus').replace('_',' ')}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-slate-700 dark:text-slate-200 text-xs">{a.route_name}</p>
                        {a.stop_name && <p className="text-xs text-slate-400">{a.stop_name} {a.pickup_time ? `· ${a.pickup_time}` : ''}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-slate-600 dark:text-slate-300 text-xs">{a.driver_name || '—'}</p>
                        {a.driver_phone && <p className="text-xs text-slate-400">{a.driver_phone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_ASSIGN[a.status]}>{a.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {/* PDF */}
                          <button
                            onClick={() => handlePdf(a.id)}
                            disabled={pdfLoading === a.id}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500 disabled:opacity-40"
                            title="Download transport slip PDF"
                          >
                            {pdfLoading === a.id
                              ? <RefreshCw size={13} className="animate-spin" />
                              : <FileText size={13} />}
                          </button>
                          {/* Transfer */}
                          <button
                            onClick={() => setTransferModal(a)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-500"
                            title="Transfer to different bus"
                          >
                            <ArrowRightLeft size={13} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setDelConfirm({ type: 'assignment', id: a.id, name: a.student_name })}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.assigns.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                        {search ? 'No matching assignments' : 'No active assignments'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LIVE TRACKING ────────────────────────────────────────────────── */}
        {tab === 'tracking' && (
          <LiveTrackingTab buses={buses} routes={routes} />
        )}
      </div>

      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      {busModal && (
        <VehicleModal
          bus={busModal === 'new' ? null : busModal}
          drivers={drivers}
          onSave={handleSaveBus}
          onClose={() => setBusModal(null)}
        />
      )}

      {driverModal && (
        <DriverModal
          driver={driverModal === 'new' ? null : driverModal}
          onSave={handleSaveDriver}
          onClose={() => setDriverModal(null)}
        />
      )}

      {assignModal && (
        <AssignModal
          buses={buses}
          routes={routes}
          unassigned={unassigned}
          onSave={handleAssign}
          onClose={() => setAssignModal(false)}
          academicYear={academicYear}
        />
      )}

      {routeModal && (
        <RouteModal
          route={routeModal === 'new' ? null : routeModal}
          onSave={handleSaveRoute}
          onClose={() => setRouteModal(null)}
        />
      )}

      {transferModal && (
        <TransferModal
          assignment={transferModal}
          buses={buses}
          routes={routes}
          onSave={handleTransfer}
          onClose={() => setTransferModal(null)}
        />
      )}

      {delConfirm && (
        <ConfirmDelete
          title={`Delete ${delConfirm.type}`}
          detail={`Are you sure you want to delete "${delConfirm.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => setDelConfirm(null)}
        />
      )}
    </Layout>
  );
}

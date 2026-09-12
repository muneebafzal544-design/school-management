import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, BookOpen, Users, Heart,
  Check, ChevronRight, ChevronLeft, Camera, FileUp,
  Trash2, Eye, Download, KeyRound, Copy, Printer,
  Search, UserCheck, X as XIcon, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import Input, { Select, Textarea } from '../components/ui/Input';
import { PageLoader } from '../components/ui/Spinner';
import {
  getStudent, getStudents, createStudent, updateStudent,
  uploadStudentPhoto, getStudentDocuments, uploadStudentDocument,
  deleteStudentDocument, resetStudentCredentials,
} from '../api/students';
import { getBuses, getAssignments, createAssignment } from '../api/transport';
import { useClasses } from '../hooks/useReferenceData';
import { GRADES } from '../constants';


const BLANK = {
  full_name: '', full_name_urdu: '', date_of_birth: '', place_of_birth: '',
  gender: '', nationality: 'Pakistani', b_form_no: '', blood_group: '',
  phone: '', email: '', emergency_contact: '',
  address: '', city: '', province: '', postal_code: '',
  class_id: '', grade: '',
  admission_date: '', status: 'active',
  previous_school: '', previous_class: '', previous_marks: '',
  father_name: '', father_cnic: '', father_phone: '', father_email: '',
  father_occupation: '', father_education: '',
  mother_name: '', mother_cnic: '', mother_phone: '', mother_occupation: '',
  guardian_name: '', guardian_relation: '', guardian_phone: '', guardian_cnic: '',
  medical_condition: '', allergies: '', disability: '',
  transport_required: false, transport_route: '', bus_id: '', transport_type: 'both',
  hostel_required: false, siblings_in_school: '',
  extra_curricular: '', house_color: '',
};

const STEPS = [
  { id: 1, label: 'Personal',   icon: User,     desc: 'Identity, photo & basic details' },
  { id: 2, label: 'Contact',    icon: Phone,    desc: 'Phone, email & address' },
  { id: 3, label: 'Academic',   icon: BookOpen, desc: 'Class, grade & history' },
  { id: 4, label: 'Family',     icon: Users,    desc: 'Father, mother & guardian' },
  { id: 5, label: 'Health',     icon: Heart,    desc: 'Medical info & extras' },
];

function SectionHead({ label }) {
  return (
    <div className="flex items-center gap-2 mb-4 mt-1">
      <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{label}</span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

function Toggle({ label, name, checked, onChange, helpText }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div>
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</div>
        {helpText && <div className="text-xs text-slate-400 mt-0.5">{helpText}</div>}
      </div>
      <button type="button" onClick={() => onChange({ target: { name, value: !checked } })}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 px-4">
      {STEPS.map((step, idx) => {
        const Icon   = step.icon;
        const done   = current > step.id;
        const active = current === step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                done   ? 'bg-indigo-500 border-indigo-500 text-white' :
                active ? 'bg-white dark:bg-slate-900 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/20' :
                         'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400'
              }`}>
                {done ? <Check size={15} strokeWidth={3} /> : <Icon size={15} />}
              </div>
              <div className="mt-1.5 text-center hidden sm:block">
                <div className={`text-[10px] font-bold ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{step.label}</div>
              </div>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`w-10 sm:w-16 h-0.5 mt-[-18px] sm:mt-[-22px] mx-1 rounded transition-all duration-300 ${done ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Credentials modal ───────────────────────────────────── */
function CredentialsModal({ credentials, studentId, onClose, navigate }) {
  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <KeyRound size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">Student Login Created</h2>
            <p className="text-xs text-slate-400">Save these credentials — password won't be shown again</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
            {[['Username', credentials.username], ['Password', credentials.password]].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-mono font-bold text-slate-800 dark:text-white">{val}</p>
                </div>
                <button onClick={() => copy(val)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <Copy size={14} className="text-slate-400" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2 border border-amber-200 dark:border-amber-800/40">
            Share these with the student/parent. The password is auto-generated and can be changed from the login screen.
          </p>
        </div>
        <div className="px-6 pb-6 flex flex-wrap gap-2">
          <button onClick={() => { onClose(); navigate('/students/' + studentId + '/print'); }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Printer size={14} /> Print Profile
          </button>
          <button onClick={() => navigate('/students/' + studentId + '/edit?tab=documents')}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
            <FileUp size={14} /> Upload Documents
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Photo uploader (used in edit mode on step 1) ─────────── */
function PhotoUploader({ studentId, currentUrl, onUploaded }) {
  const inputRef    = useRef();
  const [prev, setPrev]     = useState(currentUrl || null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPrev(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append('photo', file);
    setUploading(true);
    try {
      const r = await uploadStudentPhoto(studentId, fd);
      const url = r.data?.data?.photo_url ?? r.data?.photo_url;
      if (url) { setPrev(url); onUploaded(url); }
      toast.success('Photo updated');
    } catch {
      toast.error('Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 mb-4">
      <div className="relative">
        <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
          {prev
            ? <img src={prev} alt="Photo" className="w-full h-full object-cover" />
            : <Camera size={28} className="text-slate-300" />
          }
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button type="button" onClick={() => inputRef.current?.click()}
          className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg hover:bg-indigo-600 transition-colors">
          <Camera size={13} />
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      <p className="text-[10px] text-slate-400">Click the camera to change photo</p>
    </div>
  );
}

/* ── New-student photo picker (no upload yet) ─────────────── */
function PhotoPicker({ preview, onPick }) {
  const inputRef = useRef();
  return (
    <div className="flex flex-col items-center gap-3 mb-4">
      <div className="relative">
        <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center cursor-pointer" onClick={() => inputRef.current?.click()}>
          {preview
            ? <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            : <Camera size={28} className="text-slate-300" />
          }
        </div>
        <button type="button" onClick={() => inputRef.current?.click()}
          className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg hover:bg-indigo-600 transition-colors">
          <Camera size={13} />
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={e => { const f = e.target.files[0]; if (f) onPick(f); }} />
      <p className="text-[10px] text-slate-400">Optional — click to add photo</p>
    </div>
  );
}

/* ── Documents tab ─────────────────────────────────────────── */
function DocumentsTab({ studentId }) {
  const inputRef   = useRef();
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('other');

  const reload = () => {
    getStudentDocuments(studentId)
      .then(r => setDocs(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { reload(); }, [studentId]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', docName || file.name);
    fd.append('doc_type', docType);
    try {
      await uploadStudentDocument(studentId, fd);
      toast.success('Document uploaded');
      setDocName(''); setDocType('other');
      inputRef.current.value = '';
      reload();
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document?')) return;
    try {
      await deleteStudentDocument(studentId, docId);
      toast.success('Deleted');
      reload();
    } catch { toast.error('Delete failed'); }
  };

  const DOC_TYPES = ['other','b_form','birth_certificate','transfer_certificate','medical','report_card','photograph','id_card'];

  return (
    <div className="space-y-5">
      {/* Upload form */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Upload Document</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text" value={docName} onChange={e => setDocName(e.target.value)}
            placeholder="Document name (e.g. B-Form)"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <select value={docType} onChange={e => setDocType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400">
            {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
          </select>
        </div>
        <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 w-fit ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          {uploading
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <FileUp size={15} />}
          {uploading ? 'Uploading…' : 'Choose File & Upload'}
          <input ref={inputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-center text-sm text-slate-400 py-4">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-8">No documents uploaded yet</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                <FileUp size={14} className="text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{doc.name}</p>
                <p className="text-[11px] text-slate-400">{doc.doc_type.replace(/_/g,' ')} · {new Date(doc.created_at).toLocaleDateString()}</p>
              </div>
              <a href={doc.file_url} target="_blank" rel="noreferrer"
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Eye size={15} className="text-slate-400" />
              </a>
              <a href={doc.file_url} download={doc.name}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Download size={15} className="text-slate-400" />
              </a>
              <button onClick={() => handleDelete(doc.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 size={15} className="text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sibling Family Copier ────────────────────────────────── */
const FAMILY_FIELDS = [
  'father_name','father_cnic','father_phone','father_email',
  'father_occupation','father_education',
  'mother_name','mother_cnic','mother_phone','mother_occupation',
  'guardian_name','guardian_relation','guardian_phone','guardian_cnic',
];

function SiblingCopier({ onCopy, copiedFrom, onClear, excludeId }) {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [open,      setOpen]      = useState(false);
  const timerRef = useRef(null);
  const wrapRef  = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (q) => {
    setQuery(q);
    clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await getStudents({ search: q.trim(), status: 'active', limit: 8 });
        const list = (Array.isArray(res.data) ? res.data : []).filter(s => String(s.id) !== String(excludeId));
        setResults(list);
        setOpen(list.length > 0);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 320);
  };

  const handleSelect = async (student) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    try {
      const res = await getStudent(student.id);
      const s = res.data?.data ?? res.data;
      const family = {};
      FAMILY_FIELDS.forEach(f => { family[f] = s[f] || ''; });
      onCopy(family, s.full_name);
    } catch { toast.error('Could not load student details'); }
  };

  if (copiedFrom) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 mb-2">
        <UserCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 truncate">
            Family details copied from <span className="font-bold">{copiedFrom}</span>
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500">You can still edit any field below</p>
        </div>
        <button onClick={onClear} title="Clear copied details"
          className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 transition-colors">
          <XIcon size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative mb-2">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50">
        <Users size={16} className="text-indigo-500 shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1.5">
            Enrolling a sibling? Copy parent details from an existing student
          </p>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by student name…"
              className="w-full pl-8 pr-8 py-2 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
            {searching && (
              <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin" />
            )}
          </div>
        </div>
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
          {results.map(s => (
            <button key={s.id} type="button" onClick={() => handleSelect(s)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-left border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0 overflow-hidden">
                {s.photo_url
                  ? <img src={s.photo_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{s.full_name?.[0]?.toUpperCase()}</span>
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{s.full_name}</p>
                <p className="text-xs text-slate-400 truncate">
                  {s.class_name || s.grade || '—'}{s.father_name ? ` · Father: ${s.father_name}` : ''}
                </p>
              </div>
              <span className="ml-auto text-xs font-medium text-indigo-500 shrink-0">Copy →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════ */
export default function AdmissionPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit   = Boolean(id);

  const [step,        setStep]        = useState(1);
  const [activeTab,   setActiveTab]   = useState(() => searchParams.get('tab') || 'form');
  const [form,        setForm]        = useState(BLANK);
  const [photoFile,   setPhotoFile]   = useState(null);
  const [photoPreview,setPhotoPreview]= useState(null);
  const [photoUrl,    setPhotoUrl]    = useState(null); // after edit upload
  const { data: classes = [] }        = useClasses();
  const [loading,     setLoading]     = useState(isEdit);
  const [saving,      setSaving]      = useState(false);
  const [errors,      setErrors]      = useState({});
  const [credentials, setCredentials] = useState(null);
  const [createdId,   setCreatedId]   = useState(null);
  const [siblingCopied, setSiblingCopied] = useState(null); // name of sibling whose family was copied
  const [buses,         setBuses]         = useState([]);
  const [busesLoaded,   setBusesLoaded]   = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    getStudent(id)
      .then(r => {
        const s = r.data?.data ?? r.data;
        setPhotoUrl(s.photo_url || null);
        setForm({
          full_name:          s.full_name          || '',
          full_name_urdu:     s.full_name_urdu      || '',
          date_of_birth:      s.date_of_birth?.split('T')[0]   || '',
          place_of_birth:     s.place_of_birth      || '',
          gender:             s.gender              || '',
          nationality:        s.nationality         || 'Pakistani',
          b_form_no:          s.b_form_no           || '',
          blood_group:        s.blood_group         || '',
          phone:              s.phone               || '',
          email:              s.email               || '',
          emergency_contact:  s.emergency_contact   || '',
          address:            s.address             || '',
          city:               s.city                || '',
          province:           s.province            || '',
          postal_code:        s.postal_code         || '',
          class_id:           s.class_id ? String(s.class_id) : '',
          grade:              s.grade               || '',
          _admission_number:  s.admission_number    || '',
          _roll_number:       s.roll_number         || '',
          admission_date:     s.admission_date?.split('T')[0] || '',
          status:             s.status              || 'active',
          previous_school:    s.previous_school     || '',
          previous_class:     s.previous_class      || '',
          previous_marks:     s.previous_marks      || '',
          father_name:        s.father_name         || '',
          father_cnic:        s.father_cnic         || '',
          father_phone:       s.father_phone        || '',
          father_email:       s.father_email        || '',
          father_occupation:  s.father_occupation   || '',
          father_education:   s.father_education    || '',
          mother_name:        s.mother_name         || '',
          mother_cnic:        s.mother_cnic         || '',
          mother_phone:       s.mother_phone        || '',
          mother_occupation:  s.mother_occupation   || '',
          guardian_name:      s.guardian_name       || '',
          guardian_relation:  s.guardian_relation   || '',
          guardian_phone:     s.guardian_phone      || '',
          guardian_cnic:      s.guardian_cnic       || '',
          medical_condition:  s.medical_condition   || '',
          allergies:          s.allergies           || '',
          disability:         s.disability          || '',
          transport_required: s.transport_required  ?? false,
          transport_route:    s.transport_route     || '',
          bus_id:             '',
          transport_type:     'both',
          hostel_required:    s.hostel_required     ?? false,
          siblings_in_school: s.siblings_in_school  || '',
          extra_curricular:   s.extra_curricular    || '',
          house_color:        s.house_color         || '',
        });
        // Also load existing transport assignment
        if (s.transport_required) {
          getAssignments({ student_id: id })
            .then(tr => {
              const active = (Array.isArray(tr.data) ? tr.data : []).find(a => a.status === 'active');
              if (active) setForm(f => ({
                ...f,
                bus_id: String(active.bus_id || ''),
                transport_type: active.transport_type || 'both',
              }));
            })
            .catch(() => {});
        }
      })
      .catch(() => toast.error('Failed to load student'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const onChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: '' }));
    // Lazy-load buses the first time transport is enabled
    if (name === 'transport_required' && value === true && !busesLoaded) {
      setBusesLoaded(true);
      getBuses({ status: 'active' })
        .then(r => setBuses(Array.isArray(r.data) ? r.data : []))
        .catch(() => {});
    }
  };

  // Pre-load buses if editing a student who already has transport enabled
  useEffect(() => {
    if (isEdit && form.transport_required && !busesLoaded) {
      setBusesLoaded(true);
      getBuses({ status: 'active' })
        .then(r => setBuses(Array.isArray(r.data) ? r.data : []))
        .catch(() => {});
    }
  }, [isEdit, form.transport_required, busesLoaded]);

  const validateStep = (s) => {
    if (s !== 1) return {};
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    if (!form.gender)           e.gender    = 'Gender is required';
    return e;
  };

  const handleNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setStep(s => Math.min(s + 1, STEPS.length));
  };
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.gender) {
      toast.error('Full name and gender are required'); setStep(1);
      setErrors({ full_name: !form.full_name.trim() ? 'Required' : '', gender: !form.gender ? 'Required' : '' });
      return;
    }
    setSaving(true);
    try {
      // Strip display-only fields and non-student-table fields before sending
      const { _admission_number, _roll_number, bus_id, transport_type, ...rest } = form;
      const payload = {
        ...rest,
        class_id:           form.class_id ? Number(form.class_id) : null,
        transport_required: Boolean(form.transport_required),
        hostel_required:    Boolean(form.hostel_required),
      };
      if (isEdit) {
        await updateStudent(id, payload);
        // Update transport assignment if bus was selected
        if (form.transport_required && bus_id) {
          const selectedBus = buses.find(b => String(b.id) === String(bus_id));
          createAssignment({
            student_id: Number(id),
            bus_id: Number(bus_id),
            route_id: selectedBus?.assigned_route_id || selectedBus?.bus_id || null,
            transport_type: transport_type || 'both',
            notes: form.transport_route || null,
          }).catch(() => {}); // non-fatal
        }
        toast.success('Student updated successfully');
        navigate('/students');
      } else {
        const res = await createStudent(payload);
        const student = res.data?.data ?? res.data;
        const creds   = res.data?.credentials;
        const newId   = student?.id;

        // Upload photo if selected
        if (photoFile && newId) {
          const fd = new FormData();
          fd.append('photo', photoFile);
          try { await uploadStudentPhoto(newId, fd); } catch { /* non-fatal */ }
        }

        // Create transport assignment if bus was selected
        if (newId && form.transport_required && bus_id) {
          const selectedBus = buses.find(b => String(b.id) === String(bus_id));
          if (selectedBus?.assigned_route_id) {
            createAssignment({
              student_id: newId,
              bus_id: Number(bus_id),
              route_id: Number(selectedBus.assigned_route_id),
              transport_type: transport_type || 'both',
              notes: form.transport_route || null,
            }).catch(() => {}); // non-fatal
          }
        }

        if (creds) {
          setCreatedId(newId);
          setCredentials(creds);
        } else {
          toast.success('Student enrolled successfully');
          navigate(`/students/${newId}/edit?tab=documents`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.displayMessage || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Step 1 content — includes photo picker/uploader
  const step1Content = (
    <div className="space-y-4">
      {/* Photo */}
      <SectionHead label="Student Photo" />
      {isEdit
        ? <PhotoUploader studentId={id} currentUrl={photoUrl} onUploaded={url => setPhotoUrl(url)} />
        : <PhotoPicker preview={photoPreview} onPick={f => { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }} />
      }

      <SectionHead label="Basic Identity" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Full Name (English)" name="full_name" value={form.full_name} onChange={onChange}
          required placeholder="e.g. Ahmed Ali Khan" error={errors.full_name} className="sm:col-span-2" />
        <Input label="Full Name (Urdu)" name="full_name_urdu" value={form.full_name_urdu} onChange={onChange}
          placeholder="احمد علی خان" className="sm:col-span-2" />
        <Select label="Gender" name="gender" value={form.gender} onChange={onChange} required error={errors.gender}>
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </Select>
        <Select label="Blood Group" name="blood_group" value={form.blood_group} onChange={onChange}>
          <option value="">Select blood group</option>
          {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(g => <option key={g} value={g}>{g}</option>)}
        </Select>
      </div>

      <SectionHead label="Date & Place of Birth" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Date of Birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={onChange} />
        <Input label="Place of Birth" name="place_of_birth" value={form.place_of_birth} onChange={onChange} placeholder="e.g. Lahore" />
      </div>

      <SectionHead label="National Identity" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="B-Form / CNIC No." name="b_form_no" value={form.b_form_no} onChange={onChange} placeholder="12345-6789012-3" />
        <Input label="Nationality" name="nationality" value={form.nationality} onChange={onChange} placeholder="Pakistani" />
      </div>
    </div>
  );

  const stepContent = {
    1: step1Content,
    2: (
      <div className="space-y-4">
        <SectionHead label="Phone & Email" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Student Phone" name="phone" value={form.phone} onChange={onChange} placeholder="+92 300 1234567" />
          <Input label="Student Email" name="email" type="email" value={form.email} onChange={onChange} placeholder="student@example.com" />
          <Input label="Emergency Contact No." name="emergency_contact" value={form.emergency_contact} onChange={onChange} placeholder="+92 300 9876543" className="sm:col-span-2" />
        </div>
        <SectionHead label="Residential Address" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Textarea label="Street Address" name="address" value={form.address} onChange={onChange}
            placeholder="House No., Street, Area" rows={2} className="sm:col-span-2" />
          <Input label="City" name="city" value={form.city} onChange={onChange} placeholder="e.g. Lahore" />
          <Select label="Province" name="province" value={form.province} onChange={onChange}>
            <option value="">Select province</option>
            {['Punjab','Sindh','KPK','Balochistan','Gilgit-Baltistan','AJK','Federal Capital'].map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Input label="Postal Code" name="postal_code" value={form.postal_code} onChange={onChange} placeholder="54000" />
        </div>
      </div>
    ),
    3: (
      <div className="space-y-4">
        <SectionHead label="Current Enrollment" />

        {/* Read-only auto-generated numbers (edit mode only) */}
        {isEdit && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Admission No.', value: form._admission_number },
              { label: 'Roll No.',      value: form._roll_number },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/60 dark:bg-indigo-900/10 px-4 py-3">
                <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 font-mono">{value || '—'}</p>
              </div>
            ))}
          </div>
        )}

        {!isEdit && (
          <div className="px-3 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/40 text-xs text-sky-700 dark:text-sky-400">
            Admission number and roll number will be assigned automatically upon enrollment.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Assign Class" name="class_id" value={form.class_id} onChange={onChange}>
            <option value="">— No class assigned —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Grade" name="grade" value={form.grade} onChange={onChange}>
            <option value="">Select grade</option>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </Select>
          <Input label="Admission Date" name="admission_date" type="date" value={form.admission_date} onChange={onChange} />
          <Select label="Enrollment Status" name="status" value={form.status} onChange={onChange}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="graduated">Graduated</option>
          </Select>
        </div>
        <SectionHead label="Previous School Record" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Previous School Name" name="previous_school" value={form.previous_school} onChange={onChange}
            placeholder="School name" className="sm:col-span-3" />
          <Input label="Previous Class / Grade" name="previous_class" value={form.previous_class} onChange={onChange} placeholder="e.g. Class 5" />
          <Input label="Marks / Grade Obtained" name="previous_marks" value={form.previous_marks} onChange={onChange} placeholder="e.g. 85% / A+" />
        </div>
      </div>
    ),
    4: (
      <div className="space-y-4">
        <SiblingCopier
          excludeId={id}
          copiedFrom={siblingCopied}
          onCopy={(family, name) => {
            setForm(f => ({ ...f, ...family }));
            setSiblingCopied(name);
          }}
          onClear={() => setSiblingCopied(null)}
        />
        <SectionHead label="Father's Information" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Father's Full Name" name="father_name" value={form.father_name} onChange={onChange} placeholder="e.g. Mr. Ali Khan" className="sm:col-span-2" />
          <Input label="Father's CNIC" name="father_cnic" value={form.father_cnic} onChange={onChange} placeholder="12345-6789012-3" />
          <Input label="Father's Phone" name="father_phone" value={form.father_phone} onChange={onChange} placeholder="+92 300 1234567" />
          <Input label="Father's Email" name="father_email" type="email" value={form.father_email} onChange={onChange} placeholder="father@example.com" />
          <Input label="Occupation" name="father_occupation" value={form.father_occupation} onChange={onChange} placeholder="e.g. Engineer, Teacher" />
          <Input label="Education" name="father_education" value={form.father_education} onChange={onChange} placeholder="e.g. B.Sc, MA, MBA" />
        </div>
        <SectionHead label="Mother's Information" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Mother's Full Name" name="mother_name" value={form.mother_name} onChange={onChange} placeholder="e.g. Mrs. Fatima Khan" className="sm:col-span-2" />
          <Input label="Mother's CNIC" name="mother_cnic" value={form.mother_cnic} onChange={onChange} placeholder="12345-6789012-3" />
          <Input label="Mother's Phone" name="mother_phone" value={form.mother_phone} onChange={onChange} placeholder="+92 300 1234567" />
          <Input label="Mother's Occupation" name="mother_occupation" value={form.mother_occupation} onChange={onChange} placeholder="e.g. Housewife, Teacher" />
        </div>
        <SectionHead label="Guardian (if different from parents)" />
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 mb-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">Fill this section only if the student's legal guardian is someone other than the parents listed above.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Guardian Name" name="guardian_name" value={form.guardian_name} onChange={onChange} placeholder="Full name" />
          <Input label="Relation to Student" name="guardian_relation" value={form.guardian_relation} onChange={onChange} placeholder="e.g. Uncle, Grandfather" />
          <Input label="Guardian Phone" name="guardian_phone" value={form.guardian_phone} onChange={onChange} placeholder="+92 300 1234567" />
          <Input label="Guardian CNIC" name="guardian_cnic" value={form.guardian_cnic} onChange={onChange} placeholder="12345-6789012-3" />
        </div>
      </div>
    ),
    5: (
      <div className="space-y-4">
        <SectionHead label="Medical Information" />
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 mb-1">
          <p className="text-xs text-amber-700 dark:text-amber-400">This information helps staff respond properly in emergencies. Leave blank if none.</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <Textarea label="Medical Conditions / Chronic Illness" name="medical_condition" value={form.medical_condition} onChange={onChange} placeholder="e.g. Asthma, Diabetes — or leave blank" rows={2} />
          <Textarea label="Allergies" name="allergies" value={form.allergies} onChange={onChange} placeholder="e.g. Peanuts, Penicillin — or leave blank" rows={2} />
          <Input label="Disability (if any)" name="disability" value={form.disability} onChange={onChange} placeholder="e.g. Hearing impairment — or leave blank" />
        </div>
        <SectionHead label="School Services" />
        <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <Toggle label="Transport Required" name="transport_required" checked={Boolean(form.transport_required)} onChange={onChange} helpText="Student will use school bus / transport service" />
          {form.transport_required && (
            <div className="space-y-3 pt-1">
              {/* Bus selector */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Assign Bus / Driver</label>
                <div className="relative">
                  <select
                    value={form.bus_id}
                    onChange={e => onChange({ target: { name: 'bus_id', value: e.target.value } })}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400">
                    <option value="">— Select bus (optional) —</option>
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>
                        Bus {b.bus_number}{b.route_name ? ` · ${b.route_name}` : ''}{b.driver_name ? ` · Driver: ${b.driver_name}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronRight size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Driver info card */}
              {form.bus_id && (() => {
                const bus = buses.find(b => String(b.id) === String(form.bus_id));
                if (!bus) return null;
                return (
                  <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-2">Driver & Bus Info</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Bus Number</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{bus.bus_number}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Vehicle No.</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{bus.vehicle_number || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Driver Name</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{bus.driver_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Driver Phone</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{bus.driver_phone || '—'}</p>
                      </div>
                      {bus.driver_license && (
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">License No.</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{bus.driver_license}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Capacity</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {bus.assigned_students ?? '?'} / {bus.capacity} seats
                        </p>
                      </div>
                      {bus.route_name && (
                        <div className="col-span-2">
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Route</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{bus.route_name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Transport type */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Transport Type</label>
                <div className="flex gap-2">
                  {[['both','Both (Pick & Drop)'],['pickup','Pick Up Only'],['dropoff','Drop Off Only']].map(([val, lbl]) => (
                    <button key={val} type="button"
                      onClick={() => onChange({ target: { name: 'transport_type', value: val } })}
                      className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold border transition-colors ${
                        form.transport_type === val
                          ? 'bg-indigo-500 text-white border-indigo-500'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300'
                      }`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <Input label="Pickup Area / Stop Notes" name="transport_route" value={form.transport_route} onChange={onChange} placeholder="e.g. Model Town Gate 2, near Masjid" />
            </div>
          )}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <Toggle label="Hostel Required" name="hostel_required" checked={Boolean(form.hostel_required)} onChange={onChange} helpText="Student will reside in school hostel" />
          </div>
        </div>
        <SectionHead label="Additional Information" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Siblings Currently Enrolled" name="siblings_in_school" value={form.siblings_in_school} onChange={onChange} placeholder="e.g. Ali Khan (Class 7)" className="sm:col-span-2" />
          <Textarea label="Extra-Curricular Activities / Talents" name="extra_curricular" value={form.extra_curricular} onChange={onChange} placeholder="e.g. Cricket, Debate, Painting" rows={2} className="sm:col-span-2" />
          <Select label="House / Team Color" name="house_color" value={form.house_color} onChange={onChange} className="sm:col-span-1">
            <option value="">— Not assigned —</option>
            {['Red','Blue','Green','Yellow','White','Orange','Purple'].map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
      </div>
    ),
  };

  const progressPct = Math.round(((step - 1) / (STEPS.length - 1)) * 100);

  return (
    <Layout>
      {credentials && (
        <CredentialsModal
          credentials={credentials}
          studentId={createdId}
          navigate={navigate}
          onClose={() => { setCredentials(null); navigate('/students'); }}
        />
      )}

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Header */}
        <div className="sticky top-14 lg:top-0 z-20 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-14 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => navigate('/students')}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                  {isEdit ? 'Edit Student' : 'New Admission'}
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">
                  {isEdit ? 'Update student information' : `Step ${step} of ${STEPS.length} — ${STEPS[step-1].desc}`}
                </p>
              </div>
            </div>
            {isEdit && (
              <div className="flex items-center gap-2">
                {['form','documents'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activeTab === t
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}>
                    {t === 'form' ? 'Student Info' : 'Documents'}
                  </button>
                ))}
              </div>
            )}
            {!isEdit && (
              <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{step}/{STEPS.length}</span>
              </div>
            )}
          </div>
          {!isEdit && (
            <div className="h-0.5 bg-slate-100 dark:bg-slate-800">
              <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progressPct + (100 / STEPS.length)}%` }} />
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto space-y-6">

          {(isEdit || createdId) && activeTab === 'documents' ? (
            loading ? <PageLoader /> : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                <DocumentsTab studentId={id || createdId} />
              </div>
            )
          ) : (
            <>
              {/* Step indicator (new admission only) */}
              {!isEdit && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-5 shadow-sm">
                  <StepIndicator current={step} />
                </div>
              )}

              {/* Step card */}
              {loading ? <PageLoader /> : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    {(() => { const Icon = STEPS[step-1].icon; return <Icon size={18} className="text-white/80" />; })()}
                    <div>
                      <h2 className="text-sm font-bold text-white">{STEPS[step-1].label} Information</h2>
                      <p className="text-xs text-indigo-200">{STEPS[step-1].desc}</p>
                    </div>
                    {!isEdit && <div className="ml-auto text-xs text-indigo-200 font-semibold">Step {step} of {STEPS.length}</div>}
                  </div>
                  <div className="p-5 sm:p-6">{stepContent[step]}</div>
                </div>
              )}

              {/* Navigation buttons */}
              {!loading && (
                <div className="flex items-center justify-between gap-3 pb-6">
                  <button type="button" onClick={handleBack} disabled={step === 1}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={15} /> Back
                  </button>

                  {!isEdit && (
                    <div className="flex items-center gap-2">
                      {STEPS.map(s => (
                        <div key={s.id} className={`w-2 h-2 rounded-full transition-all ${s.id === step ? 'bg-indigo-500 w-5' : s.id < step ? 'bg-indigo-300' : 'bg-slate-200 dark:bg-slate-700'}`} />
                      ))}
                    </div>
                  )}

                  {step < STEPS.length ? (
                    <button type="button" onClick={handleNext}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                      Next <ChevronRight size={15} />
                    </button>
                  ) : (
                    <button type="button" onClick={handleSubmit} disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm disabled:opacity-60 transition-colors">
                      {saving
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <Check size={15} />}
                      {isEdit ? 'Save Changes' : 'Enroll Student'}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

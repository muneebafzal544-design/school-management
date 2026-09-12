import { useState, useEffect, useCallback } from 'react';
import {
  Globe, Save, Loader2, Plus, Trash2, X, Eye, EyeOff,
  CheckCircle2, Image, Type, Mail, Phone, MapPin,
  Facebook, Twitter, Instagram, Youtube, Palette,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import {
  getConfig, updateConfig, togglePublish,
  getSections, createSection, updateSection, deleteSection,
} from '../api/website';

const TABS = ['General', 'Content Sections', 'Contact & Social', 'Appearance', 'Preview'];

const SECTION_TYPES = [
  { value: 'gallery',      label: 'Gallery' },
  { value: 'faculty',      label: 'Faculty Highlight' },
  { value: 'achievement',  label: 'Achievement' },
  { value: 'testimonial',  label: 'Testimonial' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'custom',       label: 'Custom Block' },
];

export default function WebsiteBuilderPage() {
  const [tab,        setTab]       = useState(0);
  const [config,     setConfig]    = useState(null);
  const [sections,   setSections]  = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [saving,     setSaving]    = useState(false);
  const [publishing, setPublishing]= useState(false);

  // Section form
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({ type: 'announcement', title: '', content: '', image_url: '', link_url: '', sort_order: 0, visible: true });
  const [savingSection, setSavingSection] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, sectionsRes] = await Promise.all([getConfig(), getSections()]);
      setConfig(configRes.data?.data?.config ?? configRes.data?.data ?? {});
      setSections(sectionsRes.data?.data ?? []);
    } catch { toast.error('Failed to load website settings'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleConfigChange(key, val) {
    setConfig(c => ({ ...c, [key]: val }));
  }

  async function handleSaveConfig() {
    setSaving(true);
    try {
      await updateConfig(config);
      toast.success('Website settings saved');
    } catch { toast.error('Failed to save'); }
    finally  { setSaving(false); }
  }

  async function handleTogglePublish() {
    setPublishing(true);
    try {
      const newVal = !config?.published;
      await togglePublish(newVal);
      setConfig(c => ({ ...c, published: newVal }));
      toast.success(newVal ? 'Website published!' : 'Website unpublished');
    } catch { toast.error('Failed'); }
    finally  { setPublishing(false); }
  }

  async function handleSaveSection(e) {
    e.preventDefault();
    setSavingSection(true);
    try {
      if (editSection) await updateSection(editSection.id, sectionForm);
      else await createSection(sectionForm);
      toast.success(editSection ? 'Section updated' : 'Section added');
      setShowSectionForm(false);
      setEditSection(null);
      setSectionForm({ type: 'announcement', title: '', content: '', image_url: '', link_url: '', sort_order: 0, visible: true });
      load();
    } catch { toast.error('Failed'); }
    finally { setSavingSection(false); }
  }

  async function handleDeleteSection() {
    try {
      await deleteSection(deleteModal.id);
      toast.success('Section deleted');
      setDeleteModal(null);
      load();
    } catch { toast.error('Failed'); }
  }

  const inp = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white';
  const lbl = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  if (loading) return <Layout><div className="p-6"><PageLoader /></div></Layout>;

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Globe className="text-cyan-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Website Builder</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your school's public website content</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleTogglePublish} disabled={publishing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                config?.published
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {publishing ? <Loader2 className="animate-spin" size={14} /> : config?.published ? <EyeOff size={14} /> : <Eye size={14} />}
              {config?.published ? 'Unpublish' : 'Publish Website'}
            </button>
            <button onClick={handleSaveConfig} disabled={saving}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
          config?.published
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
        }`}>
          {config?.published
            ? <><CheckCircle2 size={16} /> Website is <strong>live</strong> — visitors can see it</>
            : <><EyeOff size={16} /> Website is <strong>unpublished</strong> — not visible to the public</>
          }
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit flex-wrap">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === i ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >{t}</button>
          ))}
        </div>

        {/* General Tab */}
        {tab === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <h3 className="font-semibold text-gray-900 dark:text-white">General Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={lbl}>School Name</label>
                <input className={inp} value={config?.school_name || ''} onChange={e => handleConfigChange('school_name', e.target.value)} placeholder="Your School Name" />
              </div>
              <div>
                <label className={lbl}>Tagline</label>
                <input className={inp} value={config?.tagline || ''} onChange={e => handleConfigChange('tagline', e.target.value)} placeholder="e.g. Excellence in Education" />
              </div>
              <div>
                <label className={lbl}>Logo URL</label>
                <input className={inp} value={config?.logo_url || ''} onChange={e => handleConfigChange('logo_url', e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className={lbl}>Hero Image URL</label>
                <input className={inp} value={config?.hero_image_url || ''} onChange={e => handleConfigChange('hero_image_url', e.target.value)} placeholder="https://..." />
              </div>
              <div className="md:col-span-2">
                <label className={lbl}>Hero Title</label>
                <input className={inp} value={config?.hero_title || ''} onChange={e => handleConfigChange('hero_title', e.target.value)} placeholder="Welcome to Our School" />
              </div>
              <div className="md:col-span-2">
                <label className={lbl}>Hero Subtitle</label>
                <textarea rows={2} className={inp + ' resize-none'} value={config?.hero_subtitle || ''} onChange={e => handleConfigChange('hero_subtitle', e.target.value)} placeholder="Shaping the leaders of tomorrow..." />
              </div>
              <div className="md:col-span-2">
                <label className={lbl}>About Us Text</label>
                <textarea rows={5} className={inp + ' resize-none'} value={config?.about_text || ''} onChange={e => handleConfigChange('about_text', e.target.value)} placeholder="Tell visitors about your school..." />
              </div>
            </div>
          </div>
        )}

        {/* Sections Tab */}
        {tab === 1 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">{sections.length} content section{sections.length !== 1 ? 's' : ''}</p>
              <button onClick={() => { setShowSectionForm(true); setEditSection(null); setSectionForm({ type: 'announcement', title: '', content: '', image_url: '', link_url: '', sort_order: sections.length, visible: true }); }}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              ><Plus size={14} /> Add Section</button>
            </div>
            <div className="space-y-3">
              {sections.length === 0 && (
                <div className="text-center py-12 text-gray-400 dark:text-gray-600">
                  No sections yet. Add galleries, achievements, testimonials and more.
                </div>
              )}
              {sections.map(s => (
                <div key={s.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 flex items-start justify-between gap-4 transition-opacity ${s.visible ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-60'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-full text-xs font-medium capitalize">{s.type}</span>
                      {!s.visible && <span className="text-xs text-gray-400">Hidden</span>}
                    </div>
                    {s.title && <p className="font-medium text-gray-900 dark:text-white mt-1">{s.title}</p>}
                    {s.content && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{s.content}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditSection(s); setSectionForm({ type: s.type, title: s.title || '', content: s.content || '', image_url: s.image_url || '', link_url: s.link_url || '', sort_order: s.sort_order, visible: s.visible }); setShowSectionForm(true); }}
                      className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"
                    ><Type size={13} /></button>
                    <button onClick={() => updateSection(s.id, { visible: !s.visible }).then(load)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
                    >{s.visible ? <Eye size={13} /> : <EyeOff size={13} />}</button>
                    <button onClick={() => setDeleteModal(s)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400"
                    ><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact & Social Tab */}
        {tab === 2 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <h3 className="font-semibold text-gray-900 dark:text-white">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><Mail size={11} /> Email</span></label>
                <input className={inp} value={config?.contact_email || ''} onChange={e => handleConfigChange('contact_email', e.target.value)} placeholder="info@school.edu" />
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><Phone size={11} /> Phone</span></label>
                <input className={inp} value={config?.contact_phone || ''} onChange={e => handleConfigChange('contact_phone', e.target.value)} placeholder="+92 300 1234567" />
              </div>
              <div className="md:col-span-2">
                <label className={lbl}><span className="flex items-center gap-1"><MapPin size={11} /> Address</span></label>
                <textarea rows={2} className={inp + ' resize-none'} value={config?.contact_address || ''} onChange={e => handleConfigChange('contact_address', e.target.value)} placeholder="Street, City, Province" />
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white pt-2">Social Media</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { key: 'facebook_url',  label: 'Facebook',  Icon: Facebook },
                { key: 'twitter_url',   label: 'Twitter/X', Icon: Twitter },
                { key: 'instagram_url', label: 'Instagram', Icon: Instagram },
                { key: 'youtube_url',   label: 'YouTube',   Icon: Youtube },
              ].map(({ key, label, Icon }) => (
                <div key={key}>
                  <label className={lbl}><span className="flex items-center gap-1"><Icon size={11} /> {label}</span></label>
                  <input className={inp} value={config?.[key] || ''} onChange={e => handleConfigChange(key, e.target.value)} placeholder="https://..." />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {tab === 3 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <h3 className="font-semibold text-gray-900 dark:text-white">Appearance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><Palette size={11} /> Primary Color</span></label>
                <div className="flex items-center gap-3">
                  <input type="color" value={config?.primary_color || '#2563eb'} onChange={e => handleConfigChange('primary_color', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <input className={inp} value={config?.primary_color || '#2563eb'} onChange={e => handleConfigChange('primary_color', e.target.value)} placeholder="#2563eb" />
                </div>
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><Palette size={11} /> Accent Color</span></label>
                <div className="flex items-center gap-3">
                  <input type="color" value={config?.accent_color || '#7c3aed'} onChange={e => handleConfigChange('accent_color', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <input className={inp} value={config?.accent_color || '#7c3aed'} onChange={e => handleConfigChange('accent_color', e.target.value)} placeholder="#7c3aed" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className={lbl}>Custom Domain (optional)</label>
                <input className={inp} value={config?.custom_domain || ''} onChange={e => handleConfigChange('custom_domain', e.target.value)} placeholder="www.myschool.edu.pk" />
                <p className="text-xs text-gray-400 mt-1">Contact support to set up a custom domain</p>
              </div>
            </div>
            {/* Color Preview */}
            <div className="mt-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-3">Color Preview</p>
              <div className="flex gap-3">
                <div className="flex-1 h-12 rounded-lg" style={{ background: config?.primary_color || '#2563eb' }} />
                <div className="flex-1 h-12 rounded-lg" style={{ background: config?.accent_color || '#7c3aed' }} />
              </div>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {tab === 4 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Website Preview</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${config?.published ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                {config?.published ? 'Published' : 'Draft'}
              </span>
            </div>
            {/* Mock Preview */}
            <div className="p-0">
              {/* Hero */}
              <div className="relative h-48 flex items-center justify-center text-white"
                style={{ background: config?.hero_image_url ? `url(${config.hero_image_url}) center/cover` : config?.primary_color || '#2563eb' }}>
                <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />
                <div className="relative text-center px-4">
                  <p className="text-2xl font-bold">{config?.hero_title || 'Welcome to Our School'}</p>
                  <p className="text-sm mt-1 opacity-80">{config?.hero_subtitle || ''}</p>
                </div>
              </div>
              {/* About */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">About Us</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{config?.about_text || 'No about text yet.'}</p>
              </div>
              {/* Sections */}
              {sections.filter(s => s.visible).slice(0, 3).map(s => (
                <div key={s.id} className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: config?.primary_color }}>{s.type}</span>
                  {s.title && <p className="font-semibold text-gray-900 dark:text-white mt-1">{s.title}</p>}
                  {s.content && <p className="text-sm text-gray-500 mt-0.5">{s.content}</p>}
                </div>
              ))}
              {/* Contact */}
              <div className="p-6 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                {config?.contact_email && <p>✉ {config.contact_email}</p>}
                {config?.contact_phone && <p>📞 {config.contact_phone}</p>}
                {config?.contact_address && <p>📍 {config.contact_address}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section Form Modal */}
      {showSectionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900 dark:text-white">{editSection ? 'Edit' : 'Add'} Section</h2>
              <button onClick={() => { setShowSectionForm(false); setEditSection(null); }}><X size={18} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleSaveSection} className="space-y-3">
              <div>
                <label className={lbl}>Section Type</label>
                <select value={sectionForm.type} onChange={e => setSectionForm(f => ({ ...f, type: e.target.value }))}
                  className={inp}
                >
                  {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Title</label>
                <input value={sectionForm.title} onChange={e => setSectionForm(f => ({ ...f, title: e.target.value }))} className={inp} placeholder="Section title..." />
              </div>
              <div>
                <label className={lbl}>Content</label>
                <textarea rows={3} value={sectionForm.content} onChange={e => setSectionForm(f => ({ ...f, content: e.target.value }))} className={inp + ' resize-none'} placeholder="Section content..." />
              </div>
              <div>
                <label className={lbl}>Image URL</label>
                <input value={sectionForm.image_url} onChange={e => setSectionForm(f => ({ ...f, image_url: e.target.value }))} className={inp} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Link URL</label>
                  <input value={sectionForm.link_url} onChange={e => setSectionForm(f => ({ ...f, link_url: e.target.value }))} className={inp} placeholder="https://..." />
                </div>
                <div>
                  <label className={lbl}>Sort Order</label>
                  <input type="number" value={sectionForm.sort_order} onChange={e => setSectionForm(f => ({ ...f, sort_order: +e.target.value }))} className={inp} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={sectionForm.visible} onChange={e => setSectionForm(f => ({ ...f, visible: e.target.checked }))} className="w-4 h-4 rounded" />
                Visible on website
              </label>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={savingSection}
                  className="flex-1 flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {savingSection ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save Section
                </button>
                <button type="button" onClick={() => { setShowSectionForm(false); setEditSection(null); }}
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
            <h2 className="font-semibold text-gray-900 dark:text-white">Delete Section?</h2>
            <div className="flex gap-3">
              <button onClick={handleDeleteSection} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium">Delete</button>
              <button onClick={() => setDeleteModal(null)} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

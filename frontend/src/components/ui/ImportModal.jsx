import { useState, useRef, useCallback } from 'react';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, X, FileText, Loader2 } from 'lucide-react';

/**
 * Reusable CSV import modal.
 *
 * Props:
 *   isOpen          {boolean}
 *   onClose         {() => void}
 *   title           {string}            e.g. "Import Students"
 *   templateFn      {() => Promise}     API call that returns Blob (CSV template)
 *   importFn        {(FormData) => Promise}  API call that uploads the file
 *   templateName    {string}            e.g. "students_template.csv"
 *   fieldName       {string}            multer field name (default: "file")
 *   description     {string}            optional helper text shown below the dropzone
 */
export default function ImportModal({
  isOpen,
  onClose,
  title = 'Import CSV',
  templateFn,
  importFn,
  templateName = 'template.csv',
  fieldName = 'file',
  description,
}) {
  const [file,    setFile]    = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null); // { imported, failed, errors }
  const inputRef = useRef();

  const reset = () => { setFile(null); setResult(null); };
  const handleClose = () => { reset(); onClose(); };

  /* ── Template download ── */
  const handleTemplate = async () => {
    if (!templateFn) return;
    try {
      const res = await templateFn();
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = templateName; a.click();
      URL.revokeObjectURL(url);
    } catch { /* swallow */ }
  };

  /* ── File selection ── */
  const acceptFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith('.csv') && f.type !== 'text/csv') {
      alert('Please select a .csv file');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const onInputChange  = (e) => acceptFile(e.target.files[0]);
  const onDrop         = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    acceptFile(e.dataTransfer.files[0]);
  }, []);
  const onDragOver     = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave    = () => setDragging(false);

  /* ── Upload ── */
  const handleImport = async () => {
    if (!file || !importFn) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append(fieldName, file);
      const res = await importFn(fd);
      const d   = res.data?.data ?? res.data;
      setResult(d);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Import failed';
      setResult({ imported: 0, failed: 0, errors: [{ row: '—', message: msg }] });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <Upload size={14} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">

          {/* Template download */}
          {templateFn && (
            <button
              onClick={handleTemplate}
              className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-sm font-semibold"
            >
              <Download size={14} />
              Download CSV Template
              <span className="ml-auto text-xs font-normal text-indigo-400 dark:text-indigo-600">{templateName}</span>
            </button>
          )}

          {/* Dropzone */}
          {!result && (
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => inputRef.current?.click()}
              className={[
                'relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all',
                dragging
                  ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20'
                  : file
                  ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800/40',
              ].join(' ')}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onInputChange}
              />

              {file ? (
                <>
                  <FileText size={28} className="mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{file.name}</p>
                  <p className="text-xs text-emerald-500 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB — click to change
                  </p>
                </>
              ) : (
                <>
                  <Upload size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {dragging ? 'Drop file here' : 'Drop CSV here or click to browse'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Only .csv files are accepted</p>
                </>
              )}
            </div>
          )}

          {/* Helper text */}
          {description && !result && (
            <p className="text-xs text-slate-400 dark:text-slate-600 leading-relaxed">{description}</p>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              {/* Summary badges */}
              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Imported</p>
                    <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 leading-none">{result.imported ?? 0}</p>
                  </div>
                </div>
                {result.failed > 0 && (
                  <div className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                    <XCircle size={16} className="text-red-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Failed</p>
                      <p className="text-xl font-extrabold text-red-600 dark:text-red-400 leading-none">{result.failed}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Errors list */}
              {result.errors?.length > 0 && (
                <div className="max-h-52 overflow-y-auto rounded-xl border border-red-100 dark:border-red-900/40">
                  {result.errors.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 px-3.5 py-2.5 border-b border-red-50 dark:border-red-900/20 last:border-0"
                    >
                      <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">Row {e.row}</span>
                        <span className="text-xs text-red-600 dark:text-red-400">{e.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Import another */}
              <button
                onClick={reset}
                className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Import Another File
              </button>
            </div>
          )}

          {/* Action buttons */}
          {!result && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Importing…</>
                ) : (
                  <><Upload size={14} /> Import</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

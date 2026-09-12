import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode, Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle,
  Printer, RefreshCw, ChevronDown, X, Users, ScanLine, Keyboard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { getClassStudentsAttendance } from '../api/attendance';
import { qrScanAttendance } from '../api/attendance';
import { useClasses } from '../hooks/useReferenceData';

const today = () => new Date().toISOString().slice(0, 10);
const SCAN_STATUS = {
  marked:    { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', label: 'Marked Present' },
  duplicate: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', label: 'Already Present' },
  updated:   { icon: CheckCircle2, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800', label: 'Updated to Present' },
  error:     { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', label: 'Error' },
};

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.frequency.value = 1200;
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}

// ── Print QR Sheet ────────────────────────────────────────────
function PrintQrSheet({ students, className }) {
  if (!students.length) return (
    <div className="text-center py-16 text-slate-400">
      <QrCode size={36} className="mx-auto mb-3" />
      <p>No students in this class</p>
    </div>
  );
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {students.length} students · {className}
        </p>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
          <Printer size={14} /> Print QR Sheet
        </button>
      </div>
      {/* Print grid */}
      <div id="qr-print-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        {students.map(s => (
          <div key={s.id}
            className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center gap-2 bg-white dark:bg-slate-800 print:border-slate-300 print:rounded-none print:p-2">
            <QRCodeSVG value={String(s.id)} size={100} level="M" />
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-800 dark:text-white leading-tight">{s.full_name}</p>
              <p className="text-xs text-slate-400">#{s.roll_number}</p>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #qr-print-grid { display: grid !important; }
          #qr-print-root { display: block !important; }
        }
      `}</style>
    </div>
  );
}

// ── Scan Tab ──────────────────────────────────────────────────
export default function QrAttendancePage() {
  const [tab,         setTab]         = useState('scan');
  const { data: classes = [] }        = useClasses();
  const [classId,     setClassId]     = useState('');
  const [date,        setDate]        = useState(today);
  const [scanned,     setScanned]     = useState([]);
  const [cameraOn,    setCameraOn]    = useState(false);
  const [inputMode,   setInputMode]   = useState('keyboard'); // 'keyboard' | 'camera'
  const [manualVal,   setManualVal]   = useState('');
  const [processing,  setProcessing]  = useState(false);
  const [students,    setStudents]    = useState([]); // for print tab
  const [loadingStudents, setLoadingStudents] = useState(false);

  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const lastScan  = useRef('');
  const inputRef  = useRef(null);

  // Load students for print tab when class selected
  useEffect(() => {
    if (tab !== 'print' || !classId) return;
    setLoadingStudents(true);
    getClassStudentsAttendance(classId, today(), undefined)
      .then(r => setStudents(r.data || []))
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [tab, classId]);

  // Camera scanner using BarcodeDetector API
  useEffect(() => {
    if (!cameraOn || !videoRef.current) return;
    if (!('BarcodeDetector' in window)) {
      toast.error('Camera scanning not supported in this browser. Use keyboard input mode.');
      setCameraOn(false);
      return;
    }
    let active = true;
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    const scan = async () => {
      if (!active || !videoRef.current) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const val = barcodes[0].rawValue;
          if (val !== lastScan.current) {
            lastScan.current = val;
            handleScan(val);
            setTimeout(() => { lastScan.current = ''; }, 2000);
          }
        }
      } catch {}
      if (active) requestAnimationFrame(scan);
    };
    requestAnimationFrame(scan);
    return () => { active = false; };
  }, [cameraOn]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      streamRef.current = stream;
      setCameraOn(true);
    } catch { toast.error('Camera access denied. Use keyboard mode instead.'); }
  };
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };
  useEffect(() => () => stopCamera(), []);

  const handleScan = useCallback(async (rawValue) => {
    const studentId = rawValue.trim();
    if (!studentId || !/^\d+$/.test(studentId)) {
      toast.error(`Invalid QR code: "${studentId}"`);
      return;
    }
    if (processing) return;
    setProcessing(true);
    try {
      const res = await qrScanAttendance({
        student_id: parseInt(studentId, 10),
        date,
        ...(classId ? { class_id: classId } : {}),
      });
      const status = res.data?.status || 'marked';
      const name   = res.data?.student_name || `Student #${studentId}`;
      beep();
      setScanned(prev => [
        { id: studentId, name, time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }), status },
        ...prev.filter(s => s.id !== studentId),
      ]);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Scan failed');
      setScanned(prev => [
        { id: studentId, name: `ID ${studentId}`, time: new Date().toLocaleTimeString(), status: 'error' },
        ...prev.filter(s => s.id !== studentId),
      ]);
    } finally { setProcessing(false); }
  }, [date, classId, processing]);

  const handleKeyboardScan = (e) => {
    if (e.key === 'Enter' && manualVal.trim()) {
      handleScan(manualVal.trim());
      setManualVal('');
    }
  };

  const selCls = 'px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none';

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode size={24} className="text-indigo-500" />
            QR Code Attendance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Scan student QR codes to mark attendance, or print QR sheets for your class
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {[
            { id: 'scan',  label: 'Scan Attendance', icon: ScanLine },
            { id: 'print', label: 'Print QR Sheet',  icon: Printer  },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'scan' && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className={selCls} />
                </div>
                <div className="min-w-[160px]">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Class (optional)</label>
                  <div className="relative">
                    <select value={classId} onChange={e => setClassId(e.target.value)} className={selCls + ' pr-8 w-full'}>
                      <option value="">All Classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInputMode(m => m === 'keyboard' ? 'camera' : 'keyboard')}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      inputMode === 'camera'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                    }`}>
                    {inputMode === 'camera' ? <Camera size={14} /> : <Keyboard size={14} />}
                    {inputMode === 'camera' ? 'Camera Mode' : 'Keyboard Mode'}
                  </button>
                  {scanned.length > 0 && (
                    <button onClick={() => setScanned([])}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 hover:text-red-600 transition-colors">
                      <X size={14} /> Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Scanner panel */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                {inputMode === 'camera' ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Camera Scanner</p>
                    <div className="relative bg-slate-900 rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
                      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                      {!cameraOn && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                          <Camera size={32} className="opacity-50" />
                          <button onClick={startCamera}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-colors">
                            Start Camera
                          </button>
                        </div>
                      )}
                      {cameraOn && (
                        <>
                          {/* Scanning overlay */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-48 h-48 border-2 border-indigo-400 rounded-xl" />
                          </div>
                          <button onClick={stopCamera}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg text-white hover:bg-black/70">
                            <CameraOff size={14} />
                          </button>
                          {processing && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 rounded-full text-white text-xs">
                                <RefreshCw size={11} className="animate-spin" /> Processing…
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 text-center">
                      Point camera at student QR code. Works on Chrome/Edge.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Keyboard / USB Scanner Input</p>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-3 text-xs text-indigo-700 dark:text-indigo-300">
                      Connect a USB barcode scanner — it auto-submits on scan. Or type student ID manually and press Enter.
                    </div>
                    <div className="relative">
                      <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={inputRef}
                        value={manualVal}
                        onChange={e => setManualVal(e.target.value)}
                        onKeyDown={handleKeyboardScan}
                        placeholder="Scan QR or type student ID, then Enter…"
                        autoFocus
                        className="w-full pl-9 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <button
                      onClick={() => { if (manualVal.trim()) { handleScan(manualVal.trim()); setManualVal(''); } }}
                      disabled={!manualVal.trim() || processing}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
                      {processing ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Mark Present
                    </button>
                  </div>
                )}

                {/* Counter */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-xs text-slate-500">Scanned this session</span>
                  <span className="text-lg font-bold text-indigo-600">
                    {scanned.filter(s => s.status !== 'error').length}
                  </span>
                </div>
              </div>

              {/* Scanned list */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    Scan Log ({scanned.length})
                  </h3>
                  {scanned.length > 0 && (
                    <span className="text-xs text-slate-400">Latest first</span>
                  )}
                </div>
                <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50">
                  {scanned.length === 0 ? (
                    <div className="text-center py-12">
                      <ScanLine size={28} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No scans yet</p>
                    </div>
                  ) : (
                    scanned.map((s, i) => {
                      const cfg = SCAN_STATUS[s.status] || SCAN_STATUS.marked;
                      const Icon = cfg.icon;
                      return (
                        <div key={i} className={`flex items-center gap-3 px-4 py-3 border-l-4 ${cfg.bg} ${i === 0 ? 'border-l-indigo-500' : 'border-l-transparent'}`}>
                          <Icon size={16} className={cfg.color + ' shrink-0'} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{s.name}</p>
                            <p className="text-xs text-slate-400">{cfg.label} · {s.time}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'print' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Select Class</label>
                <div className="relative">
                  <select value={classId} onChange={e => setClassId(e.target.value)} className={selCls + ' pr-8 w-full'}>
                    <option value="">— Select a class —</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
            {!classId ? (
              <div className="text-center py-14">
                <Users size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Select a class to generate QR sheet</p>
              </div>
            ) : loadingStudents ? (
              <div className="flex justify-center py-10">
                <div className="w-7 h-7 border-2 border-t-indigo-600 border-indigo-200 rounded-full animate-spin" />
              </div>
            ) : (
              <PrintQrSheet
                students={students}
                className={classes.find(c => String(c.id) === classId)?.name || ''}
              />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

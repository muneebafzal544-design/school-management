import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Zap, AlertCircle, CheckCircle2, RefreshCw,
  Server, Database, Cpu, Clock, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { getMetrics, getSystemInfo, getHealthReady } from '../api/health';

function StatCard({ icon: Icon, label, value, sub, color = 'text-indigo-600', alert = false }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 ${alert ? 'ring-2 ring-red-400' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className={color} />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function SystemHealthPage() {
  const [metrics,  setMetrics]  = useState(null);
  const [info,     setInfo]     = useState(null);
  const [ready,    setReady]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, infoRes, readyRes] = await Promise.allSettled([
        getMetrics(),
        getSystemInfo(),
        getHealthReady(),
      ]);
      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value.data?.data ?? metricsRes.value.data);
      if (infoRes.status === 'fulfilled')    setInfo(infoRes.value.data?.data ?? infoRes.value.data);
      if (readyRes.status === 'fulfilled')   setReady(readyRes.value.data);
      setLastRefresh(new Date());
    } catch {
      toast.error('Failed to load health data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !metrics) return <Layout><PageLoader /></Layout>;

  const s = metrics?.summary || {};
  const ts = (metrics?.timeSeries || []).map((b, i) => ({ minute: `-${59 - i}m`, ...b })).reverse();
  const checks = ready?.checks || {};
  const dbOk = checks.database?.status === 'ok';

  const errRate = parseFloat(s.error_rate || 0);

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="text-indigo-500" size={24} />
              System Health
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Live performance metrics — auto-refreshes every 30 seconds
              {lastRefresh && <span> · Last: {lastRefresh.toLocaleTimeString()}</span>}
            </p>
          </div>
          <button onClick={load} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Status badges */}
        <div className="flex gap-3 flex-wrap">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
            ${dbOk ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
            {dbOk ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            Database: {dbOk ? 'Connected' : 'Error'}
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
            ${checks.redis?.status === 'ok' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
            <Database size={15} />
            Redis: {checks.redis?.status === 'ok' ? 'Connected' : checks.redis?.status || 'Not configured'}
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
            ${errRate < 5 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
            {errRate < 5 ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            Error rate: {errRate.toFixed(1)}%
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Zap}       label="Avg Response"    value={s.avg_ms != null ? `${s.avg_ms}ms` : '—'}    sub="Last minute"  color={s.avg_ms > 500 ? 'text-red-500' : 'text-indigo-600'} alert={s.avg_ms > 1000} />
          <StatCard icon={TrendingUp} label="p95 Response"   value={s.p95_ms != null ? `${s.p95_ms}ms` : '—'}    sub="95th percentile" color="text-amber-600" />
          <StatCard icon={Activity}   label="Requests/min"   value={s.requests_per_min ?? '—'}                    sub="Last minute"  color="text-emerald-600" />
          <StatCard icon={AlertCircle} label="Error Rate"    value={errRate > 0 ? `${errRate.toFixed(1)}%` : '0%'} sub="4xx + 5xx"   color={errRate > 5 ? 'text-red-500' : 'text-gray-500'} alert={errRate > 5} />
        </div>

        {/* Server info */}
        {info && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon={Server}  label="Node.js"       value={info.node || '—'}           sub="Runtime"          color="text-green-600" />
            <StatCard icon={Clock}   label="Uptime"        value={info.uptime_seconds != null ? `${Math.floor(info.uptime_seconds / 3600)}h ${Math.floor((info.uptime_seconds % 3600) / 60)}m` : '—'} sub="Server uptime" color="text-indigo-600" />
            <StatCard icon={Cpu}     label="Memory"        value={info.memory_mb != null ? `${info.memory_mb} MB` : '—'} sub="RSS usage"    color={info.memory_mb > 400 ? 'text-amber-500' : 'text-gray-600'} />
            <StatCard icon={Database} label="Environment"  value={info.env || '—'}             sub={info.version}     color="text-slate-600" />
          </div>
        )}

        {/* Response time chart */}
        {ts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Response Time — Last 60 Minutes</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="minute" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={9} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit="ms" />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avg_ms"  stroke="#6366f1" strokeWidth={2} dot={false} name="Avg" />
                <Line type="monotone" dataKey="p95_ms"  stroke="#f59e0b" strokeWidth={1.5} dot={false} name="p95" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Request count chart */}
        {ts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Requests — Last 60 Minutes</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={ts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="minute" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={9} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count"  stroke="#10b981" strokeWidth={2} dot={false} name="Requests" />
                <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Errors" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Layout>
  );
}

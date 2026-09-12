import { useState, useEffect, useCallback } from 'react';
import {
  Home, Plus, Search, RefreshCw, Trash2, X, Loader2,
  Users, DoorOpen, LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import {
  getHostels, createHostel, deleteHostel, getSummary,
  getRooms, createRoom, deleteRoom,
  getBoarders, assignBoarder, checkOutBoarder,
} from '../api/hostel';

const TABS = ['Overview', 'Rooms', 'Boarders', 'Add Hostel'];
const ROOM_TYPES   = ['dormitory', 'single', 'double', 'suite'];
const ROOM_STATUS  = { available: 'text-emerald-600', full: 'text-red-500', maintenance: 'text-amber-500' };

export default function HostelPage() {
  const [tab,        setTab]       = useState(0);
  const [hostels,    setHostels]   = useState([]);
  const [rooms,      setRooms]     = useState([]);
  const [boarders,   setBoarders]  = useState([]);
  const [summary,    setSummary]   = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [search,     setSearch]    = useState('');
  const [filterHostel, setFilterHostel] = useState('');

  // Modals
  const [addRoomModal,    setAddRoomModal]    = useState(null);  // hostel_id
  const [assignModal,     setAssignModal]     = useState(null);  // room
  const [checkoutModal,   setCheckoutModal]   = useState(null);  // boarder
  const [deleteModal,     setDeleteModal]     = useState(null);

  // Forms
  const [hostelForm, setHostelForm] = useState({ name: '', type: 'boys', capacity: 50, address: '' });
  const [roomForm,   setRoomForm]   = useState({ room_number: '', capacity: 2, floor: 1, type: 'dormitory', monthly_fee: '' });
  const [assignForm, setAssignForm] = useState({ student_id: '', check_in: new Date().toISOString().slice(0, 10) });
  const [saving,     setSaving]     = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const r = await getSummary();
      setSummary(r.data?.data ?? null);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 0 || tab === 3) {
        const r = await getHostels();
        setHostels(r.data?.data ?? []);
      } else if (tab === 1) {
        const params = filterHostel ? { hostel_id: filterHostel } : {};
        const r = await getRooms(params);
        setRooms(r.data?.data ?? []);
      } else if (tab === 2) {
        const params = { active: true };
        if (filterHostel) params.hostel_id = filterHostel;
        const r = await getBoarders(params);
        setBoarders(r.data?.data ?? []);
      }
    } catch { toast.error('Failed to load data'); }
    finally  { setLoading(false); }
  }, [tab, filterHostel]);

  useEffect(() => { load(); loadSummary(); }, [load, loadSummary]);

  async function handleCreateHostel(e) {
    e.preventDefault();
    if (!hostelForm.name) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      await createHostel(hostelForm);
      toast.success('Hostel created');
      setHostelForm({ name: '', type: 'boys', capacity: 50, address: '' });
      setTab(0);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function handleCreateRoom(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createRoom({ ...roomForm, hostel_id: addRoomModal });
      toast.success('Room created');
      setAddRoomModal(null);
      setRoomForm({ room_number: '', capacity: 2, floor: 1, type: 'dormitory' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!assignForm.student_id) { toast.error('Student ID required'); return; }
    setSaving(true);
    try {
      await assignBoarder({ ...assignForm, student_id: +assignForm.student_id, room_id: assignModal.id });
      toast.success('Student assigned');
      setAssignModal(null);
      load(); loadSummary();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function handleCheckout() {
    setSaving(true);
    try {
      await checkOutBoarder(checkoutModal.id, {});
      toast.success('Student checked out');
      setCheckoutModal(null);
      load(); loadSummary();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    try {
      if (deleteModal.type === 'hostel') await deleteHostel(deleteModal.id);
      else await deleteRoom(deleteModal.id);
      toast.success('Deleted');
      setDeleteModal(null);
      load();
    } catch { toast.error('Failed'); }
  }

  const filteredBoarders = boarders.filter(b =>
    !search || (b.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.roll_number || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Home className="text-green-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hostel Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage boarding facilities, rooms & residents</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Hostels',     value: summary.total_hostels,     color: 'text-blue-600' },
              { label: 'Total Rooms',       value: summary.total_rooms,       color: 'text-purple-600' },
              { label: 'Available Rooms',   value: summary.available_rooms,   color: 'text-emerald-600' },
              { label: 'Active Boarders',   value: summary.active_boarders,   color: 'text-orange-600' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value ?? 0}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === i ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >{t}</button>
          ))}
        </div>

        {loading ? <PageLoader /> : (
          <>
            {/* Overview Tab */}
            {tab === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {hostels.length === 0 && <p className="text-sm text-gray-500 col-span-3">No hostels yet.</p>}
                {hostels.map(h => (
                  <div key={h.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{h.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{h.type} hostel</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setAddRoomModal(h.id); setTab(1); }}
                          className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600" title="Add room"
                        ><Plus size={14} /></button>
                        <button onClick={() => setDeleteModal({ id: h.id, type: 'hostel' })}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400"
                        ><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg py-2">
                        <p className="font-bold text-lg text-gray-800 dark:text-white">{h.room_count}</p>
                        <p className="text-gray-500">Rooms</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg py-2">
                        <p className="font-bold text-lg text-green-600">{h.boarder_count}</p>
                        <p className="text-gray-500">Boarders</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg py-2">
                        <p className="font-bold text-lg text-blue-600">{h.capacity}</p>
                        <p className="text-gray-500">Capacity</p>
                      </div>
                    </div>
                    {h.warden_name && <p className="text-xs text-gray-500">Warden: {h.warden_name}</p>}
                    {h.address     && <p className="text-xs text-gray-400 truncate">{h.address}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Rooms Tab */}
            {tab === 1 && (
              <div className="space-y-4">
                <div className="flex gap-3 flex-wrap">
                  <select value={filterHostel} onChange={e => setFilterHostel(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">All Hostels</option>
                    {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                  <button onClick={() => setAddRoomModal(filterHostel || (hostels[0]?.id))}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  ><Plus size={14} /> Add Room</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {rooms.map(r => (
                    <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="font-bold text-gray-900 dark:text-white">Room {r.room_number}</p>
                        <button onClick={() => setDeleteModal({ id: r.id, type: 'room' })}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400"
                        ><Trash2 size={12} /></button>
                      </div>
                      <p className="text-xs text-gray-500">{r.hostel_name} · Floor {r.floor}</p>
                      <p className="text-xs capitalize text-gray-400">{r.type}</p>
                      {+r.monthly_fee > 0 && <p className="text-xs font-semibold text-emerald-600">Rs {Number(r.monthly_fee).toLocaleString()}/mo</p>}
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold capitalize ${ROOM_STATUS[r.status] || 'text-gray-500'}`}>{r.status}</span>
                        <span className="text-xs text-gray-500">{r.current_occupants}/{r.capacity}</span>
                      </div>
                      {r.status !== 'full' && (
                        <button onClick={() => setAssignModal(r)}
                          className="w-full py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-100 transition-colors"
                        >+ Assign Student</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boarders Tab */}
            {tab === 2 && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search boarders..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                  <select value={filterHostel} onChange={e => setFilterHostel(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">All Hostels</option>
                    {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50">
                          <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Student</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Hostel / Room</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Check In</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredBoarders.length === 0 ? (
                          <tr><td colSpan={4} className="text-center py-10 text-gray-500">No active boarders</td></tr>
                        ) : filteredBoarders.map(b => (
                          <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 dark:text-white">{b.student_name}</p>
                              <p className="text-xs text-gray-500">{b.roll_number}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-gray-800 dark:text-gray-200">{b.hostel_name}</p>
                              <p className="text-xs text-gray-500">Room {b.room_number}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.check_in}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => setCheckoutModal(b)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                              ><LogOut size={12} /> Check Out</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Add Hostel Tab */}
            {tab === 3 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Add New Hostel</h2>
                <form onSubmit={handleCreateHostel} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                    <input value={hostelForm.name} onChange={e => setHostelForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Boys Hostel Block A"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                      <select value={hostelForm.type} onChange={e => setHostelForm(f => ({ ...f, type: e.target.value }))}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                      >
                        <option value="boys">Boys</option>
                        <option value="girls">Girls</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Capacity</label>
                      <input type="number" value={hostelForm.capacity} onChange={e => setHostelForm(f => ({ ...f, capacity: +e.target.value }))}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                    <textarea rows={2} value={hostelForm.address} onChange={e => setHostelForm(f => ({ ...f, address: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white resize-none"
                    />
                  </div>
                  <button type="submit" disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                    Create Hostel
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Room Modal */}
      {addRoomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Add Room</h2>
              <button onClick={() => setAddRoomModal(null)}><X size={18} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Room Number *</label>
                <input value={roomForm.room_number} onChange={e => setRoomForm(f => ({ ...f, room_number: e.target.value }))}
                  placeholder="e.g. 101"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Capacity</label>
                  <input type="number" min="1" value={roomForm.capacity} onChange={e => setRoomForm(f => ({ ...f, capacity: +e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Floor</label>
                  <input type="number" min="1" value={roomForm.floor} onChange={e => setRoomForm(f => ({ ...f, floor: +e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                <select value={roomForm.type} onChange={e => setRoomForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white capitalize"
                >
                  {ROOM_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Monthly Fee (Rs)</label>
                <input type="number" min="0" value={roomForm.monthly_fee} onChange={e => setRoomForm(f => ({ ...f, monthly_fee: e.target.value }))}
                  placeholder="e.g. 3000"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Create Room
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Student Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Assign to Room {assignModal.room_number}</h2>
              <button onClick={() => setAssignModal(null)}><X size={18} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleAssign} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Student ID *</label>
                <input type="number" value={assignForm.student_id} onChange={e => setAssignForm(f => ({ ...f, student_id: e.target.value }))}
                  placeholder="Student ID"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Check-in Date</label>
                <input type="date" value={assignForm.check_in} onChange={e => setAssignForm(f => ({ ...f, check_in: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Users size={14} />} Assign
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Confirm */}
      {checkoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Check Out Student?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Check out <strong>{checkoutModal.student_name}</strong> from Room {checkoutModal.room_number}?
            </p>
            <div className="flex gap-3">
              <button onClick={handleCheckout} disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
              >Check Out</button>
              <button onClick={() => setCheckoutModal(null)}
                className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Delete {deleteModal.type}?</h2>
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

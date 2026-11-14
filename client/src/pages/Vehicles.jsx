import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import api, { errMsg } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import useDebounce from '../hooks/useDebounce.js';
import VehicleForm from '../components/VehicleForm.jsx';
import { Badge, EmptyState, ErrorBanner, Modal, PageHeader, PageLoader, Pager, SimBadge, Spinner } from '../components/ui.jsx';
import { VEHICLE_TYPES } from '../utils/constants.js';
import { fmtDateTime } from '../utils/format.js';

export default function Vehicles() {
  const { isAdmin } = useAuth();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState(params.get('status') || '');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | {} (new) | vehicle
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const q = useDebounce(search);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/vehicles', { params: { search: q, type, status, page, limit: 15 } });
      setData(d);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q, type, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [q, type, status]);

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.delete(`/vehicles/${deleting._id}`);
      setDeleting(null);
      load();
    } catch (e) {
      setError(errMsg(e));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Vehicles" subtitle="Registered vehicles and their current status">
        {isAdmin && <button className="btn-primary" onClick={() => setEditing({})}><Plus className="h-4 w-4" /> Add vehicle</button>}
      </PageHeader>
      <ErrorBanner message={error} />

      <div className="card mt-4 overflow-hidden">
        <div className="grid gap-3 p-4 sm:grid-cols-[1fr_160px_160px]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Search by vehicle number" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search by vehicle number" /></div>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type"><option value="">All types</option>{VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option><option value="INSIDE">Inside</option><option value="OUTSIDE">Outside</option></select>
        </div>

        {loading && !data ? <PageLoader /> : data?.items.length ? (
          <div className={`overflow-x-auto border-t border-slate-200 ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className="th">Vehicle</th><th className="th">Type</th><th className="th">Driver</th><th className="th">Status</th><th className="th">Last entry</th><th className="th">Last exit</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50/70">
                    <td className="td"><Link to={`/vehicles/${v._id}`} className="font-bold text-brand-800 hover:underline">{v.regNumber}</Link>{v.isDemo && <span className="ml-2"><SimBadge text="Demo" /></span>}<div className="text-xs text-slate-500">{v.model || '—'}</div></td>
                    <td className="td">{v.type}</td>
                    <td className="td">{v.driverName}<div className="text-xs text-slate-500">{v.driverContact}</div></td>
                    <td className="td"><Badge value={v.status} /></td>
                    <td className="td">{fmtDateTime(v.entryTime)}</td>
                    <td className="td">{fmtDateTime(v.exitTime)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <Link to={`/vehicles/${v._id}`} className="btn-ghost" aria-label={`View ${v.regNumber}`}><Eye className="h-4 w-4" /></Link>
                        {isAdmin && <button className="btn-ghost" onClick={() => setEditing(v)} aria-label={`Edit ${v.regNumber}`}><Pencil className="h-4 w-4" /></button>}
                        {isAdmin && <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={() => setDeleting(v)} aria-label={`Delete ${v.regNumber}`}><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="border-t border-slate-200"><EmptyState title="No vehicles found" hint={search || type || status ? 'Try clearing the filters.' : 'Add a vehicle, or record an entry to register one automatically.'} /></div>}
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>

      {editing && (
        <Modal title={editing._id ? `Edit ${editing.regNumber}` : 'Add vehicle'} onClose={() => setEditing(null)}>
          <VehicleForm vehicle={editing._id ? editing : null} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete vehicle" onClose={() => setDeleting(null)}>
          <p className="text-sm text-slate-600">Delete <strong>{deleting.regNumber}</strong> together with its entry records, GPS history and alerts? This cannot be undone.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setDeleting(null)}>Cancel</button>
            <button className="btn-danger" onClick={confirmDelete} disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />} Delete vehicle</button>
          </div>
        </Modal>
      )}
    </>
  );
}

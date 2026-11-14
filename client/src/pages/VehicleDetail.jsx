import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Route } from 'lucide-react';
import api, { errMsg } from '../services/api.js';
import VehicleMap from '../components/VehicleMap.jsx';
import { Badge, EmptyState, ErrorBanner, PageHeader, PageLoader, SimBadge } from '../components/ui.jsx';
import { fmtCoord, fmtDateTime, fmtDuration, timeAgo } from '../utils/format.js';

const Item = ({ label, children }) => <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 font-semibold">{children || '—'}</dd></div>;

export default function VehicleDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/vehicles/${id}`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [id]);

  if (!data) return error ? <ErrorBanner message={error} /> : <PageLoader />;
  const { vehicle: v, entries, historyPoints } = data;

  return (
    <>
      <Link to="/vehicles" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" /> All vehicles</Link>
      <PageHeader title={v.regNumber} subtitle={`${v.type}${v.model ? ` · ${v.model}` : ''}`}>
        {v.isDemo && <SimBadge text="Demo vehicle" />}
        <Badge value={v.status} />
        <Link to={`/routes?vehicle=${v._id}`} className="btn-secondary"><Route className="h-4 w-4" /> Route history</Link>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-bold text-brand-950">Details</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <Item label="Driver">{v.driverName}</Item>
            <Item label="Driver contact">{v.driverContact}</Item>
            <Item label="Entry time">{fmtDateTime(v.entryTime)}</Item>
            <Item label="Exit time">{fmtDateTime(v.exitTime)}</Item>
            <Item label="GPS tracking">{v.tracking?.active ? 'Active' : 'Not tracking'}</Item>
            <Item label="Recorded GPS points">{historyPoints}</Item>
            <Item label="Last coordinates">{v.location ? `${fmtCoord(v.location.lat)}, ${fmtCoord(v.location.lng)}` : 'No GPS location recorded'}</Item>
            <Item label="Last location update">{v.location?.updatedAt ? `${timeAgo(v.location.updatedAt)}${v.location.accuracy ? ` · ±${Math.round(v.location.accuracy)} m` : ''}` : ''}</Item>
          </dl>
          {v.location?.isSimulated && <div className="mt-4"><SimBadge text="Location is simulated demo data" /></div>}
        </section>

        <section className="card h-80 overflow-hidden lg:h-auto">
          {v.location ? <VehicleMap vehicles={[v]} selectedId={v._id} /> : <EmptyState title="No location on the map" hint="This vehicle has no recorded GPS position yet." />}
        </section>
      </div>

      <section className="card mt-5 overflow-hidden">
        <h2 className="px-4 py-3 font-bold text-brand-950">Recent entries and exits</h2>
        {entries.length ? (
          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className="th">Entry</th><th className="th">Exit</th><th className="th">Duration</th><th className="th">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((e) => <tr key={e._id}><td className="td">{fmtDateTime(e.entryTime)}</td><td className="td">{fmtDateTime(e.exitTime)}</td><td className="td">{fmtDuration(e.durationMinutes)}</td><td className="td"><Badge value={e.status} /></td></tr>)}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No entries recorded" />}
      </section>
    </>
  );
}

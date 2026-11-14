import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../services/api.js';
import RouteMap from '../components/RouteMap.jsx';
import { EmptyState, ErrorBanner, Field, PageHeader, SimBadge, Spinner } from '../components/ui.jsx';
import { fmtCoord, fmtDateTime, toLocalInput } from '../utils/format.js';
import { pathLengthKm } from '../utils/geo.js';

export default function RouteHistory() {
  const [params] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState(params.get('vehicle') || '');
  const [from, setFrom] = useState(toLocalInput(new Date(Date.now() - 24 * 3600 * 1000)));
  const [to, setTo] = useState(toLocalInput(new Date()));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/vehicles', { params: { limit: 200 } }).then((r) => setVehicles(r.data.items)).catch((e) => setError(errMsg(e))); }, []);

  async function run(e) {
    e?.preventDefault();
    if (!vehicleId) return setError('Select a vehicle.');
    if (new Date(from) > new Date(to)) return setError('The start must be before the end.');
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/tracking/history', { params: { vehicleId, from: new Date(from).toISOString(), to: new Date(to).toISOString() } });
      setResult(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  const pts = result?.points || [];
  const listed = pts.slice(0, 300);

  return (
    <>
      <PageHeader title="Route history" subtitle="Recorded GPS positions for a vehicle" />
      <form onSubmit={run} className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end">
        <Field label="Vehicle"><select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required><option value="">Select a vehicle…</option>{vehicles.map((v) => <option key={v._id} value={v._id}>{v.regNumber} · {v.driverName}</option>)}</select></Field>
        <Field label="From"><input type="datetime-local" className="input" value={from} onChange={(e) => setFrom(e.target.value)} required /></Field>
        <Field label="To"><input type="datetime-local" className="input" value={to} onChange={(e) => setTo(e.target.value)} required /></Field>
        <button className="btn-primary" disabled={loading}>{loading && <Spinner className="h-4 w-4 !text-white" />} Show route</button>
      </form>
      <div className="mt-4"><ErrorBanner message={error} /></div>

      {result && (
        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          <section className="card h-[560px] overflow-hidden lg:col-span-2">
            <RouteMap points={pts} entries={result.entries} />
          </section>
          <section className="card flex max-h-[560px] flex-col overflow-hidden">
            <div className="space-y-2 p-4">
              <h2 className="font-bold text-brand-950">{result.vehicle.regNumber}</h2>
              {result.hasSimulated && <SimBadge text="Contains simulated demo GPS data" />}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-slate-500">Recorded points</dt><dd className="font-semibold">{result.total}</dd></div>
                <div><dt className="text-xs text-slate-500">Distance (straight segments)</dt><dd className="font-semibold">{pts.length > 1 ? `${pathLengthKm(pts).toFixed(2)} km` : '—'}</dd></div>
                <div><dt className="text-xs text-slate-500">First point</dt><dd className="font-semibold">{fmtDateTime(pts[0]?.recordedAt)}</dd></div>
                <div><dt className="text-xs text-slate-500">Last point</dt><dd className="font-semibold">{fmtDateTime(pts[pts.length - 1]?.recordedAt)}</dd></div>
              </dl>
            </div>
            {pts.length ? (
              <div className="flex-1 overflow-y-auto border-t border-slate-200">
                <table className="w-full"><thead className="sticky top-0 bg-slate-50"><tr><th className="th">Time</th><th className="th">Latitude</th><th className="th">Longitude</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 text-xs">{listed.map((p, i) => <tr key={i}><td className="px-4 py-2">{fmtDateTime(p.recordedAt)}</td><td className="px-4 py-2">{fmtCoord(p.lat)}</td><td className="px-4 py-2">{fmtCoord(p.lng)}</td></tr>)}</tbody></table>
                {pts.length > listed.length && <p className="p-3 text-xs text-slate-500">Showing the first {listed.length} of {pts.length} points. All points are drawn on the map.</p>}
              </div>
            ) : <div className="border-t border-slate-200"><EmptyState title="No GPS history for this period" hint="Nothing was recorded for this vehicle between these times. Try a wider range." /></div>}
          </section>
        </div>
      )}
    </>
  );
}

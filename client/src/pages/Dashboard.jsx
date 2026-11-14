import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bell, Car, LogIn, LogOut, ParkingSquare, Radio, Timer } from 'lucide-react';
import api, { errMsg } from '../services/api.js';
import useLiveVehicles from '../hooks/useLiveVehicles.js';
import useSocketEvent from '../hooks/useSocketEvent.js';
import useNow from '../hooks/useNow.js';
import VehicleMap from '../components/VehicleMap.jsx';
import { Badge, EmptyState, ErrorBanner, PageHeader, PageLoader, SimBadge } from '../components/ui.jsx';
import { fmtDateTime, fmtDuration, minutesSince, timeAgo } from '../utils/format.js';

const TONES = {
  green: 'bg-brand-100 text-brand-700',
  slate: 'bg-slate-100 text-slate-600',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-700',
};

function Stat({ label, value, icon: Icon, tone = 'green', to }) {
  const body = (
    <div className="card flex items-center gap-4 p-4 transition-colors hover:border-brand-300">
      <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${TONES[tone]}`}><Icon className="h-5 w-5" /></span>
      <div><div className="text-2xl font-extrabold leading-none text-brand-950">{value}</div><div className="mt-1 text-sm text-slate-500">{label}</div></div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [geofences, setGeofences] = useState([]);
  const { vehicles, error: liveError } = useLiveVehicles();
  const now = useNow();
  const timer = useRef();

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get('/dashboard', { params: { tzOffset: new Date().getTimezoneOffset() } });
      setData(d);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => {
    load();
    api.get('/geofences').then((r) => setGeofences(r.data.items)).catch(() => {});
  }, [load]);

  const refresh = () => { clearTimeout(timer.current); timer.current = setTimeout(load, 700); };
  useEffect(() => () => clearTimeout(timer.current), []);
  useSocketEvent('vehicle:status', refresh);
  useSocketEvent('alert:new', refresh);
  useSocketEvent('alert:resolved', refresh);
  useSocketEvent('tracking:stopped', refresh);

  if (!data) return error ? <ErrorBanner message={error} onRetry={load} /> : <PageLoader />;
  const s = data.stats;
  const hasSim = vehicles.some((v) => v.location?.isSimulated);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Overstay limit: ${fmtDuration(data.maxParkingMinutes)}`} />
      <ErrorBanner message={error || liveError} onRetry={load} />

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Registered vehicles" value={s.totalVehicles} icon={Car} to="/vehicles" />
        <Stat label="Inside now" value={s.inside} icon={ParkingSquare} to="/vehicles?status=INSIDE" />
        <Stat label="Outside" value={s.outside} icon={ArrowUpRight} tone="slate" to="/vehicles?status=OUTSIDE" />
        <Stat label="GPS tracking active" value={s.activeTracking} icon={Radio} tone="blue" to="/live" />
        <Stat label="Entries today" value={s.entriesToday} icon={LogIn} />
        <Stat label="Exits today" value={s.exitsToday} icon={LogOut} tone="slate" />
        <Stat label="Overstaying" value={s.overstay} icon={Timer} tone={s.overstay ? 'red' : 'slate'} />
        <Stat label="Open alerts" value={s.openAlerts} icon={Bell} tone={s.openAlerts ? 'red' : 'slate'} to="/alerts" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="font-bold text-brand-950">Live vehicle map</h2>
            <div className="flex items-center gap-2">{hasSim && <SimBadge text="Includes simulated demo vehicles" />}<Link to="/live" className="text-sm font-semibold text-brand-700 hover:underline">Open full map</Link></div>
          </div>
          <div className="h-[420px] border-t border-slate-200">
            <VehicleMap vehicles={vehicles} geofences={geofences} />
          </div>
          {!vehicles.length && <p className="border-t border-slate-200 px-4 py-2 text-sm text-slate-500">No vehicle is being tracked right now. Start tracking from the Live map page.</p>}
        </section>

        <section className="card">
          <h2 className="px-4 py-3 font-bold text-brand-950">Recent alerts</h2>
          {data.recentAlerts.length ? (
            <ul className="divide-y divide-slate-100 border-t border-slate-200">
              {data.recentAlerts.map((a) => (
                <li key={a._id} className="px-4 py-3 text-sm">
                  <div className="mb-1 flex items-center justify-between gap-2"><Badge value={a.type} /><span className="text-xs text-slate-400">{timeAgo(a.createdAt, now)}</span></div>
                  <div className="font-semibold">{a.regNumber}</div>
                  <div className="text-slate-600">
                    {a.type === 'OVERSTAY' && a.entry?.status === 'ACTIVE' ? `Parked for ${fmtDuration(minutesSince(a.entry.entryTime, now))}` : a.message}
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No open alerts" hint="Overstay and geofence alerts appear here." />}
          <div className="border-t border-slate-200 px-4 py-3 text-sm"><Link to="/alerts" className="font-semibold text-brand-700 hover:underline">View all alerts</Link></div>
        </section>
      </div>

      <section className="card mt-5 overflow-hidden">
        <h2 className="px-4 py-3 font-bold text-brand-950">Recent vehicle activity</h2>
        {data.recentActivity.length ? (
          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className="th">Vehicle</th><th className="th">Driver</th><th className="th">Activity</th><th className="th">Time</th><th className="th">Parked</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentActivity.map((a) => (
                  <tr key={a._id}>
                    <td className="td font-semibold">{a.regNumber} <span className="font-normal text-slate-500">· {a.vehicleType}</span></td>
                    <td className="td">{a.driverName}</td>
                    <td className="td"><Badge value={a.kind} label={a.kind === 'ENTRY' ? 'Entered' : 'Exited'} /></td>
                    <td className="td">{fmtDateTime(a.time)}</td>
                    <td className="td">{a.kind === 'EXIT' ? fmtDuration(a.durationMinutes) : fmtDuration(minutesSince(a.time, now))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No activity yet" hint="Record an entry on the Entry & exit page, or load demo data." />}
      </section>
    </>
  );
}

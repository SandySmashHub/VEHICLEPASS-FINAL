import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import api from '../services/api.js';
import useLiveVehicles from '../hooks/useLiveVehicles.js';
import useNow from '../hooks/useNow.js';
import VehicleMap from '../components/VehicleMap.jsx';
import TrackingPanel from '../components/TrackingPanel.jsx';
import NearbyPanel from '../components/NearbyPanel.jsx';
import { Badge, EmptyState, ErrorBanner, PageHeader, SimBadge } from '../components/ui.jsx';
import { timeAgo } from '../utils/format.js';

const TABS = [['track', 'Track'], ['vehicles', 'Vehicles'], ['nearby', 'Nearby']];

export default function LiveMap() {
  const { vehicles, error, reload } = useLiveVehicles();
  const [tab, setTab] = useState('track');
  const [selectedId, setSelectedId] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [nearby, setNearby] = useState(null);
  const [geofences, setGeofences] = useState([]);
  const [q, setQ] = useState('');
  const now = useNow(10000);

  useEffect(() => { api.get('/geofences').then((r) => setGeofences(r.data.items)).catch(() => {}); }, []);

  const filtered = useMemo(() => vehicles.filter((v) => v.regNumber.includes(q.replace(/[\s-]/g, '').toUpperCase())), [vehicles, q]);
  const mapVehicles = nearby ? nearby.items.map((n) => vehicles.find((v) => v._id === n._id) || n) : vehicles;

  return (
    <>
      <PageHeader title="Live map" subtitle={`${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'} currently tracked`} />
      <ErrorBanner message={error} onRetry={reload} />
      <div className="mt-4 flex flex-col gap-4 lg:h-[calc(100vh-10rem)] lg:flex-row">
        <aside className="card flex w-full shrink-0 flex-col overflow-hidden lg:w-[24rem]">
          <div className="flex border-b border-slate-200" role="tablist">
            {TABS.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`flex-1 px-3 py-3 text-sm font-semibold ${tab === id ? 'border-b-2 border-brand-600 text-brand-800' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {tab === 'track' && <TrackingPanel onPosition={setUserPos} />}
            {tab === 'nearby' && <NearbyPanel result={nearby} onResult={(r) => { setNearby(r); if (r) setUserPos(r.origin); }} onSelect={setSelectedId} selectedId={selectedId} />}
            {tab === 'vehicles' && (
              <div className="space-y-3">
                <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Search registration number" value={q} onChange={(e) => setQ(e.target.value)} /></div>
                {filtered.length ? (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {filtered.map((v) => (
                      <li key={v._id}>
                        <button onClick={() => setSelectedId(v._id)} className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 ${selectedId === v._id ? 'bg-brand-50' : ''}`}>
                          <span><strong>{v.regNumber}</strong><br /><span className="text-xs text-slate-500">{v.driverName} · {timeAgo(v.location?.updatedAt, now)}</span></span>
                          <span className="flex flex-col items-end gap-1"><Badge value={v.status} />{v.location?.isSimulated && <SimBadge text="Simulated" />}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <EmptyState title="No tracked vehicles" hint="A vehicle appears here while someone is tracking it." />}
              </div>
            )}
          </div>
        </aside>
        <div className="card min-h-[60vh] flex-1 overflow-hidden lg:min-h-0">
          <VehicleMap vehicles={mapVehicles} selectedId={selectedId} onSelect={setSelectedId} userPos={userPos} geofences={geofences} radiusKm={nearby?.radiusKm} />
        </div>
      </div>
    </>
  );
}

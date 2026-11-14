import { useState } from 'react';
import { Navigation, X } from 'lucide-react';
import api, { errMsg } from '../services/api.js';
import useGeolocation from '../hooks/useGeolocation.js';
import { fmtKm } from '../utils/format.js';
import { Badge, ErrorBanner, Spinner } from './ui.jsx';

/** Lists tracked vehicles within a radius of this device's GPS position and reports results to the map. */
export default function NearbyPanel({ result, onResult, onSelect, selectedId }) {
  const { getCurrent } = useGeolocation();
  const [radius, setRadius] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function search(r = radius) {
    setBusy(true);
    setError('');
    try {
      const pos = await getCurrent();
      const { data } = await api.get('/tracking/nearby', { params: { lat: pos.lat, lng: pos.lng, radiusKm: r } });
      onResult({ items: data.items, origin: { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy }, radiusKm: r });
    } catch (e) {
      setError(e.response ? errMsg(e) : e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="radius">Distance: <strong>{radius} km</strong></label>
        <input id="radius" type="range" min="1" max="100" value={radius} onChange={(e) => setRadius(Number(e.target.value))} onMouseUp={() => result && search()} onTouchEnd={() => result && search()} className="w-full accent-brand-700" />
      </div>
      <div className="flex gap-2">
        <button className="btn-primary flex-1" onClick={() => search()} disabled={busy}>
          {busy ? <Spinner className="h-4 w-4 !text-white" /> : <Navigation className="h-4 w-4" />} Find vehicles near me
        </button>
        {result && <button className="btn-secondary" onClick={() => onResult(null)} aria-label="Clear nearby results"><X className="h-4 w-4" /></button>}
      </div>
      <ErrorBanner message={error} />
      {result && (
        <>
          <p className="text-sm text-slate-600">{result.items.length} tracked vehicle{result.items.length === 1 ? '' : 's'} within {result.radiusKm} km</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {result.items.map((v) => (
              <li key={v._id}>
                <button onClick={() => onSelect(v._id)} className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 ${selectedId === v._id ? 'bg-brand-50' : ''}`}>
                  <span><strong>{v.regNumber}</strong><br /><span className="text-xs text-slate-500">{v.driverName}</span></span>
                  <span className="flex flex-col items-end gap-1"><Badge value={v.status} /><span className="text-xs font-semibold text-slate-600">{fmtKm(v.distanceKm)}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

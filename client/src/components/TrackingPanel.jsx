import { useCallback, useEffect, useRef, useState } from 'react';
import { Crosshair, Play, Square } from 'lucide-react';
import api, { errMsg } from '../services/api.js';
import useGeolocation from '../hooks/useGeolocation.js';
import { SEND_INTERVAL_MS } from '../utils/constants.js';
import { fmtCoord, fmtTime } from '../utils/format.js';
import { ErrorBanner, Field, WarnBanner } from './ui.jsx';

const PERMISSION_TEXT = { granted: 'Location allowed', denied: 'Location blocked', prompt: 'Will ask for permission', unknown: 'Permission not checked' };

/** Streams this device's GPS position to the server for one selected vehicle. */
export default function TrackingPanel({ onPosition }) {
  const { position, error: gpsError, permission, getCurrent } = useGeolocation();
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [active, setActive] = useState(false);
  const [lastSent, setLastSent] = useState(null);
  const [warn, setWarn] = useState('');
  const [error, setError] = useState('');
  const lastSentAt = useRef(0);
  const trackedId = useRef('');

  useEffect(() => {
    api.get('/vehicles', { params: { limit: 200 } }).then((r) => setVehicles(r.data.items)).catch((e) => setError(errMsg(e)));
  }, []);

  const send = useCallback(async (pos) => {
    if (pos.accuracy > 500) { setWarn(`Accuracy is too low (±${Math.round(pos.accuracy)} m). This update was not sent.`); return; }
    setWarn('');
    lastSentAt.current = Date.now();
    try {
      await api.post('/tracking/location', { vehicleId: trackedId.current, lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, speed: pos.speed ?? null });
      setLastSent(new Date());
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  // Poll for a fresh fix while tracking is active.
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(async () => {
      try {
        const pos = await getCurrent();
        onPosition?.(pos);
        await send(pos);
      } catch (e) {
        setError(e.message);
      }
    }, SEND_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active, getCurrent, onPosition, send]);

  // Leaving the page stops sending, so also tell the server.
  const activeRef = useRef(false);
  activeRef.current = active;
  useEffect(() => () => {
    if (activeRef.current) api.post('/tracking/stop', { vehicleId: trackedId.current }).catch(() => {});
  }, []);

  async function locateMe() {
    setError('');
    try { onPosition?.(await getCurrent()); } catch (e) { setError(e.message); }
  }

  async function start() {
    setError('');
    if (!vehicleId) return setError('Select the vehicle this device is travelling in.');
    try {
      const pos = await getCurrent(); // triggers the browser permission prompt
      trackedId.current = vehicleId;
      setActive(true);
      onPosition?.(pos);
      await send(pos);
    } catch (e) {
      setError(e.message);
    }
  }

  async function stop() {
    setActive(false);
    try { await api.post('/tracking/stop', { vehicleId: trackedId.current }); } catch (e) { setError(errMsg(e)); }
  }

  return (
    <div className="space-y-4">
      <Field label="Vehicle to track">
        <select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} disabled={active}>
          <option value="">Select a vehicle…</option>
          {vehicles.map((v) => <option key={v._id} value={v._id}>{v.regNumber} · {v.driverName}</option>)}
        </select>
      </Field>

      <div className="flex gap-2">
        {!active ? (
          <button className="btn-primary flex-1" onClick={start}><Play className="h-4 w-4" /> Start tracking</button>
        ) : (
          <button className="btn-danger flex-1" onClick={stop}><Square className="h-4 w-4" /> Stop tracking</button>
        )}
        <button className="btn-secondary" onClick={locateMe} title="Show my location on the map"><Crosshair className="h-4 w-4" /> Locate me</button>
      </div>

      <ErrorBanner message={error || gpsError} />
      <WarnBanner message={warn} />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-slate-50 p-4 text-sm">
        <div><dt className="text-xs text-slate-500">Latitude</dt><dd className="font-semibold">{fmtCoord(position?.lat)}</dd></div>
        <div><dt className="text-xs text-slate-500">Longitude</dt><dd className="font-semibold">{fmtCoord(position?.lng)}</dd></div>
        <div><dt className="text-xs text-slate-500">GPS accuracy</dt><dd className="font-semibold">{position ? `±${Math.round(position.accuracy)} m` : '—'}</dd></div>
        <div><dt className="text-xs text-slate-500">Last location update</dt><dd className="font-semibold">{position ? fmtTime(position.timestamp) : '—'}</dd></div>
        <div><dt className="text-xs text-slate-500">Sent to server</dt><dd className="font-semibold">{lastSent ? fmtTime(lastSent) : '—'}</dd></div>
        <div><dt className="text-xs text-slate-500">Browser permission</dt><dd className="font-semibold">{PERMISSION_TEXT[permission]}</dd></div>
      </dl>

      <p className="text-xs text-slate-500">
        Tracking only runs while this page stays open in your browser. Closing the tab, locking the phone or losing signal stops updates, and the vehicle drops off the live map after a few minutes.
      </p>
    </div>
  );
}

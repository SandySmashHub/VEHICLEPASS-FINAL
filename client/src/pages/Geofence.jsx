import { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import api, { errMsg } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import useGeolocation from '../hooks/useGeolocation.js';
import { Badge, EmptyState, ErrorBanner, Field, PageHeader, PageLoader, Spinner } from '../components/ui.jsx';
import { DEFAULT_CENTER } from '../utils/constants.js';
import { fmtDateTime } from '../utils/format.js';

function MapBehaviour({ fences, onClick, flyTo }) {
  const map = useMap();
  useMapEvents({ click: (e) => onClick?.(e.latlng) });
  useEffect(() => {
    const pts = fences.flatMap((f) => f.polygon.map((p) => [p.lat, p.lng]));
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
    setTimeout(() => map.invalidateSize(), 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fences.length]);
  useEffect(() => { if (flyTo) map.flyTo([flyTo.lat, flyTo.lng], 16); }, [flyTo, map]);
  return null;
}

const blank = { name: '', description: '', active: true, polygon: [] };

export default function Geofence() {
  const { isAdmin } = useAuth();
  const geo = useGeolocation();
  const [fences, setFences] = useState(null);
  const [events, setEvents] = useState([]);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flyTo, setFlyTo] = useState(null);

  const load = useCallback(async () => {
    try {
      const [f, e] = await Promise.all([api.get('/geofences'), api.get('/geofences/events')]);
      setFences(f.data.items);
      setEvents(e.data.items);
      setError('');
    } catch (err) {
      setError(errMsg(err));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addPoint = (ll) => draft && setDraft((d) => ({ ...d, polygon: [...d.polygon, { lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) }] }));

  async function save() {
    if (draft.polygon.length < 3) return setError('Click at least 3 points on the map to outline the boundary.');
    setBusy(true);
    setError('');
    try {
      const body = { name: draft.name, description: draft.description, active: draft.active, polygon: draft.polygon };
      if (draft._id) await api.put(`/geofences/${draft._id}`, body);
      else await api.post('/geofences', body);
      setDraft(null);
      load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(f) {
    if (!window.confirm(`Delete geofence "${f.name}"?`)) return;
    try { await api.delete(`/geofences/${f._id}`); load(); } catch (err) { setError(errMsg(err)); }
  }

  async function locate() {
    try { const p = await geo.getCurrent(); setFlyTo({ lat: p.lat, lng: p.lng }); } catch (e) { setError(e.message); }
  }

  if (!fences) return error ? <ErrorBanner message={error} onRetry={load} /> : <PageLoader />;
  const shownFences = fences.filter((f) => f._id !== draft?._id);

  return (
    <>
      <PageHeader title="Geofencing" subtitle="Alerts are created when a tracked vehicle crosses an active boundary">
        {isAdmin && !draft && <button className="btn-primary" onClick={() => setDraft({ ...blank })}><Plus className="h-4 w-4" /> New geofence</button>}
      </PageHeader>
      <ErrorBanner message={error} />

      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        <section className="card h-[520px] overflow-hidden lg:col-span-2">
          <MapContainer center={DEFAULT_CENTER} zoom={5} scrollWheelZoom className="h-full w-full" style={{ cursor: draft ? 'crosshair' : undefined }}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
            <MapBehaviour fences={fences} onClick={addPoint} flyTo={flyTo} />
            {shownFences.map((f) => (
              <Polygon key={f._id} positions={f.polygon.map((p) => [p.lat, p.lng])} pathOptions={{ color: f.active ? '#15803d' : '#94a3b8', weight: 2, dashArray: '6 4', fillOpacity: 0.08 }}><Tooltip sticky>{f.name}{f.active ? '' : ' (inactive)'}</Tooltip></Polygon>
            ))}
            {draft && draft.polygon.length > 1 && <Polygon positions={draft.polygon.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#2563eb', weight: 3, fillOpacity: 0.12 }} />}
            {draft?.polygon.map((p, i) => <CircleMarker key={i} center={[p.lat, p.lng]} radius={5} pathOptions={{ color: '#2563eb', fillColor: '#fff', fillOpacity: 1 }} />)}
          </MapContainer>
        </section>

        <section className="space-y-4">
          {draft ? (
            <div className="card space-y-4 p-4">
              <h2 className="font-bold text-brand-950">{draft._id ? 'Edit geofence' : 'New geofence'}</h2>
              <Field label="Name"><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></Field>
              <Field label="Description (optional)"><input className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-brand-700" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label>
              <p className="text-sm text-slate-600">Click the map to place boundary corners. <strong>{draft.polygon.length}</strong> point{draft.polygon.length === 1 ? '' : 's'} placed.</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={() => setDraft((d) => ({ ...d, polygon: d.polygon.slice(0, -1) }))} disabled={!draft.polygon.length}><Undo2 className="h-4 w-4" /> Undo</button>
                <button className="btn-secondary" onClick={() => setDraft((d) => ({ ...d, polygon: [] }))} disabled={!draft.polygon.length}>Clear points</button>
                <button className="btn-secondary" onClick={locate}><Crosshair className="h-4 w-4" /> My location</button>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                <button className="btn-secondary" onClick={() => setDraft(null)}>Cancel</button>
                <button className="btn-primary" onClick={save} disabled={busy || !draft.name.trim()}>{busy && <Spinner className="h-4 w-4 !text-white" />} Save geofence</button>
              </div>
            </div>
          ) : (
            <div className="card">
              <h2 className="px-4 py-3 font-bold text-brand-950">Boundaries</h2>
              {fences.length ? (
                <ul className="divide-y divide-slate-100 border-t border-slate-200">
                  {fences.map((f) => (
                    <li key={f._id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                      <div><div className="font-semibold">{f.name}</div><div className="text-xs text-slate-500">{f.polygon.length} points{f.isDemo ? ' · demo' : ''}</div></div>
                      <div className="flex items-center gap-1"><Badge value={f.active ? 'ACTIVE' : 'DISABLED'} label={f.active ? 'Active' : 'Inactive'} />
                        {isAdmin && <><button className="btn-ghost" onClick={() => setDraft(f)} aria-label={`Edit ${f.name}`}><Pencil className="h-4 w-4" /></button><button className="btn-ghost text-red-600 hover:bg-red-50" onClick={() => remove(f)} aria-label={`Delete ${f.name}`}><Trash2 className="h-4 w-4" /></button></>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState title="No geofence yet" hint={isAdmin ? 'Create one to get boundary alerts.' : 'An administrator can create one.'} />}
            </div>
          )}
        </section>
      </div>

      <section className="card mt-5 overflow-hidden">
        <h2 className="px-4 py-3 font-bold text-brand-950">Boundary event history</h2>
        {events.length ? (
          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full"><thead className="bg-slate-50"><tr><th className="th">Time</th><th className="th">Vehicle</th><th className="th">Event</th><th className="th">Geofence</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{events.map((e) => <tr key={e._id}><td className="td">{fmtDateTime(e.occurredAt)}</td><td className="td font-semibold">{e.regNumber}</td><td className="td"><Badge value={e.type} label={e.type === 'ENTER' ? 'Entered' : 'Left'} /></td><td className="td">{e.geofenceName}</td></tr>)}</tbody></table>
          </div>
        ) : <div className="border-t border-slate-200"><EmptyState title="No boundary events yet" /></div>}
      </section>
    </>
  );
}

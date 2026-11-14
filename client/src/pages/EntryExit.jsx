import { useCallback, useEffect, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import api, { errMsg } from '../services/api.js';
import useGeolocation from '../hooks/useGeolocation.js';
import useDebounce from '../hooks/useDebounce.js';
import useNow from '../hooks/useNow.js';
import useSocketEvent from '../hooks/useSocketEvent.js';
import { Badge, EmptyState, ErrorBanner, Field, Modal, PageHeader, PageLoader, SuccessBanner, Spinner, WarnBanner } from '../components/ui.jsx';
import { VEHICLE_TYPES } from '../utils/constants.js';
import { fmtCoord, fmtDateTime, fmtDuration, minutesSince, normalizeReg } from '../utils/format.js';

const EMPTY = { regNumber: '', type: 'Car', driverName: '', driverContact: '', model: '' };

function GpsStatus({ geo }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
      <span>
        {geo.position ? <>Captured <strong>{fmtCoord(geo.position.lat)}, {fmtCoord(geo.position.lng)}</strong> (±{Math.round(geo.position.accuracy)} m)</> : 'Your GPS location is captured when you save. Your browser will ask for permission.'}
      </span>
    </div>
  );
}

function EntryForm({ onDone }) {
  const geo = useGeolocation();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gpsFailed, setGpsFailed] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'regNumber' ? normalizeReg(e.target.value) : e.target.value }));

  // Fill driver details when the number belongs to a known vehicle.
  async function lookup() {
    if (form.regNumber.length < 4) return;
    try {
      const { data } = await api.get('/vehicles', { params: { search: form.regNumber, limit: 5 } });
      const v = data.items.find((x) => x.regNumber === form.regNumber);
      if (v) setForm((f) => ({ ...f, type: v.type, driverName: f.driverName || v.driverName, driverContact: f.driverContact || v.driverContact, model: f.model || v.model }));
    } catch { /* lookup is a convenience only */ }
  }

  async function submit(e, withoutGps = false) {
    e?.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      let location = null;
      if (!withoutGps) {
        try {
          const p = await geo.getCurrent();
          location = { lat: p.lat, lng: p.lng, accuracy: p.accuracy };
        } catch (err) {
          setGpsFailed(err.message);
          return;
        }
      }
      const { data } = await api.post('/entries/entry', { ...form, location });
      setSuccess(`Entry recorded for ${data.vehicle.regNumber}${location ? '' : ' without a GPS location'}.`);
      setForm(EMPTY);
      setGpsFailed('');
      onDone();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card max-w-2xl space-y-4 p-5">
      <SuccessBanner message={success} />
      <ErrorBanner message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Registration number"><input className="input text-base font-bold" required minLength={4} maxLength={15} value={form.regNumber} onChange={set('regNumber')} onBlur={lookup} placeholder="MH43AB1234" autoComplete="off" /></Field>
        <Field label="Vehicle type"><select className="input" value={form.type} onChange={set('type')}>{VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Driver name"><input className="input" required minLength={2} value={form.driverName} onChange={set('driverName')} /></Field>
        <Field label="Driver contact"><input className="input" required inputMode="tel" value={form.driverContact} onChange={set('driverContact')} placeholder="+91 98765 43210" /></Field>
        <div className="sm:col-span-2"><Field label="Vehicle model (optional)"><input className="input" value={form.model} onChange={set('model')} /></Field></div>
      </div>
      <GpsStatus geo={geo} />
      {gpsFailed && (
        <WarnBanner message={gpsFailed}>
          <div className="mt-2"><button type="button" className="font-semibold underline" onClick={() => submit(null, true)}>Save entry without GPS</button></div>
        </WarnBanner>
      )}
      <button className="btn-primary w-full py-2.5 sm:w-auto" disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />} Record entry</button>
    </form>
  );
}

function ExitConfirm({ entry, onClose, onDone }) {
  const geo = useGeolocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [gpsFailed, setGpsFailed] = useState('');

  async function confirm(withoutGps = false) {
    setBusy(true);
    setError('');
    try {
      let location = null;
      if (!withoutGps) {
        try {
          const p = await geo.getCurrent();
          location = { lat: p.lat, lng: p.lng, accuracy: p.accuracy };
        } catch (err) {
          setGpsFailed(err.message);
          return;
        }
      }
      await api.post('/entries/exit', { vehicleId: entry.vehicle, location });
      onDone(`Exit recorded for ${entry.regNumber}${location ? '' : ' without a GPS location'}.`);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Record exit · ${entry.regNumber}`} onClose={onClose}>
      <div className="space-y-4">
        <ErrorBanner message={error} />
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-slate-500">Driver</dt><dd className="font-semibold">{entry.driverName}</dd></div>
          <div><dt className="text-xs text-slate-500">Entered</dt><dd className="font-semibold">{fmtDateTime(entry.entryTime)}</dd></div>
          <div><dt className="text-xs text-slate-500">Parking duration so far</dt><dd className="font-semibold">{fmtDuration(minutesSince(entry.entryTime))}</dd></div>
        </dl>
        <GpsStatus geo={geo} />
        {gpsFailed && <WarnBanner message={gpsFailed}><div className="mt-2"><button type="button" className="font-semibold underline" onClick={() => confirm(true)}>Record exit without GPS</button></div></WarnBanner>}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => confirm(false)} disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />} Confirm exit</button>
        </div>
      </div>
    </Modal>
  );
}

function ExitPanel({ refreshKey, onChanged }) {
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [items, setItems] = useState(null);
  const [max, setMax] = useState(240);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState(null);
  const now = useNow(30000);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/entries', { params: { status: 'ACTIVE', search: q, limit: 200 } });
      setItems(data.items);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  }, [q]);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { api.get('/settings').then((r) => setMax(r.data.maxParkingMinutes)).catch(() => {}); }, []);
  useSocketEvent('vehicle:status', load);

  return (
    <div className="space-y-4">
      <SuccessBanner message={success} />
      <ErrorBanner message={error} onRetry={load} />
      <div className="card overflow-hidden">
        <div className="p-4"><div className="relative max-w-sm"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Search vehicle inside by number" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search vehicles inside" /></div></div>
        {!items ? <PageLoader /> : items.length ? (
          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className="th">Vehicle</th><th className="th">Driver</th><th className="th">Entered</th><th className="th">Parked</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((e) => {
                  const mins = minutesSince(e.entryTime, now);
                  return (
                    <tr key={e._id}>
                      <td className="td font-bold">{e.regNumber} <span className="font-normal text-slate-500">· {e.vehicleType}</span></td>
                      <td className="td">{e.driverName}<div className="text-xs text-slate-500">{e.driverContact}</div></td>
                      <td className="td">{fmtDateTime(e.entryTime)}</td>
                      <td className="td">{fmtDuration(mins)} {mins > max && <Badge value="OVERSTAY" />}</td>
                      <td className="td text-right"><button className="btn-secondary" onClick={() => { setSuccess(''); setSelected(e); }}>Record exit</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="border-t border-slate-200"><EmptyState title="No vehicles inside" hint={q ? 'No inside vehicle matches that number.' : 'Vehicles appear here after an entry is recorded.'} /></div>}
      </div>
      {selected && <ExitConfirm entry={selected} onClose={() => setSelected(null)} onDone={(msg) => { setSelected(null); setSuccess(msg); load(); onChanged(); }} />}
    </div>
  );
}

export default function EntryExit() {
  const [tab, setTab] = useState('entry');
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <PageHeader title="Entry & exit" subtitle="Record vehicles arriving and leaving">
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1" role="tablist">
          {[['entry', 'New entry'], ['exit', 'Vehicles inside']].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-md px-4 py-1.5 text-sm font-semibold ${tab === id ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{label}</button>
          ))}
        </div>
      </PageHeader>
      {tab === 'entry' ? <EntryForm onDone={() => setRefreshKey((k) => k + 1)} /> : <ExitPanel refreshKey={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)} />}
    </>
  );
}

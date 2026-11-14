import { useEffect, useState } from 'react';
import api, { errMsg } from '../services/api.js';
import { ErrorBanner, Field, PageHeader, PageLoader, Spinner, SuccessBanner } from '../components/ui.jsx';
import { fmtDuration } from '../utils/format.js';

export default function Settings() {
  const [minutes, setMinutes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => { api.get('/settings').then((r) => setMinutes(r.data.maxParkingMinutes)).catch((e) => setError(errMsg(e))); }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved('');
    try {
      const { data } = await api.put('/settings', { maxParkingMinutes: Number(minutes) });
      setMinutes(data.maxParkingMinutes);
      setSaved('Settings saved. Vehicles already over the new limit will be flagged within a minute.');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  if (minutes === null) return error ? <ErrorBanner message={error} /> : <PageLoader />;

  return (
    <>
      <PageHeader title="Settings" subtitle="Rules that apply to every vehicle" />
      <form onSubmit={save} className="card max-w-lg space-y-4 p-5">
        <SuccessBanner message={saved} />
        <ErrorBanner message={error} />
        <Field label="Maximum parking duration (minutes)">
          <input type="number" min="1" max="10080" step="1" required className="input" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </Field>
        <p className="text-sm text-slate-500">That is {fmtDuration(Number(minutes) || 0)}. A vehicle parked longer than this is listed as overstaying and raises an alert.</p>
        <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />} Save settings</button>
      </form>
    </>
  );
}

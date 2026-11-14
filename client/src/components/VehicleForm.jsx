import { useState } from 'react';
import api, { errMsg } from '../services/api.js';
import { VEHICLE_TYPES } from '../utils/constants.js';
import { normalizeReg } from '../utils/format.js';
import { ErrorBanner, Field, Spinner } from './ui.jsx';

export default function VehicleForm({ vehicle, onSaved, onCancel }) {
  const [form, setForm] = useState({
    regNumber: vehicle?.regNumber || '',
    type: vehicle?.type || 'Car',
    driverName: vehicle?.driverName || '',
    driverContact: vehicle?.driverContact || '',
    model: vehicle?.model || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'regNumber' ? normalizeReg(e.target.value) : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = vehicle ? await api.put(`/vehicles/${vehicle._id}`, form) : await api.post('/vehicles', form);
      onSaved(data);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorBanner message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Registration number"><input className="input" required minLength={4} maxLength={15} value={form.regNumber} onChange={set('regNumber')} placeholder="MH43AB1234" /></Field>
        <Field label="Vehicle type">
          <select className="input" value={form.type} onChange={set('type')}>{VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Driver name"><input className="input" required minLength={2} value={form.driverName} onChange={set('driverName')} /></Field>
        <Field label="Driver contact"><input className="input" required inputMode="tel" value={form.driverContact} onChange={set('driverContact')} placeholder="+91 98765 43210" /></Field>
        <div className="sm:col-span-2"><Field label="Vehicle model (optional)"><input className="input" value={form.model} onChange={set('model')} /></Field></div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />} {vehicle ? 'Save changes' : 'Add vehicle'}</button>
      </div>
    </form>
  );
}

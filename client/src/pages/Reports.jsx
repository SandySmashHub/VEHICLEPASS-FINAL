import { useEffect, useState } from 'react';
import { Download, Play } from 'lucide-react';
import api, { errMsg } from '../services/api.js';
import { EmptyState, ErrorBanner, Field, PageHeader, Spinner } from '../components/ui.jsx';
import { fmtCoord, fmtDateTime, fmtDuration, toDateInput } from '../utils/format.js';

const REPORTS = [
  { id: 'entries', label: 'Daily vehicle entries' },
  { id: 'exits', label: 'Daily vehicle exits' },
  { id: 'movement', label: 'Vehicle movement history (GPS)', vehicle: 'optional' },
  { id: 'overstay', label: 'Overstay records' },
  { id: 'vehicle', label: 'Vehicle-wise history', vehicle: 'required' },
];
const DATE_KEYS = ['entryTime', 'exitTime', 'recordedAt'];
const MAX_SHOWN = 500;

const cell = (key, v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (DATE_KEYS.includes(key)) return fmtDateTime(v);
  if (key === 'durationMinutes') return fmtDuration(v);
  if (key === 'lat' || key === 'lng') return fmtCoord(v);
  return String(v);
};

export default function Reports() {
  const [type, setType] = useState('entries');
  const [from, setFrom] = useState(toDateInput(new Date(Date.now() - 6 * 86400000)));
  const [to, setTo] = useState(toDateInput(new Date()));
  const [vehicleId, setVehicleId] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const def = REPORTS.find((r) => r.id === type);

  useEffect(() => { api.get('/reports/vehicles').then((r) => setVehicles(r.data.items)).catch(() => {}); }, []);

  const params = (extra = {}) => ({ from, to, tzOffset: new Date().getTimezoneOffset(), ...(vehicleId ? { vehicleId } : {}), ...extra });

  async function run(e) {
    e.preventDefault();
    if (def.vehicle === 'required' && !vehicleId) return setError('Select a vehicle for this report.');
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/reports/${type}`, { params: params() });
      setResult(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    setError('');
    try {
      const res = await api.get(`/reports/${type}`, { params: params({ format: 'csv' }), responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vehiclepass-${type}-${from}_to_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data instanceof Blob ? 'Export failed.' : errMsg(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="Filter by date, review on screen and export to CSV" />
      <form onSubmit={run} className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-end">
        <Field label="Report"><select className="input" value={type} onChange={(e) => { setType(e.target.value); setResult(null); }}>{REPORTS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></Field>
        <Field label="From"><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} required /></Field>
        <Field label="To"><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} required /></Field>
        <Field label={def.vehicle ? `Vehicle${def.vehicle === 'optional' ? ' (optional)' : ''}` : 'Vehicle'}>
          <select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} disabled={!def.vehicle}>
            <option value="">{def.vehicle ? 'Select…' : 'Not used'}</option>{vehicles.map((v) => <option key={v._id} value={v._id}>{v.regNumber}</option>)}
          </select>
        </Field>
        <button className="btn-primary" disabled={loading}>{loading ? <Spinner className="h-4 w-4 !text-white" /> : <Play className="h-4 w-4" />} Run report</button>
      </form>
      <div className="mt-4"><ErrorBanner message={error} /></div>

      {result && (
        <div className="card mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <p className="text-sm text-slate-600"><strong>{result.total}</strong> row{result.total === 1 ? '' : 's'}{result.truncated ? ' (limit reached; narrow the dates)' : ''}{result.total > MAX_SHOWN ? ` · showing first ${MAX_SHOWN}` : ''}</p>
            <button className="btn-secondary" onClick={exportCsv} disabled={exporting || !result.total}>{exporting ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />} Export CSV</button>
          </div>
          {result.rows.length ? (
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50"><tr>{result.columns.map((c) => <th key={c.key} className="th">{c.label}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {result.rows.slice(0, MAX_SHOWN).map((r, i) => <tr key={i}>{result.columns.map((c) => <td key={c.key} className="td">{cell(c.key, r[c.key])}</td>)}</tr>)}
                </tbody>
              </table>
            </div>
          ) : <div className="border-t border-slate-200"><EmptyState title="No records in this period" hint="Try a different date range." /></div>}
        </div>
      )}
    </>
  );
}

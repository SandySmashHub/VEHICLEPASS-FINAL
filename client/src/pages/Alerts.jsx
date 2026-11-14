import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import api, { errMsg } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import useSocketEvent from '../hooks/useSocketEvent.js';
import useNow from '../hooks/useNow.js';
import { Badge, EmptyState, ErrorBanner, PageHeader, PageLoader, Pager, SimBadge } from '../components/ui.jsx';
import { fmtDateTime, fmtDuration, minutesSince } from '../utils/format.js';

const FILTERS = [['false', 'Open'], ['true', 'Resolved'], ['', 'All']];

export default function Alerts() {
  const { isAdmin } = useAuth();
  const [resolved, setResolved] = useState('false');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const now = useNow();

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get('/alerts', { params: { resolved, page, limit: 15 } });
      setData(d);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  }, [resolved, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [resolved]);
  useSocketEvent('alert:new', load);
  useSocketEvent('alert:resolved', load);

  async function resolve(id) {
    try { await api.patch(`/alerts/${id}/resolve`); load(); } catch (e) { setError(errMsg(e)); }
  }

  return (
    <>
      <PageHeader title="Alerts" subtitle="Overstays and geofence boundary crossings">
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
          {FILTERS.map(([v, l]) => <button key={l} onClick={() => setResolved(v)} className={`rounded-md px-4 py-1.5 text-sm font-semibold ${resolved === v ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{l}</button>)}
        </div>
      </PageHeader>
      <ErrorBanner message={error} onRetry={load} />
      <div className="card mt-4 overflow-hidden">
        {!data ? <PageLoader /> : data.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className="th">Alert</th><th className="th">Vehicle</th><th className="th">Details</th><th className="th">Raised</th><th className="th">Status</th>{isAdmin && <th className="th" />}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((a) => {
                  const live = a.type === 'OVERSTAY' && !a.resolved && a.entry?.status === 'ACTIVE';
                  return (
                    <tr key={a._id}>
                      <td className="td"><Badge value={a.type} />{a.isDemo && <span className="ml-1"><SimBadge text="Demo" /></span>}</td>
                      <td className="td font-bold">{a.regNumber}</td>
                      <td className="td">{a.type === 'OVERSTAY' ? <>Parked for <strong>{fmtDuration(live ? minutesSince(a.entry.entryTime, now) : a.durationMinutes)}</strong>{!live && a.entry?.status === 'COMPLETED' ? ' (has since left)' : ''}</> : a.message}</td>
                      <td className="td">{fmtDateTime(a.createdAt)}</td>
                      <td className="td">{a.resolved ? <Badge value="RESOLVED" label="Resolved" /> : <Badge value="OPEN" label="Open" />}</td>
                      {isAdmin && <td className="td text-right">{!a.resolved && <button className="btn-secondary" onClick={() => resolve(a._id)}><Check className="h-4 w-4" /> Mark resolved</button>}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title={resolved === 'false' ? 'No open alerts' : 'No alerts found'} hint="Overstay and geofence alerts appear here." />}
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>
    </>
  );
}

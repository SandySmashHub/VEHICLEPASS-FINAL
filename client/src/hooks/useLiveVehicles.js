import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errMsg } from '../services/api.js';
import useSocketEvent from './useSocketEvent.js';

/** Currently tracked vehicles, kept current through Socket.IO without page refreshes. */
export default function useLiveVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const ref = useRef([]);
  ref.current = vehicles;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/tracking/live');
      setVehicles(data.items);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useSocketEvent('vehicle:location', (v) => {
    if (!v.tracking?.active) return;
    if (!ref.current.some((x) => x._id === v._id)) { load(); return; } // newly tracked: refetch to get overstay flag
    setVehicles((list) => list.map((x) => (x._id === v._id ? { ...x, ...v, overstay: x.overstay } : x)));
  });
  useSocketEvent('tracking:stopped', ({ vehicleId }) => setVehicles((l) => l.filter((x) => x._id !== vehicleId)));
  useSocketEvent('vehicle:status', (v) => setVehicles((l) => l.map((x) => (x._id === v._id ? { ...x, ...v, overstay: x.overstay } : x))));

  return { vehicles, loading, error, reload: load };
}

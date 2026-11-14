import VehicleEntry from '../models/VehicleEntry.js';
import Vehicle from '../models/Vehicle.js';
import Alert from '../models/Alert.js';
import { getMaxParkingMinutes } from './settingsService.js';
import { emit } from '../socket/index.js';

const fmt = (min) => `${Math.floor(min / 60)}h ${min % 60}m`;

/** Creates one OVERSTAY alert for every active entry that exceeded the configured limit. */
export async function scanOverstays() {
  const max = await getMaxParkingMinutes();
  const cutoff = new Date(Date.now() - max * 60000);
  const entries = await VehicleEntry.find({ status: 'ACTIVE', entryTime: { $lt: cutoff } }).lean();
  for (const e of entries) {
    const minutes = Math.floor((Date.now() - new Date(e.entryTime).getTime()) / 60000);
    try {
      const alert = await Alert.create({
        type: 'OVERSTAY',
        severity: 'HIGH',
        vehicle: e.vehicle,
        regNumber: e.regNumber,
        entry: e._id,
        entryTime: e.entryTime,
        durationMinutes: minutes,
        message: `${e.regNumber} has been parked for ${fmt(minutes)} (limit ${fmt(max)})`,
      });
      emit('alert:new', JSON.parse(JSON.stringify(alert)));
    } catch (err) {
      if (err.code !== 11000) throw err; // already alerted for this session
    }
  }
}

/** Real-GPS vehicles that stopped reporting (browser closed, no signal) are no longer shown as tracked. */
export async function expireStaleTracking() {
  const minutes = Number(process.env.TRACKING_STALE_MINUTES) || 5;
  const cutoff = new Date(Date.now() - minutes * 60000);
  const filter = { 'tracking.active': true, 'location.isSimulated': { $ne: true }, 'location.updatedAt': { $lt: cutoff } };
  const stale = await Vehicle.find(filter).select('_id').lean();
  if (!stale.length) return;
  await Vehicle.updateMany({ _id: { $in: stale.map((v) => v._id) } }, { $set: { 'tracking.active': false } });
  stale.forEach((v) => emit('tracking:stopped', { vehicleId: String(v._id), reason: 'no-updates' }));
}

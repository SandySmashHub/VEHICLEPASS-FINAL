import Vehicle from '../models/Vehicle.js';
import VehicleEntry from '../models/VehicleEntry.js';
import LocationHistory from '../models/LocationHistory.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toCsv } from '../utils/csv.js';
import { dateRange, str } from '../utils/serialize.js';
import { getMaxParkingMinutes } from '../services/settingsService.js';

const MAX_ROWS = 20000;

const entryColumns = [
  { key: 'regNumber', label: 'Registration' },
  { key: 'vehicleType', label: 'Type' },
  { key: 'driverName', label: 'Driver' },
  { key: 'driverContact', label: 'Contact' },
  { key: 'entryTime', label: 'Entry time' },
  { key: 'exitTime', label: 'Exit time' },
  { key: 'durationMinutes', label: 'Duration (min)' },
  { key: 'status', label: 'Status' },
];

const movementColumns = [
  { key: 'regNumber', label: 'Registration' },
  { key: 'recordedAt', label: 'Recorded at' },
  { key: 'lat', label: 'Latitude' },
  { key: 'lng', label: 'Longitude' },
  { key: 'accuracy', label: 'Accuracy (m)' },
  { key: 'source', label: 'Source' },
];

const withElapsed = (e) => ({
  ...e,
  durationMinutes: e.durationMinutes ?? Math.floor((Date.now() - new Date(e.entryTime).getTime()) / 60000),
});

export const getReport = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const range = dateRange(str(req.query.from), str(req.query.to), Number(req.query.tzOffset) || 0);
  const vehicleId = str(req.query.vehicleId);
  let columns = entryColumns;
  let rows;

  if (type === 'entries') {
    rows = await VehicleEntry.find(range ? { entryTime: range } : {}).sort({ entryTime: -1 }).limit(MAX_ROWS).lean();
  } else if (type === 'exits') {
    rows = await VehicleEntry.find({ exitTime: range || { $exists: true } }).sort({ exitTime: -1 }).limit(MAX_ROWS).lean();
  } else if (type === 'overstay') {
    const max = await getMaxParkingMinutes();
    const cutoff = new Date(Date.now() - max * 60000);
    const q = { $or: [{ status: 'COMPLETED', durationMinutes: { $gt: max } }, { status: 'ACTIVE', entryTime: { $lt: cutoff } }] };
    if (range) q.entryTime = range; // combined with $or above
    const found = await VehicleEntry.find(q).sort({ entryTime: -1 }).limit(MAX_ROWS).lean();
    rows = found.map(withElapsed);
  } else if (type === 'vehicle') {
    if (!vehicleId) throw new ApiError(400, 'vehicleId is required for the vehicle-wise report');
    rows = (await VehicleEntry.find({ vehicle: vehicleId, ...(range ? { entryTime: range } : {}) }).sort({ entryTime: -1 }).limit(MAX_ROWS).lean()).map(withElapsed);
  } else if (type === 'movement') {
    columns = movementColumns;
    const q = { ...(vehicleId ? { vehicle: vehicleId } : {}), ...(range ? { recordedAt: range } : {}) };
    const points = await LocationHistory.find(q).sort({ recordedAt: -1 }).limit(MAX_ROWS).populate('vehicle', 'regNumber').lean();
    rows = points.map((p) => ({ ...p, regNumber: p.vehicle?.regNumber || 'DELETED' }));
  } else {
    throw new ApiError(404, 'Unknown report type');
  }

  if (str(req.query.format) === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="vehiclepass-${type}-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(toCsv(columns, rows));
  }
  res.json({ type, columns, rows, total: rows.length, truncated: rows.length >= MAX_ROWS });
});

export const reportVehicleOptions = asyncHandler(async (req, res) => {
  res.json({ items: await Vehicle.find().sort({ regNumber: 1 }).select('regNumber').limit(1000).lean() });
});

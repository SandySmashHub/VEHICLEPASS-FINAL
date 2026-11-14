import Vehicle from '../models/Vehicle.js';
import VehicleEntry from '../models/VehicleEntry.js';
import LocationHistory from '../models/LocationHistory.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { haversineKm } from '../utils/geo.js';
import { dateRange, publicVehicle } from '../utils/serialize.js';
import { processLocation } from '../services/trackingService.js';
import { getMaxParkingMinutes } from '../services/settingsService.js';
import { emit } from '../socket/index.js';

async function trackedVehicles() {
  const vehicles = await Vehicle.find({ 'tracking.active': true, 'location.lat': { $exists: true } }).select('-geofenceState').lean();
  const max = await getMaxParkingMinutes();
  const cutoff = new Date(Date.now() - max * 60000);
  const overstayed = await VehicleEntry.find({ vehicle: { $in: vehicles.map((v) => v._id) }, status: 'ACTIVE', entryTime: { $lt: cutoff } }).select('vehicle').lean();
  const set = new Set(overstayed.map((e) => String(e.vehicle)));
  return vehicles.map((v) => ({ ...v, overstay: set.has(String(v._id)) }));
}

export const postLocation = asyncHandler(async (req, res) => {
  const { vehicleId, lat, lng, accuracy, speed } = req.body;
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  await processLocation(vehicle, { lat, lng, accuracy, speed: speed ?? undefined, source: 'GPS', userId: req.user._id }, { track: true });
  res.json({ ok: true, recordedAt: vehicle.location.updatedAt });
});

export const stopTracking = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.body.vehicleId);
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  vehicle.tracking.active = false;
  await vehicle.save();
  emit('tracking:stopped', { vehicleId: String(vehicle._id), reason: 'stopped' });
  res.json({ ok: true, vehicle: publicVehicle(vehicle) });
});

export const liveVehicles = asyncHandler(async (req, res) => res.json({ items: await trackedVehicles() }));

export const nearbyVehicles = asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm } = req.query;
  const items = (await trackedVehicles())
    .map((v) => ({ ...v, distanceKm: haversineKm({ lat, lng }, v.location) }))
    .filter((v) => v.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
  res.json({ items, origin: { lat, lng }, radiusKm });
});

export const routeHistory = asyncHandler(async (req, res) => {
  const { vehicleId, from, to } = req.query;
  const vehicle = await Vehicle.findById(vehicleId).select('regNumber type driverName status isDemo').lean();
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  const range = dateRange(from, to);
  const pointQuery = { vehicle: vehicleId, ...(range ? { recordedAt: range } : {}) };
  const entryQuery = { vehicle: vehicleId, ...(range ? { entryTime: range } : {}) };

  const [points, entries] = await Promise.all([
    LocationHistory.find(pointQuery).sort({ recordedAt: 1 }).limit(10000).select('lat lng accuracy recordedAt source -_id').lean(),
    VehicleEntry.find(entryQuery).sort({ entryTime: 1 }).limit(100).select('entryTime exitTime entryLocation exitLocation status').lean(),
  ]);
  res.json({ vehicle, points, entries, total: points.length, hasSimulated: points.some((p) => p.source === 'SIMULATED') });
});

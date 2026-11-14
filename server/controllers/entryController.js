import Vehicle from '../models/Vehicle.js';
import VehicleEntry from '../models/VehicleEntry.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dateRange, escapeRegex, publicVehicle, str } from '../utils/serialize.js';
import { processLocation } from '../services/trackingService.js';
import { emit } from '../socket/index.js';

/** Records an entry. Unknown registration numbers are registered automatically. */
export const recordEntry = asyncHandler(async (req, res) => {
  const { regNumber, type, driverName, driverContact, model, location } = req.body;
  let vehicle = await Vehicle.findOne({ regNumber });

  if (vehicle) {
    if (vehicle.status === 'INSIDE' || (await VehicleEntry.exists({ vehicle: vehicle._id, status: 'ACTIVE' }))) {
      throw new ApiError(409, `${regNumber} already has an active entry. Record its exit first.`);
    }
    Object.assign(vehicle, { type, driverName, driverContact, model: model || vehicle.model });
  } else {
    vehicle = new Vehicle({ regNumber, type, driverName, driverContact, model });
  }
  await vehicle.validate();

  const now = new Date();
  // The partial unique index rejects a second ACTIVE entry even if two requests race.
  const entry = await VehicleEntry.create({
    vehicle: vehicle._id,
    regNumber,
    vehicleType: type,
    driverName,
    driverContact,
    entryTime: now,
    entryLocation: location || undefined,
    enteredBy: req.user._id,
  });

  vehicle.status = 'INSIDE';
  vehicle.entryTime = now;
  vehicle.exitTime = undefined;
  if (location) await processLocation(vehicle, { ...location, source: 'GPS', userId: req.user._id });
  else await vehicle.save();

  emit('vehicle:status', publicVehicle(vehicle));
  res.status(201).json({ entry, vehicle: publicVehicle(vehicle) });
});

export const recordExit = asyncHandler(async (req, res) => {
  const { vehicleId, regNumber, location } = req.body;
  const vehicle = vehicleId ? await Vehicle.findById(vehicleId) : await Vehicle.findOne({ regNumber });
  if (!vehicle) throw new ApiError(404, 'Vehicle is not registered');

  const entry = await VehicleEntry.findOne({ vehicle: vehicle._id, status: 'ACTIVE' });
  if (!entry) throw new ApiError(409, 'No active entry found for this vehicle');

  const now = new Date();
  entry.set({
    exitTime: now,
    status: 'COMPLETED',
    durationMinutes: Math.max(1, Math.ceil((now - entry.entryTime) / 60000)),
    exitedBy: req.user._id,
    exitLocation: location || undefined,
  });
  await entry.save();

  const wasTracked = vehicle.tracking.active;
  vehicle.status = 'OUTSIDE';
  vehicle.exitTime = now;
  vehicle.tracking.active = false;
  if (location) await processLocation(vehicle, { ...location, source: 'GPS', userId: req.user._id });
  else await vehicle.save();

  emit('vehicle:status', publicVehicle(vehicle));
  if (wasTracked) emit('tracking:stopped', { vehicleId: String(vehicle._id), reason: 'exit' });
  res.json({ entry, vehicle: publicVehicle(vehicle) });
});

export const listEntries = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 20));
  const q = {};
  const status = str(req.query.status);
  const search = str(req.query.search);
  if (['ACTIVE', 'COMPLETED'].includes(status)) q.status = status;
  if (str(req.query.vehicleId)) q.vehicle = req.query.vehicleId;
  if (search) q.regNumber = { $regex: escapeRegex(search.replace(/[\s-]/g, '').toUpperCase()) };
  const range = dateRange(str(req.query.from), str(req.query.to), Number(req.query.tzOffset) || 0);
  if (range) q.entryTime = range;

  const [items, total] = await Promise.all([
    VehicleEntry.find(q).sort({ entryTime: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    VehicleEntry.countDocuments(q),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

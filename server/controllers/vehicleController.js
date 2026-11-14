import Vehicle from '../models/Vehicle.js';
import VehicleEntry from '../models/VehicleEntry.js';
import LocationHistory from '../models/LocationHistory.js';
import Alert from '../models/Alert.js';
import GeofenceEvent from '../models/GeofenceEvent.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { VEHICLE_TYPES } from '../utils/constants.js';
import { escapeRegex, str } from '../utils/serialize.js';

export const listVehicles = asyncHandler(async (req, res) => {
  const search = str(req.query.search);
  const type = str(req.query.type);
  const status = str(req.query.status);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 20));

  const q = {};
  if (search) q.regNumber = { $regex: escapeRegex(search.replace(/[\s-]/g, '').toUpperCase()) };
  if (VEHICLE_TYPES.includes(type)) q.type = type;
  if (['INSIDE', 'OUTSIDE'].includes(status)) q.status = status;

  const [items, total] = await Promise.all([
    Vehicle.find(q).sort({ regNumber: 1 }).skip((page - 1) * limit).limit(limit).select('-geofenceState').lean(),
    Vehicle.countDocuments(q),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

export const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id).select('-geofenceState').lean();
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  const [entries, historyPoints] = await Promise.all([
    VehicleEntry.find({ vehicle: vehicle._id }).sort({ entryTime: -1 }).limit(15).lean(),
    LocationHistory.countDocuments({ vehicle: vehicle._id }),
  ]);
  res.json({ vehicle, entries, historyPoints });
});

export const createVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.create(req.body);
  res.status(201).json(vehicle);
});

export const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  Object.assign(vehicle, req.body);
  await vehicle.save();
  res.json(vehicle);
});

export const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  if (vehicle.status === 'INSIDE') throw new ApiError(409, 'Vehicle is currently inside. Record its exit before deleting.');
  // Cascade: remove everything that belongs to this vehicle.
  await Promise.all([
    VehicleEntry.deleteMany({ vehicle: vehicle._id }),
    LocationHistory.deleteMany({ vehicle: vehicle._id }),
    Alert.deleteMany({ vehicle: vehicle._id }),
    GeofenceEvent.deleteMany({ vehicle: vehicle._id }),
  ]);
  await vehicle.deleteOne();
  res.json({ message: 'Vehicle and its history deleted' });
});

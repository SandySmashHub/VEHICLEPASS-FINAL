import Geofence from '../models/Geofence.js';
import GeofenceEvent from '../models/GeofenceEvent.js';
import Vehicle from '../models/Vehicle.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Boundary changed or removed: forget cached inside/outside state so the next fix sets a fresh baseline.
const resetState = (id) => Vehicle.updateMany({}, { $unset: { [`geofenceState.${id}`]: '' } });

export const listGeofences = asyncHandler(async (req, res) => res.json({ items: await Geofence.find().sort({ createdAt: -1 }).lean() }));

export const createGeofence = asyncHandler(async (req, res) => {
  res.status(201).json(await Geofence.create({ ...req.body, createdBy: req.user._id }));
});

export const updateGeofence = asyncHandler(async (req, res) => {
  const fence = await Geofence.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!fence) throw new ApiError(404, 'Geofence not found');
  await resetState(fence._id);
  res.json(fence);
});

export const deleteGeofence = asyncHandler(async (req, res) => {
  const fence = await Geofence.findByIdAndDelete(req.params.id);
  if (!fence) throw new ApiError(404, 'Geofence not found');
  await resetState(fence._id);
  res.json({ message: 'Geofence deleted' });
});

export const listGeofenceEvents = asyncHandler(async (req, res) => {
  const q = typeof req.query.vehicleId === 'string' ? { vehicle: req.query.vehicleId } : {};
  res.json({ items: await GeofenceEvent.find(q).sort({ occurredAt: -1 }).limit(100).lean() });
});

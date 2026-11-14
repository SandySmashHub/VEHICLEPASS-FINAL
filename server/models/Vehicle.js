import mongoose from 'mongoose';
import { VEHICLE_TYPES } from '../utils/constants.js';

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    accuracy: Number,
    updatedAt: Date,
    isSimulated: { type: Boolean, default: false },
  },
  { _id: false }
);

const vehicleSchema = new mongoose.Schema(
  {
    regNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      set: (v) => (typeof v === 'string' ? v.replace(/[\s-]/g, '').toUpperCase() : v),
      match: [/^[A-Z0-9]{4,15}$/, 'Registration number must be 4-15 letters or digits'],
    },
    type: { type: String, enum: VEHICLE_TYPES, required: true, index: true },
    driverName: { type: String, required: true, trim: true, maxlength: 80 },
    driverContact: { type: String, required: true, trim: true, maxlength: 20 },
    model: { type: String, trim: true, maxlength: 80, default: '' },
    status: { type: String, enum: ['INSIDE', 'OUTSIDE'], default: 'OUTSIDE', index: true },
    entryTime: Date,
    exitTime: Date,
    location: locationSchema,
    tracking: {
      active: { type: Boolean, default: false, index: true },
      startedAt: Date,
      trackedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    // geofenceId -> was the vehicle inside at its last fix. Used to detect boundary crossings.
    geofenceState: { type: Map, of: Boolean, default: {} },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Vehicle', vehicleSchema);

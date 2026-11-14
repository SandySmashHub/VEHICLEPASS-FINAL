import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['OVERSTAY', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT'], required: true, index: true },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    regNumber: { type: String, required: true },
    entry: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleEntry' },
    entryTime: Date,
    durationMinutes: Number,
    message: { type: String, required: true },
    resolved: { type: Boolean, default: false, index: true },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// One overstay alert per parking session.
alertSchema.index({ entry: 1, type: 1 }, { unique: true, partialFilterExpression: { type: 'OVERSTAY', entry: { $exists: true } } });

export default mongoose.model('Alert', alertSchema);

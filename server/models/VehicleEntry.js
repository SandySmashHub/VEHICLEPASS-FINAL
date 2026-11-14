import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
  { lat: { type: Number, min: -90, max: 90 }, lng: { type: Number, min: -180, max: 180 }, accuracy: Number },
  { _id: false }
);

const entrySchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    regNumber: { type: String, required: true, index: true },
    vehicleType: String,
    driverName: String,
    driverContact: String,
    entryTime: { type: Date, default: Date.now, index: true },
    exitTime: { type: Date, index: true },
    entryLocation: pointSchema,
    exitLocation: pointSchema,
    durationMinutes: Number,
    status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE', index: true },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    exitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Hard guarantee: at most one ACTIVE entry per vehicle, even under concurrent requests.
entrySchema.index({ vehicle: 1 }, { unique: true, partialFilterExpression: { status: 'ACTIVE' } });

export default mongoose.model('VehicleEntry', entrySchema);

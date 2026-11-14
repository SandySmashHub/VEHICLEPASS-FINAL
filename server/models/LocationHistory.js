import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    accuracy: Number,
    speed: Number,
    recordedAt: { type: Date, default: Date.now },
    // GPS = captured from a real device. SIMULATED = demo seed data only.
    source: { type: String, enum: ['GPS', 'SIMULATED'], default: 'GPS' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: false }
);

schema.index({ vehicle: 1, recordedAt: 1 });
schema.index({ isDemo: 1 });

export default mongoose.model('LocationHistory', schema);

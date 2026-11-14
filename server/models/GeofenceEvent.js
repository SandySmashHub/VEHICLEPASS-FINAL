import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    geofence: { type: mongoose.Schema.Types.ObjectId, ref: 'Geofence', required: true },
    geofenceName: String,
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    regNumber: String,
    type: { type: String, enum: ['ENTER', 'EXIT'], required: true },
    location: { lat: Number, lng: Number },
    occurredAt: { type: Date, default: Date.now, index: true },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: false }
);

export default mongoose.model('GeofenceEvent', schema);

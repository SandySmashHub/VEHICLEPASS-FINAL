import mongoose from 'mongoose';

const geofenceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    active: { type: Boolean, default: true, index: true },
    polygon: {
      type: [new mongoose.Schema({ lat: { type: Number, required: true, min: -90, max: 90 }, lng: { type: Number, required: true, min: -180, max: 180 } }, { _id: false })],
      validate: [(v) => v.length >= 3, 'A geofence needs at least 3 points'],
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Geofence', geofenceSchema);

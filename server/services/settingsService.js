import Setting from '../models/Setting.js';

export async function getMaxParkingMinutes() {
  const s = await Setting.findOne({ key: 'maxParkingMinutes' }).lean();
  return s?.value ?? (Number(process.env.DEFAULT_MAX_PARKING_MINUTES) || 240);
}

export async function setMaxParkingMinutes(value) {
  await Setting.findOneAndUpdate({ key: 'maxParkingMinutes' }, { value }, { upsert: true, new: true });
}

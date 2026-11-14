import { asyncHandler } from '../utils/asyncHandler.js';
import { getMaxParkingMinutes, setMaxParkingMinutes } from '../services/settingsService.js';
import { scanOverstays } from '../services/alertService.js';

export const getSettings = asyncHandler(async (req, res) => res.json({ maxParkingMinutes: await getMaxParkingMinutes() }));

export const updateSettings = asyncHandler(async (req, res) => {
  await setMaxParkingMinutes(req.body.maxParkingMinutes);
  await scanOverstays();
  res.json({ maxParkingMinutes: req.body.maxParkingMinutes });
});

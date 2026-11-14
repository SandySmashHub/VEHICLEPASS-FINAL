import { z } from 'zod';
import { VEHICLE_TYPES, ROLES } from './constants.js';

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

export const coord = z.object({ lat, lng, accuracy: z.number().min(0).max(100000).optional() });

const regNumber = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, '').toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{4,15}$/, 'must be 4-15 letters or digits'));

const driverContact = z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/, 'invalid contact number');
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'invalid id');

export const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(200) });

export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  role: z.enum(ROLES),
});
export const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).max(200).optional().or(z.literal('')),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
});

export const vehicleSchema = z.object({
  regNumber,
  type: z.enum(VEHICLE_TYPES),
  driverName: z.string().trim().min(2).max(80),
  driverContact,
  model: z.string().trim().max(80).optional().default(''),
});

export const entrySchema = vehicleSchema.extend({ location: coord.nullish() });

export const exitSchema = z
  .object({ vehicleId: objectId.optional(), regNumber: regNumber.optional(), location: coord.nullish() })
  .refine((v) => v.vehicleId || v.regNumber, { message: 'vehicleId or regNumber is required' });

export const locationSchema = z.object({
  vehicleId: objectId,
  lat,
  lng,
  accuracy: z.number().min(0).max(100000).optional(),
  speed: z.number().min(0).max(500).nullish(),
});
export const stopSchema = z.object({ vehicleId: objectId });

export const geofenceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().default(''),
  active: z.boolean().optional().default(true),
  polygon: z.array(z.object({ lat, lng })).min(3).max(200),
});

export const settingsSchema = z.object({ maxParkingMinutes: z.number().int().min(1).max(10080) });

export const nearbyQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(200).optional().default(5),
});
export const historyQuery = z.object({
  vehicleId: objectId,
  from: z.string().optional(),
  to: z.string().optional(),
});

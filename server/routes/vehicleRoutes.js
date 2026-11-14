import { Router } from 'express';
import { listVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicleController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { vehicleSchema } from '../utils/schemas.js';

const router = Router();
router.use(protect);
router.get('/', listVehicles);
router.get('/:id', getVehicle);
router.post('/', authorize('ADMIN'), validate(vehicleSchema), createVehicle);
router.put('/:id', authorize('ADMIN'), validate(vehicleSchema), updateVehicle);
router.delete('/:id', authorize('ADMIN'), deleteVehicle);
export default router;

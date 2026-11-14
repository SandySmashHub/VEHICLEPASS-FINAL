import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { settingsSchema } from '../utils/schemas.js';

const router = Router();
router.use(protect);
router.get('/', getSettings);
router.put('/', authorize('ADMIN'), validate(settingsSchema), updateSettings);
export default router;

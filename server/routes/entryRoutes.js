import { Router } from 'express';
import { recordEntry, recordExit, listEntries } from '../controllers/entryController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { entrySchema, exitSchema } from '../utils/schemas.js';

const router = Router();
router.use(protect, authorize('ADMIN', 'GUARD'));
router.get('/', listEntries);
router.post('/entry', validate(entrySchema), recordEntry);
router.post('/exit', validate(exitSchema), recordExit);
export default router;

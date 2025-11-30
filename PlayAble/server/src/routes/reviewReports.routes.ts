import { Router } from 'express';
import { protect } from '../../middleware/auth';
import { createReviewReport } from '../controllers/reviewReports.controller';

const router = Router();

router.post('/reviews/:id/report', protect, createReviewReport);

export default router;
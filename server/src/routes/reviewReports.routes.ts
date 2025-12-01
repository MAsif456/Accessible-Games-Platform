import { Router } from 'express';
import { protect } from '../../middleware/auth';
import {
  createReviewReport,
  adminListReviewReports,
  adminResolveReviewReport,
} from '../controllers/reviewReports.controller';

const router = Router();

router.post('/reviews/:id/report', protect, createReviewReport);

router.get('/admin/review-reports', protect, adminListReviewReports);

router.get('/admin/review-reports/resolved', protect, (req, res, next) => {
  (req.query as any).resolved = 'true';
  return adminListReviewReports(req, res).catch(next as any);
});

router.post('/admin/review-reports/:id/resolve', protect, adminResolveReviewReport);

export default router;
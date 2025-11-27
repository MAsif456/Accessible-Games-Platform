import { Router } from 'express';
import { protect } from '../../middleware/auth';
import { listReviews, createReview, getReviewById, toggleReviewLike } from '../controllers/reviews.controller';

const router = Router();

router.get('/games/:id/reviews', listReviews);
router.post('/games/:id/reviews', protect, createReview);
router.get('/reviews/:id', getReviewById);
router.post('/reviews/:id/like', protect, toggleReviewLike);

export default router;
import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  addToRecentlyViewed,
  getRecentlyViewed,
  clearRecentlyViewed,
} from '../controllers/recentlyViewedController';

const router = Router();

router.post('/recently-viewed/:gameId', protect, addToRecentlyViewed);
router.get('/recently-viewed', protect, getRecentlyViewed);
router.delete('/recently-viewed', protect, clearRecentlyViewed);

export default router;

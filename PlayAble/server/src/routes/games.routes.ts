import { Router } from 'express';
import {
  getGamesHandler,
  getAdminGamesHandler,
  getGameByIdHandler,
  createGameHandler,
  updateGameHandler,
  deleteGameHandler,
} from '../controllers/games.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.get('/games', getGamesHandler);

// Admin games management routes
router.get('/admin/games', protect, authorize('admin'), getAdminGamesHandler);
router.get('/admin/games/:id', protect, authorize('admin'), getGameByIdHandler);
router.post('/admin/games', protect, authorize('admin'), createGameHandler);
router.put('/admin/games/:id', protect, authorize('admin'), updateGameHandler);
router.delete('/admin/games/:id', protect, authorize('admin'), deleteGameHandler);

export default router;


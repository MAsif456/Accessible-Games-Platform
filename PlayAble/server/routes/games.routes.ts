import { Router } from 'express';
import { getGamesHandler } from '../controllers/games.controller';

const router = Router();

router.get('/games', getGamesHandler);

export default router;

import { Router, Request, Response } from 'express';
import { protect } from '../../middleware/auth';
import favouritesService from '../services/favourites.service';
import { parsePagination } from '../../utils/validate';

const router = Router();

// Protect all favourites routes
router.use(protect);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    const { page, pageSize } = parsePagination(req.query, { page: 1, pageSize: 9, maxPageSize: 50 });

    const result = await favouritesService.getFavouritesForUser(userId, page, pageSize);
    res.json(result);
  } catch (error: any) {
    console.error('Failed to get favourites', error);
    res.status(500).json({ message: error.message || 'Failed to get favourites' });
  }
});

router.post('/:gameId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    const { gameId } = req.params;
    const favourite = await favouritesService.addFavourite(userId, gameId);
    res.status(201).json(favourite);
  } catch (error: any) {
    console.error('Failed to add favourite', error);
    res.status(400).json({ message: error.message || 'Failed to add favourite' });
  }
});

router.delete('/:gameId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    const { gameId } = req.params;
    const deleted = await favouritesService.removeFavourite(userId, gameId);
    if (!deleted) {
      return res.status(404).json({ message: 'Favourite not found' });
    }
    res.status(204).send();
  } catch (error: any) {
    console.error('Failed to remove favourite', error);
    res.status(400).json({ message: error.message || 'Failed to remove favourite' });
  }
});

export default router;

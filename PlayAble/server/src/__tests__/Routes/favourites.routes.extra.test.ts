import request from 'supertest';
import express from 'express';

jest.mock('../../middleware/auth', () => ({
  protect: (req: any, _res: any, next: any) => {
    const userId = req.headers['x-user-id'];
    if (userId) {
      req.user = { id: userId };
    }
    next();
  },
}));

const mockGet = jest.fn();
const mockAdd = jest.fn();
const mockRemove = jest.fn();

jest.mock('../../services/favourites.service', () => ({
  __esModule: true,
  default: {
    getFavouritesForUser: (...args: any[]) => mockGet(...args),
    addFavourite: (...args: any[]) => mockAdd(...args),
    removeFavourite: (...args: any[]) => mockRemove(...args),
  },
}));

const mockParsePagination = jest.fn().mockReturnValue({ page: 2, pageSize: 5 });
jest.mock('../../../utils/validate', () => ({
  parsePagination: (...args: any[]) => mockParsePagination(...args),
}));

import favouritesRouter from '../../routes/favourites.routes';

const app = express();
app.use(express.json());
app.use('/api/favourites', favouritesRouter);

describe('favourites.routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no user on GET', async () => {
    const res = await request(app).get('/api/favourites').expect(401);
    expect(res.body).toEqual({ message: 'Unauthenticated' });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('returns paginated favourites for authenticated user', async () => {
    mockGet.mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 5 });

    const res = await request(app)
      .get('/api/favourites?foo=bar')
      .set('x-user-id', 'user-123')
      .expect(200);

    expect(mockParsePagination).toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledWith('user-123', 2, 5);
    expect(res.body).toEqual({ items: [], total: 0, page: 2, pageSize: 5 });
  });

  it('adds favourite for authenticated user', async () => {
    mockAdd.mockResolvedValue({ id: 'fav-1' });

    const res = await request(app)
      .post('/api/favourites/game-1')
      .set('x-user-id', 'user-1')
      .expect(201);

    expect(mockAdd).toHaveBeenCalledWith('user-1', 'game-1');
    expect(res.body).toEqual({ id: 'fav-1' });
  });

  it('blocks adding favourite when unauthenticated', async () => {
    await request(app).post('/api/favourites/game-2').expect(401);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('deletes favourite and handles not found', async () => {
    mockRemove.mockResolvedValue(0);
    const notFound = await request(app)
      .delete('/api/favourites/game-3')
      .set('x-user-id', 'user-9')
      .expect(404);
    expect(notFound.body).toEqual({ message: 'Favourite not found' });

    mockRemove.mockResolvedValue(1);
    await request(app)
      .delete('/api/favourites/game-3')
      .set('x-user-id', 'user-9')
      .expect(204);
  });

  it('returns 401 on delete when unauthenticated', async () => {
    await request(app).delete('/api/favourites/game-4').expect(401);
    expect(mockRemove).not.toHaveBeenCalled();
  });
});

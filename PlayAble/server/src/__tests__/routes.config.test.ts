jest.mock('express', () => {
  const handlers: { path: string; method: string }[] = [];
  const router: any = {
    get: jest.fn((path, ...rest) => handlers.push({ path, method: 'get' })),
    post: jest.fn((path, ...rest) => handlers.push({ path, method: 'post' })),
    put: jest.fn((path, ...rest) => handlers.push({ path, method: 'put' })),
    delete: jest.fn((path, ...rest) => handlers.push({ path, method: 'delete' })),
    use: jest.fn(),
  };
  return { Router: () => router, __handlers: handlers };
});

jest.mock('../middleware/auth', () => ({
  protect: jest.fn((_req: any, _res: any, next: any) => next && next()),
}));

describe('route modules register endpoints', () => {
  beforeEach(async () => {
    jest.resetModules();
    process.env.JWT_SECRET = 'test-secret';
    const express = await import('express');
    ((express as any).__handlers as any[]).length = 0;
  });
  afterEach(() => {
    jest.resetModules();
  });

  it('registers reviewReports routes', async () => {
    const express = await import('express');
    await import('../routes/reviewReports.routes');
    const handlers = (express as any).__handlers as Array<{ path: string; method: string }>;
    expect(handlers.some(h => h.path === '/reviews/:id/report')).toBe(true);
  });

  it('registers reviews routes', async () => {
    const express = await import('express');
    await import('../routes/reviews.routes');
    const handlers = (express as any).__handlers as Array<{ path: string; method: string }>;
    expect(handlers.some(h => h.path.includes('/games/:id/reviews'))).toBe(true);
  });

  it('registers auth routes', async () => {
    const express = await import('express');
    await import('../routes/authRoutes');
    const handlers = (express as any).__handlers as Array<{ path: string; method: string }>;
    expect(handlers.length).toBeGreaterThan(0);
  });

  it('registers favourites routes', async () => {
    const express = await import('express');
    await import('../routes/favourites.routes');
    const handlers = (express as any).__handlers as Array<{ path: string; method: string }>;
    expect(handlers.some(h => h.path === '/' || h.path === '/:gameId')).toBe(true);
  });
});

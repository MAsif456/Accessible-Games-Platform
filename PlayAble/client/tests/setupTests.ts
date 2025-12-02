import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

if (!(global as any).TextEncoder) {
  (global as any).TextEncoder = TextEncoder;
}

if (!(global as any).TextDecoder) {
  (global as any).TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

const sampleGames = [
  {
    id: 'game-1',
    _id: 'game-1',
    slug: 'game-1',
    title: 'Sample Game One',
    studio: 'Studio One',
    description: 'Description for Sample Game One',
    thumbnailUrl: '/images/games/sample-one.jpg',
    genres: ['Action'],
    accessibilityTags: ['Vision', 'Motor'],
    specificAccessibilityTags: {
      Vision: ['High Contrast Mode', 'Colorblind Filters'],
      Motor: ['Assist Mode', 'One-Button Mode'],
    },
    releaseYear: 2024,
  },
];

const sampleReviews = [
  {
    _id: 'review-1',
    gameId: 'game-1',
    userId: 'user-1',
    authorName: 'Tester One',
    body: 'Great accessibility!',
    likes: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'review-2',
    gameId: 'game-1',
    userId: 'user-2',
    authorName: 'Tester Two',
    body: 'Needs improvement in sound cues.',
    likes: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultFetch = (global.fetch ||
  ((jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  )) as any)) as jest.Mock;

global.fetch = jest.fn((input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input.toString();

  if (url.startsWith('/api/games')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          games: sampleGames,
          currentPage: 1,
          pageSize: sampleGames.length,
          totalResults: sampleGames.length,
          totalPages: 1,
        }),
    } as Response);
  }

  if (url.match(/\/api\/games\/.*\/reviews/)) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(sampleReviews),
    } as Response);
  }

  if (url.startsWith('/api/reviews/stats')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ totalReviews: sampleReviews.length }),
    } as Response);
  }

  return defaultFetch(input);
});

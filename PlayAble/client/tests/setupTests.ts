import '@testing-library/jest-dom';
// This file is kept minimal; most shared Jest setup now lives in src/setupTests.ts

// jsdom does not implement window.scrollTo; mock it for tests
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
});

// jsdom does not implement alert; mock it for tests
Object.defineProperty(window, 'alert', {
  value: jest.fn(),
  writable: true,
});

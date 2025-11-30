import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill fetch for Jest/Node environment
import 'whatwg-fetch';

// @ts-ignore
if (!global.TextEncoder) {
  // @ts-ignore
  global.TextEncoder = TextEncoder;
}

if (!global.TextDecoder) {
  // @ts-ignore
  global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;
}

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
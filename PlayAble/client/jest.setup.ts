import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for libraries like react-router in Jest/jsdom
import { TextEncoder, TextDecoder } from 'util';
// @ts-ignore
if (!global.TextEncoder) {
  // @ts-ignore
  global.TextEncoder = TextEncoder;
}
// @ts-ignore
if (!global.TextDecoder) {
  // @ts-ignore
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}

// Mock window.scrollTo in jsdom to avoid "not implemented" errors during tests
// @ts-ignore
if (typeof window !== 'undefined' && !window.scrollTo) {
  // @ts-ignore
  window.scrollTo = jest.fn();
}

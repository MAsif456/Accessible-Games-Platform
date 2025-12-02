import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for libraries like react-router in Jest/jsdom
if (!(global as any).TextEncoder) {
  (global as any).TextEncoder = TextEncoder;
}

if (!(global as any).TextDecoder) {
  (global as any).TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

// Mock window.scrollTo in jsdom to avoid "not implemented" errors during tests
if (typeof window !== 'undefined' && !(window as any).scrollTo) {
  (window as any).scrollTo = jest.fn();
}

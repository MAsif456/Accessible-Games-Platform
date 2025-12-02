import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

if (!(global as any).TextEncoder) {
  (global as any).TextEncoder = TextEncoder;
}

if (!(global as any).TextDecoder) {
  (global as any).TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

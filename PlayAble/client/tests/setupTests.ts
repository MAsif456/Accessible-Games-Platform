import '@testing-library/jest-dom';
// Simple global fetch mock for Jest environment
global.fetch = global.fetch || (jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })) as any);

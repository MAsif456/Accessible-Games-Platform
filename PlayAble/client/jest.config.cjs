/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  // Look for tests in both src and tests folders
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Optional but nice: only pick up *.test.ts(x) / *.spec.ts(x)
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  moduleNameMapper: {
    // Mock CSS imports using your tests/styleMock.js
    '^.+\\.(css|less|scss|sass)$': '<rootDir>/tests/styleMock.js',
    // Allow imports like `import x from "src/..."` in tests
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  // Use the shared Jest setup in tests/setupTests.ts
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
};

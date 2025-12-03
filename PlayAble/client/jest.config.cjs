/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  // Look for tests in both src and tests folders
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Pick up *.test.tsx / *.spec.tsx etc
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  moduleNameMapper: {
    // Use explicit style mock file
    '^.+\\.(css|less|scss|sass)$': '<rootDir>/tests/styleMock.js',
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/main.tsx',
    '!src/setupTests.ts',
    '!src/vite-env.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'lcov'],
};

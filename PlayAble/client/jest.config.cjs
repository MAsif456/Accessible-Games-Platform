/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  // Look for tests in src folder (including __tests__ subdirectories)
  roots: ['<rootDir>/src'],

  // Pick up *.test.tsx / *.spec.tsx etc
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  moduleNameMapper: {
    // Mock CSS imports
    '^.+\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // Enable coverage collection and use v8 provider
  collectCoverage: true,
  coverageProvider: 'v8',

  // Coverage configuration: include src, exclude tests and boilerplate
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/main.tsx',
    '!src/setupTests.ts',
    '!src/vite-env.d.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'html', 'lcov'],
  coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/dist/'],
};



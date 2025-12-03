module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  // Enable coverage collection and use v8 provider
  collectCoverage: true,
  coverageProvider: 'v8',
  // Combine explicit include/exclude patterns with standard directory setup
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.test.{ts,js}',
    '!src/**/__tests__/**',
    '!src/server.ts',
    '!src/scripts/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'html', 'lcov'],
  coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/dist/'],
};

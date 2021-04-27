module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__testcontainers__/**/*.test.ts',
    '**/__tests__/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  verbose: true,
  clearMocks: true,
  testTimeout: 120000
}

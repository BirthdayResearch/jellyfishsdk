module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.ts',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  verbose: true,
  clearMocks: true
};

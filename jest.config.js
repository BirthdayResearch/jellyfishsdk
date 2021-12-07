module.exports = {
  preset: 'ts-jest',
  testRegex: '((\\.|/)(e2e|test|spec))\\.[jt]sx?$',
  testSequencer: require.resolve('./jest.sequencer'),
  moduleNameMapper: {
    '@defichain/jellyfish-(.*)': '<rootDir>/packages/jellyfish-$1/src',
    '@defichain/testcontainers': '<rootDir>/packages/testcontainers/src',
    '@defichain/testing': '<rootDir>/packages/testing/src'
  },
  verbose: true,
  clearMocks: true,
  testTimeout: 580000,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '.*/__tests__/.*',
    '/examples/',
    '/website/'
  ]
}

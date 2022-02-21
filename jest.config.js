module.exports = {
  preset: 'ts-jest',
  testRegex: '((\\.|/)(e2e|test|spec))\\.[jt]sx?$',
  testSequencer: require.resolve('./jest.sequencer'),
  moduleNameMapper: {
    '@defichain/(?!whale-api-client)(.*)': '<rootDir>/packages/$1/src',

    // nest-apps
    '@defichain-app-lib/actuator(.*)': '<rootDir>/apps/libs/actuator/src/$1'
  },
  verbose: true,
  clearMocks: true,
  testTimeout: 180000,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/examples/',
    '/apps/website/',
    '.*/__tests__/.*',
    '.*/testing/.*'
  ]
}

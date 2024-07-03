const config = require('./jest.config.js')

module.exports = {
  ...config,
  testRegex: '((\\.|/)(sanity))\\.ts$',
  testPathIgnorePatterns: [],
  globalSetup: './jest.sanity.setup.js',
  testTimeout: 900000
}

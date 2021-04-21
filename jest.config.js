module.exports = {
  projects: [
    '<rootDir>/packages/*'
  ],
  testTimeout: 240000,
  collectCoverageFrom: [
    'packages/**/*.{ts,js}',
    '!packages/**/__tests__/**'
  ]
}

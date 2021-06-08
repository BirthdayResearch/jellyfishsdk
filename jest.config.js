module.exports = {
  preset: 'ts-jest',
  testRegex: '((\\.|/)(e2e|test|spec))\\.[jt]sx?$',
  moduleNameMapper: {
    '@defichain/jellyfish-address': '<rootDir>/packages/jellyfish-address/src',
    '@defichain/jellyfish-api-core': '<rootDir>/packages/jellyfish-api-core/src',
    '@defichain/jellyfish-api-jsonrpc': '<rootDir>/packages/jellyfish-api-jsonrpc/src',
    '@defichain/jellyfish-crypto': '<rootDir>/packages/jellyfish-crypto/src',
    '@defichain/jellyfish-json': '<rootDir>/packages/jellyfish-json/src',
    '@defichain/jellyfish-network': '<rootDir>/packages/jellyfish-network/src',
    '@defichain/jellyfish-transaction': '<rootDir>/packages/jellyfish-transaction/src',
    '@defichain/jellyfish-transaction-builder': '<rootDir>/packages/jellyfish-transaction-builder/src',
    '@defichain/jellyfish-wallet': '<rootDir>/packages/jellyfish-wallet/src',
    '@defichain/jellyfish-wallet-mnemonic': '<rootDir>/packages/jellyfish-wallet-mnemonic/src',
    '@defichain/testcontainers': '<rootDir>/packages/testcontainers/src',
    '@defichain/testing': '<rootDir>/packages/testing/src'
  },
  testTimeout: 240000
}

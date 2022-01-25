import { isSkippedTxId } from '@defichain/jellyfish-network'

it('should be skipped on MainNet', async () => {
  expect(isSkippedTxId('949c7243483d52b85e6ef058fe8814b5fd6b307a529fd34c07daa8eae5759770')).toStrictEqual(true)
  expect(isSkippedTxId('0863180da779d530ff5184908bc1ddd85910a5c643d1317fe0f3796f47eba414')).toStrictEqual(true)
})

it('should not be skipped on MainNet as txId do not exist', () => {
  expect(isSkippedTxId('949c7243483d52b85e6ef058fe8814b5fd6b307a529fd34c07daa8eae5759771')).toStrictEqual(false)
})

it('should not be skipped on MainNet as txId is on TestNet', () => {
  expect(isSkippedTxId('4f5f620484e5359eafb9fe799b568a59ca75202bfe6aa1546c54820c99889437')).toStrictEqual(false)
})

it('should be skipped on TestNet', async () => {
  expect(isSkippedTxId('4f5f620484e5359eafb9fe799b568a59ca75202bfe6aa1546c54820c99889437', 'testnet')).toStrictEqual(true)
  expect(isSkippedTxId('b22fca714f70f68e45bef2babc5d7f0a1c81fd892ddfd347edb43cc80fc31db2', 'testnet')).toStrictEqual(true)
})

it('should not be skipped on TestNet as txID is on MainNet', async () => {
  expect(isSkippedTxId('1fcd0987e064964e8796c3e297d6b8d6477ccca8dd37175bf3d0935161baf2b6', 'testnet')).toStrictEqual(false)
})

import { Network, MainNet, RegTest, TestNet } from '../src'

it('should be exported', () => {
  const network: Network = MainNet
  expect(network.bech32).toBe('df')
  expect(network.wif).toBe(0x80)
})

it('should match MainNet network', () => {
  expect(MainNet.messagePrefix).toBe('\x15Defi Signed Message:\n')
  expect(MainNet.bech32).toBe('df')
  expect(MainNet.bip32.public).toBe(0x0488b21e)
  expect(MainNet.bip32.private).toBe(0x0488ade4)
  expect(MainNet.pubKeyHash).toBe(0x12)
  expect(MainNet.scriptHash).toBe(0x5a)
  expect(MainNet.wif).toBe(0x80)
})

it('should match TestNet network', () => {
  expect(TestNet.messagePrefix).toBe('\x15Defi Signed Message:\n')
  expect(TestNet.bech32).toBe('tf')
  expect(TestNet.bip32.public).toBe(0x043587cf)
  expect(TestNet.bip32.private).toBe(0x04358394)
  expect(TestNet.pubKeyHash).toBe(0xf)
  expect(TestNet.scriptHash).toBe(0x80)
  expect(TestNet.wif).toBe(0xef)
})

it('should match RegTest network', () => {
  expect(RegTest.messagePrefix).toBe('\x15Defi Signed Message:\n')
  expect(RegTest.bech32).toBe('bcrt')
  expect(RegTest.bip32.public).toBe(0x043587cf)
  expect(RegTest.bip32.private).toBe(0x04358394)
  expect(RegTest.pubKeyHash).toBe(0x6f)
  expect(RegTest.scriptHash).toBe(0xc4)
  expect(RegTest.wif).toBe(0xef)
})

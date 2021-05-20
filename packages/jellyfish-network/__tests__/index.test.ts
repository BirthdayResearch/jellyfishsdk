import { Network, MainNet, RegTest, TestNet, getNetwork } from '../src'

it('should be exported', () => {
  const network: Network = MainNet
  expect(network.bech32.hrp).toBe('df')
  expect(network.wifPrefix).toBe(0x80)
})

describe('getNetwork', () => {
  it('should get mainnet', () => {
    expect(getNetwork('mainnet').name).toBe('mainnet')
    expect(getNetwork('mainnet').bech32.hrp).toBe('df')
  })

  it('should get testnet', () => {
    expect(getNetwork('testnet').name).toBe('testnet')
    expect(getNetwork('testnet').bech32.hrp).toBe('tf')
  })

  it('should get regtest', () => {
    expect(getNetwork('regtest').name).toBe('regtest')
    expect(getNetwork('regtest').bech32.hrp).toBe('bcrt')
  })
})

it('should match MainNet network', () => {
  expect(MainNet.name).toBe('mainnet')
  expect(MainNet.bech32.hrp).toBe('df')
  expect(MainNet.bip32.publicPrefix).toBe(0x0488b21e)
  expect(MainNet.bip32.privatePrefix).toBe(0x0488ade4)
  expect(MainNet.wifPrefix).toBe(0x80)
  expect(MainNet.pubKeyHashPrefix).toBe(0x12)
  expect(MainNet.scriptHashPrefix).toBe(0x5a)
  expect(MainNet.messagePrefix).toBe('\x15Defi Signed Message:\n')
})

it('should match TestNet network', () => {
  expect(TestNet.name).toBe('testnet')
  expect(TestNet.bech32.hrp).toBe('tf')
  expect(TestNet.bip32.publicPrefix).toBe(0x043587cf)
  expect(TestNet.bip32.privatePrefix).toBe(0x04358394)
  expect(TestNet.wifPrefix).toBe(0xef)
  expect(TestNet.pubKeyHashPrefix).toBe(0xf)
  expect(TestNet.scriptHashPrefix).toBe(0x80)
  expect(TestNet.messagePrefix).toBe('\x15Defi Signed Message:\n')
})

it('should match RegTest network', () => {
  expect(RegTest.name).toBe('regtest')
  expect(RegTest.bech32.hrp).toBe('bcrt')
  expect(RegTest.bip32.publicPrefix).toBe(0x043587cf)
  expect(RegTest.bip32.privatePrefix).toBe(0x04358394)
  expect(RegTest.wifPrefix).toBe(0xef)
  expect(RegTest.pubKeyHashPrefix).toBe(0x6f)
  expect(RegTest.scriptHashPrefix).toBe(0xc4)
  expect(RegTest.messagePrefix).toBe('\x15Defi Signed Message:\n')
})

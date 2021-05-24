import { Network, MainNet, RegTest, TestNet, getNetwork } from '../src'

it('should be exported', () => {
  const network: Network = MainNet
  expect(network.bech32.hrp).toStrictEqual('df')
  expect(network.wifPrefix).toStrictEqual(0x80)
})

describe('getNetwork', () => {
  it('should get mainnet', () => {
    expect(getNetwork('mainnet').name).toStrictEqual('mainnet')
    expect(getNetwork('mainnet').bech32.hrp).toStrictEqual('df')
  })

  it('should get testnet', () => {
    expect(getNetwork('testnet').name).toStrictEqual('testnet')
    expect(getNetwork('testnet').bech32.hrp).toStrictEqual('tf')
  })

  it('should get regtest', () => {
    expect(getNetwork('regtest').name).toStrictEqual('regtest')
    expect(getNetwork('regtest').bech32.hrp).toStrictEqual('bcrt')
  })
})

it('should match MainNet network', () => {
  expect(MainNet.name).toStrictEqual('mainnet')
  expect(MainNet.bech32.hrp).toStrictEqual('df')
  expect(MainNet.bip32.publicPrefix).toStrictEqual(0x0488b21e)
  expect(MainNet.bip32.privatePrefix).toStrictEqual(0x0488ade4)
  expect(MainNet.wifPrefix).toStrictEqual(0x80)
  expect(MainNet.pubKeyHashPrefix).toStrictEqual(0x12)
  expect(MainNet.scriptHashPrefix).toStrictEqual(0x5a)
  expect(MainNet.messagePrefix).toStrictEqual('\x15Defi Signed Message:\n')
})

it('should match TestNet network', () => {
  expect(TestNet.name).toStrictEqual('testnet')
  expect(TestNet.bech32.hrp).toStrictEqual('tf')
  expect(TestNet.bip32.publicPrefix).toStrictEqual(0x043587cf)
  expect(TestNet.bip32.privatePrefix).toStrictEqual(0x04358394)
  expect(TestNet.wifPrefix).toStrictEqual(0xef)
  expect(TestNet.pubKeyHashPrefix).toStrictEqual(0xf)
  expect(TestNet.scriptHashPrefix).toStrictEqual(0x80)
  expect(TestNet.messagePrefix).toStrictEqual('\x15Defi Signed Message:\n')
})

it('should match RegTest network', () => {
  expect(RegTest.name).toStrictEqual('regtest')
  expect(RegTest.bech32.hrp).toStrictEqual('bcrt')
  expect(RegTest.bip32.publicPrefix).toStrictEqual(0x043587cf)
  expect(RegTest.bip32.privatePrefix).toStrictEqual(0x04358394)
  expect(RegTest.wifPrefix).toStrictEqual(0xef)
  expect(RegTest.pubKeyHashPrefix).toStrictEqual(0x6f)
  expect(RegTest.scriptHashPrefix).toStrictEqual(0xc4)
  expect(RegTest.messagePrefix).toStrictEqual('\x15Defi Signed Message:\n')
})

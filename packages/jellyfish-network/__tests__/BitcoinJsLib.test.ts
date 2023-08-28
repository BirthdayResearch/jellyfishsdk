import { getNetworkBitcoinJsLib } from '@defichain/jellyfish-network'

it('should match MainNet network', () => {
  const network = getNetworkBitcoinJsLib('mainnet')

  expect(network.bech32).toStrictEqual('df')
  expect(network.bip32.public).toStrictEqual(0x0488b21e)
  expect(network.bip32.private).toStrictEqual(0x0488ade4)
  expect(network.wif).toStrictEqual(0x80)
  expect(network.pubKeyHash).toStrictEqual(0x12)
  expect(network.scriptHash).toStrictEqual(0x5a)
  expect(network.messagePrefix).toStrictEqual('\x15Defi Signed Message:\n')
})

it('should match TestNet network', () => {
  const network = getNetworkBitcoinJsLib('testnet')

  expect(network.bech32).toStrictEqual('tf')
  expect(network.bip32.public).toStrictEqual(0x043587cf)
  expect(network.bip32.private).toStrictEqual(0x04358394)
  expect(network.wif).toStrictEqual(0xef)
  expect(network.pubKeyHash).toStrictEqual(0xf)
  expect(network.scriptHash).toStrictEqual(0x80)
  expect(network.messagePrefix).toStrictEqual('\x15Defi Signed Message:\n')
})

it('should match RegTest network', () => {
  const network = getNetworkBitcoinJsLib('regtest')

  expect(network.bech32).toStrictEqual('bcrt')
  expect(network.bip32.public).toStrictEqual(0x043587cf)
  expect(network.bip32.private).toStrictEqual(0x04358394)
  expect(network.wif).toStrictEqual(0xef)
  expect(network.pubKeyHash).toStrictEqual(0x6f)
  expect(network.scriptHash).toStrictEqual(0xc4)
  expect(network.messagePrefix).toStrictEqual('\x15Defi Signed Message:\n')
})

it('should match Changi network', () => {
  const network = getNetworkBitcoinJsLib('changi')

  expect(network.bech32).toStrictEqual('tf')
  expect(network.bip32.public).toStrictEqual(0x043587cf)
  expect(network.bip32.private).toStrictEqual(0x04358394)
  expect(network.wif).toStrictEqual(0xef)
  expect(network.pubKeyHash).toStrictEqual(0xf)
  expect(network.scriptHash).toStrictEqual(0x80)
  expect(network.messagePrefix).toStrictEqual('\x15Defi Signed Message:\n')
})

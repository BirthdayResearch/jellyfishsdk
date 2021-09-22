import { fromAddress } from '@defichain/jellyfish-address'
import { NetworkName } from '@defichain/jellyfish-network'

it('should fail if invalid address "invalid address"', () => {
  const address = 'invalid address'

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromAddress(address, network)).toBeUndefined()
  }
})

it('should fail with invalid b58c prefix', () => {
  const address = 'JBuS81VT8ouPrT6YS55qoS74D13Cw7h1Y'

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromAddress(address, network)).toBeUndefined()
  }
})

it('should fail with invalid b58c checksum', () => {
  const address = '8JBuS81VT8ouPrT6YS55qoS74D13Cw7h1X'

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromAddress(address, network)).toBeUndefined()
  }
})

it('should fail with invalid b58c removed prefix', () => {
  const address = 'JBuS81VT8ouPrT6YS55FFPENo7FPMJpDV6fUcfo4QfkZrfrV1Uf8qoS74D13Cw7h1Y'

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromAddress(address, network)).toBeUndefined()
  }
})

it('should fail with invalid b58c trimmed checksum', () => {
  const address = 'dFFPENo7FPMJpDV6fUcfo4QfkZrfrV1Uf'

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromAddress(address, network)).toBeUndefined()
  }
})

it('should fail with invalid bech32 broken prefix', () => {
  const address = 'f1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt2xr8mpv'

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromAddress(address, network)).toBeUndefined()
  }
})

it('should fail with invalid bech32 letter o', () => {
  const address = 'df1pe7q4vvtxpdunpazvmwqdh3xlnatfdt2ncrpqo'

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromAddress(address, network)).toBeUndefined()
  }
})

it('should fail with invalid bech32 trimmed prefix', () => {
  const address = 'f1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvsfkkf88'

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromAddress(address, network)).toBeUndefined()
  }
})

it('should fail with invalid bech32 letter o', () => {
  const address = 'df1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvsfkkf8o'

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromAddress(address, network)).toBeUndefined()
  }
})

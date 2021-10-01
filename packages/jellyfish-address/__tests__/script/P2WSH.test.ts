import { OP_CODES, Script } from '@defichain/jellyfish-transaction'
import { AddressType, DecodedAddress, fromAddress, fromScript } from '@defichain/jellyfish-address'
import { NetworkName } from '@defichain/jellyfish-network'
import { fromScriptP2WSH } from '../../src/script/P2WSH'

it('should convert from Script/Address', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('9e1be07558ea5cc8e02ed1d80c0911048afad949affa36d5c3951e3159dbea19')
    ]
  }

  {
    const expected: DecodedAddress = {
      type: AddressType.P2WSH,
      address: 'df1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvsfkkf88',
      script: script,
      network: 'mainnet'
    }

    expect(fromScriptP2WSH(script, 'mainnet')).toStrictEqual(expected.address)
    expect(fromScript(script, 'mainnet')).toStrictEqual(expected)
    expect(fromAddress(expected.address, 'mainnet')).toStrictEqual(expected)
  }

  {
    const expected: DecodedAddress = {
      type: AddressType.P2WSH,
      address: 'tf1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvsemeex5',
      script: script,
      network: 'testnet'
    }

    expect(fromScriptP2WSH(script, 'testnet')).toStrictEqual(expected.address)
    expect(fromScript(script, 'testnet')).toStrictEqual(expected)
    expect(fromAddress(expected.address, 'testnet')).toStrictEqual(expected)
  }

  {
    const expected: DecodedAddress = {
      type: AddressType.P2WSH,
      address: 'bcrt1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvssfsq3t',
      script: script,
      network: 'regtest'
    }

    expect(fromScriptP2WSH(script, 'regtest')).toStrictEqual(expected.address)
    expect(fromScript(script, 'regtest')).toStrictEqual(expected)
    expect(fromAddress(expected.address, 'regtest')).toStrictEqual(expected)
  }
})

describe('invalid should fail', () => {
  it('should fail to convert from script, if length != 2', () => {
    const script: Script = {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA_HEX_LE('9e1be07558ea5cc8e02ed1d80c0911048afad949affa36d5c3951e3159dbea19'),
        OP_CODES.OP_EQUALVERIFY
      ]
    }

    for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
      expect(fromScriptP2WSH(script, network)).toBeUndefined()
      expect(fromScript(script, network)).toBeUndefined()
    }
  })

  it('should fail to convert from script, if [0] != OP_0', () => {
    const script: Script = {
      stack: [
        OP_CODES.OP_10,
        OP_CODES.OP_PUSHDATA_HEX_LE('9e1be07558ea5cc8e02ed1d80c0911048afad949affa36d5c3951e3159dbea19')
      ]
    }

    for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
      expect(fromScriptP2WSH(script, network)).toBeUndefined()
      expect(fromScript(script, network)).toBeUndefined()
    }
  })

  it('should fail to convert from script, if [1] != OP_PUSHDATA', () => {
    const script: Script = {
      stack: [
        OP_CODES.OP_1,
        OP_CODES.OP_RETURN
      ]
    }

    for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
      expect(fromScriptP2WSH(script, network)).toBeUndefined()
      expect(fromScript(script, network)).toBeUndefined()
    }
  })

  it('should fail to convert from script, if [1].length != 20', () => {
    const script: Script = {
      stack: [
        OP_CODES.OP_1,
        OP_CODES.OP_PUSHDATA_HEX_LE('9e1be07558ea5cc8e02ed1d80c0911048afad949affa36d5c3951e3159dbea1900')
      ]
    }

    for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
      expect(fromScriptP2WSH(script, network)).toBeUndefined()
      expect(fromScript(script, network)).toBeUndefined()
    }
  })
})

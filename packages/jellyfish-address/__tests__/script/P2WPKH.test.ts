import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { wallet } from '@defichain/jellyfish-api-core'
import { OP_CODES, Script } from '@defichain/jellyfish-transaction'
import { HASH160 } from '@defichain/jellyfish-crypto'
import { AddressType, DecodedAddress, fromAddress, fromScript, fromScriptHex } from '@defichain/jellyfish-address'
import { fromScriptP2WPKH } from '../../src/script/P2WPKH'
import { NetworkName } from '@defichain/jellyfish-network'

describe('with regtest container', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should generate address as with defid', async () => {
    const address = await testing.rpc.wallet.getNewAddress('', wallet.AddressType.BECH32)
    const info = await testing.rpc.wallet.getAddressInfo(address)

    const script: Script = {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(HASH160(Buffer.from(info.pubkey, 'hex')), 'little')
      ]
    }

    const expected: DecodedAddress = {
      type: AddressType.P2WPKH,
      address: address,
      script: script,
      network: 'regtest'
    }

    expect(fromScript(script, 'regtest')).toStrictEqual(expected)
    expect(fromAddress(address, 'regtest')).toStrictEqual(expected)

    expect(fromScriptHex(info.scriptPubKey, 'regtest')?.address).toStrictEqual(address)
    expect(fromScriptP2WPKH(script, 'regtest')).toStrictEqual(address)
  })
})

it('should convert from Script/Address', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('0e7c0ab18b305bc987a266dc06de26fcfab4b56a')
    ]
  }

  {
    const expected: DecodedAddress = {
      type: AddressType.P2WPKH,
      address: 'df1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt2xr8mpv',
      script: script,
      network: 'mainnet'
    }

    expect(fromScriptP2WPKH(script, 'mainnet')).toStrictEqual(expected.address)
    expect(fromScript(script, 'mainnet')).toStrictEqual(expected)
    expect(fromAddress(expected.address, 'mainnet')).toStrictEqual(expected)
  }

  {
    const expected: DecodedAddress = {
      type: AddressType.P2WPKH,
      address: 'tf1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt24nagpg',
      script: script,
      network: 'testnet'
    }

    expect(fromScriptP2WPKH(script, 'testnet')).toStrictEqual(expected.address)
    expect(fromScript(script, 'testnet')).toStrictEqual(expected)
    expect(fromAddress(expected.address, 'testnet')).toStrictEqual(expected)
  }

  {
    const expected: DecodedAddress = {
      type: AddressType.P2WPKH,
      address: 'bcrt1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt2xghtpf',
      script: script,
      network: 'regtest'
    }

    expect(fromScriptP2WPKH(script, 'regtest')).toStrictEqual(expected.address)
    expect(fromScript(script, 'regtest')).toStrictEqual(expected)
    expect(fromAddress(expected.address, 'regtest')).toStrictEqual(expected)
  }
})

describe('invalid should fail', () => {
  it('should fail to convert from script, if length != 2', () => {
    const script: Script = {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA_HEX_LE('0e7c0ab18b305bc987a266dc06de26fcfab4b56a'),
        OP_CODES.OP_EQUALVERIFY
      ]
    }

    for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
      expect(fromScriptP2WPKH(script, network)).toBeUndefined()
      expect(fromScript(script, network)).toBeUndefined()
    }
  })

  it('should fail to convert from script, if [0] != OP_0', () => {
    const script: Script = {
      stack: [
        OP_CODES.OP_10,
        OP_CODES.OP_PUSHDATA_HEX_LE('0e7c0ab18b305bc987a266dc06de26fcfab4b56a')
      ]
    }

    for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
      expect(fromScriptP2WPKH(script, network)).toBeUndefined()
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
      expect(fromScriptP2WPKH(script, network)).toBeUndefined()
      expect(fromScript(script, network)).toBeUndefined()
    }
  })

  it('should fail to convert from script, if [1].length != 20', () => {
    const script: Script = {
      stack: [
        OP_CODES.OP_1,
        OP_CODES.OP_PUSHDATA_HEX_LE('0e7c0ab18b305bc987a266dc06de26fcfab4b56a00')
      ]
    }

    for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
      expect(fromScriptP2WPKH(script, network)).toBeUndefined()
      expect(fromScript(script, network)).toBeUndefined()
    }
  })
})

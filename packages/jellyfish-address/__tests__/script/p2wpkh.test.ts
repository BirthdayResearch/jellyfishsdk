import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { wallet } from '@defichain/jellyfish-api-core'
import { OP_CODES, Script } from '@defichain/jellyfish-transaction'
import { HASH160 } from '@defichain/jellyfish-crypto'
import { fromScript, fromScriptHex } from '@defichain/jellyfish-address'
import { fromScriptP2WPKH } from '../../src/script/p2wpkh'
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

    expect(fromScript(script, 'regtest')).toStrictEqual({
      type: 'p2wpkh',
      address: address,
      script: script,
      network: 'regtest'
    })
    expect(fromScriptHex(info.scriptPubKey, 'regtest')?.address).toStrictEqual(address)
    expect(fromScriptP2WPKH(script, 'regtest')).toStrictEqual(address)
  })
})

it('should convert from Script', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('0e7c0ab18b305bc987a266dc06de26fcfab4b56a')
    ]
  }

  {
    const address = fromScriptP2WPKH(script, 'mainnet')
    expect(address).toStrictEqual('df1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt2xr8mpv')
  }

  {
    const address = fromScriptP2WPKH(script, 'testnet')
    expect(address).toStrictEqual('tf1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt24nagpg')
  }

  {
    const address = fromScriptP2WPKH(script, 'regtest')
    expect(address).toStrictEqual('bcrt1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt2xghtpf')
  }
})

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

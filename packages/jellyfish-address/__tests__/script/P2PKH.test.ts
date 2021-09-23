import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { wallet } from '@defichain/jellyfish-api-core'
import { OP_CODES, Script } from '@defichain/jellyfish-transaction'
import { HASH160 } from '@defichain/jellyfish-crypto'
import { fromScript, fromScriptHex } from '@defichain/jellyfish-address'
import { fromScriptP2PKH } from '../../src/script/P2PKH'
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
    const address = await testing.rpc.wallet.getNewAddress('', wallet.AddressType.LEGACY)
    const info = await testing.rpc.wallet.getAddressInfo(address)

    const script: Script = {
      stack: [
        OP_CODES.OP_DUP,
        OP_CODES.OP_HASH160,
        OP_CODES.OP_PUSHDATA(HASH160(Buffer.from(info.pubkey, 'hex')), 'little'),
        OP_CODES.OP_EQUALVERIFY,
        OP_CODES.OP_CHECKSIG
      ]
    }

    expect(fromScript(script, 'regtest')).toStrictEqual({
      type: 'p2pkh',
      address: address,
      script: script,
      network: 'regtest'
    })
    expect(fromScriptHex(info.scriptPubKey, 'regtest')?.address).toStrictEqual(address)
    expect(fromScriptP2PKH(script, 'regtest')).toStrictEqual(address)
  })
})

it('should convert from Script', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('134b0749882c225e8647df3a3417507c6f5b2797'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ]
  }

  {
    const address = fromScriptP2PKH(script, 'mainnet')
    expect(address).toStrictEqual('8GqsSfmyuu6pquKFRTeNkQu5brLUc5hAt5')

    const decoded = fromScript(script, 'mainnet')
    expect(decoded).toStrictEqual({
      type: 'p2pkh',
      address: address,
      script: script,
      network: 'mainnet'
    })
  }

  {
    const address = fromScriptP2PKH(script, 'testnet')
    expect(address).toStrictEqual('74q4VLt7nMiCPbtzMCeRJ35iiLZeSUm1Ub')

    const decoded = fromScript(script, 'testnet')
    expect(decoded).toStrictEqual({
      type: 'p2pkh',
      address: address,
      script: script,
      network: 'testnet'
    })
  }

  {
    const address = fromScriptP2PKH(script, 'regtest')
    expect(address).toStrictEqual('mhGy1mVmwgCJuDHJhUd1r5DF8mJChBAVW8')

    const decoded = fromScript(script, 'regtest')
    expect(decoded).toStrictEqual({
      type: 'p2pkh',
      address: address,
      script: script,
      network: 'regtest'
    })
  }
})

it('should fail to convert from script, if length != 5', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('134b0749882c225e8647df3a3417507c6f5b2797'),
      OP_CODES.OP_EQUALVERIFY
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2PKH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

it('should fail to convert from script, if [0] != OP_DUP', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('134b0749882c225e8647df3a3417507c6f5b2797'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2PKH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

it('should fail to convert from script, if [1] != OP_SHA256', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_DUP,
      OP_CODES.OP_SHA256,
      OP_CODES.OP_PUSHDATA_HEX_LE('134b0749882c225e8647df3a3417507c6f5b2797'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2PKH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

it('should fail to convert from script, if [2] != OP_PUSHDATA', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      OP_CODES.OP_RETURN,
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2PKH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

it('should fail to convert from script, if [2].length != 20', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('134b0749882c225e8647df3a3417507c6f5b279700'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2PKH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

it('should fail to convert from script, if [3] != OP_EQUALVERIFY', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('134b0749882c225e8647df3a3417507c6f5b2797'),
      OP_CODES.OP_HASH160,
      OP_CODES.OP_CHECKSIG
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2PKH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

it('should fail to convert from script, if [4] != OP_CHECKSIG', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('134b0749882c225e8647df3a3417507c6f5b2797'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_DUP
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2PKH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

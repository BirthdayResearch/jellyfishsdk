import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { wallet } from '@defichain/jellyfish-api-core'
import { fromOPCodes, OP_CODES, Script } from '@defichain/jellyfish-transaction'
import { HASH160 } from '@defichain/jellyfish-crypto'
import { fromScript, fromScriptHex } from '@defichain/jellyfish-address'
import { NetworkName } from '@defichain/jellyfish-network'
import { fromScriptP2SH } from '../../src/script/P2SH'

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
    const address = await testing.rpc.wallet.getNewAddress('', wallet.AddressType.P2SH_SEGWIT)
    const info = await testing.rpc.wallet.getAddressInfo(address)

    const p2wpkh: Script = {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(HASH160(Buffer.from(info.pubkey, 'hex')), 'little')
      ]
    }

    const script: Script = {
      stack: [
        OP_CODES.OP_HASH160,
        OP_CODES.OP_PUSHDATA(HASH160(fromOPCodes(p2wpkh.stack)), 'little'),
        OP_CODES.OP_EQUAL
      ]
    }

    expect(fromScript(script, 'regtest')).toStrictEqual({
      type: 'p2sh',
      address: address,
      script: script,
      network: 'regtest'
    })
    expect(fromScriptHex(info.scriptPubKey, 'regtest')?.address).toStrictEqual(address)
    expect(fromScriptP2SH(script, 'regtest')).toStrictEqual(address)
  })
})

it('should convert from Script', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('1410c734d66b986f2a7c2c340a1ee18d83d9b5a2'),
      OP_CODES.OP_EQUAL
    ]
  }

  {
    const address = fromScriptP2SH(script, 'mainnet')
    expect(address).toStrictEqual('dFFPENo7FPMJpDV6fUcfo4QfkZrfrV1Uf8')

    const decoded = fromScript(script, 'mainnet')
    expect(decoded).toStrictEqual({
      type: 'p2sh',
      address: address,
      script: script,
      network: 'mainnet'
    })
  }

  {
    const address = fromScriptP2SH(script, 'testnet')
    expect(address).toStrictEqual('tY6JeW84EExbtgnPbRGnDpkZfjeWrPEvia')

    const decoded = fromScript(script, 'testnet')
    expect(decoded).toStrictEqual({
      type: 'p2sh',
      address: address,
      script: script,
      network: 'testnet'
    })
  }

  {
    const address = fromScriptP2SH(script, 'regtest')
    expect(address).toStrictEqual('2Mu5KbtPeWWUBWAGHFwvTCMG4U3Af9Gynra')

    const decoded = fromScript(script, 'regtest')
    expect(decoded).toStrictEqual({
      type: 'p2sh',
      address: address,
      script: script,
      network: 'regtest'
    })
  }
})

it('should fail to convert from script, if length != 3', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('1410c734d66b986f2a7c2c340a1ee18d83d9b5a2'),
      OP_CODES.OP_EQUAL,
      OP_CODES.OP_RETURN
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2SH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

it('should fail to convert from script, if [0] != OP_HASH160', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('1410c734d66b986f2a7c2c340a1ee18d83d9b5a2'),
      OP_CODES.OP_EQUAL
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2SH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

it('should fail to convert from script, if [1] != OP_PUSHDATA', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_HASH160,
      OP_CODES.OP_RETURN,
      OP_CODES.OP_EQUAL
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2SH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

it('should fail to convert from script, if [1].length != 20', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('1410c734d66b986f2a7c2c340a1ee18d83d9b5a200'),
      OP_CODES.OP_EQUAL
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2SH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

it('should fail to convert from script, if [2] != OP_EQUAL', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('1410c734d66b986f2a7c2c340a1ee18d83d9b5a2'),
      OP_CODES.OP_HASH160
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2SH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

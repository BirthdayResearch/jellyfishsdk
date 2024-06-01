import { LedgerHdNodeProvider } from '../src/hd_node'
import Transport from '@ledgerhq/hw-transport'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import SpeculosTransport from '@ledgerhq/hw-transport-node-speculos'
import { dSHA256, HASH160 } from '@defichain/jellyfish-crypto'
import { OP_CODES, Transaction, Vout } from '@defichain/jellyfish-transaction'
import BigNumber from 'bignumber.js'

const transaction: Transaction = {
  version: 0x00000004,
  lockTime: 0x00000000,
  vin: [{
    index: 0,
    script: { stack: [] },
    sequence: 4294967278,
    txid: '9f96ade4b41d5433f4eda31e1738ec2b36f6e7d1420d94a6af99801a88f7f7ff'
  }],
  vout: [{
    script: {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
      ]
    },
    value: new BigNumber('5.98'),
    tokenId: 0x00
  }]
}

const prevout: Vout = {
  script: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
    ]
  },
  value: new BigNumber('6'),
  tokenId: 0x00
}

describe('hardware device tests', function () {
  let provider: LedgerHdNodeProvider
  let transport: Transport

  beforeAll(async () => {
    transport = await TransportNodeHid.create()
    provider = LedgerHdNodeProvider.getProvider(transport)
  })

  afterAll(async () => {
    await transport.close()
  })

  it('should get publlic key', async () => {
    const ledgerNode = provider.derive("m/44'/1129'/0'/0/0")

    const pubKey = await ledgerNode.publicKey(true)
    expect(pubKey.length).toStrictEqual(33)
  })

  it('should sign and verify signature', async () => {
    const ledgerNode = provider.derive("m/44'/1129'/0'/0/0")
    // sign
    const message = Buffer.from('test1', 'utf-8')
    const derSignature = await ledgerNode.sign(message)

    // construct the data signed by the ledger device
    const msgLengthString = message.length < 16 ? '0' + message.length.toString(16) : message.length.toString(16)
    const msgLength = Buffer.from(msgLengthString, 'hex')
    const inputData = Buffer.concat([Buffer.from('15', 'hex'), Buffer.from('Defi Signed Message:\n', 'utf-8'), msgLength, message])
    // calculate the input hash
    const hash = dSHA256(inputData)

    // verify
    const valid = await ledgerNode.verify(hash, derSignature)
    expect(valid).toStrictEqual(true)
  })

  it('should sign tx', async () => {
    const ledgerNode = provider.derive("m/44'/1129'/0'/0/0")
    const signed = await ledgerNode.signTx(transaction, [{
      ...prevout,
      script: {
        stack: [
          OP_CODES.OP_0,
          OP_CODES.OP_PUSHDATA(HASH160(await ledgerNode.publicKey()), 'little')
        ]
      }
    }])

    expect(signed.witness.length).toStrictEqual(1)
    expect(signed.witness[0].scripts.length).toStrictEqual(2)

    expect(signed.witness[0].scripts[0].hex.length).toBeGreaterThanOrEqual(140)
    expect(signed.witness[0].scripts[0].hex.length).toBeLessThanOrEqual(144) // NOTE(surangap): High s
    expect(signed.witness[0].scripts[1].hex.length).toStrictEqual(66)
  })
})

describe('speculos tests', function () {
  let provider: LedgerHdNodeProvider
  const apduPort = 9999
  let transport: Transport

  beforeAll(async () => {
    transport = await SpeculosTransport.open({ apduPort })
    provider = LedgerHdNodeProvider.getProvider(transport)
  })

  afterAll(async () => {
    await transport.close()
  })

  it('should get publlic key', async () => {
    const ledgerNode = provider.derive("m/44'/1129'/0'/0/0")

    const pubKey = await ledgerNode.publicKey(true)
    expect(pubKey.length).toStrictEqual(33)
  })

  it('should sign and verify signature', async () => {
    const ledgerNode = provider.derive("m/44'/1129'/0'/0/0")
    // sign
    const message = Buffer.from('test1', 'utf-8')
    const derSignature = await ledgerNode.sign(message)

    // construct the data signed by the ledger device
    const msgLengthString = message.length < 16 ? '0' + message.length.toString(16) : message.length.toString(16)
    const msgLength = Buffer.from(msgLengthString, 'hex')
    const inputData = Buffer.concat([Buffer.from('15', 'hex'), Buffer.from('Defi Signed Message:\n', 'utf-8'), msgLength, message])
    // calculate the input hash
    const hash = dSHA256(inputData)

    // verify
    const valid = await ledgerNode.verify(hash, derSignature)
    expect(valid).toStrictEqual(true)
  })

  it('should sign tx', async () => {
    const ledgerNode = provider.derive("m/44'/1129'/0'/0/0")
    const signed = await ledgerNode.signTx(transaction, [{
      ...prevout,
      script: {
        stack: [
          OP_CODES.OP_0,
          OP_CODES.OP_PUSHDATA(HASH160(await ledgerNode.publicKey()), 'little')
        ]
      }
    }])

    expect(signed.witness.length).toStrictEqual(1)
    expect(signed.witness[0].scripts.length).toStrictEqual(2)

    expect(signed.witness[0].scripts[0].hex.length).toBeGreaterThanOrEqual(140)
    expect(signed.witness[0].scripts[0].hex.length).toBeLessThanOrEqual(144) // NOTE(surangap): High s
    expect(signed.witness[0].scripts[1].hex.length).toStrictEqual(66)
  })
})

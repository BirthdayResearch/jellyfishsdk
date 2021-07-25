import { LedgerHdNodeProvider } from '../src/hd_node'
import Transport from '@ledgerhq/hw-transport'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
// @ts-expect-error because @ledgerhq uses flow
import SpeculosTransport from '@ledgerhq/hw-transport-node-speculos'
import { dSHA256 } from '@defichain/jellyfish-crypto'

describe('hardware device tests', function () {
  let provider: LedgerHdNodeProvider

  beforeAll(async () => {
    const transport = await TransportNodeHid.create()
    provider = LedgerHdNodeProvider.getProvider(transport)
  })

  it('should get publlic key', async () => {
    const ledgerNode = provider.derive("m/44'/1129'/0'/0/0")

    const pubKey = await ledgerNode.publicKey()
    expect(pubKey.length).toStrictEqual(65)
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
})

describe('speculos tests', function () {
  let provider: LedgerHdNodeProvider
  const apduPort = 9999

  beforeAll(async () => {
    const transport: Transport = await SpeculosTransport.open({ apduPort })
    provider = LedgerHdNodeProvider.getProvider(transport)
  })

  it('should get publlic key', async () => {
    const ledgerNode = provider.derive("m/44'/1129'/0'/0/0")

    const pubKey = await ledgerNode.publicKey()
    expect(pubKey.length).toStrictEqual(65)
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
})

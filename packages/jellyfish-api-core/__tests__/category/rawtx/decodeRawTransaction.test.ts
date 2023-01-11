import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'

describe('poolpair update', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should decode a witness transaction', async () => {
    const encrawtx = '010000000001010000000000000072c1a6a246ae63f74f931e8365e15a089c68d61900000000000000000000ffffffff0100e1f50500000000000102616100000000'
    const decrawtx = await client.rawtx.decodeRawTransaction(encrawtx, true)

    expect(decrawtx.txid).toStrictEqual('d006b4ece5d4adbd6f46b3a6f65f4a230caf6c44d8510e4340d0f26b7ceeb44a')
    expect(decrawtx.hash).toStrictEqual('23f0c1f68f0a43bb434494933a5a0f6f9636261f33b036b7700d96e264aceeda')
    expect(decrawtx.version).toStrictEqual(1)
    expect(decrawtx.size).toStrictEqual(66)
    expect(decrawtx.vsize).toStrictEqual(62)
    expect(decrawtx.weight).toStrictEqual(246)
    expect(decrawtx.locktime).toStrictEqual(0)
    expect(decrawtx.vin[0].txid).toStrictEqual('000000000019d6689c085ae165831e934ff763ae46a2a6c17200000000000000')
    expect(decrawtx.vin[0].vout).toStrictEqual(0)
    expect(decrawtx.vin[0].scriptSig.asm).toStrictEqual('')
    expect(decrawtx.vin[0].scriptSig.hex).toStrictEqual('')
    expect(decrawtx.vin[0].txinwitness).toStrictEqual(['6161'])
    expect(decrawtx.vin[0].sequence).toStrictEqual(4294967295)
    expect(decrawtx.vout[0].value).toStrictEqual(1)
    expect(decrawtx.vout[0].n).toStrictEqual(0)
    expect(decrawtx.vout[0].scriptPubKey.asm).toStrictEqual('')
    expect(decrawtx.vout[0].scriptPubKey.hex).toStrictEqual('')
    expect(decrawtx.vout[0].scriptPubKey.type).toStrictEqual('nonstandard')
  })

  it('should throw an error when for decode as non-witness a witness transaction', async () => {
    const encrawtx = '010000000001010000000000000072c1a6a246ae63f74f931e8365e15a089c68d61900000000000000000000ffffffff0100e1f50500000000000102616100000000'
    await expect(client.rawtx.decodeRawTransaction(encrawtx, false)).rejects.toThrow(RpcApiError)
  })

  it('should decode a non-witness transaction', async () => {
    const encrawtx = '01000000010000000000000072c1a6a246ae63f74f931e8365e15a089c68d61900000000000000000000ffffffff0100e1f505000000000000000000'
    const decrawtx = await client.rawtx.decodeRawTransaction(encrawtx, true)

    expect(decrawtx.txid).toStrictEqual('d006b4ece5d4adbd6f46b3a6f65f4a230caf6c44d8510e4340d0f26b7ceeb44a')
    expect(decrawtx.hash).toStrictEqual('d006b4ece5d4adbd6f46b3a6f65f4a230caf6c44d8510e4340d0f26b7ceeb44a')
    expect(decrawtx.version).toStrictEqual(1)
    expect(decrawtx.size).toStrictEqual(60)
    expect(decrawtx.vsize).toStrictEqual(60)
    expect(decrawtx.weight).toStrictEqual(240)
    expect(decrawtx.locktime).toStrictEqual(0)
    expect(decrawtx.vin[0].txid).toStrictEqual('000000000019d6689c085ae165831e934ff763ae46a2a6c17200000000000000')
    expect(decrawtx.vin[0].vout).toStrictEqual(0)
    expect(decrawtx.vin[0].scriptSig.asm).toStrictEqual('')
    expect(decrawtx.vin[0].scriptSig.hex).toStrictEqual('')
    expect(decrawtx.vin[0].sequence).toStrictEqual(4294967295)
    expect(decrawtx.vout[0].value).toStrictEqual(1)
    expect(decrawtx.vout[0].n).toStrictEqual(0)
    expect(decrawtx.vout[0].scriptPubKey.asm).toStrictEqual('')
    expect(decrawtx.vout[0].scriptPubKey.hex).toStrictEqual('')
    expect(decrawtx.vout[0].scriptPubKey.type).toStrictEqual('nonstandard')
  })
})

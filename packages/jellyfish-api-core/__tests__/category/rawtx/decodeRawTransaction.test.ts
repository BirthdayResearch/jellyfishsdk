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
    expect(decrawtx.vout[0].value).toStrictEqual(1)
  })

  it('should throw an error when for decode as non-witness a witness transaction', async () => {
    const encrawtx = '010000000001010000000000000072c1a6a246ae63f74f931e8365e15a089c68d61900000000000000000000ffffffff0100e1f50500000000000102616100000000'
    await expect(client.rawtx.decodeRawTransaction(encrawtx, false)).rejects.toThrow(RpcApiError)
  })

  it('should decode a non-witness transaction', async () => {
    const encrawtx = '01000000010000000000000072c1a6a246ae63f74f931e8365e15a089c68d61900000000000000000000ffffffff0100e1f505000000000000000000'
    const decrawtx = await client.rawtx.decodeRawTransaction(encrawtx, true)
    expect(decrawtx.vout[0].value).toStrictEqual(1)
  })
})

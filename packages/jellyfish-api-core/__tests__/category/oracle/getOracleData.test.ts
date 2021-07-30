import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'

describe('Oracle', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getOracleData', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const data = await client.oracle.getOracleData(oracleId)

    expect(data).toStrictEqual(
      {
        weightage: 1,
        oracleid: oracleId,
        address: expect.any(String),
        priceFeeds,
        tokenPrices: []
      }
    )
  })

  it('should not getOracleData if oracleId is invalid', async () => {
    const oracleId = 'e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b'
    const promise = client.oracle.getOracleData(oracleId)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'oracle <${oracleId as string}> not found', code: -20, method: getoracledata`)
  })
})

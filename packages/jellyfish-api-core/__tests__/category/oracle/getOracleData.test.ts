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
      { token: 'APPLE', currency: 'EUR' },
      { token: 'TESLA', currency: 'USD' }
    ]

    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const data = await client.oracle.getOracleData(oracleid)

    expect(data).toStrictEqual(
      {
        weightage: 1,
        oracleid,
        address: expect.any(String),
        priceFeeds: [
          { token: 'APPLE', currency: 'EUR' },
          { token: 'TESLA', currency: 'USD' }
        ],
        tokenPrices: []
      }
    )
  })

  it('should not getOracleData if oracleid is invalid', async () => {
    const oracleid = 'e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b'
    const promise = client.oracle.getOracleData(oracleid)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'oracle <${oracleid as string}> not found', code: -20, method: getoracledata`)
  })
})

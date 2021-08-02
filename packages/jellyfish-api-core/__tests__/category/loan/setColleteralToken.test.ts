import { ContainerAdapterClient } from '../../container_adapter_client'
import { LoanMasterNodeRegTestContainer } from './loan_container'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should set colleteralToken', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    await container.generate(1)

    const txId = await client.loan.setColleteralToken('AAPL', 150, { priceFeedId: oracleId })

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)

    await container.generate(1)
  })
})

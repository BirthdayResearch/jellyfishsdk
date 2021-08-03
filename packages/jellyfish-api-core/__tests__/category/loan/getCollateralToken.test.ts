import { ContainerAdapterClient } from '../../container_adapter_client'
import { LoanMasterNodeRegTestContainer } from './loan_container'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    await createToken(await container.getNewAddress(), 'AAPL', 1)
  })

  async function createToken (address: string, symbol: string, amount: number): Promise<void> {
    const metadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await container.waitForWalletBalanceGTE(101)
    await container.call('createtoken', [metadata])
    await container.generate(1)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }

  afterAll(async () => {
    await container.stop()
  })

  it('should getCollateralToken', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    await container.generate(1)

    await container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: 1,
      priceFeedId: oracleId,
      activateAfterBlock: undefined,
      inputs: []
    }]
    )

    const x = await client.loan.getCollateralToken('AAPL', 1)
    console.log(x)
  })
})

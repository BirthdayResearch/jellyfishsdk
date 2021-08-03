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

  it('should listCollateralTokens with empty object if there is no collateral tokens available', async () => {
    const data = await client.loan.listCollateralTokens()
    expect(Object.keys(data).length).toStrictEqual(0)
  })

  it('should listCollateralTokens', async () => {
    const ownerAddress = await container.getNewAddress()

    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [ownerAddress, priceFeeds, 1])
    await container.generate(1)

    const txId = await container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: 1,
      priceFeedId: oracleId,
      activateAfterBlock: 200,
      inputs: []
    }]
    )
    await container.generate(1)

    const data = await client.loan.listCollateralTokens()
    expect(data).toStrictEqual({
      [txId]: {
        token: 'AAPL',
        factor: 1,
        priceFeedId: oracleId,
        activateAfterBlock: 200
      }
    })
  })
})

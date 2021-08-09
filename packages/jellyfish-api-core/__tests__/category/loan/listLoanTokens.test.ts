import { ContainerAdapterClient } from '../../container_adapter_client'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'

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

  it('should not listLoanTokens', async () => {
    const data = await client.loan.listLoanTokens()
    expect(Object.keys(data).length).toStrictEqual(0)
  })

  it('should listLoanTokens', async () => {
    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])

    await container.generate(1)

    const txId = await container.call('setloantoken', [
      {
        symbol: 'ABC',
        name: 'ABCTOKEN',
        priceFeedId: oracleId,
        interest: 0.01
      }
    ]
    )

    await container.generate(1)

    const data = await client.loan.listLoanTokens()

    expect(data).toStrictEqual(
      {
        [txId]: {
          token: {
            1: {
              collateralAddress: expect.any(String),
              creationHeight: expect.any(BigNumber),
              creationTx: expect.any(String),
              decimal: new BigNumber(8),
              destructionHeight: new BigNumber(-1),
              destructionTx: '0000000000000000000000000000000000000000000000000000000000000000',
              finalized: false,
              isDAT: true,
              isLPS: false,
              isLoanToken: true,
              limit: new BigNumber(0),
              mintable: false,
              minted: new BigNumber(0),
              name: 'ABCTOKEN',
              symbol: 'ABC',
              symbolKey: 'ABC',
              tradeable: true
            }
          },
          priceFeedId: oracleId,
          interest: new BigNumber(0.01)
        }
      }
    )
  })
})

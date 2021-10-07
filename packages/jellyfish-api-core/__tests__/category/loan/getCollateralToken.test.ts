import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan getCollateralToken', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getCollateralToken with symbol / id as token', async () => {
    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const collateralTokenId = await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId: 'AAPL/USD',
      activateAfterBlock: 120
    }])
    await testing.generate(1)

    {
      const data1 = await testing.rpc.loan.getCollateralToken('AAPL')
      const data2 = await testing.rpc.loan.getCollateralToken('1')
      expect(data1).toStrictEqual(data2)
      expect(data1).toStrictEqual({}) // Return empty string if the collateral tokens are not activated yet
    }

    // Wait for block 120
    await testing.container.waitForBlockHeight(120)

    {
      const data1 = await testing.rpc.loan.getCollateralToken('AAPL')
      const data2 = await testing.rpc.loan.getCollateralToken('1')
      expect(data1).toStrictEqual(data2)
      expect(data1).toStrictEqual({
        [collateralTokenId]: {
          token: 'AAPL',
          factor: new BigNumber(0.5),
          priceFeedId: 'AAPL/USD',
          activateAfterBlock: new BigNumber(120)
        }
      })
    }
  })

  it('should not getCollateralToken if token does not exists', async () => {
    const promise1 = testing.rpc.loan.getCollateralToken('TSLA')
    await expect(promise1).rejects.toThrow('RpcApiError: \'Token TSLA does not exist!\', code: -8, method: getcollateraltoken')

    const promise2 = testing.rpc.loan.getCollateralToken('2')
    await expect(promise2).rejects.toThrow('RpcApiError: \'Token 2 does not exist!\', code: -8, method: getcollateraltoken')
  })
})

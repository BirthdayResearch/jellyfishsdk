import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should listCollateralTokens', async () => {
    // Wait for block 110
    await testing.container.waitForBlockHeight(110)

    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    await testing.token.create({ symbol: 'TSLA' })
    await testing.generate(1)

    const priceFeedId1 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])
    await testing.generate(1)

    const priceFeedId2 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TSLA',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const collateralTokenId1 = await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId: priceFeedId1,
      activateAfterBlock: 120
    }])
    await testing.generate(1)

    const collateralTokenId2 = await testing.container.call('setcollateraltoken', [{
      token: 'TSLA',
      factor: new BigNumber(1),
      priceFeedId: priceFeedId2,
      activateAfterBlock: 130
    }])
    await testing.generate(1)

    const data = await testing.rpc.loan.listCollateralTokens()
    expect(data).toStrictEqual({
      [collateralTokenId1]: { activateAfterBlock: new BigNumber(120), factor: new BigNumber(0.5), priceFeedId: priceFeedId1, token: 'AAPL' },
      [collateralTokenId2]: { activateAfterBlock: new BigNumber(130), factor: new BigNumber(1), priceFeedId: priceFeedId2, token: 'TSLA' }
    })
  })
})

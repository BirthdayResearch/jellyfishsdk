import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan listCollateralTokens with empty param or all param', () => {
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
    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    await testing.token.create({ symbol: 'TSLA' })
    await testing.generate(1)

    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TSLA',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const collateralTokenId1 = await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId: 'AAPL/USD'
    }])
    await testing.generate(1) // Activate at next block
    const blockCount = await testing.container.getBlockCount()

    const collateralTokenId2 = await testing.container.call('setcollateraltoken', [{
      token: 'TSLA',
      factor: new BigNumber(1),
      priceFeedId: 'TSLA/USD',
      activateAfterBlock: 130
    }])
    await testing.generate(1)

    {
      // List collateral tokens that are activated
      const data1 = await testing.rpc.loan.listCollateralTokens()
      const data2 = await testing.rpc.loan.listCollateralTokens({ all: false })
      expect(data1).toStrictEqual(data2)
      expect(data1).toStrictEqual({
        [collateralTokenId1]: {
          activateAfterBlock: new BigNumber(blockCount),
          factor: new BigNumber(0.5),
          priceFeedId: 'AAPL/USD',
          token: 'AAPL'
        }
      })
    }

    {
      // List all collateral tokens
      const data = await testing.rpc.loan.listCollateralTokens({ all: true })
      expect(data).toStrictEqual({
        [collateralTokenId1]: {
          activateAfterBlock: new BigNumber(blockCount),
          factor: new BigNumber(0.5),
          priceFeedId: 'AAPL/USD',
          token: 'AAPL'
        },
        [collateralTokenId2]: {
          activateAfterBlock: new BigNumber(130),
          factor: new BigNumber(1),
          priceFeedId: 'TSLA/USD',
          token: 'TSLA'
        }
      })
    }
  })
})

describe('Loan listCollateralTokens with height', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should listCollateralToken', async () => {
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
      priceFeedId: 'AAPL/USD'
    }]) // Activate at next block
    await testing.generate(1)
    const blockCount = await testing.container.getBlockCount()

    // Only remain AAPL which has already been activated
    {
      const data = await testing.rpc.loan.listCollateralTokens({ height: blockCount })
      expect(data).toStrictEqual({
        [collateralTokenId]: {
          token: 'AAPL',
          factor: new BigNumber(0.5),
          priceFeedId: 'AAPL/USD',
          activateAfterBlock: new BigNumber(blockCount)
        }
      })
    }
  })

  it('should listCollateralToken with empty string if the height is below the activation block height', async () => {
    const data = await testing.rpc.loan.listCollateralTokens({ height: 50 })
    expect(data).toStrictEqual({})
  })
})

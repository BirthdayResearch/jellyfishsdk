import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan listCollateralTokens with empty param, all param or (height + all params)', () => {
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

    const oracleId1 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp1 = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId1, timestamp1, { prices: [{ tokenAmount: '0.5@AAPL', currency: 'USD' }] })
    await testing.generate(1)

    const oracleId2 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TSLA',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp2 = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId2, timestamp2, { prices: [{ tokenAmount: '0.5@TSLA', currency: 'USD' }] })
    await testing.generate(1)

    const collateralTokenId1 = await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'AAPL/USD'
    }])
    await testing.generate(1) // Activate at next block
    const blockCount = await testing.container.getBlockCount()

    const collateralTokenId2 = await testing.container.call('setcollateraltoken', [{
      token: 'TSLA',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'TSLA/USD',
      activateAfterBlock: 130
    }])
    await testing.generate(1)

    {
      // List collateral tokens that are activated
      const data1 = await testing.rpc.loan.listCollateralTokens()
      const data2 = await testing.rpc.loan.listCollateralTokens({ all: false })
      expect(data1).toStrictEqual(data2)
      expect(data1).toStrictEqual([{
        activateAfterBlock: new BigNumber(blockCount),
        factor: new BigNumber(0.5),
        fixedIntervalPriceId: 'AAPL/USD',
        token: 'AAPL',
        tokenId: collateralTokenId1
      }])
    }

    {
      // List all collateral tokens
      const data1 = await testing.rpc.loan.listCollateralTokens({ all: true })
      const data2 = await testing.rpc.loan.listCollateralTokens({ height: 50, all: true }) // if height and all combination used, only all is considered.
      expect(data1).toStrictEqual(data2)
      expect(data1).toStrictEqual([{
        activateAfterBlock: new BigNumber(blockCount),
        factor: new BigNumber(0.5),
        fixedIntervalPriceId: 'AAPL/USD',
        token: 'AAPL',
        tokenId: collateralTokenId1
      }, {
        activateAfterBlock: new BigNumber(130),
        factor: new BigNumber(1),
        fixedIntervalPriceId: 'TSLA/USD',
        token: 'TSLA',
        tokenId: collateralTokenId2
      }]
      )
    }
  })
})

describe('Loan listCollateralTokens with height only', () => {
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

    await testing.token.create({ symbol: 'TSLA' })
    await testing.generate(1)

    const oracleId1 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp1 = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId1, timestamp1, { prices: [{ tokenAmount: '0.5@AAPL', currency: 'USD' }] })
    await testing.generate(1)

    const oracleId2 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TSLA',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp2 = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId2, timestamp2, { prices: [{ tokenAmount: '0.5@TSLA', currency: 'USD' }] })
    await testing.generate(1)

    // Wait for block 110
    await testing.container.waitForBlockHeight(110)

    const collateralTokenId1 = await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'AAPL/USD'
    }]) // Activate at next block
    await testing.generate(1)
    const blockCount = await testing.container.getBlockCount()

    const collateralTokenId2 = await testing.container.call('setcollateraltoken', [{
      token: 'TSLA',
      factor: new BigNumber(1.0),
      fixedIntervalPriceId: 'TSLA/USD',
      activateAfterBlock: 130
    }])
    await testing.generate(1)

    {
      const data = await testing.rpc.loan.listCollateralTokens({ height: blockCount })
      expect(data).toStrictEqual([{
        token: 'AAPL',
        factor: new BigNumber(0.5),
        fixedIntervalPriceId: 'AAPL/USD',
        activateAfterBlock: new BigNumber(blockCount),
        tokenId: collateralTokenId1
      }])
    }

    {
      const data = await testing.rpc.loan.listCollateralTokens({ height: 130 })
      expect(data).toStrictEqual([{
        token: 'AAPL',
        factor: new BigNumber(0.5),
        fixedIntervalPriceId: 'AAPL/USD',
        activateAfterBlock: new BigNumber(blockCount),
        tokenId: collateralTokenId1
      },
      {
        token: 'TSLA',
        factor: new BigNumber(1.0),
        fixedIntervalPriceId: 'TSLA/USD',
        activateAfterBlock: new BigNumber(130),
        tokenId: collateralTokenId2
      }
      ])
    }
  })

  it('should listCollateralToken with empty string if the height is below the activation block height', async () => {
    const data = await testing.rpc.loan.listCollateralTokens({ height: 50 })
    expect(data).toStrictEqual([])
  })
})

import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan listCollateralTokens', () => {
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

    await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'AAPL/USD'
    }])
    await testing.generate(1) // Activate at next block
    const blockCount = await testing.container.getBlockCount()

    await testing.container.call('setcollateraltoken', [{
      token: 'TSLA',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'TSLA/USD',
      activateAfterBlock: blockCount + 30
    }])
    await testing.generate(1)

    {
      // List collateral tokens that are activated
      const data = await testing.rpc.loan.listCollateralTokens()
      expect(data).toStrictEqual([{
        factor: new BigNumber(0.5),
        fixedIntervalPriceId: 'AAPL/USD',
        token: 'AAPL',
        tokenId: '0000000000000000000000000000000000000000000000000000000000000000'
      }, {
        factor: new BigNumber(1.0),
        fixedIntervalPriceId: 'TSLA/USD',
        token: 'TSLA',
        tokenId: '0000000000000000000000000000000000000000000000000000000000000000'
      }])
    }
  })
})

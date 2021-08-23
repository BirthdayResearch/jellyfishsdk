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

  it('should getCollateralToken', async () => {
    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])
    await testing.generate(1)

    // Wait for block 150
    await testing.container.waitForBlockHeight(150)

    const collateralTokenId = await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId,
      activateAfterBlock: 160
    }])
    await testing.generate(1)

    const data = await testing.rpc.loan.getCollateralToken({ token: 'AAPL', height: 160 })
    expect(data).toStrictEqual({
      [collateralTokenId]: {
        token: 'AAPL',
        factor: 0.5,
        priceFeedId,
        activateAfterBlock: 160
      }
    })

    // Update at block 160
    await testing.container.waitForBlockHeight(160)
  })

  it('should not getCollateralToken if token does not exist', async () => {
    // Wait for block 170
    await testing.container.waitForBlockHeight(170)

    const promise = testing.rpc.loan.getCollateralToken({ token: 'TSLA', height: 170 })
    await expect(promise).rejects.toThrow('RpcApiError: \'Token  does not exist!\', code: -8, method: getcollateraltoken')
  })

  it('should getCollateralToken if token valid for a specific height ', async () => {
    // Wait for block 180
    await testing.container.waitForBlockHeight(180)

    await testing.token.create({ symbol: 'TSLA' })
    await testing.generate(1)

    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TSLA',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const collateralTokenId = await testing.container.call('setcollateraltoken', [{
      token: 'TSLA',
      factor: new BigNumber(0.5),
      priceFeedId,
      activateAfterBlock: 185
    }])
    await testing.generate(1)

    // Wait for block 190
    await testing.container.waitForBlockHeight(190)

    const data = await testing.rpc.loan.getCollateralToken({ token: 'TSLA', height: 190 })
    expect(data).toStrictEqual({
      [collateralTokenId]: {
        token: 'TSLA',
        factor: 0.5,
        priceFeedId,
        activateAfterBlock: 185
      }
    })
  })

  it('should not getCollateralToken if token is not valid for a specific height', async () => {
    // Wait for block 200
    await testing.container.waitForBlockHeight(200)

    await testing.token.create({ symbol: 'MSFT' })
    await testing.generate(1)

    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'MSFT',
      currency: 'SGD'
    }], 1])
    await testing.generate(1)

    await testing.container.call('setcollateraltoken', [{
      token: 'MSFT',
      factor: new BigNumber(0.5),
      priceFeedId,
      activateAfterBlock: 210
    }])
    await testing.generate(1)

    const data = await testing.rpc.loan.getCollateralToken({ token: 'MSFT', height: 205 })
    expect(data).toStrictEqual({})

    // Update at block 210
    await testing.container.waitForBlockHeight(210)
  })
})

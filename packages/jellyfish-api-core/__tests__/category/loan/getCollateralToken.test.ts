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
    // Wait for block 150
    await testing.container.waitForBlockHeight(150)

    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])
    await testing.generate(1)

    const collateralTokenId = await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId,
      activateAfterBlock: 160
    }])
    await testing.generate(1)

    const data = await testing.rpc.loan.getCollateralToken({
      token: 'AAPL',
      height: 160
    })
    expect(data).toStrictEqual({
      [collateralTokenId]: {
        token: 'AAPL',
        factor: 0.5,
        priceFeedId,
        activateAfterBlock: 160
      }
    })
  })

  it('should not getCollateralToken if token does not exist', async () => {
    const promise = testing.rpc.loan.getCollateralToken({ token: 'TSLA', height: 170 })
    await expect(promise).rejects.toThrow('RpcApiError: \'Token  does not exist!\', code: -8, method: getcollateraltoken')
  })
})

describe('Loan with height is set before current height', () => {
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
    // Wait for block 150
    await testing.container.waitForBlockHeight(150)

    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])
    await testing.generate(1)

    const collateralTokenId = await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId,
      activateAfterBlock: 160
    }])
    await testing.generate(1)

    const data = await testing.rpc.loan.getCollateralToken({
      token: 'AAPL',
      height: 170
    })
    expect(data).toStrictEqual({
      [collateralTokenId]: {
        token: 'AAPL',
        factor: 0.5,
        priceFeedId,
        activateAfterBlock: 160
      }
    })
  })
})

describe('Loan with height is set after current height', () => {
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
    // Wait for block 150
    await testing.container.waitForBlockHeight(150)

    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])
    await testing.generate(1)

    await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId,
      activateAfterBlock: 160
    }])
    await testing.generate(1)

    const data = await testing.rpc.loan.getCollateralToken({
      token: 'AAPL',
      height: 159
    })
    expect(data).toStrictEqual({})
  })
})

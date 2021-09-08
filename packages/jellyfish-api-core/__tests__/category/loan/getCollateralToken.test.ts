import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan getCollateralToken with parameter token and height', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let priceFeedId: string
  let collateralTokenId: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])
    await testing.generate(1)

    collateralTokenId = await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId,
      activateAfterBlock: 120
    }])
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getCollateralToken', async () => {
    const data = await testing.rpc.loan.getCollateralToken({
      token: 'AAPL',
      height: 120
    })
    expect(data).toStrictEqual({
      [collateralTokenId]: {
        token: 'AAPL',
        factor: new BigNumber(0.5),
        priceFeedId,
        activateAfterBlock: new BigNumber(120)
      }
    })
  })

  it('should not getCollateralToken if token does not exist', async () => {
    const promise = testing.rpc.loan.getCollateralToken({ token: 'TSLA', height: 120 })
    await expect(promise).rejects.toThrow('RpcApiError: \'Token  does not exist!\', code: -8, method: getcollateraltoken')
  })

  it('should getCollateralToken with empty string if height is below current height', async () => {
    const data = await testing.rpc.loan.getCollateralToken({ token: 'AAPL', height: 50 })
    expect(data).toStrictEqual({})
  })

  it('should getCollateralToken if height is after current height', async () => {
    const data = await testing.rpc.loan.getCollateralToken({ token: 'AAPL', height: 150 })
    expect(data).toStrictEqual({
      [collateralTokenId]: {
        token: 'AAPL',
        factor: new BigNumber(0.5),
        priceFeedId,
        activateAfterBlock: new BigNumber(120)
      }
    })
  })
})

describe('Loan getCollateralToken with parameter token only', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getCollateralToken', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])
    await testing.generate(1)

    const collateralTokenId = await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId // Activate at next block
    }])
    await testing.generate(1)

    const data = await testing.rpc.loan.getCollateralToken({
      token: 'AAPL'
    })
    expect(data).toStrictEqual({
      [collateralTokenId]: {
        token: 'AAPL',
        factor: new BigNumber(0.5),
        priceFeedId,
        activateAfterBlock: new BigNumber(await testing.container.getBlockCount())
      }
    })
  })

  it('should not getCollateralToken if token does not exist', async () => {
    const promise = testing.rpc.loan.getCollateralToken({ token: 'TSLA' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Token  does not exist!\', code: -8, method: getcollateraltoken')
  })
})

describe('Loan getCollateralToken with parameter block only', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let priceFeedId: string
  let collateralTokenId: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])
    await testing.generate(1)

    collateralTokenId = await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId
    }]) // Activate at next block
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getCollateralToken', async () => {
    const data = await testing.rpc.loan.getCollateralToken({
      height: await testing.container.getBlockCount()
    })
    expect(data).toStrictEqual({
      [collateralTokenId]: {
        token: 'AAPL',
        factor: new BigNumber(0.5),
        priceFeedId,
        activateAfterBlock: new BigNumber(await testing.container.getBlockCount())
      }
    })
  })

  it('should getCollateralToken with empty string if block is below current height', async () => {
    const data = await testing.rpc.loan.getCollateralToken({ height: 50 })
    expect(data).toStrictEqual({})
  })

  it('should getCollateralToken if block is after current height', async () => {
    const data = await testing.rpc.loan.getCollateralToken({ height: 150 })
    expect(data).toStrictEqual({
      [collateralTokenId]: {
        token: 'AAPL',
        factor: new BigNumber(0.5),
        priceFeedId,
        activateAfterBlock: new BigNumber(await testing.container.getBlockCount())
      }
    })
  })
})

describe('Loan getCollateralToken with no parameter', () => {
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

    const priceFeedId1 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])
    await testing.generate(1)

    const collateralTokenId1 = await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId: priceFeedId1
    }]) // Activate at next block
    await testing.generate(1)
    const blockCount = new BigNumber(await testing.container.getBlockCount())

    await testing.token.create({ symbol: 'TSLA' })
    await testing.generate(1)

    const priceFeedId2 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TSLA',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const collateralTokenId2 = await testing.container.call('setcollateraltoken', [{
      token: 'TSLA',
      factor: new BigNumber(1),
      priceFeedId: priceFeedId2,
      activateAfterBlock: 120
    }])
    await testing.generate(1)

    // Only remain AAPL which has already been activated
    {
      const data = await testing.rpc.loan.getCollateralToken({})
      expect(data).toStrictEqual({
        [collateralTokenId1]: {
          token: 'AAPL',
          factor: new BigNumber(0.5),
          priceFeedId: priceFeedId1,
          activateAfterBlock: blockCount
        }
      })
    }

    // Wait for block 120
    await testing.container.waitForBlockHeight(120)

    // Display AAPL and TSLA
    {
      const data = await testing.rpc.loan.getCollateralToken({})
      expect(data).toStrictEqual({
        [collateralTokenId1]: {
          token: 'AAPL',
          factor: new BigNumber(0.5),
          priceFeedId: priceFeedId1,
          activateAfterBlock: blockCount
        },
        [collateralTokenId2]: {
          token: 'TSLA',
          factor: new BigNumber(1),
          priceFeedId: priceFeedId2,
          activateAfterBlock: new BigNumber(120)
        }
      }
      )
    }
  })
})

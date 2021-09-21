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

  it('should getCollateralToken', async () => {
    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const collateralTokenId1 = await testing.container.call('setcollateraltoken', [{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId: 'AAPL/USD'
    }]) // Activate at next block
    await testing.generate(1)
    const blockCount = new BigNumber(await testing.container.getBlockCount())

    await testing.token.create({ symbol: 'TSLA' })
    await testing.generate(1)

    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TSLA',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const collateralTokenId2 = await testing.container.call('setcollateraltoken', [{
      token: 'TSLA',
      factor: new BigNumber(1),
      priceFeedId: 'TSLA/USD',
      activateAfterBlock: 120
    }])
    await testing.generate(1)

    // Only remain AAPL which has already been activated
    {
      const data = await testing.rpc.loan.getCollateralToken()
      expect(data).toStrictEqual({
        [collateralTokenId1]: {
          token: 'AAPL',
          factor: new BigNumber(0.5),
          priceFeedId: 'AAPL/USD',
          activateAfterBlock: blockCount
        }
      })
    }

    // Wait for block 120
    await testing.container.waitForBlockHeight(120)

    // Display AAPL and TSLA
    {
      const data = await testing.rpc.loan.getCollateralToken()
      expect(data).toStrictEqual({
        [collateralTokenId1]: {
          token: 'AAPL',
          factor: new BigNumber(0.5),
          priceFeedId: 'AAPL/USD',
          activateAfterBlock: blockCount
        },
        [collateralTokenId2]: {
          token: 'TSLA',
          factor: new BigNumber(1),
          priceFeedId: 'TSLA/USD',
          activateAfterBlock: new BigNumber(120)
        }
      }
      )
    }
  })
})

describe('Loan getCollateralToken with parameters token or height', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let collateralTokenId: string
  let priceFeedId: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
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

  describe('Loan getCollateralToken with parameter token and height', () => {
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
      const promise = testing.rpc.loan.getCollateralToken({
        token: 'TSLA',
        height: 120
      })
      await expect(promise).rejects.toThrow('RpcApiError: \'Token  does not exist!\', code: -8, method: getcollateraltoken')
    })

    it('should getCollateralToken with empty string if the height is below the activation block height', async () => {
      const data = await testing.rpc.loan.getCollateralToken({
        token: 'AAPL',
        height: 50
      })
      expect(data).toStrictEqual({})
    })

    it('should getCollateralToken if the height is after the activation block height', async () => {
      const data = await testing.rpc.loan.getCollateralToken({
        token: 'AAPL',
        height: 150
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
  })

  describe('Loan getCollateralToken with parameter token only', () => {
    it('should getCollateralToken', async () => {
      {
        const data = await testing.rpc.loan.getCollateralToken({
          token: 'AAPL'
        })
        expect(data).toStrictEqual({})
      }

      // Wait for block 120
      await testing.container.waitForBlockHeight(120)

      {
        const data = await testing.rpc.loan.getCollateralToken({
          token: 'AAPL'
        })
        expect(data).toStrictEqual({
          [collateralTokenId]: {
            token: 'AAPL',
            factor: new BigNumber(0.5),
            priceFeedId,
            activateAfterBlock: new BigNumber(120)
          }
        })
      }
    })
  })

  describe('Loan getCollateralToken with parameter height only', () => {
    it('should getCollateralToken', async () => {
      const data = await testing.rpc.loan.getCollateralToken({
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

    it('should getCollateralToken with empty string if the height is below the activation block height', async () => {
      const data = await testing.rpc.loan.getCollateralToken({ height: 50 })
      expect(data).toStrictEqual({})
    })

    it('should getCollateralToken if the height is after the activation block height', async () => {
      const data = await testing.rpc.loan.getCollateralToken({ height: 150 })
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
})

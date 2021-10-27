import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '@src/e2e.module'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from '@defichain/testcontainers'
import { LoanController } from '@src/module.api/loan.controller'
import { NotFoundException } from '@nestjs/common'
import { Testing } from '@defichain/jellyfish-testing'

const container = new LoanMasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: LoanController

let collateralTokenId1: string

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  const testing = Testing.create(container)
  controller = app.get(LoanController)

  await testing.token.create({ symbol: 'AAPL' })
  await testing.generate(1)

  await testing.token.create({ symbol: 'TSLA' })
  await testing.generate(1)

  await testing.token.create({ symbol: 'MSFT' })
  await testing.generate(1)

  await testing.token.create({ symbol: 'FB' })
  await testing.generate(1)

  const oracleId = await testing.rpc.oracle.appointOracle(await container.getNewAddress(),
    [
      { token: 'AAPL', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'MSFT', currency: 'USD' },
      { token: 'FB', currency: 'USD' }
    ], { weightage: 1 })
  await testing.generate(1)

  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
    prices: [{
      tokenAmount: '1.5@AAPL',
      currency: 'USD'
    }]
  })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
    prices: [{
      tokenAmount: '2.5@TSLA',
      currency: 'USD'
    }]
  })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
    prices: [{
      tokenAmount: '3.5@MSFT',
      currency: 'USD'
    }]
  })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
    prices: [{
      tokenAmount: '4.5@FB',
      currency: 'USD'
    }]
  })
  await testing.generate(1)

  collateralTokenId1 = await testing.rpc.loan.setCollateralToken({
    token: 'AAPL',
    factor: new BigNumber(0.1),
    fixedIntervalPriceId: 'AAPL/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'TSLA',
    factor: new BigNumber(0.2),
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'MSFT',
    factor: new BigNumber(0.3),
    fixedIntervalPriceId: 'MSFT/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'FB',
    factor: new BigNumber(0.4),
    fixedIntervalPriceId: 'FB/USD'
  })
  await testing.generate(1)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('list', () => {
  it('should listCollateralTokens', async () => {
    const result = await controller.listCollateral({ size: 100 })
    expect(result.data.length).toStrictEqual(4)
    expect(result.data[0]).toStrictEqual({
      tokenId: expect.any(String),
      priceFeedId: expect.any(String),
      factor: expect.any(String),
      activateAfterBlock: expect.any(Number),
      token: {
        collateralAddress: expect.any(String),
        creation: {
          height: expect.any(Number),
          tx: expect.any(String)
        },
        decimal: 8,
        destruction: {
          height: -1,
          tx: expect.any(String)
        },
        displaySymbol: expect.any(String),
        finalized: false,
        id: expect.any(String),
        isDAT: true,
        isLPS: false,
        limit: '0',
        mintable: true,
        minted: '0',
        name: expect.any(String),
        symbol: expect.any(String),
        symbolKey: expect.any(String),
        tradeable: true
      }
    })
  })

  it('should listCollateralTokens with pagination', async () => {
    const first = await controller.listCollateral({ size: 2 })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next?.length).toStrictEqual(64)

    const next = await controller.listCollateral({
      size: 2,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(2)
    expect(next.page?.next?.length).toStrictEqual(64)

    const last = await controller.listCollateral({
      size: 2,
      next: next.page?.next
    })

    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toBeUndefined()
  })

  it('should listCollateralTokens with an empty object if size 100 next 300 which is out of range', async () => {
    const result = await controller.listCollateral({ size: 100, next: '300' })

    expect(result.data.length).toStrictEqual(0)
    expect(result.page).toBeUndefined()
  })
})

describe('get', () => {
  it('should get collateral token by symbol', async () => {
    const data = await controller.getCollateral('AAPL')
    expect(data).toStrictEqual(
      {
        tokenId: collateralTokenId1,
        priceFeedId: 'AAPL/USD',
        factor: '0.1',
        activateAfterBlock: 108,
        token: {
          collateralAddress: expect.any(String),
          creation: {
            height: expect.any(Number),
            tx: expect.any(String)
          },
          decimal: 8,
          destruction: {
            height: -1,
            tx: expect.any(String)
          },
          displaySymbol: 'dAAPL',
          finalized: false,
          id: expect.any(String),
          isDAT: true,
          isLPS: false,
          limit: '0',
          mintable: true,
          minted: '0',
          name: 'AAPL',
          symbol: 'AAPL',
          symbolKey: expect.any(String),
          tradeable: true
        }
      }
    )
  })

  it('should throw error while getting non-existent collateral token id', async () => {
    expect.assertions(2)
    try {
      await controller.getCollateral('999')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find collateral token',
        error: 'Not Found'
      })
    }
  })
})

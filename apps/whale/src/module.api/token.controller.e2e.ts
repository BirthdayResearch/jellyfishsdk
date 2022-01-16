import { TokenController } from '@src/module.api/token.controller'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { createPoolPair, createToken } from '@defichain/testing'
import { NotFoundException } from '@nestjs/common'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: TokenController

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  controller = app.get(TokenController)

  await waitForIndexedHeight(app, 100)

  await createToken(container, 'DBTC')
  await createToken(container, 'DETH')
  await createPoolPair(container, 'DBTC', 'DETH')
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('list', () => {
  it('should listTokens', async () => {
    const result = await controller.list({ size: 100 })
    expect(result.data.length).toStrictEqual(4)

    expect(result.data[0]).toStrictEqual({
      id: '0',
      symbol: 'DFI',
      symbolKey: 'DFI',
      displaySymbol: 'DFI',
      name: 'Default Defi token',
      decimal: 8,
      limit: '0',
      mintable: false,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      isLoanToken: false,
      finalized: true,
      minted: '0',
      creation: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: 0
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: undefined
    })

    expect(result.data[1]).toStrictEqual({
      id: '1',
      symbol: 'DBTC',
      symbolKey: 'DBTC',
      displaySymbol: 'dDBTC',
      name: 'DBTC',
      decimal: 8,
      limit: '0',
      mintable: true,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      isLoanToken: false,
      finalized: false,
      minted: '0',
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })

    expect(result.data[2]).toStrictEqual({
      id: '2',
      symbol: 'DETH',
      symbolKey: 'DETH',
      displaySymbol: 'dDETH',
      name: 'DETH',
      decimal: 8,
      limit: '0',
      mintable: true,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      isLoanToken: false,
      finalized: false,
      minted: '0',
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })

    expect(result.data[3]).toStrictEqual({
      id: '3',
      symbol: 'DBTC-DETH',
      symbolKey: 'DBTC-DETH',
      displaySymbol: 'dDBTC-dDETH',
      name: 'DBTC-DETH',
      decimal: 8,
      limit: '0',
      mintable: false,
      tradeable: true,
      isDAT: true,
      isLPS: true,
      isLoanToken: false,
      finalized: true,
      minted: '0',
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })
  })

  it('should listTokens with pagination', async () => {
    const first = await controller.list({ size: 2 })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('1')

    expect(first.data[0]).toStrictEqual(expect.objectContaining({ id: '0', symbol: 'DFI', symbolKey: 'DFI' }))
    expect(first.data[1]).toStrictEqual(expect.objectContaining({ id: '1', symbol: 'DBTC', symbolKey: 'DBTC' }))

    const next = await controller.list({
      size: 2,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(2)
    expect(next.page?.next).toStrictEqual('3')

    expect(next.data[0]).toStrictEqual(expect.objectContaining({ id: '2', symbol: 'DETH', symbolKey: 'DETH' }))
    expect(next.data[1]).toStrictEqual(expect.objectContaining({ id: '3', symbol: 'DBTC-DETH', symbolKey: 'DBTC-DETH' }))

    const last = await controller.list({
      size: 1,
      next: next.page?.next
    })

    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toBeUndefined()
  })

  it('should listTokens with an empty object if size 100 next 300 which is out of range', async () => {
    const result = await controller.list({ size: 100, next: '300' })

    expect(result.data.length).toStrictEqual(0)
    expect(result.page).toBeUndefined()
  })
})

describe('get', () => {
  it('should get DFI by DFI numeric id', async () => {
    const data = await controller.get('0')
    expect(data).toStrictEqual({
      id: '0',
      symbol: 'DFI',
      symbolKey: 'DFI',
      displaySymbol: 'DFI',
      name: 'Default Defi token',
      decimal: 8,
      limit: '0',
      mintable: false,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      isLoanToken: false,
      finalized: true,
      minted: '0',
      creation: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: 0
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: undefined
    })
  })

  it('should get DBTC-DETH by DBTC-DETH numeric id', async () => {
    const data = await controller.get('3')
    expect(data).toStrictEqual({
      id: '3',
      symbol: 'DBTC-DETH',
      symbolKey: 'DBTC-DETH',
      displaySymbol: 'dDBTC-dDETH',
      name: 'DBTC-DETH',
      decimal: 8,
      limit: '0',
      mintable: false,
      tradeable: true,
      isDAT: true,
      isLPS: true,
      isLoanToken: false,
      finalized: true,
      minted: '0',
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })
  })

  it('should throw error while getting non-existent token', async () => {
    expect.assertions(2)
    try {
      await controller.get('999')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find token',
        error: 'Not Found'
      })
    }
  })
})

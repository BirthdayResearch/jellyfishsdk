import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TokenController } from './token.controller'
import { NotFoundException } from '@nestjs/common'
import { Testing } from '@defichain/jellyfish-testing'
import { createTestingApp, stopTestingApp } from '../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

const container = new MasterNodeRegTestContainer()
let controller: TokenController
let app: NestFastifyApplication
const testing = Testing.create(container)

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()

  await testing.token.create({ symbol: 'DBTC' })
  await testing.generate(1)
  await testing.token.create({ symbol: 'DETH' })
  await testing.generate(1)
  await testing.token.create({
    symbol: 'BTC',
    isDAT: false
  })
  await testing.generate(1)
  await testing.poolpair.create({
    tokenA: 'DBTC',
    tokenB: 'DETH'
  })
  await testing.generate(1)

  app = await createTestingApp(container)
  controller = app.get(TokenController)
})

afterAll(async () => {
  await container.stop()
  await stopTestingApp(container, app)
})

describe('list', () => {
  it('should only list all tokens where isDAT is true', async () => {
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

  it('should list tokens where isDAT is true with pagination', async () => {
    const first = await controller.list({ size: 2 })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('1')

    expect(first.data[0]).toStrictEqual(expect.objectContaining({
      id: '0',
      symbol: 'DFI',
      symbolKey: 'DFI'
    }))
    expect(first.data[1]).toStrictEqual(expect.objectContaining({
      id: '1',
      symbol: 'DBTC',
      symbolKey: 'DBTC'
    }))

    const next = await controller.list({
      size: 2,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(2)
    expect(next.page?.next).toStrictEqual('3')

    expect(next.data[0]).toStrictEqual(expect.objectContaining({
      id: '2',
      symbol: 'DETH',
      symbolKey: 'DETH'
    }))
    expect(next.data[1]).toStrictEqual(expect.objectContaining({
      id: '3',
      symbol: 'DBTC-DETH',
      symbolKey: 'DBTC-DETH'
    }))

    const last = await controller.list({
      size: 1,
      next: next.page?.next
    })

    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toBeUndefined()
  })

  it('should list empty object as out of range', async () => {
    const result = await controller.list({
      size: 100,
      next: '300'
    })

    expect(result.data.length).toStrictEqual(0)
    expect(result.page).toBeUndefined()
  })
})

describe('get', () => {
  it('should get DFI with by DFI numeric id', async () => {
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

  it('should get DBTC by DBTC numeric id', async () => {
    const data = await controller.get('1')
    expect(data).toStrictEqual({
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
  })

  it('should get DETH by DETH numeric id', async () => {
    const data = await controller.get('2')
    expect(data).toStrictEqual({
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
    } catch (err: any) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find token',
        error: 'Not Found'
      })
    }
  })
})

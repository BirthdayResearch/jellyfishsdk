import { PoolPairController } from './poolpair.controller'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '../e2e.module'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'
import { BigNumber } from 'bignumber.js'
import { DeFiDCache } from './cache/defid.cache'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import { Testing } from '@defichain/jellyfish-testing'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: PoolPairController
let testing: Testing

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)
  await setup()

  app = await createTestingApp(container)
  controller = app.get(PoolPairController)
  const defiCache = app.get(DeFiDCache)

  const tokenResult = await container.call('listtokens')
  // precache
  for (const k in tokenResult) {
    await defiCache.getTokenInfo(k) as TokenInfo
  }
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

async function setup (): Promise<void> {
  testing = Testing.create(container)

  const tokens = ['DUSD', 'BTC', 'ETH']

  for (const token of tokens) {
    await createToken(container, token)
    await createPoolPair(container, token, 'DFI')
    await mintTokens(container, token)
    await testing.generate(1)
  }

  await addPoolLiquidity(container, {
    tokenA: 'DUSD',
    amountA: 10,
    tokenB: 'DFI',
    amountB: 10,
    shareAddress: await getNewAddress(container)
  })

  await testing.generate(1)

  await addPoolLiquidity(container, {
    tokenA: 'BTC',
    amountA: 100,
    tokenB: 'DFI',
    amountB: 1000,
    shareAddress: await getNewAddress(container)
  })
  await testing.generate(1)

  await addPoolLiquidity(container, {
    tokenA: 'ETH',
    amountA: 10,
    tokenB: 'DFI',
    amountB: 100,
    shareAddress: await getNewAddress(container)
  })
  await testing.generate(1)

  const oracleId = await container.call('appointoracle', [await testing.generateAddress(), [
    { token: 'AAPL', currency: 'USD' }
  ], 1])
  await testing.generate(1)

  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '1.5@AAPL', currency: 'USD' }] })
  await testing.generate(1)

  await container.call('setloantoken', [{
    symbol: 'AAPL',
    name: 'APPLE',
    fixedIntervalPriceId: 'AAPL/USD',
    mintable: true,
    interest: new BigNumber(0.01)
  }])
  await testing.generate(1)
  await createPoolPair(container, 'AAPL', 'DUSD')
  await mintTokens(container, 'AAPL')
  await addPoolLiquidity(container, {
    tokenA: 'AAPL',
    amountA: 10,
    tokenB: 'DUSD',
    amountB: 100,
    shareAddress: await getNewAddress(container)
  })

  // dex fee set up
  await container.call('setgov', [{
    ATTRIBUTES: {
      'v0/poolpairs/2/token_a_fee_pct': '0.005', // DUSD-DFI
      'v0/token/7/dex_in_fee_pct': '0.001', // dAAPL
      'v0/token/1/dex_out_fee_pct': '0.003', // DUSD

      // no v0/poolpairs fee for dBTC
      'v0/token/3/dex_in_fee_pct': '0.007' // dBTC
    }
  }])
  await container.generate(1)
}

describe('get best path - DEX burn fees', () => {
  it('should get v0/token if no v0/poolpairs is available', async () => {
    const paths1 = await controller.getBestPath('3', '0') // dBTC -> DFI
    const paths2 = await controller.getBestPath('0', '3') // DFI -> dBTC

    /*
      dBTC(id:1) to DFI(id:0) = 0.007% dBTC dex fee
    */
    expect(paths1.bestPath).toStrictEqual([{
      estimatedDexFee: [{
        amount: '0.00700000',
        token: {
          displaySymbol: 'dBTC',
          symbol: 'BTC'
        }
      }],
      estimatedReturn: '10.00000000',
      poolPairId: '4',
      priceRatio: {
        ab: '0.10000000',
        ba: '10.00000000'
      },
      symbol: 'BTC-DFI',
      tokenA: {
        displaySymbol: 'dBTC',
        id: '3',
        symbol: 'BTC'
      },
      tokenB: {
        displaySymbol: 'DFI',
        id: '0',
        symbol: 'DFI'
      }
    }])

    expect(paths1.bestPath[0].estimatedDexFee).toStrictEqual(paths2.bestPath[0].estimatedDexFee)
  })

  it('should get v0/poolpairs if both v0/poolpairs and v0/token is available', async () => {
    const paths1 = await controller.getBestPath('1', '0') // DUSD to DFI
    const paths2 = await controller.getBestPath('0', '1') // DFI to DUSD

    /*
      DUSD(id:1) to DFI(id:0) = 0.005 DUSD
    */
    expect(paths1.bestPath).toStrictEqual([{
      estimatedDexFee: [{
        amount: '0.00500000',
        token: {
          displaySymbol: 'DUSD',
          symbol: 'DUSD'
        }
      }],
      estimatedReturn: '1.00000000',
      poolPairId: '2',
      priceRatio: {
        ab: '1.00000000',
        ba: '1.00000000'
      },
      symbol: 'DUSD-DFI',
      tokenA: {
        displaySymbol: 'DUSD',
        id: '1',
        symbol: 'DUSD'
      },
      tokenB: {
        displaySymbol: 'DFI',
        id: '0',
        symbol: 'DFI'
      }
    }])
    expect(paths2.bestPath).toStrictEqual(paths1.bestPath)
  })

  it('should sum up dex fees for each leg in composite swap', async () => {
    const paths1 = await controller.getBestPath('7', '0') // dAAPL -> DFI

    /*
      dAAPL(id:7) to DUSD(id:1) = 0.001% dAAPL dex fee
                                = 0.003% DUSD dex fee
      DUSD(id:1) to DFI(id:0)   = 0.005% DUSD dex fee
    */
    expect(paths1.bestPath).toStrictEqual([{
      estimatedDexFee: [{
        amount: '0.00100000',
        token: {
          displaySymbol: 'dAAPL',
          symbol: 'AAPL'
        }
      }, {
        amount: '0.03000000',
        token: {
          displaySymbol: 'DUSD',
          symbol: 'DUSD'
        }
      }],
      estimatedReturn: '10.00000000',
      poolPairId: '8',
      priceRatio: {
        ab: '0.10000000',
        ba: '10.00000000'
      },
      symbol: 'AAPL-DUSD',
      tokenA: {
        displaySymbol: 'dAAPL',
        id: '7',
        symbol: 'AAPL'
      },
      tokenB: {
        displaySymbol: 'DUSD',
        id: '1',
        symbol: 'DUSD'
      }
    },
    {
      estimatedDexFee: [{
        amount: '0.05000000',
        token: {
          displaySymbol: 'DUSD',
          symbol: 'DUSD'
        }
      }],
      estimatedReturn: '1.00000000',
      poolPairId: '2',
      priceRatio: {
        ab: '1.00000000',
        ba: '1.00000000'
      },
      symbol: 'DUSD-DFI',
      tokenA: {
        displaySymbol: 'DUSD',
        id: '1',
        symbol: 'DUSD'
      },
      tokenB: {
        displaySymbol: 'DFI',
        id: '0',
        symbol: 'DFI'
      }
    }])
  })

  it('should return [] if dex fees is not set', async () => {
    const paths1 = await controller.getBestPath('5', '0') // dETH -> DFI
    const paths2 = await controller.getBestPath('0', '5') // DFI -> dETH
    expect(paths1.bestPath.length).toStrictEqual(1)
    expect(paths1.bestPath[0].estimatedDexFee).toStrictEqual([])
    expect(paths1.bestPath[0].estimatedReturn).toStrictEqual('10.00000000')

    expect(paths2.bestPath.length).toStrictEqual(1)
    expect(paths2.bestPath[0].estimatedDexFee).toStrictEqual([])
    expect(paths2.bestPath[0].estimatedReturn).toStrictEqual('0.10000000')
  })
})

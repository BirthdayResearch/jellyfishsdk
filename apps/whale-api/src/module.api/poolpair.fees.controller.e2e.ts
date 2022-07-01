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

  const tokens = ['DUSD', 'BTC', 'ETH', 'DOGE']

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

  await addPoolLiquidity(container, {
    tokenA: 'DOGE',
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
      'v0/token/9/dex_in_fee_pct': '0.001', // dAAPL
      'v0/token/1/dex_out_fee_pct': '0.003', // DUSD

      // no v0/poolpairs fee for dBTC
      'v0/token/3/dex_in_fee_pct': '0.007', // dBTC
      'v0/token/3/dex_out_fee_pct': '0.013', // dBTC

      // no v0/poolpairs fee for dDOGE
      'v0/token/7/dex_in_fee_pct': '0.011', // DOGE
      'v0/token/7/dex_out_fee_pct': '0.009' // DOGE
    }
  }])
  await container.generate(1)
}

describe('get best path - DEX burn fees', () => {
  it('should use correct v0/token/{id}/dex_(in/out) from gov', async () => {
    const paths1 = await controller.getBestPath('3', '7') // dBTC -> dDOGE
    const paths2 = await controller.getBestPath('7', '3') // dDOGE -> dBTC
    /*
      dBTC(id:3) to DFI(id:0) = 0.007% dBTC dex fee
      DFI(id:0) to dDOGE(id:7) = 0.009% dDOGE dex fee
    */
    expect(paths1.bestPath).toStrictEqual([
      {
        estimatedDexFees: [{
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
      }, {
        estimatedDexFees: [{
          amount: '0.09000000',
          token: {
            displaySymbol: 'dDOGE',
            symbol: 'DOGE'
          }
        }],
        estimatedReturn: '1.00000000',
        poolPairId: '8',
        priceRatio: {
          ab: '0.10000000',
          ba: '10.00000000'
        },
        symbol: 'DOGE-DFI',
        tokenA: {
          displaySymbol: 'dDOGE',
          id: '7',
          symbol: 'DOGE'
        },
        tokenB: {
          displaySymbol: 'DFI',
          id: '0',
          symbol: 'DFI'
        }
      }
    ])

    /*
      dDOGE(id:7) to DFI(id:0) = 0.011% dDOGE dex fee
      DFI(id:0) to dBTC(id:5) = 0.013% dBTC dex fee
    */
    expect(paths2.bestPath).toStrictEqual([
      {
        estimatedDexFees: [{
          amount: '0.01100000',
          token: {
            displaySymbol: 'dDOGE',
            symbol: 'DOGE'
          }
        }],
        estimatedReturn: '10.00000000',
        poolPairId: '8',
        priceRatio: {
          ab: '0.10000000',
          ba: '10.00000000'
        },
        symbol: 'DOGE-DFI',
        tokenA: {
          displaySymbol: 'dDOGE',
          id: '7',
          symbol: 'DOGE'
        },
        tokenB: {
          displaySymbol: 'DFI',
          id: '0',
          symbol: 'DFI'
        }
      }, {
        estimatedDexFees: [{
          amount: '0.13000000',
          token: {
            displaySymbol: 'dBTC',
            symbol: 'BTC'
          }
        }],
        estimatedReturn: '1.00000000',
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
  })

  it('should get v0/poolpairs if both v0/poolpairs and v0/token is available', async () => {
    const paths1 = await controller.getBestPath('1', '0') // DUSD -> DFI
    /*
      DUSD(id:1) to DFI(id:0) = 0.005 DUSD
    */
    expect(paths1.bestPath).toStrictEqual([{
      estimatedDexFees: [{
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
  })

  it('should return dex fees for each leg in composite swap', async () => {
    const paths1 = await controller.getBestPath('9', '0') // dAAPL -> DFI

    /*
      dAAPL(id:9) to DUSD(id:1) = 0.001% dAAPL dex fee
                                = 0.003% DUSD dex fee
      DUSD(id:1) to DFI(id:0)   = 0.005% DUSD dex fee
    */
    expect(paths1.bestPath).toStrictEqual([{
      estimatedDexFees: [{
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
      poolPairId: '10',
      priceRatio: {
        ab: '0.10000000',
        ba: '10.00000000'
      },
      symbol: 'AAPL-DUSD',
      tokenA: {
        displaySymbol: 'dAAPL',
        id: '9',
        symbol: 'AAPL'
      },
      tokenB: {
        displaySymbol: 'DUSD',
        id: '1',
        symbol: 'DUSD'
      }
    },
    {
      estimatedDexFees: [{
        amount: '0.05000000',
        token: {
          displaySymbol: 'DUSD',
          symbol: 'DUSD'
        }
      }],
      estimatedReturn: '10.00000000',
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
    expect(paths1.bestPath[0].estimatedDexFees).toStrictEqual([])
    expect(paths1.bestPath[0].estimatedReturn).toStrictEqual('10.00000000')

    expect(paths2.bestPath.length).toStrictEqual(1)
    expect(paths2.bestPath[0].estimatedDexFees).toStrictEqual([])
    expect(paths2.bestPath[0].estimatedReturn).toStrictEqual('0.10000000')
  })
})

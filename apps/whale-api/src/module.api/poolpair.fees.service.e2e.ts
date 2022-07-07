import { PoolPairController } from './poolpair.controller'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '../e2e.module'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'
import { DeFiDCache } from './cache/defid.cache'
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
    await defiCache.getTokenInfo(k)
  }
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

async function setup (): Promise<void> {
  testing = Testing.create(container)

  const tokens = ['DUSD', 'CAT', 'DOG', 'KOALA', 'FISH', 'TURTLE', 'PANDA', 'RABBIT']

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
    tokenA: 'CAT',
    amountA: 100,
    tokenB: 'DFI',
    amountB: 1000,
    shareAddress: await getNewAddress(container)
  })
  await testing.generate(1)

  await addPoolLiquidity(container, {
    tokenA: 'DOG',
    amountA: 10,
    tokenB: 'DFI',
    amountB: 100,
    shareAddress: await getNewAddress(container)
  })
  await testing.generate(1)

  await addPoolLiquidity(container, {
    tokenA: 'KOALA',
    amountA: 10,
    tokenB: 'DFI',
    amountB: 100,
    shareAddress: await getNewAddress(container)
  })
  await testing.generate(1)

  await addPoolLiquidity(container, {
    tokenA: 'FISH',
    amountA: 5,
    tokenB: 'DFI',
    amountB: 100,
    shareAddress: await getNewAddress(container)
  })
  await testing.generate(1)

  await addPoolLiquidity(container, {
    tokenA: 'TURTLE',
    amountA: 1,
    tokenB: 'DFI',
    amountB: 100,
    shareAddress: await getNewAddress(container)
  })
  await testing.generate(1)

  await addPoolLiquidity(container, {
    tokenA: 'PANDA',
    amountA: 2,
    tokenB: 'DFI',
    amountB: 100,
    shareAddress: await getNewAddress(container)
  })
  await testing.generate(1)

  await addPoolLiquidity(container, {
    tokenA: 'RABBIT',
    amountA: 7,
    tokenB: 'DFI',
    amountB: 100,
    shareAddress: await getNewAddress(container)
  })
  await testing.generate(1)

  // dex fee set up
  await container.call('setgov', [{
    ATTRIBUTES: {
      // CAT-DFI
      'v0/poolpairs/4/token_a_fee_pct': '0.001', // CAT
      'v0/poolpairs/4/token_a_fee_direction': 'in', // CAT
      'v0/poolpairs/4/token_b_fee_pct': '0.002', // DFI
      'v0/poolpairs/4/token_b_fee_direction': 'in', // DFI

      'v0/poolpairs/6/token_a_fee_pct': '0.003', // DOG
      'v0/poolpairs/6/token_a_fee_direction': 'out', // DOG
      'v0/poolpairs/6/token_b_fee_pct': '0.004', // DFI
      'v0/poolpairs/6/token_b_fee_direction': 'out', // DFI

      'v0/poolpairs/8/token_a_fee_pct': '0.005', // KOALA
      'v0/poolpairs/8/token_a_fee_direction': 'in', // KOALA

      'v0/poolpairs/10/token_b_fee_pct': '0.006', // FISH
      'v0/poolpairs/10/token_b_fee_direction': 'out', // FISH

      'v0/poolpairs/12/token_a_fee_pct': '0.007', // TURTLE
      'v0/poolpairs/12/token_a_fee_direction': 'both', // TURTLE

      'v0/poolpairs/14/token_b_fee_pct': '0.008', // PANDA
      'v0/poolpairs/14/token_b_fee_direction': 'both', // PANDA

      'v0/poolpairs/16/token_a_fee_pct': '0.009', // RABBIT
      'v0/poolpairs/16/token_a_fee_direction': 'both', // RABBIT
      'v0/poolpairs/16/token_b_fee_pct': '0.010', // RABBIT
      'v0/poolpairs/16/token_b_fee_direction': 'both' // RABBIT
    }
  }])
  await container.generate(1)
}

describe('get best path - DEX burn fees', () => {
  it('should return fees - CAT to DFI - Both token fees direction are in', async () => {
    const paths1 = await controller.getBestPath('3', '0')

    expect(paths1.bestPath).toStrictEqual([
      {
        estimatedDexFees: {
          tokenA: '0.00100000',
          tokenB: '0.00000000'
        },
        poolPairId: '4',
        priceRatio: {
          ab: '0.10000000',
          ba: '10.00000000'
        },
        symbol: 'CAT-DFI',
        tokenA: {
          displaySymbol: 'dCAT',
          id: '3',
          symbol: 'CAT'
        },
        tokenB: {
          displaySymbol: 'DFI',
          id: '0',
          symbol: 'DFI'
        }
      }])
  })

  it('should return fees - DFI to CAT - Both token fees direction are in', async () => {
    const paths1 = await controller.getBestPath('0', '3')

    expect(paths1.bestPath).toStrictEqual([
      {
        estimatedDexFees: {
          tokenA: '0.00000000',
          tokenB: '0.00200000'
        },
        poolPairId: '4',
        priceRatio: {
          ab: '0.10000000',
          ba: '10.00000000'
        },
        symbol: 'CAT-DFI',
        tokenA: {
          displaySymbol: 'dCAT',
          id: '3',
          symbol: 'CAT'
        },
        tokenB: {
          displaySymbol: 'DFI',
          id: '0',
          symbol: 'DFI'
        }
      }])
  })

  it('should return fees - DFI to DOG - Both token fees direction is out', async () => {
    const paths1 = await controller.getBestPath('0', '5')

    expect(paths1.bestPath).toStrictEqual([
      {
        estimatedDexFees: {
          tokenA: '0.00300000',
          tokenB: '0.00000000'
        },
        poolPairId: '6',
        priceRatio: {
          ab: '0.10000000',
          ba: '10.00000000'
        },
        symbol: 'DOG-DFI',
        tokenA: {
          displaySymbol: 'dDOG',
          id: '5',
          symbol: 'DOG'
        },
        tokenB: {
          displaySymbol: 'DFI',
          id: '0',
          symbol: 'DFI'
        }
      }])
  })

  it('should return fees - DOG to DFI - Both token fees direction is out', async () => {
    const paths1 = await controller.getBestPath('5', '0')

    expect(paths1.bestPath).toStrictEqual([
      {
        estimatedDexFees: {
          tokenA: '0.00000000',
          tokenB: '0.00400000'
        },
        poolPairId: '6',
        priceRatio: {
          ab: '0.10000000',
          ba: '10.00000000'
        },
        symbol: 'DOG-DFI',
        tokenA: {
          displaySymbol: 'dDOG',
          id: '5',
          symbol: 'DOG'
        },
        tokenB: {
          displaySymbol: 'DFI',
          id: '0',
          symbol: 'DFI'
        }
      }])
  })

  it('should return fees - KOALA to DFI - TokenA fee direction is in', async () => {
    const paths1 = await controller.getBestPath('7', '0')

    expect(paths1.bestPath).toStrictEqual([
      {
        estimatedDexFees: {
          tokenA: '0.00500000',
          tokenB: '0.00000000'
        },
        poolPairId: '8',
        priceRatio: {
          ab: '0.10000000',
          ba: '10.00000000'
        },
        symbol: 'KOALA-DFI',
        tokenA: {
          displaySymbol: 'dKOALA',
          id: '7',
          symbol: 'KOALA'
        },
        tokenB: {
          displaySymbol: 'DFI',
          id: '0',
          symbol: 'DFI'
        }
      }])
  })

  it('should return fees - DFI to KOALA - TokenA fee direction is in', async () => {
    const paths1 = await controller.getBestPath('0', '7')

    expect(paths1.bestPath).toStrictEqual([
      {
        estimatedDexFees: {
          tokenA: '0.00000000',
          tokenB: '0.00000000'
        },
        poolPairId: '8',
        priceRatio: {
          ab: '0.10000000',
          ba: '10.00000000'
        },
        symbol: 'KOALA-DFI',
        tokenA: {
          displaySymbol: 'dKOALA',
          id: '7',
          symbol: 'KOALA'
        },
        tokenB: {
          displaySymbol: 'DFI',
          id: '0',
          symbol: 'DFI'
        }
      }])
  })

  it('should return fees - FISH to DFI - TokenB fee direction is out', async () => {
    const paths1 = await controller.getBestPath('9', '0')

    expect(paths1.bestPath).toStrictEqual([
      {
        estimatedDexFees: {
          tokenA: '0.00000000',
          tokenB: '0.00600000'
        },
        poolPairId: '10',
        priceRatio: {
          ab: '0.05000000',
          ba: '20.00000000'
        },
        symbol: 'FISH-DFI',
        tokenA: {
          displaySymbol: 'dFISH',
          id: '9',
          symbol: 'FISH'
        },
        tokenB: {
          displaySymbol: 'DFI',
          id: '0',
          symbol: 'DFI'
        }
      }])
  })

  it('should return fees - DFI to FISH - TokenB fee direction is out', async () => {
    const paths1 = await controller.getBestPath('0', '9')
    expect(paths1.bestPath).toStrictEqual([
      {
        estimatedDexFees: {
          tokenA: '0.00000000',
          tokenB: '0.00000000'
        },
        poolPairId: '10',
        priceRatio: {
          ab: '0.05000000',
          ba: '20.00000000'
        },
        symbol: 'FISH-DFI',
        tokenA: {
          displaySymbol: 'dFISH',
          id: '9',
          symbol: 'FISH'
        },
        tokenB: {
          displaySymbol: 'DFI',
          id: '0',
          symbol: 'DFI'
        }
      }])
  })

  it('should return fees (bidirectional) - DFI <-> TURTLE - TokenA fee direction is both', async () => {
    const paths1 = await controller.getBestPath('0', '11')
    const paths2 = await controller.getBestPath('11', '0')
    expect(paths1.bestPath).toStrictEqual([
      {
        estimatedDexFees: {
          tokenA: '0.00700000',
          tokenB: '0.00000000'
        },
        poolPairId: '12',
        priceRatio: {
          ab: '0.01000000',
          ba: '100.00000000'
        },
        symbol: 'TURTLE-DFI',
        tokenA: {
          displaySymbol: 'dTURTLE',
          id: '11',
          symbol: 'TURTLE'
        },
        tokenB: {
          displaySymbol: 'DFI',
          id: '0',
          symbol: 'DFI'
        }
      }])
    expect(paths1.bestPath).toStrictEqual(paths2.bestPath)
  })

  it('should return fees (bidirectional) - DFI <-> PANDA - TokenA fee direction is both', async () => {
    const paths1 = await controller.getBestPath('0', '13')
    const paths2 = await controller.getBestPath('13', '0')
    expect(paths1.bestPath).toStrictEqual([
      {
        estimatedDexFees: {
          tokenA: '0.00000000',
          tokenB: '0.00800000'
        },
        poolPairId: '14',
        priceRatio: {
          ab: '0.02000000',
          ba: '50.00000000'
        },
        symbol: 'PANDA-DFI',
        tokenA: {
          displaySymbol: 'dPANDA',
          id: '13',
          symbol: 'PANDA'
        },
        tokenB: {
          displaySymbol: 'DFI',
          id: '0',
          symbol: 'DFI'
        }
      }])
    expect(paths1.bestPath).toStrictEqual(paths2.bestPath)
  })

  it('should return fees (bidirectional) - DFI <-> RABBIT - Both token fees direction are both', async () => {
    const paths1 = await controller.getBestPath('0', '15')
    const paths2 = await controller.getBestPath('15', '0')
    expect(paths1.bestPath).toStrictEqual([
      {
        estimatedDexFees: {
          tokenA: '0.00900000',
          tokenB: '0.01000000'
        },
        poolPairId: '16',
        priceRatio: {
          ab: '0.07000000',
          ba: '14.28571428'
        },
        symbol: 'RABBIT-DFI',
        tokenA: {
          displaySymbol: 'dRABBIT',
          id: '15',
          symbol: 'RABBIT'
        },
        tokenB: {
          displaySymbol: 'DFI',
          id: '0',
          symbol: 'DFI'
        }
      }])
    expect(paths1.bestPath).toStrictEqual(paths2.bestPath)
  })

  it('should return [] if dex fees is not set', async () => {
    const paths1 = await controller.getBestPath('1', '0')
    const paths2 = await controller.getBestPath('0', '1')
    expect(paths1.bestPath[0].estimatedDexFees).toStrictEqual(undefined)
    expect(paths2.bestPath[0].estimatedDexFees).toStrictEqual(undefined)
  })
})
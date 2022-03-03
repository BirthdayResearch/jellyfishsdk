import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { Test, TestingModule } from '@nestjs/testing'
import { CACHE_MANAGER, CacheModule } from '@nestjs/common'
import { DeFiDCache } from '../../module.api/cache/defid.cache'
import { createPoolPair, createToken } from '@defichain/testing'
import { PoolPairInfo, TokenInfo } from '@defichain/jellyfish-api-core'
import { Cache } from 'cache-manager'
import { CachePrefix } from '../../module.api/cache/global.cache'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let cache: Cache
let defiCache: DeFiDCache
let testingModule: TestingModule

describe('getPoolPairInfo', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    client = new JsonRpcClient(await container.getCachedRpcUrl())

    testingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        { provide: JsonRpcClient, useValue: client },
        DeFiDCache
      ]
    }).compile()

    cache = testingModule.get<Cache>(CACHE_MANAGER)
    defiCache = testingModule.get(DeFiDCache)

    for (const token of ['A', 'B', 'C']) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
    }

    await createPoolPair(container, 'A', 'B') // 4
    await createPoolPair(container, 'A', 'C') // 5
    await createPoolPair(container, 'B', 'C') // 6

    // TODO(canonbrother): add listpoolpairs in @defi/testing
    const poolPairResult = await container.call('listpoolpairs')
    for (const k in poolPairResult) {
      await defiCache.getPoolPairInfo(k)
    }

    await container.stop()
  })

  it('should get from cache via get as container RPC is killed', async () => {
    const abKey = `${CachePrefix.POOL_PAIR_INFO} 4`
    const abPoolPair = await cache.get<PoolPairInfo>(abKey)
    expect(abPoolPair?.symbol).toStrictEqual('A-B')
    expect(abPoolPair?.name).toStrictEqual('A-B')

    const acKey = `${CachePrefix.POOL_PAIR_INFO} 5`
    const acPoolPair = await cache.get<PoolPairInfo>(acKey)
    expect(acPoolPair?.symbol).toStrictEqual('A-C')
    expect(acPoolPair?.name).toStrictEqual('A-C')

    const bcKey = `${CachePrefix.POOL_PAIR_INFO} 6`
    const bcPoolPair = await cache.get<PoolPairInfo>(bcKey)
    expect(bcPoolPair?.symbol).toStrictEqual('B-C')
    expect(bcPoolPair?.name).toStrictEqual('B-C')
  })

  it('should get undefined while cache and container RPC are killed', async () => {
    await cache.reset()

    const abKey = `${CachePrefix.POOL_PAIR_INFO} 4`
    const abPoolPair = await cache.get<PoolPairInfo>(abKey)
    expect(abPoolPair).toBeUndefined()
  })
})

describe('batchTokenInfo', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    client = new JsonRpcClient(await container.getCachedRpcUrl())

    testingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        { provide: JsonRpcClient, useValue: client },
        DeFiDCache
      ]
    }).compile()

    cache = testingModule.get<Cache>(CACHE_MANAGER)
    defiCache = testingModule.get(DeFiDCache)

    for (const token of ['BAT', 'CAT', 'DOG']) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
    }

    await defiCache.batchTokenInfo(['0', '1', '2', '3']) // DFI, BAT, CAT, DOG

    await container.stop()
  })

  it('should get from cache via batch as container RPC is killed', async () => {
    const dfiKey = `${CachePrefix.TOKEN_INFO} 0`
    const dfi = await cache.get<TokenInfo>(dfiKey)
    expect(dfi?.symbol).toStrictEqual('DFI')
    expect(dfi?.name).toStrictEqual('Default Defi token')

    const catKey = `${CachePrefix.TOKEN_INFO} 2`
    const cat = await cache.get<TokenInfo>(catKey)
    expect(cat?.symbol).toStrictEqual('CAT')
    expect(cat?.name).toStrictEqual('CAT')
  })

  it('should get undefined while cache and container RPC are killed', async () => {
    await cache.reset()

    const dfiKey = `${CachePrefix.TOKEN_INFO} 0`
    const dfi = await cache.get<TokenInfo>(dfiKey)
    expect(dfi).toBeUndefined()
  })
})

describe('getTokenInfo', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    client = new JsonRpcClient(await container.getCachedRpcUrl())

    testingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        { provide: JsonRpcClient, useValue: client },
        DeFiDCache
      ]
    }).compile()

    cache = testingModule.get<Cache>(CACHE_MANAGER)
    defiCache = testingModule.get(DeFiDCache)

    for (const token of ['BAT', 'CAT', 'DOG']) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
    }

    await defiCache.getTokenInfo('0') // DFI
    await defiCache.getTokenInfo('1') // BAT
    await defiCache.getTokenInfo('2') // CAT
    await defiCache.getTokenInfo('3') // DOG

    await container.stop()
  })

  it('should get from cache via get as container RPC is killed', async () => {
    const dfiKey = `${CachePrefix.TOKEN_INFO} 0`

    const dfi = await cache.get<TokenInfo>(dfiKey)
    expect(dfi?.symbol).toStrictEqual('DFI')
    expect(dfi?.name).toStrictEqual('Default Defi token')

    const catKey = `${CachePrefix.TOKEN_INFO} 2`
    const cat = await cache.get<TokenInfo>(catKey)
    expect(cat?.symbol).toStrictEqual('CAT')
    expect(cat?.name).toStrictEqual('CAT')
  })

  it('should get undefined while cache and container RPC are killed', async () => {
    await cache.reset()

    const dfiKey = `${CachePrefix.TOKEN_INFO} 0`
    const dfi = await cache.get<TokenInfo>(dfiKey)
    expect(dfi).toBeUndefined()
  })
})

import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { Test } from '@nestjs/testing'
import { CacheModule } from '@nestjs/common'
import { PoolPairInfoCache } from '@src/module.api/cache/poolpair.info.cache'
import { createToken, createPoolPair } from '@defichain/testing'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let cache: PoolPairInfoCache

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  client = new JsonRpcClient(await container.getCachedRpcUrl())

  const module = await Test.createTestingModule({
    imports: [CacheModule.register()],
    providers: [
      { provide: JsonRpcClient, useValue: client },
      PoolPairInfoCache
    ]
  }).compile()

  cache = module.get(PoolPairInfoCache)

  for (const token of ['A', 'B', 'C']) {
    await container.waitForWalletBalanceGTE(110)
    await createToken(container, token)
  }

  await createPoolPair(container, 'A', 'B')
  await createPoolPair(container, 'A', 'C')
  await createPoolPair(container, 'B', 'C')

  // TODO(canonbrother): add listpoolpairs in @defi/testing
  const poolPairResult = await container.call('listpoolpairs')
  for (const k in poolPairResult) {
    const poolpair = poolPairResult[k]
    await cache.set(poolpair.symbol, poolpair)
  }

  await container.stop()
})

it('should get from cache via get as container RPC is killed', async () => {
  const abPoolPair = await cache.get('A-B')
  expect(abPoolPair?.symbol).toBe('A-B')
  expect(abPoolPair?.name).toBe('A-B')

  const acPoolPair = await cache.get('A-C')
  expect(acPoolPair?.symbol).toBe('A-C')
  expect(acPoolPair?.name).toBe('A-C')

  const bcPoolPair = await cache.get('B-C')
  expect(bcPoolPair?.symbol).toBe('B-C')
  expect(bcPoolPair?.name).toBe('B-C')
})

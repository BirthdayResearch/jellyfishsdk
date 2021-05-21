import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { Test } from '@nestjs/testing'
import { CacheModule } from '@nestjs/common'
import { TokenInfoCache } from '@src/module.api/cache/token.info.cache'
import { createToken } from '@defichain/testing'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let cache: TokenInfoCache

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  client = new JsonRpcClient(await container.getCachedRpcUrl())

  const module = await Test.createTestingModule({
    imports: [CacheModule.register()],
    providers: [
      { provide: JsonRpcClient, useValue: client },
      TokenInfoCache
    ]
  }).compile()

  cache = module.get(TokenInfoCache)

  for (const token of ['TOA', 'TOB', 'TOC']) {
    await container.waitForWalletBalanceGTE(110)
    await createToken(container, token)
  }

  await cache.get('0') // DFI
  await cache.get('1') // TOA
  await cache.get('2') // TOB
  await cache.get('3') // TOC

  await container.stop()
})

it('should get from cache via get as container RPC is killed', async () => {
  const dfi = await cache.get('0')
  expect(dfi?.symbol).toStrictEqual('DFI')
  expect(dfi?.name).toStrictEqual('Default Defi token')

  const tob = await cache.get('2')
  expect(tob?.symbol).toStrictEqual('TOB')
  expect(tob?.name).toStrictEqual('TOB')
})

it('should get from cache via batch as container RPC is killed', async () => {
  const tokens = await cache.batch(['0', '1', '2', '3'])
  expect(tokens['0'].symbol).toStrictEqual('DFI')
  expect(tokens['1'].symbol).toStrictEqual('TOA')
  expect(tokens['2'].symbol).toStrictEqual('TOB')
  expect(tokens['3'].symbol).toStrictEqual('TOC')
})

import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { DatabaseModule } from '@src/module.database/_module'
import { ModelModule } from '@src/module.model/_module'
import { DeFiDModule } from '@src/module.defid/_module'
import { IndexerModule } from '@src/module.indexer/_module'
import { Database } from '@src/module.database/database'
import { Indexer } from '@src/module.indexer/indexer'
import { MemoryDatabase } from '@src/module.database/provider.memory/memory.database'
import waitForExpect from 'wait-for-expect'
import { BlockMapper } from '@src/module.model/block'

export async function createIndexerTestModule (container: RegTestContainer): Promise<TestingModule> {
  const url = await container.getCachedRpcUrl()

  return await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({ defid: { url: url } })]
      }),
      ScheduleModule.forRoot(),
      DatabaseModule.forRoot('memory'),
      ModelModule,
      DeFiDModule,
      IndexerModule
    ]
  }).compile()
}

export async function stopIndexer (app: TestingModule): Promise<void> {
  const indexer = app.get(Indexer)
  indexer.close()

  await app.close()

  // Wait 2000ms between indexer cycle time to prevent database error
  await new Promise((resolve) => {
    setTimeout(_ => resolve(0), 2000)
  })

  const database: MemoryDatabase = app.get(Database)
  await database.close()
}

export async function waitForHeight (app: TestingModule, height: number): Promise<void> {
  const blockMapper = app.get(BlockMapper)
  await waitForExpect(async () => {
    const block = await blockMapper.getHighest()
    expect(block?.height).toBeGreaterThan(height)
  }, 30000)
}

export async function waitForTime (container: MasterNodeRegTestContainer, timestamp: number, timeout: number = 30000): Promise<void> {
  await waitForExpect(async () => {
    await container.generate(1)
    const height = await container.call('getblockcount')
    const stats = await container.call('getblockstats', [height])
    expect(Number(stats.time)).toStrictEqual(timestamp)
  }, timeout)
}

export async function invalidateFromHeight (app: TestingModule, container: MasterNodeRegTestContainer, invalidateHeight: number): Promise<void> {
  const height = await container.call('getblockcount')
  const highestHash = await container.call('getblockhash', [height])
  const invalidateBlockHash = await container.call('getblockhash', [invalidateHeight])
  await container.call('invalidateblock', [invalidateBlockHash])
  await container.call('clearmempool')
  await container.generate(height - invalidateHeight + 1)
  const blockMapper = app.get(BlockMapper)
  await waitForExpect(async () => {
    const block = await blockMapper.getByHeight(height)
    expect(block).not.toStrictEqual(undefined)
    expect(block?.hash).not.toStrictEqual(highestHash)
  }, 30000)
}

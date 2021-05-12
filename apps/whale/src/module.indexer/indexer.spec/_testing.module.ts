import { Test, TestingModule } from '@nestjs/testing'
import { RegTestContainer } from '@defichain/testcontainers'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { DatabaseModule } from '@src/module.database/module'
import { ModelModule } from '@src/module.model/_module'
import { DeFiDModule } from '@src/module.defid'
import { IndexerModule } from '@src/module.indexer/module'
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
    await expect(block?.height).toBeGreaterThan(height)
  })
}

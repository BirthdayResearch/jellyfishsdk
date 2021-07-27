import { Test, TestingModule } from '@nestjs/testing'
import { AppModule } from '@src/app.module'
import { ConfigService } from '@nestjs/config'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { newFastifyAdapter } from '@src/fastify'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Indexer } from '@src/module.indexer/indexer'
import { MemoryDatabase } from '@src/module.database/provider.memory/memory.database'
import { Database } from '@src/module.database/database'
import { BlockMapper } from '@src/module.model/block'
import waitForExpect from 'wait-for-expect'
import { addressToHid } from '@src/module.api/address.controller'
import { ScriptAggregationMapper } from '@src/module.model/script.aggregation'

/**
 * Configures an end-to-end testing app integrated with all modules.
 * Memory database will be used by default.
 * DeFiD client will be provided by @defichain/testcontainers.
 *
 * @param {MasterNodeRegTestContainer} container to provide defid client
 * @return Promise<NestFastifyApplication> with initialization
 */
export async function createTestingApp (container: MasterNodeRegTestContainer): Promise<NestFastifyApplication> {
  const url = await container.getCachedRpcUrl()
  const module = await createTestingModule(url)

  const app = module.createNestApplication<NestFastifyApplication>(
    newFastifyAdapter({
      logger: false
    })
  )
  AppModule.configure(app)

  await app.init()
  return app
}

/**
 * @param {MasterNodeRegTestContainer} container to provide defid client
 * @param {NestFastifyApplication} app to close
 */
export async function stopTestingApp (container: MasterNodeRegTestContainer, app: NestFastifyApplication): Promise<void> {
  try {
    const indexer = app.get(Indexer)
    indexer.close()

    const database: MemoryDatabase = app.get(Database)
    await database.close()
    await app.close()
  } finally {
    await new Promise((resolve) => {
      // Wait 2000ms between indexer cycle time to prevent database error
      setTimeout(_ => resolve(0), 500)
    })
    await container.stop()
  }
}

async function createTestingModule (url: string): Promise<TestingModule> {
  return await Test.createTestingModule({
    imports: [AppModule.forRoot('memory')]
  })
    .overrideProvider(ConfigService).useValue(new TestConfigService(url))
    .compile()
}

/**
 * @param {NestFastifyApplication} app to get indexer
 * @param {number} height to wait for
 * @param {number} [timeout=30000]
 */
export async function waitForIndexedHeight (app: NestFastifyApplication, height: number, timeout: number = 30000): Promise<void> {
  const blockMapper = app.get(BlockMapper)
  await waitForExpect(async () => {
    const block = await blockMapper.getHighest()
    await expect(block?.height).toBeGreaterThan(height)
  }, timeout)
}

export async function waitForAddressTxCount (app: NestFastifyApplication, address: string, txCount: number, timeout: number = 15000): Promise<void> {
  const hid = addressToHid('regtest', address)
  const aggregationMapper = app.get(ScriptAggregationMapper)
  await waitForExpect(async () => {
    const agg = await aggregationMapper.getLatest(hid)
    expect(agg?.statistic.txCount).toStrictEqual(txCount)
  }, timeout)
}

/**
 * Override default ConfigService for E2E testing
 */
class TestConfigService extends ConfigService {
  constructor (rpcUrl: string) {
    super({
      defid: {
        url: rpcUrl
      },
      network: 'regtest',
      database: {
        provider: 'memory'
      }
    })
  }
}

import fs from 'fs'
import { Test, TestingModule } from '@nestjs/testing'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers'
import { newFastifyAdapter } from './fastify'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { RPCBlockProvider } from './module.indexer/rpc.block.provider'
import { BlockMapper } from './module.model/block'
import waitForExpect from 'wait-for-expect'
import { addressToHid } from './module.api/address.controller'
import { ScriptAggregationMapper } from './module.model/script.aggregation'
import { TestingGroup } from '@defichain/jellyfish-testing'
import {
  DefidBin,
  DAddressController,
  DBlockController,
  DFeeController,
  DGovernanceController,
  DMasternodeController,
  DOracleController,
  DPoolPairController,
  DPriceController,
  DStatsController,
  DTransactionController,
  DTokenController
} from './e2e.defid.module'

/**
 * Configures an end-to-end testing app integrated with all modules.
 * Memory database will be used by default.
 * DeFiD client will be provided by @defichain/testcontainers.
 *
 * @param {MasterNodeRegTestContainer} container to provide defid client
 * @return Promise<NestFastifyApplication> with initialization
 */
export async function createTestingApp (container: MasterNodeRegTestContainer): Promise<NestFastifyApplication>
export async function createTestingApp (container: MasterNodeRegTestContainer): Promise<DefidBin>
export async function createTestingApp (container: MasterNodeRegTestContainer): Promise<NestFastifyApplication | DefidBin> {
  if (process.env.DEFID !== undefined) {
    const defid = new DefidBin(
      container,
      new DAddressController(),
      new DBlockController(),
      new DFeeController(),
      new DGovernanceController(),
      new DMasternodeController(),
      new DOracleController(),
      new DPoolPairController(),
      new DPriceController(),
      new DStatsController(),
      new DTransactionController(),
      new DTokenController()
    )
    await defid.start()
    return defid
  }

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
 * @param {MasterNodeRegTestContainer | TestingGroup} container to provide defid client
 * @param {NestFastifyApplication} app to close
 */
export async function stopTestingApp (container: MasterNodeRegTestContainer | TestingGroup, app: NestFastifyApplication | DefidBin): Promise<void> {
  try {
    if (app instanceof DefidBin) {
      const interval = setInterval(() => {
        if (app.binary?.pid !== undefined && !isRunning(app.binary?.pid)) {
          clearInterval(interval)
          fs.rmdirSync(app.tmpDir, { recursive: true })
        }
      }, 500)
      app.binary?.kill()
    } else {
      const indexer = app.get(RPCBlockProvider)
      await indexer.stop()
      await app.close()
    }
  } finally {
    await new Promise((resolve) => {
      // Wait 2000ms between indexer cycle time to prevent database error
      setTimeout((_: any) => resolve(0), 500)
    })

    if (container instanceof MasterNodeRegTestContainer) {
      await container.stop()
    } else {
      await container.stop()
    }
  }
}

function isRunning (pid: number): boolean {
  try {
    return process.kill(pid, 0)
  } catch (err: any) {
    return err.code === 'EPERM'
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
 * @param {MasterNodeRegTestContainer} container
 * @param {number} [timeout=30000]
 */
export async function waitForIndexedHeightLatest (app: NestFastifyApplication, container: MasterNodeRegTestContainer, timeout: number = 30000): Promise<void> {
  await container.generate(1)
  const height = await container.getBlockCount()
  await container.generate(1)
  await waitForIndexedHeight(app, height)
}

/**
 * @param {NestFastifyApplication} app to get indexer
 * @param {number} height to wait for
 * @param {number} [timeout=30000]
 */
export async function waitForIndexedHeight (app: NestFastifyApplication | DefidBin, height: number, timeout: number = 30000): Promise<void> {
  if (app instanceof DefidBin) {
    await waitForExpect(async () => {
      // TODO(): maybe get index from DefidBin
      const count = await app.container.getBlockCount()
      await expect(count).toBeGreaterThan(height)
      await await app.container.generate(1)
    }, timeout)
  } else {
    const blockMapper = app.get(BlockMapper)
    await waitForExpect(async () => {
      const block = await blockMapper.getHighest()
      await expect(block?.height).toBeGreaterThan(height)
    }, timeout)
  }
  await new Promise((resolve) => setTimeout(resolve, 1000))
}

/**
 * @param {MasterNodeRegTestContainer} container
 * @param {number} timestamp
 * @param {number} [timeout=30000]
 */
export async function waitForIndexedTimestamp (container: MasterNodeRegTestContainer, timestamp: number, timeout: number = 30000): Promise<void> {
  await waitForExpect(async () => {
    await container.generate(1)
    const height = await container.call('getblockcount')
    const stats = await container.call('getblockstats', [height])
    await expect(Number(stats.time)).toStrictEqual(timestamp)
  }, timeout)
}

// TODO(): handle DefidBin
export async function waitForAddressTxCount (app: NestFastifyApplication | DefidBin, address: string, txCount: number, timeout: number = 15000): Promise<void> {
  if (app instanceof DefidBin) {
    return
  }
  const hid = addressToHid('regtest', address)
  const aggregationMapper = app.get(ScriptAggregationMapper)
  await waitForExpect(async () => {
    const agg = await aggregationMapper.getLatest(hid)
    expect(agg?.statistic.txCount).toStrictEqual(txCount)
  }, timeout)
}

export async function invalidateFromHeight (app: NestFastifyApplication, container: MasterNodeRegTestContainer, invalidateHeight: number): Promise<void> {
  const height = await container.call('getblockcount')
  const highestHash = await container.call('getblockhash', [height])
  const invalidateBlockHash = await container.call('getblockhash', [invalidateHeight])
  await container.call('invalidateblock', [invalidateBlockHash])
  await container.call('clearmempool')
  // +1 more so that RPCBlockProvider.synchronize can update to next block.
  // New behavior where RPCBlockProvider won't invalidate block on the same height as itself
  await container.generate(height - invalidateHeight + 2)
  const blockMapper = app.get(BlockMapper)

  await waitForExpect(async () => {
    const block = await blockMapper.getByHeight(height)
    expect(block).not.toStrictEqual(undefined)
    expect(block?.hash).not.toStrictEqual(highestHash)
  }, 30000)
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

/**
 * Delayed EunosPaya for Masternode testing
 */
export class DelayedEunosPayaTestContainer extends MasterNodeRegTestContainer {
  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts).filter(x => !x.includes('eunospayaheight')),
      '-eunospayaheight=200'
    ]
  }
}

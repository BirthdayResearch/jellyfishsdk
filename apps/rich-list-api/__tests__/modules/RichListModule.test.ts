import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RichListService } from '../../src/modules/RichListModule'
import { LocalWhaleRpcClient } from '../../testing/LocalWhaleRpcClient'
import { RichListCore, RichListCoreTest, waitForCatchingUp } from '@defichain/rich-list-core'

let app: TestingModule
let testing: Testing
let richListCore: RichListCore
let richListService: RichListService

describe('RichList Module', () => {
  beforeAll(async () => {
    const container = new MasterNodeRegTestContainer()
    testing = Testing.create(container)
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    const url = testing.container.getCachedRpcUrl()

    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forFeature(() => ({
          BLOCKCHAIN_CPP_URL: url
        })),
        ScheduleModule.forRoot()
      ],
      providers: [
        {
          provide: 'RICH_LIST_CORE_SERVICE',
          useFactory: (
          ): RichListService => {
            const whaleRpcClient = new LocalWhaleRpcClient(testing.rpc)

            richListCore = RichListCoreTest(whaleRpcClient)
            return new RichListService(richListCore)
          }
        }
      ]
    }).compile()
    richListService = app.get<RichListService>('RICH_LIST_CORE_SERVICE')
  })

  afterEach(() => {
  })

  afterAll(async () => {
    await app.close()
    await testing.container.stop()
  })

  it('should start rich list on bootstrap', async () => {
    await app.init()
    expect(richListCore.isCatchingUp).toStrictEqual(true)
    await waitForCatchingUp(richListCore)
    expect(richListCore.isCatchingUp).toStrictEqual(false)
  })

  it('should sync on interval', async () => {
    await app.init()
    await waitForCatchingUp(richListCore)
    await richListService.sync()
    expect(richListCore.isCatchingUp).toStrictEqual(true)
    await waitForCatchingUp(richListCore)
    expect(richListCore.isCatchingUp).toStrictEqual(false)
  })

  it('should consumeAddressQueue on interval', async () => {
    await app.init()
    await waitForCatchingUp(richListCore)
    let res = await richListCore.addressBalances.list({ limit: 100, order: 'ASC', partition: '0' })
    expect(res.length).toStrictEqual(0)
    await richListService.consumeAddressQueue()
    res = await richListCore.addressBalances.list({ limit: 100, order: 'ASC', partition: '0' })
    expect(res.length).toBeGreaterThan(0)
  })
})

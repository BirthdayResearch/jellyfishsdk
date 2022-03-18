import { Module, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Interval, ScheduleModule } from '@nestjs/schedule'
import { RichListCore } from '@defichain/rich-list-core'
import { NetworkName } from '@defichain/jellyfish-network/src/Network'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { WhaleApiClient, WhaleRpcClient } from '@defichain/whale-api-client'
import { CrawledBlockRepo } from '../models/CrawledBlock'
import { AddressBalanceRepo } from '../models/AddressBalance'
import { RichListDroppedOutRepo } from '../models/RichListDroppedOut'
import { QueueModule, QueueService } from './QueueModule'
import { LocalWhaleRpcClient } from '../../testing/LocalWhaleRpcClient'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    QueueModule
  ],
  providers: [
    {
      provide: 'RICH_LIST_CORE_SERVICE',
      useFactory: (
        configService: ConfigService,
        addressBalanceRepo: AddressBalanceRepo,
        crawledBlockRepo: CrawledBlockRepo,
        richListDroppedOutRepo: RichListDroppedOutRepo,
        queueService: QueueService
      ): RichListService => {
        const whaleApiClient = new WhaleApiClient({
          url: configService.get<string>('WHALE_API_URL') as string,
          network: configService.get<string>('network') as NetworkName,
          version: 'v0'
        })

        let whaleRpcClient!: WhaleRpcClient
        if (configService.get<string>('NODE_ENV') === 'production') {
          whaleRpcClient = new WhaleRpcClient(configService.get<string>('WHALE_RPC_URL'))
        } else {
          // application can be spun up locally with defid in docker
          // e2e testing can run with defid container instead ocean infra
          const defidRpc = new JsonRpcClient(configService.get<string>('BLOCKCHAIN_CPP_URL') as string)
          whaleRpcClient = new LocalWhaleRpcClient(defidRpc)
        }

        const core = new RichListCore(
          configService.get<string>('network') as NetworkName,
          whaleRpcClient,
          whaleApiClient,
          addressBalanceRepo,
          crawledBlockRepo,
          richListDroppedOutRepo,
          queueService
        )

        return new RichListService(core)
      },
      inject: [
        ConfigService,
        AddressBalanceRepo,
        CrawledBlockRepo,
        RichListDroppedOutRepo,
        QueueService
      ]
    }
  ]
})
export class RichListModule {
}

@Injectable()
export class RichListService {
  constructor (private readonly richListCore: RichListCore) {}

  async onApplicationBootstrap (): Promise<void> {
    await this.richListCore.start()
  }

  @Interval(1_800_000)
  async sync (): Promise<void> {
    await this.richListCore.start()
  }

  @Interval(1_800_000)
  async consumeAddressQueue (): Promise<void> {
    await this.richListCore.calculateNext()
  }
}

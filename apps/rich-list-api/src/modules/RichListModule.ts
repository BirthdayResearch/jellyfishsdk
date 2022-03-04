import { Module, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Interval, ScheduleModule } from '@nestjs/schedule'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { RichListCore } from '@defichain/rich-list-core'
import { NetworkName } from '@defichain/jellyfish-network/src/Network'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { CrawledBlockRepo } from '../models/CrawledBlock'
import { AddressBalanceRepo } from '../models/AddressBalance'
import { RichListDroppedOutRepo } from '../models/RichListDroppedOut'
import { QueueModule, QueueService } from './QueueModule'

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
        apiClient: ApiClient,
        queueService: QueueService
      ): RichListService => {
        const whaleApiClient = new WhaleApiClient({
          url: configService.get<string>('WHALE_API_URL') as string,
          network: configService.get<string>('network') as NetworkName,
          version: 'v0'
        })

        const core = new RichListCore(
          configService.get<string>('network') as NetworkName,
          apiClient,
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
        ApiClient,
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

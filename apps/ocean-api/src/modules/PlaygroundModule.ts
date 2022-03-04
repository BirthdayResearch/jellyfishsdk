import { Injectable, Logger, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Interval, ScheduleModule } from '@nestjs/schedule'
import { BotLogger, Playground } from '@defichain/playground'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

/**
 * Provide a PlaygroundRunner when PLAYGROUND_ENABLE is enabled.
 */
@Module({
  imports: [
    ScheduleModule.forRoot()
  ],
  providers: [
    {
      provide: 'PLAYGROUND_RUNNER',
      useFactory: (configService: ConfigService, apiClient: JsonRpcClient): PlaygroundRunner | undefined => {
        if (configService.get<boolean>('PLAYGROUND_ENABLE') === false) {
          return undefined
        }

        if (configService.get<string>('API_NETWORK') !== 'regtest') {
          throw new Error('PLAYGROUND_ENABLE:true is only allowed on API_NETWORK:regtest')
        }

        return new PlaygroundRunner(apiClient)
      },
      inject: [ConfigService, JsonRpcClient]
    }
  ]
})
export class PlaygroundModule {
}

/**
 * Universal logger for playground using NestJS logger.
 */
class PlaygroundLogger implements BotLogger {
  private readonly logger = new Logger(PlaygroundLogger.name)

  info (action: string, message: string): void {
    this.logger.log(`${action} ${message}`)
  }
}

@Injectable()
class PlaygroundRunner {
  constructor (
    private readonly apiClient: JsonRpcClient,
    private readonly logger: PlaygroundLogger = new PlaygroundLogger(),
    private readonly playground: Playground = new Playground(apiClient, logger)
  ) {
  }

  async onApplicationBootstrap (): Promise<void> {
    this.logger.info('onApplicationBootstrap', 'Bootstrapping')
    await this.playground.bootstrap()
    this.logger.info('onApplicationBootstrap', 'Bootstrapped')
  }

  @Interval(3000)
  async cycle (): Promise<void> {
    await this.playground.cycle()
  }
}

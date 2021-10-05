import { Injectable, Logger, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Interval } from '@nestjs/schedule'
import { BotLogger, Playground } from '@defichain/ocean-playground'
import { ApiClient } from '@defichain/jellyfish-api-core'

/**
 * Provide a PlaygroundRunner when PLAYGROUND_ENABLE is enabled.
 */
@Module({
  providers: [
    {
      provide: 'PLAYGROUND_RUNNER',
      useFactory: (configService: ConfigService, apiClient: ApiClient): PlaygroundRunner | undefined => {
        if (configService.get<boolean>('PLAYGROUND_ENABLE') === true) {
          return new PlaygroundRunner(apiClient)
        }
        return undefined
      },
      inject: [ConfigService, ApiClient]
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
    private readonly apiClient: ApiClient,
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

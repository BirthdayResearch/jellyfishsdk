import { DynamicModule, Logger, Module } from '@nestjs/common'
import { RPCBlockProvider } from './BlockProvider'
import { DexSwapFinder, DexSwapQueue } from './DexSwapQueue'
import { SupportedNetwork } from '../../pipes/NetworkValidationPipe'
import { ScheduleModule } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'

@Module({})
export class InMemoryIndexerModule {
  logger: Logger = new Logger(InMemoryIndexerModule.name)

  static forNetwork (network: SupportedNetwork): DynamicModule {
    return {
      module: InMemoryIndexerModule,
      imports: [
        ScheduleModule.forRoot()
      ],
      providers: [
        {
          provide: 'NETWORK',
          useValue: network
        },

        {
          provide: `BLOCK_CACHE_COUNT_${network}`,
          useFactory: (configService: ConfigService): number => {
            const cacheCount = configService.get<string>(`BLOCK_CACHE_COUNT_${network}`)
            if (cacheCount === undefined) {
              throw new Error(`config:BLOCK_CACHE_COUNT_${network} was not provided`)
            }
            return Number(cacheCount)
          },
          inject: [ConfigService]
        },
        {
          provide: 'BLOCK_CACHE_COUNT',
          useExisting: `BLOCK_CACHE_COUNT_${network}`
        },

        {
          provide: `RPCBlockProvider-${network}`,
          useClass: RPCBlockProvider
        },
        {
          provide: RPCBlockProvider,
          useExisting: `RPCBlockProvider-${network}`
        },

        {
          provide: `DexSwapQueue-${network}`,
          useClass: DexSwapQueue
        },
        {
          provide: DexSwapQueue,
          useExisting: `DexSwapQueue-${network}`
        },

        {
          provide: `DexSwapFinder-${network}`,
          useClass: DexSwapFinder
        },
        {
          provide: DexSwapFinder,
          useExisting: `DexSwapFinder-${network}`
        }
      ],
      exports: [
        `DexSwapQueue-${network}`,
        `DexSwapFinder-${network}`
      ]
    }
  }

  constructor (private readonly provider: RPCBlockProvider) {
  }

  async onApplicationBootstrap (): Promise<void> {
    await this.provider.start()
    this.logger.log('Started InMemoryIndexerModule')
  }

  async beforeApplicationShutdown (): Promise<void> {
    await this.provider.stop()
    this.logger.log('Stopped InMemoryIndexerModule gracefully')
  }
}

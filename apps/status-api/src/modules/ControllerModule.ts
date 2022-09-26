import { CacheModule, Module } from '@nestjs/common'
import { ActuatorController } from '@defichain-apps/libs/actuator'
import { BlockchainStatusController } from '../controllers/BlockchainStatusController'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { ConfigService } from '@nestjs/config'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import { OracleStatusController } from '../controllers/OracleStatusController'
import { OverallStatusController } from '../controllers/OverallStatusController'
import { NetworkName } from '@defichain/jellyfish-network'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  imports: [
    CacheModule.register()
  ],
  controllers: [
    ActuatorController,
    BlockchainStatusController,
    OracleStatusController,
    OverallStatusController
  ],
  providers: [
    BlockchainStatusController,
    {
      provide: WhaleApiClient,
      useFactory: (configService: ConfigService): WhaleApiClient => {
        return new WhaleApiClient({
          version: 'v0',
          network: configService.get<string>('network') as NetworkName ?? 'mainnet',
          url: 'https://ocean.defichain.com'
        })
      },
      inject: [ConfigService]
    },
    SemaphoreCache
  ]
})
export class ControllerModule {
}

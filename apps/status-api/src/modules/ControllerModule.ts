import { CacheModule, Module } from '@nestjs/common'
import { ActuatorController } from '@defichain-apps/libs/actuator'
import { BlockchainController } from '../controllers/BlockchainController'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { ConfigService } from '@nestjs/config'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  imports: [
    CacheModule.register()
  ],
  controllers: [
    BlockchainController,
    ActuatorController
  ],
  providers: [
    {
      provide: WhaleApiClient,
      useFactory: (configService: ConfigService): WhaleApiClient => {
        return new WhaleApiClient({
          version: 'v0',
          network: configService.get<string>('network'),
          url: 'https://ocean.defichain.com'
        })
      },
      inject: [ConfigService]
    }
  ]
})
export class ControllerModule {
}

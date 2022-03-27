import { CacheModule, Module } from '@nestjs/common'
import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider'
import { ActuatorController } from '@defichain-apps/libs/actuator'
import { BlockchainController } from '../controllers/BlockchainController'

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
    WhaleApiClientProvider
  ]
})
export class ControllerModule {
}

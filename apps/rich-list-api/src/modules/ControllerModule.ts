import { CacheModule, Module } from '@nestjs/common'
import { ActuatorController } from '@defichain-apps/libs/actuator'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { GlobalValidationPipe } from '../controllers/filters/GlobalValidationPipe'
import { ResponseInterceptor } from '../controllers/filters/ResponseInterceptor'
import { ErrorFilter } from '../controllers/filters/ErrorFilter'
import { ConfigService } from '@nestjs/config'
import { NetworkName } from '@defichain/jellyfish-network'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  imports: [
    CacheModule.register()
  ],
  controllers: [
    ActuatorController
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: GlobalValidationPipe
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor
    },
    {
      provide: APP_FILTER,
      useClass: ErrorFilter
    },
    {
      provide: 'NETWORK_NAME',
      useFactory: (configService: ConfigService): NetworkName => {
        return configService.get<string>('network') as NetworkName
      },
      inject: [ConfigService]
    }
  ]
})
export class ControllerModule {
}

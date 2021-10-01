import { CacheModule, Module } from '@nestjs/common'
import { ActuatorController } from './ActuatorController'
import { FeeController } from './FeeController'
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { GlobalValidationPipe } from './filters/GlobalValidationPipe'
import { ResponseInterceptor } from './filters/ResponseInterceptor'
import { ExceptionInterceptor } from './filters/ExceptionInterceptor'
import { ConfigService } from '@nestjs/config'
import { NetworkName } from '@defichain/jellyfish-network'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  imports: [CacheModule.register()],
  controllers: [
    ActuatorController,
    FeeController,
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
      provide: APP_INTERCEPTOR,
      useClass: ExceptionInterceptor
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

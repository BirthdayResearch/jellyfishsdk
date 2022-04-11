import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ControllerModule } from './ControllerModule'
import { WhaleApiModule } from './WhaleApiModule'
import { ActuatorModule } from '@defichain-apps/libs/actuator'
import { LoggingModule } from './LoggingModule'

function AppConfiguration (): Record<string, any> {
  return {
    SWAP_CACHE_COUNT: process.env.SWAP_CACHE_COUNT ?? 1_000
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [AppConfiguration]
    }),
    ActuatorModule,
    WhaleApiModule,
    ControllerModule,
    LoggingModule
  ]
})
export class RootModule {
}

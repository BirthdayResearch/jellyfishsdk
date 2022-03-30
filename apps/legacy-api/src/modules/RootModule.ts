import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ControllerModule } from './ControllerModule'
import { WhaleApiModule } from './WhaleApiModule'
import { ActuatorModule } from '@defichain-apps/libs/actuator'
import { LoggingModule } from './LoggingModule'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true
    }),
    ActuatorModule,
    WhaleApiModule,
    ControllerModule,
    LoggingModule
  ]
})
export class RootModule {
}

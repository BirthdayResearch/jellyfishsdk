import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ControllerModule } from './ControllerModule'
import { WhaleApiModule } from './WhaleApiModule'
import { ActuatorModule } from '@defichain-apps/libs/actuator'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true
    }),
    ActuatorModule,
    WhaleApiModule,
    ControllerModule
  ]
})
export class RootModule {
}

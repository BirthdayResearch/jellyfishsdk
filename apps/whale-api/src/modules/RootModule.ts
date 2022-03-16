import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppConfiguration } from '../AppConfiguration'
import { ActuatorModule } from '@defichain-apps/libs/actuator'
import { BlockchainCppModule } from '@defichain-apps/libs/blockchaincpp'
import { ControllerModule } from './ControllerModule'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [AppConfiguration]
    }),
    ActuatorModule,
    BlockchainCppModule,
    ControllerModule
  ]
})
export class RootModule {
}

import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppConfiguration } from '../AppConfiguration'
import { ActuatorModule } from '@defichain-apps/libs/actuator'
import { BlockchainCppModule } from '@defichain-apps/libs/blockchaincpp'
import { ControllerModule } from './ControllerModule'
import { PlaygroundModule } from './PlaygroundModule'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [AppConfiguration]
    }),
    ActuatorModule,
    BlockchainCppModule,
    ControllerModule,
    PlaygroundModule
  ]
})
export class RootModule {
}

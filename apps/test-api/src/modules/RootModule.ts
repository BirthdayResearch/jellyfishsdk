import { Module } from '@nestjs/common'
// import { ConfigModule } from '@nestjs/config'
// import { AppConfiguration } from '../AppConfiguration'
import { ControllerModule } from './ControllerModule'
// import { BlockchainCppModule } from './BlockchainCppModule'
// import { ActuatorModule } from './ActuatorModule'
// import { ActuatorModule } from '@defichain-apps/ocean-api/src/modules/ActuatorModule'

@Module({
  imports: [
    // ConfigModule.forRoot({
    //   isGlobal: true,
    //   cache: true,
    //   load: [AppConfiguration]
    // }),
    // ActuatorModule,
    // BlockchainCppModule,
    ControllerModule
  ]
})
export class RootModule {
}

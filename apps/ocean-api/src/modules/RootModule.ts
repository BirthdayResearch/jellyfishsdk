import * as Joi from 'joi'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ControllerModule } from './ControllerModule'
import { BlockchainCppModule } from './BlockchainCppModule'
import { ActuatorModule } from '@defichain-apps/libs/actuator'
import { PlaygroundModule } from './PlaygroundModule'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: ENV_VALIDATION_SCHEMA()
    }),
    ActuatorModule,
    BlockchainCppModule,
    ControllerModule,
    PlaygroundModule
  ]
})
export class RootModule {
}

function ENV_VALIDATION_SCHEMA (): any {
  return Joi.object({
    NODE_ENV: Joi.string().valid('production', 'test').default('test'),
    PORT: Joi.number().default(3000),
    API_VERSION: Joi.string().regex(/^v[0-9]+(\.[0-9]+)?$/).default('v1'),
    API_NETWORK: Joi.string().valid('regtest', 'testnet', 'mainnet').default('regtest'),
    PLAYGROUND_ENABLE: Joi.boolean()
  })
}

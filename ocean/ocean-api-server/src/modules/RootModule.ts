import * as Joi from 'joi'
import { Module } from '@nestjs/common'
import packageJson from '../../package.json'
import { ConfigModule } from '@nestjs/config'
import { ControllerModule } from './ControllerModule'
import { AinModule } from './AinModule'
import { ActuatorModule } from './ActuatorModule'
import { PlaygroundModule } from './PlaygroundModule'
import { ScheduleModule } from '@nestjs/schedule'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: ENV_VALIDATION_SCHEMA()
    }),
    ScheduleModule.forRoot(),
    ActuatorModule,
    AinModule,
    ControllerModule,
    PlaygroundModule
  ]
})
export class RootModule {
}

function ENV_VALIDATION_SCHEMA (): any {
  const [major, minor] = packageJson.version.split('.') as [string, string, string]
  const version = `v${major}.${minor}`

  return Joi.object({
    NODE_ENV: Joi.string().valid('production', 'test').default('test'),
    PORT: Joi.number().default(3000),
    API_VERSION: Joi.string().regex(/^v[0-9]+(\.[0-9]+)?$/).default(version),
    API_NETWORK: Joi.string().valid('regtest', 'testnet', 'mainnet', 'playground').default('regtest'),
    PLAYGROUND_ENABLE: Joi.boolean()
  })
}

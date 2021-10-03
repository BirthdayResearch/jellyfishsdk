import { Module } from '@nestjs/common'
import { ControllerModule } from './ControllerModule'
import { FullNodeModule } from './FullNodeModule'
import { ConfigModule } from '@nestjs/config'
import packageJson from '../../package.json'
import * as Joi from 'joi'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: ENV_VALIDATION_SCHEMA()
    }),
    FullNodeModule,
    ControllerModule
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
    API_NETWORK: Joi.string().valid('regtest', 'testnet', 'mainnet').default('regtest')
  })
}

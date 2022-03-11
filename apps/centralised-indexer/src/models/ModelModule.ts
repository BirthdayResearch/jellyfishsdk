import { Global, Module } from '@nestjs/common'
import { BlockSchema, BlockService } from './Block'
import { DynamooseModule } from 'nestjs-dynamoose'
import { ConfigModule, ConfigService } from '@nestjs/config'

function getConfigOrThrow (configService: ConfigService, configKey: string): string {
  const configValue = configService.get<string>(configKey)
  if (configValue === undefined) {
    throw new Error(`${configKey} not provided`)
  }
  return configValue
}

@Global()
@Module({
  imports: [
    DynamooseModule.forRootAsync({
      imports: [
        ConfigModule
      ],
      useFactory: async (cfg: ConfigService) => {
        const endpoint = getConfigOrThrow(cfg, 'INDEXER_DYNAMODB_ENDPOINT')
        const isLocal = endpoint.startsWith('http://localhost')

        const region = getConfigOrThrow(cfg, 'INDEXER_DYNAMODB_REGION')
        const accessKeyId = getConfigOrThrow(cfg, 'INDEXER_DYNAMODB_ACCESSKEYID')
        const secretAccessKey = getConfigOrThrow(cfg, 'INDEXER_DYNAMODB_SECRETACCESSKEY')
        return {
          local: isLocal ? endpoint : false,
          aws: { region, accessKeyId, secretAccessKey },
          // ddb: TODO(eli-lim): need to pass in endpoint, or will aws-sdk perform black magic with provided credentials?
          model: {
            create: true,
            waitForActive: true
          }
        }
      },
      inject: [ConfigService]
    }),
    DynamooseModule.forFeature([
      { name: 'Block', schema: BlockSchema }
    ])
  ],
  providers: [
    BlockService
  ],
  exports: [BlockService]
})
export class ModelModule {

}

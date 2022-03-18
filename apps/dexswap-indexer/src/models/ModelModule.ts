import { DynamicModule, Module } from '@nestjs/common'
import { BlockSchema, BlockMapper } from './block/Block'
import { DynamooseModule } from 'nestjs-dynamoose'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { DexSwapSchema, DexSwapMapper } from './dftx/DexSwap'
import { TokenSchema, TokenMapper } from './dftx/Token'
import { Database } from '../indexer/database/_abstract'
import { DynamoDb } from '../indexer/database/DynamoDb'

function getConfigOrThrow (configService: ConfigService, configKey: string): string {
  const configValue = configService.get<string>(configKey)
  if (configValue === undefined) {
    throw new Error(`${configKey} not provided`)
  }
  return configValue
}

interface ModelModuleOptions {
  readOnly: boolean
}

@Module({})
export class ModelModule {
  static register (modelModuleOptions: ModelModuleOptions): DynamicModule {
    return {
      module: ModelModule,
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
              aws: {
                region,
                accessKeyId,
                secretAccessKey
              },
              // ddb: TODO(eli-lim): need to pass in endpoint, or will aws-sdk perform black magic with provided credentials?
              model: {
                create: !modelModuleOptions.readOnly,
                waitForActive: false
              }
              // ,logger: console
            }
          },
          inject: [ConfigService]
        }),

        // Register models
        DynamooseModule.forFeature([
          { name: 'Block', schema: BlockSchema },
          { name: 'DexSwap', schema: DexSwapSchema },
          { name: 'Token', schema: TokenSchema }
        ])
      ],
      providers: [
        BlockMapper,
        DexSwapMapper,
        TokenMapper,
        {
          provide: Database,
          useClass: DynamoDb
        }
      ],
      exports: [
        BlockMapper,
        DexSwapMapper,
        TokenMapper
      ]
    }
  }
}

import { Test, TestingModuleBuilder } from '@nestjs/testing'
import { ModelModule } from '../../src/models/ModelModule'
import { ConfigService } from '@nestjs/config'

export function modelModuleTesting (dynamoDbPort: string, readonly: boolean = false): TestingModuleBuilder {
  return Test.createTestingModule({
    imports: [
      ModelModule.register({ readOnly: readonly })
    ]
  }).overrideProvider(ConfigService)
    .useValue({
      get: jest.fn((key: string) => {
        const DYNAMO_DB_TESTING_CONFIGS: Record<string, string> = {
          INDEXER_DYNAMODB_ENDPOINT: `http://localhost:${dynamoDbPort}`,
          INDEXER_DYNAMODB_REGION: 'dummy',
          INDEXER_DYNAMODB_ACCESSKEYID: 'dummy',
          INDEXER_DYNAMODB_SECRETACCESSKEY: 'dummy'
        }
        return DYNAMO_DB_TESTING_CONFIGS[key]
      })
    })
}

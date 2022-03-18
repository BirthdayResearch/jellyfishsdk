import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { DynamoDbContainer } from './containers/DynamoDbContainer'
import { ServiceModule } from '../src/services/ServiceModule'
import { CentralisedApiServer } from '../src/services'

/**
 * Service stubs are simulations of a real service, which are used for functional testing.
 * Configures a TestingModule that is configured to connect to a provided @defichain/testcontainers.
 */
export class CentralisedApiStubServer extends CentralisedApiServer {
  constructor (
    private readonly dynamoDbContainer: DynamoDbContainer
  ) {
    super()
  }

  async create (): Promise<NestFastifyApplication> {
    const dynamoDbContainerPort = await this.dynamoDbContainer.getHostPort()
    const module = await Test.createTestingModule({
      imports: [
        ServiceModule
      ]
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          const TEST_CONFIGS: Record<string, string> = {
            INDEXER_DYNAMODB_ENDPOINT: `http://localhost:${dynamoDbContainerPort}`,
            INDEXER_DYNAMODB_REGION: 'dummy',
            INDEXER_DYNAMODB_ACCESSKEYID: 'dummy',
            INDEXER_DYNAMODB_SECRETACCESSKEY: 'dummy',
            NETWORK: 'regtest'
          }
          return TEST_CONFIGS[key]
        })
      })
      .compile()

    const adapter = new FastifyAdapter({
      logger: false
    })
    return module.createNestApplication<NestFastifyApplication>(adapter)
  }

  async init (app: NestFastifyApplication, config: ConfigService): Promise<void> {
    await app.init()
  }
}

import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { IndexerModule } from '../src/indexer/IndexerModule'
import { RootServer } from '../src/indexer'
import { ConfigService } from '@nestjs/config'
import { DynamoDbContainer } from './containers/DynamoDbContainer'

/**
 * Service stubs are simulations of a real service, which are used for functional testing.
 * Configures a TestingModule that is configured to connect to a provided @defichain/testcontainers.
 */
export class CentralisedIndexerStubServer extends RootServer {
  /**
   * @see PlaygroundModule
   */
  constructor (
    private readonly container: MasterNodeRegTestContainer,
    private readonly dynamoDbContainer: DynamoDbContainer
  ) {
    super()
  }

  async create (): Promise<NestFastifyApplication> {
    const masternodeRpcUrl = await this.container.getCachedRpcUrl()
    const dynamoDbContainerPort = await this.dynamoDbContainer.getHostPort()
    const module = await Test.createTestingModule({
      imports: [
        IndexerModule
      ]
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          const TEST_CONFIGS: Record<string, string> = {
            BLOCKCHAIN_CPP_URL: masternodeRpcUrl,
            INDEXER_DYNAMODB_ENDPOINT: `http://localhost:${dynamoDbContainerPort}`,
            INDEXER_DYNAMODB_REGION: 'dummy',
            INDEXER_DYNAMODB_ACCESSKEYID: 'dummy',
            INDEXER_DYNAMODB_SECRETACCESSKEY: 'dummy'
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

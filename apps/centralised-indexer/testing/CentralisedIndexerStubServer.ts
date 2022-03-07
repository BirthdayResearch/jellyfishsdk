import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { RootModule } from '../src/indexer/RootModule'
import { RootServer } from '../src/indexer'
import { ConfigService } from '@nestjs/config'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
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
        RootModule
      ]
    })
      .overrideProvider(JsonRpcClient)
      .useValue(new JsonRpcClient(masternodeRpcUrl))
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          const DYNAMO_DB_TESTING_CONFIGS: Record<string, string> = {
            INDEXER_DYNAMODB_ENDPOINT: `http://localhost:${dynamoDbContainerPort}`,
            INDEXER_DYNAMODB_REGION: 'dummy',
            INDEXER_DYNAMODB_ACCESSKEYID: 'dummy',
            INDEXER_DYNAMODB_SECRETACCESSKEY: 'dummy'
          }
          return DYNAMO_DB_TESTING_CONFIGS[key]
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

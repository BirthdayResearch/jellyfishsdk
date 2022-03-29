import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp } from '../../src/E2EModule'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { RPCBlockProvider } from '../../src/indexer/RPCBlockProvider'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  app = await createTestingApp(container)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

it('should index genesis without throwing', async () => {
  const rpcBlockProvider = app.get(RPCBlockProvider)
  await expect(rpcBlockProvider.indexGenesis()).resolves.not.toThrow()
})

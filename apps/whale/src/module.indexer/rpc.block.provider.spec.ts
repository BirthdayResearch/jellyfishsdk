import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp } from '../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { RPCBlockProvider } from './rpc.block.provider'

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

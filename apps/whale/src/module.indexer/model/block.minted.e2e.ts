import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp } from '../../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { BlockMintedIndexer } from './block.minted'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let client: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(21)

  app = await createTestingApp(container)
  client = new JsonRpcClient(await container.getCachedRpcUrl())
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

it('should index block 0', async () => {
  const blockMintedIndexer = app.get(BlockMintedIndexer)

  const hash = await client.blockchain.getBlockHash(0)
  const block = await client.blockchain.getBlock(hash, 2)

  await expect(blockMintedIndexer.index(block)).resolves.not.toThrow()
})

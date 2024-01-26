import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '../../e2e.module'
import { FeeController } from '../fee.controller'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: FeeController
let client: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  controller = app.get<FeeController>(FeeController)
  client = new JsonRpcClient(await container.getCachedRpcUrl())
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('fee/estimate', () => {
  it('should have fee of 0.00005 and not 0.00005 after adding activity', async () => {
    const before = await controller.estimate(10)
    expect(before).toStrictEqual(0.00005000)

    for (let i = 0; i < 10; i++) {
      for (let x = 0; x < 20; x++) {
        await client.wallet.sendToAddress('bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r', 0.1, {
          subtractFeeFromAmount: true,
          avoidReuse: false
        })
      }
      await container.generate(1)
    }
    const after = await controller.estimate(10)
    expect(after).not.toStrictEqual(0.00005000)
  })
})

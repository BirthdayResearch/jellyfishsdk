import { Test, TestingModule } from '@nestjs/testing'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ConfigModule } from '@nestjs/config'
import { FeeController } from '../module.api/fee.controller'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let controller: FeeController

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  client = new JsonRpcClient(await container.getCachedRpcUrl())
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await container.waitForWalletBalanceGTE(11)
  const defidUrl = await container.getCachedRpcUrl()

  const app: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({ defid: { url: defidUrl } })]
      })
    ],
    controllers: [FeeController],
    providers: [{ provide: JsonRpcClient, useValue: client }]
  }).compile()

  controller = app.get<FeeController>(FeeController)
})

describe('estimateFeeRate', () => {
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

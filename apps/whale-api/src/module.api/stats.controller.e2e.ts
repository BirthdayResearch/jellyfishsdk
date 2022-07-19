import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StatsController } from './stats.controller'
import { createTestingApp, stopTestingApp } from '../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: StatsController

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()

  app = await createTestingApp(container)
  controller = app.get<StatsController>(StatsController)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

it('should getRewardDistribution', async () => {
  const data = await controller.getRewardDistribution()
  expect(data).toStrictEqual({
    masternode: expect.any(Number),
    community: expect.any(Number),
    anchor: expect.any(Number),
    liquidity: expect.any(Number),
    loan: expect.any(Number),
    options: expect.any(Number),
    unallocated: expect.any(Number)
  })
})

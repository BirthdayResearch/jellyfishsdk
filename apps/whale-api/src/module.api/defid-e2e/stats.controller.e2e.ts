import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StatsController } from '../stats.controller'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '../../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: StatsController

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()

  app = await createTestingApp(container)
  await waitForIndexedHeight(app, 100)

  controller = app.get<StatsController>(StatsController)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

it('should getRewardDistribution', async () => {
  await container.generate(10)
  await waitForIndexedHeight(app, 110)

  const data = await controller.getRewardDistribution()
  expect(data).toStrictEqual({
    masternode: 66.66,
    community: 9.82,
    anchor: 0.04,
    liquidity: 50.9,
    loan: 49.36,
    options: 19.76,
    unallocated: 3.46
  })
})

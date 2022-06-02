import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { LegacyController } from './legacy.controller'
import { createTestingApp, stopTestingApp, waitForIndexedHeightLatest } from '../e2e.module'
import { Testing } from '@defichain/jellyfish-testing'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import {
  addPoolLiquidity,
  createPoolPair,
  createToken,
  getNewAddress,
  mintTokens,
  poolSwap,
  sendTokensToAddress
} from '@defichain/testing'
import { random } from 'lodash'

const container = new MasterNodeRegTestContainer()
let controller: LegacyController
let testing: Testing
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()

  app = await createTestingApp(container)
  testing = Testing.create(container)

  const ownerAddress = await testing.container.getNewAddress()
  const tokens = ['A', 'B']

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(110)
    await createToken(container, token)
    await mintTokens(container, token)
  }
  await createPoolPair(container, 'A', 'DFI')
  await createPoolPair(container, 'B', 'DFI')

  await addPoolLiquidity(container, {
    tokenA: 'A',
    amountA: 100,
    tokenB: 'DFI',
    amountB: 200,
    shareAddress: await getNewAddress(container)
  })
  await addPoolLiquidity(container, {
    tokenA: 'B',
    amountA: 50,
    tokenB: 'DFI',
    amountB: 300,
    shareAddress: await getNewAddress(container)
  })

  await sendTokensToAddress(container, ownerAddress, 500, 'A')

  await waitForIndexedHeightLatest(app, container)

  for (let i = 0; i < 15; i++) {
    await poolSwap(container, {
      from: ownerAddress,
      tokenFrom: 'A',
      amountFrom: random(1, 2),
      to: ownerAddress,
      tokenTo: 'DFI'
    })

    await poolSwap(container, {
      from: ownerAddress,
      tokenFrom: 'DFI',
      amountFrom: random(1, 2),
      to: ownerAddress,
      tokenTo: 'A'
    })
  }

  await waitForIndexedHeightLatest(app, container)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

it('should list 30 subgraph swaps', async () => {
  controller = app.get(LegacyController)

  const subgraphSwaps = await controller.getSubgraphSwaps('regtest')

  expect(subgraphSwaps.data.swaps.length).toStrictEqual(30)
})

it('should list 5 subgraph swaps', async () => {
  controller = app.get(LegacyController)

  const subgraphSwaps = await controller.getSubgraphSwaps('regtest', 5)

  expect(subgraphSwaps.data.swaps.length).toStrictEqual(5)
})

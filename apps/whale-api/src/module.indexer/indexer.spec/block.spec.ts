import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { BlockMapper } from '@src/module.model/block'

const container = new MasterNodeRegTestContainer()
let app: TestingModule

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(10)

  app = await createIndexerTestModule(container)
  await app.init()
})

afterAll(async () => {
  try {
    await stopIndexer(app)
  } finally {
    await container.stop()
  }
})

/* eslint-disable @typescript-eslint/no-non-null-assertion */

it('should wait for block 0', async () => {
  await waitForHeight(app, 0)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(0)

  expect(block?.height).toBe(0)
  expect(block?.hash).toBe('0091f00915b263d08eba2091ba70ba40cea75242b3f51ea29f4a1b8d7814cd01')
  expect(block?.stakeModifier).toBe('0000000000000000000000000000000000000000000000000000000000000000')
  expect(block?.transactionCount).toBeGreaterThan(0)
})

it('should wait for block 1', async () => {
  await waitForHeight(app, 1)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(1)

  expect(block?.height).toBe(1)
  expect(block?.transactionCount).toBeGreaterThan(0)
})

it('should wait for block 10', async () => {
  await waitForHeight(app, 10)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(10)

  expect(block?.height).toBe(10)
  expect(block?.transactionCount).toBeGreaterThan(0)
})

// TODO(fuxingloh): testing not sufficient, no re-org testing capability

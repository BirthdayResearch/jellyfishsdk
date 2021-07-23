import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, invalidateFromHeight, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { BlockMapper } from '@src/module.model/block'

const container = new MasterNodeRegTestContainer()
let app: TestingModule

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(21)

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

  expect(block?.height).toStrictEqual(0)
  expect(block?.hash).toStrictEqual('d744db74fb70ed42767ae028a129365fb4d7de54ba1b6575fb047490554f8a7b')
  expect(block?.stakeModifier).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
  expect(block?.transactionCount).toBeGreaterThan(0)
})

it('should wait for block 1', async () => {
  await waitForHeight(app, 1)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(1)

  expect(block?.height).toStrictEqual(1)
  expect(block?.transactionCount).toBeGreaterThan(0)
})

it('should wait for block 10', async () => {
  await waitForHeight(app, 10)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(10)

  expect(block?.height).toStrictEqual(10)
  expect(block?.transactionCount).toBeGreaterThan(0)
})

it('should invalidate', async () => {
  await waitForHeight(app, 20)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(15)

  expect(block?.height).toStrictEqual(15)
  expect(block?.transactionCount).toBeGreaterThan(0)

  const oldHash = block?.hash

  await invalidateFromHeight(app, container, 15)

  const newBlock = await blockMapper.getByHeight(15)

  expect(oldHash).not.toStrictEqual(newBlock?.hash)
})

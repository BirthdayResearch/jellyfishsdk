import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { BlockMapper } from '../../module.model/block'
import { createTestingApp, invalidateFromHeight, stopTestingApp, waitForIndexedHeight } from '../../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(21)

  app = await createTestingApp(container)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

/* eslint-disable @typescript-eslint/no-non-null-assertion */

it('should wait for block 0', async () => {
  await waitForIndexedHeight(app, 0)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(0)

  expect(block?.height).toStrictEqual(0)
  expect(block?.hash).toStrictEqual('d744db74fb70ed42767ae028a129365fb4d7de54ba1b6575fb047490554f8a7b')
  expect(block?.stakeModifier).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
  expect(block?.transactionCount).toBeGreaterThan(0)
})

it('should wait for block 1', async () => {
  await waitForIndexedHeight(app, 1)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(1)

  expect(block?.height).toStrictEqual(1)
  expect(block?.transactionCount).toBeGreaterThan(0)
})

it('should wait for block 10', async () => {
  await waitForIndexedHeight(app, 10)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(10)

  expect(block?.height).toStrictEqual(10)
  expect(block?.transactionCount).toBeGreaterThan(0)
})

it('should invalidate', async () => {
  await waitForIndexedHeight(app, 20)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(15)

  expect(block?.height).toStrictEqual(15)
  expect(block?.transactionCount).toBeGreaterThan(0)

  const oldHash = block?.hash

  await invalidateFromHeight(app, container, 15)

  const newBlock = await blockMapper.getByHeight(15)

  expect(oldHash).not.toStrictEqual(newBlock?.hash)
})

import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { BlockMapper } from '../../module.model/block'
import { TransactionMapper } from '../../module.model/transaction'
import { TransactionVinMapper } from '../../module.model/transaction.vin'
import { TransactionVoutMapper } from '../../module.model/transaction.vout'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '../../e2e.module'

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

async function expectTransactions (hash: string, count: number): Promise<void> {
  const transactionMapper = app.get(TransactionMapper)
  const vinMapper = app.get(TransactionVinMapper)
  const voutMapper = app.get(TransactionVoutMapper)
  const transactions = await transactionMapper.queryByBlockHash(hash, 100)

  expect(transactions.length).toStrictEqual(count)

  for (const transaction of transactions) {
    expect(transaction.block.hash).toStrictEqual(hash)

    for (const vin of await vinMapper.query(transaction.txid, 100)) {
      expect(vin.txid).toStrictEqual(transaction.txid)
    }

    for (const vout of await voutMapper.query(transaction.txid, 100)) {
      expect(vout.txid).toStrictEqual(transaction.txid)
      expect(vout.n).toBeGreaterThanOrEqual(0)
      expect(vout.script.hex).toBeDefined()
      expect(Number.parseFloat(vout.value)).toBeGreaterThanOrEqual(0)
    }
  }
}

it('should wait for block 0', async () => {
  await waitForIndexedHeight(app, 0)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(0)

  await expectTransactions(block!.hash, block!.transactionCount)
})

it('should wait for block 5', async () => {
  await waitForIndexedHeight(app, 5)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(5)

  await expectTransactions(block!.hash, block!.transactionCount)
})

it('should wait for block 20', async () => {
  await waitForIndexedHeight(app, 20)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(20)

  await expectTransactions(block!.hash, block!.transactionCount)
})

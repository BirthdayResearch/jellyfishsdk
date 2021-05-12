import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { BlockMapper } from '@src/module.model/block'
import { TransactionMapper } from '@src/module.model/transaction'
import { TransactionVinMapper } from '@src/module.model/transaction.vin'
import { TransactionVoutMapper } from '@src/module.model/transaction.vout'

const container = new MasterNodeRegTestContainer()
let app: TestingModule

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(20)

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

async function expectTransactions (hash: string, count: number): Promise<void> {
  const transactionMapper = app.get(TransactionMapper)
  const vinMapper = app.get(TransactionVinMapper)
  const voutMapper = app.get(TransactionVoutMapper)
  const transactions = await transactionMapper.queryByBlockHash(hash, 100)

  expect(transactions.length).toBe(count)

  for (const transaction of transactions) {
    expect(transaction.block.hash).toBe(hash)

    for (const vin of await vinMapper.query(transaction.txid, 100)) {
      expect(vin.txid).toBe(transaction.txid)
    }

    for (const vout of await voutMapper.query(transaction.txid, 100)) {
      expect(vout.txid).toBe(transaction.txid)
      expect(vout.n).toBeGreaterThanOrEqual(0)
      expect(vout.script.hex).toBeDefined()
      expect(Number.parseFloat(vout.value)).toBeGreaterThanOrEqual(0)
    }
  }
}

it('should wait for block 0', async () => {
  await waitForHeight(app, 0)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(0)

  await expectTransactions(block!.hash, block!.transactionCount)
})

it('should wait for block 5', async () => {
  await waitForHeight(app, 5)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(5)

  await expectTransactions(block!.hash, block!.transactionCount)
})

it('should wait for block 20', async () => {
  await waitForHeight(app, 20)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(20)

  await expectTransactions(block!.hash, block!.transactionCount)
})

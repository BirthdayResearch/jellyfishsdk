import { BlockController, parseHeight } from '@src/module.api/block.controller'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: BlockController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForBlockHeight(101)

  app = await createTestingApp(container)

  await waitForIndexedHeight(app, 100)
  controller = app.get(BlockController)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('get', () => {
  it('should get block based on hash', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const block = await controller.get(blockHash)
    expect(block?.height).toStrictEqual(100)
    expect(block?.hash).toStrictEqual(blockHash)
  })

  it('get should get block with height', async () => {
    const block = await controller.get('100')
    expect(block?.height).toStrictEqual(100)
  })

  it('should get undefined with invalid hash ', async () => {
    const block = await controller.get('lajsdl;kfjljklj12lk34j')
    expect(block).toStrictEqual(undefined)
  })
})

describe('getTransactions', () => {
  it('should get transactions from a block by hash', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const paginatedTransactions = await controller.getTransactions(blockHash, { size: 30, next: '10' })

    expect(paginatedTransactions.data.length).toBeGreaterThanOrEqual(1)
    expect(paginatedTransactions.data[0].block.height).toStrictEqual(100)
  })

  it('getTransactions should not get transactions by height', async () => {
    const paginatedTransactions = await controller.getTransactions('0', { size: 30, next: '10' })

    expect(paginatedTransactions.data.length).toStrictEqual(0)
  })

  it('getTransactions should get empty array when hash is not valid', async () => {
    const paginatedTransactions = await controller.getTransactions('z1wadfsvq90qlkfalnklvm', { size: 30 })

    expect(paginatedTransactions.data.length).toStrictEqual(0)
  })

  it('getTransactions should get empty array when height is not valid', async () => {
    const paginatedTransactions = await controller.getTransactions('999999999999', { size: 30 })

    expect(paginatedTransactions.data.length).toStrictEqual(0)
  })
})

describe('list', () => {
  it('should return paginated list of blocks', async () => {
    const firstPage = await controller.list({ size: 40 })

    expect(firstPage.data.length).toStrictEqual(40)

    expect(firstPage.data[0].height).toBeGreaterThanOrEqual(100)

    const secondPage = await controller.list({ size: 40, next: firstPage.page?.next })

    expect(secondPage.data.length).toStrictEqual(40)
    expect(secondPage.data[0].height).toStrictEqual(firstPage.data[39].height - 1)

    const lastPage = await controller.list({ size: 40, next: secondPage.page?.next })

    expect(lastPage.data[0].height).toStrictEqual(secondPage.data[39].height - 1)
    expect(lastPage.page?.next).toBeUndefined()
  })

  it('should return all the blocks if the size is out of range', async () => {
    const paginatedBlocks = await controller.list({ size: 100000, next: '100' })

    expect(paginatedBlocks.data.length).toStrictEqual(100)
    expect(paginatedBlocks.data[0].height).toBeGreaterThanOrEqual(99)
  })

  it('list would return the latest set if next is outside of range', async () => {
    const paginatedBlocks = await controller.list({ size: 30, next: '100000' })

    expect(paginatedBlocks.data.length).toStrictEqual(30)
    expect(paginatedBlocks.data[0].height).toBeGreaterThanOrEqual(100)
  })

  it('list would return the latest set if next is 0', async () => {
    const paginatedBlocks = await controller.list({ size: 30, next: '0' })

    expect(paginatedBlocks.data.length).toStrictEqual(0)
    expect(paginatedBlocks?.page).toBeUndefined()
  })
})

describe('getVins', () => {
  it('should return list of vins', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const transactions = await controller.getTransactions(blockHash, { size: 1 })

    expect(transactions.data.length).toStrictEqual(1)

    const vins = await controller.getVins(blockHash, transactions.data[0].id, { size: 30 })

    expect(vins.data.length).toBeGreaterThanOrEqual(1)
  })

  it('should return list of vins when next is out of range', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const transactions = await controller.getTransactions(blockHash, { size: 1 })

    expect(transactions.data.length).toStrictEqual(1)

    const vins = await controller.getVins(blockHash, transactions.data[0].id, { size: 30, next: '100' })

    expect(vins.data.length).toBeGreaterThanOrEqual(1)
  })

  it('should return empty page if blockhash is not valid', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const transactions = await controller.getTransactions(blockHash, { size: 1 })

    expect(transactions.data.length).toStrictEqual(1)

    const vins = await controller.getVins('0e8ffadf068a4dad100cc6d6c31cd6610a754b01d6e88361955d2070282354b1', transactions.data[0].id, { size: 30 })

    expect(vins.data.length).toStrictEqual(0)
    expect(vins.page).toBeUndefined()
  })

  it('should return empty page if txid is not valid', async () => {
    const blockHash = await container.call('getblockhash', [100])

    const vins = await controller.getVins(blockHash, '9d87a6b6b77323b6dab9d8971fff0bc7a6c341639ebae39891024f4800528532', { size: 30 })

    expect(vins.data.length).toStrictEqual(0)
    expect(vins.page).toBeUndefined()
  })

  it('should return empty page if transaction does not belong to the block', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const transactions = await controller.getTransactions(blockHash, { size: 1 })

    expect(transactions.data.length).toStrictEqual(1)

    const vins = await controller.getVins(await container.call('getblockhash', [99]), transactions.data[0].id, { size: 30 })

    expect(vins.data.length).toStrictEqual(0)
    expect(vins.page).toBeUndefined()
  })
})

describe('getVouts', () => {
  it('should return list of vouts', async () => {
    const blockHash = await container.call('getblockhash', [37])
    const transactions = await controller.getTransactions(blockHash, { size: 1 })

    expect(transactions.data.length).toStrictEqual(1)

    const vouts = await controller.getVouts(blockHash, transactions.data[0].id, { size: 30 })

    expect(vouts.data.length).toBeGreaterThanOrEqual(1)
  })

  it('should return list of vouts when next is out of range', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const transactions = await controller.getTransactions(blockHash, { size: 1 })

    expect(transactions.data.length).toStrictEqual(1)

    const vouts = await controller.getVouts(blockHash, transactions.data[0].id, { size: 30, next: '100' })

    expect(vouts.data.length).toBeGreaterThanOrEqual(1)
  })

  it('should return empty page if blockhash is not valid', async () => {
    const blockHash = await container.call('getblockhash', [37])
    const transactions = await controller.getTransactions(blockHash, { size: 1 })

    expect(transactions.data.length).toStrictEqual(1)

    const vouts = await controller.getVouts('0e8ffadf068a4dad100cc6d6c31cd6610a754b01d6e88361955d2070282354b1', transactions.data[0].id, { size: 30 })

    expect(vouts.data.length).toStrictEqual(0)
    expect(vouts.page).toBeUndefined()
  })

  it('should return empty page if txid is not valid', async () => {
    const blockHash = await container.call('getblockhash', [37])

    const vouts = await controller.getVouts(blockHash, '9d87a6b6b77323b6dab9d8971fff0bc7a6c341639ebae39891024f4800528532', { size: 30 })

    expect(vouts.data.length).toStrictEqual(0)
    expect(vouts.page).toBeUndefined()
  })

  it('should return empty page if transaction does not belong to the block', async () => {
    const blockHash = await container.call('getblockhash', [37])
    const transactions = await controller.getTransactions(blockHash, { size: 1 })

    expect(transactions.data.length).toStrictEqual(1)

    const vouts = await controller.getVouts(await container.call('getblockhash', [99]), transactions.data[0].id, { size: 30 })

    expect(vouts.data.length).toStrictEqual(0)
    expect(vouts.page).toBeUndefined()
  })
})

describe('parseHeight', () => {
  it('should return undefined for negative integer', () => {
    expect(parseHeight('-123')).toStrictEqual(undefined)
  })

  it('should return undefined for float', () => {
    expect(parseHeight('123.32')).toStrictEqual(undefined)
  })

  it('should return number for positive integers', () => {
    expect(parseHeight('123')).toStrictEqual(123)
  })

  it('should return undefined for empty string', () => {
    expect(parseHeight('')).toStrictEqual(undefined)
  })

  it('should return undefined for undefined', () => {
    expect(parseHeight(undefined)).toStrictEqual(undefined)
  })

  it('should return undefined for strings with characters', () => {
    expect(parseHeight('123a')).toStrictEqual(undefined)
  })
})

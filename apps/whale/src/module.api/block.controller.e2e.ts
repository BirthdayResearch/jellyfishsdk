import { BlockController, parseHeight } from '@src/module.api/block.controller'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: BlockController
let client: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForBlockHeight(101)

  app = await createTestingApp(container)

  await waitForIndexedHeight(app, 100)
  controller = app.get(BlockController)
  client = new JsonRpcClient(await container.getCachedRpcUrl())

  const address = await container.getNewAddress()
  for (let i = 0; i < 4; i += 1) {
    await container.call('sendtoaddress', [address, 0.1])
  }

  await container.generate(3)
  await waitForIndexedHeight(app, 103)
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

describe('getTransactions', () => {
  it('should get transactions from a block by hash', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const paginatedTransactions = await controller.getTransactions(blockHash, { size: 30 })

    expect(paginatedTransactions.data.length).toBeGreaterThanOrEqual(1)
    expect(paginatedTransactions.data[0].block.height).toStrictEqual(100)
  })

  it('getTransactions should not get transactions by height', async () => {
    const paginatedTransactions = await controller.getTransactions('0', { size: 30 })

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

  it('should list transactions in the right order', async () => {
    const blockHash = await container.call('getblockhash', [103])
    const paginatedTransactions = await controller.getTransactions(blockHash, { size: 30 })

    expect(paginatedTransactions.data.length).toBeGreaterThanOrEqual(4)
    expect(paginatedTransactions.data[0].block.height).toStrictEqual(103)

    const rpcBlock = await client.blockchain.getBlock(blockHash, 2)
    expect(paginatedTransactions.data[0].hash).toStrictEqual(rpcBlock.tx[0].hash)
    expect(paginatedTransactions.data[1].hash).toStrictEqual(rpcBlock.tx[1].hash)
    expect(paginatedTransactions.data[2].hash).toStrictEqual(rpcBlock.tx[2].hash)
    expect(paginatedTransactions.data[3].hash).toStrictEqual(rpcBlock.tx[3].hash)
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

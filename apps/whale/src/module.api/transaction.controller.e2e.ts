import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TransactionController } from '@src/module.api/transaction.controller'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { NotFoundException } from '@nestjs/common'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: TransactionController
let client: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  controller = app.get<TransactionController>(TransactionController)
  client = new JsonRpcClient(await container.getCachedRpcUrl())

  await waitForIndexedHeight(app, 100)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('get', () => {
  let txid: string

  async function setup (): Promise<void> {
    const address = await container.getNewAddress()
    const metadata = {
      symbol: 'ETH',
      name: 'ETH',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }

    txid = await container.call('createtoken', [metadata])

    await container.generate(1)

    const height = await container.call('getblockcount')

    await container.generate(1)

    await waitForIndexedHeight(app, height)
  }

  beforeAll(async () => {
    await setup()
  })

  it('should get a single transaction', async () => {
    const transaction = await controller.get(txid)
    expect(transaction).toStrictEqual({
      id: txid,
      order: expect.any(Number),
      block: {
        hash: expect.any(String),
        height: expect.any(Number),
        time: expect.any(Number),
        medianTime: expect.any(Number)
      },
      txid,
      hash: expect.any(String),
      version: expect.any(Number),
      size: expect.any(Number),
      vSize: expect.any(Number),
      weight: expect.any(Number),
      lockTime: expect.any(Number),
      vinCount: expect.any(Number),
      voutCount: expect.any(Number),
      totalVoutValue: expect.any(String)
    })
  })

  it('should fail due to non-existent transaction', async () => {
    expect.assertions(2)
    try {
      await controller.get('invalidtransactionid')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'transaction not found',
        error: 'Not Found'
      })
    }
  })
})

describe('getVins', () => {
  it('should return list of vin', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const block = await client.blockchain.getBlock(blockHash, 2)

    const txid = block.tx[0].txid
    const vin = await controller.getVins(txid, { size: 30 })

    expect(vin.data.length).toBeGreaterThanOrEqual(1)
  })

  it('should return list of vin when next is out of range', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const block = await client.blockchain.getBlock(blockHash, 2)

    const txid = block.tx[0].txid
    const vin = await controller.getVins(txid, { size: 30, next: '100' })

    expect(vin.data.length).toBeGreaterThanOrEqual(1)
  })

  it('should return empty page if txid is not valid', async () => {
    const vin = await controller.getVins('9d87a6b6b77323b6dab9d8971fff0bc7a6c341639ebae39891024f4800528532', { size: 30 })

    expect(vin.data.length).toStrictEqual(0)
    expect(vin.page).toBeUndefined()
  })
})

describe('getVouts', () => {
  it('should return list of vout', async () => {
    const blockHash = await container.call('getblockhash', [37])
    const block = await client.blockchain.getBlock(blockHash, 2)

    const txid = block.tx[0].txid
    const vout = await controller.getVouts(txid, { size: 30 })

    expect(vout.data.length).toBeGreaterThanOrEqual(1)
  })

  it.skip('should return list of vout when next is out of range', async () => {
    const blockHash = await container.call('getblockhash', [37])
    const block = await client.blockchain.getBlock(blockHash, 2)

    const txid = block.tx[0].txid
    const vout = await controller.getVouts(txid, { size: 30, next: '100' })

    expect(vout.data.length).toBeGreaterThanOrEqual(1)
  })

  it('should return empty page if txid is not valid', async () => {
    const vout = await controller.getVouts('9d87a6b6b77323b6dab9d8971fff0bc7a6c341639ebae39891024f4800528532', { size: 30 })

    expect(vout.data.length).toStrictEqual(0)
    expect(vout.page).toBeUndefined()
  })
})

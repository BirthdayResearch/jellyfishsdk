import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient, WhaleApiException } from '../../src'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient
let rpcClient: JsonRpcClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

  await container.waitForBlockHeight(101)
  await service.waitForIndexedHeight(101)

  rpcClient = new JsonRpcClient(await container.getCachedRpcUrl())
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

beforeEach(async () => {
  await container.waitForWalletBalanceGTE(15)
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

    await service.waitForIndexedHeight(height)
  }

  beforeAll(async () => {
    await setup()
  })

  it('should get a single transaction', async () => {
    const transaction = await client.transactions.get(txid)
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
      hash: txid,
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
      await client.transactions.get('invalidtransactionid')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'transaction not found',
        url: '/v0.0/regtest/transactions/invalidtransactionid'
      })
    }
  })
})

describe('getVins', () => {
  it('should return list of vins', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const block = await rpcClient.blockchain.getBlock(blockHash, 2)

    const txid = block.tx[0].txid
    const vins = await client.transactions.getVins(txid)

    expect(vins.length).toBeGreaterThanOrEqual(1)
  })

  it('should return list of vins when next is out of range', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const block = await rpcClient.blockchain.getBlock(blockHash, 2)

    const txid = block.tx[0].txid
    const vins = await client.transactions.getVins(txid, 30, '100')

    expect(vins.length).toBeGreaterThanOrEqual(1)
  })

  it('should return empty page if txid is not valid', async () => {
    const vins = await client.transactions.getVins('9d87a6b6b77323b6dab9d8971fff0bc7a6c341639ebae39891024f4800528532', 30)

    expect(vins.length).toStrictEqual(0)
    expect(vins.hasNext).toStrictEqual(false)
  })
})

describe('getVouts', () => {
  it('should return list of vouts', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const block = await rpcClient.blockchain.getBlock(blockHash, 2)

    const txid = block.tx[0].txid
    const vouts = await client.transactions.getVouts(txid)

    expect(vouts.length).toBeGreaterThanOrEqual(1)
  })

  it.skip('should return list of vouts when next is out of range', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const block = await rpcClient.blockchain.getBlock(blockHash, 2)

    const txid = block.tx[0].txid
    const vouts = await client.transactions.getVouts(txid, 30, '100')

    expect(vouts.length).toBeGreaterThanOrEqual(1)
  })

  it('should return empty page if txid is not valid', async () => {
    const vouts = await client.transactions.getVouts('9d87a6b6b77323b6dab9d8971fff0bc7a6c341639ebae39891024f4800528532', 30)

    expect(vouts.length).toStrictEqual(0)
    expect(vouts.hasNext).toStrictEqual(false)
  })
})

import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

  await container.waitForBlockHeight(101)
  await service.waitForIndexedHeight(101)
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

const ExpectedBlock = {
  id: expect.stringMatching(/[0-f]{64}/),
  hash: expect.stringMatching(/[0-f]{64}/),
  previousHash: expect.stringMatching(/[0-f]{64}/),
  height: expect.any(Number),
  version: expect.any(Number),
  time: expect.any(Number),
  medianTime: expect.any(Number),
  transactionCount: expect.any(Number),
  difficulty: expect.any(Number),
  masternode: expect.stringMatching(/[0-f]{64}/),
  minter: expect.stringMatching(/[a-zA-Z0-9]+/),
  minterBlockCount: expect.any(Number),
  stakeModifier: expect.stringMatching(/[0-f]{64}/),
  merkleroot: expect.stringMatching(/[0-f]{64}/),
  size: expect.any(Number),
  sizeStripped: expect.any(Number),
  weight: expect.any(Number),
  reward: expect.any(String)
}

describe('list', () => {
  it('should get paginated list of blocks', async () => {
    const first = await client.blocks.list(35)

    expect(first.length).toStrictEqual(35)
    expect(first[0]).toStrictEqual(ExpectedBlock)
    expect(first[0].height).toBeGreaterThanOrEqual(100 - 35)
    expect(first[34].height).toBeGreaterThanOrEqual(first[0].height - 35)

    const second = await client.paginate(first)
    expect(second.length).toStrictEqual(35)
    expect(second[0].height).toStrictEqual(first[34].height - 1)

    const last = await client.paginate(second)
    expect(last.hasNext).toStrictEqual(false)
  })

  it('should get paginated list of 100 even if request page size is  more than 100', async () => {
    const first = await client.blocks.list(150)

    expect(first.length).toStrictEqual(100)
    expect(first[0]).toStrictEqual(ExpectedBlock)
  })

  it('should get paginated list of blocks when next is out of range', async () => {
    const blocks = await client.blocks.list(15, '1000000')
    expect(blocks.length).toStrictEqual(15)

    expect(blocks[0]).toStrictEqual(ExpectedBlock)
    expect(blocks[0].height).toBeGreaterThanOrEqual(40)
  })

  it('should get paginated list of blocks when next is 0', async () => {
    const blocks = await client.blocks.list(15, '0')
    expect(blocks.length).toStrictEqual(0)
    expect(blocks.hasNext).toStrictEqual(false)
  })

  it('should fetch the whole list of blocks when size is out of range', async () => {
    const blocks = await client.blocks.list(60)
    expect(blocks.length).toBeGreaterThanOrEqual(40)

    expect(blocks[0]).toStrictEqual(ExpectedBlock)
    expect(blocks[0].height).toBeGreaterThanOrEqual(40)
  })
})

describe('get', () => {
  it('should get block through height', async () => {
    const block = await client.blocks.get('37')

    expect(block).toStrictEqual(ExpectedBlock)
    expect(block?.height).toStrictEqual(37)
  })

  it('should get block through hash', async () => {
    const blockHash = await container.call('getblockhash', [37])
    const block = await client.blocks.get(blockHash)
    expect(block).toStrictEqual(ExpectedBlock)
    expect(block?.height).toStrictEqual(37)
  })

  it('should get undefined through invalid hash', async () => {
    const block = await client.blocks.get('d78167c999ed24b999de6530d6b7d9d723096e49baf191bd2706ddb8eaf452ae')
    expect(block).toBeUndefined()
  })

  it('should get undefined through invalid height', async () => {
    const block = await client.blocks.get('1000000000')
    expect(block).toBeUndefined()
  })
})

describe('getTransactions', () => {
  const ExpectedTransaction = {
    id: expect.stringMatching(/[0-f]{64}/),
    order: expect.any(Number),
    block: {
      hash: expect.stringMatching(/[0-f]{64}/),
      height: expect.any(Number),
      time: expect.any(Number),
      medianTime: expect.any(Number)
    },
    txid: expect.stringMatching(/[0-f]{64}/),
    hash: expect.stringMatching(/[0-f]{64}/),
    version: expect.any(Number),
    size: expect.any(Number),
    vSize: expect.any(Number),
    weight: expect.any(Number),
    lockTime: expect.any(Number),
    vinCount: expect.any(Number),
    voutCount: expect.any(Number),
    totalVoutValue: expect.any(String)
  }

  it('should getTransactions through hash', async () => {
    const blockHash = await container.call('getblockhash', [37])
    const transactions = await client.blocks.getTransactions(blockHash)
    expect(transactions[0]).toStrictEqual(ExpectedTransaction)
    expect(transactions[0].block.height).toStrictEqual(37)
  })

  it('should not getTransactions with height', async () => {
    const transactions = await client.blocks.getTransactions('0')
    expect(transactions.length).toStrictEqual(0)
  })

  it('should getTransactions through invalid hash', async () => {
    const transactions = await client.blocks.getTransactions('b33320d63574690eb549ee4867c0119efdb69b396d3452bf9a09132eaa76b4a5')
    expect(transactions.length).toStrictEqual(0)
  })

  it('should getTransactions through invalid height', async () => {
    const transactions = await client.blocks.getTransactions('1000000000')
    expect(transactions.length).toStrictEqual(0)
  })
})

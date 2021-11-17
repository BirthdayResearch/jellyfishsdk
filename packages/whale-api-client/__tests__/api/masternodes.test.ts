import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient, WhaleApiException } from '../../src'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await service.start()

  await container.generate(1)
  const height: number = (await client.rpc.call('getblockcount', [], 'number'))
  await container.generate(1)
  await service.waitForIndexedHeight(height)
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('list', () => {
  it('should list masternodes', async () => {
    const data = await client.masternodes.list()
    expect(Object.keys(data[0]).length).toStrictEqual(8)
    expect(data.hasNext).toStrictEqual(false)
    expect(data.nextToken).toStrictEqual(undefined)

    expect(data[0]).toStrictEqual({
      id: 'e86c027861cc0af423313f4152a44a83296a388eb51bf1a6dde9bd75bed55fb4',
      sort: '00000000e86c027861cc0af423313f4152a44a83296a388eb51bf1a6dde9bd75bed55fb4',
      state: 'ENABLED',
      mintedBlocks: expect.any(Number),
      owner: { address: 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU' },
      operator: { address: 'mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy' },
      creation: { height: 0 },
      timelock: 0
    })
  })

  it('should list masternodes with pagination', async () => {
    const first = await client.masternodes.list(4)
    expect(first.length).toStrictEqual(4)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual(`00000000${first[3].id}`)

    const next = await client.paginate(first)
    expect(next.length).toStrictEqual(4)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual(`00000000${next[3].id}`)

    const last = await client.paginate(next)
    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toStrictEqual(undefined)
  })
})

describe('get', () => {
  it('should get masternode', async () => {
    // get a masternode from list
    const masternode = (await client.masternodes.list(1))[0]

    const data = await client.masternodes.get(masternode.id)
    expect(Object.keys(data).length).toStrictEqual(8)
    expect(data).toStrictEqual({
      id: masternode.id,
      sort: expect.any(String),
      state: masternode.state,
      mintedBlocks: expect.any(Number),
      owner: { address: masternode.owner.address },
      operator: { address: masternode.operator.address },
      creation: { height: masternode.creation.height },
      timelock: 0
    })
  })

  it('should fail due to non-existent masternode', async () => {
    expect.assertions(2)
    const id = '8d4d987dee688e400a0cdc899386f243250d3656d802231755ab4d28178c9816'
    try {
      await client.masternodes.get(id)
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find masternode',
        url: `/v0.0/regtest/masternodes/${id}`
      })
    }
  })
})

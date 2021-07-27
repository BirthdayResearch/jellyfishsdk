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
  await container.waitForReady()
  await service.start()
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
    expect(Object.keys(data[0]).length).toStrictEqual(7)
    expect(data.hasNext).toStrictEqual(false)
    expect(data.nextToken).toStrictEqual(undefined)

    expect(data[0]).toStrictEqual({
      id: '03280abd3d3ae8dc294c1a572cd7912c3c3e53044943eac62c2f6c4687c87f10',
      state: 'ENABLED',
      mintedBlocks: 0,
      owner: { address: 'bcrt1qyeuu9rvq8a67j86pzvh5897afdmdjpyankp4mu' },
      operator: { address: 'bcrt1qurwyhta75n2g75u2u5nds9p6w9v62y8wr40d2r' },
      creation: { height: 0 },
      resign: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      }
    })
  })

  it('should list masternodes with pagination', async () => {
    const first = await client.masternodes.list(4)
    expect(first.length).toStrictEqual(4)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual(first[3].id)

    const next = await client.paginate(first)
    expect(next.length).toStrictEqual(4)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual(next[3].id)

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
    expect(Object.keys(data).length).toStrictEqual(7)
    expect(data).toStrictEqual({
      id: masternode.id,
      state: masternode.state,
      mintedBlocks: masternode.mintedBlocks,
      owner: { address: masternode.owner.address },
      operator: { address: masternode.operator.address },
      creation: { height: masternode.creation.height },
      resign: {
        tx: masternode.resign.tx,
        height: masternode.resign.height
      }
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

  it('should fail and throw an error with malformed id', async () => {
    expect.assertions(2)
    try {
      await client.masternodes.get('sdh183')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 400,
        type: 'BadRequest',
        at: expect.any(Number),
        message: "RpcApiError: 'masternode id must be of length 64 (not 6, for 'sdh183')', code: -8, method: getmasternode",
        url: '/v0.0/regtest/masternodes/sdh183'
      })
    }
  })
})

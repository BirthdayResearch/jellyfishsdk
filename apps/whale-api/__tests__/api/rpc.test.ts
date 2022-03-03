import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { blockchain } from '@defichain/jellyfish-api-core'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'

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

it('should throw error for non whitelisted method', async () => {
  await expect(
    client.rpc.call('getbalance', [], 'number')
  ).rejects.toThrow('403 - Forbidden (/v0.0/regtest/rpc/getbalance): RPC method not whitelisted')
})

it('should throw error on invalid params', async () => {
  await expect(
    client.rpc.call('getblock', [{ block: 1 }], 'number')
  ).rejects.toThrow('400 - BadRequest (/v0.0/regtest/rpc/getblock): RpcApiError: \'JSON value is not a string as expected\', code: -1')
})

describe('whitelisted rpc methods', () => {
  it('should rpc.call(getblockchaininfo)', async () => {
    const info = await client.rpc.call<blockchain.BlockchainInfo>('getblockchaininfo', [], 'number')

    expect(info.chain).toStrictEqual('regtest')
    expect(typeof info.blocks).toStrictEqual('number')
  })

  it('should rpc.call(getblockcount)', async () => {
    const count = await client.rpc.call<number>('getblockcount', [], 'number')

    expect(typeof count).toStrictEqual('number')
  })

  it('should rpc.call(getblockhash)', async () => {
    await container.generate(1)

    const hash = await client.rpc.call<string>('getblockhash', [1], 'number')
    expect(hash.length).toStrictEqual(64)
  })

  it('should rpc.call(getblock)', async () => {
    await container.generate(1)

    const hash = await client.rpc.call<string>('getblockhash', [1], 'number')
    const block = await client.rpc.call<blockchain.Block<blockchain.Transaction>>('getblock', [hash], 'number')

    expect(block.hash.length).toStrictEqual(64)
    expect(Array.isArray(block.tx)).toStrictEqual(true)
  })
})

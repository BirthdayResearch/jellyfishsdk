import { blockchain } from '@defichain/jellyfish-api-core'
import { StubPlaygroundApiClient } from '../stub.client'
import { StubService } from '../stub.service'

const service = new StubService()
const client = new StubPlaygroundApiClient(service)

beforeAll(async () => {
  await service.start()
  await service.container.waitForWalletCoinbaseMaturity()
})

afterAll(async () => {
  await service.stop()
})

it('should throw error on invalid params', async () => {
  await expect(
    client.rpc.call('getblock', [{ block: 1 }], 'number')
  ).rejects.toThrow('400 - BadRequest (/v0/playground/rpc/getblock): RpcApiError: \'JSON value is not a string as expected\', code: -1, method: getblock')
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
    await service.container.generate(1)

    const hash = await client.rpc.call<string>('getblockhash', [1], 'number')
    expect(hash.length).toStrictEqual(64)
  })

  it('should rpc.call(getblock)', async () => {
    await service.container.generate(1)

    const hash = await client.rpc.call<string>('getblockhash', [1], 'number')
    const block = await client.rpc.call<blockchain.Block<blockchain.Transaction>>('getblock', [hash], 'number')

    expect(block.hash.length).toStrictEqual(64)
    expect(Array.isArray(block.tx)).toStrictEqual(true)
  })
})

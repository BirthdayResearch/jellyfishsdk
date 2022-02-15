import { PlaygroundRpcClient } from '../src'
import { StubService } from './stub.service'
import { StubPlaygroundApiClient } from './stub.client'

const service = new StubService()
const client = new PlaygroundRpcClient(new StubPlaygroundApiClient(service))

beforeAll(async () => {
  await service.start()
})

afterAll(async () => {
  await service.stop()
})

describe('whitelisted rpc methods', () => {
  it('should client.blockchain.getBlockchainInfo()', async () => {
    const info = await client.blockchain.getBlockchainInfo()

    expect(info.chain).toStrictEqual('regtest')
    expect(typeof info.blocks).toStrictEqual('number')
  })

  it('should client.blockchain.getBlockCount()', async () => {
    const count = await client.blockchain.getBlockCount()

    expect(typeof count).toStrictEqual('number')
  })

  it('should client.blockchain.getBlockHash(1)', async () => {
    await service.container.generate(1)

    const hash = await client.blockchain.getBlockHash(1)
    expect(hash.length).toStrictEqual(64)
  })

  it('should client.blockchain.getBlock(hash, 2)', async () => {
    await service.container.generate(1)

    const hash = await client.blockchain.getBlockHash(1)
    const block = await client.blockchain.getBlock(hash, 2)

    expect(block.hash.length).toStrictEqual(64)
    expect(Array.isArray(block.tx)).toStrictEqual(true)
  })

  it('should client.poolpair.listPoolPairs()', async () => {
    const poolPairs = await client.poolpair.listPoolPairs()
    expect(Object.keys(poolPairs).length > 0).toBeTruthy()
    for (const k in poolPairs) {
      const poolPair = poolPairs[k]
      expect(poolPair.rewardPct.gt(0)).toBeTruthy()
    }
  })
})

import { PlaygroundStubClient } from '../../../apps/playground-api/testing/PlaygroundStubClient'
import { PlaygroundStubServer } from '../../../apps/playground-api/testing/PlaygroundStubServer'
import { PlaygroundRpcClient } from '../src/PlaygroundRpcClient'
import { TestingGroup } from '@defichain/jellyfish-testing'

const tGroup = TestingGroup.create(1)
const server = new PlaygroundStubServer(tGroup.get(0).container)
const client = new PlaygroundRpcClient(new PlaygroundStubClient(server))

beforeAll(async () => {
  await tGroup.start()
  await server.start()
})

afterAll(async () => {
  try {
    await server.stop()
  } catch (err) {
    console.error(err)
  }
  try {
    await tGroup.stop()
  } catch (err) {
    console.error(err)
  }
})

describe('whitelisted rpc methods', () => {
  it.only('should client.blockchain.getBlockchainInfo()', async () => {
    const info = await client.blockchain.getBlockchainInfo()
    console.log('info: ', info)

    // expect(info.chain).toStrictEqual('regtest')
    // expect(typeof info.blocks).toStrictEqual('number')
  })

  it('should client.blockchain.getBlockCount()', async () => {
    const count = await client.blockchain.getBlockCount()
    console.log('count: ', count)

    // expect(typeof count).toStrictEqual('number')
  })

  // it('should client.blockchain.getBlockHash(1)', async () => {
  //   await tGroup.get(0).container.generate(1)

  //   const hash = await client.blockchain.getBlockHash(1)
  //   expect(hash.length).toStrictEqual(64)
  // })

  // it('should client.blockchain.getBlock(hash, 2)', async () => {
  //   await tGroup.get(0).container.generate(1)

  //   const hash = await client.blockchain.getBlockHash(1)
  //   const block = await client.blockchain.getBlock(hash, 2)

  //   expect(block.hash.length).toStrictEqual(64)
  //   expect(Array.isArray(block.tx)).toStrictEqual(true)
  // })

  it('should client.poolpair.listPoolPairs()', async () => {
    const poolPairs = await client.poolpair.listPoolPairs()
    console.log('poolPairs: ', poolPairs)
    // expect(Object.keys(poolPairs).length > 0).toBeTruthy()
    // for (const k in poolPairs) {
    //   const poolPair = poolPairs[k]
    //   expect(poolPair.rewardPct.gt(0)).toBeTruthy()
    // }
  })
})

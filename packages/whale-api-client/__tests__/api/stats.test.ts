import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'

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

  await createToken(container, 'A')
  await mintTokens(container, 'A')
  await createToken(container, 'B')
  await mintTokens(container, 'B')

  await createPoolPair(container, 'A', 'DFI')
  await addPoolLiquidity(container, {
    tokenA: 'A',
    amountA: 100,
    tokenB: 'DFI',
    amountB: 200,
    shareAddress: await getNewAddress(container)
  })
  await createPoolPair(container, 'B', 'DFI')
  await addPoolLiquidity(container, {
    tokenA: 'B',
    amountA: 50,
    tokenB: 'DFI',
    amountB: 200,
    shareAddress: await getNewAddress(container)
  })
  await createToken(container, 'USDT')
  await createPoolPair(container, 'USDT', 'DFI')
  await mintTokens(container, 'USDT')
  await addPoolLiquidity(container, {
    tokenA: 'USDT',
    amountA: 1000,
    tokenB: 'DFI',
    amountB: 431.51288,
    shareAddress: await getNewAddress(container)
  })
  const height = await container.getBlockCount()
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

describe('stats', () => {
  it('should get', async () => {
    const data = await client.stats.get()
    expect(data).toStrictEqual({
      count: { blocks: 117, prices: 0, tokens: 7 },
      burned: { address: 0, emission: 7014.88, fee: 3, total: 7017.88 },
      tvl: { dex: 3853.9423279032194, total: 3853.9423279032194 },
      price: { usdt: 2.31742792 }
    })
  })
})

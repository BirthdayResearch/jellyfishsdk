import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createToken, createPoolPair, addPoolLiquidity, mintTokens, utxosToAccount, removePoolLiquidity } from '../src'

const container = new MasterNodeRegTestContainer()

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
})

afterAll(async () => {
  await container.stop()
})

describe('createPoolPair', () => {
  beforeAll(async () => {
    await createToken(container, 'DOG')
  })

  it('should createPoolPair', async () => {
    const before = await container.call('listpoolpairs')

    const txid = await createPoolPair(container, 'DFI', 'DOG')
    expect(typeof txid).toBe('string')

    const after: Record<string, any> = await container.call('listpoolpairs')
    expect(Object.keys(after).length).toBe(Object.keys(before).length + 1)

    for (const poolpair of Object.values(after)) {
      expect(poolpair.name).toBe('Default Defi token-DOG')
    }

    expect.assertions(3)
  })
})

describe('add/remove pool pair liquidity', () => {
  beforeAll(async () => {
    await createToken(container, 'LPT')
    await mintTokens(container, 'LPT', { mintAmount: 100 })
    await utxosToAccount(container, 100)
    await createPoolPair(container, 'DFI', 'LPT')
  })

  it('should add and remove liquidity', async () => {
    const address = await container.getNewAddress()
    const amount = await addPoolLiquidity(container, 'DFI', 50, 'LPT', 50, address)
    expect(amount.toFixed(8)).toBe('49.99999000')

    await removePoolLiquidity(container, address, 'DFI-LPT', amount)

    const shares: Record<string, any> = await container.call('listpoolshares')
    expect(Object.keys(shares).length).toBe(0)
  })
})

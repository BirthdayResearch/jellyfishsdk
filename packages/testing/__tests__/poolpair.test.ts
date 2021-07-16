import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createToken, createPoolPair, addPoolLiquidity, mintTokens, utxosToAccount, removePoolLiquidity, poolSwap, listPoolPairs } from '../src'
import waitForExpect from 'wait-for-expect'

const container = new MasterNodeRegTestContainer()

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
})

afterAll(async () => {
  await container.stop()
})

describe('listPoolPairs', () => {
  async function setup (): Promise<void> {
    await createToken(container, 'BAT')
    await mintTokens(container, 'BAT')
    await createPoolPair(container, 'DFI', 'BAT')

    await createToken(container, 'CAT')
    await mintTokens(container, 'CAT')
    await createPoolPair(container, 'DFI', 'CAT')
  }

  it('should listPoolPairs', async () => {
    const before = await listPoolPairs(container)
    expect(Object.keys(before).length).toStrictEqual(0)

    await setup()

    const after = await listPoolPairs(container)
    expect(Object.keys(after).length).toStrictEqual(2)
    const data = Object.values(after)
    expect(data[0].symbol).toStrictEqual('DFI-BAT')
    expect(data[1].symbol).toStrictEqual('DFI-CAT')
  })
})

describe('createPoolPair', () => {
  beforeAll(async () => {
    await createToken(container, 'DOG')
  })

  it('should createPoolPair', async () => {
    await createPoolPair(container, 'DFI', 'DOG')

    const poolPair = await container.call('getpoolpair', ['DFI-DOG'])
    const data: any = Object.values(poolPair)[0]
    expect(data.symbol).toStrictEqual('DFI-DOG')
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
    const amount = await addPoolLiquidity(container, {
      tokenA: 'DFI',
      amountA: 50,
      tokenB: 'LPT',
      amountB: 50,
      shareAddress: address
    })
    expect(amount.toFixed(8)).toStrictEqual('49.99999000')

    await removePoolLiquidity(container, {
      address: address,
      amountLP: amount,
      tokenLP: 'DFI-LPT'
    })

    await waitForExpect(async () => {
      const shares: Record<string, any> = await container.call('listpoolshares')
      expect(Object.keys(shares).length).toStrictEqual(0)
    })
  })
})

describe('poolSwap', () => {
  beforeAll(async () => {
    await createToken(container, 'ANT')
    await mintTokens(container, 'ANT')
    await createPoolPair(container, 'DFI', 'ANT')

    const shareAddress = await container.call('getnewaddress')
    await addPoolLiquidity(container, { amountA: 10, amountB: 200, tokenA: 'DFI', tokenB: 'ANT', shareAddress })
  })

  it('should poolSwap', async () => {
    const poolPairBefore = await container.call('getpoolpair', ['DFI-ANT'])
    const dataBefore: any = Object.values(poolPairBefore)[0]
    expect(dataBefore.reserveA).toStrictEqual(10)
    expect(dataBefore.reserveB).toStrictEqual(200)

    const dfiAddress = await container.call('getnewaddress')
    await container.call('utxostoaccount', [{ [dfiAddress]: '100@0' }])
    await container.generate(1)

    const metadata = {
      from: dfiAddress,
      tokenFrom: 'DFI',
      amountFrom: 4,
      to: await container.call('getnewaddress'),
      tokenTo: 'ANT'
    }
    await poolSwap(container, metadata)

    const poolPairAfter = await container.call('getpoolpair', ['DFI-ANT'])
    const dataAfter: any = Object.values(poolPairAfter)[0]
    expect(dataAfter.reserveA).toStrictEqual(14)
    expect(dataAfter.reserveB).toStrictEqual(142.85714285)
  })
})

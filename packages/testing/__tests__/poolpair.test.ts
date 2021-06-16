import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createToken, createPoolPair, addPoolLiquidity, mintTokens, utxosToAccount, removePoolLiquidity, poolSwap } from '../src'
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

describe('createPoolPair', () => {
  beforeAll(async () => {
    await createToken(container, 'DOG')
  })

  it('should createPoolPair', async () => {
    const before = await container.call('listpoolpairs')

    const txid = await createPoolPair(container, 'DFI', 'DOG')
    expect(typeof txid).toStrictEqual('string')

    const after: Record<string, any> = await container.call('listpoolpairs')
    expect(Object.keys(after).length).toStrictEqual(Object.keys(before).length + 1)

    for (const poolpair of Object.values(after)) {
      expect(poolpair.name).toStrictEqual('Default Defi token-DOG')
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

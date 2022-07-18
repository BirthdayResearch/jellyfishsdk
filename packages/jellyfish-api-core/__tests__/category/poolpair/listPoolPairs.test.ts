import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Poolpair', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await container.stop()
  })

  async function setup (): Promise<void> {
    const colAddr = await testing.address('col')
    const catAddr = await testing.address('CAT')
    const dfiAddr = await testing.address('DFI')
    const destAddr = await testing.address('DEST')

    await testing.token.dfi({ address: colAddr, amount: 5000 })
    await testing.generate(1)

    // token set up
    await testing.token.create({ symbol: 'CAT', collateralAddress: colAddr })
    await testing.generate(1)
    await testing.token.mint({ symbol: 'CAT', amount: 900 })
    await testing.generate(1)

    await testing.token.create({ symbol: 'DOG', collateralAddress: colAddr })
    await testing.generate(1)
    await testing.token.mint({ symbol: 'DOG', amount: 900 })
    await testing.generate(1)

    await testing.token.create({ symbol: 'FOX', collateralAddress: colAddr })
    await testing.generate(1)
    await testing.token.mint({ symbol: 'FOX', amount: 900 })
    await testing.generate(1)

    // pool pair set up
    await testing.poolpair.create({ tokenA: 'CAT', tokenB: 'DFI', commission: 0.1 })
    await testing.generate(1)
    await testing.poolpair.create({ tokenA: 'DOG', tokenB: 'DFI', commission: 0.3 })
    await testing.generate(1)
    await testing.poolpair.create({ tokenA: 'FOX', tokenB: 'DFI', status: false })
    await testing.generate(1)

    // add liq
    await testing.poolpair.add({
      a: { symbol: 'CAT', amount: 300 },
      b: { symbol: 'DFI', amount: 300 }
    })
    await testing.generate(1)

    // dex fee set up
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/poolpairs/4/token_a_fee_pct': '0.05',
        'v0/poolpairs/4/token_b_fee_pct': '0.08'
      }
    })
    await testing.generate(1)

    // pool swap set up
    await testing.token.dfi({ amount: 700, address: dfiAddr })
    await testing.generate(1)
    await testing.rpc.account.accountToAccount(colAddr, { [catAddr]: '200@CAT' })
    await testing.generate(1)

    const before = await testing.poolpair.get('CAT-DFI')
    // CAT-DFI pair should contain dex fee info after setgov
    // 'v0/poolpairs/4/token_a_fee_pct': '0.05',
    expect(before.dexFeePctTokenA).toStrictEqual(new BigNumber(0.05))
    expect(before.dexFeeInPctTokenA).toStrictEqual(new BigNumber(0.05))
    expect(before.dexFeeOutPctTokenA).toStrictEqual(new BigNumber(0.05))

    // 'v0/poolpairs/4/token_b_fee_pct': '0.08'
    expect(before.dexFeePctTokenB).toStrictEqual(new BigNumber(0.08))
    expect(before.dexFeeInPctTokenB).toStrictEqual(new BigNumber(0.08))
    expect(before.dexFeeOutPctTokenB).toStrictEqual(new BigNumber(0.08))

    // do dex fee assertion by 'swap'
    const swapAmt = new BigNumber(200)
    const commission = swapAmt.times(0.1) // CAT-DFI commission is 0.1
    let amountA = swapAmt.minus(commission)
    const dexInFee = amountA.times(0.05).toFixed(8, BigNumber.ROUND_DOWN) // 'v0/poolpairs/4/token_a_fee_pct': '0.05',
    amountA = amountA.minus(dexInFee)

    await testing.poolpair.swap({
      from: catAddr,
      tokenFrom: 'CAT',
      amountFrom: swapAmt.toNumber(),
      to: destAddr,
      tokenTo: 'DFI'
    })
    await testing.generate(1)

    const after = await testing.poolpair.get('CAT-DFI')
    expect(amountA).toStrictEqual(after.reserveA.minus(before.reserveB))

    const amountB = before.reserveB.minus(after.reserveB)
    const dexOutFee = amountB.times(0.08).toFixed(8, BigNumber.ROUND_DOWN) // 'v0/poolpairs/4/token_b_fee_pct': '0.08'
    const swapped = (await testing.rpc.account.getAccount(destAddr))[0].split('@')[0]
    expect(swapped).toStrictEqual(amountB.minus(dexOutFee).toString())

    const burn = await testing.container.call('getburninfo')
    expect(burn.dexfeetokens).toStrictEqual([`${dexOutFee}@DFI`, `${dexInFee}@CAT`])
  }

  it('should listPoolPairs', async () => {
    let assertions = 0
    const poolpairs = await client.poolpair.listPoolPairs()

    for (const k in poolpairs) {
      const poolpair = poolpairs[k]

      if (poolpair.symbol === 'CAT-DFI') {
        expect(poolpair.name).toStrictEqual('CAT-Default Defi token')
        expect(poolpair.status).toStrictEqual(true)
        expect(poolpair.commission.toString()).toStrictEqual(new BigNumber(0.1).toString())
        assertions += 1
      }

      if (poolpair.symbol === 'DOG-DFI') {
        expect(poolpair.name).toStrictEqual('DOG-Default Defi token')
        expect(poolpair.status).toStrictEqual(true)
        expect(poolpair.commission.toString()).toStrictEqual(new BigNumber(0.3).toString())
        assertions += 1
      }

      if (poolpair.symbol === 'FOX-DFI') {
        expect(poolpair.name).toStrictEqual('FOX-Default Defi token')
        expect(poolpair.status).toStrictEqual(false)
        expect(poolpair.commission.toString()).toStrictEqual(new BigNumber(0).toString())
        assertions += 1
      }

      expect(poolpair.totalLiquidity instanceof BigNumber).toStrictEqual(true)
      expect(typeof poolpair.ownerAddress).toStrictEqual('string')
      expect(typeof poolpair.idTokenA).toStrictEqual('string')
      expect(typeof poolpair.idTokenB).toStrictEqual('string')
      expect(poolpair.reserveA instanceof BigNumber).toStrictEqual(true)
      expect(poolpair.reserveB instanceof BigNumber).toStrictEqual(true)

      if (poolpair['reserveA/reserveB'] instanceof BigNumber && poolpair['reserveB/reserveA'] instanceof BigNumber) {
        expect(poolpair.tradeEnabled).toStrictEqual(true)
      } else {
        expect(poolpair['reserveA/reserveB']).toStrictEqual('0')
        expect(poolpair['reserveB/reserveA']).toStrictEqual('0')
        expect(poolpair.tradeEnabled).toStrictEqual(false)
      }

      expect(poolpair.blockCommissionA instanceof BigNumber).toStrictEqual(true)
      expect(poolpair.blockCommissionB instanceof BigNumber).toStrictEqual(true)
      expect(poolpair.rewardPct instanceof BigNumber).toStrictEqual(true)
      expect(poolpair.rewardLoanPct instanceof BigNumber).toStrictEqual(true)
      expect(typeof poolpair.creationTx).toStrictEqual('string')
      expect(poolpair.creationHeight instanceof BigNumber).toStrictEqual(true)
    }

    expect(assertions).toStrictEqual(3)
  })

  it('should listPoolPairs with pagination and return an empty object as out of range', async () => {
    const pagination = {
      start: 300,
      including_start: true,
      limit: 100
    }
    const poolpairs = await client.poolpair.listPoolPairs(pagination)

    expect(Object.keys(poolpairs).length).toStrictEqual(0)
  })

  it('should listPoolPairs with pagination limit', async () => {
    const pagination = {
      start: 0,
      including_start: true,
      limit: 2
    }
    const poolpairs = await client.poolpair.listPoolPairs(pagination)

    expect(Object.keys(poolpairs).length).toStrictEqual(2)
  })

  it('should listPoolPairs with verbose false', async () => {
    const pagination = {
      start: 0,
      including_start: true,
      limit: 100
    }
    const poolpairs = await client.poolpair.listPoolPairs(pagination, false)

    for (const k in poolpairs) {
      const poolpair = poolpairs[k]

      expect(typeof poolpair.symbol).toStrictEqual('string')
      expect(typeof poolpair.name).toStrictEqual('string')
      expect(typeof poolpair.status).toStrictEqual('boolean')
      expect(typeof poolpair.idTokenA).toStrictEqual('string')
      expect(typeof poolpair.idTokenB).toStrictEqual('string')
    }
  })
})

import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)
let aliceColAddr: string
let bobVaultId: string
let bobColAddr: string

async function setup (): Promise<void> {
  // token setup
  aliceColAddr = await alice.generateAddress()
  await alice.token.dfi({ address: aliceColAddr, amount: 30000 })
  await alice.generate(1)
  await alice.token.create({ symbol: 'BTC', collateralAddress: aliceColAddr })
  await alice.generate(1)
  await alice.token.mint({ symbol: 'BTC', amount: 30000 })
  await alice.generate(1)

  // oracle setup
  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'BTC', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' }
  ]
  const oracleId = await alice.rpc.oracle.appointOracle(await alice.generateAddress(), priceFeeds, { weightage: 1 })
  await alice.generate(1)
  const timestamp = Math.floor(new Date().getTime() / 1000)
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }] })
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
  await alice.generate(1)

  // collateral token
  await alice.rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })
  await alice.generate(1)

  await alice.rpc.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'BTC/USD'
  })
  await alice.generate(1)

  // loan token
  await alice.rpc.loan.setLoanToken({
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await alice.generate(1)

  await alice.token.mint({ symbol: 'TSLA', amount: 30000 })
  await alice.generate(1)

  await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['10000@TSLA'] })
  await alice.generate(1)

  // loan scheme set up
  await alice.rpc.loan.createLoanScheme({
    minColRatio: 150,
    interestRate: new BigNumber(3),
    id: 'scheme'
  })
  await alice.generate(1)
  await tGroup.waitForSync()

  bobColAddr = await bob.generateAddress()
  await bob.token.dfi({ address: bobColAddr, amount: 20000 })
  await bob.generate(1)
  await tGroup.waitForSync()

  await alice.rpc.account.accountToAccount(aliceColAddr, { [bobColAddr]: '1@BTC' })
  await alice.generate(1)
  await tGroup.waitForSync()

  const bobVaultAddr = await bob.generateAddress()
  bobVaultId = await bob.rpc.loan.createVault({
    ownerAddress: bobVaultAddr,
    loanSchemeId: 'scheme'
  })
  await bob.generate(1)

  await bob.rpc.loan.depositToVault({
    vaultId: bobVaultId, from: bobColAddr, amount: '10000@DFI'
  })
  await bob.generate(1)

  await bob.rpc.loan.depositToVault({
    vaultId: bobVaultId, from: bobColAddr, amount: '1@BTC'
  })
  await bob.generate(1)

  const bobLoanAddr = await bob.generateAddress()
  await bob.rpc.loan.takeLoan({
    vaultId: bobVaultId,
    amounts: '1000@TSLA',
    to: bobLoanAddr
  })
  await bob.generate(1) // interest * 1 => 1000.00057077@TSLA

  const bobLoanAcc = await bob.container.call('getaccount', [bobLoanAddr])
  expect(bobLoanAcc).toStrictEqual(['1000.00000000@TSLA'])

  // create DFI-TSLA
  await bob.poolpair.create({
    tokenA: 'DFI',
    tokenB: 'TSLA',
    ownerAddress: aliceColAddr
  })
  await bob.generate(1) // interest * 2 => 1000.00114154@TSLA

  // add DFI-TSLA
  await bob.poolpair.add({
    a: { symbol: 'DFI', amount: 500 },
    b: { symbol: 'TSLA', amount: 1000 }
  })
  await bob.generate(1) // interest * 3 => 1000.00171231@TSLA

  await bob.poolpair.swap({
    from: bobColAddr,
    tokenFrom: 'DFI',
    amountFrom: 600,
    to: bobColAddr,
    tokenTo: 'TSLA'
  })
  await bob.generate(1) // interest * 4 => 1000.00228308@TSLA
  await tGroup.waitForSync()

  // increase TSLA price
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '15@TSLA', currency: 'USD' }] })
  await alice.generate(1) // interest * 5 => 1000.00285385@TSLA

  // check vault status before liquidated
  const vaultBefore = await bob.container.call('getvault', [bobVaultId])
  expect(vaultBefore.isUnderLiquidation).toStrictEqual(false)
  expect(vaultBefore.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@BTC'])
  expect(vaultBefore.loanAmounts).toStrictEqual(['1000.00285385@TSLA'])
  expect(vaultBefore.interestAmounts).toStrictEqual(['0.00285385@TSLA'])
  expect(vaultBefore.collateralValue).toStrictEqual(20000)
  expect(vaultBefore.loanValue).toStrictEqual(2000.0057077)
  expect(vaultBefore.interestValue).toStrictEqual(0.0057077)
  expect(vaultBefore.currentRatio).toStrictEqual('1000%')
  expect(vaultBefore.invalidPrice).toStrictEqual(false)

  // *6 => 1000.00342462@TSLA
  // *7 => 1000.00399539@TSLA
  // *8 => 1000.00456616@TSLA
  {
    await alice.generate(4) // *9 => 1000.00513693@TSLA
    const vault = await bob.container.call('getvault', [bobVaultId])
    expect(vault.isUnderLiquidation).toStrictEqual(false)
    expect(vault.invalidPrice).toStrictEqual(true)
  }

  const auctionsBefore = await alice.container.call('listauctions')
  expect(auctionsBefore.length).toStrictEqual(0)

  // *10 => 1000.0057077@TSLA
  // *11 => 1000.00627847@TSLA
  // *12 => 1000.00684924@TSLA
  // *13 => 1000.00742001@TSLA
  // *14 => 1000.00799078@TSLA
  await alice.generate(6)

  // vault is liquidated now
  const vaultAfter = await bob.container.call('getvault', [bobVaultId])
  expect(vaultAfter.isUnderLiquidation).toStrictEqual(true)
  expect(vaultAfter.collateralAmounts).toStrictEqual(undefined)
  expect(vaultAfter.loanAmounts).toStrictEqual(undefined)
  expect(vaultAfter.collateralValue).toStrictEqual(undefined)
  expect(vaultAfter.loanValue).toStrictEqual(undefined)
  expect(vaultAfter.invalidPrice).toStrictEqual(false)
  expect(vaultAfter.batches).toStrictEqual([
    { index: 0, collaterals: ['5000.00000000@DFI', '0.50000000@BTC'], loan: '500.00399539@TSLA' }, // refer to ln: 171, the last interest generated loanAmt divided by 2
    { index: 1, collaterals: ['5000.00000000@DFI', '0.50000000@BTC'], loan: '500.00399539@TSLA' }
  ])

  const auctionsAfter = await bob.container.call('listauctions')
  expect(auctionsAfter.length > 0).toStrictEqual(true)
  expect(auctionsAfter[0].vaultId).toStrictEqual(bobVaultId)
  expect(auctionsAfter[0].batchCount).toStrictEqual(2)
  expect(auctionsAfter[0].liquidationHeight).toStrictEqual(168)
  expect(auctionsAfter[0].liquidationPenalty).toStrictEqual(5)
  expect(auctionsAfter[0].batches[0].collaterals).toStrictEqual(['5000.00000000@DFI', '0.50000000@BTC'])
  expect(auctionsAfter[0].batches[0].loan).toStrictEqual('500.00399539@TSLA')

  await tGroup.waitForSync()
}

beforeEach(async () => {
  await tGroup.start()
  await alice.container.waitForWalletCoinbaseMaturity()
  await setup()
})

afterEach(async () => {
  await tGroup.stop()
})

describe('auctionBid success', () => {
  it('should auctionBid', async () => {
    const bobColAccBefore = await bob.rpc.account.getAccount(bobColAddr)
    expect(bobColAccBefore).toStrictEqual(['8900.00000000@DFI', '545.45454546@TSLA'])

    const bobTSLAAccBefore = bobColAccBefore.length > 0
      ? bobColAccBefore.find((amt: string) => amt.split('@')[1] === 'TSLA')
      : undefined
    const bobTSLAAmtBefore = bobTSLAAccBefore !== undefined ? Number(bobTSLAAccBefore.split('@')[0]) : 0

    const txid = await bob.rpc.loan.auctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '526@TSLA' // (500.00399539 * 5%) + 500 = 525.00419516, min first bid is 525.00419516
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.container.generate(1)
    await tGroup.waitForSync()

    const bobColAccAfter = await bob.rpc.account.getAccount(bobColAddr)
    expect(bobColAccAfter).toStrictEqual(['8900.00000000@DFI', '19.45454546@TSLA'])

    const bobTSLAAccAfter = bobColAccAfter.length > 0
      ? bobColAccAfter.find((amt: string) => amt.split('@')[1] === 'TSLA')
      : undefined
    const bobTSLAAmtAfter = bobTSLAAccAfter !== undefined ? Number(bobTSLAAccAfter.split('@')[0]) : 0

    expect(bobTSLAAmtBefore - bobTSLAAmtAfter).toStrictEqual(526) // 545.45454546 - 19.45454546 = 526

    const aliceColAccBefore = await alice.rpc.account.getAccount(aliceColAddr)
    expect(aliceColAccBefore).toStrictEqual(['30000.00000000@DFI', '29999.00000000@BTC', '10000.00000000@TSLA'])

    // test second round auctionBid
    await alice.rpc.loan.auctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: aliceColAddr,
      amount: '535@TSLA' // (526 * 1%) + 525 = 531.26
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    // end the auction and alice win the bid
    await bob.generate(36)

    const auctionsAfter = await bob.container.call('listauctions')
    expect(auctionsAfter).toStrictEqual([
      {
        vaultId: bobVaultId,
        batchCount: 1,
        liquidationHeight: 205,
        liquidationPenalty: 5,
        batches: [
          {
            index: 0,
            collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
            loan: '509.99980024@TSLA' // 535 / 1.05, https://github.com/DeFiCh/pinkpaper/tree/main/loan#collateral-auction
          }
        ]
      }
    ])
    /**
     * The pattern is tested by several last bid amount
     *
     * | last bid     | loan         | recovered    | last bid vs recovered |
     * |--------------|--------------|--------------|-----------------------|
     * | 525.00419516 | 500.00399539 | 500.00399539 | 1.05                  |
     * | 530          | 500.00399539 | 504.9998002  | 1.049505366           |
     * | 535          | 500.00399539 | 509.9998002  | 1.049020019           |
     * | 550          | 500.00399539 | 524.9998002  | 1.047619446           |
     * | 580          | 500.00399539 | 554.9998002  | 1.045045421           |
     * | 600          | 500.00399539 | 574.9998002  | 1.043478623           |
     */

    const bobColAccEndBid = await bob.rpc.account.getAccount(bobColAddr)
    // compare to bobColAccAfter ['8900.00000000@DFI', '20.45454546@TSLA']
    // bob claims back his funds
    expect(bobColAccEndBid).toStrictEqual(['8900.00000000@DFI', '545.45454546@TSLA'])

    const aliceColAccEndBid = await alice.rpc.account.getAccount(aliceColAddr)
    expect(aliceColAccEndBid).toStrictEqual(['35000.00000000@DFI', '29999.50000000@BTC', '9465.00000000@TSLA'])

    // ensure interest is freeze in auction
    await alice.generate(10)
    const auctionsAfter1 = await bob.container.call('listauctions')
    expect(auctionsAfter).toStrictEqual(auctionsAfter1)
  })

  it('should auctionBid with utxos', async () => {
    const bobColAccBefore = await bob.rpc.account.getAccount(bobColAddr)
    const bobTSLAAccBefore = bobColAccBefore.length > 0
      ? bobColAccBefore.find((amt: string) => amt.split('@')[1] === 'TSLA')
      : undefined
    const bobBeforeTSLAAmt = bobTSLAAccBefore !== undefined ? Number(bobTSLAAccBefore.split('@')[0]) : 0

    const utxo = await alice.container.fundAddress(bobColAddr, 50)

    const txid = await bob.rpc.loan.auctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '535@TSLA' // (525 * 1%) + 525 = 530.25
    }, [utxo])
    expect(typeof txid).toStrictEqual('string')
    await bob.container.generate(1)
    await tGroup.waitForSync()

    const bobColAccAfter = await bob.rpc.account.getAccount(bobColAddr)
    const bobTSLAAccAfter = bobColAccAfter.length > 0
      ? bobColAccAfter.find((amt: string) => amt.split('@')[1] === 'TSLA')
      : undefined
    const bobAfterTSLAAmt = bobTSLAAccAfter !== undefined ? Number(bobTSLAAccAfter.split('@')[0]) : 0
    expect(bobBeforeTSLAAmt - bobAfterTSLAAmt).toStrictEqual(535)

    const rawtx = await bob.container.call('getrawtransaction', [txid, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should auctionBid on all batches', async () => {
    // test bob bids on first index
    {
      const bobColAccBefore = await bob.rpc.account.getAccount(bobColAddr)
      expect(bobColAccBefore).toStrictEqual(['8900.00000000@DFI', '545.45454546@TSLA'])

      const txid = await bob.rpc.loan.auctionBid({
        vaultId: bobVaultId,
        index: 0,
        from: bobColAddr,
        amount: '526@TSLA' // (500.00399539 * 5%) + 500 = 525.00419516, min first bid is 525.00419516
      })
      expect(typeof txid).toStrictEqual('string')
      await bob.container.generate(1)
      await tGroup.waitForSync()

      const bobColAccAfter = await bob.rpc.account.getAccount(bobColAddr)
      expect(bobColAccAfter).toStrictEqual(['8900.00000000@DFI', '19.45454546@TSLA'])

      const auctions = await bob.container.call('listauctions')
      expect(auctions[0]).toStrictEqual({
        vaultId: bobVaultId,
        liquidationHeight: 168,
        batchCount: 2,
        liquidationPenalty: 5,
        batches: [
          {
            index: 0,
            collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
            loan: '500.00399539@TSLA',
            highestBid: '526.00000000@TSLA'
          },
          {
            index: 1,
            collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
            loan: '500.00399539@TSLA'
          }
        ]
      })
    }

    // test alice bids on second index
    {
      const aliceColAccBefore = await alice.rpc.account.getAccount(aliceColAddr)
      expect(aliceColAccBefore).toStrictEqual(['30000.00000000@DFI', '29999.00000000@BTC', '10000.00000000@TSLA'])

      const txid1 = await alice.rpc.loan.auctionBid({
        vaultId: bobVaultId,
        index: 1,
        from: aliceColAddr,
        amount: '600@TSLA' // (500.00399539 * 5%) + 500 = 525.00419516, min first bid is 525.00419516
      })
      expect(typeof txid1).toStrictEqual('string')
      await alice.container.generate(1)
      await tGroup.waitForSync()

      const aliceColAccAfter = await alice.rpc.account.getAccount(aliceColAddr)
      expect(aliceColAccAfter).toStrictEqual(['30000.00000000@DFI', '29999.00000000@BTC', '9400.00000000@TSLA'])

      const auctions = await alice.container.call('listauctions')
      expect(auctions[0]).toStrictEqual({
        vaultId: bobVaultId,
        liquidationHeight: 168,
        batchCount: 2,
        liquidationPenalty: 5,
        batches: [{
          index: 0,
          collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
          loan: '500.00399539@TSLA',
          highestBid: '526.00000000@TSLA'
        },
        {
          index: 1,
          collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
          loan: '500.00399539@TSLA',
          highestBid: '600.00000000@TSLA'
        }]
      })
    }

    // end the auction and alice win the bid
    await bob.generate(36)

    const auctions = await alice.container.call('listauctions')
    expect(auctions).toStrictEqual([]) // no more auctions

    const bobColAccEndBid = await bob.rpc.account.getAccount(bobColAddr)
    expect(bobColAccEndBid).toStrictEqual(['13900.00000000@DFI', '0.50000000@BTC', '19.45454546@TSLA'])

    const aliceColAccEndBid = await alice.rpc.account.getAccount(aliceColAddr)
    expect(aliceColAccEndBid).toStrictEqual(['35000.00000000@DFI', '29999.50000000@BTC', '9400.00000000@TSLA'])
  })
})

describe('auctionBid failed', () => {
  it('next bid is required 1% higher', async () => {
    await bob.rpc.loan.auctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '526@TSLA'
    })
    await bob.container.generate(1)
    await tGroup.waitForSync()

    const promise = bob.rpc.loan.auctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '530@TSLA' // (526 * 1%) + 526 = 531.26
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Bid override should be at least 1% higher than current one')
  })

  it('should not auctionBid with arbitrary utxos', async () => {
    const utxo = await alice.container.fundAddress(await alice.generateAddress(), 10)

    const promise = alice.rpc.loan.auctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '550@TSLA'
    }, [utxo])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('tx must have at least one input from token owner')
  })

  it('should not auctionBid on non-existent vault', async () => {
    const promise = bob.rpc.loan.auctionBid({
      vaultId: '0'.repeat(64),
      index: 0,
      from: bobColAddr,
      amount: '550@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
  })

  it('should not auctionBid on non-existent batches index', async () => {
    const promise = bob.rpc.loan.auctionBid({
      vaultId: bobVaultId,
      index: 99,
      from: bobColAddr,
      amount: '550@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`No batch to vault/index ${bobVaultId}/99`)
  })

  it('should not auctionBid as vault is not under liquidation', async () => {
    const addr = await alice.generateAddress()
    const bobVaultId = await alice.rpc.loan.createVault({
      ownerAddress: addr,
      loanSchemeId: 'scheme'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    const vault = await alice.container.call('getvault', [bobVaultId])
    expect(vault.isUnderLiquidation).toStrictEqual(false)

    const promise = bob.rpc.loan.auctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '100@DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot bid to vault which is not under liquidation')
  })

  it('should not auctionBid as bid token does not match auction one', async () => {
    const promise = bob.rpc.loan.auctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '10000@DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Bid token does not match auction one')
  })

  it('should not auctionBid as insufficient fund', async () => {
    const bobColAcc = await bob.rpc.account.getAccount(bobColAddr)
    const tslaAcc = bobColAcc.find((amt: string) => amt.split('@')[1] === 'TSLA')
    const tslaAmt = Number(tslaAcc?.split('@')[0])
    expect(Number(tslaAmt)).toBeLessThan(30000)

    const promise = bob.rpc.loan.auctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '30000@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`amount ${tslaAmt} is less than 30000.00000000`)
  })

  it('should not auctionBid as first bid should include liquidation penalty of 5%', async () => {
    const promise = bob.rpc.loan.auctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '500@TSLA' // (500 * 5%) + 500 = 525, should not less than 525
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('First bid should include liquidation penalty of 5%')
  })
})

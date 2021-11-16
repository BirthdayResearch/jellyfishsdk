import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RegTest, RegTestGenesisKeys } from '@defichain/jellyfish-network'
import { P2WPKH } from '@defichain/jellyfish-address'
import { DeFiDRpcError } from '@defichain/testcontainers'
import { Script } from '@defichain/jellyfish-transaction'

const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(RegTestGenesisKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)
let aliceColAddr: string
let aliceColScript: Script
let bobVaultId: string
let bobColAddr: string
let bobVaultAddr: string
let bobColScript: Script
let oracleId: string

let aProviders: MockProviders
let aBuilder: P2WPKHTransactionBuilder
let bProviders: MockProviders
let bBuilder: P2WPKHTransactionBuilder

async function setup (): Promise<void> {
  // token setup
  aliceColAddr = await aProviders.getAddress()
  await alice.token.dfi({ address: aliceColAddr, amount: 300000 })
  await alice.generate(1)
  await alice.token.create({ symbol: 'BTC', collateralAddress: aliceColAddr })
  await alice.generate(1)
  await alice.token.mint({ symbol: 'BTC', amount: 30000 })
  await alice.generate(1)

  // oracle setup
  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'BTC', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'AMZN', currency: 'USD' }
  ]
  oracleId = await alice.rpc.oracle.appointOracle(await alice.generateAddress(), priceFeeds, { weightage: 1 })
  await alice.generate(1)
  const timestamp = Math.floor(new Date().getTime() / 1000)
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }] })
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@AMZN', currency: 'USD' }] })
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
    minColRatio: 200,
    interestRate: new BigNumber(3),
    id: 'scheme'
  })
  await alice.generate(1)
  await tGroup.waitForSync()

  bobColAddr = await bProviders.getAddress()
  await bob.token.dfi({ address: bobColAddr, amount: 20000 })
  await bob.generate(1)
  await tGroup.waitForSync()

  await alice.rpc.account.accountToAccount(aliceColAddr, { [bobColAddr]: '1@BTC' })
  await alice.generate(1)
  await tGroup.waitForSync()

  bobVaultAddr = await bob.generateAddress()
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
  await bob.generate(1)

  const bobLoanAcc = await bob.container.call('getaccount', [bobLoanAddr])
  expect(bobLoanAcc).toStrictEqual(['1000.00000000@TSLA'])

  // create DFI-TSLA
  await bob.poolpair.create({
    tokenA: 'DFI',
    tokenB: 'TSLA',
    ownerAddress: aliceColAddr
  })
  await bob.generate(1)

  // add DFI-TSLA
  await bob.poolpair.add({
    a: { symbol: 'DFI', amount: 500 },
    b: { symbol: 'TSLA', amount: 1000 }
  })
  await bob.generate(1)

  await bob.poolpair.swap({
    from: bobColAddr,
    tokenFrom: 'DFI',
    amountFrom: 600,
    to: bobColAddr,
    tokenTo: 'TSLA'
  })
  await bob.generate(1)
  await tGroup.waitForSync()

  // increase TSLA price
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '15@TSLA', currency: 'USD' }] })
  await alice.generate(1) // interest * 5 => 1000.00285385@TSLA

  // check vault status before liquidated
  const vaultBefore = await bob.container.call('getvault', [bobVaultId])
  expect(vaultBefore.state).toStrictEqual('active')
  expect(vaultBefore.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@BTC'])
  expect(vaultBefore.loanAmounts).toStrictEqual(['1000.00285385@TSLA'])
  expect(vaultBefore.interestAmounts).toStrictEqual(['0.00285385@TSLA'])
  expect(vaultBefore.collateralValue).toStrictEqual(20000)
  expect(vaultBefore.loanValue).toStrictEqual(2000.0057077)
  expect(vaultBefore.interestValue).toStrictEqual(0.0057077)
  expect(vaultBefore.collateralRatio).toStrictEqual(1000)
  expect(vaultBefore.informativeRatio).toStrictEqual(999.99714615)

  // *6 => 1000.00342462@TSLA
  // *7 => 1000.00399539@TSLA
  // *8 => 1000.00456616@TSLA
  // *9 => 1000.00513693@TSLA
  {
    await bob.generate(5) // *10 => 1000.0057077@TSLA
    const vault = await bob.container.call('getvault', [bobVaultId])
    expect(vault.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@BTC'])
    expect(vault.loanAmounts).toStrictEqual(['1000.00570770@TSLA'])
    expect(vault.interestAmounts).toStrictEqual(['0.00570770@TSLA'])
    expect(vault.collateralValue).toStrictEqual(20000)
    expect(vault.loanValue).toStrictEqual(2000.0114154)
    expect(vault.interestValue).toStrictEqual(0.0114154)
    expect(vault.collateralRatio).toStrictEqual(1000)
    expect(vault.informativeRatio).toStrictEqual(999.99429233)
  }

  const auctionsBefore = await alice.container.call('listauctions')
  expect(auctionsBefore.length).toStrictEqual(0)

  // *11 => 1000.00627847@TSLA
  // *12 => 1000.00684924@TSLA
  // *13 => 1000.00742001@TSLA
  // *14 => 1000.00799078@TSLA
  await bob.generate(6)
  await tGroup.waitForSync()

  // vault is liquidated now
  const vaultAfter = await bob.container.call('getvault', [bobVaultId])
  expect(vaultAfter.state).toStrictEqual('inLiquidation')
  expect(vaultAfter.collateralAmounts).toStrictEqual(undefined)
  expect(vaultAfter.loanAmounts).toStrictEqual(undefined)
  expect(vaultAfter.collateralValue).toStrictEqual(undefined)
  expect(vaultAfter.loanValue).toStrictEqual(undefined)
  expect(vaultAfter.liquidationHeight).toStrictEqual(168)
  expect(vaultAfter.liquidationPenalty).toStrictEqual(5)
  expect(vaultAfter.batches).toStrictEqual([
    { index: 0, collaterals: ['5000.00000000@DFI', '0.50000000@BTC'], loan: '500.00399539@TSLA' },
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

describe('placeAuctionBid success', () => {
  beforeEach(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()

    aProviders = await getProviders(alice.container)
    aProviders.setEllipticPair(WIF.asEllipticPair(RegTestGenesisKeys[0].owner.privKey))
    aBuilder = new P2WPKHTransactionBuilder(aProviders.fee, aProviders.prevout, aProviders.elliptic, RegTest)

    bProviders = await getProviders(bob.container)
    bProviders.setEllipticPair(WIF.asEllipticPair(RegTestGenesisKeys[1].owner.privKey))
    bBuilder = new P2WPKHTransactionBuilder(bProviders.fee, bProviders.prevout, bProviders.elliptic, RegTest)

    await setup()

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    await fundEllipticPair(alice.container, aProviders.ellipticPair, 10)
    aliceColScript = P2WPKH.fromAddress(RegTest, aliceColAddr, P2WPKH).getScript()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  it('should placeAuctionBid', async () => {
    const bobColAccBefore = await bob.rpc.account.getAccount(bobColAddr)
    expect(bobColAccBefore).toStrictEqual(['8900.00000000@DFI', '545.45454546@TSLA'])

    const bobTSLAAccBefore = bobColAccBefore.length > 0
      ? bobColAccBefore.find((amt: string) => amt.split('@')[1] === 'TSLA')
      : undefined
    const bobTSLAAmtBefore = bobTSLAAccBefore !== undefined ? Number(bobTSLAAccBefore.split('@')[0]) : 0

    {
      const txn = await bBuilder.loans.placeAuctionBid({
        vaultId: bobVaultId,
        index: 0,
        from: bobColScript,
        tokenAmount: { token: 2, amount: new BigNumber(526) } //  min first bid includes penatly 5%
      }, bobColScript)

      // Ensure the created txn is correct
      const outs = await sendTransaction(bob.container, txn)
      expect(outs[0].value).toStrictEqual(0)
      expect(outs[1].value).toBeLessThan(10)
      expect(outs[1].value).toBeGreaterThan(9.999)
      expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await bProviders.getAddress())

      // Ensure you don't send all your balance away
      const prevouts = await bProviders.prevout.all()
      expect(prevouts.length).toStrictEqual(1)
      expect(prevouts[0].value.toNumber()).toBeLessThan(10)
      expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

      await bob.container.generate(1)
      await tGroup.waitForSync()
    }

    const bobColAccAfter = await bob.rpc.account.getAccount(bobColAddr)
    expect(bobColAccAfter).toStrictEqual(['8900.00000000@DFI', '19.45454546@TSLA'])

    const bobTSLAAccAfter = bobColAccAfter.length > 0
      ? bobColAccAfter.find((amt: string) => amt.split('@')[1] === 'TSLA')
      : undefined
    const bobTSLAAmtAfter = bobTSLAAccAfter !== undefined ? Number(bobTSLAAccAfter.split('@')[0]) : 0
    expect(bobTSLAAmtBefore - bobTSLAAmtAfter).toStrictEqual(526) // 545.45454546 - 19.45454546 = 526

    const aliceColAccBefore = await alice.rpc.account.getAccount(aliceColAddr)
    expect(aliceColAccBefore).toStrictEqual(['300000.00000000@DFI', '29999.00000000@BTC', '10000.00000000@TSLA'])

    // test second round placeAuctionBid
    {
      const txn = await aBuilder.loans.placeAuctionBid({
        vaultId: bobVaultId,
        index: 0,
        from: aliceColScript,
        tokenAmount: { token: 2, amount: new BigNumber(535) }
      }, aliceColScript)

      // Ensure the created txn is correct
      const outs = await sendTransaction(alice.container, txn)
      expect(outs[0].value).toStrictEqual(0)
      expect(outs[1].value).toBeLessThan(10)
      expect(outs[1].value).toBeGreaterThan(9.999)
      expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await aProviders.getAddress())

      // Ensure you don't send all your balance away
      const prevouts = await aProviders.prevout.all()
      expect(prevouts.length).toStrictEqual(1)
      expect(prevouts[0].value.toNumber()).toBeLessThan(10)
      expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

      await alice.generate(1)
      await tGroup.waitForSync()
    }

    // end the auction and alice win the bid
    await bob.generate(36)

    const auctionsAfter = await bob.container.call('listauctions')
    expect(auctionsAfter).toStrictEqual([
      {
        vaultId: bobVaultId,
        state: 'inLiquidation',
        loanSchemeId: 'scheme',
        ownerAddress: bobVaultAddr,
        liquidationPenalty: 5,
        liquidationHeight: expect.any(Number),
        batchCount: 1,
        batches: [
          {
            index: 0,
            collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
            loan: '500.00428078@TSLA'
          }
        ]
      }
    ])

    const bobColAccEndBid = await bob.rpc.account.getAccount(bobColAddr)
    // compare to bobColAccAfter ['8900.00000000@DFI', '19.45454546@TSLA']
    // bob claims back his funds
    expect(bobColAccEndBid).toStrictEqual(['8900.00000000@DFI', '545.45454546@TSLA'])

    const aliceColAccEndBid = await alice.rpc.account.getAccount(aliceColAddr)
    expect(aliceColAccEndBid).toStrictEqual(['305000.00000000@DFI', '29999.50000000@BTC', '9465.00000000@TSLA'])

    // ensure interest is freeze in auction
    await alice.generate(10)
    const auctionsAfter1 = await bob.container.call('listauctions')
    expect(auctionsAfter).toStrictEqual(auctionsAfter1)
  })

  it('should placeAuctionBid on all batches', async () => {
    // test bob bids on first index
    {
      const bobColAccBefore = await bob.rpc.account.getAccount(bobColAddr)
      expect(bobColAccBefore).toStrictEqual(['8900.00000000@DFI', '545.45454546@TSLA'])

      const txn = await bBuilder.loans.placeAuctionBid({
        vaultId: bobVaultId,
        index: 0,
        from: bobColScript,
        tokenAmount: { token: 2, amount: new BigNumber(526) } //  min first bid includes penatly 5%
      }, bobColScript)

      // Ensure the created txn is correct
      const outs = await sendTransaction(bob.container, txn)
      expect(outs[0].value).toStrictEqual(0)
      expect(outs[1].value).toBeLessThan(10)
      expect(outs[1].value).toBeGreaterThan(9.999)
      expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await bProviders.getAddress())

      // Ensure you don't send all your balance away
      const prevouts = await bProviders.prevout.all()
      expect(prevouts.length).toStrictEqual(1)
      expect(prevouts[0].value.toNumber()).toBeLessThan(10)
      expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

      await bob.container.generate(1)
      await tGroup.waitForSync()

      const bobColAccAfter = await bob.rpc.account.getAccount(bobColAddr)
      expect(bobColAccAfter).toStrictEqual(['8900.00000000@DFI', '19.45454546@TSLA'])

      const auctions = await bob.container.call('listauctions')
      expect(auctions[0]).toStrictEqual({
        vaultId: bobVaultId,
        loanSchemeId: 'scheme',
        ownerAddress: bobVaultAddr,
        state: 'inLiquidation',
        liquidationHeight: 168,
        liquidationPenalty: 5,
        batchCount: 2,
        batches: [
          {
            index: 0,
            collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
            loan: '500.00399539@TSLA',
            highestBid: {
              amount: '526.00000000@TSLA',
              owner: bobColAddr
            }
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
      expect(aliceColAccBefore).toStrictEqual(['300000.00000000@DFI', '29999.00000000@BTC', '10000.00000000@TSLA'])

      const txn = await aBuilder.loans.placeAuctionBid({
        vaultId: bobVaultId,
        index: 1,
        from: aliceColScript,
        tokenAmount: { token: 2, amount: new BigNumber(600) }
      }, aliceColScript)

      // Ensure the created txn is correct
      const outs = await sendTransaction(alice.container, txn)
      expect(outs[0].value).toStrictEqual(0)
      expect(outs[1].value).toBeLessThan(10)
      expect(outs[1].value).toBeGreaterThan(9.999)
      expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await aProviders.getAddress())

      // Ensure you don't send all your balance away
      const prevouts = await aProviders.prevout.all()
      expect(prevouts.length).toStrictEqual(1)
      expect(prevouts[0].value.toNumber()).toBeLessThan(10)
      expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

      await alice.generate(1)
      await tGroup.waitForSync()

      const aliceColAccAfter = await alice.rpc.account.getAccount(aliceColAddr)
      expect(aliceColAccAfter).toStrictEqual(['300000.00000000@DFI', '29999.00000000@BTC', '9400.00000000@TSLA'])

      const auctions = await alice.container.call('listauctions')
      expect(auctions[0]).toStrictEqual({
        vaultId: bobVaultId,
        liquidationHeight: 168,
        batchCount: 2,
        liquidationPenalty: 5,
        loanSchemeId: 'scheme',
        ownerAddress: bobVaultAddr,
        state: 'inLiquidation',
        batches: [{
          index: 0,
          collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
          loan: '500.00399539@TSLA',
          highestBid: {
            amount: '526.00000000@TSLA',
            owner: bobColAddr
          }
        },
        {
          index: 1,
          collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
          loan: '500.00399539@TSLA',
          highestBid: {
            amount: '600.00000000@TSLA',
            owner: aliceColAddr
          }
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
    expect(aliceColAccEndBid).toStrictEqual(['305000.00000000@DFI', '29999.50000000@BTC', '9400.00000000@TSLA'])

    const vault = await alice.container.call('getvault', [bobVaultId])
    expect(vault.state).toStrictEqual('active')
    expect(vault.collateralAmounts).toStrictEqual([])
    expect(vault.loanAmounts).toStrictEqual([])
    expect(vault.interestAmounts).toStrictEqual([])
    expect(vault.collateralValue).toStrictEqual(0)
    expect(vault.loanValue).toStrictEqual(0)
    expect(vault.interestValue).toStrictEqual(0)
    expect(vault.collateralRatio).toStrictEqual(-1)
    expect(vault.informativeRatio).toStrictEqual(-1)
  })

  it('test super bid recover vault state to active against other bids on other batches', async () => {
    const bobAccBefore = await bob.rpc.account.getAccount(bobColAddr)
    expect(bobAccBefore).toStrictEqual(['8900.00000000@DFI', '545.45454546@TSLA'])

    const aliceAccBefore = await alice.rpc.account.getAccount(aliceColAddr)
    expect(aliceAccBefore).toStrictEqual(['300000.00000000@DFI', '29999.00000000@BTC', '10000.00000000@TSLA'])

    {
      const txn = await bBuilder.loans.placeAuctionBid({
        vaultId: bobVaultId,
        index: 0,
        from: bobColScript,
        tokenAmount: { token: 2, amount: new BigNumber(526) } //  min first bid includes penatly 5%
      }, bobColScript)

      // Ensure the created txn is correct
      const outs = await sendTransaction(bob.container, txn)
      expect(outs[0].value).toStrictEqual(0)
      expect(outs[1].value).toBeLessThan(10)
      expect(outs[1].value).toBeGreaterThan(9.999)
      expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await bProviders.getAddress())

      // Ensure you don't send all your balance away
      const prevouts = await bProviders.prevout.all()
      expect(prevouts.length).toStrictEqual(1)
      expect(prevouts[0].value.toNumber()).toBeLessThan(10)
      expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

      await bob.container.generate(1)
      await tGroup.waitForSync()
    }

    {
      // super bid by Alice on other index
      const txn = await aBuilder.loans.placeAuctionBid({
        vaultId: bobVaultId,
        index: 1,
        from: aliceColScript,
        tokenAmount: { token: 2, amount: new BigNumber(9999) }
      }, aliceColScript)

      // Ensure the created txn is correct
      const outs = await sendTransaction(alice.container, txn)
      expect(outs[0].value).toStrictEqual(0)
      expect(outs[1].value).toBeLessThan(10)
      expect(outs[1].value).toBeGreaterThan(9.999)
      expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await aProviders.getAddress())

      // Ensure you don't send all your balance away
      const prevouts = await aProviders.prevout.all()
      expect(prevouts.length).toStrictEqual(1)
      expect(prevouts[0].value.toNumber()).toBeLessThan(10)
      expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

      await alice.generate(1)
      await tGroup.waitForSync()

      const auctions = await alice.container.call('listauctions')
      expect(auctions).toStrictEqual([{
        vaultId: bobVaultId,
        loanSchemeId: 'scheme',
        ownerAddress: bobVaultAddr,
        state: 'inLiquidation',
        liquidationHeight: expect.any(Number),
        batchCount: 2,
        liquidationPenalty: 5,
        batches: [{
          index: 0,
          collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
          loan: '500.00399539@TSLA',
          highestBid: {
            owner: bobColAddr,
            amount: '526.00000000@TSLA'
          }
        }, {
          index: 1,
          collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
          loan: '500.00399539@TSLA',
          highestBid: {
            owner: aliceColAddr,
            amount: '9999.00000000@TSLA'
          }
        }]
      }])
    }
    await alice.container.generate(36)

    const vault = await alice.container.call('getvault', [bobVaultId])
    expect(vault.state).toStrictEqual('active')

    const auctionsEnd = await alice.container.call('listauctions')
    expect(auctionsEnd).toStrictEqual([])

    const bobAccAfter = await bob.rpc.account.getAccount(bobColAddr)
    expect(bobAccAfter).toStrictEqual(['13900.00000000@DFI', '0.50000000@BTC', '19.45454546@TSLA'])

    const aliceAccAfter = await alice.rpc.account.getAccount(aliceColAddr)
    expect(aliceAccAfter).toStrictEqual(['305000.00000000@DFI', '29999.50000000@BTC', '1.00000000@TSLA'])
  })

  it('test larger index of batch', async () => {
    await alice.rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(3),
      id: 'default'
    })
    await alice.generate(1)

    await alice.rpc.loan.setLoanToken({
      symbol: 'AMZN',
      fixedIntervalPriceId: 'AMZN/USD'
    })
    await alice.generate(12)

    const aliceVaultAddr = await alice.generateAddress()
    const aliceVaultId = await alice.rpc.loan.createVault({
      ownerAddress: aliceVaultAddr,
      loanSchemeId: 'default'
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: aliceVaultId, from: aliceColAddr, amount: '230000@DFI'
    })
    await alice.generate(1)

    await alice.rpc.loan.takeLoan({
      vaultId: aliceVaultId,
      amounts: '150000@AMZN',
      to: aliceColAddr
    })
    await alice.generate(1)

    const aliceAccBefore = await alice.container.call('getaccount', [aliceColAddr])
    expect(aliceAccBefore).toStrictEqual([
      '70000.00000000@DFI',
      '29999.00000000@BTC',
      '10000.00000000@TSLA',
      '150000.00000000@AMZN'
    ])

    await alice.rpc.oracle.setOracleData(
      oracleId,
      Math.floor(new Date().getTime() / 1000),
      { prices: [{ tokenAmount: '15@AMZN', currency: 'USD' }] })
    await alice.container.generate(13)

    await alice.container.waitForVaultState(aliceVaultId, 'inLiquidation')

    const aliceVault = await alice.container.call('getvault', [aliceVaultId])
    expect(aliceVault).toStrictEqual({
      vaultId: aliceVaultId,
      loanSchemeId: 'default',
      ownerAddress: aliceVaultAddr,
      state: 'inLiquidation',
      liquidationHeight: expect.any(Number),
      batchCount: 24,
      liquidationPenalty: 5,
      batches: [
        { index: 0, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 1, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 2, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 3, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 4, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 5, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 6, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 7, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 8, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 9, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 10, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 11, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 12, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 13, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 14, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 15, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 16, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 17, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 18, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 19, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 20, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 21, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 22, collaterals: ['9999.99980000@DFI'], loan: '6521.77250208@AMZN' },
        { index: 23, collaterals: ['0.00460000@DFI'], loan: '0.00300003@AMZN' }
      ]
    })

    await fundEllipticPair(alice.container, aProviders.ellipticPair, 100)

    const txn = await aBuilder.loans.placeAuctionBid({
      vaultId: aliceVaultId,
      index: 21,
      from: aliceColScript,
      tokenAmount: { token: 4, amount: new BigNumber(10000) }
    }, aliceColScript)

    const outs = await sendTransaction(alice.container, txn)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await aProviders.getAddress())
    await alice.generate(1)

    const auctions = await alice.container.call('listauctions')
    expect(auctions[0].batches[21]).toStrictEqual({
      index: 21,
      collaterals: ['9999.99980000@DFI'],
      loan: '6521.77250208@AMZN',
      highestBid: {
        owner: 'bcrt1qkd5pflfxry9nyx4fskqf9yayzfeulc2709p7x8',
        amount: '10000.00000000@AMZN'
      }
    })
  })
})

describe('placeAuctionBid failed', () => {
  beforeAll(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()

    aProviders = await getProviders(alice.container)
    aProviders.setEllipticPair(WIF.asEllipticPair(RegTestGenesisKeys[0].owner.privKey))
    aBuilder = new P2WPKHTransactionBuilder(aProviders.fee, aProviders.prevout, aProviders.elliptic, RegTest)

    bProviders = await getProviders(bob.container)
    bProviders.setEllipticPair(WIF.asEllipticPair(RegTestGenesisKeys[1].owner.privKey))
    bBuilder = new P2WPKHTransactionBuilder(bProviders.fee, bProviders.prevout, bProviders.elliptic, RegTest)

    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should not placeAuctionBid as first bid should include liquidation penalty of 5%', async () => {
    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.placeAuctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColScript,
      tokenAmount: { token: 2, amount: new BigNumber(500) }
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('First bid should include liquidation penalty of 5%')
  })

  it('next bid is required 1% higher', async () => {
    await bob.rpc.loan.placeAuctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '526@TSLA'
    })
    await bob.container.generate(1)
    await tGroup.waitForSync()

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.placeAuctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColScript,
      tokenAmount: { token: 2, amount: new BigNumber(530) } // requires 1% higher than previous bid
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Bid override should be at least 1% higher than current one')
  })

  it('should not placeAuctionBid on non-existent vault', async () => {
    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.placeAuctionBid({
      vaultId: '0'.repeat(64),
      index: 0,
      from: bobColScript,
      tokenAmount: { token: 2, amount: new BigNumber(530) }
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
  })

  it('should not placeAuctionBid on non-existent batches index', async () => {
    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.placeAuctionBid({
      vaultId: bobVaultId,
      index: 99,
      from: bobColScript,
      tokenAmount: { token: 2, amount: new BigNumber(530) }
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`No batch to vault/index ${bobVaultId}/99`)
  })

  it('should not placeAuctionBid as vault is not under liquidation', async () => {
    const addr = await alice.generateAddress()
    const aliceVaultId = await alice.rpc.loan.createVault({
      ownerAddress: addr,
      loanSchemeId: 'scheme'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    const vault = await alice.container.call('getvault', [aliceVaultId])
    expect(vault.state).toStrictEqual('active')

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.placeAuctionBid({
      vaultId: aliceVaultId,
      index: 0,
      from: bobColScript,
      tokenAmount: { token: 2, amount: new BigNumber(545) }
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Cannot bid to vault which is not under liquidation')
  })

  it('should not placeAuctionBid as bid token does not match auction one', async () => {
    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.placeAuctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColScript,
      tokenAmount: { token: 3, amount: new BigNumber(530) }
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Bid token does not match auction one')
  })
})

// move insufficient fund test out of another scope for testing independent
describe('placeAuctionBid failed #2', () => {
  beforeEach(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()

    aProviders = await getProviders(alice.container)
    aProviders.setEllipticPair(WIF.asEllipticPair(RegTestGenesisKeys[0].owner.privKey))
    aBuilder = new P2WPKHTransactionBuilder(aProviders.fee, aProviders.prevout, aProviders.elliptic, RegTest)

    bProviders = await getProviders(bob.container)
    bProviders.setEllipticPair(WIF.asEllipticPair(RegTestGenesisKeys[1].owner.privKey))
    bBuilder = new P2WPKHTransactionBuilder(bProviders.fee, bProviders.prevout, bProviders.elliptic, RegTest)

    await setup()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  it('should not placeAuctionBid as insufficient fund', async () => {
    const bobColAcc = await bob.rpc.account.getAccount(bobColAddr)
    const tslaAcc = bobColAcc.find((amt: string) => amt.split('@')[1] === 'TSLA')
    const tslaAmt = Number(tslaAcc?.split('@')[0])
    expect(Number(tslaAmt)).toBeLessThan(30000)

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.placeAuctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColScript,
      tokenAmount: { token: 2, amount: new BigNumber(30000) }
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`amount ${tslaAmt} is less than 30000.00000000`)
  })
})

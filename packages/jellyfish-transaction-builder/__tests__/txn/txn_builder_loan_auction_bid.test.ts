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

describe('Loan', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(RegTestGenesisKeys[i]))
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)
  let aliceColAddr: string
  let bobVaultId: string
  let bobColAddr: string

  let aProviders: MockProviders
  let aBuilder: P2WPKHTransactionBuilder
  let bProviders: MockProviders
  let bBuilder: P2WPKHTransactionBuilder

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

  async function setup (): Promise<void> {
    // token setup
    aliceColAddr = await aProviders.getAddress()
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
      minColRatio: 500,
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

  it('should auctionBid', async () => {
    const bobColAccBefore = await bob.rpc.account.getAccount(bobColAddr)
    expect(bobColAccBefore).toStrictEqual(['8900.00000000@DFI', '545.45454546@TSLA'])

    const bobTSLAAccBefore = bobColAccBefore.length > 0
      ? bobColAccBefore.find((amt: string) => amt.split('@')[1] === 'TSLA')
      : undefined
    const bobTSLAAmtBefore = bobTSLAAccBefore !== undefined ? Number(bobTSLAAccBefore.split('@')[0]) : 0

    {
      await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
      const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

      const txn = await bBuilder.loans.auctionBid({
        vaultId: bobVaultId,
        index: '00000000',
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
    expect(aliceColAccBefore).toStrictEqual(['30000.00000000@DFI', '29999.00000000@BTC', '10000.00000000@TSLA'])

    // test second round auctionBid
    {
      await fundEllipticPair(alice.container, aProviders.ellipticPair, 10)
      const aliceColScript = P2WPKH.fromAddress(RegTest, aliceColAddr, P2WPKH).getScript()

      const txn = await aBuilder.loans.auctionBid({
        vaultId: bobVaultId,
        index: '00000000',
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
        batchCount: 1,
        liquidationHeight: 205,
        liquidationPenalty: 5,
        batches: [
          {
            index: 0,
            collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
            loan: '509.99980024@TSLA' // https://github.com/DeFiCh/pinkpaper/tree/main/loan#collateral-auction
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
    // compare to bobColAccAfter ['8900.00000000@DFI', '19.45454546@TSLA']
    // bob claims back his funds
    expect(bobColAccEndBid).toStrictEqual(['8900.00000000@DFI', '545.45454546@TSLA'])

    const aliceColAccEndBid = await alice.rpc.account.getAccount(aliceColAddr)
    expect(aliceColAccEndBid).toStrictEqual(['35000.00000000@DFI', '29999.50000000@BTC', '9465.00000000@TSLA'])
  })

  it('should auctionBid on all batches', async () => {
    // test bob bids on first index
    {
      const bobColAccBefore = await bob.rpc.account.getAccount(bobColAddr)
      expect(bobColAccBefore).toStrictEqual(['8900.00000000@DFI', '545.45454546@TSLA'])

      await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
      const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

      const txn = await bBuilder.loans.auctionBid({
        vaultId: bobVaultId,
        index: '00000000',
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

      await fundEllipticPair(alice.container, aProviders.ellipticPair, 10)
      const aliceColScript = P2WPKH.fromAddress(RegTest, aliceColAddr, P2WPKH).getScript()

      const txn = await aBuilder.loans.auctionBid({
        vaultId: bobVaultId,
        index: '00000001',
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

  it('next bid is required 1% higher', async () => {
    await bob.rpc.loan.auctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '526@TSLA'
    })
    await bob.container.generate(1)
    await tGroup.waitForSync()

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.auctionBid({
      vaultId: bobVaultId,
      index: '00000000',
      from: bobColScript,
      tokenAmount: { token: 2, amount: new BigNumber(530) } // requires 1% higher than previous bid
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Bid override should be at least 1% higher than current one')
  })

  it('should not auctionBid on non-existent vault', async () => {
    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.auctionBid({
      vaultId: '0'.repeat(64),
      index: '00000000',
      from: bobColScript,
      tokenAmount: { token: 2, amount: new BigNumber(530) }
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
  })

  it('should not auctionBid on non-existent batches index', async () => {
    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.auctionBid({
      vaultId: bobVaultId,
      index: '00000099',
      from: bobColScript,
      tokenAmount: { token: 2, amount: new BigNumber(530) }
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`No batch to vault/index ${bobVaultId}/153`)
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

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.auctionBid({
      vaultId: bobVaultId,
      index: '00000000',
      from: bobColScript,
      tokenAmount: { token: 2, amount: new BigNumber(530) }
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Cannot bid to vault which is not under liquidation')
  })

  it('should not auctionBid as bid token does not match auction one', async () => {
    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.auctionBid({
      vaultId: bobVaultId,
      index: '00000000',
      from: bobColScript,
      tokenAmount: { token: 3, amount: new BigNumber(530) }
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Bid token does not match auction one')
  })

  it('should not auctionBid as insufficient fund', async () => {
    const bobColAcc = await bob.rpc.account.getAccount(bobColAddr)
    const tslaAcc = bobColAcc.find((amt: string) => amt.split('@')[1] === 'TSLA')
    const tslaAmt = Number(tslaAcc?.split('@')[0])
    expect(Number(tslaAmt)).toBeLessThan(30000)

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.auctionBid({
      vaultId: bobVaultId,
      index: '00000000',
      from: bobColScript,
      tokenAmount: { token: 2, amount: new BigNumber(30000) }
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`amount ${tslaAmt} is less than 30000.00000000`)
  })

  it('should not auctionBid as first bid should include liquidation penalty of 5%', async () => {
    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.auctionBid({
      vaultId: bobVaultId,
      index: '00000000',
      from: bobColScript,
      tokenAmount: { token: 2, amount: new BigNumber(500) }
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('First bid should include liquidation penalty of 5%')
  })
})

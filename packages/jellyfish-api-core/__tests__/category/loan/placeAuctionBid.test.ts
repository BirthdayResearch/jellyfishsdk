import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { VaultActive, VaultLiquidation, VaultState } from '../../../src/category/loan'

const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)
let aliceColAddr: string
let bobVaultId: string
let bobColAddr: string
let bobVaultAddr: string
let bobColAccBefore: string[]
let aliceColAccBefore: string[]
let oracleId: string

function now (): number {
  return Math.floor(new Date().getTime() / 1000)
}

async function setup (): Promise<void> {
  // token setup
  aliceColAddr = await alice.generateAddress()
  await alice.token.dfi({ address: aliceColAddr, amount: 35000 })
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
    { token: 'DUSD', currency: 'USD' }
  ]
  oracleId = await alice.rpc.oracle.appointOracle(await alice.generateAddress(), priceFeeds, { weightage: 1 })
  await alice.generate(1)
  await alice.rpc.oracle.setOracleData(
    oracleId,
    now(),
    {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '10000@BTC', currency: 'USD' },
        { tokenAmount: '2@TSLA', currency: 'USD' },
        { tokenAmount: '1@DUSD', currency: 'USD' }
      ]
    })
  await alice.generate(1)

  // loan scheme set up
  await alice.rpc.loan.createLoanScheme({
    minColRatio: 150,
    interestRate: new BigNumber(3),
    id: 'scheme'
  })
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

  // DUSD loan token set up
  await alice.rpc.loan.setLoanToken({
    symbol: 'DUSD',
    fixedIntervalPriceId: 'DUSD/USD'
  })
  await alice.generate(1)

  const aliceDusdVaultAddr = await alice.generateAddress()
  const aliceDusdVaultId = await alice.rpc.loan.createVault({
    ownerAddress: aliceDusdVaultAddr,
    loanSchemeId: 'scheme'
  })
  await alice.generate(1)

  await alice.rpc.loan.depositToVault({
    vaultId: aliceDusdVaultId, from: aliceColAddr, amount: '5000@DFI'
  })
  await alice.generate(1)

  const aliceDusdAddr = await alice.generateAddress()
  await alice.rpc.loan.takeLoan({
    vaultId: aliceDusdVaultId,
    to: aliceDusdAddr,
    amounts: ['3000@DUSD']
  })
  await alice.generate(1)

  // Pools required set up for auction bid `swap to DFI over DUSD` pools
  // TSLA -> DUSD -> DFI
  const poolAddr = await alice.generateAddress()
  await alice.poolpair.create({
    tokenA: 'DUSD',
    tokenB: 'TSLA',
    ownerAddress: poolAddr
  })
  await alice.poolpair.create({
    tokenA: 'DUSD',
    tokenB: 'DFI',
    ownerAddress: poolAddr
  })
  await alice.generate(1)

  await alice.poolpair.add({
    a: { symbol: 'DUSD', amount: 1000 },
    b: { symbol: 'DFI', amount: 1000 }
  })
  await alice.poolpair.add({
    a: { symbol: 'DUSD', amount: 1000 },
    b: { symbol: 'TSLA', amount: 1000 }
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
  await alice.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '15@TSLA', currency: 'USD' }] })
  await alice.generate(1) // interest * 5 => 1000.00285385@TSLA
  await tGroup.waitForSync()

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
    // commented this flaky state check as block height does not really complimentary with state but time
    // expect(vault.state).toStrictEqual('frozen')
    expect(vault.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@BTC'])
    expect(vault.loanAmounts).toStrictEqual(['1000.00570770@TSLA'])
    expect(vault.interestAmounts).toStrictEqual(['0.00570770@TSLA'])
    expect(vault.collateralValue).toStrictEqual(20000)
    expect(vault.loanValue).toStrictEqual(2000.0114154)
    expect(vault.interestValue).toStrictEqual(0.0114154)
    expect(vault.collateralRatio).toStrictEqual(1000)
    expect(vault.informativeRatio).toStrictEqual(999.99429233)
  }

  const auctionsBefore = await bob.container.call('listauctions')
  expect(auctionsBefore.length).toStrictEqual(0)

  // *11 => 1000.00627847@TSLA
  // *12 => 1000.00684924@TSLA
  // *13 => 1000.00742001@TSLA
  // *14 => 1000.00799078@TSLA
  await bob.container.waitForVaultState(bobVaultId, 'inLiquidation')

  // vault is liquidated now
  const vaultAfter = await bob.container.call('getvault', [bobVaultId])
  expect(vaultAfter.state).toStrictEqual('inLiquidation')
  expect(vaultAfter.collateralAmounts).toStrictEqual(undefined)
  expect(vaultAfter.loanAmounts).toStrictEqual(undefined)
  expect(vaultAfter.collateralValue).toStrictEqual(undefined)
  expect(vaultAfter.loanValue).toStrictEqual(undefined)
  expect(vaultAfter.liquidationHeight).toStrictEqual(174)
  expect(vaultAfter.liquidationPenalty).toStrictEqual(5)
  expect(vaultAfter.batches).toStrictEqual([
    { index: 0, collaterals: ['5000.00000000@DFI', '0.50000000@BTC'], loan: '500.00399539@TSLA' }, // refer to ln: 171, the last interest generated loanAmt divided by 2
    { index: 1, collaterals: ['5000.00000000@DFI', '0.50000000@BTC'], loan: '500.00399539@TSLA' }
  ])

  const auctionsAfter = await bob.container.call('listauctions')
  expect(auctionsAfter.length > 0).toStrictEqual(true)
  expect(auctionsAfter[0].vaultId).toStrictEqual(bobVaultId)
  expect(auctionsAfter[0].batchCount).toStrictEqual(2)
  expect(auctionsAfter[0].liquidationHeight).toStrictEqual(174)
  expect(auctionsAfter[0].liquidationPenalty).toStrictEqual(5)
  expect(auctionsAfter[0].batches[0].collaterals).toStrictEqual(['5000.00000000@DFI', '0.50000000@BTC'])
  expect(auctionsAfter[0].batches[0].loan).toStrictEqual('500.00399539@TSLA')

  bobColAccBefore = await bob.rpc.account.getAccount(bobColAddr)
  expect(bobColAccBefore).toStrictEqual(['8900.00000000@DFI', '545.45454546@TSLA'])

  aliceColAccBefore = await alice.rpc.account.getAccount(aliceColAddr)
  expect(aliceColAccBefore).toStrictEqual(['29000.00000000@DFI', '29999.00000000@BTC', '10000.00000000@TSLA'])
}

describe('placeAuctionBid success', () => {
  beforeEach(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  it('should placeAuctionBid', async () => {
    { // first round first bid
      const bobTSLAAccBefore = bobColAccBefore.length > 0
        ? bobColAccBefore.find((amt: string) => amt.split('@')[1] === 'TSLA')
        : undefined
      const bobTSLAAmtBefore = bobTSLAAccBefore !== undefined ? Number(bobTSLAAccBefore.split('@')[0]) : 0

      const txid = await bob.rpc.loan.placeAuctionBid({
        vaultId: bobVaultId,
        index: 0,
        from: bobColAddr,
        amount: '526@TSLA' // (500.00399539 * 5%) + 500 = 525.00419516, min first bid is 525.00419516
      })
      expect(typeof txid).toStrictEqual('string')
      await bob.container.generate(1)

      const bobVault = await alice.container.call('getvault', [bobVaultId])
      expect(bobVault).toStrictEqual({
        vaultId: bobVaultId,
        loanSchemeId: 'scheme',
        ownerAddress: bobVaultAddr,
        state: 'inLiquidation',
        liquidationHeight: 174,
        batchCount: 2,
        liquidationPenalty: 5,
        batches: [
          {
            index: 0,
            collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
            loan: '500.00399539@TSLA',
            highestBid: {
              owner: bobColAddr,
              amount: '526.00000000@TSLA'
            }
          },
          {
            index: 1,
            collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
            loan: '500.00399539@TSLA'
          }
        ]
      })

      await tGroup.waitForSync()

      const bobColAccAfter = await bob.rpc.account.getAccount(bobColAddr)
      expect(bobColAccAfter).toStrictEqual(['8900.00000000@DFI', '19.45454546@TSLA'])

      const bobTSLAAccAfter = bobColAccAfter.length > 0
        ? bobColAccAfter.find((amt: string) => amt.split('@')[1] === 'TSLA')
        : undefined
      const bobTSLAAmtAfter = bobTSLAAccAfter !== undefined ? Number(bobTSLAAccAfter.split('@')[0]) : 0
      expect(bobTSLAAmtBefore - bobTSLAAmtAfter).toStrictEqual(526) // 545.45454546 - 19.45454546 = 526
    }

    { // first round second bid
      await alice.rpc.loan.placeAuctionBid({
        vaultId: bobVaultId,
        index: 0,
        from: aliceColAddr,
        amount: '535@TSLA' // (526 * 1%) + 525 = 531.26
      })
      await alice.generate(1)

      let bobVault = await alice.container.call('getvault', [bobVaultId])
      expect(bobVault).toStrictEqual({
        vaultId: bobVaultId,
        loanSchemeId: 'scheme',
        ownerAddress: bobVaultAddr,
        state: 'inLiquidation',
        liquidationHeight: 174,
        batchCount: 2,
        liquidationPenalty: 5,
        batches: [
          {
            index: 0,
            collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
            loan: '500.00399539@TSLA',
            highestBid: {
              owner: aliceColAddr,
              amount: '535.00000000@TSLA'
            }
          },
          {
            index: 1,
            collaterals: ['5000.00000000@DFI', '0.50000000@BTC'],
            loan: '500.00399539@TSLA'
          }
        ]
      })
      await tGroup.waitForSync()

      // bob should be able to claim back his fund right after the higher bid
      const bobColAccBid = await bob.rpc.account.getAccount(bobColAddr)
      expect(bobColAccBid).toStrictEqual(['8900.00000000@DFI', '545.45454546@TSLA'])

      // let the auction end and the vault's state will be switched to mayLiquidate
      await bob.container.waitForVaultState(bobVaultId, VaultState.MAY_LIQUIDATE)
      // after convert from mayLiquidate, gen(1) will cause interest increase
      await bob.container.waitForVaultState(bobVaultId, VaultState.IN_LIQUIDATION)

      const auctions = await bob.container.call('listauctions')
      expect(auctions).toStrictEqual([
        {
          vaultId: bobVaultId,
          state: 'inLiquidation', // 10008.89695148 / 7500.0642117 * 100 = 133.450816806 (< 150)
          loanSchemeId: 'scheme',
          ownerAddress: bobVaultAddr,
          liquidationPenalty: 5,
          liquidationHeight: 211,
          batchCount: 2,
          batches: [
            {
              index: 0,
              collaterals: ['5004.44449290@DFI', '0.49955555@BTC'], // 5004.4444929 + 4995.5555 = 9999.9999929
              loan: '499.55982197@TSLA' // 499.55982197 * 15 = 7493.39732955
            },
            {
              index: 1,
              collaterals: ['4.45245858@DFI', '0.00044445@BTC'], // 4.45245858 + 4.4445 = 8.89695858
              loan: '0.44445881@TSLA' // 0.44445881 * 15 = 6.66688215
            }
          ]
        }
      ])

      // the highest bid record is cleared
      bobVault = await alice.container.call('getvault', [bobVaultId])
      expect(bobVault).toStrictEqual({
        vaultId: bobVaultId,
        loanSchemeId: 'scheme',
        ownerAddress: bobVaultAddr,
        state: 'inLiquidation',
        liquidationHeight: 211,
        batchCount: 2,
        liquidationPenalty: 5,
        batches: [
          {
            index: 0,
            collaterals: ['5004.44449290@DFI', '0.49955555@BTC'],
            loan: '499.55982197@TSLA'
          },
          {
            index: 1,
            collaterals: ['4.45245858@DFI', '0.00044445@BTC'],
            loan: '0.44445881@TSLA'
          }
        ]
      })

      const aliceColAcc = await alice.rpc.account.getAccount(aliceColAddr)
      expect(aliceColAcc).toStrictEqual(['34000.00000000@DFI', '29999.50000000@BTC', '9465.00000000@TSLA'])

      // ensure interest is freeze in auction
      await alice.generate(10)
      const auctions10 = await bob.container.call('listauctions')
      expect(auctions).toStrictEqual(auctions10)
    }

    {
      await alice.rpc.loan.placeAuctionBid({
        vaultId: bobVaultId,
        index: 0,
        from: aliceColAddr,
        amount: '530@TSLA'
      })
      await alice.generate(36)

      const auctionsEnd = await bob.container.call('listauctions')
      expect(auctionsEnd).toStrictEqual([])

      const bobVault = await alice.container.call('getvault', [bobVaultId])
      expect(bobVault).toStrictEqual({
        vaultId: bobVaultId,
        loanSchemeId: 'scheme',
        ownerAddress: bobVaultAddr,
        state: 'active',
        collateralAmounts: ['8.76515120@DFI', '0.00044445@BTC'],
        loanAmounts: ['0.44446156@TSLA'],
        interestAmounts: ['0.00000275@TSLA'],
        collateralValue: 13.2096512,
        loanValue: 6.6669234,
        interestValue: 0.00004125,
        informativeRatio: 198.13713773,
        collateralRatio: 198
      })

      const aliceColAcc = await alice.rpc.account.getAccount(aliceColAddr)
      expect(aliceColAcc).toStrictEqual(['39004.44449290@DFI', '29999.99955555@BTC', '8935.00000000@TSLA'])
    }
  })

  it('should placeAuctionBid with utxos', async () => {
    const bobColAccBefore = await bob.rpc.account.getAccount(bobColAddr)
    const bobTSLAAccBefore = bobColAccBefore.length > 0
      ? bobColAccBefore.find((amt: string) => amt.split('@')[1] === 'TSLA')
      : undefined
    const bobBeforeTSLAAmt = bobTSLAAccBefore !== undefined ? Number(bobTSLAAccBefore.split('@')[0]) : 0

    const utxo = await alice.container.fundAddress(bobColAddr, 50)

    const txid = await bob.rpc.loan.placeAuctionBid({
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

  it('should placeAuctionBid on all batches', async () => {
    // test bob bids on first index
    {
      const bobColAccBefore = await bob.rpc.account.getAccount(bobColAddr)
      expect(bobColAccBefore).toStrictEqual(['8900.00000000@DFI', '545.45454546@TSLA'])

      const txid = await bob.rpc.loan.placeAuctionBid({
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
        loanSchemeId: 'scheme',
        ownerAddress: bobVaultAddr,
        state: 'inLiquidation',
        liquidationHeight: 174,
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
      const txid1 = await alice.rpc.loan.placeAuctionBid({
        vaultId: bobVaultId,
        index: 1,
        from: aliceColAddr,
        amount: '600@TSLA' // (500.00399539 * 5%) + 500 = 525.00419516, min first bid is 525.00419516
      })
      expect(typeof txid1).toStrictEqual('string')
      await alice.container.generate(1)
      await tGroup.waitForSync()

      const aliceColAccAfter = await alice.rpc.account.getAccount(aliceColAddr)
      expect(aliceColAccAfter).toStrictEqual(['29000.00000000@DFI', '29999.00000000@BTC', '9400.00000000@TSLA'])

      const auctions = await alice.container.call('listauctions')
      expect(auctions[0]).toStrictEqual({
        vaultId: bobVaultId,
        liquidationHeight: 174,
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
    expect(aliceColAccEndBid).toStrictEqual(['34000.00000000@DFI', '29999.50000000@BTC', '9400.00000000@TSLA'])

    const vault = await alice.container.call('getvault', [bobVaultId])
    expect(vault).toStrictEqual({
      vaultId: bobVaultId,
      loanSchemeId: 'scheme',
      ownerAddress: bobVaultAddr,
      state: 'active',
      collateralAmounts: ['55.25753134@DFI'],
      loanAmounts: [],
      interestAmounts: [],
      collateralValue: 55.25753134,
      loanValue: 0,
      interestValue: 0,
      informativeRatio: -1,
      collateralRatio: -1
    })
  })

  it('should make the vault active after completion of one auction batch', async () => {
    // update price oracle
    await alice.rpc.oracle.setOracleData(
      oracleId,
      now(),
      {
        prices: [
          { tokenAmount: '100@DFI', currency: 'USD' },
          { tokenAmount: '100@BTC', currency: 'USD' },
          { tokenAmount: '100@TSLA', currency: 'USD' }
        ]
      })
    await alice.generate(12)

    // Loan200 scheme set up
    await alice.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(1),
      id: 'Loan200'
    })
    await alice.generate(1)

    // create another vault
    const aliceVaultAddr = await alice.generateAddress()
    const aliceVaultId = await alice.rpc.loan.createVault({
      ownerAddress: aliceVaultAddr,
      loanSchemeId: 'Loan200'
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: aliceVaultId, from: aliceColAddr, amount: '60@DFI'
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: aliceVaultId, from: aliceColAddr, amount: '60@BTC'
    })
    await alice.generate(1)

    const aliceLoanAddr = await alice.generateAddress()
    await alice.rpc.loan.takeLoan({
      vaultId: aliceVaultId,
      amounts: '60@TSLA',
      to: aliceLoanAddr
    })
    await alice.generate(1)

    const aliceLoanAcc = await alice.container.call('getaccount', [aliceLoanAddr])
    expect(aliceLoanAcc).toStrictEqual(['60.00000000@TSLA'])

    // update the price again for 101@TSLA
    await alice.rpc.oracle.setOracleData(
      oracleId,
      now(),
      {
        prices: [
          { tokenAmount: '100@DFI', currency: 'USD' },
          { tokenAmount: '100@BTC', currency: 'USD' },
          { tokenAmount: '101@TSLA', currency: 'USD' }
        ]
      })
    await alice.generate(12)

    // see the aliceVaultId inLiquidation
    const vault = await alice.rpc.loan.getVault(aliceVaultId) as VaultLiquidation
    expect(vault.state).toStrictEqual('inLiquidation')
    expect(vault.batches).toStrictEqual([
      { index: 0, collaterals: ['49.99999980@DFI', '49.99999980@BTC'], loan: '50.00006635@TSLA' },
      { index: 1, collaterals: ['10.00000020@DFI', '10.00000020@BTC'], loan: '10.00001352@TSLA' }
    ])

    // place auction bid for the first batch
    const txid1 = await alice.rpc.loan.placeAuctionBid({
      vaultId: aliceVaultId,
      index: 0,
      from: aliceColAddr,
      amount: '59.41@TSLA'
    })
    expect(typeof txid1).toStrictEqual('string')
    await alice.container.generate(1)

    // reduce the TSLA price to 99. by the time auction ends, vault will have enough col ratio to survive reliquidation.
    await alice.rpc.oracle.setOracleData(
      oracleId,
      now(),
      {
        prices: [
          { tokenAmount: '100@DFI', currency: 'USD' },
          { tokenAmount: '100@BTC', currency: 'USD' },
          { tokenAmount: '99@TSLA', currency: 'USD' }
        ]
      })
    // end the auction
    await alice.container.generate(35)

    // check the vault again
    const vaultAfter = await alice.rpc.loan.getVault(aliceVaultId) as VaultActive
    expect(vaultAfter.state).toStrictEqual('active')

    // update the prices back
    await alice.rpc.oracle.setOracleData(
      oracleId,
      now(),
      {
        prices: [
          { tokenAmount: '1@DFI', currency: 'USD' },
          { tokenAmount: '10000@BTC', currency: 'USD' },
          { tokenAmount: '2@TSLA', currency: 'USD' }
        ]
      })
    await alice.generate(12)
    await tGroup.waitForSync()
  })
})

describe('placeAuctionBid failed', () => {
  beforeAll(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should not placeAuctionBid as first bid should include liquidation penalty of 5%', async () => {
    const promise = bob.rpc.loan.placeAuctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '500@TSLA' // (500 * 5%) + 500 = 525, should not less than 525
    })
    await expect(promise).rejects.toThrow(RpcApiError)
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

    const promise = bob.rpc.loan.placeAuctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '530@TSLA' // (526 * 1%) + 526 = 531.26
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Bid override should be at least 1% higher than current one')
  })

  it('should not placeAuctionBid with arbitrary utxos', async () => {
    const utxo = await alice.container.fundAddress(await alice.generateAddress(), 10)

    const promise = alice.rpc.loan.placeAuctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '550@TSLA'
    }, [utxo])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('tx must have at least one input from token owner')
  })

  it('should not placeAuctionBid on non-existent vault', async () => {
    const promise = bob.rpc.loan.placeAuctionBid({
      vaultId: '0'.repeat(64),
      index: 0,
      from: bobColAddr,
      amount: '550@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
  })

  it('should not placeAuctionBid on non-existent batches index', async () => {
    const promise = bob.rpc.loan.placeAuctionBid({
      vaultId: bobVaultId,
      index: 99,
      from: bobColAddr,
      amount: '550@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`No batch to vault/index ${bobVaultId}/99`)
  })

  it('should not placeAuctionBid as vault is not under liquidation', async () => {
    const addr = await alice.generateAddress()
    const bobVaultId = await alice.rpc.loan.createVault({
      ownerAddress: addr,
      loanSchemeId: 'scheme'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    const vault = await alice.container.call('getvault', [bobVaultId])
    expect(vault.state).toStrictEqual('active')

    const promise = bob.rpc.loan.placeAuctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '100@DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot bid to vault which is not under liquidation')
  })

  it('should not placeAuctionBid as bid token does not match auction one', async () => {
    const promise = bob.rpc.loan.placeAuctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '10000@DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Bid token does not match auction one')
  })
})

// move insufficient fund test out of another scope for testing independent
describe('placeAuctionBid failed #2', () => {
  beforeEach(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()
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

    const promise = bob.rpc.loan.placeAuctionBid({
      vaultId: bobVaultId,
      index: 0,
      from: bobColAddr,
      amount: '30000@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`amount ${tslaAmt} is less than 30000.00000000`)
  })
})

import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'
import { LoanMasterNodeRegTestContainer } from './loan_container'

describe('Loan listVaultHistory', () => {
  // 4 vaults are created.
  // Alice is the owner of the 1st and 2nd vaults
  // Bob is the owner of the 3rd and 4th vaults

  // The mandatory txs for a vault to be auctioned are - CreateVault, DepositToVault, TakeLoan and AuctionBid txs
  // The optional txs for a vault to be auctioned are - UpdateVault, PaybackLoan, WithdrawFromVault, CloseVault txs
  // Every vault has 4 mandatory txs and 1 optional tx
  // The optional tx for every vault is
  // Vault 1 - UpdateVault
  // Vault 2 - PaybackLoan
  // Vault 3 - WithdrawFromVault
  // Vault 4 - CloseVault

  // Below are the tx letters for all loan tx after the vault creation
  // CreateVault            = 'V'
  // DepositToVault         = 'S'
  // TakeLoan               = 'X'
  // AuctionBid             = 'I'
  // UpdateVault            = 'v'
  // PaybackLoan            = 'H'
  // WithdrawFromVault      = 'J'
  // CloseVault             = 'e'

  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)
  let aliceColAddr: string
  let bobColAddr: string

  let createVaultTxId: string // Alice 1st vault
  let createVaultBlockHeight: number

  let updateVaultTxId: string
  let updateVaultBlockHeight: number

  let depositVault1TxId: number
  let depositVault1BlockHeight: number

  let depositVault2TxId: string
  let depositVault2BlockHeight: number

  let takeLoanTxId: string
  let takeLoanBlockHeight: number

  let inLiquidationBlockHeight1: number
  let priceActivationBlockHeight1: number
  let inLiquidationBlockHeight2: number

  let auctionBidTxId: string
  let auctionBidBlockHeight: number

  let priceActivationBlockHeight2: number
  let inLiquidationBlockHeight3: number

  let vaultId2: string // Alice 2nd vault
  let vaultId3: string // Bob 1st vault
  let vaultId4: string // Bob 2nd vault

  beforeAll(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()
    aliceColAddr = await alice.generateAddress()
    bobColAddr = await bob.generateAddress()

    await alice.token.dfi({
      address: aliceColAddr,
      amount: 45000
    })
    await alice.generate(1)

    await alice.token.create({
      symbol: 'BTC',
      collateralAddress: aliceColAddr
    })
    await alice.generate(1)

    await alice.token.mint({
      symbol: 'BTC',
      amount: 50
    })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['25@BTC'] })
    await alice.generate(1)
    await tGroup.waitForSync()

    await bob.token.dfi({
      address: bobColAddr,
      amount: 75000
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    // Create DUSD token
    await alice.token.create({ symbol: 'DUSD', collateralAddress: aliceColAddr })
    await alice.generate(1)
    await alice.token.mint({ symbol: 'DUSD', amount: 600000 })
    await alice.generate(1)
    await alice.poolpair.create({ tokenA: 'DUSD', tokenB: 'DFI' })
    await alice.generate(1)
    await alice.poolpair.add({
      a: { symbol: 'DUSD', amount: 25000 },
      b: { symbol: 'DFI', amount: 10000 }
    })
    await alice.generate(1)

    // Loan scheme
    await alice.container.call('createloanscheme', [110, 1, 'default'])
    await alice.generate(1)

    await alice.container.call('createloanscheme', [100, 1, 'scheme'])
    await alice.generate(1)
    // Price oracle
    const addr = await alice.generateAddress()
    const priceFeeds = [
      {
        token: 'DFI',
        currency: 'USD'
      },
      {
        token: 'BTC',
        currency: 'USD'
      },
      {
        token: 'AAPL',
        currency: 'USD'
      },
      {
        token: 'TSLA',
        currency: 'USD'
      },
      {
        token: 'MSFT',
        currency: 'USD'
      },
      {
        token: 'FB',
        currency: 'USD'
      }
    ]
    const oracleId = await alice.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await alice.generate(1)
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '1@DFI',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '10000@BTC',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@AAPL',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@TSLA',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@MSFT',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@FB',
        currency: 'USD'
      }]
    })
    await alice.generate(1)

    // Collateral tokens
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

    // Loan token
    await alice.rpc.loan.setLoanToken({
      symbol: 'AAPL',
      fixedIntervalPriceId: 'AAPL/USD'
    })
    await alice.generate(1)
    await alice.token.mint({
      symbol: 'AAPL',
      amount: 50000
    })
    await alice.generate(1)

    await alice.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await alice.generate(1)
    await alice.token.mint({
      symbol: 'TSLA',
      amount: 50000
    })
    await alice.generate(1)

    // Create and add TSLA-DUSD
    await alice.poolpair.create({
      tokenA: 'TSLA',
      tokenB: 'DUSD',
      ownerAddress: aliceColAddr
    })
    await alice.generate(1)
    await alice.poolpair.add({
      a: { symbol: 'TSLA', amount: 20000 },
      b: { symbol: 'DUSD', amount: 10000 }
    })
    await alice.generate(1)

    await alice.rpc.loan.setLoanToken({
      symbol: 'MSFT',
      fixedIntervalPriceId: 'MSFT/USD'
    })
    await alice.generate(1)
    await alice.token.mint({
      symbol: 'MSFT',
      amount: 50000
    })
    await alice.generate(1)

    await alice.rpc.loan.setLoanToken({
      symbol: 'FB',
      fixedIntervalPriceId: 'FB/USD'
    })
    await alice.generate(1)
    await alice.token.mint({
      symbol: 'FB',
      amount: 50000
    })
    await alice.generate(1)

    // Vault 1
    // CreateVault, [UpdateVault], DepositToVault, TakeLoan and AuctionBid
    const vaultAddress1 = await alice.generateAddress()
    createVaultTxId = await alice.rpc.container.call('createvault', [await alice.generateAddress(), 'default'])
    await alice.generate(1)
    createVaultBlockHeight = await alice.container.getBlockCount()

    updateVaultTxId = await alice.rpc.container.call('updatevault',
      [createVaultTxId, { ownerAddress: vaultAddress1, loanSchemeId: 'scheme' }]
    )
    await alice.generate(1)
    updateVaultBlockHeight = await alice.container.getBlockCount()

    depositVault1TxId = await alice.container.call('deposittovault', [createVaultTxId, aliceColAddr, '10000@DFI'])
    await alice.generate(1)
    depositVault1BlockHeight = await alice.container.getBlockCount()

    depositVault2TxId = await alice.container.call('deposittovault', [createVaultTxId, aliceColAddr, '0.5@BTC'])
    await alice.generate(1)
    depositVault2BlockHeight = await alice.container.getBlockCount()

    takeLoanTxId = await alice.container.call('takeloan', [{
      vaultId: createVaultTxId,
      amounts: '7500@AAPL'
    }])
    await alice.generate(1)
    takeLoanBlockHeight = await alice.container.getBlockCount()

    // Vault 2
    // CreateVault, DepositToVault, TakeLoan, [PayBackLoan] and AuctionBid
    vaultId2 = await alice.rpc.container.call('createvault', [await alice.generateAddress(), 'scheme'])
    await alice.generate(1)

    await alice.container.call('deposittovault', [vaultId2, aliceColAddr, '20000@0DFI'])
    await alice.generate(1)
    await alice.container.call('deposittovault', [vaultId2, aliceColAddr, '1@BTC'])
    await alice.generate(1)

    await alice.container.call('takeloan', [{
      vaultId: vaultId2,
      amounts: '15000@TSLA'
    }])
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['100@TSLA'] })
    await alice.generate(1)

    await alice.container.call('paybackloan', [{ vaultId: vaultId2, from: aliceColAddr, amounts: '100@TSLA' }])
    await alice.generate(1)
    await tGroup.waitForSync()

    // Vault 3
    // CreateVault, DepositToVault, [WithdrawFromVault], TakeLoan and AuctionBid
    vaultId3 = await bob.rpc.container.call('createvault', [await bob.generateAddress(), 'scheme'])
    await bob.generate(1)

    await bob.container.call('deposittovault', [vaultId3, bobColAddr, '40000@DFI'])
    await bob.generate(1)
    await bob.container.call('deposittovault', [vaultId3, bobColAddr, '1.5@BTC'])
    await bob.generate(1)

    await bob.container.call('withdrawfromvault', [vaultId3, bobColAddr, '10000@DFI'])
    await bob.generate(1)

    await bob.container.call('takeloan', [{
      vaultId: vaultId3,
      amounts: '22500@MSFT'
    }])
    await bob.generate(1)

    // Vault 4
    // CreateVault, DepositToVault, TakeLoan and AuctionBid, [CloseVault]
    vaultId4 = await bob.rpc.container.call('createvault', [await bob.generateAddress(), 'scheme'])
    await bob.generate(1)

    await bob.container.call('deposittovault', [vaultId4, bobColAddr, '40000@DFI'])
    await bob.generate(1)
    await bob.container.call('deposittovault', [vaultId4, bobColAddr, '2@BTC'])
    await bob.generate(1)

    await bob.container.call('takeloan', [{
      vaultId: vaultId4,
      amounts: '30000@FB'
    }])
    await bob.generate(1)
    await tGroup.waitForSync()

    {
      // When there is no liquidation occurs
      const data = await alice.container.call('listauctions', [])
      expect(data).toStrictEqual([])

      const vault1 = await alice.rpc.loan.getVault(createVaultTxId)
      expect(vault1.state).toStrictEqual('active')

      const vault2 = await alice.rpc.loan.getVault(vaultId2)
      expect(vault2.state).toStrictEqual('active')

      const vault3 = await alice.rpc.loan.getVault(vaultId3)
      expect(vault3.state).toStrictEqual('active')

      const vault4 = await alice.rpc.loan.getVault(vaultId4)
      expect(vault4.state).toStrictEqual('active')
    }
    // Going to liquidate the vaults by price increase of the loan tokens
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2.2@AAPL',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.container.waitForActivePrice('AAPL/USD', '2.2')
    inLiquidationBlockHeight1 = await alice.container.getBlockCount()

    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2.2@TSLA',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.container.waitForActivePrice('TSLA/USD', '2.2')

    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2.2@MSFT',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.container.waitForActivePrice('MSFT/USD', '2.2')
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2.2@FB',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.container.waitForActivePrice('FB/USD', '2.2')

    // When there is liquidation
    const list = await alice.container.call('listauctions', [])
    list.forEach((l: { state: any }) =>
      expect(l.state).toStrictEqual('inLiquidation')
    )

    // Check current block
    {
      const currentBlock: number = await alice.container.getBlockCount()
      expect(currentBlock).toStrictEqual(inLiquidationBlockHeight1 + 36)
    }
    // After 36 blocks, the current auction ended and vault1 re-enter another auction
    priceActivationBlockHeight1 = await inLiquidationBlockHeight1 + 36 // After reentering, the vault is active in the first block
    inLiquidationBlockHeight2 = await inLiquidationBlockHeight1 + 37 // After reentering, the vault is inLiquidation in the second block

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['7875@AAPL'] })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['15750@TSLA'] })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['23625@MSFT'] })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['33500@FB'] })
    await alice.generate(1)

    auctionBidTxId = await alice.container.call('placeauctionbid', [createVaultTxId, 0, aliceColAddr, '7875@AAPL'])
    expect(typeof auctionBidTxId).toStrictEqual('string')
    expect(auctionBidTxId.length).toStrictEqual(64)
    await alice.generate(1)
    auctionBidBlockHeight = await alice.container.getBlockCount()

    {
      const txid = await alice.container.call('placeauctionbid', [vaultId2, 1, aliceColAddr, '15750@TSLA'])
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
      await alice.generate(1)
    }

    await tGroup.waitForSync()

    {
      const txid = await bob.container.call('placeauctionbid', [vaultId3, 0, bobColAddr, '23625@MSFT'])
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
      await bob.generate(1)
    }

    // Bid all the batches so it is able to be closed
    {
      const txid = await bob.container.call('placeauctionbid', [vaultId4, 0, bobColAddr, '5251@FB'])
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
      await bob.generate(1)
    }

    {
      const txid = await bob.container.call('placeauctionbid', [vaultId4, 1, bobColAddr, '5251@FB'])
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
      await bob.generate(1)
    }

    {
      const txid = await bob.container.call('placeauctionbid', [vaultId4, 2, bobColAddr, '5251@FB'])
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
      await bob.generate(1)
    }

    {
      const txid = await bob.container.call('placeauctionbid', [vaultId4, 3, bobColAddr, '5251@FB'])
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
      await bob.generate(1)
    }

    {
      const txid = await bob.container.call('placeauctionbid', [vaultId4, 4, bobColAddr, '5251@FB'])
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
      await bob.generate(1)
    }

    {
      const txid = await bob.container.call('placeauctionbid', [vaultId4, 5, bobColAddr, '5251@FB'])
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
      await bob.generate(1)
    }

    {
      const txid = await bob.container.call('placeauctionbid', [vaultId4, 6, bobColAddr, '1@FB'])
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
      await bob.generate(1)
    }

    await bob.generate(23) // Generate 23 more blocks so vaultId can enter another auction again

    // Check current block
    {
      const currentBlock: number = await alice.container.getBlockCount()
      expect(currentBlock).toStrictEqual(inLiquidationBlockHeight2 + 36)
    }
    // After 36 blocks, the current auction ended and vault1 re-enter another auction
    priceActivationBlockHeight2 = await inLiquidationBlockHeight2 + 36 // After reentering, the vault is active in the first block
    inLiquidationBlockHeight3 = await inLiquidationBlockHeight2 + 37 // After reentering, the vault is inLiquidation in the second block

    await bob.container.generate(36) // 144 / 4 = 6 hours

    await bob.rpc.loan.closeVault({
      vaultId: vaultId4,
      to: bobColAddr
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  function validateType (vaultResult: any): void {
    vaultResult.forEach((data: any) => {
      if (data.type === 'Vault' || data.type === 'UpdateVault') {
        expect(data).toStrictEqual({
          blockHeight: expect.any(Number),
          blockHash: expect.any(String),
          blockTime: expect.any(Number),
          type: expect.any(String),
          txid: expect.any(String),
          loanScheme: expect.any(Object)
        })

        expect(data.loanScheme).toStrictEqual({
          id: expect.any(String),
          rate: expect.any(Number),
          ratio: expect.any(Number)
        })

        return
      }

      if (data.type === 'DepositToVault' ||
        data.type === 'PaybackLoan' ||
        data.type === 'TakeLoan' ||
        data.type === 'WithdrawFromVault' ||
        data.type === 'AuctionBid'
      ) {
        expect(data).toStrictEqual({
          address: expect.any(String),
          blockHeight: expect.any(Number),
          blockHash: expect.any(String),
          blockTime: expect.any(Number),
          type: expect.any(String),
          txn: expect.any(Number),
          txid: expect.any(String),
          amounts: expect.any(Array)
        })

        data.amounts.forEach((amount: any) => {
          expect(typeof amount).toBe('string')
        })

        return
      }

      if (data.type === '' || data.type === undefined) {
        expect(data).toStrictEqual({
          blockHeight: expect.any(Number),
          blockHash: expect.any(String),
          blockTime: expect.any(Number),
          txid: expect.any(String),
          vaultSnapshot: expect.any(Object)
        })

        if (data.vaultSnapshot.state === 'inLiquidation') {
          expect(data.vaultSnapshot).toStrictEqual({
            state: expect.any(String),
            collateralAmounts: expect.any(Array),
            collateralValue: expect.any(Number),
            collateralRatio: expect.any(Number),
            batches: expect.any(Object)
          })

          data.vaultSnapshot.batches.forEach((batch: any) => {
            expect(batch).toStrictEqual({
              index: expect.any(Number),
              collaterals: expect.any(Array),
              loan: expect.any(String)
            })

            batch.collaterals.forEach((collateral: any) => {
              expect(typeof collateral).toBe('string')
            })
          })
        } else { // state = 'Active'
          expect(data.vaultSnapshot).toStrictEqual({
            state: expect.any(String),
            collateralAmounts: expect.any(Array),
            collateralValue: expect.any(Number),
            collateralRatio: expect.any(Number)
          })
        }
        return
      }

      throw new Error('The Loan type is invalid')
    })
  }

  describe('listVaultHistory without pagination', () => {
    let vaultHistory1: any
    let vaultHistory2: any
    let vaultHistory3: any
    let vaultHistory4: any

    beforeAll(async () => {
      vaultHistory1 = (await alice.rpc.loan.listVaultHistory(createVaultTxId)).reverse()
      vaultHistory2 = (await alice.rpc.loan.listVaultHistory(vaultId2)).reverse()
      vaultHistory3 = (await alice.rpc.loan.listVaultHistory(vaultId3)).reverse()
      vaultHistory4 = (await alice.rpc.loan.listVaultHistory(vaultId4)).reverse()

      validateType(vaultHistory1)
      validateType(vaultHistory2)
      validateType(vaultHistory3)
      validateType(vaultHistory4)
    })

    it('should listVaultHistory', async () => {
      // Create vault
      expect(vaultHistory1[0].type).toStrictEqual('Vault')
      expect(vaultHistory1[0].txid).toStrictEqual(createVaultTxId)
      expect(vaultHistory1[0].blockHeight).toStrictEqual(createVaultBlockHeight)
      expect(vaultHistory1[0].loanScheme).toStrictEqual({ id: 'default', rate: 100000000, ratio: 110 })

      // Update vault
      expect(vaultHistory1[1].type).toStrictEqual('UpdateVault')
      expect(vaultHistory1[1].txid).toStrictEqual(updateVaultTxId)
      expect(vaultHistory1[1].blockHeight).toStrictEqual(updateVaultBlockHeight)
      expect(vaultHistory1[1].loanScheme).toStrictEqual({ id: 'scheme', rate: 100000000, ratio: 100 })

      // 1st Deposit
      expect(vaultHistory1[2].type).toStrictEqual('DepositToVault')
      expect(vaultHistory1[2].address).toStrictEqual(aliceColAddr)
      expect(vaultHistory1[2].txn).toStrictEqual(2)
      expect(vaultHistory1[2].txid).toStrictEqual(depositVault1TxId)
      expect(vaultHistory1[2].blockHeight).toStrictEqual(depositVault1BlockHeight)
      expect(vaultHistory1[2].amounts).toStrictEqual(['-10000.00000000@DFI']) // Deposit 10000 DFI

      // 2nd Deposit
      expect(vaultHistory1[3].type).toStrictEqual('DepositToVault')
      expect(vaultHistory1[3].address).toStrictEqual(aliceColAddr)
      expect(vaultHistory1[3].txn).toStrictEqual(1)
      expect(vaultHistory1[3].txid).toStrictEqual(depositVault2TxId)
      expect(vaultHistory1[3].blockHeight).toStrictEqual(depositVault2BlockHeight)
      expect(vaultHistory1[3].amounts).toStrictEqual(['-0.50000000@BTC']) // Deposit 0.5 BTC

      // Take loan
      expect(vaultHistory1[4].type).toStrictEqual('TakeLoan')
      expect(vaultHistory1[4].txn).toStrictEqual(2)
      expect(vaultHistory1[4].txid).toStrictEqual(takeLoanTxId)
      expect(vaultHistory1[4].blockHeight).toStrictEqual(takeLoanBlockHeight)
      expect(vaultHistory1[4].amounts).toStrictEqual(['7500.00000000@AAPL']) // TakeLoan 7500 AAPL

      // When the price is liquidated
      expect(vaultHistory1[5].vaultSnapshot.state).toStrictEqual('inLiquidation')
      expect(vaultHistory1[5].txid).toStrictEqual('') // No tx for liquidation
      expect(vaultHistory1[5].blockHeight).toStrictEqual(inLiquidationBlockHeight1)
      expect(vaultHistory1[5].collateralAmounts).toBeUndefined() // No collateralAmounts for liquidation
      expect(vaultHistory1[5].collateralValue).toBeUndefined() // No collateralValue for liquidation
      expect(vaultHistory1[5].vaultSnapshot.batches).toStrictEqual([
        {
          index: 0,
          collaterals: [
            '6666.66660000@DFI',
            '0.33333333@BTC'
          ],
          loan: '5000.02468362@AAPL'
        },
        {
          index: 1,
          collaterals: [
            '3333.33340000@DFI',
            '0.16666667@BTC'
          ],
          loan: '2500.01241682@AAPL'
        }
      ])

      expect(vaultHistory1[6].vaultSnapshot.state).toStrictEqual('active')
      expect(vaultHistory1[6].txid).toStrictEqual('') // No tx for price activation
      expect(vaultHistory1[6].blockHeight).toStrictEqual(priceActivationBlockHeight1)
      expect(vaultHistory1[6].vaultSnapshot).toStrictEqual({
        state: 'active',
        collateralAmounts: [
          '10000.00000000@DFI',
          '0.50000000@BTC'
        ],
        collateralValue: 15000,
        collateralRatio: 0
      })

      expect(vaultHistory1[7].vaultSnapshot.state).toStrictEqual('inLiquidation')
      expect(vaultHistory1[7].txid).toStrictEqual('') // No tx for liquidation
      expect(vaultHistory1[7].blockHeight).toStrictEqual(inLiquidationBlockHeight2)
      expect(vaultHistory1[7].collateralAmounts).toBeUndefined() // No collateralAmounts for liquidation
      expect(vaultHistory1[7].collateralValue).toBeUndefined() // No collateralValue for liquidation
      expect(vaultHistory1[7].vaultSnapshot.batches).toStrictEqual([
        {
          index: 0,
          collaterals: [
            '6666.66660000@DFI',
            '0.33333333@BTC'
          ],
          loan: '5000.02563491@AAPL'
        },
        {
          index: 1,
          collaterals: [
            '3333.33340000@DFI',
            '0.16666667@BTC'
          ],
          loan: '2500.01289246@AAPL'
        }
      ])

      // Auction bid
      expect(vaultHistory1[8].type).toStrictEqual('AuctionBid')
      expect(vaultHistory1[8].address).toStrictEqual(aliceColAddr)
      expect(vaultHistory1[8].txn).toStrictEqual(1)
      expect(vaultHistory1[8].txid).toStrictEqual(auctionBidTxId)
      expect(vaultHistory1[8].blockHeight).toStrictEqual(auctionBidBlockHeight)
      expect(vaultHistory1[8].amounts).toStrictEqual(['-7875.00000000@AAPL'])

      expect(vaultHistory1[9].vaultSnapshot.state).toStrictEqual('active')
      expect(vaultHistory1[9].txid).toStrictEqual('') // No tx for price activation
      expect(vaultHistory1[9].blockHeight).toStrictEqual(priceActivationBlockHeight2)
      expect(vaultHistory1[9].vaultSnapshot).toStrictEqual({
        state: 'active',
        collateralAmounts: [
          '3333.33340000@DFI',
          '0.16666667@BTC'
        ],
        collateralValue: 5000.0001,
        collateralRatio: 0
      })

      expect(vaultHistory1[10].vaultSnapshot.state).toStrictEqual('inLiquidation')
      expect(vaultHistory1[10].txid).toStrictEqual('') // No tx for liquidation
      expect(vaultHistory1[10].blockHeight).toStrictEqual(inLiquidationBlockHeight3)
      expect(vaultHistory1[10].collateralAmounts).toBeUndefined() // No collateralAmounts for liquidation
      expect(vaultHistory1[10].collateralValue).toBeUndefined() // No collateralValue for liquidation
      expect(vaultHistory1[10].vaultSnapshot.batches).toStrictEqual([
        {
          index: 0,
          collaterals: [
            '3333.33340000@DFI',
            '0.16666667@BTC'
          ],
          loan: '2500.01336810@AAPL'
        }
      ])
    })

    // it('should listAuctionHistory with owner = mine', async () => {
    //   {
    //     const auctionhistory1 = await alice.rpc.loan.listAuctionHistory() // default to mine
    //     const auctionhistory2 = await alice.rpc.loan.listAuctionHistory('mine')
    //     expect(auctionhistory1).toStrictEqual(auctionhistory2)
    //     expect(auctionhistory1.length).toStrictEqual(2)
    //     {
    //       const vault1 = auctionhistory1.find(h => h.vaultId === vaultId1)
    //       expect(vault1).toStrictEqual(
    //         {
    //           winner: aliceColAddr,
    //           blockHeight: expect.any(Number),
    //           blockHash: expect.any(String),
    //           blockTime: expect.any(Number),
    //           vaultId: vaultId1,
    //           batchIndex: 0,
    //           auctionBid: '7875.00000000@AAPL',
    //           auctionWon: ['6666.66660000@DFI', '0.33333333@BTC']
    //         }
    //       )
    //     }
    //     {
    //       const vault1 = auctionhistory1.find(h => h.vaultId === vaultId2)
    //       expect(vault1).toStrictEqual(
    //         {
    //           winner: aliceColAddr,
    //           blockHeight: expect.any(Number),
    //           blockHash: expect.any(String),
    //           blockTime: expect.any(Number),
    //           vaultId: vaultId2,
    //           batchIndex: 1,
    //           auctionBid: '15750.00000000@TSLA',
    //           auctionWon: ['6666.66660000@DFI', '0.33333333@BTC']
    //         }
    //       )
    //     }
    //   }
    //   {
    //     const auctionhistory1 = await bob.rpc.loan.listAuctionHistory() // default to mine
    //     const auctionhistory2 = await bob.rpc.loan.listAuctionHistory('mine')
    //     expect(auctionhistory1).toStrictEqual(auctionhistory2)
    //     expect(auctionhistory1.length).toStrictEqual(2)
    //     {
    //       const vault1 = auctionhistory1.find(h => h.vaultId === vaultId3)
    //       expect(vault1).toStrictEqual(
    //         {
    //           winner: bobColAddr,
    //           blockHeight: expect.any(Number),
    //           blockHash: expect.any(String),
    //           blockTime: expect.any(Number),
    //           vaultId: vaultId3,
    //           batchIndex: 0,
    //           auctionBid: '23625.00000000@MSFT',
    //           auctionWon: ['6666.66660000@DFI', '0.33333333@BTC']
    //         }
    //       )
    //     }
    //     {
    //       const vault1 = auctionhistory1.find(h => h.vaultId === vaultId4)
    //       expect(vault1).toStrictEqual(
    //         {
    //           winner: bobColAddr,
    //           blockHeight: expect.any(Number),
    //           blockHash: expect.any(String),
    //           blockTime: expect.any(Number),
    //           vaultId: vaultId4,
    //           batchIndex: 1,
    //           auctionBid: '31500.00000000@FB',
    //           auctionWon: ['6666.66640000@DFI', '0.33333332@BTC']
    //         }
    //       )
    //     }
    //   }
    // })
    //
    // it('should listAuctionHistory with owner = all', async () => {
    //   const data = await alice.rpc.loan.listAuctionHistory('all')
    //   expect(data.length).toStrictEqual(4)
    //
    //   const data1 = data.find(d => d.vaultId === vaultId1)
    //   expect(data1).toBeDefined()
    //
    //   const data2 = data.find(d => d.vaultId === vaultId2)
    //   expect(data2).toBeDefined()
    //
    //   const data3 = data.find(d => d.vaultId === vaultId3)
    //   expect(data3).toBeDefined()
    //
    //   const data4 = data.find(d => d.vaultId === vaultId4)
    //   expect(data4).toBeDefined()
    // })
    //
    // it('should listAuctionHistory with owner = address', async () => {
    //   {
    //     const data = await alice.rpc.loan.listAuctionHistory(aliceColAddr)
    //     const data1 = data.find(d => d.vaultId === vaultId1)
    //     expect(data1).toBeDefined()
    //
    //     const data2 = data.find(d => d.vaultId === vaultId2)
    //     expect(data2).toBeDefined()
    //
    //     const data3 = data.find(d => d.vaultId === vaultId3)
    //     expect(data3).toBeUndefined()
    //
    //     const data4 = data.find(d => d.vaultId === vaultId4)
    //     expect(data4).toBeUndefined()
    //   }
    //
    //   {
    //     const data = await alice.rpc.loan.listAuctionHistory(bobColAddr)
    //     const data1 = data.find(d => d.vaultId === vaultId1)
    //     expect(data1).toBeUndefined()
    //
    //     const data2 = data.find(d => d.vaultId === vaultId2)
    //     expect(data2).toBeUndefined()
    //
    //     const data3 = data.find(d => d.vaultId === vaultId3)
    //     expect(data3).toBeDefined()
    //
    //     const data4 = data.find(d => d.vaultId === vaultId4)
    //     expect(data4).toBeDefined()
    //   }
    // })
  })

  // describe('listAuctionHistory with pagination', () => {
  //   let auctionHistoryArr: ListAuctionHistoryDetail[]
  //   let aliceAuctionHistoryArr: ListAuctionHistoryDetail[]
  //   let bobAuctionHistoryArr: ListAuctionHistoryDetail[]
  //
  //   beforeAll(async () => {
  //     auctionHistoryArr = await alice.rpc.loan.listAuctionHistory('all')
  //     aliceAuctionHistoryArr = await alice.rpc.loan.listAuctionHistory('mine')
  //     bobAuctionHistoryArr = await bob.rpc.loan.listAuctionHistory('mine')
  //   })
  //
  //   it('should listAuctionHistory with maxBlockHeight only', async () => {
  //     // All
  //     // ListAuctionHistory for maxBlockHeight of first vault
  //     {
  //       const page = await alice.rpc.loan.listAuctionHistory('all',
  //         { maxBlockHeight: auctionHistoryArr[0].blockHeight }
  //       )
  //       expect(page.length).toStrictEqual(4)
  //       expect(page[0].vaultId).toStrictEqual(auctionHistoryArr[0].vaultId)
  //       expect(page[1].vaultId).toStrictEqual(auctionHistoryArr[1].vaultId)
  //       expect(page[2].vaultId).toStrictEqual(auctionHistoryArr[2].vaultId)
  //       expect(page[3].vaultId).toStrictEqual(auctionHistoryArr[3].vaultId)
  //     }
  //
  //     // ListAuctionHistory for maxBlockHeight of forth vault
  //     {
  //       const page = await alice.rpc.loan.listAuctionHistory('all',
  //         { maxBlockHeight: auctionHistoryArr[3].blockHeight }
  //       )
  //       expect(page.length).toStrictEqual(1)
  //       expect(page[0].vaultId).toStrictEqual(auctionHistoryArr[3].vaultId)
  //     }
  //
  //     // Mine
  //     // ListAuctionHistory for maxBlockHeight of first vault for Alice
  //     {
  //       const page = await alice.rpc.loan.listAuctionHistory('mine',
  //         { maxBlockHeight: aliceAuctionHistoryArr[0].blockHeight }
  //       )
  //       expect(page.length).toStrictEqual(2)
  //       expect(page[0].vaultId).toStrictEqual(aliceAuctionHistoryArr[0].vaultId)
  //       expect(page[1].vaultId).toStrictEqual(aliceAuctionHistoryArr[1].vaultId)
  //     }
  //
  //     // ListAuctionHistory for maxBlockHeight of second vault for Alice
  //     {
  //       const page = await alice.rpc.loan.listAuctionHistory('mine',
  //         { maxBlockHeight: aliceAuctionHistoryArr[1].blockHeight }
  //       )
  //       expect(page.length).toStrictEqual(1)
  //       expect(page[0].vaultId).toStrictEqual(aliceAuctionHistoryArr[1].vaultId)
  //     }
  //
  //     // Address
  //     // ListAuctionHistory for maxBlockHeight of first vault for Bob
  //     {
  //       const page = await bob.rpc.loan.listAuctionHistory(bobColAddr,
  //         { maxBlockHeight: bobAuctionHistoryArr[0].blockHeight }
  //       )
  //       expect(page.length).toStrictEqual(2)
  //       expect(page[0].vaultId).toStrictEqual(bobAuctionHistoryArr[0].vaultId)
  //       expect(page[1].vaultId).toStrictEqual(bobAuctionHistoryArr[1].vaultId)
  //     }
  //
  //     // ListAuctionHistory for maxBlockHeight of second vault for Bob
  //     {
  //       const page = await bob.rpc.loan.listAuctionHistory(bobColAddr,
  //         { maxBlockHeight: bobAuctionHistoryArr[1].blockHeight }
  //       )
  //       expect(page.length).toStrictEqual(1)
  //       expect(page[0].vaultId).toStrictEqual(bobAuctionHistoryArr[1].vaultId)
  //     }
  //   })
  //
  //   it('should not listAuctionHistory with vaultId only', async () => { // This test shows that we can not use vaultId only for the pagination start point as the DB composite index starts with maxBlockHeight. Need to pass maxBlockHeight and vaultId together.
  //     {
  //       // All
  //       const page = await alice.rpc.loan.listAuctionHistory('all',
  //         { vaultId: auctionHistoryArr[2].vaultId }
  //       )
  //       expect(page.length).toStrictEqual(4)
  //     }
  //
  //     {
  //       // Mine for Alice
  //       const page = await alice.rpc.loan.listAuctionHistory('mine',
  //         { vaultId: aliceAuctionHistoryArr[1].vaultId }
  //       )
  //       expect(page.length).toStrictEqual(2)
  //     }
  //
  //     {
  //       // Address for Bob
  //       const page = await bob.rpc.loan.listAuctionHistory(bobColAddr,
  //         { vaultId: bobAuctionHistoryArr[1].vaultId }
  //       )
  //       expect(page.length).toStrictEqual(2)
  //     }
  //   })
  //
  //   it('should not listAuctionHistory with index only', async () => { // This test shows that we can not use index only for the pagination start point as the DB composite index starts with maxBlockHeight.
  //     {
  //       // All
  //       const page = await alice.rpc.loan.listAuctionHistory('all',
  //         { index: 1 }
  //       )
  //
  //       expect(page.length).toStrictEqual(4)
  //     }
  //
  //     {
  //       // Mine for Alice
  //       const page = await alice.rpc.loan.listAuctionHistory('mine',
  //         { index: 5 }
  //       )
  //
  //       expect(page.length).toStrictEqual(2)
  //     }
  //
  //     {
  //       // Address for Bob
  //       const page = await bob.rpc.loan.listAuctionHistory(bobColAddr,
  //         { index: 3 }
  //       )
  //
  //       expect(page.length).toStrictEqual(2)
  //     }
  //   })
  //
  //   it('should listAuctionHistory with limit only', async () => {
  //     {
  //       // All
  //       // ListAuctionHistory with limit < size
  //       const pageLimit3 = await alice.rpc.loan.listAuctionHistory('all', { limit: 3 })
  //       expect(pageLimit3.length).toStrictEqual(3)
  //       expect(pageLimit3[0].vaultId).toStrictEqual(auctionHistoryArr[0].vaultId)
  //       expect(pageLimit3[1].vaultId).toStrictEqual(auctionHistoryArr[1].vaultId)
  //       expect(pageLimit3[2].vaultId).toStrictEqual(auctionHistoryArr[2].vaultId)
  //
  //       // ListAuctionHistory with limit = size
  //       const pageLimit4 = await alice.rpc.loan.listAuctionHistory('all', { limit: 4 })
  //       expect(pageLimit4.length).toStrictEqual(4)
  //       expect(pageLimit4[0].vaultId).toStrictEqual(auctionHistoryArr[0].vaultId)
  //       expect(pageLimit4[1].vaultId).toStrictEqual(auctionHistoryArr[1].vaultId)
  //       expect(pageLimit4[2].vaultId).toStrictEqual(auctionHistoryArr[2].vaultId)
  //       expect(pageLimit4[3].vaultId).toStrictEqual(auctionHistoryArr[3].vaultId)
  //
  //       // ListAuctionHistory with limit > size
  //       const pageLimit5 = await alice.rpc.loan.listAuctionHistory('all', { limit: 5 })
  //       expect(pageLimit5.length).toStrictEqual(4)
  //       expect(pageLimit5).toStrictEqual(pageLimit4)
  //     }
  //
  //     {
  //       // Mine
  //       // ListAuctionHistory with limit < size for Alice
  //       const pageLimit1 = await alice.rpc.loan.listAuctionHistory('mine', { limit: 1 })
  //       expect(pageLimit1.length).toStrictEqual(1)
  //       expect(pageLimit1[0].vaultId).toStrictEqual(aliceAuctionHistoryArr[0].vaultId)
  //
  //       // ListAuctionHistory with limit = size for Alice
  //       const pageLimit2 = await alice.rpc.loan.listAuctionHistory('mine', { limit: 2 })
  //       expect(pageLimit2.length).toStrictEqual(2)
  //       expect(pageLimit2[0].vaultId).toStrictEqual(aliceAuctionHistoryArr[0].vaultId)
  //       expect(pageLimit2[1].vaultId).toStrictEqual(aliceAuctionHistoryArr[1].vaultId)
  //
  //       // ListAuctionHistory with limit > size for Alice
  //       const pageLimit3 = await alice.rpc.loan.listAuctionHistory('mine', { limit: 3 })
  //       expect(pageLimit3.length).toStrictEqual(2)
  //       expect(pageLimit3).toStrictEqual(pageLimit2)
  //     }
  //
  //     {
  //       // Address
  //       // ListAuctionHistory with limit < size for Bob
  //       const pageLimit1 = await bob.rpc.loan.listAuctionHistory(bobColAddr, { limit: 1 })
  //       expect(pageLimit1.length).toStrictEqual(1)
  //       expect(pageLimit1[0].vaultId).toStrictEqual(bobAuctionHistoryArr[0].vaultId)
  //
  //       // ListAuctionHistory with limit = size for Bob
  //       const pageLimit2 = await bob.rpc.loan.listAuctionHistory(bobColAddr, { limit: 2 })
  //       expect(pageLimit2.length).toStrictEqual(2)
  //       expect(pageLimit2[0].vaultId).toStrictEqual(bobAuctionHistoryArr[0].vaultId)
  //       expect(pageLimit2[1].vaultId).toStrictEqual(bobAuctionHistoryArr[1].vaultId)
  //
  //       // ListAuctionHistory with limit > size for Bob
  //       const pageLimit3 = await bob.rpc.loan.listAuctionHistory(bobColAddr, { limit: 3 })
  //       expect(pageLimit3.length).toStrictEqual(2)
  //       expect(pageLimit3).toStrictEqual(pageLimit2)
  //     }
  //   })
  //
  //   it('should listAuctions with maxBlockHeight and vaultId', async () => {
  //     // All
  //     // ListAuctionHistory for maxBlockHeight and vaultId of second vault
  //     {
  //       const page = await alice.rpc.loan.listAuctionHistory('all',
  //         { maxBlockHeight: auctionHistoryArr[1].blockHeight, vaultId: auctionHistoryArr[1].vaultId }
  //       )
  //       expect(page.length).toStrictEqual(3)
  //       expect(page[0].vaultId).toStrictEqual(auctionHistoryArr[1].vaultId)
  //       expect(page[1].vaultId).toStrictEqual(auctionHistoryArr[2].vaultId)
  //       expect(page[2].vaultId).toStrictEqual(auctionHistoryArr[3].vaultId)
  //     }
  //
  //     // Mine for Alice
  //     // ListAuctionHistory for maxBlockHeight and vaultId of second vault
  //     {
  //       const page = await alice.rpc.loan.listAuctionHistory('mine',
  //         { maxBlockHeight: aliceAuctionHistoryArr[1].blockHeight, vaultId: aliceAuctionHistoryArr[1].vaultId }
  //       )
  //       expect(page.length).toStrictEqual(1)
  //       expect(page[0].vaultId).toStrictEqual(aliceAuctionHistoryArr[1].vaultId)
  //     }
  //
  //     // Address for Bob
  //     // ListAuctionHistory for maxBlockHeight and vaultId of second vault
  //     {
  //       const page = await bob.rpc.loan.listAuctionHistory(bobColAddr,
  //         { maxBlockHeight: bobAuctionHistoryArr[1].blockHeight, vaultId: bobAuctionHistoryArr[1].vaultId }
  //       )
  //       expect(page.length).toStrictEqual(1)
  //       expect(page[0].vaultId).toStrictEqual(bobAuctionHistoryArr[1].vaultId)
  //     }
  //   })
  //
  //   it('should listAuctions with maxBlockHeight and index', async () => {
  //     // All
  //     // ListAuctionHistory for maxBlockHeight and index of second vault
  //     {
  //       const page = await alice.rpc.loan.listAuctionHistory('all',
  //         { maxBlockHeight: auctionHistoryArr[1].blockHeight, index: auctionHistoryArr[1].batchIndex }
  //       )
  //       expect(page.length).toStrictEqual(3)
  //       expect(page[0].vaultId).toStrictEqual(auctionHistoryArr[1].vaultId)
  //       expect(page[1].vaultId).toStrictEqual(auctionHistoryArr[2].vaultId)
  //       expect(page[2].vaultId).toStrictEqual(auctionHistoryArr[3].vaultId)
  //     }
  //
  //     // Mine for Alice
  //     // ListAuctionHistory for maxBlockHeight and index of second vault
  //     {
  //       const page = await alice.rpc.loan.listAuctionHistory('mine',
  //         { maxBlockHeight: aliceAuctionHistoryArr[1].blockHeight, index: aliceAuctionHistoryArr[1].batchIndex }
  //       )
  //       expect(page.length).toStrictEqual(1)
  //       expect(page[0].vaultId).toStrictEqual(aliceAuctionHistoryArr[1].vaultId)
  //     }
  //
  //     // Address for Bob
  //     // ListAuctionHistory for maxBlockHeight and index of second vault
  //     {
  //       const page = await bob.rpc.loan.listAuctionHistory(bobColAddr,
  //         { maxBlockHeight: bobAuctionHistoryArr[1].blockHeight, index: bobAuctionHistoryArr[1].batchIndex }
  //       )
  //       expect(page.length).toStrictEqual(1)
  //       expect(page[0].vaultId).toStrictEqual(bobAuctionHistoryArr[1].vaultId)
  //     }
  //   })
  //
  //   it('should listAuctions with maxBlockHeight, vaultId, index and limit', async () => {
  //     // All
  //     // ListAuctionHistory for maxBlockHeight, vaultId and index of second vault with limit = 2
  //     {
  //       const page = await alice.rpc.loan.listAuctionHistory('all',
  //         { maxBlockHeight: auctionHistoryArr[1].blockHeight, vaultId: auctionHistoryArr[1].vaultId, index: auctionHistoryArr[1].batchIndex, limit: 2 }
  //       )
  //       expect(page.length).toStrictEqual(2)
  //       expect(page[0].vaultId).toStrictEqual(auctionHistoryArr[1].vaultId)
  //       expect(page[1].vaultId).toStrictEqual(auctionHistoryArr[2].vaultId)
  //     }
  //
  //     // Mine
  //     // ListAuctionHistory for maxBlockHeight, vaultId and index of second vault with limit = 1 for Alice
  //     {
  //       const page = await alice.rpc.loan.listAuctionHistory('mine',
  //         { maxBlockHeight: aliceAuctionHistoryArr[1].blockHeight, vaultId: aliceAuctionHistoryArr[1].vaultId, index: aliceAuctionHistoryArr[1].batchIndex, limit: 1 }
  //       )
  //       expect(page.length).toStrictEqual(1)
  //       expect(page[0].vaultId).toStrictEqual(aliceAuctionHistoryArr[1].vaultId)
  //     }
  //
  //     // Address
  //     // ListAuctionHistory for maxBlockHeight, vaultId and index of second vault with limit = 1 for Bob
  //     {
  //       const page = await bob.rpc.loan.listAuctionHistory(bobColAddr,
  //         { maxBlockHeight: bobAuctionHistoryArr[1].blockHeight, vaultId: bobAuctionHistoryArr[1].vaultId, index: bobAuctionHistoryArr[1].batchIndex, limit: 1 }
  //       )
  //       expect(page.length).toStrictEqual(1)
  //       expect(page[0].vaultId).toStrictEqual(bobAuctionHistoryArr[1].vaultId)
  //     }
  //   })
  // })
})

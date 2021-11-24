import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { GenesisKeys, LoanMasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ListVaultHistory } from '../../../src/category/loan'

describe('Loan listVaultHistory', () => {
  // Below are the tx letters for all the possible loan txs after the vault creation
  // CreateVault            = 'V'
  // UpdateVault            = 'v'
  // DepositToVault         = 'S'
  // TakeLoan               = 'X'
  // PaybackLoan            = 'H'
  // WithdrawFromVault      = 'J'
  // AuctionBid             = 'I'
  // CloseVault             = 'e'
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)
  let aliceColAddr: string
  let bobColAddr: string

  let createVaultTxId: string // 0
  let createVaultBlockHeight: number

  let updateVaultTxId: string // 1
  let updateVaultBlockHeight: number

  let depositVault1TxId: number // 2
  let depositVault1BlockHeight: number

  let depositVault2TxId: string // 3
  let depositVault2BlockHeight: number

  let takeLoanTxId: string // 4
  let takeLoanBlockHeight: number

  let paybackLoanTxId: string // 5 and 6
  let paybackLoanBlockHeight: number

  let withdrawFromVaultTxId: string // 7
  let withdrawFromVaultBlockHeight: number

  let inLiquidationBlockHeight: number // 8

  let auctionBidTxId1: string // 9
  let auctionBidBlockHeight1: number

  let auctionBidTxId2: string // 10
  let auctionBidBlockHeight2: number

  let auctionBidTxId3: string // 11
  let auctionBidBlockHeight3: number

  let priceActivationBlockHeight: number // 12

  let closeVaultTxId: string // 13
  let closeVaultBlockHeight: number

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

    // Create and add AAPL-DUSD
    await alice.poolpair.create({
      tokenA: 'AAPL',
      tokenB: 'DUSD',
      ownerAddress: aliceColAddr
    })
    await alice.generate(1)
    await alice.poolpair.add({
      a: { symbol: 'AAPL', amount: 20000 },
      b: { symbol: 'DUSD', amount: 10000 }
    })
    await alice.generate(1)

    // 0 - Create vault
    createVaultTxId = await alice.rpc.container.call('createvault', [aliceColAddr, 'default'])
    await alice.generate(1)
    createVaultBlockHeight = await alice.container.getBlockCount()

    // 1 - Update vault
    updateVaultTxId = await alice.rpc.container.call('updatevault',
      [createVaultTxId, { ownerAddress: aliceColAddr, loanSchemeId: 'scheme' }]
    )
    await alice.generate(1)
    updateVaultBlockHeight = await alice.container.getBlockCount()

    // 2 - Deposit vault 1
    depositVault1TxId = await alice.container.call('deposittovault', [createVaultTxId, aliceColAddr, '10000@DFI'])
    await alice.generate(1)
    depositVault1BlockHeight = await alice.container.getBlockCount()

    // 3 - Deposit vault 2
    depositVault2TxId = await alice.container.call('deposittovault', [createVaultTxId, aliceColAddr, '0.5@BTC'])
    await alice.generate(1)
    depositVault2BlockHeight = await alice.container.getBlockCount()

    // 4 - Take loan
    takeLoanTxId = await alice.container.call('takeloan', [{
      vaultId: createVaultTxId,
      amounts: '7500@AAPL'
    }])
    await alice.generate(1)
    takeLoanBlockHeight = await alice.container.getBlockCount()

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['500@AAPL'] })
    await alice.generate(1)

    // 5, 6 - Payback loan
    paybackLoanTxId = await alice.container.call('paybackloan', [{
      vaultId: createVaultTxId,
      from: aliceColAddr,
      amounts: '500@AAPL'
    }])
    await alice.generate(1)
    paybackLoanBlockHeight = await alice.container.getBlockCount()

    // 7 - Withdraw from vault
    withdrawFromVaultTxId = await alice.container.call('withdrawfromvault', [createVaultTxId, aliceColAddr, '50@DFI'])
    await alice.generate(1)
    withdrawFromVaultBlockHeight = await alice.container.getBlockCount()

    {
      // When there is no liquidation occurs
      const data = await alice.container.call('listauctions', [])
      expect(data).toStrictEqual([])

      const vault = await alice.rpc.loan.getVault(createVaultTxId)
      expect(vault.state).toStrictEqual('active')
    }

    // Going to liquidate the vaults by price increase of the loan tokens
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2.2@AAPL',
        currency: 'USD'
      }]
    })
    await alice.generate(1)

    // 8 - Liquidation happened
    await alice.container.waitForActivePrice('AAPL/USD', '2.2')
    inLiquidationBlockHeight = await alice.container.getBlockCount()

    const list = await alice.container.call('listauctions', [])
    list.forEach((l: { state: any }) =>
      expect(l.state).toStrictEqual('inLiquidation')
    )

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['7875@AAPL'] })
    await alice.generate(1)

    auctionBidTxId1 = await alice.container.call('placeauctionbid', [createVaultTxId, 0, aliceColAddr, '5000@AAPL'])
    expect(typeof auctionBidTxId1).toStrictEqual('string')
    expect(auctionBidTxId1.length).toStrictEqual(64)
    await alice.generate(1)
    auctionBidBlockHeight1 = await alice.container.getBlockCount()
    await tGroup.waitForSync()

    await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['5050@AAPL'] })
    await alice.generate(1)
    await tGroup.waitForSync()

    auctionBidTxId2 = await bob.container.call('placeauctionbid', [createVaultTxId, 0, bobColAddr, '5050@AAPL'])
    expect(typeof auctionBidTxId2).toStrictEqual('string')
    expect(auctionBidTxId2.length).toStrictEqual(64)
    await bob.generate(1)
    auctionBidBlockHeight2 = await bob.container.getBlockCount()
    await tGroup.waitForSync()

    auctionBidTxId3 = await alice.container.call('placeauctionbid', [createVaultTxId, 1, aliceColAddr, '2500@AAPL'])
    expect(typeof auctionBidTxId3).toStrictEqual('string')
    expect(auctionBidTxId3.length).toStrictEqual(64)
    await alice.generate(1)
    auctionBidBlockHeight3 = await alice.container.getBlockCount()

    priceActivationBlockHeight = inLiquidationBlockHeight + 36
    await alice.container.generate(priceActivationBlockHeight) // Generate 36 blocks after the vault get liquidated to end the auction

    closeVaultTxId = await alice.rpc.loan.closeVault({
      vaultId: createVaultTxId,
      to: aliceColAddr
    })
    await alice.generate(1)
    closeVaultBlockHeight = await alice.container.getBlockCount()
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
        data.type === 'AuctionBid' ||
        data.type === 'CloseVault'
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

      if (data.type === undefined) {
        expect(data).toStrictEqual({
          blockHeight: expect.any(Number),
          blockHash: expect.any(String),
          blockTime: expect.any(Number),
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
        }

        if (data.vaultSnapshot.state === 'active') {
          expect(data.vaultSnapshot).toStrictEqual({
            state: expect.any(String),
            collateralAmounts: expect.any(Array),
            collateralValue: expect.any(Number),
            collateralRatio: expect.any(Number)
          })
        }

        return
      }

      throw new Error('The Loan txtype is invalid')
    })
  }

  describe('listVaultHistory with vaultId', () => {
    let vaultHistory: ListVaultHistory[]

    beforeAll(async () => {
      vaultHistory = (await alice.rpc.loan.listVaultHistory(createVaultTxId)).reverse() // Reverse the record to increase readability
      validateType(vaultHistory)
    })

    it('should listVaultHistory', async () => {
      expect(vaultHistory.length).toStrictEqual(15)

      // 0 - Create vault
      expect(vaultHistory[0].type).toStrictEqual('Vault')
      expect(vaultHistory[0].txid).toStrictEqual(createVaultTxId)
      expect(vaultHistory[0].blockHeight).toStrictEqual(createVaultBlockHeight)
      expect(vaultHistory[0].loanScheme).toStrictEqual({ id: 'default', rate: 100000000, ratio: 110 })

      // 1 - Update vault
      expect(vaultHistory[1].type).toStrictEqual('UpdateVault')
      expect(vaultHistory[1].txid).toStrictEqual(updateVaultTxId)
      expect(vaultHistory[1].blockHeight).toStrictEqual(updateVaultBlockHeight)
      expect(vaultHistory[1].loanScheme).toStrictEqual({ id: 'scheme', rate: 100000000, ratio: 100 })

      // 2 - 1st Deposit
      expect(vaultHistory[2].type).toStrictEqual('DepositToVault')
      expect(vaultHistory[2].address).toStrictEqual(aliceColAddr)
      expect(vaultHistory[2].txid).toStrictEqual(depositVault1TxId)
      expect(vaultHistory[2].blockHeight).toStrictEqual(depositVault1BlockHeight)
      expect(vaultHistory[2].amounts).toStrictEqual(['-10000.00000000@DFI']) // Deposit 10000 DFI

      // 3 - 2nd Deposit
      expect(vaultHistory[3].type).toStrictEqual('DepositToVault')
      expect(vaultHistory[3].address).toStrictEqual(aliceColAddr)
      expect(vaultHistory[3].txid).toStrictEqual(depositVault2TxId)
      expect(vaultHistory[3].blockHeight).toStrictEqual(depositVault2BlockHeight)
      expect(vaultHistory[3].amounts).toStrictEqual(['-0.50000000@BTC']) // Deposit 0.5 BTC

      // 4 - Take loan
      expect(vaultHistory[4].type).toStrictEqual('TakeLoan')
      expect(vaultHistory[4].txid).toStrictEqual(takeLoanTxId)
      expect(vaultHistory[4].blockHeight).toStrictEqual(takeLoanBlockHeight)
      expect(vaultHistory[4].amounts).toStrictEqual(['7500.00000000@AAPL']) // TakeLoan 7500 AAPL

      // 5 - Payback loan
      expect(vaultHistory[5].type).toStrictEqual('PaybackLoan')
      expect(vaultHistory[5].txid).toStrictEqual(paybackLoanTxId)
      expect(vaultHistory[5].blockHeight).toStrictEqual(paybackLoanBlockHeight)
      expect(vaultHistory[5].amounts).toStrictEqual(['0.00057078@DFI'])

      // 6 - Payback loan
      expect(vaultHistory[6].type).toStrictEqual('PaybackLoan')
      expect(vaultHistory[6].txid).toStrictEqual(paybackLoanTxId)
      expect(vaultHistory[6].blockHeight).toStrictEqual(paybackLoanBlockHeight)
      expect(vaultHistory[6].amounts).toStrictEqual(['-500.00000000@AAPL'])

      // 7 - Withdraw from vault
      expect(vaultHistory[7].type).toStrictEqual('WithdrawFromVault')
      expect(vaultHistory[7].address).toStrictEqual(aliceColAddr)
      expect(vaultHistory[7].txid).toStrictEqual(withdrawFromVaultTxId)
      expect(vaultHistory[7].blockHeight).toStrictEqual(withdrawFromVaultBlockHeight)
      expect(vaultHistory[7].amounts).toStrictEqual(['50.00000000@DFI'])

      // 8 - Liquidation
      expect(vaultHistory[8].vaultSnapshot?.state).toStrictEqual('inLiquidation')
      expect(vaultHistory[8].blockHeight).toStrictEqual(inLiquidationBlockHeight)
      expect(vaultHistory[8].vaultSnapshot?.collateralAmounts).toStrictEqual([]) // No collateralAmounts for liquidation
      expect(vaultHistory[8].vaultSnapshot?.collateralValue).toStrictEqual(0) // No collateralValue for liquidation
      expect(vaultHistory[8].vaultSnapshot?.batches).toStrictEqual([
        {
          index: 0,
          collaterals: [
            '6655.51838400@DFI',
            '0.33444816@BTC'
          ],
          loan: '4682.28594829@AAPL'
        },
        {
          index: 1,
          collaterals: [
            '3294.48161600@DFI',
            '0.16555184@BTC'
          ],
          loan: '2317.73155561@AAPL'
        }
      ])

      // 9 - Auction bid
      expect(vaultHistory[9].type).toStrictEqual('AuctionBid')
      expect(vaultHistory[9].address).toStrictEqual(aliceColAddr)
      expect(vaultHistory[9].txid).toStrictEqual(auctionBidTxId1)
      expect(vaultHistory[9].blockHeight).toStrictEqual(auctionBidBlockHeight1)
      expect(vaultHistory[9].amounts).toStrictEqual(['-5000.00000000@AAPL'])

      if (vaultHistory[10].address === bobColAddr) {
        // 10 - Auction bid
        expect(vaultHistory[10].type).toStrictEqual('AuctionBid')
        expect(vaultHistory[10].address).toStrictEqual(bobColAddr)
        expect(vaultHistory[10].txid).toStrictEqual(auctionBidTxId2)
        expect(vaultHistory[10].blockHeight).toStrictEqual(auctionBidBlockHeight2)
        expect(vaultHistory[10].amounts).toStrictEqual(['-5050.00000000@AAPL'])

        // 11 - Auction bid
        expect(vaultHistory[11].type).toStrictEqual('AuctionBid')
        expect(vaultHistory[11].address).toStrictEqual(aliceColAddr)
        expect(vaultHistory[11].txid).toStrictEqual(auctionBidTxId2)
        expect(vaultHistory[11].blockHeight).toStrictEqual(auctionBidBlockHeight2)
        expect(vaultHistory[11].amounts).toStrictEqual(['5000.00000000@AAPL'])
      } else {
        // 10 - Auction bid
        expect(vaultHistory[10].type).toStrictEqual('AuctionBid')
        expect(vaultHistory[10].address).toStrictEqual(aliceColAddr)
        expect(vaultHistory[10].txid).toStrictEqual(auctionBidTxId2)
        expect(vaultHistory[10].blockHeight).toStrictEqual(auctionBidBlockHeight2)
        expect(vaultHistory[10].amounts).toStrictEqual(['5000.00000000@AAPL'])

        // 11 - Auction bid
        expect(vaultHistory[11].type).toStrictEqual('AuctionBid')
        expect(vaultHistory[11].address).toStrictEqual(bobColAddr)
        expect(vaultHistory[11].txid).toStrictEqual(auctionBidTxId2)
        expect(vaultHistory[11].blockHeight).toStrictEqual(auctionBidBlockHeight2)
        expect(vaultHistory[11].amounts).toStrictEqual(['-5050.00000000@AAPL'])
      }

      // 12 - Auction bid
      expect(vaultHistory[12].type).toStrictEqual('AuctionBid')
      expect(vaultHistory[12].address).toStrictEqual(aliceColAddr)
      expect(vaultHistory[12].txid).toStrictEqual(auctionBidTxId3)
      expect(vaultHistory[12].blockHeight).toStrictEqual(auctionBidBlockHeight3)
      expect(vaultHistory[12].amounts).toStrictEqual(['-2500.00000000@AAPL'])

      // 13 - Active price
      expect(vaultHistory[13].vaultSnapshot?.state).toStrictEqual('active')
      expect(vaultHistory[13].blockHeight).toStrictEqual(priceActivationBlockHeight)
      expect(vaultHistory[13].vaultSnapshot).toStrictEqual({
        state: 'active',
        collateralAmounts: [
          '37.99494669@DFI'
        ],
        collateralValue: 37.99494669,
        collateralRatio: 0
      })

      // 14 - Close vault
      expect(vaultHistory[14].type).toStrictEqual('CloseVault')
      expect(vaultHistory[14].address).toStrictEqual(aliceColAddr)
      expect(vaultHistory[14].txid).toStrictEqual(closeVaultTxId)
      expect(vaultHistory[14].blockHeight).toStrictEqual(closeVaultBlockHeight)
      expect(vaultHistory[14].amounts).toStrictEqual(['38.49494669@DFI'])
    })
  })

  describe('listVaultHistory with pagination', () => {
    it('should listAuctionHistory with maxBlockHeight only', async () => {
      {
        const vaultHistory = (await alice.rpc.loan.listVaultHistory(createVaultTxId, { maxBlockHeight: createVaultBlockHeight })).reverse()
        expect(vaultHistory.length).toStrictEqual(1)
        // Create vault
        expect(vaultHistory[0].type).toStrictEqual('Vault')
        expect(vaultHistory[0].txid).toStrictEqual(createVaultTxId)
        expect(vaultHistory[0].blockHeight).toStrictEqual(createVaultBlockHeight)
        expect(vaultHistory[0].loanScheme).toStrictEqual({ id: 'default', rate: 100000000, ratio: 110 })
      }

      {
        const vaultHistory = (await alice.rpc.loan.listVaultHistory(createVaultTxId, { maxBlockHeight: updateVaultBlockHeight })).reverse()
        expect(vaultHistory.length).toStrictEqual(2)
        // Create vault
        expect(vaultHistory[0].type).toStrictEqual('Vault')
        expect(vaultHistory[0].txid).toStrictEqual(createVaultTxId)
        expect(vaultHistory[0].blockHeight).toStrictEqual(createVaultBlockHeight)
        expect(vaultHistory[0].loanScheme).toStrictEqual({ id: 'default', rate: 100000000, ratio: 110 })

        // Update vault
        expect(vaultHistory[1].type).toStrictEqual('UpdateVault')
        expect(vaultHistory[1].txid).toStrictEqual(updateVaultTxId)
        expect(vaultHistory[1].blockHeight).toStrictEqual(updateVaultBlockHeight)
        expect(vaultHistory[1].loanScheme).toStrictEqual({ id: 'scheme', rate: 100000000, ratio: 100 })
      }

      {
        const vaultHistory = await alice.rpc.loan.listVaultHistory(createVaultTxId, { maxBlockHeight: createVaultBlockHeight - 1 }) // Set to block before createVault
        expect(vaultHistory).toStrictEqual([])
      }
    })

    it('should listAuctionHistory with depth only', async () => {
      {
        const vaultHistory = await alice.rpc.loan.listVaultHistory(createVaultTxId, { depth: 1 })
        expect(vaultHistory.length).toStrictEqual(1)

        expect(vaultHistory[0].type).toStrictEqual('CloseVault')
        expect(vaultHistory[0].address).toStrictEqual(aliceColAddr)
        expect(vaultHistory[0].txid).toStrictEqual(closeVaultTxId)
        expect(vaultHistory[0].blockHeight).toStrictEqual(closeVaultBlockHeight)
        expect(vaultHistory[0].amounts).toStrictEqual(['38.49494669@DFI'])
      }
    })

    it('should not listAuctionHistory with token only', async () => {
      {
        const vaultHistory = (await alice.rpc.loan.listVaultHistory(createVaultTxId, { token: 'DFI' })).reverse()
        expect(vaultHistory.length).toStrictEqual(6)
        // 2 - 1st Deposit
        expect(vaultHistory[0].type).toStrictEqual('DepositToVault')
        expect(vaultHistory[0].address).toStrictEqual(aliceColAddr)
        expect(vaultHistory[0].txid).toStrictEqual(depositVault1TxId)
        expect(vaultHistory[0].blockHeight).toStrictEqual(depositVault1BlockHeight)
        expect(vaultHistory[0].amounts).toStrictEqual(['-10000.00000000@DFI']) // Deposit 10000 DFI

        // 5 - Payback loan
        expect(vaultHistory[1].type).toStrictEqual('PaybackLoan')
        expect(vaultHistory[1].txid).toStrictEqual(paybackLoanTxId)
        expect(vaultHistory[1].blockHeight).toStrictEqual(paybackLoanBlockHeight)
        expect(vaultHistory[1].amounts).toStrictEqual(['0.00057078@DFI'])

        // 7 - Withdraw from vault
        expect(vaultHistory[2].type).toStrictEqual('WithdrawFromVault')
        expect(vaultHistory[2].address).toStrictEqual(aliceColAddr)
        expect(vaultHistory[2].txid).toStrictEqual(withdrawFromVaultTxId)
        expect(vaultHistory[2].blockHeight).toStrictEqual(withdrawFromVaultBlockHeight)
        expect(vaultHistory[2].amounts).toStrictEqual(['50.00000000@DFI'])

        // 8 - Liquidation
        expect(vaultHistory[3].vaultSnapshot?.state).toStrictEqual('inLiquidation')
        expect(vaultHistory[3].blockHeight).toStrictEqual(inLiquidationBlockHeight)
        expect(vaultHistory[3].vaultSnapshot?.collateralAmounts).toStrictEqual([]) // No collateralAmounts for liquidation
        expect(vaultHistory[3].vaultSnapshot?.collateralValue).toStrictEqual(0) // No collateralValue for liquidation
        expect(vaultHistory[3].vaultSnapshot?.batches).toStrictEqual([
          {
            index: 0,
            collaterals: [
              '6655.51838400@DFI',
              '0.33444816@BTC'
            ],
            loan: '4682.28594829@AAPL'
          },
          {
            index: 1,
            collaterals: [
              '3294.48161600@DFI',
              '0.16555184@BTC'
            ],
            loan: '2317.73155561@AAPL'
          }
        ])

        // 13 - Active price
        expect(vaultHistory[4].vaultSnapshot?.state).toStrictEqual('active')
        expect(vaultHistory[4].blockHeight).toStrictEqual(priceActivationBlockHeight)
        expect(vaultHistory[4].vaultSnapshot).toStrictEqual({
          state: 'active',
          collateralAmounts: [
            '37.99494669@DFI'
          ],
          collateralValue: 37.99494669,
          collateralRatio: 0
        })

        // 14 - Close vault
        expect(vaultHistory[5].type).toStrictEqual('CloseVault')
        expect(vaultHistory[5].address).toStrictEqual(aliceColAddr)
        expect(vaultHistory[5].txid).toStrictEqual(closeVaultTxId)
        expect(vaultHistory[5].blockHeight).toStrictEqual(closeVaultBlockHeight)
        expect(vaultHistory[5].amounts).toStrictEqual(['38.49494669@DFI'])
      }
    })

    it('should not listAuctionHistory with txtype only', async () => {
      {
        const vaultHistory = await alice.rpc.loan.listVaultHistory(createVaultTxId, { txtype: 'V' })
        // Update vault
        expect(vaultHistory[0].type).toStrictEqual('Vault')
        expect(vaultHistory[0].txid).toStrictEqual(createVaultTxId)
        expect(vaultHistory[0].blockHeight).toStrictEqual(createVaultBlockHeight)
        expect(vaultHistory[0].loanScheme).toStrictEqual({ id: 'default', rate: 100000000, ratio: 110 })
      }

      {
        const vaultHistory = await alice.rpc.loan.listVaultHistory(createVaultTxId, { txtype: 'e' })
        // CloseVault
        expect(vaultHistory[0].type).toStrictEqual('CloseVault')
        expect(vaultHistory[0].address).toStrictEqual(aliceColAddr)
        expect(vaultHistory[0].txid).toStrictEqual(closeVaultTxId)
        expect(vaultHistory[0].blockHeight).toStrictEqual(closeVaultBlockHeight)
        expect(vaultHistory[0].amounts).toStrictEqual(['38.49494669@DFI'])
      }
    })

    it('should listAuctionHistory with limit only', async () => {
      {
        const vaultHistory = await alice.rpc.loan.listVaultHistory(createVaultTxId, { limit: 1 })
        // CloseVault
        expect(vaultHistory[0].type).toStrictEqual('CloseVault')
        expect(vaultHistory[0].address).toStrictEqual(aliceColAddr)
        expect(vaultHistory[0].txid).toStrictEqual(closeVaultTxId)
        expect(vaultHistory[0].blockHeight).toStrictEqual(closeVaultBlockHeight)
        expect(vaultHistory[0].amounts).toStrictEqual(['38.49494669@DFI'])
      }

      {
        const vaultHistory = (await alice.rpc.loan.listVaultHistory(createVaultTxId, { limit: 2 })).reverse()

        // Price activation
        expect(vaultHistory[0].vaultSnapshot?.state).toStrictEqual('active')
        expect(vaultHistory[0].blockHeight).toStrictEqual(priceActivationBlockHeight)
        expect(vaultHistory[0].vaultSnapshot).toStrictEqual({
          state: 'active',
          collateralAmounts: [
            '37.99494669@DFI'
          ],
          collateralValue: 37.99494669,
          collateralRatio: 0
        })

        // CloseVault
        expect(vaultHistory[1].type).toStrictEqual('CloseVault')
        expect(vaultHistory[1].address).toStrictEqual(aliceColAddr)
        expect(vaultHistory[1].txid).toStrictEqual(closeVaultTxId)
        expect(vaultHistory[1].blockHeight).toStrictEqual(closeVaultBlockHeight)
        expect(vaultHistory[1].amounts).toStrictEqual(['38.49494669@DFI'])
      }

      // For limit 17 > 15
      {
        const vaultHistory = await alice.rpc.loan.listVaultHistory(createVaultTxId, { limit: 17 })
        expect(vaultHistory.length).toStrictEqual(15)
      }
    })
  })

  it('should listVaultHistory with maxBlockHeight and limit', async () => {
    // listVaultHistory for maxBlockHeight of updateVault and limit = 2
    {
      const vaultHistory = (await alice.rpc.loan.listVaultHistory(createVaultTxId,
        { maxBlockHeight: updateVaultBlockHeight, limit: 2 })).reverse()

      // Create vault
      expect(vaultHistory[0].type).toStrictEqual('Vault')
      expect(vaultHistory[0].txid).toStrictEqual(createVaultTxId)
      expect(vaultHistory[0].blockHeight).toStrictEqual(createVaultBlockHeight)
      expect(vaultHistory[0].loanScheme).toStrictEqual({ id: 'default', rate: 100000000, ratio: 110 })

      // Update vault
      expect(vaultHistory[1].type).toStrictEqual('UpdateVault')
      expect(vaultHistory[1].txid).toStrictEqual(updateVaultTxId)
      expect(vaultHistory[1].blockHeight).toStrictEqual(updateVaultBlockHeight)
      expect(vaultHistory[1].loanScheme).toStrictEqual({ id: 'scheme', rate: 100000000, ratio: 100 })
    }
  })

  it('should listVaultHistory with maxBlockHeight, depth, token, txtype and limit', async () => {
    // listVaultHistory for maxBlockHeight, token, txtype of auctionBid2 with depth = 2 and limit = 2
    {
      const vaultHistory = (await alice.rpc.loan.listVaultHistory(createVaultTxId,
        { maxBlockHeight: auctionBidBlockHeight2, depth: 2, token: 'AAPL', txtype: 'I', limit: 2 })).reverse()

      if (vaultHistory[0].address === bobColAddr) {
        // 10 - Auction bid
        expect(vaultHistory[0].type).toStrictEqual('AuctionBid')
        expect(vaultHistory[0].address).toStrictEqual(bobColAddr)
        expect(vaultHistory[0].txid).toStrictEqual(auctionBidTxId2)
        expect(vaultHistory[0].blockHeight).toStrictEqual(auctionBidBlockHeight2)
        expect(vaultHistory[0].amounts).toStrictEqual(['-5050.00000000@AAPL'])

        // 11 - Auction bid
        expect(vaultHistory[1].type).toStrictEqual('AuctionBid')
        expect(vaultHistory[1].address).toStrictEqual(aliceColAddr)
        expect(vaultHistory[1].txid).toStrictEqual(auctionBidTxId2)
        expect(vaultHistory[1].blockHeight).toStrictEqual(auctionBidBlockHeight2)
        expect(vaultHistory[1].amounts).toStrictEqual(['5000.00000000@AAPL'])
      } else {
        // 10 - Auction bid
        expect(vaultHistory[0].type).toStrictEqual('AuctionBid')
        expect(vaultHistory[0].address).toStrictEqual(aliceColAddr)
        expect(vaultHistory[0].txid).toStrictEqual(auctionBidTxId2)
        expect(vaultHistory[0].blockHeight).toStrictEqual(auctionBidBlockHeight2)
        expect(vaultHistory[0].amounts).toStrictEqual(['5000.00000000@AAPL'])

        // 11 - Auction bid
        expect(vaultHistory[1].type).toStrictEqual('AuctionBid')
        expect(vaultHistory[1].address).toStrictEqual(bobColAddr)
        expect(vaultHistory[1].txid).toStrictEqual(auctionBidTxId2)
        expect(vaultHistory[1].blockHeight).toStrictEqual(auctionBidBlockHeight2)
        expect(vaultHistory[1].amounts).toStrictEqual(['-5050.00000000@AAPL'])
      }
    }
  })
})

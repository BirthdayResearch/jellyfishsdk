import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'

describe('Loan listAuctionHistory', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)
  let aliceColAddr: string
  let bobVaultId1: string
  let bobVaultId2: string
  let bobColAddr1: string
  let bobColAddr2: string

  async function setup (): Promise<void> {
    aliceColAddr = await alice.generateAddress()
    await alice.token.dfi({
      address: aliceColAddr,
      amount: 30000
    })
    await alice.generate(1)

    await alice.token.create({
      symbol: 'BTC',
      collateralAddress: aliceColAddr
    })
    await alice.generate(1)

    await alice.token.mint({
      symbol: 'BTC',
      amount: 30000
    })
    await alice.generate(1)

    // oracle setup
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
        token: 'TSLA',
        currency: 'USD'
      }
    ]
    const oracleId = await alice.rpc.oracle.appointOracle(await alice.generateAddress(), priceFeeds, { weightage: 1 })
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
        tokenAmount: '2@TSLA',
        currency: 'USD'
      }]
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

    await alice.token.mint({
      symbol: 'TSLA',
      amount: 40000
    })
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

    bobColAddr1 = await bob.generateAddress()
    await bob.token.dfi({
      address: bobColAddr1,
      amount: 20000
    })
    await bob.generate(1)

    bobColAddr2 = await bob.generateAddress()
    await bob.token.dfi({
      address: bobColAddr2,
      amount: 20000
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    await alice.rpc.account.accountToAccount(aliceColAddr, { [bobColAddr1]: '1@BTC' })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr1]: ['10000@TSLA'] })
    await alice.generate(1)

    await alice.rpc.account.accountToAccount(aliceColAddr, { [bobColAddr2]: '1@BTC' })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr2]: ['10000@TSLA'] })
    await alice.generate(1)
    await tGroup.waitForSync()

    // Bob's first vault
    bobVaultId1 = await bob.rpc.loan.createVault({
      ownerAddress: await bob.generateAddress(),
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)

    await bob.rpc.loan.depositToVault({
      vaultId: bobVaultId1,
      from: bobColAddr1,
      amount: '10000@DFI'
    })
    await bob.generate(1)

    await bob.rpc.loan.depositToVault({
      vaultId: bobVaultId1,
      from: bobColAddr1,
      amount: '1@BTC'
    })
    await bob.generate(1)

    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId1,
      amounts: '1000@TSLA',
      to: await bob.generateAddress()
    })
    await bob.generate(1)

    // Bob's second vault
    bobVaultId2 = await bob.rpc.loan.createVault({
      ownerAddress: await bob.generateAddress(),
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)

    await bob.rpc.loan.depositToVault({
      vaultId: bobVaultId2,
      from: bobColAddr2,
      amount: '10000@DFI'
    })
    await bob.generate(1)

    await bob.rpc.loan.depositToVault({
      vaultId: bobVaultId2,
      from: bobColAddr2,
      amount: '1@BTC'
    })
    await bob.generate(1)

    const bobLoanAddr2 = await bob.generateAddress()
    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId2,
      amounts: '1000@TSLA',
      to: bobLoanAddr2
    })
    await bob.generate(1)

    // increase TSLA price
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '15@TSLA',
        currency: 'USD'
      }]
    })
    await alice.generate(12)

    // bobVaultId1
    {
      const data = await alice.container.call('getvault', [bobVaultId1])
      expect(data.state).toStrictEqual('inliquidation')
      expect(data.batches[0].loan).toStrictEqual('500.00399539@TSLA')

      {
        const txid = await alice.container.call('placeauctionbid', [bobVaultId1, 0, aliceColAddr, '526@TSLA']) // Amount > (500.00285385 * 1.05 = 525.002996543)
        expect(typeof txid).toStrictEqual('string')
        expect(txid.length).toStrictEqual(64)
        await alice.generate(1)
      }
    }

    await tGroup.waitForSync()

    // bobVaultId2
    {
      const data = await alice.container.call('getvault', [bobVaultId2])
      expect(data.state).toStrictEqual('inliquidation')
      expect(data.batches[0].loan).toStrictEqual('500.00285385@TSLA')

      {
        const txid = await alice.container.call('placeauctionbid', [bobVaultId2, 0, aliceColAddr, '526@TSLA']) // Amount > (500.00285385 * 1.05 = 525.002996543)
        expect(typeof txid).toStrictEqual('string')
        expect(txid.length).toStrictEqual(64)
        await alice.generate(1)
        await tGroup.waitForSync()
      }

      {
        const txid = await bob.container.call('placeauctionbid', [bobVaultId2, 0, bobColAddr1, '532@TSLA']) // Amount > (526 * 1.01 = 532.26)
        expect(typeof txid).toStrictEqual('string')
        expect(txid.length).toStrictEqual(64)
        await bob.generate(1)
      }
    }

    await bob.container.generate(40)
    await tGroup.waitForSync()
  }

  beforeAll(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  describe('listAuctionHistory', () => {
    describe('listAuctionHistory with owner', () => {
      it('should listAuctionHistory with owner = mine', async () => {
        {
          const auctionhistory1 = await alice.rpc.loan.listAuctionHistory() // default to mine owner
          const auctionhistory2 = await alice.rpc.loan.listAuctionHistory('mine')
          expect(auctionhistory1).toStrictEqual(auctionhistory2)
          expect(auctionhistory1).toStrictEqual(
            [
              {
                winner: aliceColAddr,
                blockHeight: expect.any(Number),
                blockHash: expect.any(String),
                blockTime: expect.any(Number),
                vaultId: bobVaultId1,
                batchIndex: 0,
                auctionBid: '526.00000000@TSLA',
                auctionWon: ['5000.00000000@DFI', '0.50000000@BTC']
              }
            ]
          )
        }

        {
          const auctionhistory1 = await bob.rpc.loan.listAuctionHistory() // default to mine owner
          const auctionhistory2 = await bob.rpc.loan.listAuctionHistory('mine')
          expect(auctionhistory1).toStrictEqual(auctionhistory1)
          expect(auctionhistory1).toStrictEqual(auctionhistory2)
          expect(auctionhistory1).toStrictEqual(
            [
              {
                winner: bobColAddr1,
                blockHeight: expect.any(Number),
                blockHash: expect.any(String),
                blockTime: expect.any(Number),
                vaultId: bobVaultId2,
                batchIndex: 0,
                auctionBid: '532.00000000@TSLA',
                auctionWon: ['5000.00000000@DFI', '0.50000000@BTC']
              }
            ]
          )
        }
      })

      it('should listAuctionHistory with owner = all', async () => {
        const data = await alice.rpc.loan.listAuctionHistory('all')
        expect(data.length).toStrictEqual(2)
      })

      it('should listAuctionHistory with owner = address', async () => {
        {
          const data = await alice.rpc.loan.listAuctionHistory(aliceColAddr)
          expect(data[0].vaultId).toStrictEqual(bobVaultId1)
        }

        {
          const data = await alice.rpc.loan.listAuctionHistory(bobColAddr1)
          expect(data[0].vaultId).toStrictEqual(bobVaultId2)
        }
      })
    })

    describe('listAuctionHistory with pagination', () => {
      it('should listAuctionHistory with maxBlockHeight', async () => {
        {
          const data = await alice.rpc.loan.listAuctionHistory('all', { maxBlockHeight: 173 })
          expect(data).toStrictEqual([])
        }

        {
          const data = await alice.rpc.loan.listAuctionHistory('all', { maxBlockHeight: 174 })
          expect(data.length).toStrictEqual(2)
        }
      })

      it('should listAuctionHistory with vaultId', async () => {
        {
          const data = await alice.rpc.loan.listAuctionHistory(undefined, { vaultId: bobVaultId1 })
          expect(data[0].vaultId).toStrictEqual(bobVaultId1)
        }

        {
          const data = await bob.rpc.loan.listAuctionHistory(undefined, { vaultId: bobVaultId2 })
          expect(data[0].vaultId).toStrictEqual(bobVaultId2)
        }
      })

      it('should not listAuctionHistory with vaultId that does not exists', async () => {
        {
          const promise = alice.rpc.loan.listAuctionHistory(undefined, { vaultId: 'x'.repeat(64) })
          await expect(promise).rejects.toThrow(`RpcApiError: 'vaultId must be hexadecimal string (not '${'x'.repeat(64)}')', code: -8, method: listauctionhistory`)
        }

        {
          const promise = bob.rpc.loan.listAuctionHistory(undefined, { vaultId: 'x'.repeat(64) })
          await expect(promise).rejects.toThrow(`RpcApiError: 'vaultId must be hexadecimal string (not '${'x'.repeat(64)}')', code: -8, method: listauctionhistory`)
        }

        {
          const promise = alice.rpc.loan.listAuctionHistory(undefined, { vaultId: 'x' })
          await expect(promise).rejects.toThrow('RpcApiError: \'vaultId must be of length 64 (not 1, for \'x\')\', code: -8, method: listauctionhistory')
        }

        {
          const promise = bob.rpc.loan.listAuctionHistory(undefined, { vaultId: 'x' })
          await expect(promise).rejects.toThrow('RpcApiError: \'vaultId must be of length 64 (not 1, for \'x\')\', code: -8, method: listauctionhistory')
        }
      })

      // it('should listAuctionHistory with batch index', async () => {
      //   {
      //     const data = await alice.rpc.loan.listAuctionHistory(undefined, { index: -1 })
      //     expect(data[0].vaultId).toStrictEqual(bobVaultId1)
      //   }
      //
      //   {
      //     const data = await alice.rpc.loan.listAuctionHistory(undefined, { index: 1 })
      //     expect(data).toStrictEqual([])
      //   }
      //
      //   {
      //     const data = await bob.rpc.loan.listAuctionHistory(undefined, { index: 0 })
      //     expect(data[0].vaultId).toStrictEqual(bobVaultId2)
      //   }
      //
      //   {
      //     const data = await bob.rpc.loan.listAuctionHistory(undefined, { index: 1 })
      //     expect(data).toStrictEqual([])
      //   }
      // })
      //
      // it('should listAuctionHistory with limit', async () => {
      //   const data = await alice.rpc.loan.listAuctionHistory(bobColAddr1, { limit: -1 })
      //   console.log(data)
      //   expect(data[0].vaultId).toStrictEqual(bobVaultId1)
      // })
    })
  })
})

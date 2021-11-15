import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ListAuctionHistoryDetail } from '../../../src/category/loan'

describe('Loan listAuctionHistory', () => {
  const tGroup = TestingGroup.create(2, i => new MasterNodeRegTestContainer(GenesisKeys[i]))
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)
  let aliceColAddr: string
  let bobColAddr: string
  let vaultId1: string // Alice 1st vault
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
      amount: 35000
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

    // Loan scheme
    await alice.container.call('createloanscheme', [100, 1, 'default'])
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
    vaultId1 = await alice.rpc.container.call('createvault', [await alice.generateAddress(), 'default'])
    await alice.generate(1)

    await alice.container.call('deposittovault', [vaultId1, aliceColAddr, '10000@DFI'])
    await alice.generate(1)
    await alice.container.call('deposittovault', [vaultId1, aliceColAddr, '0.5@BTC'])
    await alice.generate(1)

    await alice.container.call('takeloan', [{
      vaultId: vaultId1,
      amounts: '7500@AAPL'
    }])
    await alice.generate(1)

    // Vault 2
    vaultId2 = await alice.rpc.container.call('createvault', [await alice.generateAddress(), 'default'])
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

    // Vault 3
    vaultId3 = await bob.rpc.container.call('createvault', [await bob.generateAddress(), 'default'])
    await bob.generate(1)

    await bob.container.call('deposittovault', [vaultId3, bobColAddr, '30000@DFI'])
    await bob.generate(1)
    await bob.container.call('deposittovault', [vaultId3, bobColAddr, '1.5@BTC'])
    await bob.generate(1)

    await bob.container.call('takeloan', [{
      vaultId: vaultId3,
      amounts: '22500@MSFT'
    }])
    await bob.generate(1)

    // Vault 4
    vaultId4 = await bob.rpc.container.call('createvault', [await bob.generateAddress(), 'default'])
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

    {
      // When there is no liquidation occurs
      const data = await alice.container.call('listauctions', [])
      expect(data).toStrictEqual([])

      const vault1 = await alice.rpc.loan.getVault(vaultId1)
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
    await alice.generate(1)

    // When there is liquidation
    const list = await alice.container.call('listauctions', [])
    list.forEach((l: { state: any }) =>
      expect(l.state).toStrictEqual('inLiquidation')
    )

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['7875@AAPL'] })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['15750@TSLA'] })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['23625@MSFT'] })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['31500@FB'] })
    await alice.generate(1)

    {
      const txid = await alice.container.call('placeauctionbid', [vaultId1, 0, aliceColAddr, '7875@AAPL'])
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
      await alice.generate(1)
    }

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

    {
      const txid = await bob.container.call('placeauctionbid', [vaultId4, 1, bobColAddr, '31500@FB'])
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
      await bob.generate(1)
    }

    await alice.container.generate(40)
    await tGroup.waitForSync()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  describe('listAuctionHistory without pagination', () => {
    it('should listAuctionHistory with owner = mine', async () => {
      {
        const auctionhistory1 = await alice.rpc.loan.listAuctionHistory() // default to mine
        const auctionhistory2 = await alice.rpc.loan.listAuctionHistory('mine')
        expect(auctionhistory1).toStrictEqual(auctionhistory2)
        expect(auctionhistory1.length).toStrictEqual(2)
        {
          const result = auctionhistory1.find(h => h.vaultId === vaultId1)
          expect(result).toStrictEqual(
            {
              winner: aliceColAddr,
              blockHeight: expect.any(Number),
              blockHash: expect.any(String),
              blockTime: expect.any(Number),
              vaultId: vaultId1,
              batchIndex: 0,
              auctionBid: '7875.00000000@AAPL',
              auctionWon: ['6666.66660000@DFI', '0.33333333@BTC']
            }
          )
        }
        {
          const result = auctionhistory1.find(h => h.vaultId === vaultId2)
          expect(result).toStrictEqual(
            {
              winner: aliceColAddr,
              blockHeight: expect.any(Number),
              blockHash: expect.any(String),
              blockTime: expect.any(Number),
              vaultId: vaultId2,
              batchIndex: 1,
              auctionBid: '15750.00000000@TSLA',
              auctionWon: ['6666.66660000@DFI', '0.33333333@BTC']
            }
          )
        }
      }
      {
        const auctionhistory1 = await bob.rpc.loan.listAuctionHistory() // default to mine
        const auctionhistory2 = await bob.rpc.loan.listAuctionHistory('mine')
        expect(auctionhistory1).toStrictEqual(auctionhistory2)
        expect(auctionhistory1.length).toStrictEqual(2)
        {
          const result = auctionhistory1.find(h => h.vaultId === vaultId3)
          expect(result).toStrictEqual(
            {
              winner: bobColAddr,
              blockHeight: expect.any(Number),
              blockHash: expect.any(String),
              blockTime: expect.any(Number),
              vaultId: vaultId3,
              batchIndex: 0,
              auctionBid: '23625.00000000@MSFT',
              auctionWon: ['6666.66660000@DFI', '0.33333333@BTC']
            }
          )
        }
        {
          const result = auctionhistory1.find(h => h.vaultId === vaultId4)
          expect(result).toStrictEqual(
            {
              winner: bobColAddr,
              blockHeight: expect.any(Number),
              blockHash: expect.any(String),
              blockTime: expect.any(Number),
              vaultId: vaultId4,
              batchIndex: 1,
              auctionBid: '31500.00000000@FB',
              auctionWon: ['6666.66640000@DFI', '0.33333332@BTC']
            }
          )
        }
      }
    })

    it('should listAuctionHistory with owner = all', async () => {
      const data = await alice.rpc.loan.listAuctionHistory('all')
      expect(data.length).toStrictEqual(4)

      const data1 = data.find(d => d.vaultId === vaultId1)
      expect(data1).toBeDefined()

      const data2 = data.find(d => d.vaultId === vaultId2)
      expect(data2).toBeDefined()

      const data3 = data.find(d => d.vaultId === vaultId3)
      expect(data3).toBeDefined()

      const data4 = data.find(d => d.vaultId === vaultId4)
      expect(data4).toBeDefined()
    })

    it('should listAuctionHistory with owner = address', async () => {
      {
        const data = await alice.rpc.loan.listAuctionHistory(aliceColAddr)
        const data1 = data.find(d => d.vaultId === vaultId1)
        expect(data1).toBeDefined()

        const data2 = data.find(d => d.vaultId === vaultId2)
        expect(data2).toBeDefined()

        const data3 = data.find(d => d.vaultId === vaultId3)
        expect(data3).toBeUndefined()

        const data4 = data.find(d => d.vaultId === vaultId4)
        expect(data4).toBeUndefined()
      }

      {
        const data = await alice.rpc.loan.listAuctionHistory(bobColAddr)
        const data1 = data.find(d => d.vaultId === vaultId1)
        expect(data1).toBeUndefined()

        const data2 = data.find(d => d.vaultId === vaultId2)
        expect(data2).toBeUndefined()

        const data3 = data.find(d => d.vaultId === vaultId3)
        expect(data3).toBeDefined()

        const data4 = data.find(d => d.vaultId === vaultId4)
        expect(data4).toBeDefined()
      }
    })
  })

  describe('listAuctionHistory with pagination', () => { // For pagination, always filter by 'all'.
    let auctionHistory1: ListAuctionHistoryDetail
    let auctionHistory2: ListAuctionHistoryDetail
    let auctionHistory3: ListAuctionHistoryDetail
    let auctionHistory4: ListAuctionHistoryDetail

    beforeAll(async () => {
      [auctionHistory1, auctionHistory2, auctionHistory3, auctionHistory4] = await alice.rpc.loan.listAuctionHistory('all')
    })

    it('should listAuctionHistory with maxBlockHeight only', async () => {
      // ListAuctionHistory for maxBlockHeight of first vault
      {
        const page = await alice.rpc.loan.listAuctionHistory('all',
          { maxBlockHeight: auctionHistory1.blockHeight }
        )
        expect(page.length).toStrictEqual(4)
        expect(page[0].vaultId).toStrictEqual(auctionHistory1.vaultId)
        expect(page[1].vaultId).toStrictEqual(auctionHistory2.vaultId)
        expect(page[2].vaultId).toStrictEqual(auctionHistory3.vaultId)
        expect(page[3].vaultId).toStrictEqual(auctionHistory4.vaultId)
      }

      // ListAuctionHistory for maxBlockHeight of forth vault
      {
        const page = await alice.rpc.loan.listAuctionHistory('all',
          { maxBlockHeight: auctionHistory4.blockHeight }
        )
        expect(page.length).toStrictEqual(1)
        expect(page[0].vaultId).toStrictEqual(auctionHistory4.vaultId)
      }
    })

    it('should not listAuctionHistory with vaultId only', async () => {
      {
        const page = await alice.rpc.loan.listAuctionHistory('all',
          { vaultId: auctionHistory2.vaultId }
        )
        expect(page.length).toStrictEqual(4) // Unable to filter by vaultId only. Need to filter by maxBlockHeight, vaultId and index together.
      }
    })

    it('should not listAuctionHistory with index only', async () => { // Unable to filter by index only. Need to filter by  maxBlockHeight, vaultId and index together.
      {
        const page = await alice.rpc.loan.listAuctionHistory('all',
          { index: 0 }
        )

        expect(page.length).toStrictEqual(4)
      }
    })

    it('should listAuctionHistory with limit only', async () => {
      // ListAuctionHistory with limit < size
      const pageLimit3 = await alice.rpc.loan.listAuctionHistory('all', { limit: 3 })
      expect(pageLimit3.length).toStrictEqual(3)
      expect(pageLimit3[0].vaultId).toStrictEqual(auctionHistory1.vaultId)
      expect(pageLimit3[1].vaultId).toStrictEqual(auctionHistory2.vaultId)
      expect(pageLimit3[2].vaultId).toStrictEqual(auctionHistory3.vaultId)

      // ListAuctionHistory with limit = size
      const pageLimit4 = await alice.rpc.loan.listAuctionHistory('all', { limit: 4 })
      expect(pageLimit4.length).toStrictEqual(4)
      expect(pageLimit4[0].vaultId).toStrictEqual(auctionHistory1.vaultId)
      expect(pageLimit4[1].vaultId).toStrictEqual(auctionHistory2.vaultId)
      expect(pageLimit4[2].vaultId).toStrictEqual(auctionHistory3.vaultId)
      expect(pageLimit4[3].vaultId).toStrictEqual(auctionHistory4.vaultId)

      // ListAuctionHistory with limit > size
      const pageLimit5 = await alice.rpc.loan.listAuctionHistory('all', { limit: 5 })
      expect(pageLimit5.length).toStrictEqual(4)
      expect(pageLimit5).toStrictEqual(pageLimit4)
    })

    it('should listAuctions with maxBlockHeight, vaultId and index', async () => {
      // ListAuctionHistory for maxBlockHeight, vaultId and index of second vault
      {
        const page = await alice.rpc.loan.listAuctionHistory('all',
          { maxBlockHeight: auctionHistory2.blockHeight, vaultId: auctionHistory2.vaultId, index: auctionHistory2.batchIndex }
        )
        expect(page.length).toStrictEqual(3)
        expect(page[0].vaultId).toStrictEqual(auctionHistory2.vaultId)
        expect(page[1].vaultId).toStrictEqual(auctionHistory3.vaultId)
        expect(page[2].vaultId).toStrictEqual(auctionHistory4.vaultId)
      }
    })

    it('should listAuctions with maxBlockHeight, vaultId, index and limit', async () => {
      // ListAuctionHistory for maxBlockHeight, vaultId and index of second vault with limit = 2
      {
        const page = await alice.rpc.loan.listAuctionHistory('all',
          { maxBlockHeight: auctionHistory2.blockHeight, vaultId: auctionHistory2.vaultId, index: auctionHistory2.batchIndex, limit: 2 }
        )
        expect(page.length).toStrictEqual(2)
        expect(page[0].vaultId).toStrictEqual(auctionHistory2.vaultId)
        expect(page[1].vaultId).toStrictEqual(auctionHistory3.vaultId)
      }

      // ListAuctionHistory for maxBlockHeight, vaultId and index of second vault with limit = 1
      {
        const page = await alice.rpc.loan.listAuctionHistory('all',
          { maxBlockHeight: auctionHistory2.blockHeight, vaultId: auctionHistory2.vaultId, index: auctionHistory2.batchIndex, limit: 1 }
        )
        expect(page.length).toStrictEqual(1)
        expect(page[0].vaultId).toStrictEqual(auctionHistory2.vaultId)
      }
    })
  })
})

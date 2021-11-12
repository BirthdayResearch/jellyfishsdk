import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { AuctionDetail } from '../../../src/category/loan'

describe('Loan listAuctions', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let vaultId1: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    const collateralAddress = await testing.generateAddress()
    await testing.token.dfi({
      address: collateralAddress,
      amount: 300000
    })
    await testing.token.create({
      symbol: 'BTC',
      collateralAddress
    })
    await testing.generate(1)
    await testing.token.mint({
      symbol: 'BTC',
      amount: 11
    })
    await testing.generate(1)

    // Loan scheme
    await testing.container.call('createloanscheme', [100, 1, 'default'])
    await testing.generate(1)

    // Price oracle
    const addr = await testing.generateAddress()
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
    const oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '1@DFI',
        currency: 'USD'
      }]
    })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '10000@BTC',
        currency: 'USD'
      }]
    })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@AAPL',
        currency: 'USD'
      }]
    })
    await testing.generate(1)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@TSLA',
        currency: 'USD'
      }]
    })
    await testing.generate(1)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@MSFT',
        currency: 'USD'
      }]
    })
    await testing.generate(1)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@FB',
        currency: 'USD'
      }]
    })
    await testing.generate(1)

    // Collateral tokens
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await testing.generate(1)

    // Loan token
    await testing.rpc.loan.setLoanToken({
      symbol: 'AAPL',
      fixedIntervalPriceId: 'AAPL/USD'
    })
    await testing.generate(1)
    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)
    await testing.rpc.loan.setLoanToken({
      symbol: 'MSFT',
      fixedIntervalPriceId: 'MSFT/USD'
    })
    await testing.generate(1)
    await testing.rpc.loan.setLoanToken({
      symbol: 'FB',
      fixedIntervalPriceId: 'FB/USD'
    })
    await testing.generate(1)

    // Vault 1
    vaultId1 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId1, collateralAddress, '10000@DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId1, collateralAddress, '0.5@BTC'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId: vaultId1,
      amounts: '7500@AAPL'
    }])
    await testing.generate(1)

    // Vault 2
    const vaultId2 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId2, collateralAddress, '20000@0DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId2, collateralAddress, '1@BTC'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId: vaultId2,
      amounts: '15000@TSLA'
    }])
    await testing.generate(1)

    // Vault 3
    const vaultId3 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId3, collateralAddress, '30000@DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId3, collateralAddress, '1.5@BTC'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId: vaultId3,
      amounts: '22500@MSFT'
    }])
    await testing.generate(1)

    // Vault 4
    const vaultId4 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId4, collateralAddress, '40000@DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId4, collateralAddress, '2@BTC'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId: vaultId4,
      amounts: '30000@FB'
    }])
    await testing.generate(1)

    {
      // If there is no liquidation, return an empty array object
      const data = await testing.rpc.loan.listAuctions()
      expect(data).toStrictEqual([])
    }

    {
      const vault1 = await testing.rpc.loan.getVault(vaultId1)
      expect(vault1.state).toStrictEqual('active')

      const vault2 = await testing.rpc.loan.getVault(vaultId2)
      expect(vault2.state).toStrictEqual('active')

      const vault3 = await testing.rpc.loan.getVault(vaultId3)
      expect(vault3.state).toStrictEqual('active')

      const vault4 = await testing.rpc.loan.getVault(vaultId4)
      expect(vault4.state).toStrictEqual('active')
    }

    // Going to liquidate the vaults by price increase of the loan tokens
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2.2@AAPL',
        currency: 'USD'
      }]
    })
    await testing.generate(1)
    await testing.container.waitForActivePrice('AAPL/USD', '2.2')
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2.2@TSLA',
        currency: 'USD'
      }]
    })
    await testing.container.waitForActivePrice('TSLA/USD', '2.2')
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2.2@MSFT',
        currency: 'USD'
      }]
    })
    await testing.generate(1)
    await testing.container.waitForActivePrice('MSFT/USD', '2.2')
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2.2@FB',
        currency: 'USD'
      }]
    })
    await testing.generate(1)
    await testing.container.waitForActivePrice('FB/USD', '2.2')
    await testing.generate(1)

    const [auction1, auction2, auction3, auction4] = await testing.rpc.loan.listAuctions()
    {
      const vault1 = await testing.rpc.loan.getVault(auction1.vaultId)
      expect(vault1.state).toStrictEqual('inLiquidation')

      const vault2 = await testing.rpc.loan.getVault(auction2.vaultId)
      expect(vault2.state).toStrictEqual('inLiquidation')

      const vault3 = await testing.rpc.loan.getVault(auction3.vaultId)
      expect(vault3.state).toStrictEqual('inLiquidation')

      const vault4 = await testing.rpc.loan.getVault(auction4.vaultId)
      expect(vault4.state).toStrictEqual('inLiquidation')
    }
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  describe('listAuctions without pagination', () => {
    it('should listAuctions', async () => {
      const list = await testing.rpc.loan.listAuctions()
      const result = list.find(d => d.vaultId === vaultId1)
      // The collateral tokens of vault that are liquidated are sent to auction
      // For vaultId1, auction are divided into 2 batches,
      // the USD equivalent amount of every collateral tokens of non last batches are always 10,000
      // For 1st batch,
      // DFI qty (6666.6666) * DFI price (1) * DFI Col factor (1) + BTC qty (0.33333333) * BTC price (10000) * BTC Col factor (1)
      expect(6666.6666 * 1 * 1 + 0.33333333 * 10000 * 1).toStrictEqual(9999.999899999999) // There is minor discrepancy after the division.
      expect(result).toStrictEqual(
        {
          batchCount: 2,
          batches: [
            {
              collaterals: [
                '6666.66660000@DFI',
                '0.33333333@BTC'
              ],
              index: 0,
              loan: '5000.01992715@AAPL'
            },
            {
              collaterals: [
                '3333.33340000@DFI',
                '0.16666667@BTC'
              ],
              index: 1,
              loan: '2500.01003858@AAPL'
            }
          ],
          loanSchemeId: result?.loanSchemeId,
          ownerAddress: result?.ownerAddress,
          state: result?.state,
          liquidationHeight: result?.liquidationHeight,
          liquidationPenalty: result?.liquidationPenalty,
          vaultId: vaultId1
        }
      )
    })
  })

  describe('listAuctions with pagination', () => {
    let auction1: AuctionDetail
    let auction2: AuctionDetail
    let auction3: AuctionDetail
    let auction4: AuctionDetail

    beforeAll(async () => {
      [auction1, auction2, auction3, auction4] = await testing.rpc.loan.listAuctions()
    })

    it('should listAuctions with limit only', async () => {
      // List auctions with limit = size (When pass in limit only, including_start always = true)
      const pageLimit4 = await testing.rpc.loan.listAuctions({ limit: 4 })
      expect(pageLimit4.length).toStrictEqual(4)
      expect(pageLimit4[0].vaultId).toStrictEqual(auction1.vaultId)
      expect(pageLimit4[1].vaultId).toStrictEqual(auction2.vaultId)
      expect(pageLimit4[2].vaultId).toStrictEqual(auction3.vaultId)
      expect(pageLimit4[3].vaultId).toStrictEqual(auction4.vaultId)

      // List auctions with limit > size
      const pageLimit5 = await testing.rpc.loan.listAuctions({ limit: 5 })
      expect(pageLimit5.length).toStrictEqual(4)
      expect(pageLimit5).toStrictEqual(pageLimit4)
    })

    it('should listAuctions with height', async () => {
      // List for liquidation height of first vault
      // including_start = true
      {
        const page = await testing.rpc.loan.listAuctions(
          { start: { height: auction1.liquidationHeight }, including_start: true }
        )
        expect(page.length).toStrictEqual(4)
        expect(page[0].vaultId).toStrictEqual(auction1.vaultId)
        expect(page[1].vaultId).toStrictEqual(auction2.vaultId)
        expect(page[2].vaultId).toStrictEqual(auction3.vaultId)
        expect(page[3].vaultId).toStrictEqual(auction4.vaultId)
      }
      // including_start = false
      {
        const page = await testing.rpc.loan.listAuctions(
          { start: { height: auction1.liquidationHeight } } // Default = including_start = false
        )
        expect(page.length).toStrictEqual(3)
        expect(page[0].vaultId).toStrictEqual(auction2.vaultId)
        expect(page[1].vaultId).toStrictEqual(auction3.vaultId)
        expect(page[2].vaultId).toStrictEqual(auction4.vaultId)
      }

      // List for liquidation height of forth vault
      // including_start = true
      {
        const page = await testing.rpc.loan.listAuctions(
          { start: { height: auction4.liquidationHeight }, including_start: true }
        )
        expect(page.length).toStrictEqual(1)
        expect(page[0].vaultId).toStrictEqual(auction4.vaultId)
      }
      // including_start = false
      {
        const page = await testing.rpc.loan.listAuctions(
          { start: { height: auction4.liquidationHeight } }
        )
        expect(page.length).toStrictEqual(0)
      }
    })

    it('should listAuctions with vaultId', async () => {
      // including_start = true
      {
        const page = await testing.rpc.loan.listAuctions(
          { start: { vaultId: auction2.vaultId }, including_start: true }
        )
        expect(page.length).toStrictEqual(4) // Unable to filter by vaultId only. Need to filter both vaultId and height together.
      }
      // including_start = false
      {
        const page = await testing.rpc.loan.listAuctions(
          { start: { vaultId: auction2.vaultId } }
        )
        expect(page.length).toStrictEqual(3) // Unable to filter by vaultId only. Need to filter both vaultId and height together.
      }
    })

    it('should listAuctions with vaultId and height', async () => {
      // List for liquidation height of second vault and vaultId of second vault
      // including_start = true
      {
        const page = await testing.rpc.loan.listAuctions(
          { start: { vaultId: auction2.vaultId, height: auction2.liquidationHeight }, including_start: true }
        )
        expect(page.length).toStrictEqual(3)
        expect(page[0].vaultId).toStrictEqual(auction2.vaultId)
        expect(page[1].vaultId).toStrictEqual(auction3.vaultId)
        expect(page[2].vaultId).toStrictEqual(auction4.vaultId)
      }
      // including_start = false
      {
        const page = await testing.rpc.loan.listAuctions(
          { start: { vaultId: auction2.vaultId, height: auction2.liquidationHeight } }
        )
        expect(page.length).toStrictEqual(2)
        expect(page[0].vaultId).toStrictEqual(auction3.vaultId)
        expect(page[1].vaultId).toStrictEqual(auction4.vaultId)
      }
    })

    it('should listAuctions with vaultId, height and limit', async () => {
      // List for liquidation height and vaultId of first vault and limit = 2
      // including_start = true
      {
        const page = await testing.rpc.loan.listAuctions(
          {
            start: { vaultId: auction1.vaultId, height: auction1.liquidationHeight },
            including_start: true,
            limit: 2
          }
        )
        expect(page.length).toStrictEqual(2)
        expect(page[0].vaultId).toStrictEqual(auction1.vaultId)
        expect(page[1].vaultId).toStrictEqual(auction2.vaultId)
      }
      // including_start = false
      {
        const page = await testing.rpc.loan.listAuctions(
          {
            start: { vaultId: auction1.vaultId, height: auction1.liquidationHeight },
            limit: 2
          }
        )
        expect(page.length).toStrictEqual(2)
        expect(page[0].vaultId).toStrictEqual(auction2.vaultId)
        expect(page[1].vaultId).toStrictEqual(auction3.vaultId)
      }
      // List for liquidation height and vaultId of third vault and limit = 2
      // including_start = true
      {
        const page = await testing.rpc.loan.listAuctions(
          {
            start: { vaultId: auction3.vaultId, height: auction3.liquidationHeight },
            including_start: true,
            limit: 2
          }
        )
        expect(page.length).toStrictEqual(2)
        expect(page[0].vaultId).toStrictEqual(auction3.vaultId)
        expect(page[1].vaultId).toStrictEqual(auction4.vaultId)
      }
      // including_start = false
      {
        const page = await testing.rpc.loan.listAuctions(
          {
            start: { vaultId: auction3.vaultId, height: auction3.liquidationHeight },
            limit: 2
          }
        )
        expect(page.length).toStrictEqual(1)
        expect(page[0].vaultId).toStrictEqual(auction4.vaultId)
      }
    })
  })
})

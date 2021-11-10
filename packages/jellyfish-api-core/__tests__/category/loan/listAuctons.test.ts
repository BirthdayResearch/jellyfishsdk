import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { AuctionDetail } from '../../../src/category/loan'

describe('Loan listAuctions', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let oracleId: string
  let ownerAddressVault1: string
  let vaultId1: string
  let vaultId2: string
  let vaultId3: string
  let vaultId4: string
  let vaultId5: string
  let vaultId6: string

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
      },
      {
        token: 'AMZ',
        currency: 'USD'
      },
      {
        token: 'BIDU',
        currency: 'USD'
      }
    ]
    oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
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
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@AMZ',
        currency: 'USD'
      }]
    })
    await testing.generate(1)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@BIDU',
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
    await testing.rpc.loan.setLoanToken({
      symbol: 'AMZ',
      fixedIntervalPriceId: 'AMZ/USD'
    })
    await testing.generate(1)
    await testing.rpc.loan.setLoanToken({
      symbol: 'BIDU',
      fixedIntervalPriceId: 'BIDU/USD'
    })
    await testing.generate(1)

    // Vault 1
    ownerAddressVault1 = await testing.generateAddress()
    vaultId1 = await testing.rpc.container.call('createvault', [ownerAddressVault1, 'default'])
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
    vaultId2 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
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
    vaultId3 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
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
    vaultId4 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
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

    // Vault 5
    vaultId5 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId5, collateralAddress, '50000@DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId5, collateralAddress, '2.5@BTC'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId: vaultId5,
      amounts: '37500@AMZ'
    }])
    await testing.generate(1)

    // Vault 6
    vaultId6 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId6, collateralAddress, '60000@DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId6, collateralAddress, '3@BTC'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId: vaultId6,
      amounts: '45000@BIDU'
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

      const vault5 = await testing.rpc.loan.getVault(vaultId5)
      expect(vault5.state).toStrictEqual('active')

      const vault6 = await testing.rpc.loan.getVault(vaultId6)
      expect(vault6.state).toStrictEqual('active')
    }

    // Going to liquidate the vault by a price increase of the loan token
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
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2.2@AMZ',
        currency: 'USD'
      }]
    })
    await testing.generate(1)
    await testing.container.waitForActivePrice('AMZ/USD', '2.2')
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2.2@BIDU',
        currency: 'USD'
      }]
    })
    await testing.generate(1)
    await testing.container.waitForActivePrice('BIDU/USD', '2.2')
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  describe('listAuctions without pagination', () => {
    it('should listAuctions', async () => {
      {
        const vault1 = await testing.rpc.loan.getVault(vaultId1)
        expect(vault1.state).toStrictEqual('inLiquidation')

        const vault2 = await testing.rpc.loan.getVault(vaultId2)
        expect(vault2.state).toStrictEqual('inLiquidation')

        const vault3 = await testing.rpc.loan.getVault(vaultId3)
        expect(vault3.state).toStrictEqual('inLiquidation')

        const vault4 = await testing.rpc.loan.getVault(vaultId4)
        expect(vault4.state).toStrictEqual('inLiquidation')

        const vault5 = await testing.rpc.loan.getVault(vaultId5)
        expect(vault5.state).toStrictEqual('inLiquidation')

        const vault6 = await testing.rpc.loan.getVault(vaultId6)
        expect(vault6.state).toStrictEqual('inLiquidation')
      }

      // The collateral tokens of vault that are liquidated are sent to auction
      const list = await testing.rpc.loan.listAuctions()
      const vaultIds = list.map(v => v.vaultId)
      expect(list.length).toStrictEqual(6)
      expect(list[0].vaultId).toStrictEqual(vaultIds[0])
      expect(list[1].vaultId).toStrictEqual(vaultIds[1])
      expect(list[2].vaultId).toStrictEqual(vaultIds[2])
      expect(list[3].vaultId).toStrictEqual(vaultIds[3])
      expect(list[4].vaultId).toStrictEqual(vaultIds[4])
      expect(list[5].vaultId).toStrictEqual(vaultIds[5])

      const result = list.filter(d => d.vaultId === vaultId1)
      // Auction are divided into 2 batches,
      // the USD equivalent amount of every collateral tokens of non last batches are always 10,000
      // For 1st batch,
      // DFI qty (6666.6666) * DFI price (1) * DFI Col factor (1) + BTC qty (0.33333333) * BTC price (10000) * BTC Col factor (1)
      expect(6666.6666 * 1 * 1 + 0.33333333 * 10000 * 1).toStrictEqual(9999.999899999999) // We can assume this is 10,000, there is minor discrepancy after the division.
      expect(result).toStrictEqual(
        [{
          batchCount: 2,
          batches: [
            {
              collaterals: [
                '6666.66660000@DFI',
                '0.33333333@BTC'
              ],
              index: new BigNumber(0),
              loan: '5000.02753749@AAPL'
            },
            {
              collaterals: [
                '3333.33340000@DFI',
                '0.16666667@BTC'
              ],
              index: new BigNumber(1),
              loan: '2500.01384376@AAPL'
            }
          ],
          loanSchemeId: 'default',
          ownerAddress: ownerAddressVault1,
          state: 'inLiquidation',
          liquidationHeight: 223,
          liquidationPenalty: 5,
          vaultId: vaultId1
        }]
      )
    })
  })

  describe('listAuctions with pagination', () => {
    let list: AuctionDetail[]
    let vaultIds: string[]

    beforeAll(async () => {
      list = await testing.rpc.loan.listAuctions()
      vaultIds = list.map(v => v.vaultId)
    })

    it('should listAuctions with limit', async () => {
      // List auctions with limit = size
      const listWithLimit6 = await testing.rpc.loan.listAuctions({ limit: 6 })
      expect(listWithLimit6.length).toStrictEqual(6)
      expect(listWithLimit6[0].vaultId).toStrictEqual(vaultIds[0])
      expect(listWithLimit6[1].vaultId).toStrictEqual(vaultIds[1])
      expect(listWithLimit6[2].vaultId).toStrictEqual(vaultIds[2])
      expect(listWithLimit6[3].vaultId).toStrictEqual(vaultIds[3])
      expect(listWithLimit6[4].vaultId).toStrictEqual(vaultIds[4])
      expect(listWithLimit6[5].vaultId).toStrictEqual(vaultIds[5])
      expect(listWithLimit6).toStrictEqual(list)

      // List auctions with limit > size
      const listWithLimit7 = await testing.rpc.loan.listAuctions({ limit: 7 })
      expect(listWithLimit7.length).toStrictEqual(6)
      expect(listWithLimit7).toStrictEqual(list)
    })

    it('should listAuctions with height', async () => {
      // List for liquidation height for vault1
      {
        const page = await testing.rpc.loan.listAuctions(
          { start: { height: 222 }, including_start: true }
        )
        expect(page.length).toStrictEqual(6)
      }

      {
        const page = await testing.rpc.loan.listAuctions(
          { start: { height: 222 } }
        )
        expect(page.length).toStrictEqual(5)
      }

      // List for liquidation height for vault6
      {
        const page = await testing.rpc.loan.listAuctions(
          { start: { height: 247 }, including_start: true }
        )
        expect(page.length).toStrictEqual(1)
      }

      {
        const page = await testing.rpc.loan.listAuctions(
          { start: { height: 247 } }
        )
        expect(page.length).toStrictEqual(0)
      }
    })

    describe('should listAuctions with vaultId and height', () => {
      it('Should listAuctions', async () => {
        {
          const page = await testing.rpc.loan.listAuctions(
            { start: { vaultId: vaultIds[1], height: 168 } }
          )
          // should be 2 entries
          expect(page.length).toStrictEqual(2)
          expect(page[0].vaultId).toStrictEqual(vaultIds[2])
          expect(page[1].vaultId).toStrictEqual(vaultIds[3])
        }

        {
          const page = await testing.rpc.loan.listAuctions(
            { start: { vaultId: vaultIds[3], height: 168 }, limit: 2 }
          )

          // should be 0 entry
          expect(page.length).toStrictEqual(0)
        }
      })

      it('should listAuctions with including_start = true', async () => {
        const page = await testing.rpc.loan.listAuctions(
          { start: { vaultId: vaultIds[2], height: 168 }, including_start: true }
        )
        // should be 2 entries
        expect(page.length).toStrictEqual(2)
        expect(page[0].vaultId).toStrictEqual(vaultIds[2])
        expect(page[1].vaultId).toStrictEqual(vaultIds[3])
      })
    })
  })
})

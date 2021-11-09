import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
// import { VaultState } from '../../../src/category/loan'

describe('Loan listAuctions', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let oracleId: string
  let ownerAddressVault1: string
  let vaultId1: string
  let vaultId2: string
  let vaultId3: string
  let vaultId4: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    const collateralAddress = await testing.generateAddress()
    await testing.token.dfi({
      address: collateralAddress,
      amount: 100000
    })
    await testing.token.create({
      symbol: 'BTC',
      collateralAddress
    })
    await testing.generate(1)
    await testing.token.mint({
      symbol: 'BTC',
      amount: 5
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
        token: 'TSLA',
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
        tokenAmount: '2@TSLA',
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
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
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
      amounts: '7500@TSLA'
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
      amounts: '22500@TSLA'
    }])
    await testing.generate(1)

    // Vault 4
    const ownerAddress = await testing.generateAddress()
    vaultId4 = await testing.rpc.container.call('createvault', [ownerAddress, 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId4, collateralAddress, '40000@DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId4, collateralAddress, '2@BTC'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId: vaultId4,
      amounts: '30000@TSLA'
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

    // Going to liquidate the vault by a price increase of the loan token
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2.2@TSLA',
        currency: 'USD'
      }]
    })
    await testing.generate(10)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

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
    }

    // The collateral tokens of vault that are liquidated are sent to auction
    const data = await testing.rpc.loan.listAuctions()
    expect(data.length).toStrictEqual(4)
    const result = data.filter(d => d.vaultId === vaultId1)
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
            loan: '5000.01897586@TSLA'
          },
          {
            collaterals: [
              '3333.33340000@DFI',
              '0.16666667@BTC'
            ],
            index: new BigNumber(1),
            loan: '2500.00956293@TSLA'
          }
        ],
        loanSchemeId: 'default',
        ownerAddress: ownerAddressVault1,
        state: 'inLiquidation',
        liquidationHeight: 168,
        liquidationPenalty: 5,
        vaultId: vaultId1
      }]
    )
  })

  it('should listAuctions with pagination', async () => {
    const list = await testing.rpc.loan.listAuctions()
    const vaultIds = list.map(d => d.vaultId)

    expect(list.length).toStrictEqual(4)
    expect(list[0].vaultId).toStrictEqual(vaultIds[0])
    expect(list[1].vaultId).toStrictEqual(vaultIds[1])
    expect(list[2].vaultId).toStrictEqual(vaultIds[2])
    expect(list[3].vaultId).toStrictEqual(vaultIds[3])

    // List auctions with no of limit > size
    const listWithLimit5 = await testing.rpc.loan.listAuctions({ limit: 5 })
    expect(listWithLimit5.length).toStrictEqual(4)
    expect(listWithLimit5).toStrictEqual(list)

    // Fetch the first page
    {
      const page = await testing.rpc.loan.listAuctions({ limit: 2 })
      expect(page.length).toStrictEqual(2)
      expect(page[0].vaultId).toStrictEqual(vaultIds[0])
      expect(page[1].vaultId).toStrictEqual(vaultIds[1])
    }

    // Fetch the second page
    {
      const page = await testing.rpc.loan.listAuctions(
        { start: { vaultId: vaultIds[1], height: 168 }, including_start: false, limit: 2 }
      )

      console.log(page)

      // should be 2 entries
      expect(page.length).toStrictEqual(2) // total 4, started at index[2], listing 2
      expect(page[2].vaultId).toStrictEqual(vaultIds[2])
      expect(page[3].vaultId).toStrictEqual(vaultIds[3])
    }

    // fetch the second page with including_start = true
    {
      const page = await testing.rpc.loan.listAuctions(
        { start: { vaultId: vaultIds[2], height: 168 }, including_start: true, limit: 2 }
      )
      // should be 3 entries
      expect(page.length).toStrictEqual(3) // total 4, including_start, started at index[1], listing 3
      expect(page[1].vaultId).toStrictEqual(vaultIds[1])
      expect(page[2].vaultId).toStrictEqual(vaultIds[2])
      expect(page[3].vaultId).toStrictEqual(vaultIds[3])
    }

    // fetch the third page
    {
      const page = await testing.rpc.loan.listAuctions(
        { start: { vaultId: 'invalid', height: 168 }, including_start: true, limit: 2 }
      )
      // should be 0 entry
      expect(page.length).toStrictEqual(0)
    }

    // fetch the third page with including_start = false
    {
      const page = await testing.rpc.loan.listAuctions(
        { start: { vaultId: 'invalid', height: 168 }, including_start: true, limit: 2 }
      )
      // should be 0 entry
      expect(page.length).toStrictEqual(0)
    }
  })
})

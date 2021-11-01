import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan listAuctions', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let collateralAddress: string
  let oracleId: string
  let vaultId1: string
  let vaultId2: string
  let vaultId3: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    collateralAddress = await testing.generateAddress()
    await testing.token.dfi({
      address: collateralAddress,
      amount: 80000
    })
    await testing.token.create({
      symbol: 'BTC',
      collateralAddress
    })
    await testing.generate(1)
    await testing.token.mint({
      symbol: 'BTC',
      amount: 40000
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
    const ownerAddress = await testing.generateAddress()
    vaultId1 = await testing.rpc.container.call('createvault', [ownerAddress, 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId1, collateralAddress, '20000@DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId1, collateralAddress, '2@BTC'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId: vaultId1,
      amounts: '19000@TSLA'
    }])
    await testing.generate(1)

    // Vault 2
    vaultId2 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId2, collateralAddress, '20000@DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId2, collateralAddress, '2@BTC'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId: vaultId2,
      amounts: '20000@TSLA'
    }])
    await testing.generate(1)

    // Vault 3
    vaultId3 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId3, collateralAddress, '20000@DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId3, collateralAddress, '2@BTC'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId: vaultId3,
      amounts: '20000@TSLA'
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
    }

    // Going to liquidate the vault by a price hike of the loan token
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

  describe('Loan listAuctions without pagination', () => {
    it('should listAuctions', async () => {
      {
        const vault1 = await testing.rpc.loan.getVault(vaultId1)
        expect(vault1.state).toStrictEqual('inLiquidation')

        const vault2 = await testing.rpc.loan.getVault(vaultId2)
        expect(vault2.state).toStrictEqual('inLiquidation')
      }
      // The collateral tokens of vault that are liquidated are sent to auction
      const data = await testing.rpc.loan.listAuctions()
      expect(data.length).toStrictEqual(3)
      const result = data.filter(d => d.vaultId === vaultId1)
      // Auction are divided into 4 batches,
      // the USD equivalent amount of every collateral tokens of non last batches are always 10,000
      // For 1st, 2nd and 3rd batch,
      // DFI qty (6666.6666) * DFI price (1) * DFI Col factor (1) + BTC qty (0.66666666) * BTC price (10000) * BTC Col factor (0.5)
      expect(6666.6666 * 1 * 1 + 0.66666666 * 10000 * 0.5).toStrictEqual(9999.999899999999) // We can assume this is 10,000, there is minor discrepancy after the division.
      expect(result).toStrictEqual(
        [{
          batchCount: 4,
          batches: [
            {
              collaterals: [
                '5000.00000000@DFI',
                '0.50000000@BTC'
              ],
              index: new BigNumber(0),
              loan: '4750.01265218@TSLA'
            },
            {
              collaterals: [
                '5000.00000000@DFI',
                '0.50000000@BTC'
              ],
              index: new BigNumber(1),
              loan: '4750.01265218@TSLA'
            },
            {
              collaterals: [
                '5000.00000000@DFI',
                '0.50000000@BTC'
              ],
              index: new BigNumber(2),
              loan: '4750.01265218@TSLA'
            },
            {
              collaterals: [
                '5000.00000000@DFI',
                '0.50000000@BTC'
              ],
              index: new BigNumber(3),
              loan: '4750.01265218@TSLA'
            }
          ],
          loanSchemeId: 'default',
          ownerAddress: collateralAddress,
          state: 'inLiquidation',
          liquidationHeight: 162,
          liquidationPenalty: 5,
          vaultId: vaultId1
        }]
      )
    })
  })

  // describe('Loan listAuctions with pagination', () => {
  //   it('should listVaults with pagination', async () => {
  //     const data = await testing.rpc.loan.listAuctions({ limit: 2 })
  //     expect(data.length).toStrictEqual(2)
  //
  //     const data1 = await testing.rpc.loan.listAuctions({
  //       start: { vaultId: vaultId2 },
  //       including_start: false
  //       // limit: 2
  //     })
  //
  //     console.log(data1)
  //   })

  //
  // it('should listAuctions with start = vaultId', async () => {
  //   // {
  //   console.log(vaultId1)
  //   const data = await testing.rpc.loan.listAuctions({ start: { vaultId: vaultId1, height: 200 } })
  //   expect(data[0].vaultId).toStrictEqual(vaultId1)
  //   // }
  //
  //   // {
  //   //   const data = await testing.rpc.loan.listAuctions({ start: vaultId2 })
  //   //   expect(data[0].vaultId).toStrictEqual(vaultId2)
  //   // }
  // })
  //
  // it('should listAuctions with including_start = true', async () => {
  //   {
  //     const data = await testing.rpc.loan.listAuctions({ including_start: true })
  //     expect(data.length).toStrictEqual(2)
  //   }
  //   {
  //     const data = await testing.rpc.loan.listAuctions({ including_start: false })
  //     expect(data.length).toStrictEqual(1)
  //   }
  // })
  //
  // it('should listAuctions with limit = 1', async () => {
  //   const data = await testing.rpc.loan.listAuctions({ limit: 1 })
  //   expect(data.length).toStrictEqual(1)
  // })
  // })
})

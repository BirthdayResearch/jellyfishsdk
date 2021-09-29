import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { ListAuction } from '../../../src/category/loan'

describe('Loan listAuctions', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let collateralAddress: string
  let oracleId: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    collateralAddress = await testing.generateAddress()
    await testing.token.dfi({ address: collateralAddress, amount: 30000 })
    await testing.token.create({ symbol: 'BTC', collateralAddress })
    await testing.generate(1)
    await testing.token.mint({ symbol: 'BTC', amount: 20000 })
    await testing.generate(1)

    // loan scheme
    await testing.container.call('createloanscheme', [100, 1, 'default'])
    await testing.generate(1)

    // price oracle
    const addr = await testing.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' }
    ]
    oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })

    // collateral tokens
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      priceFeedId: 'DFI/USD'
    })
    await testing.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      priceFeedId: 'BTC/USD'
    })
    await testing.generate(1)

    // loan token
    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      priceFeedId: 'TSLA/USD'
    })
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should listAuctions', async () => {
    // Vault 1
    const ownerAddress1 = await testing.generateAddress()
    const vaultId1 = await testing.rpc.container.call('createvault', [ownerAddress1, 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId1, collateralAddress, '10000@DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId1, collateralAddress, '1@BTC'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId: vaultId1,
      amounts: '30@TSLA'
    }])
    await testing.generate(1)

    // Vault 2
    const ownerAddress2 = await testing.generateAddress()
    const vaultId2 = await testing.rpc.container.call('createvault', [ownerAddress2, 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId2, collateralAddress, '20000@DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId2, collateralAddress, '2@BTC'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId: vaultId2,
      amounts: '60@TSLA'
    }])
    await testing.generate(1)

    // Not liquidated
    const data = await testing.rpc.loan.listAuctions()
    expect(data).toStrictEqual([])

    // make vault enter under liquidation state by a price hike of the loan token
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1000@TSLA', currency: 'USD' }] })
    await testing.generate(1)

    // Liquidated
    const data1: ListAuction[] = await testing.rpc.loan.listAuctions()
    const result1 = data1.filter(d => d.vaultId === vaultId1)
    expect(result1).toStrictEqual(
      [{
        batchCount: new BigNumber(2),
        batches: [
          {
            collaterals: [
              '6666.66660000@DFI',
              '0.66666666@BTC'
            ],
            index: new BigNumber(0),
            loan: '19.99999980@TSLA'
          },
          {
            collaterals: [
              '3333.33340000@DFI',
              '0.33333334@BTC'
            ],
            index: new BigNumber(1),
            loan: '10.00000020@TSLA'
          }
        ],
        liquidationPenalty: new BigNumber(5),
        vaultId: vaultId1
      }]
    )

    const data2: ListAuction[] = await testing.rpc.loan.listAuctions()
    const result2 = data2.filter(d => d.vaultId === vaultId2)
    expect(result2).toStrictEqual(
      [{
        batchCount: new BigNumber(4),
        batches: [
          {
            collaterals: [
              '6666.66660000@DFI',
              '0.66666666@BTC'
            ],
            index: new BigNumber(0),
            loan: '19.99999980@TSLA'
          },
          {
            collaterals: [
              '6666.66660000@DFI',
              '0.66666666@BTC'
            ],
            index: new BigNumber(1),
            loan: '19.99999980@TSLA'
          },
          {
            collaterals: [
              '6666.66660000@DFI',
              '0.66666666@BTC'
            ],
            index: new BigNumber(2),
            loan: '19.99999980@TSLA'
          },
          {
            collaterals: [
              '0.00020000@DFI',
              '0.00000002@BTC'
            ],
            index: new BigNumber(3),
            loan: '0.00000060@TSLA'
          }
        ],
        liquidationPenalty: new BigNumber(5),
        vaultId: vaultId2
      }]
    )
  })
})

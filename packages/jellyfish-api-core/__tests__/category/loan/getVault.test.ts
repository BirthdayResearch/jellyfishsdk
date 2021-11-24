import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'
import { VaultActive, VaultState } from '../../../src/category/loan'

describe('Loan getVault', () => {
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
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{ tokenAmount: '1@DFI', currency: 'USD' }]
    })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }]
    })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }]
    })
    await testing.generate(1)

    // collateral tokens
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await testing.generate(1)

    // loan token
    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getVault', async () => {
    const ownerAddress = await testing.generateAddress()
    const vaultId = await testing.rpc.container.call('createvault', [ownerAddress, 'default'])
    await testing.container.generate(1)

    const data = await testing.rpc.loan.getVault(vaultId)
    expect(data).toStrictEqual({
      vaultId: vaultId,
      loanSchemeId: 'default', // Get default loan scheme
      ownerAddress: ownerAddress,
      state: VaultState.ACTIVE,
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: [],
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      interestValue: expect.any(BigNumber),
      collateralRatio: expect.any(Number),
      informativeRatio: expect.any(BigNumber)
    })
  })

  it('should getVault with deposited collateral details', async () => {
    const ownerAddress = await testing.generateAddress()
    const vaultId = await testing.rpc.container.call('createvault', [ownerAddress, 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId, collateralAddress, '10000@DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId, collateralAddress, '1@BTC'])
    await testing.generate(1)

    const data = await testing.rpc.loan.getVault(vaultId)
    expect(data).toStrictEqual({
      vaultId: vaultId,
      loanSchemeId: 'default', // Get default loan scheme
      ownerAddress: ownerAddress,
      state: VaultState.ACTIVE,
      collateralAmounts: ['10000.00000000@DFI', '1.00000000@BTC'],
      loanAmounts: [],
      interestAmounts: [],
      // (10000 DFI * DFIUSD Price * DFI collaterization factor 1) + (1BTC * BTCUSD Price * BTC collaterization factor 0.5)
      collateralValue: new BigNumber(10000 * 1 * 1).plus(new BigNumber(1 * 10000 * 0.5)),
      loanValue: new BigNumber(0),
      interestValue: new BigNumber(0),
      collateralRatio: -1,
      informativeRatio: new BigNumber(-1)
    })
  })

  it('should getVault with loan details', async () => {
    const ownerAddress = await testing.generateAddress()
    const vaultId = await testing.rpc.container.call('createvault', [ownerAddress, 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId, collateralAddress, '10000@DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId, collateralAddress, '1@BTC'])
    await testing.generate(1)

    // take loan
    await testing.container.call('takeloan', [{ vaultId: vaultId, amounts: '30@TSLA' }])
    await testing.generate(1)

    // interest info.
    const interestInfo: any = await testing.rpc.call('getinterest', ['default', 'TSLA'], 'bignumber')

    const data = await testing.rpc.loan.getVault(vaultId) as VaultActive
    const informativeRatio: BigNumber = data.collateralValue.dividedBy(data.loanValue).multipliedBy(100)

    expect(data).toStrictEqual({
      vaultId: vaultId,
      loanSchemeId: 'default', // Get default loan scheme
      ownerAddress: ownerAddress,
      state: VaultState.ACTIVE,
      collateralAmounts: ['10000.00000000@DFI', '1.00000000@BTC'],
      // 30 TSLA + total interest
      loanAmounts: [new BigNumber(30).plus(interestInfo[0].totalInterest).toFixed(8) + '@TSLA'], // 30.00000570@TSLA
      interestAmounts: ['0.00000570@TSLA'],
      // (10000 DFI * DFIUSD Price * DFI collaterization factor 1) + (1BTC * BTCUSD Price * BTC collaterization factor 0.5)
      collateralValue: new BigNumber(10000 * 1 * 1).plus(new BigNumber(1 * 10000 * 0.5)),
      // (30 TSLA + total interest) * TSLAUSD Price
      loanValue: new BigNumber(30).plus(interestInfo[0].totalInterest).multipliedBy(2),
      interestValue: new BigNumber(0.0000114),
      // lround ((collateral value / loan value) * 100)
      collateralRatio: Math.ceil(informativeRatio.toNumber()), // 25000
      informativeRatio: new BigNumber(informativeRatio.toFixed(5)) // 24999.995250000902 -> 24999.99525
    })
  })

  it('should getVault with liquidated vault', async () => {
    const ownerAddress = await testing.generateAddress()
    const vaultId = await testing.rpc.container.call('createvault', [ownerAddress, 'default'])
    await testing.generate(1)

    await testing.container.call('deposittovault', [vaultId, collateralAddress, '10000@DFI'])
    await testing.generate(1)
    await testing.container.call('deposittovault', [vaultId, collateralAddress, '1@BTC'])
    await testing.generate(1)

    // take loan
    await testing.container.call('takeloan', [{ vaultId: vaultId, amounts: '30@TSLA' }])
    await testing.generate(1)

    // check vault not under liquidation.
    const data = await testing.rpc.loan.getVault(vaultId)
    expect(data.state).toStrictEqual(VaultState.ACTIVE)

    // make vault enter under liquidation state by a price hike of the loan token
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{ tokenAmount: '1000@TSLA', currency: 'USD' }]
    })
    await testing.generate(12) // Wait for 12 blocks which are equivalent to 2 hours (1 block = 10 minutes) in order to liquidate the vault

    // get auction details
    await testing.rpc.account.sendTokensToAddress({}, { [collateralAddress]: ['40@TSLA'] })
    await testing.generate(1)

    const txid = await testing.container.call('placeauctionbid', [vaultId, 0, collateralAddress, '40@TSLA'])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await testing.generate(1)

    const vaultDataAfterPriceHike = await testing.rpc.loan.getVault(vaultId)
    expect(vaultDataAfterPriceHike).toStrictEqual({
      vaultId: vaultId,
      loanSchemeId: 'default', // Get default loan scheme
      ownerAddress: ownerAddress,
      state: VaultState.IN_LIQUIDATION,
      liquidationHeight: 168,
      liquidationPenalty: 5,
      batchCount: 2,
      batches: [
        {
          collaterals: [
            '6666.66660000@DFI',
            '0.66666666@BTC'
          ],
          index: 0,
          loan: '20.00004539@TSLA',
          highestBid: {
            amount: '40.00000000@TSLA',
            owner: collateralAddress
          }
        },
        {
          collaterals: [
            '3333.33340000@DFI',
            '0.33333334@BTC'
          ],
          index: 1,
          loan: '10.00002301@TSLA'
        }
      ]
    })

    // set the price oracle back to original price
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }]
    })
  })

  it('should not getVault if vault id is invalid', async () => {
    {
      // Pass non existing hex id
      const promise = testing.rpc.loan.getVault('2cca2e3be0504af2daac12255cb5a691447e0aa3c9ca9120fb634a96010d2b4f')
      await expect(promise).rejects.toThrow('RpcApiError: \'Vault <2cca2e3be0504af2daac12255cb5a691447e0aa3c9ca9120fb634a96010d2b4f> not found\', code: -20, method: getvault')
    }
    {
      // Pass hex id with invalid length
      const promise = testing.rpc.loan.getVault(Buffer.from('INVALID_VAULT_ID').toString('hex'))
      await expect(promise).rejects.toThrow('RpcApiError: \'vaultId must be of length 64 (not 32, for \'494e56414c49445f5641554c545f4944\')\', code: -8, method: getvault')
    }
    {
      // Pass non hex id
      const promise = testing.rpc.loan.getVault('x'.repeat(64))
      await expect(promise).rejects.toThrow('RpcApiError: \'vaultId must be hexadecimal string (not \'' + 'x'.repeat(64) + '\')\', code: -8, method: getvault')
    }
  })
})

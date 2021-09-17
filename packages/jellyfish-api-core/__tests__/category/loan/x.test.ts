import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Loan', () => {
  let vaultId: string
  let vaultId1: string
  let collateralAddress: string

  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  async function setup (): Promise<void> {
    // token setup
    collateralAddress = await testing.generateAddress()
    await testing.token.dfi({ address: collateralAddress, amount: 20000 })
    await testing.generate(1)
    await testing.token.create({ symbol: 'BTC', collateralAddress })
    await testing.generate(1)
    await testing.token.mint({ symbol: 'BTC', amount: 20000 })
    await testing.generate(1)

    // oracle setup
    const addr = await testing.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' }
    ]
    const oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await testing.generate(1)
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await testing.generate(1)

    // collateral token
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      priceFeedId: oracleId
      // activateAfterBlock: 130  // <- hit socket hang up
    })
    await testing.generate(1)

    await testing.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(1),
      priceFeedId: oracleId
    })
    await testing.generate(1)

    // loan token
    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      priceFeedId: oracleId
    })
    await testing.generate(1)

    // loan scheme set up
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await testing.generate(1)

    vaultId = await testing.rpc.loan.createVault({
      ownerAddress: await testing.generateAddress(),
      loanSchemeId: 'scheme'
    })
    await testing.generate(1)

    vaultId1 = await testing.rpc.loan.createVault({
      ownerAddress: await testing.generateAddress(),
      loanSchemeId: 'scheme'
    })
    await testing.generate(1)
  }

  it('should be failed as first deposit must be DFI', async () => {
    const promise = testing.rpc.loan.depositToVault({
      id: vaultId, from: collateralAddress, amount: '1@BTC'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('At least 50% of the vault must be in DFI thus first deposit must be DFI')
  })

  it('should be failed as insufficient fund', async () => {
    const promise = testing.rpc.loan.depositToVault({
      id: vaultId, from: collateralAddress, amount: '99999@DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Insufficient funds: can't subtract balance of ${collateralAddress}: amount 20000.00000000 is less than 99999.00000000`)
  })

  it('should be failed as different auth address', async () => {
    const addr = GenesisKeys[1].owner.address
    const promise = testing.rpc.loan.depositToVault({
      id: vaultId, from: addr, amount: '1@DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Incorrect authorization for ${addr}`)
  })

  it('should be failed as vault is not exists', async () => {
    const promise = testing.rpc.loan.depositToVault({
      id: '0'.repeat(64), from: collateralAddress, amount: '10000@DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
  })

  it('should depositToVault', async () => {
    {
      const vaultBefore = await testing.container.call('getvault', [vaultId])
      const vaultBeforeDFIAcc = vaultBefore.collateralAmounts.length > 0
        ? vaultBefore.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'DFI')
        : undefined
      const vaultBeforeDFIAmt = vaultBeforeDFIAcc !== undefined ? Number(vaultBeforeDFIAcc.split('@')[0]) : 0

      const depositId = await testing.rpc.loan.depositToVault({
        id: vaultId, from: collateralAddress, amount: '10000@DFI'
      })
      expect(typeof depositId).toStrictEqual('string')
      await testing.generate(1)

      const vaultAfter = await testing.container.call('getvault', [vaultId])
      const vaultAfterDFIAcc = vaultAfter.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'DFI')
      const vaultAFterDFIAmt = Number(vaultAfterDFIAcc.split('@')[0])
      expect(vaultAFterDFIAmt - vaultBeforeDFIAmt).toStrictEqual(10000)
    }

    {
      const vaultBefore = await testing.container.call('getvault', [vaultId])
      const vaultBeforeBTCAcc = vaultBefore.collateralAmounts.length > 0
        ? vaultBefore.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'BTC')
        : undefined
      const vaultBeforeBTCAmt = vaultBeforeBTCAcc !== undefined ? Number(vaultBeforeBTCAcc.split('@')[0]) : 0

      const depositId = await testing.rpc.loan.depositToVault({
        id: vaultId, from: collateralAddress, amount: '1@BTC'
      })
      expect(typeof depositId).toStrictEqual('string')
      await testing.generate(1)

      const vaultAfter = await testing.container.call('getvault', [vaultId])
      const vaultAfterBTCAcc = vaultAfter.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'BTC')
      const vaultAFterBTCAmt = Number(vaultAfterBTCAcc.split('@')[0])
      expect(vaultAFterBTCAmt - vaultBeforeBTCAmt).toStrictEqual(1)
    }
  })

  it('should depositToVault with utxos', async () => {
    const vaultBefore = await testing.container.call('getvault', [vaultId])
    const vaultBeforeDFIAcc = vaultBefore.collateralAmounts.length > 0
      ? vaultBefore.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'DFI')
      : undefined
    const vaultBeforeDFIAmt = vaultBeforeDFIAcc !== undefined ? Number(vaultBeforeDFIAcc.split('@')[0]) : 0

    const utxo = await testing.container.fundAddress(collateralAddress, 250)
    const depositId = await testing.rpc.loan.depositToVault({
      id: vaultId, from: collateralAddress, amount: '250@DFI'
    }, [utxo])
    expect(typeof depositId).toStrictEqual('string')
    await testing.generate(1)

    const vaultAfter = await testing.container.call('getvault', [vaultId])
    const vaultAfterDFIAcc = vaultAfter.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'DFI')
    const vaultAFterDFIAmt = Number(vaultAfterDFIAcc.split('@')[0])
    expect(vaultAFterDFIAmt - vaultBeforeDFIAmt).toStrictEqual(250)

    const rawtx = await testing.container.call('getrawtransaction', [depositId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should be failed as vault must contain min 50% of DFI', async () => {
    await testing.rpc.loan.depositToVault({
      id: vaultId1, from: collateralAddress, amount: '100@DFI'
    })
    await testing.generate(1)

    const promise = testing.rpc.loan.depositToVault({
      id: vaultId1, from: collateralAddress, amount: '100@BTC'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('At least 50% of the vault must be in DFI')
  })
})

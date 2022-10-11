import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '../../../src'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)
let mnAddress: string
let collateralAddress: string
let vaultId: string

async function setup (): Promise<void> {
  mnAddress = RegTestFoundationKeys[0].owner.address
  collateralAddress = await testing.generateAddress()

  await testing.token.dfi({ address: collateralAddress, amount: 300000 })
  await testing.generate(1)

  // oracle setup
  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'DUSD', currency: 'USD' }
  ]

  const addr = await testing.generateAddress()
  const oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
  await testing.generate(1)

  const timestamp = Math.floor(new Date().getTime() / 1000)
  await testing.rpc.oracle.setOracleData(
    oracleId,
    timestamp,
    {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '1@TSLA', currency: 'USD' },
        { tokenAmount: '1@DUSD', currency: 'USD' }
      ]
    }
  )
  await testing.generate(1)

  // setLoanToken DUSD
  await testing.rpc.loan.setLoanToken({
    symbol: 'DUSD',
    fixedIntervalPriceId: 'DUSD/USD'
  })
  await testing.generate(20)

  // setLoanToken TSLA
  await testing.rpc.loan.setLoanToken({
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await testing.generate(1)

  // mint DUSD
  await testing.token.mint({ symbol: 'DUSD', amount: 20000 })
  await testing.generate(1)

  // create loan scheme
  await testing.rpc.loan.createLoanScheme({
    minColRatio: 150,
    interestRate: new BigNumber(1),
    id: 'LOAN001'
  })

  // set collateral tokens
  await testing.rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'DUSD',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DUSD/USD'
  })
  await testing.generate(1)

  await testing.rpc.account.utxosToAccount({ [mnAddress]: '10000@DFI' })
  await testing.generate(1)

  // create DUSD-DFI
  await testing.poolpair.create({
    tokenA: 'DUSD',
    tokenB: 'DFI',
    ownerAddress: mnAddress
  })
  await testing.generate(1)

  // add pool liquidity
  await testing.rpc.poolpair.addPoolLiquidity({
    [mnAddress]: ['5000@DFI', '5000@DUSD']
  }, mnAddress)
  await testing.generate(1)

  await testing.rpc.account.accountToAccount(mnAddress, { [collateralAddress]: '2000@DFI' })
  await testing.rpc.account.accountToAccount(mnAddress, { [collateralAddress]: '2000@DUSD' })
  await testing.generate(1)

  // enable loan payback with collateral
  const idDUSD = await testing.token.getTokenId('DUSD')
  await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/token/${idDUSD}/loan_payback_collateral`]: 'true' } })
  await testing.generate(1)

  // create a vault
  const vaultAddress = await testing.generateAddress()
  vaultId = await testing.rpc.vault.createVault({
    ownerAddress: vaultAddress,
    loanSchemeId: 'LOAN001'
  })
  await testing.generate(1)
}

describe('paybackLoanWithCollateral - error cases', () => {
  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should throw error if vault id does not exist', async () => {
    const invalidVaultId = 'd426270a42af9c677a42026b14b2adbc569cad80bb16fc1d82e6548a798185a7'

    const promise = testing.rpc.loan.paybackWithCollateral(invalidVaultId)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise)
      .rejects
      .toThrowError(`RpcApiError: 'Vault <${invalidVaultId}> not found', code: -5, method: paybackwithcollateral`)
  })

  it('should throw error if payback of loan with collateral is not active', async () => {
    const idDUSD = await testing.token.getTokenId('DUSD')
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/token/${idDUSD}/loan_payback_collateral`]: 'false' } })
    await testing.generate(1)

    const promise = testing.rpc.loan.paybackWithCollateral(vaultId)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise)
      .rejects
      .toThrowError(/Payback of DUSD loan with collateral is not currently active/)
  })

  it('should throw error if vault has no collateral', async () => {
    const promise = testing.rpc.loan.paybackWithCollateral(vaultId)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise)
      .rejects
      .toThrowError(/Vault has no collaterals/)
  })

  it('should throw error if vault has no DUSD collateral', async () => {
    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '2000@DFI'
    })
    await testing.generate(1)
    const promise = testing.rpc.loan.paybackWithCollateral(vaultId)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise)
      .rejects
      .toThrowError(/Vault does not have any DUSD collaterals/)
  })

  it('should throw error if vault has no loans', async () => {
    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '2000@DUSD'
    })
    await testing.generate(1)
    const promise = testing.rpc.loan.paybackWithCollateral(vaultId)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise)
      .rejects
      .toThrowError(/Vault has no loans/)
  })

  it('should throw error if vault has no DUSD loans', async () => {
    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '2000@DUSD'
    })
    await testing.generate(1)
    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '100@TSLA'
    })
    await testing.generate(1)

    const promise = testing.rpc.loan.paybackWithCollateral(vaultId)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise)
      .rejects
      .toThrowError(/Vault does not have any DUSD loans/)
  })

  it.skip('should throw error if vault does not have enough collateralization ratio defined by loan scheme', async () => {
    const idDUSD = await testing.token.getTokenId('DUSD')
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/token/${idDUSD}/loan_collateral_factor`]: '1.49' } })
    await testing.generate(1)

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '151@DFI'
    })
    await testing.generate(1)

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '1000@DUSD'
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '100@TSLA'
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '100@DUSD'
    })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/token/${idDUSD}/loan_minting_interest`]: '50000000' } })
    await testing.generate(2) // accrue enough interest to drop below collateralization ratio

    const promise = testing.rpc.loan.paybackWithCollateral(vaultId)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise)
      .rejects
      .toThrowError(/Vault does not have enough collateralization ratio defined by loan scheme - 86 < 150/)
  })
})

describe('paybackLoanWithCollateral - success cases', () => {
  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  it.skip('should paybackLoanWithCollateral when collateral is greater than loan', async () => {
    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '2000@DFI'
    })
    await testing.generate(1)

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '2000@DUSD'
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '1000@DUSD',
      to: collateralAddress
    })

    const promise = testing.rpc.loan.paybackWithCollateral(vaultId)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise)
      .rejects
      .toThrowError('RpcApiError: \'Test PaybackWithCollateralTx execution failed: Vault does not have any DUSD collaterals\', code: -32600')
  })

  it.skip('should paybackLoanWithCollateral when loan is greater than collateral', async () => {

  })

  it.skip('should paybackLoanWithCollateral when loan is equal to collateral', async () => {

  })

  it.skip('should paybackLoanWithCollateral when interest is greater than collateral', async () => {

  })

  it.skip('should paybackLoanWithCollateral when interest is equal to collateral', async () => {

  })

  it.skip('should paybackLoanWithCollateral when negative interest collateral is greater than collateral', async () => {

  })

  it.skip('should paybackLoanWithCollateral when negative interest loan is greater than collateral', async () => {

  })
})

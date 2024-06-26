import { DeFiDRpcError, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'
import { P2WPKH } from '@defichain/jellyfish-address'

describe('loans.closeVault', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  let vaultWithCollateralId: string // Vault with collateral token deposited
  let vaultWithLoanTakenId: string // Vault with loan taken
  let vaultWithPayBackLoanId: string // Vault with loan taken paid back
  let vaultWithLiquidationId: string // Vault with liquidation event triggered
  let vaultToBeClosedId: string // Vault to be closed

  let oracleId: string

  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder

  beforeAll(async () => {
    await tGroup.start()
    await tGroup.get(0).container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(tGroup.get(0).container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey))
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  beforeEach(async () => {
    // Fund 10 DFI UTXO
    await fundEllipticPair(tGroup.get(0).container, providers.ellipticPair, 10)
    await providers.setupMocks() // Required to move utxos
  })

  async function setup (): Promise<void> {
    // token setup
    const collateralAddress = await providers.getAddress()
    await tGroup.get(0).token.dfi({ address: collateralAddress, amount: 200000 })

    // oracle setup
    const addr = await tGroup.get(0).generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' }
    ]
    oracleId = await tGroup.get(0).rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    // loan scheme setup
    await tGroup.get(0).rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await tGroup.get(0).generate(1)

    // collateral token setup
    await tGroup.get(0).rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await tGroup.get(0).generate(1)

    // DUSD proper set up
    await tGroup.get(0).rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(1),
      id: 'default'
    })
    await tGroup.get(0).generate(1)

    const aliceVaultAddr = await tGroup.get(0).generateAddress()
    const aliceVaultId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: aliceVaultAddr,
      loanSchemeId: 'default'
    })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: aliceVaultId, from: collateralAddress, amount: '90000@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: aliceVaultId,
      to: collateralAddress,
      amounts: ['60000@DUSD']
    })
    await tGroup.get(0).generate(1)
    // DUSD set up END

    await tGroup.get(0).poolpair.create({ tokenA: 'DUSD', tokenB: 'DFI' })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).poolpair.add({
      a: { symbol: 'DUSD', amount: 25000 },
      b: { symbol: 'DFI', amount: 10000 }
    })
    await tGroup.get(0).generate(1)

    // loan token setup
    await tGroup.get(0).rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await tGroup.get(0).generate(1)

    // transfer pre funded dfi to loanMinterAddr
    const loanTokenProviderAddr = await tGroup.get(0).generateAddress()
    await tGroup.get(0).token.dfi({ address: loanTokenProviderAddr, amount: '10000000' })
    await tGroup.get(0).generate(1)

    // setup loan scheme and vault to loan TSLA
    const loanTokenSchemeId = 'borrow'
    await tGroup.get(0).rpc.loan.createLoanScheme({
      id: loanTokenSchemeId,
      minColRatio: 100,
      interestRate: new BigNumber(0.01)
    })
    await tGroup.get(0).generate(1)
    const loanTokenVaultAddr = await tGroup.get(0).generateAddress()
    const loanVaultId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: loanTokenVaultAddr,
      loanSchemeId: loanTokenSchemeId
    })
    await tGroup.get(0).generate(1)

    // deposit to loan vault
    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: loanVaultId,
      from: loanTokenProviderAddr,
      amount: '10000000@DFI'
    })
    await tGroup.get(0).generate(1)

    // Mint TSLA
    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: loanVaultId,
      amounts: '30000@TSLA',
      to: loanTokenProviderAddr
    })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).poolpair.create({ tokenA: 'TSLA', tokenB: 'DUSD' })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).poolpair.add({
      a: { symbol: 'TSLA', amount: 20000 },
      b: { symbol: 'DUSD', amount: 10000 }
    })
    await tGroup.get(0).generate(1)

    // Vaults setup
    // vaultWithCollateralId
    vaultWithCollateralId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: await providers.getAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultWithCollateralId, from: collateralAddress, amount: '2@DFI'
    })
    await tGroup.get(0).generate(1)

    // vaultWithLoanTakenId
    vaultWithLoanTakenId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: await providers.getAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultWithLoanTakenId, from: collateralAddress, amount: '10000@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: vaultWithLoanTakenId,
      amounts: '1@TSLA'
    })
    await tGroup.get(0).generate(1)

    // vaultWithPayBackLoanId
    const vaultWithPayBackLoanAddress = await providers.getAddress()
    vaultWithPayBackLoanId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: vaultWithPayBackLoanAddress,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultWithPayBackLoanId, from: collateralAddress, amount: '5@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: vaultWithPayBackLoanId,
      amounts: '1@TSLA'
    })
    await tGroup.get(0).generate(1)

    // Send TSLA to vaultWithPayBackLoanAddress so it has enough TSLA to pay back loan
    await tGroup.get(0).rpc.account.sendTokensToAddress({}, { [vaultWithPayBackLoanAddress]: ['5@TSLA'] })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.container.call('paybackloan', [{ vaultId: vaultWithPayBackLoanId, from: vaultWithPayBackLoanAddress, amounts: '2@TSLA' }])
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultWithPayBackLoanId, from: collateralAddress, amount: '2@DFI'
    })
    await tGroup.get(0).generate(1)

    // vaultWithLiquidationId
    vaultWithLiquidationId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: await providers.getAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultWithLiquidationId, from: collateralAddress, amount: '300@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: vaultWithLiquidationId,
      amounts: '100@TSLA'
    })
    await tGroup.get(0).generate(1)

    vaultToBeClosedId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: await tGroup.get(0).generateAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
  }

  it('should closeVault', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.closeVault({
      vaultId: vaultWithCollateralId,
      to: script
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(tGroup.get(0).container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
  })

  it('should closeVault if loan is paid back', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.closeVault({
      vaultId: vaultWithPayBackLoanId,
      to: script
    }, script)

    await sendTransaction(tGroup.get(0).container, txn)
    const txId = calculateTxid(txn)

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)
    await tGroup.get(0).generate(1)
  })

  it('should not closeVault as vault does not exist', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.closeVault({
      vaultId: '0'.repeat(64),
      to: script
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'CloseVaultTx: Vault <${'0'.repeat(64)}> not found', code: -26`)
  })

  it('should not closeVault for vault with loan taken', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.closeVault({
      vaultId: vaultWithLoanTakenId,
      to: script
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'CloseVaultTx: Vault <${vaultWithLoanTakenId}> has loans', code: -26`)
  })

  it('should not closeVault for mayliquidate vault', async () => {
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2.1@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.waitForNextPrice('TSLA/USD', '2.1')

    const liqVault = await tGroup.get(0).container.call('getvault', [vaultWithLiquidationId])
    expect(liqVault.state).toStrictEqual('mayLiquidate')

    const script = await providers.elliptic.script()
    const txn = await builder.loans.closeVault({
      vaultId: vaultWithLiquidationId,
      to: script
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'CloseVaultTx: Vault <${vaultWithLiquidationId}> has loans', code: -26`)

    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.waitForActivePrice('TSLA/USD', '2')
  })

  it('should not closeVault for frozen vault', async () => {
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '3@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.waitForPriceInvalid('TSLA/USD')

    const liqVault = await tGroup.get(0).container.call('getvault', [vaultWithLiquidationId])
    expect(liqVault.state).toStrictEqual('frozen')

    const script = await providers.elliptic.script()
    const txn = await builder.loans.closeVault({
      vaultId: vaultWithLiquidationId,
      to: script
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'CloseVaultTx: Vault <${vaultWithLiquidationId}> has loans', code: -26`)

    await tGroup.get(0).container.waitForPriceValid('TSLA/USD')

    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.waitForPriceInvalid('TSLA/USD')
    await tGroup.get(0).container.waitForPriceValid('TSLA/USD')
  })

  it('should not closeVault for liquidated vault', async () => {
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '3@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.waitForPriceInvalid('TSLA/USD')
    await tGroup.get(0).container.waitForPriceValid('TSLA/USD')

    const liqVault = await tGroup.get(0).container.call('getvault', [vaultWithLiquidationId])
    expect(liqVault.state).toStrictEqual('inLiquidation')

    const script = await providers.elliptic.script()
    const txn = await builder.loans.closeVault({
      vaultId: vaultWithLiquidationId,
      to: script
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'CloseVaultTx: Cannot close vault under liquidation\', code: -26')

    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.waitForPriceInvalid('TSLA/USD')
    await tGroup.get(0).container.waitForPriceValid('TSLA/USD')
  })

  it('should not closeVault by anyone other than the vault owner', async () => {
    const script = await providers.elliptic.script()
    const toScript = P2WPKH.fromAddress(RegTest, await tGroup.get(1).generateAddress(), P2WPKH).getScript()

    const txn = await builder.loans.closeVault({
      vaultId: vaultToBeClosedId,
      to: toScript
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'CloseVaultTx: tx must have at least one input from token owner\', code: -26')
  })
})

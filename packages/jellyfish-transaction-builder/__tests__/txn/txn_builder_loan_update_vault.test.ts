import { GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'

enum VaultState {
  UNKNOWN = 'unknown',
  ACTIVE = 'active',
  IN_LIQUIDATION = 'inLiquidation',
  FROZEN = 'frozen',
  MAY_LIQUIDATE = 'mayLiquidate',
}

describe('loans.updateVault', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  const alice = tGroup.get(0)
  //  const bob = tGroup.get(1)

  let vaultId: string
  let address: string
  let oracleId: string

  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder

  beforeAll(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(alice.container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey))
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    // Scheme
    await alice.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(1.5),
      id: 'default'
    })
    await alice.generate(1)

    await alice.rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(0.5),
      id: 'scheme'
    })
    await alice.generate(1)

    // Create DFI token
    address = await providers.getAddress()
    await alice.token.dfi({ amount: 10000, address: address })
    await alice.generate(1)

    // Oracle
    oracleId = await alice.rpc.oracle.appointOracle(await alice.generateAddress(), [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' }
    ], { weightage: 1 })
    await alice.generate(1)
    await alice.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await alice.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await alice.generate(1)

    // Collateral token
    await alice.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await alice.generate(1)

    // Loan token
    await alice.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await alice.generate(1)

    // Create a default vault
    vaultId = await alice.rpc.loan.createVault({
      ownerAddress: address,
      loanSchemeId: 'default'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    // Fund 10 DFI UTXO to providers.getAddress() for fees after setup()
    await fundEllipticPair(alice.container, providers.ellipticPair, 10)
  })

  // beforeEach(async () => {
  //   // Always update the vault back to default scheme
  //   await alice.rpc.loan.updateVault(vaultId, {
  //     ownerAddress: address,
  //     loanSchemeId: 'default'
  //   })
  //   await alice.generate(1)
  //
  //   const data = await alice.rpc.loan.getVault(vaultId)
  //   expect(data.loanSchemeId).toStrictEqual('default')
  // })

  // beforeEach(async () => {
  //   // Always update the vault back to default scheme
  //   await alice.rpc.loan.updateVault(vaultId, {
  //     ownerAddress: address,
  //     loanSchemeId: 'default'
  //   })
  //   await alice.generate(1)
  //
  //   const data = await alice.rpc.loan.getVault(vaultId)
  //   expect(data.loanSchemeId).toStrictEqual('default')
  // })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should updateVault', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateVault({
      vaultId,
      ownerAddress: script,
      schemeId: 'scheme'
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(alice.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)

    const data = await alice.rpc.loan.getVault(vaultId)
    expect(data).toStrictEqual({
      vaultId,
      loanSchemeId: 'scheme',
      ownerAddress: await providers.getAddress(),
      state: 'active',
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: [],
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      interestValue: new BigNumber(0),
      collateralRatio: -1,
      informativeRatio: new BigNumber(-1)
    })
  })

  it('should updateVault if the vault state is mayliquidate', async () => {
    // Create another vault
    const vaultId = await alice.rpc.loan.createVault({
      ownerAddress: address,
      loanSchemeId: 'default'
    })
    await alice.generate(1)

    // Deposit to vault
    await alice.rpc.loan.depositToVault({
      vaultId, from: address, amount: '100@DFI'
    })
    await alice.generate(1)

    // Take loan
    await alice.rpc.loan.takeLoan({
      vaultId,
      amounts: '50@TSLA'
    })
    await alice.generate(1)

    await alice.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '0.9@DFI', currency: 'USD' }] })
    await alice.generate(1)

    const data = await alice.rpc.loan.getVault(vaultId)
    expect(data.state).toStrictEqual(VaultState.MAY_LIQUIDATE)

    const script = await providers.elliptic.script()
    await builder.loans.updateVault({
      vaultId,
      ownerAddress: script,
      schemeId: 'default'
    }, script)

    await alice.generate(12) // Wait for 12 blocks which are equivalent to 2 hours (1 block = 10 minutes) in order to liquidate the vault

    // Update back the price
    await alice.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await alice.generate(12)
  })
})

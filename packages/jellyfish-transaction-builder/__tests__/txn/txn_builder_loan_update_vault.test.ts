import { DeFiDRpcError, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'
import { P2WPKH } from '@defichain/jellyfish-address'

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
  const bob = tGroup.get(1)

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

  it('should not updateVault if any of the asset\'s price is invalid', async () => {
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

    await alice.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '0.1@DFI', currency: 'USD' }] })

    // Wait for the price become invalid
    await alice.container.waitForPriceInvalid('DFI/USD')

    // Frozen = invalid price and active vault
    const data = await alice.rpc.loan.getVault(vaultId)
    expect(data.state).toStrictEqual(VaultState.FROZEN)

    // Unable to update to the new scheme as vault state is frozen
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateVault({
      vaultId,
      ownerAddress: script,
      schemeId: 'default'
    }, script)

    const promise = sendTransaction(alice.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'UpdateVaultTx: Cannot update vault while any of the asset\'s price is invalid (code 16)\', code: -26')

    await alice.container.waitForPriceValid('DFI/USD')

    // Update back the price
    await alice.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await alice.generate(1)

    await alice.container.waitForPriceInvalid('DFI/USD')
    await alice.container.waitForPriceValid('DFI/USD')
  })

  it('should not updateVault if new chosen scheme could trigger liquidation', async () => {
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
      amounts: '34@TSLA'
    })
    await alice.generate(1)

    {
      const data = await alice.rpc.loan.getVault(vaultId)
      expect(data.state).toStrictEqual('active')
    }

    // Unable to update to new scheme as it could liquidate the vault
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateVault({
      vaultId,
      ownerAddress: script,
      schemeId: 'scheme'
    }, script)

    const promise = sendTransaction(alice.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'UpdateVaultTx: Vault does not have enough collateralization ratio defined by loan scheme - 147 < 150 (code 16)\', code: -26')
  })

  it('should not updateVault as different auth address', async () => {
    const script = await providers.elliptic.script()
    const newAddress = await bob.generateAddress()
    const fromScript = P2WPKH.fromAddress(RegTest, newAddress, P2WPKH).getScript()

    const txn = await builder.loans.updateVault({
      vaultId,
      ownerAddress: fromScript,
      schemeId: 'scheme'
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DepositToVaultTx: tx must have at least one input from token owner (code 16)\', code: -26')
  })
})

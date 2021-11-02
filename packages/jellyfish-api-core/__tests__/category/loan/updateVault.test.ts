import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'
import { VaultState } from '../../../src/category/loan'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Loan updateVault', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)

  let vaultId: string
  let address: string
  let oracleId: string

  beforeAll(async () => {
    await tGroup.start()
    await tGroup.get(0).container.waitForWalletCoinbaseMaturity()

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
    address = await alice.generateAddress()
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
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  beforeEach(async () => {
    // Always update the vault back to default scheme
    await alice.rpc.loan.updateVault(vaultId, {
      ownerAddress: address,
      loanSchemeId: 'default'
    })
    await alice.generate(1)

    const data = await alice.rpc.loan.getVault(vaultId)
    expect(data.loanSchemeId).toStrictEqual('default')
  })

  it('should updateVault', async () => {
    const ownerAddress = await alice.generateAddress()
    const updateVaultId = await alice.rpc.loan.updateVault(vaultId, {
      ownerAddress,
      loanSchemeId: 'scheme'
    })
    expect(typeof updateVaultId).toStrictEqual('string')
    expect(updateVaultId.length).toStrictEqual(64)
    await alice.generate(1)

    const data = await alice.rpc.call('getvault', [vaultId], 'bignumber')
    expect(data).toStrictEqual({
      vaultId: vaultId,
      loanSchemeId: 'scheme',
      ownerAddress,
      state: 'active',
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: [],
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      interestValue: new BigNumber(0),
      collateralRatio: new BigNumber(-1),
      informativeRatio: new BigNumber(-1)
    })
  })

  it('should updateVault with owner address only', async () => {
    const ownerAddress = await alice.generateAddress()
    await alice.rpc.loan.updateVault(vaultId, {
      ownerAddress
    })
    await alice.generate(1)

    const data = await alice.rpc.loan.getVault(vaultId)
    expect(data.ownerAddress).toStrictEqual(ownerAddress)
  })

  it('should updateVault with loanSchemeId only', async () => {
    await alice.rpc.loan.updateVault(vaultId, {
      loanSchemeId: 'scheme'
    })
    await alice.generate(1)

    const data = await alice.rpc.loan.getVault(vaultId)
    expect(data.loanSchemeId).toStrictEqual('scheme')
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

    const updateVaultId = await alice.rpc.loan.updateVault(vaultId, {
      ownerAddress: await alice.generateAddress(),
      loanSchemeId: 'default'
    })

    expect(typeof updateVaultId).toStrictEqual('string')
    expect(updateVaultId.length).toStrictEqual(64)
    await alice.generate(1)

    await alice.generate(12) // Wait for 12 blocks which are equivalent to 2 hours (1 block = 10 minutes) in order to liquidate the vault

    // Update back the price
    await alice.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await alice.generate(12)
  })

  it('should not updateVault if vaultId is invalid', async () => {
    const promise = alice.rpc.loan.updateVault('b25ab8093b0fcb712b9acecdb6ec21ae9cb862a14766a9fb6523efb1d8d05d60', {
      ownerAddress: await alice.generateAddress(),
      loanSchemeId: 'scheme'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Vault <b25ab8093b0fcb712b9acecdb6ec21ae9cb862a14766a9fb6523efb1d8d05d60> does not found\', code: -5, method: updatevault')
  })

  it('should not updateVault if the length of vaultId is not 64', async () => {
    const promise = alice.rpc.loan.updateVault('x', {
      ownerAddress: await alice.generateAddress(),
      loanSchemeId: 'scheme'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'vaultId must be of length 64 (not 1, for \'x\')\', code: -8, method: updatevault')
  })

  it('should not updateVault if ownerAddress is invalid', async () => {
    const promise = alice.rpc.loan.updateVault(vaultId, {
      ownerAddress: 'INVALID_OWNER_ADDRESS'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Error: Invalid owner address\', code: -5, method: updatevault')
  })

  it('should not updateVault if loanSchemeId is invalid', async () => {
    const promise = alice.rpc.loan.updateVault(vaultId, {
      loanSchemeId: 'INVALID_SCHEME_ID'
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateVaultTx execution failed:\nCannot find existing loan scheme with id INVALID_SCHEME_ID\', code: -32600, method: updatevault')
  })

  it('should not updateVault if owner address and loanSchemeId are not set', async () => {
    const promise = alice.rpc.loan.updateVault(vaultId, {})

    await expect(promise).rejects.toThrow('RpcApiError: \'At least ownerAddress OR loanSchemeId must be set\', code: -8, method: updatevault')
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

    {
      // Unable to update to the new scheme as vault state is frozen
      const promise = alice.rpc.loan.updateVault(vaultId, {
        ownerAddress: await alice.generateAddress(),
        loanSchemeId: 'default'
      })
      await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateVaultTx execution failed:\nCannot update vault while any of the asset\'s price is invalid\', code: -32600, method: updatevault')
    }

    await alice.container.waitForPriceValid('DFI/USD')

    // Update back the price
    await alice.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await alice.generate(1)

    // Wait for the price becomes invalid again
    await alice.container.waitForPriceInvalid('DFI/USD')

    {
      // Unable to update to a new scheme as price is invalid and vault is going to be liquidated
      const promise = alice.rpc.loan.updateVault(vaultId, {
        ownerAddress: await alice.generateAddress(),
        loanSchemeId: 'default'
      })
      await expect(promise).rejects.toThrow('RpcApiError: \'Vault is under liquidation.\', code: -26, method: updatevault')
    }

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
    const promise = alice.rpc.loan.updateVault(vaultId, {
      ownerAddress: await alice.generateAddress(),
      loanSchemeId: 'scheme'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateVaultTx execution failed:\nVault does not have enough collateralization ratio defined by loan scheme - 147 < 150\', code: -32600, method: updatevault')
  })

  it('should not updateVault if the vault is under liquidation', async () => {
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

    {
      const data = await alice.rpc.loan.getVault(vaultId)
      expect(data.state).toStrictEqual('active')
    }

    // DFI price drops and trigger liquidation event
    await alice.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '0.9@DFI', currency: 'USD' }] })
    await alice.generate(12)

    {
      const data = await alice.rpc.loan.getVault(vaultId)
      expect(data.state).toStrictEqual('inLiquidation')
    }

    // Unable to update vault if the vault is under liquidation
    const promise = alice.rpc.loan.updateVault(vaultId, {
      ownerAddress: await alice.generateAddress(),
      loanSchemeId: 'scheme'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Vault is under liquidation.\', code: -26, method: updatevault')

    // Update back the price
    await alice.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await alice.generate(1)
  })

  it('should not updateVault as different auth address', async () => {
    const promise = bob.rpc.loan.updateVault(vaultId, {
      ownerAddress: await bob.generateAddress(),
      loanSchemeId: 'scheme'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Incorrect authorization for ${address}`)
  })

  it('should updateVault with utxos', async () => {
    const vaultId = await alice.rpc.loan.createVault({
      ownerAddress: GenesisKeys[0].owner.address,
      loanSchemeId: 'default'
    })
    await alice.generate(1)

    const { txid, vout } = await alice.container.fundAddress(GenesisKeys[0].owner.address, 10)
    const updateVaultId = await alice.rpc.loan.updateVault(vaultId, {
      ownerAddress: GenesisKeys[1].owner.address,
      loanSchemeId: 'scheme'
    }, [{ txid, vout }])
    expect(typeof updateVaultId).toStrictEqual('string')
    expect(updateVaultId.length).toStrictEqual(64)
    await alice.generate(1)

    const rawtx = await alice.container.call('getrawtransaction', [updateVaultId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(txid)
    expect(rawtx.vin[0].vout).toStrictEqual(vout)

    const data = await alice.rpc.call('getvault', [vaultId], 'bignumber')
    expect(data).toStrictEqual({
      vaultId: vaultId,
      loanSchemeId: 'scheme',
      ownerAddress: GenesisKeys[1].owner.address,
      state: 'active',
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: [],
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      interestValue: new BigNumber(0),
      collateralRatio: new BigNumber(-1),
      informativeRatio: new BigNumber(-1)
    })
  })

  it('should not updateVault with utxos not from the owner', async () => {
    const utxo = await alice.container.fundAddress(await alice.generateAddress(), 10)
    const promise = alice.rpc.loan.updateVault(vaultId, {
      ownerAddress: GenesisKeys[1].owner.address,
      loanSchemeId: 'scheme'
    }, [utxo])

    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateVaultTx execution failed:\ntx must have at least one input from token owner\', code: -32600, method: updatevault')
  })
})

describe('Loan updateVault with scheme set to be destroyed', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should not updateVault with scheme set to be destroyed', async () => {
    // Default scheme
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(1.5),
      id: 'default'
    })
    await testing.generate(1)

    // Another scheme
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(2.5),
      id: 'scheme'
    })
    await testing.generate(1)

    // Wait for block 110
    await testing.container.waitForBlockHeight(110)

    // To delete at block 120
    await testing.rpc.loan.destroyLoanScheme({ id: 'scheme', activateAfterBlock: 120 })
    await testing.generate(1)

    const vaultId = await testing.rpc.loan.createVault({
      ownerAddress: await testing.generateAddress(),
      loanSchemeId: 'default'
    })
    await testing.generate(1)

    const promise = testing.rpc.loan.updateVault(vaultId, {
      ownerAddress: await testing.generateAddress(),
      loanSchemeId: 'scheme'
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateVaultTx execution failed:\nCannot set scheme as loan scheme, set to be destroyed on block 120\', code: -32600, method: updatevault')
  })
})

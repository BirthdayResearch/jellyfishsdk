import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'

describe('Loan updateVault', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let createVaultId: string
  let collateralAddress: string
  let oracleId: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

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
      interestRate: new BigNumber(0.5),
      id: 'scheme'
    })
    await testing.generate(1)

    // Create DFI token
    collateralAddress = await testing.generateAddress()
    await testing.token.dfi({ amount: 10000, address: collateralAddress })
    await testing.generate(1)

    // Setup oracle
    oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(), [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' }
    ], { weightage: 1 })
    await testing.generate(1)
    await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await testing.generate(1)

    // Add collateralToken
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      priceFeedId: 'DFI/USD'
    })
    await testing.generate(1)

    // Add setLoanToken
    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      priceFeedId: 'TSLA/USD'
    })
    await testing.generate(1)

    // Create a default vault
    createVaultId = await testing.rpc.loan.createVault({
      ownerAddress: await testing.generateAddress(),
      loanSchemeId: 'default'
    })
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  beforeEach(async () => {
    // Always update the vault back to default vault
    await testing.rpc.loan.updateVault(createVaultId, {
      ownerAddress: await testing.generateAddress(),
      loanSchemeId: 'default'
    })
    await testing.generate(1)
  })

  it('should updateVault', async () => {
    const ownerAddress = await testing.generateAddress()
    const updateVaultId = await testing.rpc.loan.updateVault(createVaultId, {
      ownerAddress,
      loanSchemeId: 'scheme'
    })
    expect(typeof updateVaultId).toStrictEqual('string')
    expect(updateVaultId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.rpc.call('getvault', [createVaultId], 'bignumber')
    expect(data).toStrictEqual({
      loanSchemeId: 'scheme',
      ownerAddress: ownerAddress,
      isUnderLiquidation: false,
      collateralAmounts: [],
      loanAmount: [],
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      currentRatio: expect.any(BigNumber)
    })
  })

  it('should updateVault if new chosen scheme trigger liquidation', async () => {
    // Create another vault that is going to be liquidated
    const vaultId = await testing.rpc.loan.createVault({
      ownerAddress: collateralAddress,
      loanSchemeId: 'default'
    })
    await testing.generate(1)

    // Deposit to vault
    await testing.rpc.loan.depositToVault({
      vaultId, from: collateralAddress, amount: '100@DFI'
    })
    await testing.generate(1)

    // Take loan
    await testing.rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '50@TSLA'
    })
    await testing.generate(1)

    // Not yet get liquidated
    {
      const data = await testing.rpc.loan.getVault(vaultId)
      expect(data.isUnderLiquidation).toStrictEqual(false)
    }

    // Update to different scheme and get liquidated
    await testing.rpc.loan.updateVault(vaultId, {
      ownerAddress: await testing.generateAddress(),
      loanSchemeId: 'scheme'
    })
    await testing.generate(1)

    {
      const data = await testing.rpc.loan.getVault(vaultId)
      expect(data.isUnderLiquidation).toStrictEqual(true)
    }
  })

  it('should updateVault with loanSchemeId only', async () => {
    await testing.rpc.loan.updateVault(createVaultId, {
      loanSchemeId: 'scheme'
    })
    await testing.generate(1)

    const data = await testing.rpc.loan.getVault(createVaultId)
    expect(data.loanSchemeId).toStrictEqual('scheme')
  })

  it('should updateVault with owner address only', async () => {
    const ownerAddress = await testing.generateAddress()
    await testing.rpc.loan.updateVault(createVaultId, {
      ownerAddress
    })
    await testing.generate(1)

    const data = await testing.rpc.loan.getVault(createVaultId)
    expect(data.ownerAddress).toStrictEqual(ownerAddress)
  })

  it('should not updateVault if vaultId is invalid', async () => {
    const promise = testing.rpc.loan.updateVault('b25ab8093b0fcb712b9acecdb6ec21ae9cb862a14766a9fb6523efb1d8d05d60', {
      ownerAddress: await testing.generateAddress(),
      loanSchemeId: 'scheme'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Vault <b25ab8093b0fcb712b9acecdb6ec21ae9cb862a14766a9fb6523efb1d8d05d60> does not found\', code: -5, method: updatevault')
  })

  it('should not updateVault if the length of vaultId is not 64', async () => {
    const promise = testing.rpc.loan.updateVault('x', {
      ownerAddress: await testing.generateAddress(),
      loanSchemeId: 'scheme'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'vaultId must be of length 64 (not 1, for \'x\')\', code: -8, method: updatevault')
  })

  it('should not updateVault if ownerAddress is invalid', async () => {
    const promise = testing.rpc.loan.updateVault(createVaultId, {
      ownerAddress: '1234'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Error: Invalid owner address\', code: -5, method: updatevault')
  })

  it('should not updateVault if loanSchemeId is invalid', async () => {
    const promise = testing.rpc.loan.updateVault(createVaultId, {
      loanSchemeId: '1234'
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateVaultTx execution failed:\nCannot find existing loan scheme with id 1234\', code: -32600, method: updatevault')
  })

  // There is a bug in the c++ side
  // it('should updateVault with utxos', async () => {
  //   const { txid, vout } = await testing.container.fundAddress(GenesisKeys[0].owner.address, 10)
  //   const createVaultId = await testing.rpc.loan.createVault({
  //     ownerAddress: GenesisKeys[0].owner.address,
  //     loanSchemeId: 'scheme'
  //   }, [{ txid, vout }])
  //   await testing.generate(1)
  //
  //   const updateVaultId = await testing.rpc.loan.updateVault(createVaultId, {
  //     ownerAddress: GenesisKeys[0].owner.address,
  //     loanSchemeId: 'scheme'
  //   }, [{ txid, vout }])
  //   expect(typeof updateVaultId).toStrictEqual('string')
  //   expect(updateVaultId.length).toStrictEqual(64)
  //   await testing.generate(1)
  //
  //   const rawtx = await testing.container.call('getrawtransaction', [updateVaultId, true])
  //   expect(rawtx.vin[0].txid).toStrictEqual(txid)
  //   expect(rawtx.vin[0].vout).toStrictEqual(vout)
  //
  //   const data = await testing.rpc.call('getvault', [createVaultId], 'bignumber')
  //   expect(data).toStrictEqual({
  //     loanSchemeId: 'scheme',
  //     ownerAddress: GenesisKeys[0].owner.address,
  //     isUnderLiquidation: false,
  //     collateralAmounts: [],
  //     loanAmount: [],
  //     collateralValue: expect.any(BigNumber),
  //     loanValue: expect.any(BigNumber),
  //     currentRatio: expect.any(BigNumber)
  //   })
  // })

  it('should not updateVault with utxos not from the owner', async () => {
    const utxo = await testing.container.fundAddress(await testing.generateAddress(), 10)
    const promise = testing.rpc.loan.updateVault(createVaultId, {
      ownerAddress: GenesisKeys[0].owner.address,
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

import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'
import { VaultState } from '../../../src/category/loan'

describe('Loan createVault', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

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

    // create another scheme "scheme"
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(2.5),
      id: 'scheme'
    })
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should createVault', async () => {
    const ownerAddress = await testing.generateAddress()
    const vaultId = await testing.rpc.loan.createVault({
      ownerAddress: ownerAddress,
      loanSchemeId: 'scheme'
    })

    expect(typeof vaultId).toStrictEqual('string')
    expect(vaultId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.rpc.call('getvault', [vaultId], 'bignumber')
    expect(data).toStrictEqual({
      vaultId: vaultId,
      loanSchemeId: 'scheme',
      ownerAddress: ownerAddress,
      state: VaultState.ACTIVE,
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: [],
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      interestValue: '',
      currentRatio: expect.any(BigNumber)
    })
  })

  it('should createVault with default scheme if CreateVault.loanSchemeId is not given', async () => {
    const ownerAddress = await testing.generateAddress()
    const vaultId = await testing.rpc.loan.createVault({
      ownerAddress: ownerAddress,
      loanSchemeId: ''
    })

    expect(typeof vaultId).toStrictEqual('string')
    expect(vaultId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.rpc.call('getvault', [vaultId], 'bignumber')
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
      interestValue: '',
      currentRatio: expect.any(BigNumber)
    })
  })

  it('should not createVault if ownerAddress is invalid', async () => {
    const promise = testing.rpc.loan.createVault({
      ownerAddress: '1234',
      loanSchemeId: 'scheme'
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'recipient script (1234) does not solvable/non-standard\', code: -5, method: createvault')
  })

  it('should not createVault if loanSchemeId is invalid', async () => {
    const promise = testing.rpc.loan.createVault({
      ownerAddress: await testing.generateAddress(),
      loanSchemeId: '1234'
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test VaultTx execution failed:\nCannot find existing loan scheme with id 1234\', code: -32600, method: createvault')
  })

  it('should createVault with utxos', async () => {
    const { txid, vout } = await testing.container.fundAddress(GenesisKeys[0].owner.address, 10)
    const vaultId = await testing.rpc.loan.createVault({
      ownerAddress: GenesisKeys[0].owner.address,
      loanSchemeId: 'scheme'
    }, [{ txid, vout }])
    expect(typeof vaultId).toStrictEqual('string')
    expect(vaultId.length).toStrictEqual(64)
    await testing.generate(1)

    const rawtx = await testing.container.call('getrawtransaction', [vaultId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(txid)
    expect(rawtx.vin[0].vout).toStrictEqual(vout)

    const data = await testing.rpc.call('getvault', [vaultId], 'bignumber')
    expect(data).toStrictEqual({
      vaultId: vaultId,
      loanSchemeId: 'scheme',
      ownerAddress: GenesisKeys[0].owner.address,
      state: VaultState.ACTIVE,
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: [],
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      interestValue: '',
      currentRatio: expect.any(BigNumber)
    })
  })

  describe('Loan createVault when no default scheme and CreateVault.loanSchemeId is not given', () => {
    const container = new LoanMasterNodeRegTestContainer()
    const testing = Testing.create(container)

    beforeAll(async () => {
      await testing.container.start()
      await testing.container.waitForWalletCoinbaseMaturity()
    })

    afterAll(async () => {
      await testing.container.stop()
    })

    it('should not createVault when no default scheme and CreateVault.loanSchemeId is not given', async () => {
      const promise = testing.rpc.loan.createVault({
        ownerAddress: await testing.generateAddress(),
        loanSchemeId: ''
      })

      await expect(promise).rejects.toThrow('RpcApiError: \'Test VaultTx execution failed:\nThere is not default loan scheme\', code: -32600, method: createvault')
    })
  })
})

describe('Loan createVault with scheme set to be destroyed', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should not createVault with scheme set to be destroyed', async () => {
    // Default scheme
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(1.5),
      id: 'default'
    })
    await testing.generate(1)

    // create another scheme "scheme"
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

    const promise = testing.rpc.loan.createVault({
      ownerAddress: await testing.generateAddress(),
      loanSchemeId: 'scheme'
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test VaultTx execution failed:\nCannot set scheme as loan scheme, set to be destroyed on block 120\', code: -32600, method: createvault')
  })
})

import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'

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

    // NOTE(jingyi2811): default scheme
    await testing.container.call('createloanscheme', [200, 2.5, 'scheme'])
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should createVault', async () => {
    const ownerAddress = await testing.generateAddress()

    const vaultId = await testing.rpc.loan.createVault({
      ownerAddress,
      loanSchemeId: 'scheme'
    })
    expect(typeof vaultId).toStrictEqual('string')
    expect(vaultId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.container.call('getvault', [vaultId])
    expect(data).toStrictEqual({
      loanSchemeId: 'scheme',
      ownerAddress,
      isUnderLiquidation: false,
      collateralAmounts: [],
      loanAmount: []
    })
  })

  it('should createVault if ownerAddress is an empty string', async () => {
    const vaultId = await testing.rpc.loan.createVault({
      ownerAddress: '',
      loanSchemeId: 'scheme'
    })
    expect(typeof vaultId).toStrictEqual('string')
    expect(vaultId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.container.call('getvault', [vaultId])
    expect(data).toStrictEqual({
      loanSchemeId: 'scheme',
      ownerAddress: expect.any(String),
      isUnderLiquidation: false,
      collateralAmounts: [],
      loanAmount: []
    })
  })

  it('should createVault if there is no loanSchemeId', async () => {
    const owneraddress = await testing.generateAddress()

    const vaultId = await testing.rpc.loan.createVault({
      ownerAddress: owneraddress,
      loanSchemeId: undefined
    })

    expect(typeof vaultId).toStrictEqual('string')
    expect(vaultId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.container.call('getvault', [vaultId])
    expect(data).toStrictEqual({
      loanSchemeId: 'default', // Get default loan scheme
      ownerAddress: expect.any(String),
      isUnderLiquidation: false,
      collateralAmounts: [],
      loanAmount: []
    })
  })

  it('should not createVault if ownerAddress is invalid', async () => {
    const promise = testing.rpc.loan.createVault({
      ownerAddress: '1234',
      loanSchemeId: undefined
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'Error: Invalid owner address\', code: -5, method: createvault')
  })

  it('should not createVault if loanSchemeId is invalid', async () => {
    const promise = testing.rpc.loan.createVault({
      ownerAddress: '',
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

    const data = await testing.container.call('getvault', [vaultId])
    expect(data).toStrictEqual({
      loanSchemeId: 'scheme',
      ownerAddress: GenesisKeys[0].owner.address,
      isUnderLiquidation: false,
      collateralAmounts: [],
      loanAmount: []
    })
  })

  it('should not createLoanScheme with utxos not from foundation member', async () => {
    // There is some problem in the C++ side.
    // const ownerAddress = await testing.generateAddress()
    // const ownerAddress1 = await testing.generateAddress()
    // const utxo = await testing.container.fundAddress(ownerAddress, 10)
    // const promise = testing.rpc.loan.createVault({
    //   ownerAddress: ownerAddress1,
    //   loanSchemeId: 'scheme'
    // }, [utxo])
    // await expect(promise).rejects.toThrow(`RpcApiError: 'Test VaultTx execution failed:\ntx must have at least one input from token owner ${parseInt('bcrt1qlnpnhnyvl3nm4g49g9c3e0j8g5vq2rj0lwdw9d', 16)}, code: -32600, method: createvault`)
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

  it('should not createVault', async () => {
    // Default scheme
    await testing.container.call('createloanscheme', [100, new BigNumber(1.5), 'default'])
    await testing.generate(1)

    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await testing.generate(1)

    // Wait for block 110
    await testing.container.waitForBlockHeight(110)

    // To delete at block 120
    await testing.container.call('destroyloanscheme', ['scheme', 120])

    const promise = testing.rpc.loan.createVault({
      ownerAddress: await testing.generateAddress(),
      loanSchemeId: 'scheme'
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'VaultTx: Cannot set scheme as loan scheme, set to be destroyed on block 120 (code 16)\', code: -26, method: createvault')
  })
})

import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'
import { P2PKH } from '@defichain/jellyfish-address'
import { RegTest } from '@defichain/jellyfish-network'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { SmartBuffer } from 'smart-buffer'

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

    const data = await testing.container.call('getvault', [vaultId])
    expect(data).toStrictEqual({
      loanSchemeId: 'scheme',
      ownerAddress: ownerAddress,
      isUnderLiquidation: false,
      collateralAmounts: [],
      loanAmount: [],
      collateralValue: expect.any(String),
      loanValue: expect.any(String)
    })
  })

  it('should createVault with a generated ownerAddress if the given ownerAddress is an empty string', async () => {
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
      loanAmount: [],
      collateralValue: expect.any(String),
      loanValue: expect.any(String)
    })
  })

  it('should createVault with default scheme if CreateVault.loanSchemeId is not given', async () => {
    const owneraddress = await testing.generateAddress()
    const vaultId = await testing.rpc.loan.createVault({
      ownerAddress: owneraddress
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
      loanAmount: [],
      collateralValue: expect.any(String),
      loanValue: expect.any(String)
    })
  })

  it('should not createVault if ownerAddress is invalid', async () => {
    const promise = testing.rpc.loan.createVault({
      ownerAddress: '1234'
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
      loanAmount: [],
      collateralValue: expect.any(String),
      loanValue: expect.any(String)
    })
  })

  it('should not createVault with utxos not from the owner', async () => {
    const utxo = await testing.container.fundAddress(await testing.generateAddress(), 10)
    const promise = testing.rpc.loan.createVault({
      ownerAddress: GenesisKeys[0].owner.address,
      loanSchemeId: 'scheme'
    }, [utxo])

    const sBuff = new SmartBuffer()
    OP_CODES.toBuffer(P2PKH.fromAddress(RegTest, GenesisKeys[0].owner.address, P2PKH).getScript().stack, sBuff)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test VaultTx execution failed:\ntx must have at least one input from token owner ' + sBuff.toString('hex').substring(2) + '\', code: -32600, method: createvault')
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
      ownerAddress: await testing.generateAddress()
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test VaultTx execution failed:\nThere is not default loan scheme\', code: -32600, method: createvault')
  })
})

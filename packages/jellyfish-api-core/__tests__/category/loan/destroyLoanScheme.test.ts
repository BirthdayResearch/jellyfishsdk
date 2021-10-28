import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'

describe('Loan destroyLoanScheme', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    // Default scheme
    await testing.container.call('createloanscheme', [100, new BigNumber(1.5), 'default'])
    await testing.generate(1)
  })

  afterEach(async () => {
    const data = await testing.container.call('listloanschemes')
    const result = data.filter((d: { default: boolean }) => !d.default)

    for (let i = 0; i < result.length; i += 1) {
      // Delete all schemes except default scheme
      await testing.container.call('destroyloanscheme', [result[i].id])
      await testing.generate(1)
    }
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should destroyLoanScheme', async () => {
    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await testing.generate(1)

    // Before delete
    {
      const data = await testing.container.call('listloanschemes')
      const result = data.filter((d: { id: string }) => d.id === 'scheme')
      expect(result.length).toStrictEqual(1)
    }

    const loanSchemeId = await testing.rpc.loan.destroyLoanScheme({ id: 'scheme' })
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)
    await testing.generate(1)

    // After delete
    {
      const data = await testing.container.call('listloanschemes')
      const result = data.filter((d: { id: string }) => d.id === 'scheme')
      expect(result.length).toStrictEqual(0)
    }
  })

  it('should not destroyLoanScheme if id is more than 8 chars long', async () => {
    const promise = testing.rpc.loan.destroyLoanScheme({ id: '123456789' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: destroyloanscheme')
  })

  it('should not destroyLoanScheme if id is an empty string', async () => {
    const promise = testing.rpc.loan.destroyLoanScheme({ id: '' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: destroyloanscheme')
  })

  it('should not destroyLoanScheme if id does not exists', async () => {
    const promise = testing.rpc.loan.destroyLoanScheme({ id: 'scheme2' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\nCannot find existing loan scheme with id scheme2\', code: -32600, method: destroyloanscheme')
  })

  it('should not destroyLoanScheme if id is a default scheme', async () => {
    const promise = testing.rpc.loan.destroyLoanScheme({ id: 'default' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\nCannot destroy default loan scheme, set new default first\', code: -32600, method: destroyloanscheme')
  })

  it('should destroyLoanScheme with utxos', async () => {
    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await testing.generate(1)

    const { txid, vout } = await testing.container.fundAddress(GenesisKeys[0].owner.address, 10)
    const loanSchemeId = await testing.rpc.loan.destroyLoanScheme({ id: 'scheme' }, [{ txid, vout }])
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)
    await testing.generate(1)

    const rawtx = await testing.container.call('getrawtransaction', [loanSchemeId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(txid)
    expect(rawtx.vin[0].vout).toStrictEqual(vout)

    const data = await testing.container.call('listloanschemes')
    const result = data.filter((d: { id: string }) => d.id === 'scheme')
    expect(result.length).toStrictEqual(0)
  })

  it('should not destroyLoanScheme with utxos not from foundation member', async () => {
    const utxo = await testing.container.fundAddress(await testing.generateAddress(), 10)
    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    const promise = testing.rpc.loan.destroyLoanScheme({ id: 'scheme' }, [utxo])
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\ntx not from foundation member!\', code: -32600, method: destroyloanscheme')
  })
})

describe('Loan with activateAfterBlock at block 120', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should destroyLoanScheme', async () => {
    // Default scheme
    await testing.container.call('createloanscheme', [100, new BigNumber(1.5), 'default'])
    await testing.generate(1)

    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await testing.generate(1)

    // Wait for block 110
    await testing.container.waitForBlockHeight(110)

    // To delete at block 120
    const loanSchemeId = await testing.rpc.loan.destroyLoanScheme({ id: 'scheme', activateAfterBlock: 120 })
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)
    await testing.generate(1)

    // Shouldn't delete at block 111
    {
      const data = await testing.container.call('listloanschemes')
      const result = data.filter((d: { id: string }) => d.id === 'scheme')
      expect(result.length).toStrictEqual(1)
    }

    // Wait for block 120
    await testing.container.waitForBlockHeight(120)

    // Should delete at block 120
    {
      const data = await testing.container.call('listloanschemes')
      const result = data.filter((d: { id: string }) => d.id === 'scheme')
      expect(result.length).toStrictEqual(0)
    }
  })
})

describe('Loan with activateAfterBlock which is below current height', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should not destroyLoanScheme', async () => {
    // Default scheme
    await testing.container.call('createloanscheme', [100, new BigNumber(1.5), 'default'])
    await testing.generate(1)

    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await testing.generate(1)

    // Wait for block 110
    await testing.container.waitForBlockHeight(110)

    // To delete at block 109, which should fail
    const promise = testing.rpc.loan.destroyLoanScheme({ id: 'scheme', activateAfterBlock: 109 })
    await expect(promise).rejects.toThrow('Destruction height below current block height, set future height\', code: -32600, method: destroyloanscheme')
  })
})

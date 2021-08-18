import { LoanMasterNodeRegTestContainer } from './loan_container'
import { UTXO } from '@defichain/jellyfish-api-core/category/loan'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    // NOTE(jingyi2811): Default scheme
    await testing.container.call('createloanscheme', [100, new BigNumber(1.5), 'default'])
    await testing.generate(1)
  })

  afterEach(async () => {
    const data = await testing.container.call('listloanschemes')
    const result = data.filter((d: { default: boolean }) => !d.default)

    for (let i = 0; i < result.length; i += 1) {
      // NOTE(jingyi2811): Delete all schemes except default scheme
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

    // NOTE(jingyi2811): Before delete
    let result = await testing.container.call('listloanschemes')
    let data = result.filter((r: { id: string }) => r.id === 'scheme')
    expect(data.length).toStrictEqual(1)

    const loanSchemeId = await testing.rpc.loan.destroyLoanScheme('scheme')
    await testing.generate(1)
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)

    // NOTE(jingyi2811): after delete
    data = await testing.container.call('listloanschemes')
    result = data.filter((d: { id: string }) => d.id === 'scheme')
    expect(result.length).toStrictEqual(0)
  })

  it('should not destroyLoanScheme if id is an empty string', async () => {
    const promise = testing.rpc.loan.destroyLoanScheme('')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: destroyloanscheme')
  })

  it('should not destroyLoanScheme if id is more than 8 chars', async () => {
    const promise = testing.rpc.loan.destroyLoanScheme('123456789')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: destroyloanscheme')
  })

  it('should not destroyLoanScheme if id does not exists', async () => {
    const promise = testing.rpc.loan.destroyLoanScheme('scheme2')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\nCannot find existing loan scheme with id scheme2\', code: -32600, method: destroyloanscheme')
  })

  it('should not destroyLoanScheme if id is a default scheme', async () => {
    const promise = testing.rpc.loan.destroyLoanScheme('default')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\nCannot destroy default loan scheme, set new default first\', code: -32600, method: destroyloanscheme')
  })

  it('should destroyLoanScheme at activateAfterBlock which is block 150', async () => {
    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await testing.generate(1)

    // NOTE(jingyi2811): Wait for block 100
    await testing.container.waitForBlockHeight(100)

    // NOTE(jingyi2811): To delete at block 150
    const loanSchemeId = await testing.rpc.loan.destroyLoanScheme('scheme', 150)
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)
    await testing.container.generate(1)

    // NOTE(jingyi2811): shouldn't delete at block 101
    let result = await testing.container.call('listloanschemes')
    let data = result.filter((r: { id: string }) => r.id === 'scheme')
    expect(data.length).toStrictEqual(1)

    await testing.container.waitForBlockHeight(150)

    // NOTE(jingyi2811): should delete at block 150
    result = await testing.container.call('listloanschemes')
    data = result.filter((r: { id: string }) => r.id === 'scheme')
    expect(data.length).toStrictEqual(0)
  })

  it('should not destroyLoanScheme if activateAfterBlock is lesser than current height', async () => {
    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await testing.generate(1)

    // NOTE(jingyi2811): Wait for block 200
    await testing.container.waitForBlockHeight(200)

    // NOTE(jingyi2811): To delete at block 199, which should failed
    const promise = testing.rpc.loan.destroyLoanScheme('scheme', 199)
    await expect(promise).rejects.toThrow('Destruction height below current block height, set future height\', code: -32600, method: destroyloanscheme')
  })

  it('should destroyLoanScheme with utxos', async () => {
    const address = await testing.generateAddress()
    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await testing.generate(1)

    const loanSchemeId = await testing.rpc.loan.destroyLoanScheme('scheme', undefined, { utxos: inputs })
    await testing.generate(1)

    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)

    const result = await testing.container.call('listloanschemes')
    const data = result.filter((r: { id: string }) => r.id === 'scheme')
    expect(data.length).toStrictEqual(0)
  })

  it('should not destroyLoanScheme with arbritary utxos', async () => {
    const { txid, vout } = await testing.container.fundAddress(await testing.generateAddress(), 10)
    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    const promise = testing.rpc.loan.destroyLoanScheme('scheme', undefined, { utxos: [{ txid, vout }] })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\ntx not from foundation member!\', code: -32600, method: destroyloanscheme')
  })
})

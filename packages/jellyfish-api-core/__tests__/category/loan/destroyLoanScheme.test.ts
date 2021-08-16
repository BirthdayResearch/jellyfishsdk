import { ContainerAdapterClient } from '../../container_adapter_client'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { UTXO } from '@defichain/jellyfish-api-core/category/loan'
import BigNumber from 'bignumber.js'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    // NOTE(jingyi2811): default scheme
    await container.call('createloanscheme', [100, new BigNumber(1.5), 'default'])
    await container.generate(1)
  })

  afterEach(async () => {
    const result = await container.call('listloanschemes')
    const data = result.filter((r: { default: boolean }) => !r.default)

    for (let i = 0; i < data.length; i += 1) {
      await container.call('destroyloanscheme', [data[i].id])
      await container.generate(1)
    }
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should destroyLoanScheme', async () => {
    await container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await container.generate(1)

    // NOTE(jingyi2811): Before delete
    let result = await container.call('listloanschemes')
    let data = result.filter((r: { id: string }) => r.id === 'scheme')
    expect(data.length).toStrictEqual(1)

    const loanSchemeId = await client.loan.destroyLoanScheme('scheme')
    await container.generate(1)
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)

    // NOTE(jingyi2811): after delete
    result = await container.call('listloanschemes')
    data = result.filter((r: { id: string }) => r.id === 'scheme')
    expect(data.length).toStrictEqual(0)
  })

  it('should not destroyLoanScheme if id is an empty string', async () => {
    const promise = client.loan.destroyLoanScheme('')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: destroyloanscheme')
  })

  it('should not destroyLoanScheme if id is more than 8 chars', async () => {
    const promise = client.loan.destroyLoanScheme('123456789')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: destroyloanscheme')
  })

  it('should not destroyLoanScheme if id is not exists', async () => {
    const promise = client.loan.destroyLoanScheme('scheme2')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\nCannot find existing loan scheme with id scheme2\', code: -32600, method: destroyloanscheme')
  })

  it('should not destroyLoanScheme if id is a default scheme', async () => {
    const promise = client.loan.destroyLoanScheme('default')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\nCannot destroy default loan scheme, set new default first\', code: -32600, method: destroyloanscheme')
  })

  it('should destroyLoanScheme at activateAfterBlock which is block 150', async () => {
    await container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await container.generate(1)

    // NOTE(jingyi2811): Wait for block 100
    await container.waitForBlockHeight(100)

    // NOTE(jingyi2811): To delete at block 150
    const loanSchemeId = await client.loan.destroyLoanScheme('scheme', 150)
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)
    await container.generate(1)

    // NOTE(jingyi2811): shouldn't delete at block 101
    let result = await container.call('listloanschemes')
    let data = result.filter((r: { id: string }) => r.id === 'scheme')
    expect(data.length).toStrictEqual(1)

    await container.waitForBlockHeight(150)

    // NOTE(jingyi2811): should delete at block 150
    result = await container.call('listloanschemes')
    data = result.filter((r: { id: string }) => r.id === 'scheme')
    expect(data.length).toStrictEqual(0)
  })

  it('should not destroyLoanScheme if activateAfterBlock is lesser than current height', async () => {
    await container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await container.generate(1)

    // NOTE(jingyi2811): Wait for block 200
    await container.waitForBlockHeight(200)

    // NOTE(jingyi2811): To delete at block 199, which should failed
    const promise = client.loan.destroyLoanScheme('scheme', 199)
    await expect(promise).rejects.toThrow('Destruction height below current block height, set future height\', code: -32600, method: destroyloanscheme')
  })

  it('should destroyLoanScheme with utxos', async () => {
    const address = await container.call('getnewaddress')
    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    await container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await container.generate(1)

    const loanSchemeId = await client.loan.destroyLoanScheme('scheme', undefined, { utxos: inputs })
    await container.generate(1)

    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)

    const result = await container.call('listloanschemes')
    const data = result.filter((r: { id: string }) => r.id === 'scheme')
    expect(data.length).toStrictEqual(0)
  })

  it('should not destroyLoanScheme with arbritary utxos', async () => {
    const { txid, vout } = await container.fundAddress(await container.call('getnewaddress'), 10)
    await container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    const promise = client.loan.destroyLoanScheme('scheme', undefined, { utxos: [{ txid, vout }] })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\ntx not from foundation member!\', code: -32600, method: destroyloanscheme')
  })
})

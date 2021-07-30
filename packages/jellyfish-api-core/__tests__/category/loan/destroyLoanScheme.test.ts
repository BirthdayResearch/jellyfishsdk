import { ContainerAdapterClient } from '../../container_adapter_client'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { UTXO } from '@defichain/jellyfish-api-core/category/loan'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    // NOTE(jingyi2811): default scheme
    await container.call('createloanscheme', [100, 1, 'default'])
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

  it('should delete loan scheme', async () => {
    await container.call('createloanscheme', [200, 2, 'scheme'])
    await container.generate(1)

    const loanId = await client.loan.destroyLoanScheme('scheme')
    await container.generate(1)

    expect(typeof loanId).toStrictEqual('string')
    expect(loanId.length).toStrictEqual(64)

    const result = await container.call('listloanschemes')
    const data = result.filter((r: { id: string }) => r.id === 'scheme')
    expect(data.length).toStrictEqual(0)
  })

  it('should delete loan scheme after block 200 only', async () => {
    await container.call('createloanscheme', [200, 2, 'scheme'])
    await container.generate(1)

    await client.loan.destroyLoanScheme('scheme', 200)
    await container.generate(1)

    // NOTE(jingyi2811): shouldn't delete
    let result = await container.call('listloanschemes')
    let data = result.filter((r: { id: string }) => r.id === 'scheme')
    expect(data.length).toStrictEqual(1)

    await container.waitForBlockHeight(200)

    // NOTE(jingyi2811): should delete
    result = await container.call('listloanschemes')
    data = result.filter((r: { id: string }) => r.id === 'scheme')
    expect(data.length).toStrictEqual(0)
  })

  it('should delete loan scheme with utxos', async () => {
    const address = await container.call('getnewaddress')
    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    await container.call('createloanscheme', [200, 2, 'scheme'])
    await container.generate(1)

    await client.loan.destroyLoanScheme('scheme', undefined, { utxos: inputs })
    await container.generate(1)

    const result = await container.call('listloanschemes')
    const data = result.filter((r: { id: string }) => r.id === 'scheme')

    expect(data.length).toStrictEqual(0)
  })

  it('should create loan scheme with arbritary utxos', async () => {
    const { txid, vout } = await container.fundAddress(await container.call('getnewaddress'), 10)

    await container.call('createloanscheme', [200, 2, 'scheme'])
    await container.generate(1)

    const promise = client.loan.destroyLoanScheme('scheme', undefined, { utxos: [{ txid, vout }] })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DestroyLoanSchemeTx execution failed:\ntx not from foundation member!\', code: -32600, method: destroyloanscheme')
  })
})

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

    await container.call('createloanscheme', [100, 1, 'scheme1'])
    await container.generate(1)

    await container.call('createloanscheme', [200, 2, 'scheme2'])
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  afterEach(async () => {
    // NOTE(jingyi2811): Always reset the default to scheme1
    await client.loan.setDefaultLoanScheme('scheme1')
    await container.generate(1)
  })

  it('should set default loan scheme', async () => {
    // NOTE(jingyi2811): By default, first created scheme is default
    let result = await container.call('listloanschemes', [])

    expect(result).toStrictEqual(
      [
        { id: 'scheme1', mincolratio: 100, interestrate: 1, default: true },
        { id: 'scheme2', mincolratio: 200, interestrate: 2, default: false }
      ]
    )

    // NOTE(jingyi2811): Set default to scheme2
    const loanId = await client.loan.setDefaultLoanScheme('scheme2')

    expect(typeof loanId).toStrictEqual('string')
    expect(loanId.length).toStrictEqual(64)

    await container.generate(1)

    result = await container.call('listloanschemes', [])

    // NOTE(jingyi2811): scheme become default
    expect(result).toStrictEqual(
      [
        { id: 'scheme1', mincolratio: 100, interestrate: 1, default: false },
        { id: 'scheme2', mincolratio: 200, interestrate: 2, default: true }
      ]
    )
  })

  it('should set default loan scheme with utxos', async () => {
    const address = await container.call('getnewaddress')
    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    // NOTE(jingyi2811): Set default to scheme2
    const loanId = await client.loan.setDefaultLoanScheme('scheme2', inputs)

    expect(typeof loanId).toStrictEqual('string')
    expect(loanId.length).toStrictEqual(64)

    await container.generate(1)

    const result = await container.call('listloanschemes', [])

    expect(result).toStrictEqual(
      [
        { id: 'scheme1', mincolratio: 100, interestrate: 1, default: false },
        { id: 'scheme2', mincolratio: 200, interestrate: 2, default: true }
      ]
    )
  })

  // There is some bug here in c++ side
  it('should not set default loan scheme with arbritary utxos', async () => {
    // const { txid, vout } = await container.fundAddress(await container.call('getnewaddress'), 10)
    // const promise = client.loan.setDefaultLoanScheme('scheme2', [{ txid, vout }])
    // container.generate(1)
    // await expect(promise).rejects.toThrow('RpcApiError: \'Test DefaultLoanSchemeTx execution failed:\ntx not from foundation member!\', code: -32600, method: setdefaultloanscheme')
  })
})

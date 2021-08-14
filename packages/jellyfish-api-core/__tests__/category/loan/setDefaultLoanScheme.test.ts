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
    // NOTE(jingyi2811): Always set default scheme to scheme1
    const data = await container.call('listloanschemes')
    const record = data.find((d: { default: string }) => d.default)

    if (record.id === 'scheme2') {
      await client.loan.setDefaultLoanScheme('scheme1')
      await container.generate(1)
    }
  })

  it('should setDefaultLoanScheme', async () => {
    const loanSchemeId = await client.loan.setDefaultLoanScheme('scheme2')
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)

    await container.generate(1)

    const result = await container.call('listloanschemes', [])
    expect(result).toStrictEqual(
      [
        { id: 'scheme1', mincolratio: 100, interestrate: 1, default: false },
        { id: 'scheme2', mincolratio: 200, interestrate: 2, default: true }
      ]
    )
  })

  it('should not setDefaultLoanScheme if the scheme is already a default', async () => {
    const promise = client.loan.setDefaultLoanScheme('scheme1')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DefaultLoanSchemeTx execution failed:\nLoan scheme with id scheme1 is already set as default\', code: -32600, method: setdefaultloanscheme')
  })

  it('should not setDefaultLoanScheme if id does not exists', async () => {
    const promise = client.loan.setDefaultLoanScheme('scheme3')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DefaultLoanSchemeTx execution failed:\nCannot find existing loan scheme with id scheme3\', code: -32600, method: setdefaultloanscheme')
  })

  it('should not setDefaultLoanScheme if id is more than 8 chars long', async () => {
    const promise = client.loan.setDefaultLoanScheme('123456789')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DefaultLoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: setdefaultloanscheme')
  })

  it('should not setDefaultLoanScheme if id is an empty string', async () => {
    const promise = client.loan.setDefaultLoanScheme('')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DefaultLoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: setdefaultloanscheme')
  })

  it('should setDefaultLoanScheme with utxos', async () => {
    const address = await container.call('getnewaddress')
    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    // NOTE(jingyi2811): Set default to scheme2
    const loanSchemeId = await client.loan.setDefaultLoanScheme('scheme2', inputs)
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)

    await container.generate(1)

    const result = await container.call('listloanschemes', [])
    expect(result).toStrictEqual(
      [
        { id: 'scheme1', mincolratio: 100, interestrate: 1, default: false },
        { id: 'scheme2', mincolratio: 200, interestrate: 2, default: true }
      ]
    )
  })

  it('should not setDefaultLoanScheme with arbritary utxos', async () => {
    const { txid, vout } = await container.fundAddress(await container.call('getnewaddress'), 10)
    const promise = client.loan.setDefaultLoanScheme('scheme2', [{ txid, vout }])
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DefaultLoanSchemeTx execution failed:\ntx not from foundation member!\', code: -32600, method: setdefaultloanscheme')
  })
})

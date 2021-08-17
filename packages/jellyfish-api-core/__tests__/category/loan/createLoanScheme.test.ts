import { LoanMasterNodeRegTestContainer } from './loan_container'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { UTXO } from '@defichain/jellyfish-api-core/category/oracle'
import BigNumber from 'bignumber.js'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    // NOTE(jingyi2811): Default scheme
    await client.loan.createLoanScheme(100, new BigNumber(1.5), { id: 'default' })
    await container.generate(1)
  })

  afterEach(async () => {
    const data = await container.call('listloanschemes')
    const result = data.filter((d: { default: boolean }) => !d.default)

    for (let i = 0; i < result.length; i += 1) {
      // NOTE(jingyi2811): Delete all schemes except default scheme
      await container.call('destroyloanscheme', [result[i].id])
      await container.generate(1)
    }
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should createLoanScheme', async () => {
    const loanSchemeId = await client.loan.createLoanScheme(200, new BigNumber(2.5), { id: 'scheme1' })
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)

    await container.generate(1)

    const data = await container.call('listloanschemes')
    const result = data.filter((d: { id: string }) => d.id === 'scheme1')
    expect(result.length).toStrictEqual(1)
    expect(result[0]).toStrictEqual(
      { id: 'scheme1', mincolratio: 200, interestrate: 2.5, default: false }
    )
  })

  it('should not createLoanScheme if minConRatio is less than 100', async () => {
    const promise = client.loan.createLoanScheme(99, new BigNumber(2.5), { id: 'scheme2' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nminimum collateral ratio cannot be less than 100\', code: -32600, method: createloanscheme')
  })

  it('should not createLoanScheme if interestRate is less than 0.01', async () => {
    const promise = client.loan.createLoanScheme(200, new BigNumber(0.00999), { id: 'scheme2' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\ninterest rate cannot be less than 0.01\', code: -32600, method: createloanscheme')
  })

  it('should not createLoanScheme if same minConRatio and interestRate were created before', async () => {
    const promise = client.loan.createLoanScheme(100, new BigNumber(1.5), { id: 'scheme2' }) // NOTE(jingyi2811): Failed because its minConRatio and interestRate are same as default
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nLoan scheme default with same interestrate and mincolratio already exists\', code: -32600, method: createloanscheme')
  })

  it('should not createLoanScheme if same id was created before', async () => {
    const promise = client.loan.createLoanScheme(200, new BigNumber(2.5), { id: 'default' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nLoan scheme already exist with id default\', code: -32600, method: createloanscheme')
  })

  it('should not createLoanScheme if id is an empty string', async () => {
    const promise = client.loan.createLoanScheme(200, new BigNumber(2.5), { id: '' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: createloanscheme')
  })

  it('should not createLoanScheme if id is more than 8 chars long', async () => {
    const promise = client.loan.createLoanScheme(200, new BigNumber(2.5), { id: '123456789' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: createloanscheme')
  })

  it('should createLoanScheme with utxos', async () => {
    const address = await container.call('getnewaddress')
    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const loanSchemeId = await client.loan.createLoanScheme(200, new BigNumber(2.5), { id: 'scheme1', utxos: inputs })
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)

    await container.generate(1)

    const data = await container.call('listloanschemes')
    const result = data.filter((d: { id: string }) => d.id === 'scheme1')
    expect(result.length).toStrictEqual(1)
    expect(result[0]).toStrictEqual(
      { id: 'scheme1', mincolratio: 200, interestrate: 2.5, default: false }
    )
  })

  it('should not createLoanScheme with arbritary utxos', async () => {
    const { txid, vout } = await container.fundAddress(await container.call('getnewaddress'), 10)
    const promise = client.loan.createLoanScheme(200, new BigNumber(2.5), { id: 'scheme', utxos: [{ txid, vout }] })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\ntx not from foundation member!\', code: -32600, method: createloanscheme')
  })
})

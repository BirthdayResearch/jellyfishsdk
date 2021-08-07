import { ContainerAdapterClient } from '../../container_adapter_client'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { UTXO } from '@defichain/jellyfish-api-core/category/oracle'
import BigNumber from 'bignumber.js'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    // const x = await client.loan.createLoanScheme(200, new BigNumber(200), { id: 'default' })
    // const tx: any = await client.call('getrawtransaction', [x, true], 'bignumber')
    // console.log(tx.vout[0].scriptPubKey)

    // NOTE(jingyi2811): default scheme
    await client.loan.createLoanScheme(200, new BigNumber(200), { id: 'default' })
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

  it('should create loan scheme', async () => {
    const loanId = await client.loan.createLoanScheme(200, new BigNumber(1), { id: 'scheme' })

    expect(typeof loanId).toStrictEqual('string')
    expect(loanId.length).toStrictEqual(64)

    await container.generate(1)

    const result = await container.call('listloanschemes')
    const data = result.filter((r: { id: string }) => r.id === 'scheme')

    expect(data.length).toStrictEqual(1)
    expect(data[0]).toStrictEqual(
      { id: 'scheme', mincolratio: 200, interestrate: 1, default: false }
    )
  })

  it('should not create loan scheme if ratio is less than 100', async () => {
    const promise = client.loan.createLoanScheme(99, new BigNumber(1), { id: 'scheme' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nminimum collateral ratio cannot be less than 100\', code: -32600, method: createloanscheme')
  })

  it('should not create loan scheme if rate is less than 0', async () => {
    const promise = client.loan.createLoanScheme(200, new BigNumber(-1), { id: 'scheme' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: createloanscheme')
  })

  it('should not create loan scheme if 2 schemes have same rate and ratio', async () => {
    await client.loan.createLoanScheme(200, new BigNumber(1), { id: 'scheme1' })
    await container.generate(1)

    const promise = client.loan.createLoanScheme(200, new BigNumber(1), { id: 'scheme2' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nLoan scheme scheme1 with same interestrate and mincolratio already exists\', code: -32600, method: createloanscheme')
  })

  it('should not create loan scheme if id is an empty string', async () => {
    const promise = client.loan.createLoanScheme(200, new BigNumber(1), { id: '' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: createloanscheme')
  })

  it('should not create loan scheme if id is more than 8 chars long', async () => {
    const promise = client.loan.createLoanScheme(200, new BigNumber(1), { id: '123456789' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: createloanscheme')
  })

  it('should not create loan scheme if duplicate id', async () => {
    await client.loan.createLoanScheme(200, new BigNumber(1), { id: 'scheme' })
    await container.generate(1)

    const promise = client.loan.createLoanScheme(201, new BigNumber(1), { id: 'scheme' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nLoan scheme already exist with id scheme\', code: -32600, method: createloanscheme')
  })

  it('should create loan scheme with utxos', async () => {
    const address = await container.call('getnewaddress')
    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const loanId = await client.loan.createLoanScheme(200, new BigNumber(1), { id: 'scheme', utxos: inputs })

    expect(typeof loanId).toStrictEqual('string')
    expect(loanId.length).toStrictEqual(64)

    await container.generate(1)

    const result = await container.call('listloanschemes')
    const data = result.filter((r: { id: string }) => r.id === 'scheme')

    expect(data.length).toStrictEqual(1)
    expect(data[0]).toStrictEqual(
      { id: 'scheme', mincolratio: 200, interestrate: 1, default: false }
    )
  })

  it('should create loan scheme with arbritary utxos', async () => {
    const { txid, vout } = await container.fundAddress(await container.call('getnewaddress'), 10)
    const promise = client.loan.createLoanScheme(100, new BigNumber(1), { id: 'scheme', utxos: [{ txid, vout }] })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\ntx not from foundation member!\', code: -32600, method: createloanscheme')
  })
})

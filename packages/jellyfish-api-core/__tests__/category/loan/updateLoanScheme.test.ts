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

  beforeEach(async () => {
    // NOTE(jingyi2811): Create scheme automatically in every test item
    await container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await container.generate(1)
  })

  afterEach(async () => {
    const result = await container.call('listloanschemes')
    const data = result.filter((r: { default: boolean }) => !r.default)

    for (let i = 0; i < data.length; i += 1) {
      // NOTE(jingyi2811): Delete all schemes except default scheme
      await container.call('destroyloanscheme', [data[i].id])
      await container.generate(1)
    }
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should updateLoanScheme', async () => {
    const loanSchemeId = await client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme' })

    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)

    await container.generate(1)

    const result = await container.call('listloanschemes')
    const data = result.filter((r: { id: string }) => r.id === 'scheme')

    expect(data.length).toStrictEqual(1)
    expect(data[0]).toStrictEqual(
      {
        default: false,
        id: 'scheme',
        interestrate: 3.5,
        mincolratio: 300
      }
    )
  })

  it('should not updateLoanScheme if minConRatio is less than 100', async () => {
    const promise = client.loan.updateLoanScheme(99, new BigNumber(4.5), { id: 'scheme' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nminimum collateral ratio cannot be less than 100\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if interestRate is less than 0', async () => {
    const promise = client.loan.updateLoanScheme(400, new BigNumber(-1), { id: 'scheme' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: updateloanscheme')
  })

  it('should not updateLoanScheme if scheme with same minConRatio and interestRate were created before', async () => {
    const promise = client.loan.updateLoanScheme(100, new BigNumber(1.5), { id: 'scheme' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nLoan scheme default with same interestrate and mincolratio already exists\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if id is an empty string', async () => {
    const promise = client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: '' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if id is more than 8 chars long', async () => {
    const promise = client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: '123456789' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if id is not created before', async () => {
    const promise = client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme2' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nCannot find existing loan scheme with id scheme2\', code: -32600, method: updateloanscheme')
  })

  it('should updateLoanScheme after activateAfterBlock', async () => {
    // NOTE(jingyi2811): Wait for block 100
    await container.waitForBlockHeight(100)

    const loanSchemeId = await client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme', activateAfterBlock: 120 })

    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)

    await container.generate(1)

    // NOTE(jingyi2811): shouldn't update at block 101
    let result = await container.call('listloanschemes')
    let data = result.filter((r: { id: string }) => r.id === 'scheme')

    expect(data.length).toStrictEqual(1)
    expect(data[0]).toStrictEqual(
      {
        default: false,
        id: 'scheme',
        interestrate: 2.5, // NOTE(jingyi2811): No change
        mincolratio: 200 // NOTE(jingyi2811): No change
      }
    )

    // NOTE(jingyi2811): Wait for block 120
    await container.waitForBlockHeight(120)

    // NOTE(jingyi2811): should update at block 200
    result = await container.call('listloanschemes')
    data = result.filter((r: { id: string }) => r.id === 'scheme')

    expect(data.length).toStrictEqual(1)
    expect(data[0]).toStrictEqual(
      {
        default: false,
        id: 'scheme',
        interestrate: 3.5, // NOTE(jingyi2811): changed
        mincolratio: 300 // NOTE(jingyi2811): changed
      }
    )
  })

  it('should not updateLoanScheme if activateAfterBlock is less than current block', async () => {
    // NOTE(jingyi2811): Wait for block 130
    await container.waitForBlockHeight(130)

    // NOTE(jingyi2811): Attempt to update loan scheme on existing block
    const promise = client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme', activateAfterBlock: 100 })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nUpdate height below current block height, set future height\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if same minConRatio and interestRatea pending loan scheme created before', async () => {
    // NOTE(jingyi2811): Wait for block 140
    await container.waitForBlockHeight(140)

    await client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme', activateAfterBlock: 150 })
    await container.generate(1)

    // NOTE(jingyi2811): Create new scheme
    await container.call('createloanscheme', [400, new BigNumber(4.5), 'scheme2'])

    // NOTE(jingyi2811): Updated same minColRatio and interestRate as the pending scheme
    const promise = client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme2' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nLoan scheme scheme with same interestrate and mincolratio pending on block 150\', code: -32600, method: updateloanscheme')
  })

  it('should updateLoanScheme with utxos', async () => {
    const address = await container.call('getnewaddress')
    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const loanId = await client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme', utxos: inputs })

    expect(typeof loanId).toStrictEqual('string')
    expect(loanId.length).toStrictEqual(64)

    await container.generate(1)

    const result = await container.call('listloanschemes')
    const data = result.filter((r: { id: string }) => r.id === 'scheme')

    expect(data.length).toStrictEqual(1)
    expect(data[0]).toStrictEqual(
      { id: 'scheme', mincolratio: 300, interestrate: 3.5, default: false }
    )
  })

  it('should not updateLoanScheme with arbritary utxos', async () => {
    const { txid, vout } = await container.fundAddress(await container.call('getnewaddress'), 10)
    const promise = client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme', utxos: [{ txid, vout }] })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\ntx not from foundation member!\', code: -32600, method: updateloanscheme')
  })
})

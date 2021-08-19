import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    // Default scheme
    await testing.container.call('createloanscheme', [100, new BigNumber(1.5), 'default'])
    await testing.generate(1)
  })

  beforeEach(async () => {
    // Create scheme automatically in every test item
    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme1'])
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

  it('should updateLoanScheme', async () => {
    const loanSchemeId = await testing.rpc.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme2' })
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.container.call('listloanschemes')
    const result = data.filter((d: { id: string }) => d.id === 'scheme2')
    expect(result.length).toStrictEqual(1)
    expect(result[0]).toStrictEqual(
      {
        default: false,
        id: 'scheme2',
        interestrate: 3.5,
        mincolratio: 300
      }
    )
  })

  it('should not updateLoanScheme if minConRatio is less than 100', async () => {
    const promise = testing.rpc.loan.updateLoanScheme(99, new BigNumber(3.5), { id: 'scheme2' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nminimum collateral ratio cannot be less than 100\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if interestRate is less than 0.01', async () => {
    const promise = testing.rpc.loan.updateLoanScheme(400, new BigNumber(0.00999), { id: 'scheme2' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: updateloanscheme')
  })

  it('should not updateLoanScheme if same minConRatio and interestRate were created before', async () => {
    const promise = testing.rpc.loan.updateLoanScheme(100, new BigNumber(1.5), { id: 'scheme2' }) // Failed because its minColRatio and interestRate are same as default
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nLoan scheme default with same interestrate and mincolratio already exists\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if id is not created before', async () => {
    const promise = testing.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme3' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nCannot find existing loan scheme with id scheme3\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if id is an empty string', async () => {
    const promise = client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: '' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if id is more than 8 chars long', async () => {
    const promise = client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: '123456789' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: updateloanscheme')
  })

  it('should updateLoanScheme at activateAfterBlock which is block 150', async () => {
    // NOTE(jingyi2811): Wait for block 100
    await testing.container.waitForBlockHeight(100)

    // NOTE(jingyi2811): To update at block 150
    const loanSchemeId = await client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme', activateAfterBlock: 150 })

    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)

    await testing.generate(1)

    // NOTE(jingyi2811): shouldn't update at block 101
    let result = await testing.container.call('listloanschemes')
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

    // NOTE(jingyi2811): Wait for block 150
    await testing.container.waitForBlockHeight(150)

    // NOTE(jingyi2811): should update at block 150
    result = await testing.container.call('listloanschemes')
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
    // NOTE(jingyi2811): Wait for block 200
    await testing.container.waitForBlockHeight(200)

    // NOTE(jingyi2811): Attempt to updateLoanScheme on existing block
    const promise = client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme', activateAfterBlock: 100 })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nUpdate height below current block height, set future height\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if same minConRatio and interestRate pending loan scheme created before', async () => {
    // NOTE(jingyi2811): Wait for block 250
    await testing.container.waitForBlockHeight(250)

    await client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme', activateAfterBlock: 300 })
    await testing.generate(1)

    // NOTE(jingyi2811): Create new scheme
    await testing.container.call('createloanscheme', [400, new BigNumber(4.5), 'scheme2'])

    // NOTE(jingyi2811): Updated same minColRatio and interestRate as the pending scheme
    const promise = client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme2' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nLoan scheme scheme with same interestrate and mincolratio pending on block 300\', code: -32600, method: updateloanscheme')
  })

  it('should updateLoanScheme with utxos', async () => {
    const { txid, vout } = await testing.container.fundAddress(GenesisKeys[0].owner.address, 10)

    const loanId = await testing.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme', utxos: [{ txid, vout }] })
    expect(typeof loanId).toStrictEqual('string')
    expect(loanId.length).toStrictEqual(64)

    await testing.generate(1)

    const result = await testing.container.call('listloanschemes')
    const data = result.filter((r: { id: string }) => r.id === 'scheme')

    expect(data.length).toStrictEqual(1)
    expect(data[0]).toStrictEqual(
      { id: 'scheme', mincolratio: 300, interestrate: 3.5, default: false }
    )
  })

  it('should not updateLoanScheme with arbritary utxos', async () => {
    const { txid, vout } = await testing.container.fundAddress(await testing.generateAddress(), 10)
    const promise = client.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme', utxos: [{ txid, vout }] })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\ntx not from foundation member!\', code: -32600, method: updateloanscheme')
  })
})

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
    const loanSchemeId = await testing.rpc.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme1' })
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.container.call('listloanschemes')
    const result = data.filter((d: { id: string }) => d.id === 'scheme1')
    expect(result.length).toStrictEqual(1)
    expect(result[0]).toStrictEqual(
      {
        default: false,
        id: 'scheme1',
        interestrate: 3.5,
        mincolratio: 300
      }
    )
  })

  it('should not updateLoanScheme if minColRatio is less than 100', async () => {
    const promise = testing.rpc.loan.updateLoanScheme(99, new BigNumber(3.5), { id: 'scheme1' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nminimum collateral ratio cannot be less than 100\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if interestRate is less than 0.01', async () => {
    const promise = testing.rpc.loan.updateLoanScheme(300, new BigNumber(0.00999), { id: 'scheme1' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\ninterest rate cannot be less than 0.01\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if same minColRatio and interestRate were created before', async () => {
    const promise = testing.rpc.loan.updateLoanScheme(100, new BigNumber(1.5), { id: 'scheme1' }) // Failed because its minColRatio and interestRate are same as default
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nLoan scheme default with same interestrate and mincolratio already exists\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if id does not exist', async () => {
    const promise = testing.rpc.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme2' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nCannot find existing loan scheme with id scheme2\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if id is an empty string', async () => {
    const promise = testing.rpc.loan.updateLoanScheme(300, new BigNumber(3.5), { id: '' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if id is more than 8 chars long', async () => {
    const promise = testing.rpc.loan.updateLoanScheme(300, new BigNumber(3.5), { id: '123456789' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: updateloanscheme')
  })

  it('should updateLoanScheme at activateAfterBlock which is block 120', async () => {
    // Wait for block 110
    await testing.container.waitForBlockHeight(110)

    // To update at block 120
    const loanSchemeId = await testing.rpc.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme1', activateAfterBlock: 120 })
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)
    await testing.generate(1)

    // Shouldn't update at block 111
    let data = await testing.container.call('listloanschemes')
    let result = data.filter((r: { id: string }) => r.id === 'scheme1')
    expect(result.length).toStrictEqual(1)
    expect(result[0]).toStrictEqual(
      {
        default: false,
        id: 'scheme1',
        interestrate: 2.5,
        mincolratio: 200
      }
    )

    // Wait for block 120
    await testing.container.waitForBlockHeight(120)

    // Should update at block 120
    result = await testing.container.call('listloanschemes')
    data = result.filter((r: { id: string }) => r.id === 'scheme1')
    expect(data.length).toStrictEqual(1)
    expect(data[0]).toStrictEqual(
      {
        default: false,
        id: 'scheme1',
        interestrate: 3.5,
        mincolratio: 300
      }
    )
  })

  it('should not updateLoanScheme if activateAfterBlock is less than current block', async () => {
    // Wait for block 130
    await testing.container.waitForBlockHeight(130)

    // Attempt to updateLoanScheme at block 129
    const promise = testing.rpc.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme1', activateAfterBlock: 129 })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nUpdate height below current block height, set future height\', code: -32600, method: updateloanscheme')
  })

  it('should not updateLoanScheme if same minColRatio and interestRate pending loan scheme created before', async () => {
    // Wait for block 140
    await testing.container.waitForBlockHeight(140)

    await testing.container.call('createloanscheme', [300, new BigNumber(3.5), 'scheme2'])
    await testing.generate(1)

    // Update scheme on later block
    await testing.rpc.loan.updateLoanScheme(400, new BigNumber(4.5), { id: 'scheme2', activateAfterBlock: 150 })
    await testing.generate(1)

    // Attempt to update same minColRatio and interestRate as the pending scheme
    const promise = testing.rpc.loan.updateLoanScheme(400, new BigNumber(4.5), { id: 'scheme1' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\nLoan scheme scheme2 with same interestrate and mincolratio pending on block 150\', code: -32600, method: updateloanscheme')

    // Update at block 150
    await testing.container.waitForBlockHeight(150)
  })

  it('should updateLoanScheme with utxos', async () => {
    const { txid, vout } = await testing.container.fundAddress(GenesisKeys[0].owner.address, 10)

    const loanId = await testing.rpc.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme1', utxos: [{ txid, vout }] })
    expect(typeof loanId).toStrictEqual('string')
    expect(loanId.length).toStrictEqual(64)
    await testing.generate(1)

    const result = await testing.container.call('listloanschemes')
    const data = result.filter((r: { id: string }) => r.id === 'scheme1')
    expect(data.length).toStrictEqual(1)
    expect(data[0]).toStrictEqual(
      { id: 'scheme1', mincolratio: 300, interestrate: 3.5, default: false }
    )
  })

  it('should not updateLoanScheme  with utxos not from foundation member', async () => {
    const { txid, vout } = await testing.container.fundAddress(await testing.generateAddress(), 10)
    const promise = testing.rpc.loan.updateLoanScheme(300, new BigNumber(3.5), { id: 'scheme1', utxos: [{ txid, vout }] })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSchemeTx execution failed:\ntx not from foundation member!\', code: -32600, method: updateloanscheme')
  })
})

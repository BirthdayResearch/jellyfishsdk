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

    await testing.container.call('createloanscheme', [100, new BigNumber(1.5), 'scheme1'])
    await testing.generate(1)

    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme2'])
    await testing.generate(1)
  })

  afterEach(async () => {
    // Always set default scheme to scheme1
    const data = await testing.container.call('listloanschemes')
    const record = data.find((d: { default: string }) => d.default)
    if (record.id !== 'scheme1') {
      await testing.rpc.loan.setDefaultLoanScheme('scheme1')
      await testing.generate(1)
    }
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should setDefaultLoanScheme', async () => {
    const loanSchemeId = await testing.rpc.loan.setDefaultLoanScheme('scheme2')
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)
    await testing.generate(1)

    const result = await testing.container.call('listloanschemes', [])
    expect(result).toStrictEqual(
      [
        { id: 'scheme1', mincolratio: 100, interestrate: 1.5, default: false },
        { id: 'scheme2', mincolratio: 200, interestrate: 2.5, default: true }
      ]
    )
  })

  it('should not setDefaultLoanScheme if id is an empty string', async () => {
    const promise = testing.rpc.loan.setDefaultLoanScheme('')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DefaultLoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: setdefaultloanscheme')
  })

  it('should not setDefaultLoanScheme if id is more than 8 chars long', async () => {
    const promise = testing.rpc.loan.setDefaultLoanScheme('123456789')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DefaultLoanSchemeTx execution failed:\nid cannot be empty or more than 8 chars long\', code: -32600, method: setdefaultloanscheme')
  })

  it('should not setDefaultLoanScheme if id does not exists', async () => {
    const promise = testing.rpc.loan.setDefaultLoanScheme('scheme3')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DefaultLoanSchemeTx execution failed:\nCannot find existing loan scheme with id scheme3\', code: -32600, method: setdefaultloanscheme')
  })

  it('should not setDefaultLoanScheme if the scheme is a default scheme', async () => {
    const promise = testing.rpc.loan.setDefaultLoanScheme('scheme1')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DefaultLoanSchemeTx execution failed:\nLoan scheme with id scheme1 is already set as default\', code: -32600, method: setdefaultloanscheme')
  })

  it('should not setDefaultLoanScheme if the scheme is going to be deleted at future block', async () => {
    await testing.container.call('createloanscheme', [300, new BigNumber(3.5), 'scheme3'])
    await testing.generate(1)

    // Wait for block 110
    await testing.container.waitForBlockHeight(110)

    // To delete at block 120
    const loanSchemeId = await testing.container.call('destroyloanscheme', ['scheme3', 120])
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)
    await testing.generate(1)

    const promise = testing.rpc.loan.setDefaultLoanScheme('scheme3')
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DefaultLoanSchemeTx execution failed:\nCannot set scheme3 as default, set to destroyed on block 120\', code: -32600, method: setdefaultloanscheme')

    // Delete at block 120
    await testing.container.waitForBlockHeight(120)
  })

  it('should setDefaultLoanScheme with utxos', async () => {
    const { txid, vout } = await testing.container.fundAddress(GenesisKeys[0].owner.address, 10)
    const loanSchemeId = await testing.rpc.loan.setDefaultLoanScheme('scheme2', [{ txid, vout }])
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)
    await testing.generate(1)

    const rawtx = await testing.container.call('getrawtransaction', [loanSchemeId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(txid)
    expect(rawtx.vin[0].vout).toStrictEqual(vout)

    const result = await testing.container.call('listloanschemes', [])
    expect(result).toStrictEqual(
      [
        { id: 'scheme1', mincolratio: 100, interestrate: 1.5, default: false },
        { id: 'scheme2', mincolratio: 200, interestrate: 2.5, default: true }
      ]
    )
  })

  it('should not setDefaultLoanScheme with utxos not from foundation member', async () => {
    const utxo = await testing.container.fundAddress(await testing.generateAddress(), 10)
    const promise = testing.rpc.loan.setDefaultLoanScheme('scheme2', [utxo])
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DefaultLoanSchemeTx execution failed:\ntx not from foundation member!\', code: -32600, method: setdefaultloanscheme')
  })
})

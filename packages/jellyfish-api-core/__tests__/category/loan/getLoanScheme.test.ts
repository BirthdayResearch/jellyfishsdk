import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan getLoanScheme', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getLoanScheme', async () => {
    await testing.container.call('createloanscheme', [100, new BigNumber(1.5), 'scheme1'])
    await testing.container.generate(1)

    const data = await testing.rpc.loan.getLoanScheme('scheme1')
    expect(data).toStrictEqual(
      { id: 'scheme1', interestrate: new BigNumber(1.5), mincolratio: new BigNumber(100) }
    )
  })

  it('should not getLoanScheme if id is an empty string', async () => {
    const promise = testing.rpc.loan.getLoanScheme('')
    await expect(promise).rejects.toThrow('RpcApiError: \'Cannot find existing loan scheme with id scheme2\', code: -8, method: getloanscheme')
  })

  it('should not getLoanScheme if id is more than 8 characters', async () => {
    const promise = testing.rpc.loan.getLoanScheme('x'.repeat(8))
    await expect(promise).rejects.toThrow('RpcApiError: \'Cannot find existing loan scheme with id scheme2\', code: -8, method: getloanscheme')
  })

  it('should not getLoanScheme if id does not exist', async () => {
    const promise = testing.rpc.loan.getLoanScheme('scheme2')
    await expect(promise).rejects.toThrow('RpcApiError: \'Cannot find existing loan scheme with id scheme2\', code: -8, method: getloanscheme')
  })
})

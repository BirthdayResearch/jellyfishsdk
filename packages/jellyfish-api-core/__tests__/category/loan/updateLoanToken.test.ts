import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  it('should updateLoanToken', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await container.getNewAddress('', 'legacy'), [{
      currency: 'USD',
      token: 'DFI'
    }, { currency: 'USD', token: 'BTC' }], 10])
    await testing.generate(1)

    await testing.container.call('setloantoken', [
      {
        symbol: 'TSLAAAA',
        name: 'Tesla',
        priceFeedId,
        mintable: false,
        interest: new BigNumber(0.01)
      }, []])
    await testing.generate(1)

    await testing.rpc.loan.updateLoanToken({
      token: 'TSLAAAA',
      symbol: 'TSLA',
      name: 'Tesla stock token',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.05)
    })

    // await testing.container.call('updateloantoken', [
    //   {token: 'TSLAAAA'},
    //   {symbol: 'TSLA',
    //     name: 'Tesla stock token',
    //     priceFeedId,
    //     mintable: true,
    //     interest: new BigNumber(0.05)},
    //   []]
    // )
    await testing.generate(1)
  })
})

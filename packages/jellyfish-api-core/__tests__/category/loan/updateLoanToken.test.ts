// import { ContainerAdapterClient } from '../../container_adapter_client'
import { LoanMasterNodeRegTestContainer } from './loan_container'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  // const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterEach(async () => {
    // TODO jingyi2811
    // Currently, there is no way to delete every loan token created
  })

  afterAll(async () => {
    await container.stop()
  })

  // setLoanTokenTx = self.nodes[0].setloantoken({
  //   'symbol': "TSLAAAA",
  //   'name': "Tesla",
  //   'priceFeedId': oracle_id1,
  //   'mintable': False,
  //   'interest': 0.01})

  it('should updateLoanToken', async () => {
    const tokens = await container.call('listtokens')
    console.log(tokens)

    const address = await container.call('getnewaddress')
    const metadata = {
      symbol: 'BTC',
      name: 'BTC token',
      isDAT: true,
      collateralAddress: address
    }
    await container.call('createtoken', [metadata])
    await container.generate(1)

    const address1 = await container.getNewAddress('', 'legacy')

    const oracleId = await container.call('appointoracle', [address1,
      [{ currency: 'USD', token: 'DFI' }, { currency: 'USD', token: 'BTC' }],
      10])

    await container.generate(1)

    await container.call('setloantoken', [{
      symbol: 'TSLAAAA',
      name: 'Tesla',
      priceFeedId: oracleId,
      mintable: false,
      interest: 0.01
      // TODO jingyi2811
      // There is bug in the c++ side
      // Supposes no need to be passed in interest, and default value of 1 will be set
      // But this is not the case now
    }])

    await container.generate(1)

    const data = await container.call('listloantokens', [])
    console.log(data)

    // const updateTxId = await client.loan.updateLoanToken(
    //   'TSLAAAA',
    //   {
    //     symbol: 'TSLA',
    //     name: 'Tesla stock token',
    //     priceFeedId: oracleId,
    //     mintable: true,
    //     interest: 0.05
    //   },
    // )
    //
    // await container.generate(1)

    await container.call('updateloantoken', [
      {
        token: 'TSLAAAA'
      },
      {
        symbol: 'TSLA',
        name: 'Tesla stock token',
        priceFeedId: oracleId,
        mintable: true,
        interest: 0.01
      }
    ])

    await container.generate(1)

    // TODO jingyi2811
    // updateloantoken keeps on returning 'Token  is not a loan token! Can't alter other tokens with this tx!', code: -8
    // even though I copy the same python test logic to here
  })
})

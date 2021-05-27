import { ContainerAdapterClient } from '../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Order } from '../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'

describe('ICXOrderBook Test', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  let symbolDFI: string
  let symbolBTC: string
  let accountDFI: string
  let accountBTC: string
  // let idDFI: string
  // let idBTC: string

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await container.stop()
  })

  async function setup (): Promise<void> {
    symbolDFI = 'DFI'
    symbolBTC = 'BTC'
    accountDFI = await container.call('getnewaddress')
    accountBTC = await container.call('getnewaddress')
    // console.log("spk:"+accountDFI)
    // console.log("spk:"+accountBTC)

    // create BTC tocken
    await createToken(accountBTC, symbolBTC, 10)
    // const resp:any = await container.call('gettoken', [symbolBTC])

    // send funds to accounts
    const payload: { [key: string]: string } = {}
    payload[accountDFI] = '101@' + symbolDFI
    await container.call('utxostoaccount', [payload])
    await accountToAccount(symbolBTC, 5, accountBTC, accountDFI)

    // set taker fee rate
    await container.call('setgov', [{ ICX_TAKERFEE_PER_BTC: 0.001 }])
    await container.generate(1)
    const result: any = await container.call('getgov', ['ICX_TAKERFEE_PER_BTC'])
    expect(result.ICX_TAKERFEE_PER_BTC as number).toStrictEqual(0.001)
  }

  async function createToken (address: string, symbol: string, amount: number): Promise<void> {
    const metadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await container.waitForWalletBalanceGTE(101)
    await container.call('createtoken', [metadata])
    await container.generate(1)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }

  async function accountToAccount (symbol: string, amount: number, from: string, _to = ''): Promise<string> {
    const to = _to !== '' ? _to : await container.call('getnewaddress')

    await container.call('accounttoaccount', [from, { [to]: `${amount.toString()}@${symbol}` }])
    await container.generate(1)

    return to
  }

  it('should create ICXCreateOrder transaction', async () => {
    const order: Order = {
      tokenFrom: symbolDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(1),
      // orderPrice: {
      //   integer: new BigNumber(1),
      //   fraction: new BigNumber(0.01)
      // }/
      orderPrice: new BigNumber(0.01)
    }

    const result: any = await client.icxorderbook.ICXCreateOrder(order, [])
    const txId = result.txid
    // console.log("txid: "+ txId)

    await container.generate(1)

    // check the transaction exists
    const tx = await container.call('gettransaction', [txId])
    expect(tx.txid).toStrictEqual(txId)
    // console.log(JSON.stringify(tx))
  })
})

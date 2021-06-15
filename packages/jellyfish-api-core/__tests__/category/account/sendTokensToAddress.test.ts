import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { SelectionModeType /* SendTokensOptions */ } from '../../../src/category/account'

describe('SendTokenToAddress', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await container.stop()
  })

  let addrA: string
  let addrB: string
  let addrCForward: string
  let addrCCrumbs: string
  let addrCPie: string

  async function setup (): Promise<void> {
    addrA = await container.call('getnewaddress')
    addrB = await container.call('getnewaddress')
    addrCForward = await container.call('getnewaddress')
    addrCCrumbs = await container.call('getnewaddress')
    addrCPie = await container.call('getnewaddress')
    console.log('addrCForward: ', addrCForward)
    console.log('addrCCrumbs: ', addrCCrumbs)
    console.log('addrCPie: ', addrCPie)

    const tokenaddrA = await container.call('getnewaddress')
    const tokenaddrB = await container.call('getnewaddress')
    const tokenAddrC = await container.call('getnewaddress')
    await createToken(tokenaddrA, 'ANT', 100)
    await createToken(tokenaddrB, 'BAT', 100)
    await createToken(tokenAddrC, 'CAT', 200)

    await container.call('accounttoaccount', [tokenaddrA, { [addrA]: `${100}@ANT` }])
    await container.call('accounttoaccount', [tokenaddrB, { [addrB]: `${100}@BAT` }])
    await container.call('accounttoaccount', [tokenAddrC, { [addrCForward]: `${49}@CAT` }])
    await container.call('accounttoaccount', [tokenAddrC, { [addrCCrumbs]: `${3}@CAT` }])
    await container.call('accounttoaccount', [tokenAddrC, { [addrCPie]: `${104}@CAT` }])
    await container.generate(1)
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

    await container.waitForWalletBalanceGTE(amount)
    await container.call('createtoken', [metadata])
    await container.generate(1)

    await container.call('utxostoaccount', [{ [address]: `${amount.toString()}@0` }])
    await container.generate(1)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }

  function accToNum (acc: string): number {
    return Number(acc.split('@')[0])
  }

  it('should sendTokensToAddress with selectionMode pie', async () => {
    const accPieBefore = (await client.account.getAccount(addrCPie))[0]
    console.log('accPieBefore: ', accPieBefore)

    const addrReceiver = await client.wallet.getNewAddress()
    const hex = await client.account.sendTokensToAddress({}, { [addrReceiver]: ['4@CAT'] }, {
      selectionMode: SelectionModeType.PIE
    })
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    const accPieAfter = (await client.account.getAccount(addrCPie))[0]
    console.log('accPieAfter: ', accPieAfter)
    expect(accToNum(accPieAfter)).toStrictEqual(accToNum(accPieBefore) - 4) // 100

    const accReceiver = await client.account.getAccount(addrReceiver)
    console.log('accReceiver: ', accReceiver)
    expect(accReceiver[0]).toStrictEqual('4.00000000@CAT')
  })

  it('should sendTokensToAddress with selectionMode crumbs', async () => {
    const accCrumbsBefore = (await client.account.getAccount(addrCCrumbs))[0]
    console.log('accCrumbsBefore: ', accCrumbsBefore)

    const addrReceiver = await client.wallet.getNewAddress()
    const hex = await client.account.sendTokensToAddress({}, { [addrReceiver]: ['2@CAT'] }, {
      selectionMode: SelectionModeType.CRUMBS
    })
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    const accCrumbsAfter = (await client.account.getAccount(addrCCrumbs))[0]
    console.log('accCrumbsAfter: ', accCrumbsAfter)
    expect(accToNum(accCrumbsAfter)).toStrictEqual(accToNum(accCrumbsBefore) - 2) // 1

    const accReceiver = await client.account.getAccount(addrReceiver)
    console.log('accReceiver: ', accReceiver)
    expect(accReceiver[0]).toStrictEqual('2.00000000@CAT')
  })

  // NOTE(canonrother): "selectionMode: forward" picks the address name order by ASC, its hard to test as address is random generated
  it.skip('should sendTokensToAddress with selectionMode forward', async () => {
    const accForwardBefore = (await client.account.getAccount(addrCCrumbs))[0]
    console.log('accForwardBefore: ', accForwardBefore)

    const addrReceiver = await client.wallet.getNewAddress()
    const hex = await client.account.sendTokensToAddress({}, { [addrReceiver]: ['6@CAT'] }, {
      selectionMode: SelectionModeType.FORWARD
    })
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    const accForwardAfter = (await client.account.getAccount(addrCCrumbs))[0]
    console.log('accForwardAfter: ', accForwardAfter)
    expect(accToNum(accForwardAfter)).toStrictEqual(accToNum(accForwardBefore) - 6) // 43

    const accReceiver = await client.account.getAccount(addrReceiver)
    console.log('accReceiver: ', accReceiver)
    expect(accReceiver[0]).toStrictEqual('6.00000000@CAT')
  })

  // it('should create a transaction with Crumbs selection mode', async () => {
  //   const options: SendTokensOptions = {
  //     selectionMode: SelectionModeType.CRUMBS
  //   }
  //   const address = await client.wallet.getNewAddress()
  //   const transactionHex = await client.account.sendTokensToAddress({}, { [address]: ['10@DETH'] }, options)
  //   await container.generate(1)

  //   const account = await client.account.getAccount(addrA)

  //   expect(account[2]).toStrictEqual('10.00000000@DETH')
  //   expect(await client.account.getAccount(address)).toStrictEqual(['10.00000000@DETH'])
  //   expect(typeof transactionHex).toStrictEqual('string')
  //   expect(transactionHex.length).toStrictEqual(64)
  // })

  // it('should create a transaction with multiple destination address tokens', async () => {
  //   const address = await client.wallet.getNewAddress()
  //   const transactionHex = await client.account.sendTokensToAddress({}, { [address]: ['2@ETH', '0.1@CAT', '10@DETH'] })
  //   await container.generate(1)

  //   expect(await client.account.getAccount(address)).toStrictEqual(['0.10000000@CAT', '2.00000000@ETH', '10.00000000@DETH'])
  //   expect(typeof transactionHex).toStrictEqual('string')
  //   expect(transactionHex.length).toStrictEqual(64)
  // })

  // it('should create a transaction with source address provided', async () => {
  //   const address = await client.wallet.getNewAddress()
  //   const transactionHex = await client.account.sendTokensToAddress({ [addrA]: ['10@ETH'] }, { [address]: ['10@ETH'] })
  //   await container.generate(1)

  //   expect(await client.account.getAccount(address)).toStrictEqual(['10.00000000@ETH'])
  //   expect(typeof transactionHex).toStrictEqual('string')
  //   expect(transactionHex.length).toStrictEqual(64)
  // })

  // it('should create a transaction with multiple source address tokens provided', async () => {
  //   const address = await client.wallet.getNewAddress()
  //   const transactionHex = await client.account.sendTokensToAddress({ [addrA]: ['2@CAT', '10@ETH'] }, { [address]: ['2@CAT', '10@ETH'] })
  //   await container.generate(1)

  //   expect(await client.account.getAccount(address)).toStrictEqual(['2.00000000@CAT', '10.00000000@ETH'])
  //   expect(typeof transactionHex).toStrictEqual('string')
  //   expect(transactionHex.length).toStrictEqual(64)
  // })

  // it('should fail and throw an exception if destination address param is empty', async () => {
  //   await expect(client.account.sendTokensToAddress({}, {})).rejects.toThrow('zero amounts in "to" param')
  // })

  // it('should throw an error with insufficient fund', async () => {
  //   const promise = client.account.sendTokensToAddress({}, { [await client.wallet.getNewAddress()]: ['500@ETH'] })

  //   await expect(promise).rejects.toThrow('Not enough balance on wallet accounts, call utxostoaccount to increase it.')
  // })
})

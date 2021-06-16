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
    const addrReceiver = await container.call('getnewaddress')
    const hex = await client.account.sendTokensToAddress({}, { [addrReceiver]: ['4@CAT'] }, {
      selectionMode: SelectionModeType.PIE
    })

    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    const accPieAfter = (await client.account.getAccount(addrCPie))[0]
    expect(accToNum(accPieAfter)).toStrictEqual(accToNum(accPieBefore) - 4)

    const accReceiver = (await client.account.getAccount(addrReceiver))[0]
    expect(accReceiver).toStrictEqual('4.00000000@CAT')
  })

  it('should sendTokensToAddress with selectionMode crumbs', async () => {
    const accCrumbsBefore = (await client.account.getAccount(addrCCrumbs))[0]

    const addrReceiver = await container.call('getnewaddress')
    const hex = await client.account.sendTokensToAddress({}, { [addrReceiver]: ['2@CAT'] }, {
      selectionMode: SelectionModeType.CRUMBS
    })
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    const accCrumbsAfter = (await client.account.getAccount(addrCCrumbs))[0]
    expect(accToNum(accCrumbsAfter)).toStrictEqual(accToNum(accCrumbsBefore) - 2)

    const accReceiver = (await client.account.getAccount(addrReceiver))[0]
    expect(accReceiver).toStrictEqual('2.00000000@CAT')
  })

  // NOTE(canonrother): "selectionMode: forward" picks the address name order by ASC, its hard to test as address is random generated
  it.skip('should sendTokensToAddress with selectionMode forward', async () => {
    const accForwardBefore = (await client.account.getAccount(addrCCrumbs))[0]

    const addrReceiver = await client.wallet.getNewAddress()
    const hex = await client.account.sendTokensToAddress({}, { [addrReceiver]: ['6@CAT'] }, {
      selectionMode: SelectionModeType.FORWARD
    })
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    const accForwardAfter = (await client.account.getAccount(addrCCrumbs))[0]
    expect(accToNum(accForwardAfter)).toStrictEqual(accToNum(accForwardBefore) - 6)

    const accReceiver = (await client.account.getAccount(addrReceiver))[0]
    expect(accReceiver).toStrictEqual('6.00000000@CAT')
  })

  it('should sendTokensToAddress with multiple receiver tokens', async () => {
    const address = await container.call('getnewaddress')
    const hex = await client.account.sendTokensToAddress({}, { [address]: ['2@ANT', '5@CAT', '10@BAT'] })

    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    expect(await client.account.getAccount(address)).toStrictEqual(['2.00000000@ANT', '10.00000000@BAT', '5.00000000@CAT'])
  })

  it('should sendTokensToAddress with source address', async () => {
    const addrReceiver = await container.call('getnewaddress')
    const hex = await client.account.sendTokensToAddress({ [addrA]: ['10@ANT'] }, { [addrReceiver]: ['10@ANT'] })

    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    expect(await client.account.getAccount(addrReceiver)).toStrictEqual(['10.00000000@ANT'])
  })

  it('should fail and throw an exception when no receiver address', async () => {
    await expect(client.account.sendTokensToAddress({}, {})).rejects.toThrow('zero amounts in "to" param')
  })

  it('should throw an error when insufficient fund', async () => {
    const promise = client.account.sendTokensToAddress({}, { [await container.call('getnewaddress')]: ['500@CAT'] })

    await expect(promise).rejects.toThrow('Not enough balance on wallet accounts, call utxostoaccount to increase it.')
  })

  it('should throw an error when sending different tokens', async () => {
    const promise = client.account.sendTokensToAddress({ [addrA]: ['10@ANT'] }, { [await container.call('getnewaddress')]: ['10@BAT'] })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test AnyAccountsToAccountsTx execution failed:\nsum of inputs (from) != sum of outputs (to)\', code: -32600, method: sendtokenstoaddress')
  })

  it('should throw an error when sending different amount', async () => {
    const promise = client.account.sendTokensToAddress({ [addrA]: ['10@ANT'] }, { [await container.call('getnewaddress')]: ['20@ANT'] })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test AnyAccountsToAccountsTx execution failed:\nsum of inputs (from) != sum of outputs (to)\', code: -32600, method: sendtokenstoaddress')
  })
})

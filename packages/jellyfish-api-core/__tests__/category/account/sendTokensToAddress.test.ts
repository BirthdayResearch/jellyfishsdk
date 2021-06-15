import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { SelectionModeType } from '../../../src/category/account'

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

  let addressA: string
  let addressB: string
  let addressC1: string
  let addressC2: string
  let addressC3: string

  async function setup (): Promise<void> {
    addressA = await container.call('getnewaddress')
    addressB = await container.call('getnewaddress')
    addressC1 = await container.call('getnewaddress')
    addressC2 = await container.call('getnewaddress')
    addressC3 = await container.call('getnewaddress')

    const tokenAddrA = await container.call('getnewaddress')
    const tokenAddrB = await container.call('getnewaddress')
    const tokenAddrC = await container.call('getnewaddress')

    await createToken(tokenAddrA, 'ANT', 200)
    await createToken(tokenAddrB, 'DOG', 200)
    await createToken(tokenAddrB, 'BAT', 200)
    await createToken(tokenAddrC, 'CAT', 200)

    await container.call('accounttoaccount', [tokenAddrA, { [addressA]: `${3}@ANT` }])
    await container.call('accounttoaccount', [tokenAddrB, { [addressB]: `${68}@BAT` }])
    await container.call('accounttoaccount', [tokenAddrC, { [addressC1]: `${89}@CAT` }])
    await container.call('accounttoaccount', [tokenAddrC, { [addressC2]: `${15}@CAT` }])
    await container.call('accounttoaccount', [tokenAddrC, { [addressC3]: `${54}@CAT` }])
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

    await container.waitForWalletBalanceGTE(100)
    await container.call('createtoken', [metadata])
    await container.generate(1)

    await container.call('utxostoaccount', [{ [address]: '100@0' }])
    await container.generate(1)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }

  it('should create a transaction with Pie selection mode', async () => {
    const accountBalanceBefore = await client.account.getAccount(addressC1)

    const address = await client.wallet.getNewAddress()
    const hex = await client.account.sendTokensToAddress({}, { [address]: ['2@CAT'] }, { selectionMode: SelectionModeType.PIE })
    await container.generate(1)

    const accountBalanceAfter = await client.account.getAccount(addressC1)

    expect(accountBalanceBefore).toStrictEqual(['89.00000000@CAT'])
    expect(accountBalanceAfter).toStrictEqual(['87.00000000@CAT'])
    expect(await client.account.getAccount(address)).toStrictEqual(['2.00000000@CAT'])
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)
  })

  it('should create a transaction with Crumbs selection mode', async () => {
    const accountBalanceBefore = await client.account.getAccount(addressC2)

    const address = await client.wallet.getNewAddress()
    const hex = await client.account.sendTokensToAddress({}, { [address]: ['3@CAT'] }, { selectionMode: SelectionModeType.CRUMBS })
    await container.generate(1)

    const accountBalanceAfter = await client.account.getAccount(addressC2)

    expect(accountBalanceBefore).toStrictEqual(['15.00000000@CAT'])
    expect(accountBalanceAfter).toStrictEqual(['12.00000000@CAT'])
    expect(await client.account.getAccount(address)).toStrictEqual(['3.00000000@CAT'])
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)
  })

  it('should create a transaction with multiple destination address tokens', async () => {
    const address = await client.wallet.getNewAddress()
    const hex = await client.account.sendTokensToAddress({}, { [address]: ['10@CAT', '10@BAT'] })
    await container.generate(1)

    expect(await client.account.getAccount(address)).toStrictEqual(['10.00000000@BAT', '10.00000000@CAT'])
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)
  })

  it('should create a transaction with source address provided', async () => {
    const address = await client.wallet.getNewAddress()
    const hex = await client.account.sendTokensToAddress({ [addressC1]: ['10@CAT'] }, { [address]: ['10@CAT'] })
    await container.generate(1)

    expect(await client.account.getAccount(address)).toStrictEqual(['10.00000000@CAT'])
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)
  })

  it('should create a transaction with multiple source address tokens provided', async () => {
    const address = await client.wallet.getNewAddress()
    const hex = await client.account.sendTokensToAddress({ [addressB]: ['8@BAT'] }, { [address]: ['8@BAT'] })
    await container.generate(1)

    expect(await client.account.getAccount(address)).toStrictEqual(['8.00000000@BAT'])
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)
  })

  it('should fail and throw an exception if destination address param is empty', async () => {
    await expect(client.account.sendTokensToAddress({}, {})).rejects.toThrow('zero amounts in "to" param')
  })

  it('should throw an error with insufficient fund', async () => {
    const promise = client.account.sendTokensToAddress({}, { [await client.wallet.getNewAddress()]: ['500@ANT'] })

    await expect(promise).rejects.toThrow('Not enough balance on wallet accounts, call utxostoaccount to increase it.')
  })
})

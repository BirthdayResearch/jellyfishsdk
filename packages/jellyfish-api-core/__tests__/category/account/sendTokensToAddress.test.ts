import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { SelectionModeType, SendTokensOptions } from '../../../src/category/account'

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
  let addressC: string
  let tokenAddress: string

  async function setup (): Promise<void> {
    tokenAddress = await container.call('getnewaddress')
    addressA = await container.call('getnewaddress')
    addressB = await container.call('getnewaddress')
    addressC = await container.call('getnewaddress')

    await createToken(tokenAddress, 'CAT', 100)
    await createToken(tokenAddress, 'ETH', 100)
    await createToken(tokenAddress, 'DETH', 100)

    await accountToAccount('CAT')
    await accountToAccount('ETH')
    await accountToAccount('DETH')
  }

  async function accountToAccount (symbol: string): Promise<void> {
    await container.call('accounttoaccount', [tokenAddress, { [addressA]: `${20}@${symbol}` }])
    await container.call('accounttoaccount', [tokenAddress, { [addressB]: `${30}@${symbol}` }])
    await container.call('accounttoaccount', [tokenAddress, { [addressC]: `${50}@${symbol}` }])
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

  it('should create a transaction with auto select (empty source address) Pie selection mode', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [address]: ['2@CAT'] })
    await container.generate(1)

    const account = await client.account.getAccount(addressC)

    expect(await client.account.getAccount(address)).toStrictEqual(['2.00000000@CAT'])
    expect(typeof transactionHex).toStrictEqual('string')
    expect(transactionHex.length).toStrictEqual(64)
    expect(account[0]).toStrictEqual('48.00000000@CAT')
  })

  it('should create a transaction with Crumbs selection mode', async () => {
    const options: SendTokensOptions = {
      selectionMode: SelectionModeType.CRUMBS
    }
    const address = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [address]: ['10@DETH'] }, options)
    await container.generate(1)

    const account = await client.account.getAccount(addressA)

    expect(account[2]).toStrictEqual('10.00000000@DETH')
    expect(await client.account.getAccount(address)).toStrictEqual(['10.00000000@DETH'])
    expect(typeof transactionHex).toStrictEqual('string')
    expect(transactionHex.length).toStrictEqual(64)
  })

  it('should create a transaction with multiple destination address tokens', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [address]: ['2@ETH', '0.1@CAT', '10@DETH'] })
    await container.generate(1)

    expect(await client.account.getAccount(address)).toStrictEqual(['0.10000000@CAT', '2.00000000@ETH', '10.00000000@DETH'])
    expect(typeof transactionHex).toStrictEqual('string')
    expect(transactionHex.length).toStrictEqual(64)
  })

  it('should create a transaction with source address provided', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({ [addressA]: ['10@ETH'] }, { [address]: ['10@ETH'] })
    await container.generate(1)

    expect(await client.account.getAccount(address)).toStrictEqual(['10.00000000@ETH'])
    expect(typeof transactionHex).toStrictEqual('string')
    expect(transactionHex.length).toStrictEqual(64)
  })

  it('should create a transaction with multiple source address tokens provided', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({ [addressA]: ['2@CAT', '10@ETH'] }, { [address]: ['2@CAT', '10@ETH'] })
    await container.generate(1)

    expect(await client.account.getAccount(address)).toStrictEqual(['2.00000000@CAT', '10.00000000@ETH'])
    expect(typeof transactionHex).toStrictEqual('string')
    expect(transactionHex.length).toStrictEqual(64)
  })

  it('should fail and throw an exception if destination address param is empty', async () => {
    await expect(client.account.sendTokensToAddress({}, {})).rejects.toThrow('zero amounts in "to" param')
  })

  it('should throw an error with insufficient fund', async () => {
    const promise = client.account.sendTokensToAddress({}, { [await client.wallet.getNewAddress()]: ['500@ETH'] })

    await expect(promise).rejects.toThrow('Not enough balance on wallet accounts, call utxostoaccount to increase it.')
  })
})

import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { AddressBalances, SelectionModeType } from '../../../src/category/account'

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

  let from: string

  async function setup (): Promise<void> {
    from = await container.call('getnewaddress')
    await createToken(from, 'DBTC', 200)
    await createToken(from, 'ETH', 200)
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

    await container.call('utxostoaccount', [{ [address]: '100@0' }])
    await container.generate(1)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }

  async function sendTokensToAddress (from: AddressBalances, to: AddressBalances, selectionMode?: SelectionModeType): Promise<string> {
    const transactionHex = await client.account.sendTokensToAddress(from, to, selectionMode)
    await container.generate(1)
    return transactionHex
  }

  it('should create a transaction with auto select (empty source address)', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await sendTokensToAddress({}, { [address]: ['2@DFI'] })
    const account = await client.account.getAccount(address)

    expect(account).toStrictEqual(['2.00000000@DFI'])
    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with Pie selection Mode', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await sendTokensToAddress({}, { [address]: ['2@DFI'] }, SelectionModeType.PIE)
    const account = await client.account.getAccount(address)

    expect(account).toStrictEqual(['2.00000000@DFI'])
    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with Forward selection mode', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await sendTokensToAddress({}, { [address]: ['2@DFI'] }, SelectionModeType.FORWARD)
    const account = await client.account.getAccount(address)

    expect(account).toStrictEqual(['2.00000000@DFI'])
    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with Crumbs selection mode', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await sendTokensToAddress({}, { [address]: ['2@DFI'] }, SelectionModeType.CRUMBS)
    const account = await client.account.getAccount(address)

    expect(account).toStrictEqual(['2.00000000@DFI'])
    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with multiple destination address tokens', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await sendTokensToAddress({}, { [address]: ['2@ETH', '0.1@DBTC', '10@DFI'] })
    const account = await client.account.getAccount(address)

    expect(account).toStrictEqual(['10.00000000@DFI', '0.10000000@DBTC', '2.00000000@ETH'])
    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with source address provided', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await sendTokensToAddress({ [from]: ['10@ETH'] }, { [address]: ['10@ETH'] })
    const account = await client.account.getAccount(address)

    expect(account).toStrictEqual(['10.00000000@ETH'])
    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with multiple source address tokens provided', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await sendTokensToAddress({ [from]: ['2@DBTC', '10@ETH'] }, { [address]: ['2@DBTC', '10@ETH'] })
    const account = await client.account.getAccount(address)

    expect(account).toStrictEqual(['2.00000000@DBTC', '10.00000000@ETH'])
    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should fail and throw an exception if destination address param is empty', async () => {
    const promise = client.account.sendTokensToAddress({}, {})

    await expect(promise).rejects.toThrow('zero amounts in "to" param')
  })
})

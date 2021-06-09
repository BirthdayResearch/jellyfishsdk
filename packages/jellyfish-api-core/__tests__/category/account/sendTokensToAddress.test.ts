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

  let addA: string

  async function setup (): Promise<void> {
    addA = await container.call('getnewaddress')
    await createToken(addA, 'DBTC', 200)
    await createToken(addA, 'ETH', 200)
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

  it('should create a transaction with auto select (empty source address)', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [address]: ['2@DFI'] })
    await container.generate(1)

    const account = await client.account.getAccount(address)

    expect(account).toStrictEqual(['2.00000000@DFI'])
    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with Pie selection Mode', async () => {
    const options: SendTokensOptions = {
      selectionMode: SelectionModeType.PIE
    }
    const address = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [address]: ['4@DFI'] }, options)
    await container.generate(1)

    const account = await client.account.getAccount(address)
    const balanceDeducted = await client.account.getAccount(addA)

    expect(balanceDeducted[0]).toStrictEqual('194.00000000@DFI')
    expect(account).toStrictEqual(['4.00000000@DFI'])
    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with Forward selection mode', async () => {
    const options: SendTokensOptions = {
      selectionMode: SelectionModeType.FORWARD
    }
    const address = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [address]: ['2@DFI'] }, options)
    await container.generate(1)

    const account = await client.account.getAccount(address)

    expect(account).toStrictEqual(['2.00000000@DFI'])
    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with Crumbs selection mode', async () => {
    const options: SendTokensOptions = {
      selectionMode: SelectionModeType.CRUMBS
    }
    const address = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [address]: ['2@DFI'] }, options)
    await container.generate(1)

    const account = await client.account.getAccount(address)

    expect(account).toStrictEqual(['2.00000000@DFI'])
    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with multiple destination address tokens', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [address]: ['2@ETH', '0.1@DBTC', '10@DFI'] })
    await container.generate(1)
    const account = await client.account.getAccount(address)

    expect(account).toStrictEqual(['10.00000000@DFI', '0.10000000@DBTC', '2.00000000@ETH'])
    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with source address provided', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({ [addA]: ['10@ETH'] }, { [address]: ['10@ETH'] })
    await container.generate(1)

    const account = await client.account.getAccount(address)

    expect(account).toStrictEqual(['10.00000000@ETH'])
    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with multiple source address tokens provided', async () => {
    const address = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({ [addA]: ['2@DBTC', '10@ETH'] }, { [address]: ['2@DBTC', '10@ETH'] })
    await container.generate(1)

    const account = await client.account.getAccount(address)

    expect(account).toStrictEqual(['2.00000000@DBTC', '10.00000000@ETH'])
    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should fail and throw an exception if destination address param is empty', async () => {
    await expect(client.account.sendTokensToAddress({}, {})).rejects.toThrow('zero amounts in "to" param')
  })

  it('should throw an error with insufficient fund', async () => {
    const promise = client.account.sendTokensToAddress({ [addA]: ['500@DBTC'] }, { [await client.wallet.getNewAddress()]: ['500@DBTC'] })

    await expect(promise).rejects.toThrow('amount 197.90000000 is less than 500.00000000')
  })
})

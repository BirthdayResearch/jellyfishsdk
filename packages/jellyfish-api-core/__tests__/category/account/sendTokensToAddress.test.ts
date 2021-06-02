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

  it('should create a transaction with auto select (empty source address)', async () => {
    const to = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [to]: ['2@DFI'] })

    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with Pie selection Mode', async () => {
    const to = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [to]: ['2@DFI'] }, SelectionModeType.PIE)

    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with Forward selection mode', async () => {
    const to = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [to]: ['2@DFI'] }, SelectionModeType.FORWARD)

    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with Crumbs selection mode', async () => {
    const to = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [to]: ['2@DFI'] }, SelectionModeType.CRUMBS)

    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with multiple destination address tokens', async () => {
    const to = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [to]: ['2@ETH', '0.1@DBTC', '10@DFI'] })

    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with source address provided', async () => {
    const to = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({ [from]: ['10@ETH'] }, { [to]: ['10@ETH'] })

    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with multiple source address tokens provided', async () => {
    const to = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({ [from]: ['2@DBTC', '10@ETH'] }, { [to]: ['2@DBTC', '10@ETH'] })

    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should fail and throw an exception if destination address param is empty', async () => {
    const promise = client.account.sendTokensToAddress({}, {})

    await expect(promise).rejects.toThrow('zero amounts in "to" param')
  })
})

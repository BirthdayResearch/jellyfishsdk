import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { SelectionModeType } from '../../../src/category/account'

describe('SendTokenToAdress', () => {
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

  async function setup (): Promise<void> {
    await createToken(await container.call('getnewaddress'), 'DETH', 200)
    await createToken(await container.call('getnewaddress'), 'DBTC', 200)
    await createToken(await container.call('getnewaddress'), 'ETH', 200)
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

  it('should create a transaction with autoselect', async () => {
    const to = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [to]: '2@DFI' })

    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with Pie selection Mode', async () => {
    const to = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [to]: '2@DFI' }, SelectionModeType.PIE)

    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with Forward selection mode', async () => {
    const to = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [to]: '2@DFI' }, SelectionModeType.FORWARD)

    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with Crumbs selections mode', async () => {
    const to = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [to]: '2@DFI' }, SelectionModeType.CRUMBS)

    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with multiple destination address tokens', async () => {
    const to = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({}, { [to]: ['2@ETH', '0.1@DBTC', '100@DETH'] })

    expect(typeof transactionHex).toStrictEqual('string')
  })

  it('should create a transaction with multiple source address tokens', async () => {
    const to = await client.wallet.getNewAddress()
    const from = await client.wallet.getNewAddress()
    const transactionHex = await client.account.sendTokensToAddress({ [from]: '2@DFI' }, { [to]: '10@DBTC' })

    expect(typeof transactionHex).toStrictEqual('string')
  })
})

import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RawTransaction } from '@defichain/jellyfish-api-core/src/category/rawtx'
import { AccountToUtxosParser } from '../../../../src/controller/AddressParser/dftx/accountToUtxos'
import { AddressParserTest } from '../../../../test/AddressParserTest'
import { UtxoAddressParser } from '../../../../src/controller/AddressParser/utxo'

describe('AccountToUtxosParser', () => {
  const container = new MasterNodeRegTestContainer()
  let apiClient!: JsonRpcClient

  let sender!: string
  let rec1!: string
  let rec2!: string
  let rec3!: string
  let rawTx!: RawTransaction

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    apiClient = new JsonRpcClient(await container.getCachedRpcUrl())

    sender = await container.getNewAddress()
    rec1 = await container.getNewAddress()
    rec2 = await container.getNewAddress()
    rec3 = await container.getNewAddress()

    // fund send address
    await apiClient.wallet.sendMany({ [sender]: 1 })
    await apiClient.account.utxosToAccount({ [sender]: '6@DFI' })
    await container.generate(1)

    const txn = await apiClient.account.accountToUtxos(sender, {
      [rec1]: '1@DFI',
      [rec2]: '2@DFI',
      [rec3]: '3@DFI'
    })

    // test subject
    rawTx = await apiClient.rawtx.getRawTransaction(txn, true)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should extract addresses sending utxo in a transaction', async () => {
    const parser = AddressParserTest(apiClient, [new AccountToUtxosParser('regtest')])
    const addresses = await parser.parse(rawTx)

    expect(addresses.length).toStrictEqual(1)
    expect(addresses).toContain(sender)
  })

  it('should extract addresses receiving utxo in a transaction', async () => {
    const parser = AddressParserTest(apiClient, [], new UtxoAddressParser(apiClient))
    const addresses = await parser.parse(rawTx)

    expect(addresses.length).toBeGreaterThanOrEqual(3)
    expect(addresses).toContain(rec1)
    expect(addresses).toContain(rec2)
    expect(addresses).toContain(rec3)
  })
})

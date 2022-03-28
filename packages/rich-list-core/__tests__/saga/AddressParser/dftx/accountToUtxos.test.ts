import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RawTransaction } from '@defichain/jellyfish-api-core/src/category/rawtx'
import { AddressParser } from '../../../../src/saga/AddressParser'
import { Testing } from '@defichain/jellyfish-testing'

describe('AccountToUtxosParser', () => {
  const container = new MasterNodeRegTestContainer()
  let apiClient!: JsonRpcClient

  const testing = Testing.create(container)
  let rawTx!: RawTransaction

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    apiClient = new JsonRpcClient(await container.getCachedRpcUrl())

    const sender = await testing.address('sender')
    const rec1 = await testing.address('rec1')
    const rec2 = await testing.address('rec2')
    const rec3 = await testing.address('rec3')

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

  it('Should extract all addresses spent and receive utxo in a transaction', async () => {
    const parser = new AddressParser(apiClient, 'regtest')
    const addresses = await parser.parse(rawTx)

    expect(addresses.length).toBeGreaterThanOrEqual(4)
    expect(addresses).toContain(await testing.address('sender'))
    expect(addresses).toContain(await testing.address('rec1'))
    expect(addresses).toContain(await testing.address('rec2'))
    expect(addresses).toContain(await testing.address('rec3'))
  })
})

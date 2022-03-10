import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RawTransaction } from '@defichain/jellyfish-api-core/src/category/rawtx'
import { AccountToAccountParser } from '../../../../src/controller/AddressParser/dftx/accountToAccount'
import { AddressParserTest } from '../../../../test/AddressParserTest'

describe('AccountToAccountParser', () => {
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

    // Address is funded at this point.
    // convert 5 DFI UTXO -> DFI Token
    await apiClient.account.utxosToAccount({ [sender]: '5@DFI' })
    await container.generate(1)

    // Mint wrapped tokens
    await apiClient.token.createToken({
      symbol: 'DBTC',
      name: 'DBTC',
      mintable: true,
      isDAT: true,
      tradeable: true,
      collateralAddress: sender
    })
    await container.generate(1)
    await apiClient.token.mintTokens('5@DBTC')
    await container.generate(1)

    await apiClient.token.createToken({
      symbol: 'DETH',
      name: 'DETH',
      mintable: true,
      isDAT: true,
      tradeable: true,
      collateralAddress: sender
    })
    await container.generate(1)
    await apiClient.token.mintTokens('5@DETH')
    await container.generate(1)
    const txn = await apiClient.account.accountToAccount(sender, {
      [rec1]: '5@DFI',
      [rec2]: '5@DBTC',
      [rec3]: '5@DETH'
    })

    // test subject
    rawTx = await apiClient.rawtx.getRawTransaction(txn, true)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should extract all addresses involved in accountToAccount tx', async () => {
    const parser = AddressParserTest(apiClient, [new AccountToAccountParser('regtest')])
    const addresses = await parser.parse(rawTx)

    expect(addresses.length).toStrictEqual(4)
    expect(addresses).toContain(sender)
    expect(addresses).toContain(rec1)
    expect(addresses).toContain(rec2)
    expect(addresses).toContain(rec3)
  })
})

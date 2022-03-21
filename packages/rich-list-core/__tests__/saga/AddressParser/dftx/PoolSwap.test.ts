import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { poolpair } from '@defichain/jellyfish-api-core'
import { RawTransaction } from '@defichain/jellyfish-api-core/src/category/rawtx'
import { PoolSwapParser } from '../../../../src/saga/AddressParser/dftx/PoolSwap'
import { AddressParserTest } from '../../../../test/AddressParserTest'

describe('PoolSwapParser', () => {
  const container = new MasterNodeRegTestContainer()
  let apiClient!: JsonRpcClient

  let sender!: string
  let receiver!: string
  let rawTx!: RawTransaction

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    apiClient = new JsonRpcClient(await container.getCachedRpcUrl())
    sender = await container.getNewAddress()
    receiver = await container.getNewAddress()
    const shareAddress = await container.getNewAddress()

    // Address is funded at this point.
    // convert 100 DFI UTXO -> DFI Token
    await apiClient.account.utxosToAccount({ [sender]: '200@DFI' })
    await container.generate(1)

    // Mint wrapped tokens
    await apiClient.token.createToken({
      symbol: 'DDAI',
      name: 'DDAI',
      mintable: true,
      isDAT: true,
      tradeable: true,
      collateralAddress: sender
    })
    await container.generate(1)
    await apiClient.token.mintTokens('400@DDAI')
    await container.generate(1)

    // create poolpair and add liquidity
    const poolAddress = await container.getNewAddress()
    await apiClient.poolpair.createPoolPair({
      tokenA: 'DFI',
      tokenB: 'DDAI',
      commission: 0,
      status: true,
      ownerAddress: poolAddress
    })
    await container.generate(1)

    await apiClient.poolpair.addPoolLiquidity({
      [sender]: ['100@DFI', '200@DDAI']
    }, shareAddress)
    await container.generate(1)

    const metadata: poolpair.PoolSwapMetadata = {
      from: sender,
      tokenFrom: 'DFI',
      amountFrom: 50,
      to: receiver,
      tokenTo: 'DDAI'
    }
    const txn = await apiClient.poolpair.poolSwap(metadata)

    // test subject
    rawTx = await apiClient.rawtx.getRawTransaction(txn, true)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should extract all addresses involved in poolswap tx', async () => {
    const parser = AddressParserTest(apiClient, [new PoolSwapParser('regtest')])
    const addresses = await parser.parse(rawTx)

    expect(addresses.length).toStrictEqual(2)
    expect(addresses).toContain(sender)
    expect(addresses).toContain(receiver)
  })
})

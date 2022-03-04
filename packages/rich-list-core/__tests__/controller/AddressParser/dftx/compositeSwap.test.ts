import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { poolpair } from '@defichain/jellyfish-api-core'
import { RawTransaction } from '@defichain/jellyfish-api-core/src/category/rawtx'
import { AddressParser } from '../../../../src/controller/AddressParser'

describe('CompositeSwapParser', () => {
  const container = new MasterNodeRegTestContainer()
  let apiClient!: JsonRpcClient

  let sender!: string
  let receiver!: string
  let rawTx!: RawTransaction

  async function createAndMintToken (
    client: JsonRpcClient,
    name: string,
    amount: number
  ): Promise<void> {
    await client.token.createToken({
      symbol: name,
      name,
      mintable: true,
      isDAT: true,
      tradeable: true,
      collateralAddress: sender
    })
    await container.generate(1)
    await client.token.mintTokens(`${amount}@${name}`)
    await container.generate(1)
  }

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    apiClient = new JsonRpcClient(await container.getCachedRpcUrl())
    sender = await container.getNewAddress()
    receiver = await container.getNewAddress()
    const shareAddress = await container.getNewAddress()

    // Address is funded at this point.
    // convert 100 DFI UTXO -> DFI Token
    await apiClient.account.utxosToAccount({ [sender]: '1000@DFI' })
    await container.generate(1)

    // Mint wrapped tokens
    await createAndMintToken(apiClient, 'DDAI', 1000)
    await createAndMintToken(apiClient, 'DBYE', 1000)

    // create poolpairs and add liquidity
    const poolAddress1 = await container.getNewAddress()
    await apiClient.poolpair.createPoolPair({
      tokenA: 'DDAI',
      tokenB: 'DFI',
      commission: 0,
      status: true,
      ownerAddress: poolAddress1
    })
    await container.generate(1)
    await apiClient.poolpair.addPoolLiquidity({
      [sender]: ['100@DFI', '200@DDAI']
    }, shareAddress)
    await container.generate(1)

    const poolAddress2 = await container.getNewAddress()
    await apiClient.poolpair.createPoolPair({
      tokenA: 'DBYE',
      tokenB: 'DFI',
      commission: 0,
      status: true,
      ownerAddress: poolAddress2
    })
    await container.generate(1)
    await apiClient.poolpair.addPoolLiquidity({
      [sender]: ['100@DFI', '50@DBYE']
    }, shareAddress)
    await container.generate(1)

    const metadata: poolpair.PoolSwapMetadata = {
      from: sender,
      tokenFrom: 'DDAI',
      amountFrom: 200,
      to: receiver,
      tokenTo: 'DBYE'
    }
    const txn = await apiClient.poolpair.compositeSwap(metadata)
    await container.generate(1)

    // test subject
    rawTx = await apiClient.rawtx.getRawTransaction(txn, true)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should extract all addresses involved in compositeSwap tx', async () => {
    const parser = new AddressParser(apiClient, 'regtest')
    const addresses = await parser.parse(rawTx)

    expect(addresses.length).toBeGreaterThanOrEqual(2)
    expect(addresses).toContain(sender)
    expect(addresses).toContain(receiver)
  })
})

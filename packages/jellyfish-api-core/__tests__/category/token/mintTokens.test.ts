import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { UTXO } from '../../../src/category/token'
import { RpcApiError } from '../../../src'

describe('Token', () => {
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
    from = await container.getNewAddress()

    await createToken(from, 'DBTC')
    await container.generate(1)

    await createToken(from, 'DETH')
    await container.generate(1)
  }

  async function createToken (address: string, symbol: string): Promise<void> {
    const defaultMetadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await client.token.createToken({ ...defaultMetadata })
  }

  it('should mintTokens', async () => {
    let tokenBalances = await client.account.getTokenBalances()

    expect(tokenBalances.length).toStrictEqual(0)

    const data = await client.token.mintTokens('5@DBTC')

    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)

    await container.generate(1)

    tokenBalances = await client.account.getTokenBalances()

    expect(tokenBalances.length).toStrictEqual(1)
    expect(tokenBalances[0]).toStrictEqual('5.00000000@1')
  })

  it('should not mintTokens for non-existence coin', async () => {
    const promise = client.token.mintTokens('5@ETH')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid Defi token: ETH\', code: 0, method: minttokens')
  })

  it('should mintTokens with utxos', async () => {
    let tokenBalances = await client.account.getTokenBalances()

    expect(tokenBalances.length).toStrictEqual(1)

    const { txid } = await container.fundAddress(from, 10)

    const utxos = await container.call('listunspent')
    const inputs: UTXO[] = utxos.filter((utxo: UTXO) => utxo.txid === txid).map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const data = await client.token.mintTokens('5@DETH', inputs)

    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)

    await container.generate(1)

    tokenBalances = await client.account.getTokenBalances()

    expect(tokenBalances.length).toStrictEqual(2)
    expect(tokenBalances[1]).toStrictEqual('5.00000000@2')
  })
})

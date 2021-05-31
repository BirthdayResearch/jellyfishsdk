import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { UTXO } from '../../../src/category/token'

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

    await createToken('DBTC')
    await createToken('DETH')

    await container.generate(1)
  }

  async function createToken (symbol: string): Promise<void> {
    const defaultMetadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: from
    }
    await client.token.createToken({ ...defaultMetadata })
  }

  it('should mintTokens', async () => {
    const data = await client.token.mintTokens('5@DBTC')

    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)

    await container.generate(1)

    const tokenBalances = await client.account.getTokenBalances()
    expect(tokenBalances[0]).toStrictEqual('5.00000000@1')
  })

  it('should mintTokens with utxos', async () => {
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

    const tokenBalances = await client.account.getTokenBalances()
    expect(tokenBalances[1]).toStrictEqual('5.00000000@2')
  })
})

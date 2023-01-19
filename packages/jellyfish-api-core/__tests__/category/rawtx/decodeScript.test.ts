import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Decodescript', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  async function createToken (symbol: string): Promise<string> {
    const newAddress = await container.call('getnewaddress')
    const createTokenMetadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: newAddress
    }
    const txid = await container.call('createtoken', [createTokenMetadata])
    await container.generate(1)
    return txid
  }

  it('should decode non-standard script', async () => {
    const txid = await createToken('BOB')
    const count = await container.call('getblockcount')
    const hash = await container.call('getblockhash', [count])
    const hex: string = await client.rawtx.getRawTransaction(txid, false, hash)
    const decode = await client.rawtx.decodeScript(hex)
    console.log(decode)
  })
})

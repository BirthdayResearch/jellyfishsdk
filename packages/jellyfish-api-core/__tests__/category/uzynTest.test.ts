import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'

describe('Test', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

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

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }

  async function accountToAccount (symbol: string, amount: number, from: string, _to = ''): Promise<string> {
    const to = _to !== '' ? _to : await container.call('getnewaddress')
    await container.call('accounttoaccount', [from, { [to]: `${amount.toString()}@${symbol}` }])
    await container.generate(1)
    return to
  }

  it('should test', async () => {
    const from = await container.call('getnewaddress')
    await createToken(from, 'DBTC', 100) // create and mint 100 tokens. Mine blocks after every call
    await accountToAccount('DBTC', 100, from) // send the 100 token via accounttoaccount to another address and mine a block
    await client.wallet.sendToAddress(from, 10) // send DFI (UTXO via sendtoaddress)
    await container.generate(1) // mine a block
  })
})

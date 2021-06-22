
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BalanceTransferPayload } from '../../../src/category/account'

describe('listAccountHistory', () => {
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
    from = await container.call('getnewaddress')
    await createToken(from, 'DBTC', 200)
    await createToken(from, 'DETH', 200)
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

  it('should contain accountToAccount histories', async () => {
    const payload: BalanceTransferPayload = {}
    payload[await container.getNewAddress()] = '7@DFI'
    payload[await container.getNewAddress()] = '8@DBTC'
    payload[await container.getNewAddress()] = '9@DETH'

    await client.account.accountToAccount(from, payload)
    await container.generate(1)

    const history = await client.account.listAccountHistory()

    expect(history.find((h) => h.type === 'AccountToAccount' && h.amounts[0] === '7.00000000@DFI')).toBeTruthy()
    expect(history.find((h) => h.type === 'AccountToAccount' && h.amounts[0] === '8.00000000@DBTC')).toBeTruthy()
    expect(history.find((h) => h.type === 'AccountToAccount' && h.amounts[0] === '9.00000000@DETH')).toBeTruthy()
  })
})

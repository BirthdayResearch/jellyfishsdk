import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'
import { BalanceTransferPayload, UTXO } from '../../../src/category/account'

describe('masternode', () => {
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

    const to = await accountToAccount('DBTC', 5, from)
    await accountToAccount('DBTC', 18, from, to)

    await createToken(from, 'DETH', 200)
    await accountToAccount('DETH', 46, from)
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

  async function accountToAccount (symbol: string, amount: number, from: string, _to = ''): Promise<string> {
    const to = _to !== '' ? _to : await container.call('getnewaddress')

    await container.call('accounttoaccount', [from, { [to]: `${amount.toString()}@${symbol}` }])
    await container.generate(1)

    return to
  }

  describe('accountToAccount', () => {
    it('should accountToAccount', async () => {
      const payload: BalanceTransferPayload = {}
      payload[await container.getNewAddress()] = '5@DFI'
      payload[await container.getNewAddress()] = '5@DBTC'
      payload[await container.getNewAddress()] = '5@DETH'

      const data = await client.account.accountToAccount(from, payload)

      expect(typeof data).toStrictEqual('string')
      expect(data.length).toStrictEqual(64)
    })

    it('should not accountToAccount for DFI coin if does not own the recipient address', async () => {
      const promise = client.account.accountToAccount(from, { '2Mywjs9zEU4NtLknXQJZgozaxMvPn2Bb3qz': '5@DFI' })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('The address (2Mywjs9zEU4NtLknXQJZgozaxMvPn2Bb3qz) is not your own address')
    })

    it('should accountToAccount with utxos', async () => {
      const { txid } = await container.fundAddress(from, 10)

      const payload: BalanceTransferPayload = {}
      payload[await container.getNewAddress()] = '5@DFI'
      payload[await container.getNewAddress()] = '5@DBTC'
      payload[await container.getNewAddress()] = '5@DETH'

      const utxos = await container.call('listunspent')
      const inputs: UTXO[] = utxos.filter((utxo: UTXO) => utxo.txid === txid).map((utxo: UTXO) => {
        return {
          txid: utxo.txid,
          vout: utxo.vout
        }
      })

      const data = await client.account.accountToAccount(from, payload, { utxos: inputs })

      expect(typeof data).toStrictEqual('string')
      expect(data.length).toStrictEqual(64)
    })
  })
})

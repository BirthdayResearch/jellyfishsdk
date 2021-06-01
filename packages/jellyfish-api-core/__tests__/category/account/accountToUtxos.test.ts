import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BalanceTransferPayload, UTXO } from '../../../src/category/account'
import { RpcApiError } from '../../../src'

describe('Account with DBTC', () => {
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
    await createToken(from, 'DBTC')
  }

  async function createToken (address: string, symbol: string): Promise<void> {
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
  }

  it('should accountToUtxos', async () => {
    const balanceBefore = await container.call('getbalance')

    const payload: BalanceTransferPayload = {}
    // NOTE(jingyi2811): Only support sending from account to DFI Utxos.
    payload[await container.getNewAddress()] = '5@DFI'
    payload[await container.getNewAddress()] = '5@DFI'

    const data = await client.account.accountToUtxos(from, payload)

    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)

    const balanceAfter = await container.call('getbalance')
    expect(balanceAfter).toBeGreaterThan(balanceBefore)
  })

  it('should not accountToUtxos for token', async () => {
    const payload: BalanceTransferPayload = {}
    payload[await container.getNewAddress()] = '5@DBTC'

    const promise = client.account.accountToUtxos(from, payload)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test AccountToUtxosTx execution failed:only available for DFI transactions\', code: -32600, method: accounttoutxos')
  })

  it('should accountToUtxos with utxos', async () => {
    const balanceBefore = await container.call('getbalance')

    const { txid } = await container.fundAddress(from, 10)

    const payload: BalanceTransferPayload = {}
    // NOTE(jingyi2811): Only support sending from account to DFI Utxos.
    payload[await container.getNewAddress()] = '5@DFI'
    payload[await container.getNewAddress()] = '5@DFI'

    const utxos = await container.call('listunspent')
    const inputs: UTXO[] = utxos.filter((utxo: UTXO) => utxo.txid === txid).map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const data = await client.account.accountToUtxos(from, payload, { utxos: inputs })

    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)

    const balanceAfter = await container.call('getbalance')
    expect(balanceAfter).toBeGreaterThan(balanceBefore)
  })
})

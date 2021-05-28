import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BalanceTransferPayload } from '../../../src/category/account'

describe('Account', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should utxosToAccount', async () => {
    const payload: BalanceTransferPayload = {}
    // NOTE(jingyi2811): Only support sending utxos to DFI account.
    payload[await container.getNewAddress()] = '5@DFI'
    payload[await container.getNewAddress()] = '5@DFI'

    const data = await client.account.utxosToAccount(payload)

    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)
  })

  it('should utxosToAccount with utxos', async () => {
    const payload: BalanceTransferPayload = {}
    // NOTE(jingyi2811): Only support sending utxos to DFI account.
    payload[await container.getNewAddress()] = '5@DFI'
    payload[await container.getNewAddress()] = '5@DFI'

    const utxos = await container.call('listunspent')
    const inputs = utxos.map((utxo: { txid: string, vout: number }) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const data = await client.account.utxosToAccount(payload, inputs)

    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)
  })
})

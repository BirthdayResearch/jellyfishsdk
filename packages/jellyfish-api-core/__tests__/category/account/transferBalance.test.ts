import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BalanceTransferPayload, TransferBalanceType } from '../../../src/category/account'

describe('TransferBalance', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should Transfer Balance from DFC to EVM', async () => {
    const dfiAddress = await container.call('getnewaddress')

    const from: BalanceTransferPayload = {
      [dfiAddress]: '5@DFI'
    }
    const ethAddress = await container.getNewAddress('', 'eth')
    const to: BalanceTransferPayload = {
      [ethAddress]: '5@DFI'
    }
    const data = await client.account.transferBalance(TransferBalanceType.EvmIn, from, to)
    // const balance = await client.account.getAccount(ethAddress)
    // expect(balance).toStrictEqual([`${balance.toFixed(8)}@DFI`])
    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)
  })

  it('should Transfer Balance from EVM to DFC', async () => {
    const ethAddress = await container.getNewAddress('', 'eth')
    const from: BalanceTransferPayload = {
      [ethAddress]: '5@DFI'
    }

    const dfiAddress = await container.call('getnewaddress')
    const to: BalanceTransferPayload = {
      [dfiAddress]: '5@DFI'
    }
    const data = await client.account.transferBalance(TransferBalanceType.EvmIn, from, to)

    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)
  })

  // it('should not accountToAccount for DFI coin if does not own the recipient address', async () => {
  //   const promise = client.account.accountToAccount(from, { '2Mywjs9zEU4NtLknXQJZgozaxMvPn2Bb3qz': '5@DFI' })

  //   await expect(promise).rejects.toThrow(RpcApiError)
  //   await expect(promise).rejects.toThrow('The address (2Mywjs9zEU4NtLknXQJZgozaxMvPn2Bb3qz) is not your own address')
  // })

  // it('should accountToAccount with utxos', async () => {
  //   const { txid } = await container.fundAddress(from, 10)

  //   const payload: BalanceTransferPayload = {}
  //   payload[await container.getNewAddress()] = '5@DFI'
  //   payload[await container.getNewAddress()] = '5@DBTC'
  //   payload[await container.getNewAddress()] = '5@DETH'

  //   const utxos = await container.call('listunspent')
  //   const inputs: UTXO[] = utxos.filter((utxo: UTXO) => utxo.txid === txid).map((utxo: UTXO) => {
  //     return {
  //       txid: utxo.txid,
  //       vout: utxo.vout
  //     }
  //   })

  //   const data = await client.account.accountToAccount(from, payload, { utxos: inputs })

  //   expect(typeof data).toStrictEqual('string')
  //   expect(data.length).toStrictEqual(64)
  // })
})

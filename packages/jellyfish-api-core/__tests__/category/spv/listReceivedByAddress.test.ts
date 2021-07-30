import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

describe('Spv', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should listReceivedByAddress', async () => {
    const address = await container.call('spv_getnewaddress')
    const txid = await container.call('spv_fundaddress', [address])

    const listReceivedByAddress = await client.spv.listReceivedByAddress()
    expect(listReceivedByAddress.length).toStrictEqual(1)
    expect(listReceivedByAddress[0].address).toStrictEqual(address)
    expect(listReceivedByAddress[0].type).toStrictEqual('Bech32')
    expect(listReceivedByAddress[0].amount instanceof BigNumber).toStrictEqual(true)
    expect(listReceivedByAddress[0].amount).toStrictEqual(new BigNumber(1))
    expect(listReceivedByAddress[0].confirmations).toStrictEqual(1)
    expect(listReceivedByAddress[0].txids[0]).toStrictEqual(txid)
  })

  it('should listReceivedByAddress with minConfirmation 3', async () => {
    const minConfirmation = 3

    await container.call('spv_fundaddress', [await container.call('spv_getnewaddress')])
    await container.call('spv_setlastheight', [minConfirmation]) // Set last processed block height to 3

    const listReceivedByAddress = await client.spv.listReceivedByAddress(minConfirmation)
    expect(listReceivedByAddress.every(({ confirmations }) => confirmations >= minConfirmation)).toStrictEqual(true)
  })

  it('should listReceivedByAddress with filter by address', async () => {
    const address = await container.call('spv_getnewaddress')
    const txid = await container.call('spv_fundaddress', [address])

    const listReceivedByAddress = await client.spv.listReceivedByAddress(1, address)
    expect(listReceivedByAddress.length).toStrictEqual(1)
    expect(listReceivedByAddress[0].address).toStrictEqual(address)
    expect(listReceivedByAddress[0].txids[0]).toStrictEqual(txid)
  })

  it('should not listReceivedByAddress for invalid address', async () => {
    const promise = client.spv.listReceivedByAddress(1, 'XXXX')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Invalid address', code: -5, method: spv_listreceivedbyaddress")
  })
})

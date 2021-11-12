import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { BigNumber, RpcApiError } from '@defichain/jellyfish-api-core'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Spv', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.spv.fundAddress(await container.call('spv_getnewaddress')) // Funds 1 BTC
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should refundHtlc', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const htlc = await container.call('spv_createhtlc', [pubKeyA, pubKeyB, '10'])

    await container.call('spv_sendtoaddress', [htlc.address, 0.1]) // Funds HTLC address
    await container.spv.increaseSpvHeight(10)

    const destinationAddress = await container.call('spv_getnewaddress')
    const result = await client.spv.refundHtlc(htlc.address, destinationAddress) // This refund should only happen after timeout threshold set in createHtlc. See https://en.bitcoin.it/wiki/BIP_0199
    expect(typeof result.txid).toStrictEqual('string')
    expect(result.txid.length).toStrictEqual(64)
    expect(result.sendmessage).toStrictEqual('') // not empty when error found

    /**
     * Assert that the destination address received the refund
     */
    const listReceivingAddresses = await container.call('spv_listreceivedbyaddress')
    const receivingAddress = listReceivingAddresses.find(({ address }: { address: string }) => address === destinationAddress)
    expect(receivingAddress.address).toStrictEqual(destinationAddress)
    expect(receivingAddress.txids.some((txid: string) => txid === result.txid)).toStrictEqual(true)
  })

  it('should refundHtlc with custom feeRate', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const htlc = await container.call('spv_createhtlc', [pubKeyA, pubKeyB, '10'])

    await container.call('spv_sendtoaddress', [htlc.address, 0.1]) // Funds HTLC address
    await container.spv.increaseSpvHeight()

    const destinationAddress = await container.call('spv_getnewaddress')
    const result = await client.spv.refundHtlc(htlc.address, destinationAddress, { feeRate: new BigNumber('20000') }) // This refund should only happen after timeout threshold set in createHtlc. See https://en.bitcoin.it/wiki/BIP_0199
    expect(typeof result.txid).toStrictEqual('string')
    expect(result.txid.length).toStrictEqual(64)
    expect(result.sendmessage).toStrictEqual('') // not empty when error found

    /**
     * Assert that the destination address received the refund
     */
    const listReceivingAddresses = await container.call('spv_listreceivedbyaddress')
    const receivingAddress = listReceivingAddresses.find(({ address }: { address: string }) => address === destinationAddress)
    expect(receivingAddress.address).toStrictEqual(destinationAddress)
    expect(receivingAddress.txids.some((txid: string) => txid === result.txid)).toStrictEqual(true)
  })

  it('should not refundHtlc when no unspent HTLC outputs found', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const htlc = await container.call('spv_createhtlc', [pubKeyA, pubKeyB, '10'])

    const promise = client.spv.refundHtlc(htlc.address, await container.call('spv_getnewaddress'))
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('No unspent HTLC outputs found')
  })

  it('should not refundHtlc with invalid HTLC address', async () => {
    const promise = client.spv.refundHtlc('XXXX', await container.call('spv_getnewaddress'))
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid address')
  })

  it('should not refundHtlc with invalid destination address', async () => {
    const promise = client.spv.refundHtlc(await container.call('spv_getnewaddress'), 'XXXX')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Failed to decode address')
  })

  it('should not refundHtlc with not enough funds to cover fee', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const htlc = await container.call('spv_createhtlc', [pubKeyA, pubKeyB, '10'])

    await container.call('spv_sendtoaddress', [htlc.address, 0.00000546]) // Funds HTLC address with dust

    const promise = client.spv.refundHtlc(htlc.address, await container.call('spv_getnewaddress'))
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('No unspent HTLC outputs found')
  })

  it('should not refundHtlc when redeem script not found in wallet', async () => {
    const randomAddress = '2Mu4edSkC5gKVwYayfDq2fTFwT6YD4mujSX'
    const promise = client.spv.refundHtlc(randomAddress, await container.call('spv_getnewaddress'))
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Redeem script not found in wallet')
  })
})

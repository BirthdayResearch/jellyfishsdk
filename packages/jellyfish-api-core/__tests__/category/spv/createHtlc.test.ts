import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { HTLC_MINIMUM_BLOCK_COUNT } from '../../../src/category/spv'

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

  it('should createHtlc', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const timeout = 10

    const htlc = await client.spv.createHtlc(pubKeyA, pubKeyB, { timeout: `${timeout}` })
    expect(typeof htlc.address).toStrictEqual('string')
    expect(htlc.address.length).toStrictEqual(35)
    expect(typeof htlc.redeemScript).toStrictEqual('string')
    expect(typeof htlc.seed).toStrictEqual('string')
    expect(htlc.seed.length).toStrictEqual(64)
    expect(typeof htlc.seedhash).toStrictEqual('string')
    expect(htlc.seedhash.length).toStrictEqual(64)

    const decodedScript = await container.call('spv_decodehtlcscript', [htlc.redeemScript])
    expect(decodedScript.sellerkey).toStrictEqual(pubKeyA)
    expect(decodedScript.buyerkey).toStrictEqual(pubKeyB)
    expect(decodedScript.blocks).toStrictEqual(timeout)
    expect(decodedScript.hash).toStrictEqual(htlc.seedhash)
  })

  it('should not createHtlc with invalid public key as receiverPubKey', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])

    const promise = client.spv.createHtlc('XXXX', pubKeyA, { timeout: '10' })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Invalid public key: XXXX', code: -5, method: spv_createhtlc")
  })

  it('should not createHtlc with with invalid public key as ownerPubKey', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])

    const promise = client.spv.createHtlc(pubKeyA, 'XXXX', { timeout: '10' })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Invalid public key: XXXX', code: -5, method: spv_createhtlc")
  })

  it('should not createHtlc with timeout < HTLC_MINIMUM_BLOCK_COUNT', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])

    const promise = client.spv.createHtlc(pubKeyA, pubKeyB, { timeout: `${HTLC_MINIMUM_BLOCK_COUNT - 1}` })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Timeout below minimum of 9', code: -3, method: spv_createhtlc")
  })

  it('should not createHtlc with denominated relative timeout', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])

    const promise = client.spv.createHtlc(pubKeyA, pubKeyB, { timeout: '4194304' })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Invalid block denominated relative timeout', code: -3, method: spv_createhtlc")
  })

  it('should not createHtlc with seed length != 32', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])

    const promise = client.spv.createHtlc(pubKeyA, pubKeyB, { timeout: '10', seed: '00' })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Invalid hash image length, 32 (SHA256) accepted', code: -3, method: spv_createhtlc")
  })

  it('should not createHtlc with invalid seed', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])

    const promise = client.spv.createHtlc(pubKeyA, pubKeyB, { timeout: '8', seed: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' }) // 32 char seed with non-hex char
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Invalid hash image', code: -3, method: spv_createhtlc")
  })
})

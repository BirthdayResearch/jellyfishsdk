import { GenesisKeys, MasterNodeRegTestContainer, MasternodeGroup } from '@defichain/testcontainers'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Spv', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()

    await container.call('spv_fundaddress', [await container.call('spv_getnewaddress')]) // Funds 1 BTC
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getHtlcSeed', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const htlc = await container.call('spv_createhtlc', [pubKeyA, pubKeyB, '10'])

    await container.call('spv_sendtoaddress', [htlc.address, 0.1]) // Funds HTLC address
    await container.call('spv_claimhtlc', [htlc.address, await container.call('spv_getnewaddress'), htlc.seed]) // claim HTLC

    const secret = await client.spv.getHtlcSeed(htlc.address)
    expect(secret).toStrictEqual(htlc.seed)
  })

  it('should getHtlcSeed with empty secret before spv_claimhtlc', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const htlc = await container.call('spv_createhtlc', [pubKeyA, pubKeyB, '10'])

    const secret = await client.spv.getHtlcSeed(htlc.address)
    expect(secret).toStrictEqual('')
  })

  it('should not getHtlcSeed with invalid public key as receiverPubKey', async () => {
    const promise = client.spv.getHtlcSeed('XXXX')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Error: Invalid address', code: -5, method: spv_gethtlcseed")
  })
})

describe('Spv with MasternodeGroup', () => {
  const group = new MasternodeGroup([
    new MasterNodeRegTestContainer(GenesisKeys[0]),
    new MasterNodeRegTestContainer(GenesisKeys[1])
  ])
  const client0 = new ContainerAdapterClient(group.get(0))
  const client1 = new ContainerAdapterClient(group.get(1))

  beforeAll(async () => {
    await group.start()
    await group.get(0).call('spv_fundaddress', [await group.get(0).call('spv_getnewaddress')]) // Funds 1 BTC
  })

  afterAll(async () => {
    await group.stop()
  })

  it('should not get HTLC secret from another node', async () => {
    const pubKeyA = await group.get(0).call('spv_getaddresspubkey', [await group.get(0).call('spv_getnewaddress')])
    const pubKeyB = await group.get(0).call('spv_getaddresspubkey', [await group.get(0).call('spv_getnewaddress')])
    const htlc = await group.get(0).call('spv_createhtlc', [pubKeyA, pubKeyB, '10'])

    await group.get(0).call('spv_sendtoaddress', [htlc.address, 0.1]) // Funds HTLC address
    await group.waitForSync()
    await group.get(0).call('spv_claimhtlc', [htlc.address, await group.get(0).call('spv_getnewaddress'), htlc.seed]) // claim HTLC

    const emptySecret = await client1.spv.getHtlcSeed(htlc.address)
    expect(emptySecret).toStrictEqual('')

    const secret = await client0.spv.getHtlcSeed(htlc.address)
    expect(secret).toStrictEqual(htlc.seed)
  })
})

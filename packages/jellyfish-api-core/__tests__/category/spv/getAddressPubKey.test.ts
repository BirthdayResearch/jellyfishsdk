import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { ContainerAdapterClient } from '../../container_adapter_client'

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

  it('should getAddressPubKey', async () => {
    const address = await container.call('spv_getnewaddress')
    const pubKey = await client.spv.getAddressPubKey(address)
    expect(typeof pubKey).toStrictEqual('string')
    expect(pubKey.length).toStrictEqual(66)
  })

  it('should not getAddressPubKey for invalid address', async () => {
    const address = 'XXXX'
    const promise = client.spv.getAddressPubKey(address)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Error: Invalid address', code: -5, method: spv_getaddresspubkey")
  })

  it('should not getAddressPubKey when no full public key for address', async () => {
    const randomAddress = 'bcrt1qw5567zacazrp2u608c5j2c0v4wmulfqvfgxecr'
    const promise = client.spv.getAddressPubKey(randomAddress)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'no full public key for address ${randomAddress}', code: -5, method: spv_getaddresspubkey`)
  })
})

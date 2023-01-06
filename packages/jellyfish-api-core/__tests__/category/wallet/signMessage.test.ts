import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { wallet } from '../../../src'

describe('Sign Message', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if address provided does not to refer to key (BECH32)', async () => {
    // getNewAddress generates a BECH32 address by default
    const address = await client.wallet.getNewAddress()
    const promise = client.wallet.signMessage(address, 'This is a test message')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -3,
        message: 'Address does not refer to key',
        method: 'signmessage'
      }
    })
  })

  it('should throw error if address provided does not to refer to key (P2SH)', async () => {
    const address = await client.wallet.getNewAddress('', wallet.AddressType.P2SH_SEGWIT)

    const promise = client.wallet.signMessage(address, 'This is a test message')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -3,
        message: 'Address does not refer to key',
        method: 'signmessage'
      }
    })
  })

  it('should throw error if invalid address is provided', async () => {
    const promise = client.wallet.signMessage('', 'This is a test message')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -3,
        message: 'Invalid address',
        method: 'signmessage'
      }
    })
  })

  it('should be verifiable', async () => {
    const address = await client.wallet.getNewAddress('', wallet.AddressType.LEGACY)
    const message = 'This is a test message'

    const signature = await client.wallet.signMessage(address, message)

    const verify = await client.call('verifymessage', [address, signature, 'This is a test message'], 'number')
    expect(verify).toStrictEqual(true)
  })
})

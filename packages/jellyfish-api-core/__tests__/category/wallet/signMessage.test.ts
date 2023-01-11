import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { wallet } from '../../../src'

describe('Sign Message on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if BECH32 address is provided', async () => {
    // getNewAddress() generates a BECH32 address by default
    // signMessage() is not compatible with BECH32 address
    const address = await client.wallet.getNewAddress()
    const message = 'This is a test message'

    const promise = client.wallet.signMessage(address, message)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -3,
        message: 'Address does not refer to key',
        method: 'signmessage'
      }
    })
  })

  it('should throw error if P2SH address is provided', async () => {
    // signMessage() is not compatible with P2SH address
    const address = await client.wallet.getNewAddress('', wallet.AddressType.P2SH_SEGWIT)
    const message = 'This is a test message'

    const promise = client.wallet.signMessage(address, message)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -3,
        message: 'Address does not refer to key',
        method: 'signmessage'
      }
    })
  })

  it('should throw error if invalid/no address is provided', async () => {
    const message = 'This is a test message'
    const promise = client.wallet.signMessage('', message)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -3,
        message: 'Invalid address',
        method: 'signmessage'
      }
    })
  })

  it('should throw error if address provided does not contain private key', async () => {
    const message = 'This is a test message'
    const address = 'mpLQjfK79b7CCV4VMJWEWAj5Mpx8Up5zxB'
    const promise = client.wallet.signMessage(address, message)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -4,
        message: 'Private key not available',
        method: 'signmessage'
      }
    })
  })

  it('should be verifiable using verifyMessage()', async () => {
    const address = await client.wallet.getNewAddress('', wallet.AddressType.LEGACY)
    const message = 'This is a test message'

    const signature = await client.wallet.signMessage(address, message)

    const verify = await client.call('verifymessage', [address, signature, message], 'number')
    expect(verify).toStrictEqual(true)
  })
})

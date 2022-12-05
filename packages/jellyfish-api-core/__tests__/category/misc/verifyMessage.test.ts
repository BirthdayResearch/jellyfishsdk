import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Verify message', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if invalid address', async () => {
    const promise = client.misc.verifyMessage('test', 'ICqlzHuredAz6XN7bVsB09/FGtGbRX+nUv+E9qz44rQ8DRi/zHpDGuMs2U6EtnGapv7r1V7cIdJ2ui9TMaaCNvA=', 'test')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -3,
        message: 'Invalid address',
        method: 'verifymessage'
      }
    })
  })

  it('should throw error if invalid signature', async () => {
    const promise = client.misc.verifyMessage('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 'ICqlzHuredAz6XN7bVsB09/FGtGbRX+nUv+E9qz44rQ8DRi/zHpDGuMs2U6EtnGapv7r1V7cIdJ2ui9TMaaCNvA', 'test')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Malformed base64 encoding',
        method: 'verifymessage'
      }
    })
  })

  it('should fail if incorrect keypair is used', async () => {
    const keyPair = RegTestFoundationKeys[0].owner
    const otherKeyPair = RegTestFoundationKeys[1].owner
    const message = 'test'

    const signedString = await client.misc.signMessageWithPrivKey(keyPair.privKey, message)

    const isCorrect = await client.misc.verifyMessage(otherKeyPair.address, signedString, 'test')
    expect(isCorrect).toStrictEqual(false)
  })

  it('should fail to verify message if incorrect message', async () => {
    const keyPair = RegTestFoundationKeys[0].owner
    const message = 'test'

    const signedString = await client.misc.signMessageWithPrivKey(keyPair.privKey, message)

    const isCorrect = await client.misc.verifyMessage(keyPair.address, signedString, 'test1')
    expect(isCorrect).toStrictEqual(false)
  })

  it('should verify message', async () => {
    const keyPair = RegTestFoundationKeys[0].owner
    const message = 'test'

    const signedString = await client.misc.signMessageWithPrivKey(keyPair.privKey, message)

    const isCorrect = await client.misc.verifyMessage(keyPair.address, signedString, 'test')
    expect(isCorrect).toStrictEqual(true)
  })
})

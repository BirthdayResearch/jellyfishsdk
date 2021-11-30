import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '../../../src'

describe('InvalidateBlock', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should throw an error for the invalid hash length', async () => {
    const promise = testing.rpc.blockchain.invalidateBlock('12345678')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'blockhash must be of length 64 (not 8, for \'12345678\')\', code: -8, method: invalidateblock')
  })

  it('should throw an error for the non-existing valid hash', async () => {
    const promise = testing.rpc.blockchain.invalidateBlock('x'.repeat(64))
    await expect(promise).rejects.toThrow('RpcApiError: \'blockhash must be hexadecimal string (not \'' + 'x'.repeat(64) + '\')\', code: -8, method: invalidateblock')
  })

  it('should resolve promise with null for existing hash', async () => {
    const hash = await testing.misc.waitForBlockHash(1)
    const promise = testing.rpc.blockchain.invalidateBlock(hash)
    await expect(promise).resolves.toBeNull()
  })
})

import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('submit block', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should submit a block', async () => {
    const promise = client.mining.submitBlock('000000205d77142a2f55df15b201af38c0c9d004303db3062c79c2f46d48caf77e5ea9803c34542f5023111496e9c2c67c3b5499c7a09e2cf0644fc37867d515fc755e90bb84c763ffff7f200c65e2f4ba109bc29964db3e4307f76d62424e1de0e50c5c0375a728d743b32403000000000000000100000000000000411f6fa67dc672775ca14dfc395078a0ae31c076e2b4e51024c9b47804178c66c71359e75bd2310e5903385704a155dfaa10bb04a0186ccc95566a8f3362859b9aaa01020000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff025300ffffffff0200f2052a010000001976a9148080dad765cbfd1c38f95e88592e24e43fb6428288ac0000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf90120000000000000000000000000000000000000000000000000000000000000000000000000')
    await expect(promise).resolves.not.toThrow()
  })

  it('should throw an error if the block is not valid', async () => {
    const promise = client.mining.submitBlock('block')
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -22,
        message: 'Block decode failed',
        method: 'submitblock'
      }
    })
  })
})

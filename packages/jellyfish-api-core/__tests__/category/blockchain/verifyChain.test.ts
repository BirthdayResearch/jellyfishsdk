import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('verifyChain', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForBlockHeight(10)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should return true when asking for all blocks for each check level', async () => {
    await expect(client.blockchain.verifyChain()).resolves.toBeTruthy()
    await expect(client.blockchain.verifyChain(0)).resolves.toBeTruthy()
    await expect(client.blockchain.verifyChain(1)).resolves.toBeTruthy()
    await expect(client.blockchain.verifyChain(2)).resolves.toBeTruthy()
    await expect(client.blockchain.verifyChain(3)).resolves.toBeTruthy()
    await expect(client.blockchain.verifyChain(4)).resolves.toBeTruthy()
  })

  it('should return true when asking for 1 block for each check level', async () => {
    await expect(client.blockchain.verifyChain(0, 1)).resolves.toBeTruthy()
    await expect(client.blockchain.verifyChain(1, 1)).resolves.toBeTruthy()
    await expect(client.blockchain.verifyChain(2, 1)).resolves.toBeTruthy()
    await expect(client.blockchain.verifyChain(3, 1)).resolves.toBeTruthy()
    await expect(client.blockchain.verifyChain(4, 1)).resolves.toBeTruthy()
  })

  it('should return true when asking for 12 blocks for each check level', async () => {
    await expect(client.blockchain.verifyChain(0, 12)).resolves.toBeTruthy()
    await expect(client.blockchain.verifyChain(1, 12)).resolves.toBeTruthy()
    await expect(client.blockchain.verifyChain(2, 12)).resolves.toBeTruthy()
    await expect(client.blockchain.verifyChain(3, 12)).resolves.toBeTruthy()
    await expect(client.blockchain.verifyChain(4, 12)).resolves.toBeTruthy()
  })
})

import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { blockchain } from '../../../src'

describe('ChainTips', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForBlock(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getChainTips', async () => {
    const chainTips: blockchain.ChainTip[] = await client.blockchain.getChainTips()
    for (let i = 0; i < chainTips.length; i += 1) {
      const data = chainTips[i]
      expect(data.height).toBeGreaterThan(0)
      expect(typeof data.hash).toStrictEqual('string')
      expect(data.hash.length).toStrictEqual(64)
      expect(data.branchlen).toBeGreaterThanOrEqual(0)
      expect(['invalid', 'headers-only', 'valid-headers', 'valid-fork', 'active'].includes(data.status)).toStrictEqual(true)
    }
  })
})

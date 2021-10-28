import { RegTestContainer } from '@defichain/testcontainers'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('genesis keys', () => {
  const container = new RegTestContainer()

  beforeEach(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should be able to import all priv key with valid address', async () => {
    for (const key of RegTestFoundationKeys) {
      await container.call('importprivkey', [key.operator.privKey])
      await container.call('importprivkey', [key.owner.privKey])
    }

    for (const key of RegTestFoundationKeys) {
      await container.call('getaddressinfo', [key.operator.address])
      await container.call('getaddressinfo', [key.owner.address])
    }
  })
})

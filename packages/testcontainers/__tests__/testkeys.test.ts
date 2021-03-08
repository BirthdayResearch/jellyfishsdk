import { RegTestContainer } from '../src/chains/reg_test_container'
import { GenesisKeys } from '../src/testkeys'

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
    for (const key of GenesisKeys) {
      await container.call('importprivkey', [key.operator.privKey])
      await container.call('importprivkey', [key.owner.privKey])
    }

    for (const key of GenesisKeys) {
      await container.call('getaddressinfo', [key.operator.address])
      await container.call('getaddressinfo', [key.owner.address])
    }
  })
})

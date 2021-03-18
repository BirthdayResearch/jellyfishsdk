import { MasterNodeRegTestContainer } from '../../src'
import waitForExpect from 'wait-for-expect'

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should auto generate coin in master node mode', async () => {
    await waitForExpect(async () => {
      const info = await container.getMintingInfo()
      expect(info.blocks).toBeGreaterThan(3)
    })
  })
})

describe('coinbase maturity', () => {
  const container = new MasterNodeRegTestContainer()

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should wait until coinbase maturity with spendable balance', async () => {
    await waitForExpect(async () => {
      const info = await container.getMintingInfo()
      expect(info.blocks).toBeGreaterThan(100)
    })

    await container.generate(3)

    await waitForExpect(async () => {
      const balance = await container.call('getbalance')
      expect(balance).toBeGreaterThan(100)
    })
  })

  it('should be able to perform amk rpc feature', async () => {
    await container.generate(5)

    const address = await container.getNewAddress()
    const payload: { [key: string]: string } = {}
    payload[address] = '100@0'
    await container.call('utxostoaccount', [payload])
  })
})

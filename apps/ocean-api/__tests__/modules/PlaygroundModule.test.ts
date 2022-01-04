import { OceanApiTesting } from '../../testing/OceanApiTesting'
import waitForExpect from 'wait-for-expect'

describe('regtest', () => {
  const apiTesting = OceanApiTesting.create()

  beforeEach(async () => {
    apiTesting.playgroundEnable(false)
    await apiTesting.start()
  })

  afterEach(async () => {
    await apiTesting.stop()
  })

  it('should not increment block count', async () => {
    const initial = await apiTesting.rpc.blockchain.getBlockCount()

    await new Promise((resolve) => {
      setTimeout(_ => resolve(0), 5000)
    })

    const next = await apiTesting.rpc.blockchain.getBlockCount()
    expect(next).toStrictEqual(initial)
  })
})

describe('playground', () => {
  const apiTesting = OceanApiTesting.create()

  beforeEach(async () => {
    apiTesting.playgroundEnable(true)
    await apiTesting.start()
  })

  afterEach(async () => {
    await apiTesting.stop()
  })

  it('should increment block count', async () => {
    const initial = await apiTesting.rpc.blockchain.getBlockCount()

    await waitForExpect(async () => {
      const next = await apiTesting.rpc.blockchain.getBlockCount()
      expect(next).toBeGreaterThan(initial)
    })
  })
})

import { PersistentMNRegTestContainer } from '../../../src'
import waitForExpect from 'wait-for-expect'

let container: PersistentMNRegTestContainer

afterEach(async () => {
  await container.stop()
})

it('should start and mint coins', async () => {
  container = new PersistentMNRegTestContainer()
  await container.start()
  await container.waitForReady()

  await waitForExpect(async () => {
    const info = await container.getMintingInfo()
    expect(info.blocks).toBeGreaterThan(3)
  })
})

it('should always use the same persistent container', async () => {
  container = new PersistentMNRegTestContainer()
  await container.start()
  await container.waitForReady()

  await waitForExpect(async () => {
    const info = await container.getMintingInfo()
    expect(info.blocks).toBeGreaterThan(3)
  })

  container = new PersistentMNRegTestContainer()
  await container.start()
  await container.waitForReady()

  const info = await container.getMintingInfo()
  expect(info.blocks).toBeGreaterThan(3)
})

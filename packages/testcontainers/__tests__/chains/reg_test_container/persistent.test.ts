import { PersistentMNRegTestContainer } from '../../../src'
import waitForExpect from 'wait-for-expect'

beforeEach(async () => {
  try {
    await new PersistentMNRegTestContainer().stop()
  } catch (ignored) {
  }
})

afterEach(async () => {
  try {
    await new PersistentMNRegTestContainer().stop()
  } catch (ignored) {
  }
})

it('should start and mint coins', async () => {
  const container = new PersistentMNRegTestContainer()
  await container.start()
  await container.waitForReady()

  await waitForExpect(async () => {
    const info = await container.getMiningInfo()
    expect(info.blocks).toBeGreaterThan(3)
  })
})

it('should always use the same persistent container', async () => {
  let container = new PersistentMNRegTestContainer()
  await container.start()
  await container.waitForReady()

  await waitForExpect(async () => {
    const info = await container.getMiningInfo()
    expect(info.blocks).toBeGreaterThan(3)
  })

  container = new PersistentMNRegTestContainer()
  await container.start()
  await container.waitForReady()

  const info = await container.getMiningInfo()
  expect(info.blocks).toBeGreaterThan(3)
})

import { PersistentMNRegTestContainer } from '../../../src'

beforeAll(async () => {
  try {
    await new PersistentMNRegTestContainer().stop()
  } catch (ignored) {
  }
})

afterAll(async () => {
  try {
    await new PersistentMNRegTestContainer().stop()
  } catch (ignored) {
  }
})

it('should start and mint coins', async () => {
  const container = new PersistentMNRegTestContainer()
  await container.start()
  await container.generate(4)

  const info = await container.getMiningInfo()
  expect(info.blocks).toBeGreaterThan(3)
})

it('should always use the same persistent container', async () => {
  let container = new PersistentMNRegTestContainer()
  await container.start()
  await container.generate(4)

  container = new PersistentMNRegTestContainer()
  await container.start()

  const { blocks } = await container.getMiningInfo()
  expect(blocks).toBeGreaterThan(3)
})

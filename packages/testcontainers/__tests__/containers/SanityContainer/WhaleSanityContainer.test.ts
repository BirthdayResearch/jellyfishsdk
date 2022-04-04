import { WhaleSanityContainer } from '../../../src/containers/SanityContainer/WhaleSanityContainer'

const container = new WhaleSanityContainer()

beforeAll(async () => {
  await container.start()
})

afterAll(async () => {
  await container.stop()
})

it('should spin up a valid whale container', async () => {
  const res = await container.get('')
  expect(res).toBeDefined()
  console.log(res)
})

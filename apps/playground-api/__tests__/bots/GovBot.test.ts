import { PlaygroundApiTesting } from '../../testing/PlaygroundApiTesting'
import waitForExpect from 'wait-for-expect'

const testing = PlaygroundApiTesting.create()

beforeAll(async () => {
  await testing.start()
})

afterAll(async () => {
  await testing.stop()
})

it('', async () => {
  await waitForExpect(async () => {
    const attributes = await testing.container.call('getgov', ['ATTRIBUTES'])
    expect(Object.keys(attributes).length).toBeGreaterThan(0)
    console.log('attributes: ', attributes)
  })
})

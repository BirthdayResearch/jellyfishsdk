import { WhaleSanityContainer } from '../../../src/containers/SanityContainer/WhaleSanityContainer'

const container = new WhaleSanityContainer()

beforeAll(async () => {
  await container.start()
  console.log(JSON.stringify(await container.inspect(), null, 2))
})

afterAll(async () => {
  await container.stop()
})

describe('GET _actuator/probes/liveness', () => {
  it('should return successfull response', async () => {
    const res = await container.get('/_actuator/probes/liveness')
    expect(res).toBeDefined()
    console.log(res)
  })
})

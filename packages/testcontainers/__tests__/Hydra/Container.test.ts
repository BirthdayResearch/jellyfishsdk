import { DeFiDContainer, StartedDeFiDContainer } from '../../src/containers/Hydra/DeFiDContainer'

describe('container error handling', () => {
  let container: StartedDeFiDContainer

  beforeAll(async () => {
    container = await new DeFiDContainer().start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should be able to getmininginfo and chain should be test', async () => {
    const { chain } = await container.getMiningInfo()
    expect(chain).toStrictEqual('test')
  })
})

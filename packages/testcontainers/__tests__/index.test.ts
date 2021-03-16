import { MainNetContainer, TestNetContainer, RegTestContainer } from '../src'

describe('main', () => {
  const container = new MainNetContainer()

  beforeEach(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should be able to getmintinginfo and chain should be main', async () => {
    const { chain } = await container.getMintingInfo()
    expect(chain).toBe('main')
  })
})

describe('test', () => {
  const container = new TestNetContainer()

  beforeEach(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should be able to getmintinginfo and chain should be test', async () => {
    const { chain } = await container.getMintingInfo()
    expect(chain).toBe('test')
  })
})

describe('regtest', () => {
  const container = new RegTestContainer()

  beforeEach(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should be able to getmintinginfo and chain should be regtest', async () => {
    const { chain } = await container.getMintingInfo()
    expect(chain).toBe('regtest')
  })
})

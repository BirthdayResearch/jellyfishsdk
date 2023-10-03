import { MainNetContainer, RegTestContainer, TestNetContainer } from '../src'

describe('main', () => {
  const container = new MainNetContainer()

  beforeEach(async () => {
    await container.start()
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should be able to getmininginfo and chain should be main', async () => {
    const { chain } = await container.getMiningInfo()
    expect(chain).toStrictEqual('main')
  })
})

describe('test', () => {
  const container = new TestNetContainer()

  beforeEach(async () => {
    await container.start()
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should be able to getmininginfo and chain should be test', async () => {
    const { chain } = await container.getMiningInfo()
    expect(chain).toStrictEqual('test')
  })
})

describe('regtest', () => {
  const container = new RegTestContainer()

  beforeEach(async () => {
    await container.start()
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should be able to getmininginfo and chain should be regtest', async () => {
    const { chain } = await container.getMiningInfo()
    expect(chain).toStrictEqual('regtest')
  })
})

describe('regtest: override docker image', () => {
  const container = new TestNetContainer('defi/defichain:4.0.0-beta12')

  afterAll(async () => {
    await container.stop()
  })

  it('should be able to getmininginfo and chain should be test', async () => {
    await container.start()
    const { chain } = await container.getMiningInfo()
    expect(chain).toStrictEqual('test')
  })
})

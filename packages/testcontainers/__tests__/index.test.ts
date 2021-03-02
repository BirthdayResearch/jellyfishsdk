import {MainNetDocker, RegTestDocker, TestNetDocker} from '../src'

describe('reg test', () => {
  const node = new RegTestDocker()

  beforeEach(async () => {
    await node.start({
      user: 'foo',
      password: 'bar',
    })
    await node.ready()
  })

  afterEach(async () => {
    await node.stop()
  })

  it('should getmintinginfo and chain should be regtest', async () => {
    const result = await node.call('getmintinginfo', [])
    expect(result.result.chain).toBe('regtest')
  })
})

describe('test net', () => {
  const node = new TestNetDocker()

  beforeEach(async () => {
    await node.start({
      user: 'foo',
      password: 'bar',
    })
    await node.ready()
  })

  afterEach(async () => {
    await node.stop()
  })

  it('should getmintinginfo and chain should be regtest', async () => {
    const result = await node.call('getmintinginfo', [])
    expect(result.result.chain).toBe('test')
  })
})

describe('main net', () => {
  const node = new MainNetDocker()

  beforeEach(async () => {
    await node.start({
      user: 'foo',
      password: 'bar',
    })
    await node.ready()
  })

  afterEach(async () => {
    await node.stop()
  })

  it('should getmintinginfo and chain should be regtest', async () => {
    const result = await node.call('getmintinginfo', [])
    expect(result.result.chain).toBe('main')
  })
})

import { TestingGroup } from '@defichain/jellyfish-testing'

describe('Network', () => {
  const tGroup = TestingGroup.create(9)

  beforeAll(async () => {
    await tGroup.start({
      startFlags: [
        {
          name: 'regtest',
          value: 0
        },
        {
          name: 'testnet',
          value: 1
        },
        {
          name: 'rpcport',
          value: 19554
        }
      ]
    })
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should be empty if no available nodes', async () => {
    const res = await tGroup.get(0).rpc.net.getNodeAddresses(1)
    expect(res).toMatchObject([])
  })

  it('should have available nodes', async () => {
    await tGroup.link()
    await new Promise((resolve) => {
      setTimeout(() => resolve(0), 30000)
    }) // give enough time to find new nodes

    const res = await tGroup.get(0).rpc.net.getNodeAddresses(1)
    expect(res).toMatchObject([{
      time: expect.any(Number),
      services: expect.any(Number),
      address: expect.any(String),
      port: expect.any(Number)
    }])
  })
})

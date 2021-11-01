import { TestingGroup } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'

describe('Spv', () => {
  const tGroup = TestingGroup.create(3)

  beforeAll(async () => {
    await tGroup.start()
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  async function setMockTime (offsetHour: number): Promise<void> {
    await tGroup.exec(async testing => {
      await testing.misc.offsetTimeHourly(offsetHour)
    })
  }

  async function setup (): Promise<void> {
    const auths = await tGroup.get(0).container.call('spv_listanchorauths')
    expect(auths.length).toStrictEqual(0)

    // time travel back 12 hours ago
    const initOffsetHour = -12
    await setMockTime(initOffsetHour)

    // check the auth and confirm anchor mn teams
    await tGroup.waitForAnchorTeams(tGroup.length())

    const blockCount = await tGroup.get(0).container.getBlockCount()
    expect(blockCount).toStrictEqual(15)

    // assertion for team
    for (let i = 0; i < tGroup.length(); i += 1) {
      const { container } = tGroup.get(i % tGroup.length())
      const team = await container.call('getanchorteams')
      expect(team.auth.length).toStrictEqual(tGroup.length())
      expect(team.confirm.length).toStrictEqual(tGroup.length())
      expect(team.auth.includes(GenesisKeys[0].operator.address))
      expect(team.auth.includes(GenesisKeys[1].operator.address))
      expect(team.auth.includes(GenesisKeys[2].operator.address))
      expect(team.confirm.includes(GenesisKeys[0].operator.address))
      expect(team.confirm.includes(GenesisKeys[1].operator.address))
      expect(team.confirm.includes(GenesisKeys[2].operator.address))
    }

    // generate 2 anchor auths
    await tGroup.waitForAnchorAuths(async () => await tGroup.anchor.generateAnchorAuths(2, initOffsetHour, 'setLastHeight'), 60)

    await createAnchor()
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
  }

  async function createAnchor (): Promise<void> {
    const rewardAddress = await tGroup.get(0).rpc.spv.getNewAddress()
    await tGroup.get(0).rpc.spv.createAnchor([{
      txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
      vout: 2,
      amount: 15800,
      privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
    }], rewardAddress)
  }

  it('should setLastHeight', async () => {
    {
      const anchors = await tGroup.get(0).rpc.spv.listAnchors()
      expect(anchors.length).toStrictEqual(1)
      expect(anchors[0].confirmations).toStrictEqual(1)
      expect(anchors[0].active).toStrictEqual(false)
    }

    {
      await tGroup.get(0).rpc.spv.setLastHeight(3)
      const anchors = await tGroup.get(0).rpc.spv.listAnchors()
      expect(anchors.length).toStrictEqual(1)
      expect(anchors[0].confirmations).toStrictEqual(1 + 3)
      expect(anchors[0].active).toStrictEqual(false)
    }

    {
      await tGroup.get(0).rpc.spv.setLastHeight(15)
      const anchors = await tGroup.get(0).rpc.spv.listAnchors()
      expect(anchors.length).toStrictEqual(1)
      expect(anchors[0].confirmations).toStrictEqual(1 + 15)
      expect(anchors[0].active).toStrictEqual(true)
    }
  })
})

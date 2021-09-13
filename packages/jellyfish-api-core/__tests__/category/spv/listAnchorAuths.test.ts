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

    // 15 as anchor frequency
    for (let i = 0; i < 15; i += 1) {
      const { container } = tGroup.get(i % tGroup.length())
      await container.generate(1)
      await tGroup.waitForSync()
    }

    const blockCount = await tGroup.get(0).container.getBlockCount()
    expect(blockCount).toStrictEqual(15)

    // check the auth and confirm anchor mn teams
    await tGroup.get(0).container.waitForAnchorTeams(tGroup.length())

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
    await tGroup.anchor.generateAnchorAuths(2, initOffsetHour)

    await tGroup.get(0).container.waitForAnchorAuths(tGroup.length())
  }

  it('should listAnchorAuths', async () => {
    for (let i = 0; i < 2; i += 1) {
      const auths = await tGroup.get(0).rpc.spv.listAnchorAuths()
      expect(auths.length).toStrictEqual(2)
      expect(typeof auths[i].previousAnchor).toStrictEqual('string')
      expect(typeof auths[i].blockHeight).toStrictEqual('number')
      expect(typeof auths[i].blockHash).toStrictEqual('string')
      expect(typeof auths[i].creationHeight).toStrictEqual('number')
      expect(typeof auths[i].signers).toStrictEqual('number')
      expect(auths[i].signers).toStrictEqual(tGroup.length())
      expect(auths[i].signees?.length).toStrictEqual(tGroup.length())
      expect(auths[i].signees?.includes(GenesisKeys[0].operator.address))
      expect(auths[i].signees?.includes(GenesisKeys[1].operator.address))
      expect(auths[i].signees?.includes(GenesisKeys[2].operator.address))
    }
  })
})

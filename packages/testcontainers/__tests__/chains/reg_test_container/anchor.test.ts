import { TestingGroup } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'

describe('anchor', () => {
  const tGroup = TestingGroup.create(3)
  const initOffsetHour = -12

  beforeAll(async () => {
    await tGroup.start()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  async function setMockTime (offsetHour: number): Promise<void> {
    await tGroup.exec(async testing => {
      await testing.misc.offsetTimeHourly(offsetHour)
    })
  }

  it('should waitForAnchorTeams', async () => {
    const auths = await tGroup.get(0).container.call('spv_listanchorauths')
    expect(auths.length).toStrictEqual(0)

    await setMockTime(initOffsetHour)
    await tGroup.waitForAnchorTeams(3)

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
  })
})

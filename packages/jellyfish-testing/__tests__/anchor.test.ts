import { TestingGroup } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'

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

it('should generateAnchorAuths', async () => {
  await setMockTime(initOffsetHour)
  await tGroup.waitForAnchorTeams(3)

  await tGroup.anchor.generateAnchorAuths(2, initOffsetHour, 'generateAnchorAuths')

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

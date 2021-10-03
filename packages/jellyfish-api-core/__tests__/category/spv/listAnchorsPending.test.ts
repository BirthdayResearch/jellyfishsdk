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
    await tGroup.waitForAnchorAuths(async () => await tGroup.anchor.generateAnchorAuths(2, initOffsetHour), 60)

    await createAnchor()
    await createAnchor()
    await createAnchor()
    await createAnchor()
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

  it('should listAnchorsPending', async () => {
    const anchors = await tGroup.get(0).rpc.spv.listAnchorsPending()
    expect(anchors.length).toStrictEqual(4)
    for (const anchor of anchors) {
      expect(typeof anchor.btcBlockHeight).toStrictEqual('number')
      expect(typeof anchor.btcBlockHash).toStrictEqual('string')
      expect(typeof anchor.btcTxHash).toStrictEqual('string')
      expect(typeof anchor.previousAnchor).toStrictEqual('string')
      expect(typeof anchor.defiBlockHeight).toStrictEqual('number')
      expect(typeof anchor.defiBlockHash).toStrictEqual('string')
      expect(typeof anchor.rewardAddress).toStrictEqual('string')
      expect(typeof anchor.confirmations).toStrictEqual('number')
      expect(typeof anchor.signatures).toStrictEqual('number')
      expect(typeof anchor.anchorCreationHeight).toStrictEqual('number')
    }
  })
})

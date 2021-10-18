import { spv } from '@defichain/jellyfish-api-core'
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
    {
      const auths = await tGroup.get(0).container.call('spv_listanchorauths')
      expect(auths.length).toStrictEqual(0)
    }

    // time travel back 12 hours ago
    const initOffsetHour = -12
    await setMockTime(initOffsetHour)

    // 15 as anchor frequency
    for (let i = 0; i < 15; i += 1) {
      const { container } = tGroup.get(i % tGroup.length())
      await container.generate(1)
      await tGroup.waitForSync()
    }

    // check the auth and confirm anchor mn teams
    await tGroup.waitForAnchorTeams(tGroup.length())

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

    await tGroup.anchor.generateAnchorAuths(2, initOffsetHour)

    // check each container should be quorum ready
    for (let i = 0; i < tGroup.length(); i += 1) {
      const { container } = tGroup.get(i % tGroup.length())
      const auths = await container.call('spv_listanchorauths')
      expect(auths.length).toStrictEqual(2)
      expect(auths[0].signers).toStrictEqual(tGroup.length())
    }

    await tGroup.get(0).container.waitForBlockHeight(60)
    await tGroup.waitForSync()
  }

  async function createAnchor (): Promise<spv.CreateAnchorResult> {
    const rewardAddress = await tGroup.get(0).rpc.spv.getNewAddress()
    return await tGroup.get(0).rpc.spv.createAnchor([{
      txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
      vout: 2,
      amount: 15800,
      privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
    }], rewardAddress)
  }

  it('should listAnchorsUnrewarded', async () => {
    const anchor1 = await createAnchor()
    const anchor2 = await createAnchor()

    // node1 does the same as node0
    await tGroup.get(1).container.call('spv_sendrawtx', [anchor1.txHex])
    await tGroup.get(1).container.call('spv_sendrawtx', [anchor2.txHex])
    await tGroup.get(1).generate(1)
    await tGroup.waitForSync()

    {
      const rewardConfs = await tGroup.get(0).container.call('spv_listanchorrewardconfirms')
      expect(rewardConfs.length).toStrictEqual(0)

      const unrewardeds = await tGroup.get(0).rpc.spv.listAnchorsUnrewarded()
      expect(unrewardeds.length).toStrictEqual(0)
    }

    // 2 signers to confirm anchor reward
    await tGroup.get(0).container.call('spv_setlastheight', [6])
    await tGroup.get(1).container.call('spv_setlastheight', [6])

    const anchors = await tGroup.get(0).container.call('spv_listanchors')
    expect(anchors.length).toBeGreaterThan(0)
    const activeAnchor = anchors.find((anchor: any) => anchor.active)

    const rewardConfs = await tGroup.get(0).container.call('spv_listanchorrewardconfirms')
    expect(rewardConfs.length).toBeGreaterThan(0)
    const rewardConf = rewardConfs[0]
    expect(typeof rewardConf.btcTxHeight).toStrictEqual('number')
    expect(rewardConf.btcTxHash).toStrictEqual(activeAnchor.btcTxHash)
    expect(rewardConf.anchorHeight).toStrictEqual(activeAnchor.defiBlockHeight)
    expect(rewardConf.dfiBlockHash).toStrictEqual(activeAnchor.defiBlockHash)
    expect(typeof rewardConf.prevAnchorHeight).toStrictEqual('number')
    expect(rewardConf.rewardAddress).toStrictEqual(activeAnchor.rewardAddress)
    expect(typeof rewardConf.confirmSignHash).toStrictEqual('string')
    expect(typeof rewardConf.signers).toStrictEqual('number')

    {
      const unrewardeds = await tGroup.get(0).rpc.spv.listAnchorsUnrewarded()
      expect(unrewardeds.length).toBeGreaterThan(0)
      const unrewarded = unrewardeds[0]
      expect(typeof unrewarded.btcBlockHeight).toStrictEqual('number')
      expect(typeof unrewarded.btcBlockHash).toStrictEqual('string')
      expect(unrewarded.btcTxHash).toStrictEqual(rewardConf.btcTxHash)
      expect(typeof unrewarded.previousAnchor).toStrictEqual('string')
      expect(typeof unrewarded.defiBlockHeight).toStrictEqual('number')
      expect(unrewarded.defiBlockHash).toStrictEqual(rewardConf.dfiBlockHash)
      expect(unrewarded.rewardAddress).toStrictEqual(rewardConf.rewardAddress)
      expect(typeof unrewarded.confirmations).toStrictEqual('number')
      expect(typeof unrewarded.signatures).toStrictEqual('number')
      expect(typeof unrewarded.anchorCreationHeight).toStrictEqual('number')
    }

    const commBalancesBefore = await tGroup.get(0).container.call('listcommunitybalances')

    await tGroup.get(0).generate(1)

    const rewards = await tGroup.get(0).rpc.spv.listAnchorRewards()
    expect(rewards.length).toBeGreaterThan(0)
    expect(typeof rewards[0].AnchorTxHash).toStrictEqual('string')
    expect(typeof rewards[0].RewardTxHash).toStrictEqual('string')

    const commBalancesAfter = await tGroup.get(0).container.call('listcommunitybalances')
    expect(commBalancesBefore.AnchorReward > commBalancesAfter.AnchorReward).toStrictEqual(true)

    {
      const unrewardeds = await tGroup.get(0).rpc.spv.listAnchorsUnrewarded()
      expect(unrewardeds.length).toStrictEqual(0)
    }
  })
})

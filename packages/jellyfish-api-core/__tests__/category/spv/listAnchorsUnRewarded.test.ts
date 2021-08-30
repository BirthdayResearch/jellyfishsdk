import { CreateAnchorResult } from '@defichain/jellyfish-api-core/category/spv'
import { MasterNodeRegTestContainer, ContainerGroup, GenesisKeys } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Spv', () => {
  const group = new ContainerGroup([
    new MasterNodeRegTestContainer(GenesisKeys[0]),
    new MasterNodeRegTestContainer(GenesisKeys[1]),
    new MasterNodeRegTestContainer(GenesisKeys[2])
  ])

  const clients = [
    new ContainerAdapterClient(group.get(0)),
    new ContainerAdapterClient(group.get(1)),
    new ContainerAdapterClient(group.get(2))
  ]

  beforeAll(async () => {
    await group.start()

    await setup()
  })

  afterAll(async () => {
    await group.stop()
  })

  async function setMockTime (pastHour: number, futureHour = 0): Promise<void> {
    const offset = Date.now() - (pastHour * 60 * 60 * 1000) + (futureHour * 60 * 60 * 1000)
    for (let i = 0; i < clients.length; i += 1) {
      await clients[i].misc.setMockTime(offset)
    }
  }

  async function setup (): Promise<void> {
    const auths = await group.get(0).call('spv_listanchorauths')
    expect(auths.length).toStrictEqual(0)

    // time travel back 13 hours ago
    await setMockTime(13)

    // 15 as anchor frequency
    for (let i = 0; i < 15; i += 1) {
      const container = group.get(i % clients.length)
      await container.generate(1)
      await group.waitForSync()
    }

    // check the auth and confirm anchor mn teams
    await group.get(0).waitForAnchorTeams(clients.length)

    // assertion for team
    for (let i = 0; i < clients.length; i += 1) {
      const container = group.get(i % clients.length)
      const team = await container.call('getanchorteams')
      expect(team.auth.length).toStrictEqual(clients.length)
      expect(team.confirm.length).toStrictEqual(clients.length)
      expect(team.auth.includes(GenesisKeys[0].operator.address))
      expect(team.auth.includes(GenesisKeys[1].operator.address))
      expect(team.auth.includes(GenesisKeys[2].operator.address))
      expect(team.confirm.includes(GenesisKeys[0].operator.address))
      expect(team.confirm.includes(GenesisKeys[1].operator.address))
      expect(team.confirm.includes(GenesisKeys[2].operator.address))
    }

    // generate anchor auths
    for (let i = 1; i < 3 + 1; i += 1) {
      await setMockTime(12, i)
      await group.get(0).generate(15)
      await group.waitForSync()
    }

    await group.get(0).waitForAnchorAuths(clients.length)

    // check each container should be quorum ready
    for (let i = 0; i < clients.length; i += 1) {
      const container = group.get(i % clients.length)
      const auths = await container.call('spv_listanchorauths')
      expect(auths.length).toStrictEqual(1)
      expect(auths[0].signers).toStrictEqual(clients.length)
    }

    await group.get(0).waitForBlockHeight(60)
    await group.waitForSync()
  }

  async function createAnchor (): Promise<CreateAnchorResult> {
    const rewardAddress = await clients[0].spv.getNewAddress()
    return await clients[0].spv.createAnchor([{
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
    await group.get(1).call('spv_sendrawtx', [anchor1.txHex])
    await group.get(1).call('spv_sendrawtx', [anchor2.txHex])
    await group.get(1).generate(1)
    await group.waitForSync()

    {
      const rewardConfs = await group.get(0).call('spv_listanchorrewardconfirms')
      expect(rewardConfs.length).toStrictEqual(0)

      const unrewardeds = await clients[0].spv.listAnchorsUnrewarded()
      expect(unrewardeds.length).toStrictEqual(0)
    }

    // 2 signers to confirm anchor reward
    await group.get(0).call('spv_setlastheight', [6])
    await group.get(1).call('spv_setlastheight', [6])

    const anchors = await group.get(0).call('spv_listanchors')
    expect(anchors.length).toBeGreaterThan(0)
    const activeAnchor = anchors.find((anchor: any) => anchor.active === true)

    const rewardConfs = await group.get(0).call('spv_listanchorrewardconfirms')
    expect(rewardConfs.length).toBeGreaterThan(0)
    const rewardConf = rewardConfs[0]
    expect(typeof rewardConf.btcTxHeight).toStrictEqual('number')
    expect(rewardConf.btcTxHash).toStrictEqual(activeAnchor.btcTxHash)
    expect(rewardConf.anchorHeight).toStrictEqual(activeAnchor.defiBlockHeight)
    expect(typeof rewardConf.dfiBlockHash).toStrictEqual('string')
    expect(typeof rewardConf.prevAnchorHeight).toStrictEqual('number')
    expect(rewardConf.rewardAddress).toStrictEqual(activeAnchor.rewardAddress)
    expect(typeof rewardConf.confirmSignHash).toStrictEqual('string')
    expect(typeof rewardConf.signers).toStrictEqual('number')

    {
      const unrewardeds = await clients[0].spv.listAnchorsUnrewarded()
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

    const commBalancesBefore = await group.get(0).call('listcommunitybalances')

    await group.get(0).waitForAnchorRewardConfirms('regtest')
    await group.get(0).generate(1)

    const rewards = await clients[0].spv.listAnchorRewards()
    expect(rewards.length).toBeGreaterThan(0)
    expect(typeof rewards[0].AnchorTxHash).toStrictEqual('string')
    expect(typeof rewards[0].RewardTxHash).toStrictEqual('string')

    const commBalancesAfter = await group.get(0).call('listcommunitybalances')
    expect(commBalancesBefore.AnchorReward > commBalancesAfter.AnchorReward).toStrictEqual(true)

    {
      const unrewardeds = await clients[0].spv.listAnchorsUnrewarded()
      expect(unrewardeds.length).toStrictEqual(0)
    }
  })
})

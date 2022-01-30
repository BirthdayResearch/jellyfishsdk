import { TestingGroup } from '@defichain/jellyfish-testing'

describe('Masternode', () => {
  const tGroup = TestingGroup.create(3)

  async function setMockTime (offsetHour: number): Promise<void> {
    await tGroup.exec(async testing => {
      await testing.misc.offsetTimeHourly(offsetHour)
    })
  }

  async function setup (): Promise<void> {
    const anchorAuths = await tGroup.get(0).rpc.spv.listAnchorAuths()
    expect(anchorAuths.length).toEqual(0)

    // time travel back 12 hours ago
    const initOffsetHour = -12
    await setMockTime(initOffsetHour) // 15 as anchor frequency

    for (let i = 0; i < 15; i += 1) {
      const { container } = tGroup.get(i % tGroup.length())
      await container.generate(1)
      await tGroup.waitForSync()
    }
    await tGroup.get(0).container.waitForAnchorTeams(tGroup.length())
    const anchorTeams = await tGroup.get(0).container.call('getanchorteams')
    expect(anchorTeams.auth.length).toEqual(tGroup.length())
    expect(anchorTeams.confirm.length).toEqual(tGroup.length())

    const anchorAuthBefore = await tGroup.get(0).rpc.spv.listAnchorAuths()
    expect(anchorAuthBefore.length).toEqual(0)

    await tGroup.anchor.generateAnchorAuths(2, initOffsetHour)
    await tGroup.get(0).container.waitForAnchorAuths(tGroup.length())

    for (let i = 0; i < tGroup.length(); i += 1) {
      const auths = await tGroup.get(i).rpc.spv.listAnchorAuths()
      expect(auths.length).toStrictEqual(2)
      expect(auths[0].signers).toStrictEqual(tGroup.length())
    }
  }

  beforeAll(async () => {
    await tGroup.start()
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should listAnchors to be empty initially', async () => {
    const anchorRewards = await tGroup.get(0).rpc.spv.listAnchorRewards()
    expect(anchorRewards.length).toEqual(0)

    const anchors = await tGroup.get(0).rpc.masternode.listAnchors()
    expect(anchors.length).toEqual(0)
  })

  it('should listAnchors when anchor has been rewarded', async () => {
    const rewardAddress = await tGroup.get(0).rpc.spv.getNewAddress()
    const anchor = await tGroup.get(0).rpc.spv.createAnchor([{
      txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
      vout: 2,
      amount: 15800,
      privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
    }], rewardAddress)

    // reward is still pending
    const pendingAnchorList = await tGroup.get(0).rpc.spv.listAnchorsPending()
    expect(pendingAnchorList.length).toEqual(1)

    expect((await tGroup.get(0).rpc.masternode.listAnchors()).length).toEqual(0)

    // get other anchor to send the tx as well
    await tGroup.get(1).container.call('spv_sendrawtx', [anchor.txHex])

    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    // reward is no longer pending
    const pendingAnchorListAfter = await tGroup.get(0).rpc.spv.listAnchorsPending()
    expect(pendingAnchorListAfter.length).toEqual(0)

    await tGroup.get(0).container.call('spv_setlastheight', [6])
    await tGroup.get(1).container.call('spv_setlastheight', [6])
    const anchorRewardsBefore = await tGroup.get(0).rpc.spv.listAnchorRewards()
    expect(anchorRewardsBefore.length).toEqual(0)

    // anchor reward not confirmed
    const masternodeAnchor = await tGroup.get(0).rpc.masternode.listAnchors()
    expect(masternodeAnchor.length).toEqual(0)

    await tGroup.get(0).container.waitForAnchorRewardConfirms()
    await tGroup.get(0).generate(1)
    const anchorRewards = await tGroup.get(0).rpc.spv.listAnchorRewards()
    expect(anchorRewards.length).toEqual(1)

    const masternodeAnchors = await tGroup.get(0).rpc.masternode.listAnchors()
    expect(masternodeAnchors.length).toEqual(1)
    expect(masternodeAnchors[0].btcAnchorHash).toStrictEqual(anchorRewards[0].AnchorTxHash)
    expect(masternodeAnchors[0].dfiRewardHash).toStrictEqual(anchorRewards[0].RewardTxHash)

    // list anchor from other masternode
    await tGroup.waitForSync()
    const masternode1Anchors = await tGroup.get(1).rpc.masternode.listAnchors()
    const masternode2Anchors = await tGroup.get(2).rpc.masternode.listAnchors()
    expect(masternode1Anchors).toStrictEqual(masternodeAnchors)
    expect(masternode2Anchors).toStrictEqual(masternodeAnchors)
  })
})

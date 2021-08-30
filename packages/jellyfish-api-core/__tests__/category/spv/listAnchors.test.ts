import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer, GenesisKeys } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Spv', () => {
  const t0 = Testing.create(new MasterNodeRegTestContainer(GenesisKeys[0]))
  const t1 = Testing.create(new MasterNodeRegTestContainer(GenesisKeys[1]))
  const t2 = Testing.create(new MasterNodeRegTestContainer(GenesisKeys[2]))
  const tGroup = new TestingGroup([t0, t1, t2])

  const clients = [
    new ContainerAdapterClient(tGroup.get(0)),
    new ContainerAdapterClient(tGroup.get(1)),
    new ContainerAdapterClient(tGroup.get(2))
  ]

  beforeAll(async () => {
    await tGroup.start()
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  async function setMockTime (pastHour: number, futureHour = 0): Promise<void> {
    for (let i = 0; i < tGroup.testings.length; i += 1) {
      await tGroup.getT(i).misc.offsetTimeHourly(pastHour, futureHour)
    }
  }

  async function setup (): Promise<void> {
    const auths = await tGroup.get(0).call('spv_listanchorauths')
    expect(auths.length).toStrictEqual(0)

    // time travel back 13 hours ago
    await setMockTime(13)

    // 15 as anchor frequency
    for (let i = 0; i < 15; i += 1) {
      const container = tGroup.get(i % clients.length)
      await container.generate(1)
      await tGroup.waitForSync()
    }

    // check the auth and confirm anchor mn teams
    await tGroup.get(0).waitForAnchorTeams(clients.length)

    // assertion for team
    for (let i = 0; i < clients.length; i += 1) {
      const container = tGroup.get(i % clients.length)
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
      await tGroup.get(0).generate(15)
      await tGroup.waitForSync()
    }

    await tGroup.get(0).waitForAnchorAuths(clients.length)

    // check each container should be quorum ready
    for (let i = 0; i < clients.length; i += 1) {
      const container = tGroup.get(i % clients.length)
      const auths = await container.call('spv_listanchorauths')
      expect(auths.length).toStrictEqual(1)
      expect(auths[0].signers).toStrictEqual(clients.length)
    }

    await createAnchor()
    await tGroup.get(0).waitForBlockHeight(75)
    await tGroup.waitForSync()

    await createAnchor()
    await tGroup.get(0).waitForBlockHeight(90)
    await tGroup.waitForSync()

    await createAnchor()
    await tGroup.get(0).waitForBlockHeight(105)
    await tGroup.waitForSync()

    await createAnchor()
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    await tGroup.get(0).call('spv_setlastheight', [6])
  }

  async function createAnchor (): Promise<void> {
    const rewardAddress = await clients[0].spv.getNewAddress()
    await clients[0].spv.createAnchor([{
      txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
      vout: 2,
      amount: 15800,
      privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
    }], rewardAddress)
  }

  it('should listAnchors', async () => {
    const anchors = await clients[0].spv.listAnchors()
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
      expect(typeof anchor.active).toStrictEqual('boolean')
    }
  })

  it('should listAnchors with minBtcHeight', async () => {
    const anchors = await clients[0].spv.listAnchors({ minBtcHeight: 10 })
    expect(anchors.length).toStrictEqual(0)
  })

  it('should listAnchors with maxBtcHeight', async () => {
    const anchors = await clients[0].spv.listAnchors({ maxBtcHeight: 10 })
    expect(anchors.every(anchor => anchor.btcBlockHeight <= 10)).toStrictEqual(true)
  })

  it('should listAnchors with minConfs', async () => {
    const anchors = await clients[0].spv.listAnchors({ minConfs: 5 })
    expect(anchors.every(anchor => anchor.confirmations >= 5)).toStrictEqual(true)
  })

  it('should listAnchors with maxConfs', async () => {
    const anchors = await clients[0].spv.listAnchors({ minConfs: 10 })
    expect(anchors.length).toStrictEqual(0)
  })
})

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

  async function setMockTime (
    clients: ContainerAdapterClient[], pastHour: number, futureHour = 0
  ): Promise<void> {
    const offset = Date.now() - (pastHour * 60 * 60 * 1000) + (futureHour * 60 * 60 * 1000)
    for (let i = 0; i < clients.length; i += 1) {
      await clients[i].misc.setMockTime(offset)
    }
  }

  async function setup (): Promise<void> {
    const auths = await group.get(0).call('spv_listanchorauths')
    expect(auths.length).toStrictEqual(0)

    // time travel back 13 hours ago
    await setMockTime(clients, 13)

    // 15 as anchor frequency
    for (let i = 0; i < 15; i += 1) {
      const container = group.get(i % clients.length)
      await container.generate(1)
      await group.waitForSync()
    }

    const blockCount = await group.get(0).getBlockCount()
    expect(blockCount).toStrictEqual(15)

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

    // generate 2 anchor auths
    for (let i = 1; i < 3 + 1 + 1; i += 1) {
      await setMockTime(clients, 12, i)
      await group.get(0).generate(15)
      await group.waitForSync()
    }

    await group.get(0).waitForAnchorAuths(clients.length)
  }

  it('should listAnchorAuths', async () => {
    for (let i = 0; i < 2; i += 1) {
      const auths = await clients[i].spv.listAnchorAuths()
      expect(auths.length).toStrictEqual(2)
      expect(typeof auths[i].previousAnchor).toStrictEqual('string')
      expect(typeof auths[i].blockHeight).toStrictEqual('number')
      expect(typeof auths[i].blockHash).toStrictEqual('string')
      expect(typeof auths[i].creationHeight).toStrictEqual('number')
      expect(typeof auths[i].signers).toStrictEqual('number')
      expect(auths[i].signers).toStrictEqual(clients.length)
      expect(auths[i].signees?.length).toStrictEqual(clients.length)
      expect(auths[i].signees?.includes(GenesisKeys[0].operator.address))
      expect(auths[i].signees?.includes(GenesisKeys[1].operator.address))
      expect(auths[i].signees?.includes(GenesisKeys[2].operator.address))
    }
  })
})

import { BigNumber, RpcApiError } from '@defichain/jellyfish-api-core'
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
    const anchorAuths = await group.get(0).call('spv_listanchorauths')
    expect(anchorAuths.length).toStrictEqual(0)

    // time travel back 13 hours ago
    await setMockTime(clients, 13)

    const anchorFreq = 15
    for (let i = 0; i < anchorFreq; i += 1) {
      const container = group.get(i % clients.length)
      await container.generate(1)
      await group.waitForSync()
    }

    {
      const count = await group.get(0).getBlockCount()
      expect(count).toStrictEqual(15)
    }

    // check the auth and confirm anchor mn teams at current height 15
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

    {
      // anchor auths length should be still zero
      const auths = await group.get(0).call('spv_listanchorauths')
      expect(auths.length).toStrictEqual(0)
    }

    // forward 3 hours from 12 hours ago and generate 15 blocks per hour
    // set 3 hours because block height and hash chosen is then 3 hours
    // then every 15 blocks will be matched again
    for (let i = 1; i < 3 + 1; i += 1) {
      await setMockTime(clients, 12, i)
      await group.get(0).generate(15)
      await group.waitForSync()
    }

    {
      const count = await group.get(0).getBlockCount()
      expect(count).toStrictEqual(60)
    }

    await group.get(0).waitForAnchorAuths(3)

    // check each container should be quorum ready
    for (let i = 0; i < clients.length; i += 1) {
      const container = group.get(i % clients.length)
      const auths = await container.call('spv_listanchorauths')
      expect(auths.length).toStrictEqual(1)
      expect(auths[0].signers).toStrictEqual(clients.length)
      expect(auths[0].blockHeight).toStrictEqual(15)
      expect(auths[0].creationHeight).toStrictEqual(60)
    }
  }

  it('should be failed as invalid txid', async () => {
    const rewardAddress = await clients[0].spv.getNewAddress()

    const promise = clients[0].spv.createAnchor([{
      txid: 'INVALID',
      vout: 2,
      amount: 15800,
      privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
    }], rewardAddress)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('txid must be of length 64 (not 7, for \'INVALID\')')
  })

  it('should be failed as not enough money to create anchor', async () => {
    const rewardAddress = await clients[0].spv.getNewAddress()

    const promise = clients[0].spv.createAnchor([{
      txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
      vout: 2,
      amount: 1,
      privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
    }], rewardAddress)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Not enough money to create anchor') // Not enough money to create anchor: 1 (need 3522)
  })

  it('should be failed as invalid privkey', async () => {
    const rewardAddress = await clients[0].spv.getNewAddress()

    const promise = clients[0].spv.createAnchor([{
      txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
      vout: 2,
      amount: 15800,
      privkey: 'INVALID'
    }], rewardAddress)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('spv: Can\'t parse WIF privkey INVALID')
  })

  it('should be failed as invalid address', async () => {
    const promise = clients[0].spv.createAnchor([{
      txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
      vout: 2,
      amount: 15800,
      privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
    }], 'INVALID')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('rewardAddress (INVALID) does not refer to a P2PKH or P2WPKH address')
  })

  it('should createAnchor', async () => {
    const rewardAddress = await clients[0].spv.getNewAddress()

    const anchor = await clients[0].spv.createAnchor([{
      txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
      vout: 2,
      amount: 15800,
      privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
    }], rewardAddress)
    expect(typeof anchor.txHex).toStrictEqual('string')
    expect(typeof anchor.txHash).toStrictEqual('string')
    expect(typeof anchor.defiHash).toStrictEqual('string')
    expect(anchor.defiHeight).toStrictEqual(15)
    expect(anchor.estimatedReward).toStrictEqual(new BigNumber(0))
    expect(anchor.cost).toStrictEqual(new BigNumber(3556))
    expect(anchor.sendResult).toStrictEqual(0)
    expect(anchor.sendMessage).toStrictEqual('Success')

    {
      const pending = await group.get(0).call('spv_listanchorspending')
      // pending does not contain active property
      expect(pending.active).toBeUndefined()
    }

    // generate the anchor block
    await group.get(0).generate(1)

    // pending is cleared
    {
      const pending = await group.get(0).call('spv_listanchorspending')
      expect(pending.length).toStrictEqual(0)
    }

    // should be not active yet
    const anchors = await group.get(0).call('spv_listanchors')
    expect(anchors.length).toStrictEqual(1)
    expect(anchors[0].btcBlockHeight).toStrictEqual(0)
    expect(typeof anchors[0].btcBlockHash).toStrictEqual('string')
    expect(typeof anchors[0].btcTxHash).toStrictEqual('string')
    expect(typeof anchors[0].previousAnchor).toStrictEqual('string')
    expect(anchors[0].defiBlockHeight).toStrictEqual(15)
    expect(typeof anchors[0].defiBlockHash).toStrictEqual('string')
    expect(anchors[0].rewardAddress).toStrictEqual(rewardAddress)
    expect(anchors[0].confirmations).toBeLessThan(6)
    expect(anchors[0].signatures).toStrictEqual(2)
    expect(anchors[0].anchorCreationHeight).toStrictEqual(60)
    expect(anchors[0].active).toStrictEqual(false)

    // to activate anchor at min 6 conf
    await group.get(0).call('spv_setlastheight', [6])

    {
      // should be active now
      const anchors = await group.get(0).call('spv_listanchors')
      expect(anchors[0].confirmations).toBeGreaterThanOrEqual(6)
      expect(anchors[0].active).toStrictEqual(true)
    }

    {
      // auths back to zero after the anchor active
      const auths = await group.get(0).call('spv_listanchorauths')
      expect(auths.length).toStrictEqual(0)
    }
  })

  it('should be failed as min anchor quorum was not reached', async () => {
    const auths = await group.get(0).call('spv_listanchorauths')
    expect(auths.length).toStrictEqual(0)

    const rewardAddress = await clients[0].spv.getNewAddress()

    const promise = clients[0].spv.createAnchor([{
      txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
      vout: 2,
      amount: 15800,
      privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
    }], rewardAddress)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Min anchor quorum was not reached!')
  })
})

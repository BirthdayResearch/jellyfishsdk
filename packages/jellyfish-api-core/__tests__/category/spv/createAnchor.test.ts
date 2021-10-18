import { RpcApiError } from '@defichain/jellyfish-api-core'
import { TestingGroup, Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'

describe.skip('Spv', () => {
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

    // check the auth and confirm anchor mn teams at current height 15
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

    {
      // anchor auths length should be still zero
      const auths = await tGroup.get(0).container.call('spv_listanchorauths')
      expect(auths.length).toStrictEqual(0)
    }

    // forward 3 hours from 12 hours ago and generate 15 blocks per hour
    // set 3 hours because block height and hash chosen is then 3 hours
    // then every 15 blocks will be matched again
    // generate 2 anchor auths
    await tGroup.waitForAnchorAuths(async () => await tGroup.anchor.generateAnchorAuths(2, initOffsetHour, 'createAnchor'), 60)
  }

  it('should be failed as invalid txid', async () => {
    const rewardAddress = await tGroup.get(0).rpc.spv.getNewAddress()

    const promise = tGroup.get(0).rpc.spv.createAnchor([{
      txid: 'INVALID',
      vout: 2,
      amount: 15800,
      privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
    }], rewardAddress)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('txid must be of length 64 (not 7, for \'INVALID\')')
  })

  it('should be failed as not enough money to create anchor', async () => {
    const rewardAddress = await tGroup.get(0).rpc.spv.getNewAddress()

    const promise = tGroup.get(0).rpc.spv.createAnchor([{
      txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
      vout: 2,
      amount: 1,
      privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
    }], rewardAddress)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Not enough money to create anchor') // Not enough money to create anchor: 1 (need 3522)
  })

  it('should be failed as invalid privkey', async () => {
    const rewardAddress = await tGroup.get(0).rpc.spv.getNewAddress()

    const promise = tGroup.get(0).rpc.spv.createAnchor([{
      txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
      vout: 2,
      amount: 15800,
      privkey: 'INVALID'
    }], rewardAddress)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('spv: Can\'t parse WIF privkey INVALID')
  })

  it('should be failed as invalid address', async () => {
    const promise = tGroup.get(0).rpc.spv.createAnchor([{
      txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
      vout: 2,
      amount: 15800,
      privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
    }], 'INVALID')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('rewardAddress (INVALID) does not refer to a P2PKH or P2WPKH address')
  })

  it('should createAnchor', async () => {
    const rewardAddress = await tGroup.get(0).rpc.spv.getNewAddress()

    const anchor = await tGroup.get(0).rpc.spv.createAnchor([{
      txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
      vout: 2,
      amount: 15800,
      privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
    }], rewardAddress)
    expect(typeof anchor.txHex).toStrictEqual('string')
    expect(typeof anchor.txHash).toStrictEqual('string')
    expect(typeof anchor.defiHash).toStrictEqual('string')
    expect(typeof anchor.defiHeight).toStrictEqual('number')
    expect(anchor.estimatedReward).toStrictEqual(new BigNumber(0))
    expect(anchor.cost).toStrictEqual(new BigNumber(3556))
    expect(anchor.sendResult).toStrictEqual(0)
    expect(anchor.sendMessage).toStrictEqual('Success')

    // pending anchor list is updated
    {
      const pending = await tGroup.get(0).container.call('spv_listanchorspending')
      expect(pending.length).toStrictEqual(1)
    }

    // generate the anchor block
    await tGroup.get(0).generate(1)

    // pending is cleared
    {
      const pending = await tGroup.get(0).container.call('spv_listanchorspending')
      expect(pending.length).toStrictEqual(0)
    }

    // should be not active yet
    const anchors = await tGroup.get(0).container.call('spv_listanchors')
    expect(anchors.length).toStrictEqual(1)
    expect(anchors[0].btcBlockHeight).toStrictEqual(0)
    expect(typeof anchors[0].btcBlockHash).toStrictEqual('string')
    expect(typeof anchors[0].btcTxHash).toStrictEqual('string')
    expect(typeof anchors[0].previousAnchor).toStrictEqual('string')
    expect(typeof anchors[0].defiBlockHeight).toStrictEqual('number')
    expect(typeof anchors[0].defiBlockHash).toStrictEqual('string')
    expect(anchors[0].rewardAddress).toStrictEqual(rewardAddress)
    expect(anchors[0].confirmations).toBeLessThan(6)
    expect(anchors[0].signatures).toStrictEqual(2)
    expect(typeof anchors[0].anchorCreationHeight).toStrictEqual('number')
    expect(anchors[0].active).toStrictEqual(false)

    // to activate anchor at min 6 conf
    await tGroup.get(0).container.call('spv_setlastheight', [6])

    {
      // should be active now
      const anchors = await tGroup.get(0).container.call('spv_listanchors')
      expect(anchors[0].confirmations).toBeGreaterThanOrEqual(6)
      expect(anchors[0].active).toStrictEqual(true)
    }

    {
      // auths reduce from 2 to 1 after the anchor active
      const auths = await tGroup.get(0).container.call('spv_listanchorauths')
      expect(auths.length).toStrictEqual(1)
    }
  })
})

describe('Spv - createAnchor without quorum', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should be failed as min anchor quorum was not reached', async () => {
    const auths = await testing.container.call('spv_listanchorauths')
    expect(auths.length).toStrictEqual(0)

    const rewardAddress = await testing.rpc.spv.getNewAddress()

    const promise = testing.rpc.spv.createAnchor([{
      txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
      vout: 2,
      amount: 15800,
      privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
    }], rewardAddress)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Min anchor quorum was not reached!')
  })
})

import { createTestingApp, DelayedEunosPayaTestContainer, invalidateFromHeight, stopTestingApp, waitForIndexedHeight } from '../../../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTest } from '@defichain/jellyfish-network'
import { P2WPKH } from '@defichain/jellyfish-address'
import { MasternodeMapper } from '../../../module.model/masternode'
import { MasternodeStatsMapper } from '../../../module.model/masternode.stats'

describe('Update masternode', () => {
  const container = new DelayedEunosPayaTestContainer()
  let app: NestFastifyApplication
  let client: JsonRpcClient
  let masternodeId: string

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    client = new JsonRpcClient(await container.getCachedRpcUrl())

    await container.generate(1)

    const ownerAddress = await client.wallet.getNewAddress()
    masternodeId = await client.masternode.createMasternode(ownerAddress)
    await container.generate(20)

    const height = await client.blockchain.getBlockCount()
    // enable updating
    await client.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/mn-setowneraddress': 'true',
        'v0/params/feature/mn-setoperatoraddress': 'true',
        'v0/params/feature/mn-setrewardaddress': 'true'
      }
    })
    await container.generate(70)
    await waitForIndexedHeight(app, height)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should index update operatorAddress, ownerAddress, and rewardAddress in masternode', async () => {
    const masternodeMapper = app.get(MasternodeMapper)
    const masternode = await masternodeMapper.get(masternodeId)
    expect(masternode).not.toStrictEqual(undefined)

    const address = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, address, P2WPKH)

    await client.masternode.updateMasternode(masternodeId, {
      operatorAddress: addressDest.utf8String,
      rewardAddress: addressDest.utf8String
      // ownerAddress: addressDest.utf8String // @TODO(kvenho) Blockchain is not fix yet
    })

    await container.generate(1)
    const updateHeight = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, updateHeight)

    const gotMasternodeForReward = await client.masternode.getMasternode(masternodeId)
    // expect(gotMasternodeForReward[masternodeId]?.ownerAuthAddress).toStrictEqual(addressDest.utf8String) // @TODO(kvenho) Blockchain is not fix yet
    expect(gotMasternodeForReward[masternodeId]?.operatorAuthAddress).toStrictEqual(addressDest.utf8String)
    expect(gotMasternodeForReward[masternodeId]?.rewardAddress).toStrictEqual(addressDest.utf8String)

    const updatedMasternode = await masternodeMapper.get(masternodeId)
    expect(updatedMasternode?.operatorAddress).toStrictEqual(addressDest.utf8String)
    // expect(updatedMasternode?.ownerAddress).toStrictEqual(addressDest.utf8String) // @TODO(kvenho) Blockchain is not fix yet

    const masternodeStatsMapper = app.get(MasternodeStatsMapper)
    const masternodeStats = await masternodeStatsMapper.getLatest()
    expect(masternodeStats?.stats).toStrictEqual({
      count: 8,
      tvl: '80.00000000',
      locked: [
        {
          weeks: 0,
          count: 8,
          tvl: '80.00000000'
        }
      ]
    })
  })

  it('should index update remove rewardAddress in masternode', async () => {
    const gotBlockCount = await client.blockchain.getBlockCount()
    await client.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/mn-setowneraddress': 'true',
        'v0/params/feature/mn-setoperatoraddress': 'true',
        'v0/params/feature/mn-setrewardaddress': 'true'
      }
    })
    await container.generate(70)
    await waitForIndexedHeight(app, gotBlockCount)

    await client.masternode.updateMasternode(masternodeId, {
      rewardAddress: ''
    })

    await container.generate(1)
    const updateAgainHeight = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, updateAgainHeight)

    const gotMasternodeForRewardAgain = await client.masternode.getMasternode(masternodeId)
    expect(gotMasternodeForRewardAgain[masternodeId]?.rewardAddress).toStrictEqual('')
  })
})

describe('invalidate', () => {
  const container = new DelayedEunosPayaTestContainer()
  let app: NestFastifyApplication
  let client: JsonRpcClient

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    client = new JsonRpcClient(await container.getCachedRpcUrl())
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should update masternode and invalidate', async () => {
    await container.generate(1)

    const ownerAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress)
    await container.generate(20)

    const height = await client.blockchain.getBlockCount()
    // enable updating
    await client.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/mn-setowneraddress': 'true',
        'v0/params/feature/mn-setoperatoraddress': 'true',
        'v0/params/feature/mn-setrewardaddress': 'true'
      }
    })
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const masternodeMapper = app.get(MasternodeMapper)
    const masternode = await masternodeMapper.get(masternodeId)

    expect(masternode).not.toStrictEqual(undefined)

    const address = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, address, P2WPKH)
    const addressDestHex = addressDest.utf8String

    await client.masternode.updateMasternode(masternodeId, { operatorAddress: addressDestHex })

    await container.generate(1)
    const updateHeight = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, updateHeight)

    const updateMasternode = await masternodeMapper.get(masternodeId)
    expect(updateMasternode?.operatorAddress).toStrictEqual(addressDestHex)
    expect(updateMasternode?.updateRecords?.length).toStrictEqual(2)

    await invalidateFromHeight(app, container, updateHeight)
    await container.generate(2)
    await waitForIndexedHeight(app, updateHeight)

    {
      const invalidatedMasternode = await masternodeMapper.get(masternodeId)
      const initialAddressDest: P2WPKH = P2WPKH.fromAddress(RegTest, ownerAddress, P2WPKH)
      const initialAddressDestHex = initialAddressDest.utf8String

      expect(invalidatedMasternode?.ownerAddress).toStrictEqual(initialAddressDestHex)
      expect(invalidatedMasternode?.operatorAddress).toStrictEqual(initialAddressDestHex)
      expect(invalidatedMasternode?.updateRecords?.length).toStrictEqual(1)
    }
  })
})

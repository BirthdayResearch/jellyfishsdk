import {
  createTestingApp,
  DelayedEunosPayaTestContainer,
  invalidateFromHeight,
  stopTestingApp,
  waitForIndexedHeight
} from '../../../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTest } from '@defichain/jellyfish-network'
import { P2WPKH } from '@defichain/jellyfish-address'
import { MasternodeMapper } from '../../../module.model/masternode'
import { AddressType } from '@defichain/jellyfish-api-core/dist/category/wallet'

describe('Update masternode', () => {
  const container = new DelayedEunosPayaTestContainer()
  let app: NestFastifyApplication
  let client: JsonRpcClient
  let masternodeId: string
  let ownerAddress: string

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    client = new JsonRpcClient(await container.getCachedRpcUrl())

    await container.generate(1)

    ownerAddress = await client.wallet.getNewAddress()
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
      rewardAddress: addressDest.utf8String,
      ownerAddress: addressDest.utf8String
    })

    await container.generate(20)
    const updateHeight1 = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, updateHeight1)

    const mnResultExpectTransferring = await client.masternode.getMasternode(masternodeId)
    expect(mnResultExpectTransferring[masternodeId].state).toStrictEqual('TRANSFERRING')

    await container.generate(30)
    const updateHeight2 = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, updateHeight2)

    const mnResultExpectPreEnable = await client.masternode.getMasternode(masternodeId)
    expect(mnResultExpectPreEnable[masternodeId].state).toStrictEqual('PRE_ENABLED')

    await container.generate(20)
    const updateHeight3 = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, updateHeight3)

    const mnResult = await client.masternode.getMasternode(masternodeId)
    expect(mnResult[masternodeId]).toStrictEqual({
      ownerAuthAddress: addressDest.utf8String,
      operatorAuthAddress: addressDest.utf8String,
      rewardAddress: addressDest.utf8String,
      creationHeight: 103,
      resignHeight: -1,
      resignTx: expect.stringMatching(/[0-9a-f]{64}/),
      collateralTx: expect.stringMatching(/[0-9a-f]{64}/),
      state: 'ENABLED',
      mintedBlocks: 0,
      ownerIsMine: true,
      operatorIsMine: true,
      localMasternode: false,
      targetMultipliers: [1, 1]
    })

    const updatedMasternode = await masternodeMapper.get(masternodeId)
    expect(updatedMasternode).toStrictEqual({
      id: expect.stringMatching(/[0-9a-f]{64}/),
      sort: expect.stringMatching(/[0-9a-f]{72}/),
      ownerAddress: addressDest.utf8String,
      operatorAddress: addressDest.utf8String,
      creationHeight: 103,
      resignHeight: -1,
      mintedBlocks: 0,
      timelock: 0,
      block: {
        hash: expect.stringMatching(/[0-9a-f]{64}/),
        height: 103,
        medianTime: expect.any(Number),
        time: expect.any(Number)
      },
      collateral: '2.00000000',
      history: [
        {
          txid: expect.stringMatching(/[0-9a-f]{64}/),
          ownerAddress: addressDest.utf8String,
          operatorAddress: addressDest.utf8String
        },
        {
          txid: expect.stringMatching(/[0-9a-f]{64}/),
          ownerAddress: ownerAddress,
          operatorAddress: ownerAddress
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
  let masternodeMapper: MasternodeMapper

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    masternodeMapper = app.get(MasternodeMapper)
    client = new JsonRpcClient(await container.getCachedRpcUrl())

    await client.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/mn-setowneraddress': 'true',
        'v0/params/feature/mn-setoperatoraddress': 'true',
        'v0/params/feature/mn-setrewardaddress': 'true'
      }
    })

    await container.generate(1)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should update masternode and invalidate', async () => {
    const ownerAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress)
    await container.generate(20)

    const height = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const masternode = await masternodeMapper.get(masternodeId)

    expect(masternode).not.toStrictEqual(undefined)
    expect(masternode?.history?.length).toStrictEqual(undefined)

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
    expect(updateMasternode?.history?.length).toStrictEqual(2)

    await invalidateFromHeight(app, container, updateHeight)
    await container.generate(2)
    await waitForIndexedHeight(app, updateHeight)

    {
      const invalidatedMasternode = await masternodeMapper.get(masternodeId)
      const initialAddressDest: P2WPKH = P2WPKH.fromAddress(RegTest, ownerAddress, P2WPKH)
      const initialAddressDestHex = initialAddressDest.utf8String

      expect(invalidatedMasternode?.ownerAddress).toStrictEqual(initialAddressDestHex)
      expect(invalidatedMasternode?.operatorAddress).toStrictEqual(initialAddressDestHex)
      expect(invalidatedMasternode?.history?.length).toStrictEqual(1)
    }
  })

  it('should update masternode and invalidate and update again', async () => {
    const initialOwnerAddress = await client.wallet.getNewAddress('', AddressType.BECH32)
    const masternodeId = await client.masternode.createMasternode(initialOwnerAddress)
    await container.generate(20)

    const height = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const newAddress = await container.getNewAddress('', 'bech32')

    const updatedTxId = await client.masternode.updateMasternode(masternodeId, {
      operatorAddress: P2WPKH.fromAddress(RegTest, newAddress, P2WPKH)?.utf8String
    })

    await container.generate(1)
    const updateHeight = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, updateHeight)

    { // Validate Updated
      const updateMasternode = await masternodeMapper.get(masternodeId)
      expect(updateMasternode).toStrictEqual(expect.objectContaining({
        operatorAddress: newAddress,
        history: [
          {
            txid: updatedTxId,
            ownerAddress: initialOwnerAddress,
            operatorAddress: newAddress
          },
          {
            txid: masternodeId,
            ownerAddress: initialOwnerAddress,
            operatorAddress: initialOwnerAddress
          }
        ]
      }))
    }

    await invalidateFromHeight(app, container, updateHeight)
    await container.generate(2)
    await waitForIndexedHeight(app, updateHeight)

    { // Validate Invalided
      const invalidatedMasternode = await masternodeMapper.get(masternodeId)
      expect(invalidatedMasternode).toStrictEqual(expect.objectContaining({
        operatorAddress: initialOwnerAddress,
        ownerAddress: initialOwnerAddress,
        history: [
          {
            txid: masternodeId,
            ownerAddress: initialOwnerAddress,
            operatorAddress: initialOwnerAddress
          }
        ]
      }))
    }

    const updated2TxId = await client.masternode.updateMasternode(masternodeId, {
      ownerAddress: P2WPKH.fromAddress(RegTest, newAddress, P2WPKH)?.utf8String
    })

    await container.generate(1)
    const updateHeight2 = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, updateHeight2)

    { // Validate Updated
      const updateMasternode = await masternodeMapper.get(masternodeId)
      expect(updateMasternode).toStrictEqual(expect.objectContaining({
        ownerAddress: newAddress,
        operatorAddress: initialOwnerAddress,
        history: [
          {
            txid: updated2TxId,
            ownerAddress: newAddress,
            operatorAddress: initialOwnerAddress
          },
          {
            txid: masternodeId,
            ownerAddress: initialOwnerAddress,
            operatorAddress: initialOwnerAddress
          }
        ]
      }))
    }
  })
})

import { ContainerGroup, GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { AddressType } from '../../../src/category/wallet'
import { MasternodeTimeLock } from '../../../src/category/masternode'

describe('Masternode', () => {
  const group = new ContainerGroup([
    new MasterNodeRegTestContainer(GenesisKeys[0]),
    new MasterNodeRegTestContainer(GenesisKeys[1])
  ])

  const clientA = new ContainerAdapterClient(group.get(0))
  const clientB = new ContainerAdapterClient(group.get(1))

  beforeAll(async () => {
    await group.start()
    await group.get(0).waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await group.stop()
  })

  // timelock 10 -> 4, 5 -> 3, 0 -> 2
  it('should createMasternode targetMultiplier checker', async () => {
    const addrA0 = await clientA.wallet.getNewAddress('mnA0', AddressType.LEGACY)
    const mnIdA0 = await clientA.masternode.createMasternode(addrA0)
    await group.waitForMempoolSync(mnIdA0)

    const addrA5 = await clientA.wallet.getNewAddress('mnA5', AddressType.LEGACY)
    const mnIdA5 = await clientA.masternode.createMasternode(addrA5, '', { utxos: [], timelock: MasternodeTimeLock.FIVE_YEAR })
    await group.waitForMempoolSync(mnIdA5)

    const addrA10 = await clientA.wallet.getNewAddress('mnA10', AddressType.LEGACY)
    const mnIdA10 = await clientA.masternode.createMasternode(addrA10, '', { utxos: [], timelock: MasternodeTimeLock.TEN_YEAR })
    await group.waitForMempoolSync(mnIdA10)

    const addrB0 = await clientB.wallet.getNewAddress('mnB0', AddressType.LEGACY)
    const mnIdB0 = await clientB.masternode.createMasternode(addrB0)
    await group.waitForMempoolSync(mnIdB0)

    {
      await group.get(0).generate(1)
      await group.get(1).generate(1)
      await group.waitForSync()

      const mnA0 = (await clientA.masternode.getMasternode(mnIdA0))[mnIdA0]
      console.log('mnA0: ', mnA0.state, mnA0.targetMultipliers)
      expect(mnA0.targetMultipliers).toStrictEqual(undefined)

      const mnA5 = (await clientA.masternode.getMasternode(mnIdA5))[mnIdA5]
      console.log('mnA5: ', mnA5.state, mnA5.targetMultipliers)
      expect(mnA5.targetMultipliers).toStrictEqual(undefined)

      const mnA10 = (await clientA.masternode.getMasternode(mnIdA10))[mnIdA10]
      console.log('mnA10: ', mnA10.state, mnA10.targetMultipliers)
      expect(mnA10.targetMultipliers).toStrictEqual(undefined)

      const mnB0 = (await clientB.masternode.getMasternode(mnIdB0))[mnIdB0]
      console.log('mnB0: ', mnB0.state, mnB0.targetMultipliers)
      expect(mnB0.targetMultipliers).toStrictEqual(undefined)
    }

    {
      await group.get(0).generate(20)
      await group.get(1).generate(20)
      await group.waitForSync()

      const mnA0 = (await clientA.masternode.getMasternode(mnIdA0))[mnIdA0]
      console.log('mnA0: ', mnA0.state, mnA0.targetMultipliers)
      expect(mnA0.targetMultipliers).toStrictEqual([1, 1])

      const mnA5 = (await clientA.masternode.getMasternode(mnIdA5))[mnIdA5]
      console.log('mnA5: ', mnA5.state, mnA5.targetMultipliers)
      expect(mnA5.targetMultipliers).toStrictEqual([1, 1, 1])

      const mnA10 = (await clientA.masternode.getMasternode(mnIdA10))[mnIdA10]
      console.log('mnA10: ', mnA10.state, mnA10.targetMultipliers)
      expect(mnA10.targetMultipliers).toStrictEqual([1, 1, 1, 1])

      const mnB0 = (await clientB.masternode.getMasternode(mnIdB0))[mnIdB0]
      console.log('mnB0: ', mnB0.state, mnB0.targetMultipliers)
      expect(mnB0.targetMultipliers).toStrictEqual([1, 1])
    }

    {
      // time travel a day
      await clientA.misc.setMockTime(Date.now() + 1e3 * 60 * 60 * 24)
      await clientB.misc.setMockTime(Date.now() + 1e3 * 60 * 60 * 24)
      await group.get(0).generate(1)
      await group.get(1).generate(1)
      await group.waitForSync()

      const mnA0 = (await clientA.masternode.getMasternode(mnIdA0))[mnIdA0]
      console.log('mnA0: ', mnA0.state, mnA0.targetMultipliers)
      expect(mnA0.targetMultipliers).toStrictEqual([4, 4])

      const mnA5 = (await clientA.masternode.getMasternode(mnIdA5))[mnIdA5]
      console.log('mnA5: ', mnA5.state, mnA5.targetMultipliers)
      expect(mnA5.targetMultipliers).toStrictEqual([4, 4, 4])

      const mnA10 = (await clientA.masternode.getMasternode(mnIdA10))[mnIdA10]
      console.log('mnA10: ', mnA10.state, mnA10.targetMultipliers)
      expect(mnA10.targetMultipliers).toStrictEqual([4, 4, 4, 4])

      const mnB0 = (await clientB.masternode.getMasternode(mnIdB0))[mnIdB0]
      console.log('mnB0: ', mnB0.state, mnB0.targetMultipliers)
      expect(mnB0.targetMultipliers).toStrictEqual([4, 4])
    }

    {
      // time travel a week
      await clientA.misc.setMockTime(Date.now() + 1e3 * 60 * 60 * 24 * 7)
      await clientB.misc.setMockTime(Date.now() + 1e3 * 60 * 60 * 24 * 7)
      await group.get(0).generate(1)
      await group.get(1).generate(1)
      await group.waitForSync()

      const mnA0 = (await clientA.masternode.getMasternode(mnIdA0))[mnIdA0]
      console.log('mnA0: ', mnA0.state, mnA0.targetMultipliers)
      expect(mnA0.targetMultipliers).toStrictEqual([28, 28])

      const mnA5 = (await clientA.masternode.getMasternode(mnIdA5))[mnIdA5]
      console.log('mnA5: ', mnA5.state, mnA5.targetMultipliers)
      expect(mnA5.targetMultipliers).toStrictEqual([28, 28, 28])

      const mnA10 = (await clientA.masternode.getMasternode(mnIdA10))[mnIdA10]
      console.log('mnA10: ', mnA10.state, mnA10.targetMultipliers)
      expect(mnA10.targetMultipliers).toStrictEqual([28, 28, 28, 28])

      const mnB0 = (await clientB.masternode.getMasternode(mnIdB0))[mnIdB0]
      console.log('mnB0: ', mnB0.state, mnB0.targetMultipliers)
      expect(mnB0.targetMultipliers).toStrictEqual([28, 28])
    }

    {
      // time travel 30 days, max tm - 57
      await clientA.misc.setMockTime(Date.now() + 1e3 * 60 * 60 * 24 * 30)
      await clientB.misc.setMockTime(Date.now() + 1e3 * 60 * 60 * 24 * 30)
      await group.get(0).generate(1)
      await group.get(1).generate(1)
      await group.waitForSync()

      const mnA0 = (await clientA.masternode.getMasternode(mnIdA0))[mnIdA0]
      console.log('mnA0: ', mnA0.state, mnA0.targetMultipliers)
      expect(mnA0.targetMultipliers).toStrictEqual([57, 57])

      const mnA5 = (await clientA.masternode.getMasternode(mnIdA5))[mnIdA5]
      console.log('mnA5: ', mnA5.state, mnA5.targetMultipliers)
      expect(mnA5.targetMultipliers).toStrictEqual([57, 57, 57])

      const mnA10 = (await clientA.masternode.getMasternode(mnIdA10))[mnIdA10]
      console.log('mnA10: ', mnA10.state, mnA10.targetMultipliers)
      expect(mnA10.targetMultipliers).toStrictEqual([57, 57, 57, 57])

      const mnB0 = (await clientB.masternode.getMasternode(mnIdB0))[mnIdB0]
      console.log('mnB0: ', mnB0.state, mnB0.targetMultipliers)
      expect(mnB0.targetMultipliers).toStrictEqual([57, 57])
    }
  })
})

import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'

describe('Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('any', async () => {
    {
      const masternodeList = await testing.rpc.masternode.listMasternodes()
      const arr = Object.values(masternodeList)
      console.log(arr.length)
    }

    const ownerAddress1 = await testing.rpc.wallet.getNewAddress()
    await testing.rpc.masternode.createMasternode(ownerAddress1)
    await testing.generate(1)

    const ownerAddress2 = await testing.rpc.wallet.getNewAddress()
    await testing.rpc.masternode.createMasternode(ownerAddress2)
    await testing.generate(1)

    {
      const masternodeList = await testing.rpc.masternode.listMasternodes()
      const arr = Object.values(masternodeList)
      console.log(arr.length)
    }
  })
})

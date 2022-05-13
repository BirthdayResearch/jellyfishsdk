// import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
// import { createTestingApp } from '@defichain-apps/nest-apps/whale/src/e2e.module'

// let app: NestFastifyApplication
const tGroup = TestingGroup.create(2, i => new MasterNodeRegTestContainer(RegTestFoundationKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)

describe('Masternode', () => {
  beforeAll(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()
    // app = await createTestingApp(alice.container)
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('any', async () => {
    const ownerAddress1 = await alice.rpc.wallet.getNewAddress()
    await alice.rpc.masternode.createMasternode(ownerAddress1)
    await alice.generate(1)

    const ownerAddress2 = await alice.rpc.wallet.getNewAddress()
    const tx = await alice.rpc.masternode.createMasternode(ownerAddress2)
    await alice.generate(1)

    const ownerAddress3 = await alice.rpc.wallet.getNewAddress()

    {
      const promise = alice.rpc.masternode.updateMasternode(tx, { ownerAddress: ownerAddress3 })
      await expect(promise).rejects.toThrow("RpcApiError: 'Test UpdateMasternodeTx execution failed:\n" +
        "called before GreatWorld height', code: -32600, method: updatemasternode")
    }

    await alice.generate(10)

    {
      const promise = alice.rpc.masternode.updateMasternode(tx, { ownerAddress: ownerAddress3 })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`RpcApiError: 'Test UpdateMasternodeTx execution failed:\nMasternode ${tx} is not in 'ENABLED' state', code: -32600, method: updatemasternode`)
    }

    await alice.generate(50)

    {
      const promise = alice.rpc.masternode.updateMasternode(tx, { ownerAddress: ownerAddress2 })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateMasternodeTx execution failed:\nMasternode with that owner address already exists\', code: -32600, method: updatemasternode')
    }

    {
      const promise = bob.rpc.masternode.updateMasternode(tx, { ownerAddress: ownerAddress2 })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`RpcApiError: 'Incorrect authorization for ${ownerAddress2}', code: -5, method: updatemasternode`)
    }

    {
      const promise = alice.rpc.masternode.updateMasternode('3e1e9a9595b81bb78b4cc176c7eacbe8557df78da55545f35b8bc5b7a9d022bb', { ownerAddress: ownerAddress2 })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`RpcApiError: 'Incorrect authorization for ${ownerAddress2}', code: -5, method: updatemasternode`)
    }
  })
})

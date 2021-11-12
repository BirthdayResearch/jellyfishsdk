import { RpcApiError } from '@defichain/jellyfish-api-core'
import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createPoolPair, createToken } from '@defichain/testing'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    const govBefore = await client.masternode.getGov('LP_SPLITS')
    expect(Object.keys(govBefore.LP_SPLITS).length).toStrictEqual(0)

    await createToken(container, 'CAT')
    await createToken(container, 'DOG')
    await createPoolPair(container, 'CAT', 'DFI')
    await createPoolPair(container, 'DOG', 'DFI')
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should setGov LP_SPLITS', async () => {
    await client.masternode.setGov({ LP_SPLITS: { 3: 0.2, 4: 0.8 } })
    await container.generate(1)

    const govAfter = await client.masternode.getGov('LP_SPLITS')
    expect(govAfter.LP_SPLITS['3'].toString()).toStrictEqual('0.2')
    expect(govAfter.LP_SPLITS['4'].toString()).toStrictEqual('0.8')
  })

  it('should setGov with specific utxos', async () => {
    const utxo = await container.fundAddress(GenesisKeys[0].owner.address, 10)

    { // before utxo spent
      const utxos = await container.call('listunspent')
      const found = utxos.find((u: any) => u.txid === utxo.txid && u.vout === utxo.vout)
      expect(found).not.toStrictEqual(undefined)
    }

    await client.masternode.setGov({ LP_SPLITS: { 3: 0.3, 4: 0.7 } }, [utxo])
    await container.generate(1)

    const govAfter = await client.masternode.getGov('LP_SPLITS')
    expect(govAfter.LP_SPLITS['3'].toString()).toStrictEqual('0.3')
    expect(govAfter.LP_SPLITS['4'].toString()).toStrictEqual('0.7')

    { // after utxo spent
      const utxos = await container.call('listunspent')
      const found = utxos.find((u: any) => u.txid === utxo.txid && u.vout === utxo.vout)
      expect(found).toStrictEqual(undefined)
    }
  })

  it('should fail if GovVar key is not registered', async () => {
    const promise = client.masternode.setGov({ INVALID: 'value' })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Variable INVALID not registered')
  })

  it('should be failed to setGov LP_REWARD as manually set after Eunos hard fork is not allowed', async () => {
    const promise = client.masternode.setGov({ LP_DAILY_DFI_REWARD: 999.00293001 })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('LP_DAILY_DFI_REWARD: Cannot be set manually after Eunos hard fork')
  })
})

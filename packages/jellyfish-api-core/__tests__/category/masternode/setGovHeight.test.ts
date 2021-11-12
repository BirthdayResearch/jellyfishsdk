import { RpcApiError } from '@defichain/jellyfish-api-core'
import { GenesisKeys, LoanMasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createPoolPair, createToken } from '@defichain/testing'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Masternode', () => {
  let container!: LoanMasterNodeRegTestContainer
  let client!: ContainerAdapterClient

  beforeEach(async () => {
    container = new LoanMasterNodeRegTestContainer()
    client = new ContainerAdapterClient(container)

    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    const govVar = await client.masternode.getGov('LP_SPLITS')
    expect(Object.keys(govVar.LP_SPLITS).length).toStrictEqual(0)

    await createToken(container, 'CAT')
    await createToken(container, 'DOG')
    await createPoolPair(container, 'CAT', 'DFI')
    await createPoolPair(container, 'DOG', 'DFI')

    // to fix each test starting value
    await client.masternode.setGov({ LP_SPLITS: { 3: 0.2, 4: 0.8 } })
    await container.generate(1)

    {
      const govVars = await client.masternode.listGovs()
      expect(govVars.length).toBeGreaterThan(0)

      const liqSplits = govVars.find(l => l[0]?.LP_SPLITS !== undefined) as Array<Record<string, any>>
      expect(liqSplits).toBeDefined()
      expect(liqSplits.length).toStrictEqual(1)
      expect(liqSplits[0].LP_SPLITS['3'].toString()).toStrictEqual('0.2')
      expect(liqSplits[0].LP_SPLITS['4'].toString()).toStrictEqual('0.8')
    }
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should setGovHeight', async () => {
    const currentHeight = await client.blockchain.getBlockCount()
    const activationHeight = currentHeight + 3
    await client.masternode.setGovHeight({ LP_SPLITS: { 3: 0.4, 4: 0.6 } }, activationHeight)
    await container.generate(1)

    { // before new GovVar activated
      const govVars = await client.masternode.listGovs()
      expect(govVars.length).toBeGreaterThan(0)

      const liqSplits = govVars.find(l => l[0]?.LP_SPLITS !== undefined) as Array<Record<string, any>>
      expect(liqSplits).toBeDefined()
      expect(liqSplits.length).toStrictEqual(2)
      expect(liqSplits[0].LP_SPLITS['3'].toString()).toStrictEqual('0.2')
      expect(liqSplits[0].LP_SPLITS['4'].toString()).toStrictEqual('0.8')
      expect(liqSplits[1][activationHeight]['3'].toString()).toStrictEqual('0.4')
      expect(liqSplits[1][activationHeight]['4'].toString()).toStrictEqual('0.6')
    }

    await container.generate(2)

    { // after new GovVar activated
      const govVars = await client.masternode.listGovs()
      expect(govVars.length).toBeGreaterThan(0)

      const liqSplits = govVars.find(l => l[0]?.LP_SPLITS !== undefined) as Array<Record<string, any>>
      expect(liqSplits).toBeDefined()
      expect(liqSplits.length).toStrictEqual(1)
      expect(liqSplits[0].LP_SPLITS['3'].toString()).toStrictEqual('0.4')
      expect(liqSplits[0].LP_SPLITS['4'].toString()).toStrictEqual('0.6')
    }
  })

  it('should setGovHeight with specific utxos', async () => {
    const utxo = await container.fundAddress(GenesisKeys[0].owner.address, 10)

    { // before utxo spent
      const utxos = await client.wallet.listUnspent(1, 99999, { addresses: [GenesisKeys[0].owner.address] })
      const found = utxos.find((u: any) => u.txid === utxo.txid && u.vout === utxo.vout)
      expect(found).not.toStrictEqual(undefined)
    }

    const currentHeight = await client.blockchain.getBlockCount()
    const activationHeight = currentHeight + 3

    await client.masternode.setGovHeight({ LP_SPLITS: { 3: 0.9, 4: 0.1 } }, activationHeight, [utxo])
    await container.generate(1)

    const govVars = await client.masternode.listGovs()
    expect(govVars.length).toBeGreaterThan(0)

    const liqSplits = govVars.find(l => l[0]?.LP_SPLITS !== undefined) as Array<Record<string, any>>
    expect(liqSplits).toBeDefined()
    expect(liqSplits.length).toStrictEqual(2)
    expect(liqSplits[0].LP_SPLITS['3'].toString()).toStrictEqual('0.2')
    expect(liqSplits[0].LP_SPLITS['4'].toString()).toStrictEqual('0.8')
    expect(liqSplits[1][activationHeight]['3'].toString()).toStrictEqual('0.9')
    expect(liqSplits[1][activationHeight]['4'].toString()).toStrictEqual('0.1')

    { // after utxo spent
      const utxos = await client.wallet.listUnspent(1, 99999, { addresses: [GenesisKeys[0].owner.address] })
      const found = utxos.find((u: any) => u.txid === utxo.txid && u.vout === utxo.vout)
      expect(found).toStrictEqual(undefined)
    }
  })

  it('should fail if GovVar key is not registered', async () => {
    const currentHeight = await client.blockchain.getBlockCount()
    const activationHeight = currentHeight + 2
    const promise = client.masternode.setGovHeight({ INVALID: 'value' }, activationHeight)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Variable INVALID not registered')
  })

  it('should fail if set activation height is lower than current height', async () => {
    const currentHeight = await client.blockchain.getBlockCount()
    const activationHeight = currentHeight - 2
    const promise = client.masternode.setGovHeight({ LP_SPLITS: { 3: 0.4, 4: 0.6 } }, activationHeight)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('startHeight must be above the current block height')
  })
})

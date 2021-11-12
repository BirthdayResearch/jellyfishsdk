import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createPoolPair, createToken } from '@defichain/testing'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    const govsBefore = await client.masternode.listGovs()
    expect(govsBefore.length).toBeGreaterThan(0)
    const liqSplits = govsBefore.find(l => l[0]?.LP_SPLITS !== undefined) as Array<Record<string, any>>
    expect(liqSplits).toBeDefined()
    expect(Object.keys(liqSplits[0].LP_SPLITS).length).toStrictEqual(0)

    await createToken(container, 'CAT')
    await createToken(container, 'DOG')
    await createPoolPair(container, 'CAT', 'DFI')
    await createPoolPair(container, 'DOG', 'DFI')
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should listGovs', async () => {
    await client.masternode.setGov({ LP_SPLITS: { 3: 0.2, 4: 0.8 } })
    await container.generate(1)

    const govVars = await client.masternode.listGovs()
    expect(govVars.length).toBeGreaterThan(0)
    const liqSplits = govVars.find(l => l[0]?.LP_SPLITS !== undefined) as Array<Record<string, any>>
    expect(liqSplits).toBeDefined()
    expect(liqSplits.length).toStrictEqual(1)
    expect(liqSplits[0].LP_SPLITS['3'].toString()).toStrictEqual('0.2')
    expect(liqSplits[0].LP_SPLITS['4'].toString()).toStrictEqual('0.8')
  })

  it('should listGovs with extra data for setGovHeight before activated', async () => {
    // reset value
    await client.masternode.setGov({ LP_SPLITS: { 3: 0.3, 4: 0.7 } })
    await container.generate(1)

    const currentHeight = await client.blockchain.getBlockCount()
    const activationHeight = currentHeight + 3

    await client.masternode.setGovHeight({ LP_SPLITS: { 3: 0.9, 4: 0.1 } }, activationHeight)
    await container.generate(1)

    const govVars = await client.masternode.listGovs()
    expect(govVars.length).toBeGreaterThan(0)
    const liqSplits = govVars.find(l => l[0]?.LP_SPLITS !== undefined) as Array<Record<string, any>>
    expect(liqSplits).toBeDefined()
    expect(liqSplits.length).toStrictEqual(2)
    expect(liqSplits[0].LP_SPLITS['3'].toString()).toStrictEqual('0.3')
    expect(liqSplits[0].LP_SPLITS['4'].toString()).toStrictEqual('0.7')
    expect(liqSplits[1][activationHeight]['3'].toString()).toStrictEqual('0.9')
    expect(liqSplits[1][activationHeight]['4'].toString()).toStrictEqual('0.1')
  })
})

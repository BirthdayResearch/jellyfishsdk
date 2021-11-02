// `getGov` RPC response has different structure after FC (activation height introduced)
// it is same RPC function call (getGov.test.ts) but with different version of defid

import { BigNumber, RpcApiError } from '@defichain/jellyfish-api-core'
import { Testing } from '@defichain/jellyfish-testing'
import { LoanMasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Masternode', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const testing = Testing.create(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    // extra setup
    await testing.token.create({ symbol: 'CAT' })
    await testing.token.create({ symbol: 'DOG' })
    await testing.generate(1)
    await testing.poolpair.create({ tokenA: 'CAT', tokenB: 'DFI' })
    await testing.poolpair.create({ tokenA: 'DOG', tokenB: 'DFI' })
    await testing.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getGov LP_DAILY_DFI_REWARD', async () => {
    const gov = await client.masternode.getGovWithHeight('LP_DAILY_DFI_REWARD')
    expect(gov.length).toStrictEqual(1)
    expect(gov[0].LP_DAILY_DFI_REWARD).toStrictEqual(expect.any(BigNumber))
  })

  it('should getGov LP_SPLITS', async () => {
    const hash = await client.masternode.setGov({ LP_SPLITS: { 3: 0.2, 4: 0.8 } })
    expect(hash.length).toStrictEqual(64)
    await container.generate(1)

    const gov = await client.masternode.getGovWithHeight('LP_SPLITS')
    expect(gov.length).toStrictEqual(1)
    expect(gov[0].LP_SPLITS['3'].toString()).toStrictEqual('0.2')
    expect(gov[0].LP_SPLITS['4'].toString()).toStrictEqual('0.8')
  })

  it('should getGov get extra data with activation height', async () => {
    const currentHeight = await client.blockchain.getBlockCount()
    await client.masternode.setGov({ LP_SPLITS: { 3: 0.2, 4: 0.8 } })
    await client.masternode.setGovWithHeight({ LP_SPLITS: { 3: 0.3, 4: 0.7 } }, currentHeight + 5)
    await client.masternode.setGovWithHeight({ LP_SPLITS: { 3: 0.4, 4: 0.6 } }, currentHeight + 10)
    await container.generate(1)

    const lpSplits = await client.masternode.getGovWithHeight('LP_SPLITS')
    expect(lpSplits.length).toStrictEqual(3)
    expect(lpSplits[0].LP_SPLITS['3'].toString()).toStrictEqual('0.2')
    expect(lpSplits[0].LP_SPLITS['4'].toString()).toStrictEqual('0.8')
    expect(lpSplits[1][currentHeight + 5]['3'].toString()).toStrictEqual('0.3')
    expect(lpSplits[1][currentHeight + 5]['4'].toString()).toStrictEqual('0.7')
    expect(lpSplits[2][currentHeight + 10]['3'].toString()).toStrictEqual('0.4')
    expect(lpSplits[2][currentHeight + 10]['4'].toString()).toStrictEqual('0.6')
  })

  it('should be failed as variable REWARD is not registered', async () => {
    const promise = client.masternode.getGovWithHeight('REWARD')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Variable \'REWARD\' not registered')
  })
})

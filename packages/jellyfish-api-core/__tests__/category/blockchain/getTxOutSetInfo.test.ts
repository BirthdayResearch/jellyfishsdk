import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

describe('TxOutSetInfo', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getTxOutSetInfo', async () => {
    const txOutSetInfo = await client.blockchain.getTxOutSetInfo()

    expect(txOutSetInfo.height).toBeGreaterThanOrEqual(1)
    expect(txOutSetInfo).toHaveProperty('bestblock')
    expect(txOutSetInfo.transactions).toBeGreaterThanOrEqual(1)
    expect(txOutSetInfo.txouts).toBeGreaterThanOrEqual(1)
    expect(txOutSetInfo.bogosize).toBeGreaterThanOrEqual(1)
    expect(txOutSetInfo).toHaveProperty('hash_serialized_2')
    expect(txOutSetInfo.disk_size).toBeGreaterThanOrEqual(0)
    expect(txOutSetInfo.total_amount instanceof BigNumber).toStrictEqual(true)
    expect(txOutSetInfo.total_amount.toNumber()).toBeGreaterThanOrEqual(1)
  })
})

import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

describe('TxOutSetInfo', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForBlockHeight(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getTxOutSetInfo', async () => {
    const txOutSetInfo = await client.blockchain.getTxOutSetInfo()

    expect(txOutSetInfo).toStrictEqual({
      height: 2,
      bestblock: expect.any(String),
      transactions: expect.any(Number),
      txouts: expect.any(Number),
      bogosize: expect.any(Number),
      hash_serialized_2: expect.any(String),
      disk_size: expect.any(Number),
      total_amount: expect.any(BigNumber)
    })
  })
})

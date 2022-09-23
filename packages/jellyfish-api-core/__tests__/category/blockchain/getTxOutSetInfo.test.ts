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

    expect(txOutSetInfo).toStrictEqual({
      height: 1,
      bestblock: expect.any(String),
      transactions: 10,
      txouts: 15,
      bogosize: 1117,
      hash_serialized_2: expect.any(String),
      disk_size: 0,
      total_amount: new BigNumber(400000259.8)
    })
  })
})

import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BigNumber } from '../../../src'

// TODO(aikchun): untrusted_pending simulation after multi-node set up
describe('Balance on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getUnconfirmedBalance', async () => {
    const unconfirmedBalance: BigNumber = await client.wallet.getUnconfirmedBalance()
    expect(unconfirmedBalance.isEqualTo(new BigNumber('0'))).toStrictEqual(true)
  })
})

import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Server on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getTransaction', async () => {
    const txid = 'e86c027861cc0af423313f4152a44a83296a388eb51bf1a6dde9bd75bed55fb4'
    const inWalletTransaction = await client.wallet.getTransaction(txid)
    expect(inWalletTransaction.details[0].address).toStrictEqual('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
  })
})

import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { InWalletTransactionCategory } from '../../../src/category/wallet'

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
    expect(typeof inWalletTransaction.txid).toStrictEqual('string')
    expect(typeof inWalletTransaction.amount).toStrictEqual('number')
    expect(typeof inWalletTransaction.confirmations).toStrictEqual('number')
    expect(typeof inWalletTransaction.blockindex).toStrictEqual('number')
    expect(typeof inWalletTransaction.time).toStrictEqual('number')
    expect(typeof inWalletTransaction.timereceived).toStrictEqual('number')
    expect(typeof inWalletTransaction.blockhash).toStrictEqual('string')
    expect(typeof inWalletTransaction.hex).toBe('string')

    expect(typeof inWalletTransaction.details[0].vout).toStrictEqual('number')
    expect(typeof inWalletTransaction.details[0].address).toStrictEqual('string')
    expect(Object.values(InWalletTransactionCategory).includes(inWalletTransaction.details[0].category)).toBe(true)
  })
})

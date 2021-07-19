import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { InWalletTransactionCategory } from '../../../src/category/wallet'
import BigNumber from 'bignumber.js'

describe('Server on masternode', () => {
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

  const address = 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU'

  it('should getTransaction', async () => {
    const txid = await client.wallet.sendToAddress(address, 0.0001)
    await container.generate(1)

    const inWalletTransaction = await client.wallet.getTransaction(txid)

    expect(inWalletTransaction.details[0].address).toStrictEqual(address)
    expect(typeof inWalletTransaction.txid).toStrictEqual('string')
    expect(inWalletTransaction.amount).toBeInstanceOf(BigNumber)
    expect(typeof inWalletTransaction.fee).toStrictEqual('number')
    expect(typeof inWalletTransaction.confirmations).toStrictEqual('number')
    expect(typeof inWalletTransaction.blockhash).toStrictEqual('string')
    expect(typeof inWalletTransaction.blocktime).toStrictEqual('number')
    expect(typeof inWalletTransaction.blockindex).toStrictEqual('number')
    expect(typeof inWalletTransaction.time).toStrictEqual('number')
    expect(typeof inWalletTransaction.timereceived).toStrictEqual('number')
    expect('bip125replaceable' in inWalletTransaction).toStrictEqual(false)
    expect(typeof inWalletTransaction.hex).toStrictEqual('string')
    expect(typeof inWalletTransaction.details.length).toStrictEqual('number')

    expect(typeof inWalletTransaction.details[0].address).toStrictEqual('string')
    expect(Object.values(InWalletTransactionCategory).includes(inWalletTransaction.details[0].category)).toStrictEqual(true)
    expect(typeof inWalletTransaction.details[0].amount).toStrictEqual('number')
    expect(typeof inWalletTransaction.details[0].label).toStrictEqual('string')
    expect(typeof inWalletTransaction.details[0].vout).toStrictEqual('number')
    expect(typeof inWalletTransaction.details[0].abandoned).toStrictEqual('boolean')
  })

  it('should getTransaction with includesWatch false', async () => {
    const txid = await client.wallet.sendToAddress(address, 0.0001)
    await container.generate(1)

    const inWalletTransaction = await client.wallet.getTransaction(txid, false)

    expect(inWalletTransaction.details[0].address).toStrictEqual(address)
    expect(typeof inWalletTransaction.txid).toStrictEqual('string')
    expect(inWalletTransaction.amount).toBeInstanceOf(BigNumber)
    expect(typeof inWalletTransaction.fee).toStrictEqual('number')
    expect(typeof inWalletTransaction.confirmations).toStrictEqual('number')
    expect(typeof inWalletTransaction.blockhash).toStrictEqual('string')
    expect(typeof inWalletTransaction.blocktime).toStrictEqual('number')
    expect(typeof inWalletTransaction.blockindex).toStrictEqual('number')
    expect(typeof inWalletTransaction.time).toStrictEqual('number')
    expect(typeof inWalletTransaction.timereceived).toStrictEqual('number')
    expect('bip125replaceable' in inWalletTransaction).toStrictEqual(false)
    expect(typeof inWalletTransaction.hex).toStrictEqual('string')

    expect(typeof inWalletTransaction.details.length).toStrictEqual('number')
    expect(typeof inWalletTransaction.details[0].address).toStrictEqual('string')
    expect(Object.values(InWalletTransactionCategory).includes(inWalletTransaction.details[0].category)).toStrictEqual(true)
    expect(typeof inWalletTransaction.details[0].amount).toStrictEqual('number')
    expect(typeof inWalletTransaction.details[0].label).toStrictEqual('string')
    expect(typeof inWalletTransaction.details[0].vout).toStrictEqual('number')
    expect(typeof inWalletTransaction.details[0].abandoned).toStrictEqual('boolean')
  })
})

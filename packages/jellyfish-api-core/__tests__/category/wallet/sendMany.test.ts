import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import {
  UTXO,
  ListUnspentOptions,
  Mode,
  SendManyOptions
} from '../../../src/category/wallet'

describe('Send many', () => {
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

  // Returns matching utxos for given transaction id and address.
  const getMatchingUTXO = async (txId: string, address: string): Promise<UTXO[]> => {
    const options: ListUnspentOptions = {
      addresses: [address]
    }

    const utxos: UTXO[] = await client.wallet.listUnspent(1, 9999999, options)
    return utxos.filter((utxo) => {
      return (utxo.address === address) && (utxo.txid === txId)
    })
  }

  it('should send one address using sendMany', async () => {
    const amounts: Record<string, number> = { mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU: 0.00001 }
    const transactionId = await client.wallet.sendMany(amounts)
    expect(typeof transactionId).toStrictEqual('string')

    // generate one block
    await container.generate(1)

    // check the corresponding UTXO
    const utxos = await getMatchingUTXO(transactionId, 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
    // In this case the we should only have one matching utxo
    expect(utxos.length).toStrictEqual(1)
    utxos.forEach(utxo => {
      expect(utxo.address).toStrictEqual('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
      expect(utxo.amount).toStrictEqual(new BigNumber(0.00001))
    })
  })

  it('should send multiple address using sendMany', async () => {
    const amounts: Record<string, number> = {
      mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU: 0.00001,
      mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy: 0.00002
    }
    const transactionId = await client.wallet.sendMany(amounts)
    expect(typeof transactionId).toStrictEqual('string')

    // generate one block
    await container.generate(1)

    // check the corresponding UTXOs
    const utxos = await getMatchingUTXO(transactionId, 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
    // In this case the we should only have one matching utxo
    expect(utxos.length).toStrictEqual(1)
    utxos.forEach(utxo => {
      expect(utxo.address).toStrictEqual('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
      expect(utxo.amount).toStrictEqual(new BigNumber(0.00001))
    })

    const utxos2 = await getMatchingUTXO(transactionId, 'mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy')
    // In this case the we should only have one matching utxo
    expect(utxos2.length).toStrictEqual(1)
    utxos2.forEach(utxo => {
      expect(utxo.address).toStrictEqual('mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy')
      expect(utxo.amount).toStrictEqual(new BigNumber(0.00002))
    })
  })

  it('should sendMany with comment', async () => {
    const amounts: Record<string, number> = {
      mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU: 0.00001,
      mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy: 0.00002
    }
    const options: SendManyOptions = {
      comment: 'test comment'
    }
    const transactionId = await client.wallet.sendMany(amounts, [], options)
    expect(typeof transactionId).toStrictEqual('string')
  })

  it('should sendMany with replaceable', async () => {
    const amounts: Record<string, number> = {
      mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU: 0.00001,
      mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy: 0.00002
    }
    const options: SendManyOptions = {
      replaceable: true
    }
    const transactionId = await client.wallet.sendMany(amounts, [], options)
    expect(typeof transactionId).toStrictEqual('string')
  })

  it('should sendMany with confTarget', async () => {
    const amounts: Record<string, number> = {
      mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU: 0.00001,
      mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy: 0.00002
    }
    const options: SendManyOptions = {
      confTarget: 60
    }
    const transactionId = await client.wallet.sendMany(amounts, [], options)
    expect(typeof transactionId).toStrictEqual('string')
  })

  it('should sendMany with estimateMode', async () => {
    const amounts: Record<string, number> = {
      mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU: 0.00001,
      mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy: 0.00002
    }
    const options: SendManyOptions = {
      estimateMode: Mode.ECONOMICAL
    }
    const transactionId = await client.wallet.sendMany(amounts, [], options)
    expect(typeof transactionId).toStrictEqual('string')
  })

  it('should sendMany with fee substracted from mentioned recipients', async () => {
    const amounts: Record<string, number> = {
      mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU: 0.00001,
      mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy: 10.5
    }
    const subtractFeeFrom: string [] = ['mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy']
    const transactionId = await client.wallet.sendMany(amounts, subtractFeeFrom)
    expect(typeof transactionId).toStrictEqual('string')

    // generate one block
    await container.generate(1)

    // check the corresponding UTXOs
    const utxos = await getMatchingUTXO(transactionId, 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
    // In this case the we should only have one matching utxo
    expect(utxos.length).toStrictEqual(1)
    utxos.forEach(utxo => {
      expect(utxo.address).toStrictEqual('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
      // amount should be equal to 0.00001
      expect(utxo.amount).toStrictEqual(new BigNumber(0.00001))
    })

    const utxos2 = await getMatchingUTXO(transactionId, 'mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy')
    // In this case the we should only have one matching utxo
    expect(utxos2.length).toStrictEqual(1)
    utxos2.forEach(utxo => {
      expect(utxo.address).toStrictEqual('mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy')
      // amount should be less than 10.5
      expect(utxo.amount.isLessThan(10.5)).toStrictEqual(true)
    })
  })
})

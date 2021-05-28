import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import waitForExpect from 'wait-for-expect'
import {
  SendToAddressOptions,
  Mode
} from '../../../src/category/wallet'

describe('Address', () => {
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

  it('should sendToAddress', async () => {
    return await waitForExpect(async () => {
      const transactionId = await client.wallet.sendToAddress(address, 0.00001)

      expect(typeof transactionId).toStrictEqual('string')
    })
  })

  it('should sendToAddress with comment and commentTo', async () => {
    return await waitForExpect(async () => {
      const options: SendToAddressOptions = {
        comment: 'pizza',
        commentTo: 'domino'
      }
      const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

      expect(typeof transactionId).toStrictEqual('string')
    })
  })

  it('should sendToAddress with replaceable', async () => {
    return await waitForExpect(async () => {
      const options: SendToAddressOptions = {
        replaceable: true
      }
      const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

      expect(typeof transactionId).toStrictEqual('string')
    })
  })

  it('should sendToAddress with confTarget', async () => {
    return await waitForExpect(async () => {
      const options: SendToAddressOptions = {
        confTarget: 60
      }
      const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

      expect(typeof transactionId).toStrictEqual('string')
    })
  })

  it('should sendToAddress with estimateMode', async () => {
    return await waitForExpect(async () => {
      const options: SendToAddressOptions = {
        estimateMode: Mode.ECONOMICAL
      }
      const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

      expect(typeof transactionId).toStrictEqual('string')
    })
  })

  it('should sendToAddress with avoidReuse', async () => {
    return await waitForExpect(async () => {
      const options: SendToAddressOptions = {
        avoidReuse: false
      }
      const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

      expect(typeof transactionId).toStrictEqual('string')
    })
  })
})

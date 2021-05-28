import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('Wallet without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should createWallet', async () => {
    return await waitForExpect(async () => {
      const wallet = await client.wallet.createWallet('alice')

      expect(wallet.name).toStrictEqual('alice')
      expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
    })
  })

  it('should createWallet with disablePrivateKeys true', async () => {
    return await waitForExpect(async () => {
      const wallet = await client.wallet.createWallet('bob', true)

      expect(wallet.name).toStrictEqual('bob')
      expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
    })
  })

  it('should createWallet with blank true', async () => {
    return await waitForExpect(async () => {
      const options = { blank: true }
      const wallet = await client.wallet.createWallet('charlie', false, options)

      expect(wallet.name).toStrictEqual('charlie')
      expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
    })
  })

  it('should createWallet with passphrase', async () => {
    return await waitForExpect(async () => {
      const options = { passphrase: 'shhh...' }
      const wallet = await client.wallet.createWallet('david', false, options)

      expect(wallet.name).toStrictEqual('david')
      expect(wallet.warning).toStrictEqual('')
    })
  })

  it('should createWallet with avoidReuse true', async () => {
    return await waitForExpect(async () => {
      const options = { avoidReuse: true }
      const wallet = await client.wallet.createWallet('eve', false, options)

      expect(wallet.name).toStrictEqual('eve')
      expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
    })
  })
})

describe('Wallet on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should createWallet', async () => {
    return await waitForExpect(async () => {
      const wallet = await client.wallet.createWallet('alice')

      expect(wallet.name).toStrictEqual('alice')
      expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
    })
  })

  it('should createWallet with disablePrivateKeys true', async () => {
    return await waitForExpect(async () => {
      const wallet = await client.wallet.createWallet('bob', true)

      expect(wallet.name).toStrictEqual('bob')
      expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
    })
  })

  it('should createWallet with blank true', async () => {
    return await waitForExpect(async () => {
      const options = { blank: true }
      const wallet = await client.wallet.createWallet('charlie', false, options)

      expect(wallet.name).toStrictEqual('charlie')
      expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
    })
  })

  it('should createWallet with passphrase', async () => {
    return await waitForExpect(async () => {
      const options = { passphrase: 'shhh...' }
      const wallet = await client.wallet.createWallet('david', false, options)

      expect(wallet.name).toStrictEqual('david')
      expect(wallet.warning).toStrictEqual('')
    })
  })

  it('should createWallet with avoidReuse true', async () => {
    return await waitForExpect(async () => {
      const options = { avoidReuse: true }
      const wallet = await client.wallet.createWallet('eve', false, options)

      expect(wallet.name).toStrictEqual('eve')
      expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
    })
  })
})

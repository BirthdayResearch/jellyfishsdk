import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('non masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  describe('listAccounts', () => {
    it('should listAccounts', async () => {
      await waitForExpect(async () => {
        const accounts = await client.account.listAccounts()
        console.log('accounts: ', accounts)
      })
    })
  })
})

describe.only('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  describe('listAccounts', () => {
    it('should listAccounts', async () => {
      await waitForExpect(async () => {
        const accounts = await client.account.listAccounts()
        console.log('accounts: ', accounts)
      })
    })
  })
})

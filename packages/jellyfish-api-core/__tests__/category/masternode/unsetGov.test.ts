import { RpcApiError } from '@defichain/jellyfish-api-core'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createToken } from '@defichain/testing'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.generate(20)

    await createToken(container, 'CAT')
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if not enabled', async () => {
    const promise = client.masternode.unsetGov({ ICX_TAKERFEE_PER_BTC: '' })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -32600,
        message: 'Test UnsetGovVariableTx execution failed:\nUnset Gov variables not currently enabled in attributes.',
        method: 'unsetgov'
      }
    })
  })

  it('should unset governance variables', async () => {
    await client.masternode.setGov({ ICX_TAKERFEE_PER_BTC: 0.001 })
    await client.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov-unset': 'true' } })
    await container.generate(1)

    const govBefore = await client.masternode.getGov('ICX_TAKERFEE_PER_BTC')
    expect(govBefore.ICX_TAKERFEE_PER_BTC.toNumber()).toStrictEqual(0.001)

    await client.masternode.unsetGov({ ICX_TAKERFEE_PER_BTC: '' })
    await container.generate(1)
    const govAfter = await client.masternode.getGov('ICX_TAKERFEE_PER_BTC')
    expect(govAfter.ICX_TAKERFEE_PER_BTC.toNumber()).toStrictEqual(0)
  })

  it('should unset ATTRIBUTES', async () => {
    await client.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov-unset': 'true' } })
    await client.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'true' } })
    await container.generate(1)

    const govBefore = await client.masternode.getGov('ATTRIBUTES')
    expect(govBefore).toMatchObject({
      ATTRIBUTES: {
        'v0/params/dfip2203/active': 'true',
        'v0/params/feature/gov-unset': 'true'
      }
    })

    await client.masternode.unsetGov({ ATTRIBUTES: ['v0/params/dfip2203/active'] })
    await container.generate(1)

    const govAfter = await client.masternode.getGov('ATTRIBUTES')
    expect(govAfter).toMatchObject({
      ATTRIBUTES: {
        'v0/params/feature/gov-unset': 'true'
      }
    })
  })
})

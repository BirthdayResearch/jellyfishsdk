import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { DEFAULT_FEE_RATE } from '../../../src/category/spv'

describe('Spv', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()

    const address = await container.call('spv_getnewaddress')
    await container.call('spv_fundaddress', [address]) // Funds 1 BTC
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should sendToAddress', async () => {
    const otherAddress = 'bcrt1qfpnmx6jrn30yvscrw9spudj5aphyrc8es6epva'
    const amount = 0.1

    const result = await client.spv.sendToAddress(otherAddress, amount)
    expect(typeof result.txid).toStrictEqual('string')
    expect(result.sendmessage).toStrictEqual('Success')

    const balance = await container.call('spv_getbalance')
    expect(balance).toStrictEqual(1 - amount - DEFAULT_FEE_RATE)
  })

  it('should not sendToAddress for invalid address', async () => {
    const promise = client.spv.sendToAddress('XXXX', 1)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Invalid address', code: -5, method: spv_sendtoaddress")
  })

  it('should not sendToAddress with amount < 0', async () => {
    const promise = client.spv.sendToAddress(await container.call('spv_getnewaddress'), -1)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Amount out of range', code: -3, method: spv_sendtoaddress")
  })

  it('should not sendToAddress with amount > 1200000000', async () => {
    const promise = client.spv.sendToAddress(await container.call('spv_getnewaddress'), 1_200_000_000.1)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Amount out of range', code: -3, method: spv_sendtoaddress")
  })
})

describe('Spv with custom feerate', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()

    const address = await container.call('spv_getnewaddress')
    await container.call('spv_fundaddress', [address]) // Funds 1 BTC
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should sendToAddress with custom feerate', async () => {
    const otherAddress = 'bcrt1qfpnmx6jrn30yvscrw9spudj5aphyrc8es6epva'
    const amount = 0.1
    const feerate = 100000

    const result = await client.spv.sendToAddress(otherAddress, 0.1, { feerate })
    expect(typeof result.txid).toStrictEqual('string')
    expect(result.sendmessage).toStrictEqual('Success')

    const balance = await container.call('spv_getbalance')
    expect(balance).toBeLessThanOrEqual(1 - amount - feerate / 1_000_000_000)
  })

  it('should not sendToAddress with feerate below minimum acceptable amount', async () => {
    const promise = client.spv.sendToAddress(await container.call('spv_getnewaddress'), 0.1, { feerate: 999 })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Fee size below minimum acceptable amount', code: -8, method: spv_sendtoaddress")
  })
})

describe('Spv with insufficient funds', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should not sendToAddress with insufficient funds', async () => {
    const promise = client.spv.sendToAddress(await container.call('spv_getnewaddress'), 1)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -6, method: spv_sendtoaddress')
  })

  it('should not sendToAddress with insufficient funds to cover fee', async () => {
    await container.call('spv_fundaddress', [await container.call('spv_getnewaddress')]) // Funds 1 BTC

    const promise = client.spv.sendToAddress(await container.call('spv_getnewaddress'), 1) // Sends 1 BTC
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds to cover fee\', code: -6, method: spv_sendtoaddress')
  })
})

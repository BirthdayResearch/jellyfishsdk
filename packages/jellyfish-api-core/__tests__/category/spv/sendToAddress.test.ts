import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

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
    const amount = new BigNumber(0.1)

    const result = await client.spv.sendToAddress(otherAddress, amount)
    expect(typeof result.txid).toStrictEqual('string')
    expect(result.sendmessage).toStrictEqual('') // not empty when error found

    const balance = new BigNumber(await container.call('spv_getbalance'))
    const expectedBalance = new BigNumber(1).minus(amount)
    expect(balance.lte(expectedBalance)).toStrictEqual(true)
  })

  it('should not sendToAddress for invalid address', async () => {
    const promise = client.spv.sendToAddress('XXXX', new BigNumber(1))
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Invalid address', code: -5, method: spv_sendtoaddress")
  })

  it('should not sendToAddress with amount < 0', async () => {
    const promise = client.spv.sendToAddress(await container.call('spv_getnewaddress'), new BigNumber(-1))
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Amount out of range', code: -3, method: spv_sendtoaddress")
  })

  it('should not sendToAddress with amount > 1200000000', async () => {
    const promise = client.spv.sendToAddress(await container.call('spv_getnewaddress'), new BigNumber(1_200_000_000.1))
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Amount out of range', code: -3, method: spv_sendtoaddress")
  })
})

describe('Spv with custom feeRate', () => {
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

  it('should sendToAddress with custom feeRate', async () => {
    const otherAddress = 'bcrt1qfpnmx6jrn30yvscrw9spudj5aphyrc8es6epva'
    const amount = new BigNumber(0.1)
    const feeRate = new BigNumber(1000)

    const result = await client.spv.sendToAddress(otherAddress, amount, { feeRate })
    expect(typeof result.txid).toStrictEqual('string')
    expect(result.sendmessage).toStrictEqual('') // not empty when error found

    const balance = new BigNumber(await container.call('spv_getbalance'))
    const expectedBalance = new BigNumber(1).minus(amount)
    expect(balance.lte(expectedBalance)).toStrictEqual(true)
  })

  it('should not sendToAddress with feeRate below minimum acceptable amount', async () => {
    const promise = client.spv.sendToAddress(await container.call('spv_getnewaddress'), new BigNumber(0.1), { feeRate: new BigNumber(999) })
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
    const promise = client.spv.sendToAddress(await container.call('spv_getnewaddress'), new BigNumber(1))
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -6, method: spv_sendtoaddress')
  })

  it('should not sendToAddress with insufficient funds to cover fee', async () => {
    await container.call('spv_fundaddress', [await container.call('spv_getnewaddress')]) // Funds 1 BTC

    const promise = client.spv.sendToAddress(await container.call('spv_getnewaddress'), new BigNumber(1)) // Sends 1 BTC
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds to cover fee\', code: -6, method: spv_sendtoaddress')
  })
})

import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BigNumber } from '../../../src'
import { WalletFlag, WalletBalances } from '../../../src/category/wallet'

// TODO(aikchun): Add behavior tests for untrusted_pending, immature, used. Currently unable to do multi-node testing
describe('getBalances on masternode', () => {
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

  it('should getBalances', async () => {
    const balances: WalletBalances = await client.wallet.getBalances()
    expect(balances.mine.trusted instanceof BigNumber).toStrictEqual(true)
    expect(balances.mine.untrusted_pending instanceof BigNumber).toStrictEqual(true)
    expect(balances.mine.immature instanceof BigNumber).toStrictEqual(true)
    expect(typeof balances.mine.used).toStrictEqual('undefined')

    expect(typeof balances.watchonly).toStrictEqual('undefined')
  })

  it('should have used in getBalances when wallet is set to avoid_reuse', async () => {
    await client.wallet.setWalletFlag(WalletFlag.AVOID_REUSE)
    await container.generate(1)
    const balances: WalletBalances = await client.wallet.getBalances()

    expect(balances.mine.trusted instanceof BigNumber).toStrictEqual(true)
    expect(balances.mine.untrusted_pending instanceof BigNumber).toStrictEqual(true)
    expect(balances.mine.immature instanceof BigNumber).toStrictEqual(true)
    expect(balances.mine.used instanceof BigNumber).toStrictEqual(true)

    expect(typeof balances.watchonly).toStrictEqual('undefined')
  })

  it('should show balances after sending the amount out', async () => {
    const balance: WalletBalances = await client.wallet.getBalances()

    const address = 'bcrt1q2tke5fa7wx26m684d7yuyt85rvjl36u6q8l6e2'

    await client.wallet.sendToAddress(address, 10000)
    await container.generate(1)

    const newBalance: WalletBalances = await client.wallet.getBalances()

    expect(balance.mine.trusted.toNumber() - newBalance.mine.trusted.toNumber()).toBeGreaterThan(10000)
  })

  it('test watchOnly', async () => {
    await container.call('importaddress', ['bcrt1q2tke5fa7wx26m684d7yuyt85rvjl36u6q8l6e2'])
    const balances: WalletBalances = await client.wallet.getBalances()

    if (balances.watchonly != null) {
      expect(balances.watchonly.trusted instanceof BigNumber).toStrictEqual(true)
      expect(balances.watchonly.untrusted_pending instanceof BigNumber).toStrictEqual(true)
      expect(balances.watchonly.immature instanceof BigNumber).toStrictEqual(true)
    } else {
      throw new Error('expected watchonly to be truthy')
    }
  })
})

describe('getBalances without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getBalances.mine.trusted = 0', async () => {
    const balances: WalletBalances = await client.wallet.getBalances()

    expect(balances.mine.trusted.toNumber()).toStrictEqual(0)
  })
})

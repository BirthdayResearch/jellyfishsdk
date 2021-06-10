import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BigNumber } from '../../../src'
import { WalletFlag } from '../../../src/category/wallet'

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
    const balances = await client.wallet.getBalances()
    expect(balances.mine.trusted).toBeInstanceOf(BigNumber)
    expect(balances.mine.untrusted_pending).toBeInstanceOf(BigNumber)
    expect(balances.mine.immature).toBeInstanceOf(BigNumber)
    expect(typeof balances.mine.used).toStrictEqual('undefined')

    expect(typeof balances.watchonly).toStrictEqual('undefined')
  })

  it('should have used in getBalances when wallet is set to avoid_reuse', async () => {
    await client.wallet.setWalletFlag(WalletFlag.AVOID_REUSE)
    await container.generate(1)
    const balances = await client.wallet.getBalances()

    expect(balances.mine.trusted).toBeInstanceOf(BigNumber)
    expect(balances.mine.untrusted_pending).toBeInstanceOf(BigNumber)
    expect(balances.mine.immature).toBeInstanceOf(BigNumber)
    expect(balances.mine.used).toBeInstanceOf(BigNumber)

    expect(typeof balances.watchonly).toStrictEqual('undefined')
  })

  it('should show balances after transfer', async () => {
    const balance = await client.wallet.getBalances()

    const address = await client.wallet.getNewAddress()

    await client.wallet.sendToAddress(address, 10000)
    await container.generate(1)

    const newBalance = await client.wallet.getBalances()

    console.log('balance.mine.trusted', balance.mine.trusted.toNumber())
    console.log('newBalance.mine.trusted', balance.mine.trusted.toNumber())

    expect(newBalance.mine.trusted.toNumber() - balance.mine.trusted.toNumber()).toBeGreaterThan(10000)
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
    const balances = await client.wallet.getBalances()

    expect(balances.mine.trusted.toNumber()).toStrictEqual(0)
  })
})

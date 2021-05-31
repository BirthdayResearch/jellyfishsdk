import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { BigNumber } from '../../../src'

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

  it('should getWalletInfo', async () => {
    return await waitForExpect(async () => {
      const walletInfo = await client.wallet.getWalletInfo()

      expect(walletInfo.walletname).toStrictEqual('')
      expect(walletInfo.walletversion).toStrictEqual(169900)
      expect(walletInfo.balance instanceof BigNumber).toStrictEqual(true)
      expect(walletInfo.balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
      expect(walletInfo.unconfirmed_balance instanceof BigNumber).toStrictEqual(true)
      expect(walletInfo.unconfirmed_balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
      expect(walletInfo.immature_balance instanceof BigNumber).toStrictEqual(true)
      expect(walletInfo.immature_balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
      expect(walletInfo.txcount).toBeGreaterThanOrEqual(0)
      expect(typeof walletInfo.keypoololdest).toStrictEqual('number')
      expect(typeof walletInfo.keypoolsize).toStrictEqual('number')
      expect(typeof walletInfo.keypoolsize_hd_internal).toStrictEqual('number')
      expect(walletInfo.paytxfee instanceof BigNumber).toStrictEqual(true)
      expect(walletInfo.paytxfee.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
      expect(typeof walletInfo.hdseedid).toStrictEqual('string')
      expect(walletInfo.private_keys_enabled).toStrictEqual(true)
      expect(walletInfo.avoid_reuse).toStrictEqual(false)
      expect(walletInfo.scanning).toStrictEqual(false)
    })
  })
})

describe('Wallet on masternode', () => {
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

  it('should getWalletInfo', async () => {
    return await waitForExpect(async () => {
      const walletInfo = await client.wallet.getWalletInfo()

      expect(walletInfo.walletname).toStrictEqual('')
      expect(walletInfo.walletversion).toStrictEqual(169900)
      expect(walletInfo.balance instanceof BigNumber).toStrictEqual(true)
      expect(walletInfo.balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
      expect(walletInfo.unconfirmed_balance instanceof BigNumber).toStrictEqual(true)
      expect(walletInfo.unconfirmed_balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
      expect(walletInfo.immature_balance instanceof BigNumber).toStrictEqual(true)
      expect(walletInfo.immature_balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
      expect(walletInfo.txcount).toBeGreaterThanOrEqual(100)
      expect(typeof walletInfo.keypoololdest).toStrictEqual('number')
      expect(typeof walletInfo.keypoolsize).toStrictEqual('number')
      expect(typeof walletInfo.keypoolsize_hd_internal).toStrictEqual('number')
      expect(walletInfo.paytxfee instanceof BigNumber).toStrictEqual(true)
      expect(walletInfo.paytxfee.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
      expect(typeof walletInfo.hdseedid).toStrictEqual('string')
      expect(walletInfo.private_keys_enabled).toStrictEqual(true)
      expect(walletInfo.avoid_reuse).toStrictEqual(false)
      expect(walletInfo.scanning).toStrictEqual(false)
    })
  })
})

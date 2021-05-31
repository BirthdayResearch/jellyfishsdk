import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { WalletFlag } from '../../../src/category/wallet'

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

  it('should setWalletFlag', async () => {
    return await waitForExpect(async () => {
      const walletInfoBefore = await client.wallet.getWalletInfo()
      expect(walletInfoBefore.avoid_reuse).toStrictEqual(false)

      const result = await client.wallet.setWalletFlag(WalletFlag.AVOID_REUSE)
      expect(result.flag_name).toStrictEqual('avoid_reuse')
      expect(result.flag_state).toStrictEqual(true)
      expect(result.warnings).toStrictEqual('You need to rescan the blockchain in order to correctly mark used destinations in the past. Until this is done, some destinations may be considered unused, even if the opposite is the case.')

      const walletInfoAfter = await client.wallet.getWalletInfo()
      expect(walletInfoAfter.avoid_reuse).toStrictEqual(true)
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

  it('should setWalletFlag', async () => {
    return await waitForExpect(async () => {
      const walletInfoBefore = await client.wallet.getWalletInfo()
      expect(walletInfoBefore.avoid_reuse).toStrictEqual(false)

      const result = await client.wallet.setWalletFlag(WalletFlag.AVOID_REUSE)
      expect(result.flag_name).toStrictEqual('avoid_reuse')
      expect(result.flag_state).toStrictEqual(true)
      expect(result.warnings).toStrictEqual('You need to rescan the blockchain in order to correctly mark used destinations in the past. Until this is done, some destinations may be considered unused, even if the opposite is the case.')

      const walletInfoAfter = await client.wallet.getWalletInfo()
      expect(walletInfoAfter.avoid_reuse).toStrictEqual(true)
    })
  })
})

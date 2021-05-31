import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { EstimateMode } from '../../../src/category/mining'

describe('Mining without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should have an error with estimateSmartFee', async () => {
    const result = await client.mining.estimateSmartFee(6)
    const errors = (result.errors != null) ? result.errors : []
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toStrictEqual('Insufficient data or no feerate found')
    expect(result.feerate).toBeUndefined()
  })
})

describe('Mining on masternode', () => {
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

  it('should have estimated smart fees', async () => {
    await waitForExpect(async () => {
      for (let i = 0; i < 20; i++) {
        for (let x = 0; x < 20; x++) {
          const address = await client.wallet.getNewAddress()
          await client.wallet.sendToAddress(address, 0.1, { subtractFeeFromAmount: true })
        }
        await container.generate(1)
      }
    })

    const result = await client.mining.estimateSmartFee(6, EstimateMode.ECONOMICAL)
    expect(result.errors).toBeUndefined()
    expect(result.blocks).toBeGreaterThan(0)
    expect(result.feerate).toBeGreaterThan(0)
  })
})

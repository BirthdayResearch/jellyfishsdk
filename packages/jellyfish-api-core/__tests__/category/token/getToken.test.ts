import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import BigNumber from 'bignumber.js'

describe('Token without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getToken', async () => {
    await waitForExpect(async () => {
      const token = await client.token.getToken('DFI')
      expect(Object.keys(token).length).toBeGreaterThan(0)
    })

    const token = await client.token.getToken('DFI')
    const data = token['0']

    expect(data.symbol).toStrictEqual('DFI')
    expect(data.symbolKey).toStrictEqual('DFI')
    expect(data.name).toStrictEqual('Default Defi token')
    expect(data.decimal).toStrictEqual(new BigNumber('8'))
    expect(data.limit).toStrictEqual(new BigNumber('0'))
    expect(data.mintable).toStrictEqual(false)
    expect(data.tradeable).toStrictEqual(true)
    expect(data.isDAT).toStrictEqual(true)
    expect(data.isLPS).toStrictEqual(false)
    expect(data.finalized).toStrictEqual(true)
    expect(data.minted).toStrictEqual(new BigNumber('0'))
    expect(data.creationTx).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.creationHeight).toStrictEqual(new BigNumber('0'))
    expect(data.destructionTx).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destructionHeight).toStrictEqual(new BigNumber('-1'))
    expect(data.collateralAddress).toStrictEqual('')
  })
})

describe('Token on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getToken', async () => {
    await waitForExpect(async () => {
      const token = await client.token.getToken('DFI')
      expect(Object.keys(token).length).toBeGreaterThan(0)
    })

    const token = await client.token.getToken('DFI')
    const data = token['0']

    expect(data.symbol).toStrictEqual('DFI')
    expect(data.symbolKey).toStrictEqual('DFI')
    expect(data.name).toStrictEqual('Default Defi token')
    expect(data.decimal).toStrictEqual(new BigNumber('8'))
    expect(data.limit).toStrictEqual(new BigNumber('0'))
    expect(data.mintable).toStrictEqual(false)
    expect(data.tradeable).toStrictEqual(true)
    expect(data.isDAT).toStrictEqual(true)
    expect(data.isLPS).toStrictEqual(false)
    expect(data.finalized).toStrictEqual(true)
    expect(data.minted).toStrictEqual(new BigNumber('0'))
    expect(data.creationTx).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.creationHeight).toStrictEqual(new BigNumber('0'))
    expect(data.destructionTx).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destructionHeight).toStrictEqual(new BigNumber('-1'))
    expect(data.collateralAddress).toStrictEqual('')
  })
})

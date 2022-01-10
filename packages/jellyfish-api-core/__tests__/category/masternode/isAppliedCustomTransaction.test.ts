import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should be passed while using valid id and height', async () => {
    const goldAddress = await container.getNewAddress('', 'legacy')
    const goldMetadata = {
      symbol: 'GOLD',
      name: 'shiny gold',
      isDAT: false,
      mintable: true,
      tradeable: true,
      collateralAddress: goldAddress
    }
    const goldTokenId = await client.token.createToken(goldMetadata)
    await container.generate(1)
    const goldHeight = await client.blockchain.getBlockCount()

    const silverAddress = await container.getNewAddress('', 'legacy')
    const silverMetadata = {
      symbol: 'SILVER',
      name: 'just silver',
      isDAT: false,
      mintable: true,
      tradeable: true,
      collateralAddress: silverAddress
    }
    const silverTokenId = await client.token.createToken(silverMetadata)
    await container.generate(1)
    const silverHeight = await client.blockchain.getBlockCount()

    const cupperAddress = await container.getNewAddress('', 'legacy')
    const cupperMetadata = {
      symbol: 'CUPPER',
      name: 'just cupper',
      isDAT: false,
      mintable: true,
      tradeable: true,
      collateralAddress: cupperAddress
    }
    const cupperTokenId = await client.token.createToken(cupperMetadata)
    await container.generate(1)
    const cupperHeight = await client.blockchain.getBlockCount()

    const goldResult = await client.masternode.isAppliedCustomTransaction(goldTokenId, goldHeight)
    expect(goldResult).toStrictEqual(true)

    const silverResult = await client.masternode.isAppliedCustomTransaction(silverTokenId, silverHeight)
    expect(silverResult).toStrictEqual(true)

    const cupperResult = await client.masternode.isAppliedCustomTransaction(cupperTokenId, cupperHeight)
    expect(cupperResult).toStrictEqual(true)
  })

  it('should be failed while using invalid height', async () => {
    const brassAddress = await container.getNewAddress('', 'legacy')
    const brassMetadata = {
      symbol: 'BRASS',
      name: 'shiny brass',
      isDAT: false,
      mintable: true,
      tradeable: true,
      collateralAddress: brassAddress
    }
    const brassTokenId = await client.token.createToken(brassMetadata)
    await container.generate(1)
    const brassHeight = await client.blockchain.getBlockCount()

    const brassResult = await client.masternode.isAppliedCustomTransaction(brassTokenId, brassHeight + 1)
    expect(brassResult).toStrictEqual(false)
  })

  it('should be failed while using invalid id', async () => {
    const blockHeight = await client.blockchain.getBlockCount()

    const result = await client.masternode.isAppliedCustomTransaction('b2bb09ffe9f9b292f13d23bafa1225ef26d0b9906da7af194c5738b63839b235', blockHeight)
    expect(result).toStrictEqual(false)

    await expect(client.masternode.isAppliedCustomTransaction('z2bb09ffe9f9b292f13d23bafa1225ef26d0b9906da7af194c5738b63839b235', blockHeight)).rejects.toThrow()
  })
})

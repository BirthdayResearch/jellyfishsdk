import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'

describe('Masternode', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should be passed while using valid id and height', async () => {
    const goldAddress = await testing.container.getNewAddress('', 'legacy')
    const goldMetadata = {
      symbol: 'GOLD',
      name: 'shiny gold',
      isDAT: false,
      mintable: true,
      tradeable: true,
      collateralAddress: goldAddress
    }
    const goldTokenId = await testing.rpc.token.createToken(goldMetadata)
    await testing.container.generate(1)
    const goldHeight = await testing.rpc.blockchain.getBlockCount()

    const silverAddress = await testing.container.getNewAddress('', 'legacy')
    const silverMetadata = {
      symbol: 'SILVER',
      name: 'just silver',
      isDAT: false,
      mintable: true,
      tradeable: true,
      collateralAddress: silverAddress
    }
    const silverTokenId = await testing.rpc.token.createToken(silverMetadata)
    await testing.container.generate(1)
    const silverHeight = await testing.rpc.blockchain.getBlockCount()

    const copperAddress = await testing.container.getNewAddress('', 'legacy')
    const copperMetadata = {
      symbol: 'COPPER',
      name: 'just copper',
      isDAT: false,
      mintable: true,
      tradeable: true,
      collateralAddress: copperAddress
    }
    const copperTokenId = await testing.rpc.token.createToken(copperMetadata)
    await testing.container.generate(1)
    const copperHeight = await testing.rpc.blockchain.getBlockCount()

    const goldResult = await testing.rpc.masternode.isAppliedCustomTransaction(goldTokenId, goldHeight)
    expect(goldResult).toStrictEqual(true)

    const silverResult = await testing.rpc.masternode.isAppliedCustomTransaction(silverTokenId, silverHeight)
    expect(silverResult).toStrictEqual(true)

    const copperResult = await testing.rpc.masternode.isAppliedCustomTransaction(copperTokenId, copperHeight)
    expect(copperResult).toStrictEqual(true)
  })

  it('should be failed while using invalid height', async () => {
    const brassAddress = await testing.container.getNewAddress('', 'legacy')
    const brassMetadata = {
      symbol: 'BRASS',
      name: 'shiny brass',
      isDAT: false,
      mintable: true,
      tradeable: true,
      collateralAddress: brassAddress
    }
    const brassTokenId = await testing.rpc.token.createToken(brassMetadata)
    await testing.container.generate(1)
    const brassHeight = await testing.rpc.blockchain.getBlockCount()

    const brassResult = await testing.rpc.masternode.isAppliedCustomTransaction(brassTokenId, brassHeight + 1)
    expect(brassResult).toStrictEqual(false)
  })

  it('should be failed while using invalid id', async () => {
    const blockHeight = await testing.rpc.blockchain.getBlockCount()

    const result = await testing.rpc.masternode.isAppliedCustomTransaction('b2bb09ffe9f9b292f13d23bafa1225ef26d0b9906da7af194c5738b63839b235', blockHeight)
    expect(result).toStrictEqual(false)

    // Hex hash id with 63 chars
    try {
      await testing.rpc.masternode.isAppliedCustomTransaction('2bb09ffe9f9b292f13d23bafa1225ef26d0b9906da7af194c5738b63839b235', blockHeight)
      throw new Error('It should not reach here')
    } catch (error: any) {
      expect(error.message).toContain('must be of length 64')
    }

    // Invalid hash id with a non hex char
    try {
      await testing.rpc.masternode.isAppliedCustomTransaction('b2bb09ffe9f9b292f13d23bafa1225ef26d0b9906da7af194c5738b63839b23z', blockHeight)
      throw new Error('It should not reach here')
    } catch (error: any) {
      expect(error.message).toContain('must be hexadecimal string')
    }
  })
})

import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import BigNumber from 'bignumber.js'

describe('Token', () => {
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

  it('should createToken', async () => {
    const tokensBefore = await client.token.listTokens()
    let numberOfTokens = Object.keys(tokensBefore).length
    expect(numberOfTokens).toStrictEqual(1)

    const address = await container.call('getnewaddress')
    const metadata = {
      symbol: 'DDD',
      name: 'DDD',
      isDAT: false,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }

    const data = await client.token.createToken(metadata)
    expect(typeof data).toStrictEqual('string')

    await container.generate(1)
    numberOfTokens += 1

    const tokensAfter = await client.token.listTokens()
    expect(Object.keys(tokensAfter).length).toStrictEqual(numberOfTokens)
    for (const k in tokensAfter) {
      if (tokensAfter[k].symbol === metadata.symbol) {
        const newToken = tokensAfter[k]
        expect(newToken.symbolKey).toStrictEqual(`${metadata.symbol}#${k}`)
        expect(newToken.name).toStrictEqual(metadata.name)
        expect(newToken.mintable).toStrictEqual(metadata.mintable)
        expect(newToken.tradeable).toStrictEqual(metadata.tradeable)
        expect(newToken.collateralAddress).toStrictEqual(metadata.collateralAddress)
        expect(newToken.isDAT).toStrictEqual(metadata.isDAT)
        expect(newToken.decimal).toStrictEqual(new BigNumber('8'))
        expect(newToken.limit).toStrictEqual(new BigNumber('0'))
        expect(newToken.isLPS).toStrictEqual(false)
        expect(newToken.finalized).toStrictEqual(false)
        expect(newToken.minted).toStrictEqual(new BigNumber('0'))
        expect(typeof newToken.creationTx).toStrictEqual('string')
        expect(typeof newToken.destructionTx).toStrictEqual('string')
        expect(newToken.creationHeight instanceof BigNumber).toStrictEqual(true)
        expect(newToken.destructionHeight instanceof BigNumber).toStrictEqual(true)
      }
    }
  })

  it('should createToken with utxo', async () => {
    const tokensBefore = await client.token.listTokens()
    let numberOfTokens = Object.keys(tokensBefore).length

    const utxos = await container.call('listunspent')
    const address = await container.call('getnewaddress')

    const metadata = {
      symbol: 'DDT',
      name: 'DDT',
      isDAT: false,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }

    const data = await client.token.createToken(metadata, [{
      txid: utxos[0].txid,
      vout: utxos[0].vout
    }])
    expect(typeof data).toStrictEqual('string')

    await container.generate(1)
    numberOfTokens += 1

    await waitForExpect(async () => {
      const tokensAfter = await client.token.listTokens()
      expect(Object.keys(tokensAfter).length).toStrictEqual(numberOfTokens)
    })

    const tokensAfter = await client.token.listTokens()
    for (const k in tokensAfter) {
      if (tokensAfter[k].symbol === metadata.symbol) {
        const newToken = tokensAfter[k]
        expect(newToken.symbolKey).toStrictEqual(`${metadata.symbol}#${k}`)
        expect(newToken.name).toStrictEqual(metadata.name)
        expect(newToken.mintable).toStrictEqual(metadata.mintable)
        expect(newToken.tradeable).toStrictEqual(metadata.tradeable)
        expect(newToken.collateralAddress).toStrictEqual(metadata.collateralAddress)
        expect(newToken.isDAT).toStrictEqual(metadata.isDAT)
        expect(newToken.decimal).toStrictEqual(new BigNumber('8'))
        expect(newToken.limit).toStrictEqual(new BigNumber('0'))
        expect(newToken.isLPS).toStrictEqual(false)
        expect(newToken.finalized).toStrictEqual(false)
        expect(newToken.minted).toStrictEqual(new BigNumber('0'))
        expect(typeof newToken.creationTx).toStrictEqual('string')
        expect(typeof newToken.destructionTx).toStrictEqual('string')
        expect(newToken.creationHeight instanceof BigNumber).toStrictEqual(true)
        expect(newToken.destructionHeight instanceof BigNumber).toStrictEqual(true)
      }
    }
  })

  it('should be failed while creating token with existing symbol', async () => {
    const address = await container.call('getnewaddress')
    const metadata = {
      symbol: 'DOA',
      name: 'DOA',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    const data = await client.token.createToken(metadata)
    expect(typeof data).toStrictEqual('string')

    await container.generate(1)

    const promise = client.token.createToken(metadata)
    await expect(promise).rejects.toThrow()
  })
})

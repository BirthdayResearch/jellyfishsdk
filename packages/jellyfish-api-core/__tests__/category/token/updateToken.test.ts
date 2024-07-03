import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('Token', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await container.stop()
  })

  let tokenDTESTId = ''
  let tokenDABCId = ''

  async function setup (): Promise<void> {
    await createToken('DTEST')
    await createToken('DABC')
    await container.generate(1)

    const tokens = await client.token.listTokens()

    for (const k in tokens) {
      const token = tokens[k]
      if (token.symbol === 'DTEST') {
        tokenDTESTId = k
      }
      if (token.symbol === 'DABC') {
        tokenDABCId = k
      }
    }
  }

  async function createToken (symbol: string): Promise<void> {
    const address = await container.call('getnewaddress')
    const defaultMetadata = {
      symbol,
      name: symbol,
      isDAT: false,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await client.token.createToken({ ...defaultMetadata })
  }

  it('should updateToken', async () => {
    const { [tokenDTESTId]: tokenBefore } = await client.token.getToken(`DTEST#${tokenDTESTId}`)
    expect(tokenBefore.symbol).toStrictEqual('DTEST')
    expect(tokenBefore.name).toStrictEqual('DTEST')
    expect(tokenBefore.isDAT).toStrictEqual(false)
    expect(tokenBefore.mintable).toStrictEqual(true)
    expect(tokenBefore.tradeable).toStrictEqual(true)
    expect(tokenBefore.finalized).toStrictEqual(false)
    expect(tokenBefore.symbolKey).toStrictEqual(`DTEST#${tokenDTESTId}`)

    const data = await client.token.updateToken(`DTEST#${tokenDTESTId}`, {
      symbol: 'DDEST',
      name: 'DDEST',
      // isDAT: true, // NOTE(canonbrother): Cannot change isDAT flag after DF23Height
      mintable: false,
      tradeable: false,
      finalize: false
    })
    expect(typeof data).toStrictEqual('string')
    await container.generate(1)

    const { [tokenDTESTId]: tokenAfter } = await client.token.getToken(`DDEST#${tokenDTESTId}`)
    expect(tokenAfter.symbol).toStrictEqual('DDEST')
    expect(tokenAfter.name).toStrictEqual('DDEST')
    expect(tokenAfter.mintable).toStrictEqual(false)
    expect(tokenAfter.tradeable).toStrictEqual(false)
    expect(tokenAfter.finalized).toStrictEqual(false)
    // NOTE(canonbrother): isDAT will not show the ID
    expect(tokenAfter.symbolKey).toStrictEqual(`DDEST#${tokenDTESTId}`)
  })

  it('should updateToken by token id', async () => {
    const { [tokenDABCId]: tokenBefore } = await client.token.getToken(`DABC#${tokenDABCId}`)
    expect(tokenBefore.mintable).toStrictEqual(true)

    await client.token.updateToken(tokenDABCId, { mintable: false })
    await container.generate(1)

    await waitForExpect(async () => {
      const { [tokenDABCId]: tokenAfter } = await client.token.getToken(`DABC#${tokenDABCId}`)
      expect(tokenAfter.mintable).toStrictEqual(false)
    })
  })

  it('should updateToken by creationTx', async () => {
    const { [tokenDABCId]: tokenBefore } = await client.token.getToken(`DABC#${tokenDABCId}`)
    expect(tokenBefore.tradeable).toStrictEqual(true)

    const { creationTx } = tokenBefore
    await client.token.updateToken(creationTx, { tradeable: false })
    await container.generate(1)

    await waitForExpect(async () => {
      const { [tokenDABCId]: tokenAfter } = await client.token.getToken(`DABC#${tokenDABCId}`)
      expect(tokenAfter.tradeable).toStrictEqual(false)
    })
  })
})

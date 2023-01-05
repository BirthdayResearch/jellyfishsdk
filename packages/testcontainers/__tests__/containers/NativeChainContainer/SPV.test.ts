import { Network } from 'testcontainers'
import { NativeChainContainer, StartedNativeChainContainer } from '../../../src'

describe('nativechain spv regtest', () => {
  let container: StartedNativeChainContainer

  beforeAll(async () => {
    const startedNetwork = await new Network().start()
    container = await new NativeChainContainer()
      .withNetworkMode((startedNetwork).getName())
      .withBlockchainNetwork('regtest')
      .withStartupTimeout(60_000)
      .start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should fundAddress', async () => {
    const address = await container.rpc.call('spv_getnewaddress')
    const txid = await container.rpc.spvFundAddress(address)
    expect(typeof txid).toStrictEqual('string')

    const addressBalance = await container.rpc.call('spv_getbalance')
    expect(addressBalance).toStrictEqual(1)
  })

  it('should setLastHeight', async () => {
    const blockHeight = 10
    await container.rpc.spvSetLastHeight(blockHeight)

    const status = await container.rpc.call('spv_syncstatus')
    expect(status.current).toStrictEqual(blockHeight)
  })
})

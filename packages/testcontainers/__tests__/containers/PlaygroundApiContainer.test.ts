import { Network } from 'testcontainers'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { PlaygroundApiClient } from '@defichain/playground-api-client'

import {
  NativeChainContainer,
  StartedNativeChainContainer,
  StartedWhaleApiContainer,
  WhaleApiContainer,
  PlaygroundApiContainer,
  StartedPlaygroundApiContainer
} from '../../src'

let defid: StartedNativeChainContainer
let whale: StartedWhaleApiContainer
let playground: StartedPlaygroundApiContainer

beforeAll(async () => {
  const network = await new Network().start()

  defid = await new NativeChainContainer()
    .withNetwork(network)
    .withPreconfiguredRegtestMasternode()
    .start()

  whale = await new WhaleApiContainer()
    .withNetwork(network)
    .withNativeChain(defid, network)
    .start()

  playground = await new PlaygroundApiContainer()
    .withNetwork(network)
    .withNativeChain(defid, network)
    .start()
})

afterAll(async () => {
  // await whale.stop()
  // await defid.stop()
  // await playground.stop()
})

it('should playground.waitForReady()', async () => {
  await playground.waitForReady()

  const playgroundApi = new PlaygroundApiClient(playground.getPlaygroundApiClientOptions())
  const { block } = await playgroundApi.playground.info()
  expect(block.count).toBeGreaterThanOrEqual(150)

  // Check if any PoolPair is created.
  const whaleApi = new WhaleApiClient(whale.getWhaleApiClientOptions())
  const data = await whaleApi.poolpairs.list(1)
  expect(data[0]).toStrictEqual(
    expect.objectContaining({
      name: expect.any(String)
    })
  )
})

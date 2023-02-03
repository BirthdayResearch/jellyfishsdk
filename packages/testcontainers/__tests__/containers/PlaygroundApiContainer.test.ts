import { NativeChainContainer, StartedNativeChainContainer } from '@defichain/testcontainers'
import { Network } from 'testcontainers'
import {
  StartedWhaleApiContainer,
  WhaleApiContainer
} from '@defichain/testcontainers/dist/containers/AppContainer/WhaleApiContainer'
import {
  PlaygroundApiContainer,
  StartedPlaygroundApiContainer
} from '@defichain/testcontainers/dist/containers/AppContainer/PlaygroundApiContainer'
import { PlaygroundApiClient } from '@defichain/playground-api-client'

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
  await whale.stop()
  await defid.stop()
  await playground.stop()
})

it('should waitForIndexedBlockHeight(100)', async () => {
  await playground.waitForReady()

  const api = new PlaygroundApiClient(playground.getPlaygroundApiClientOptions())
  console.log(await api.playground.info())
  // TODO(fuxingloh): check poolpair
})

import { Network } from 'testcontainers'
import { WhaleApiClient } from '@defichain/whale-api-client'

import {
  NativeChainContainer,
  StartedNativeChainContainer,
  StartedWhaleApiContainer,
  WhaleApiContainer
} from '../../src'

let defid: StartedNativeChainContainer
let whale: StartedWhaleApiContainer

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
})

afterAll(async () => {
  await whale.stop()
  await defid.stop()
})

it('should waitForIndexedBlockHeight(100)', async () => {
  await defid.waitFor.walletCoinbaseMaturity()

  const api = new WhaleApiClient(whale.getWhaleApiClientOptions())
  await whale.waitForIndexedBlockHeight(100)

  const blocks = await api.blocks.list(1)
  expect(blocks[0].height).toBeGreaterThanOrEqual(100)
})

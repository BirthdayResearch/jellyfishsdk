import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { blockchain } from '@defichain/jellyfish-api-core'
import { WhaleApiClient } from '../../src'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForReady()
  await service.start()
})

afterAll(async () => {
  await service.stop()
  await container.stop()
})

it("call('getblockchaininfo')", async () => {
  const info = await client.rpc.call<blockchain.BlockchainInfo>('getblockchaininfo', [], 'number')

  expect(info.chain).toBe('regtest')
  expect(typeof info.blocks).toBe('number')
})

// TODO(fuxingloh): need more test, currently this is non exhaustive for example only

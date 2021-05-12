import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createSignedTxnHex } from '@defichain/testing'
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
  await container.waitForWalletCoinbaseMaturity()
  await service.start()
})

afterAll(async () => {
  await service.stop()
  await container.stop()
})

beforeEach(async () => {
  await container.waitForWalletBalanceGTE(15)
})

it('send()', async () => {
  const hex = await createSignedTxnHex(container, 10, 9.9999)
  const txid = await client.transactions.send({
    hex: hex
  })

  expect(txid.length).toEqual(64)
})

// TODO(fuxingloh): need more test, currently this is non exhaustive for example only

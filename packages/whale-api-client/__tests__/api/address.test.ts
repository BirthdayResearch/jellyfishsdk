import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { createToken, mintTokens, utxosToAccount } from '@defichain/testing'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

let address: string
const tokens = ['A', 'B', 'C', 'D']

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

  address = await container.getNewAddress('', 'bech32')
  await container.waitForWalletBalanceGTE(20)

  await utxosToAccount(container, 15.5, { address: address })
  await container.generate(1)

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(101)
    await createToken(container, token)
    await mintTokens(container, token, { mintAmount: 1000 })
    await container.call('sendtokenstoaddress', [{}, { [address]: [`10@${token}`] }])
  }

  await container.generate(1)
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

it('should listTokens', async () => {
  const response = await client.address.listTokens(address)
  expect(response.length).toBe(5)
  expect(response.hasNext).toBe(false)

  expect(response[0]).toEqual(expect.objectContaining({ id: '0', amount: '15.50000000', symbol: 'DFI' }))
  expect(response[4]).toEqual(expect.objectContaining({ id: '4', amount: '10.00000000', symbol: 'D' }))
})

it('should paginate listTokens', async () => {
  const first = await client.address.listTokens(address, 2)
  expect(first.length).toBe(2)
  expect(first.hasNext).toBe(true)
  expect(first.nextToken).toBe('1')

  expect(first[0]).toEqual(expect.objectContaining({ id: '0', amount: '15.50000000', symbol: 'DFI' }))
  expect(first[1]).toEqual(expect.objectContaining({ id: '1', amount: '10.00000000', symbol: 'A' }))

  const next = await client.paginate(first)
  expect(next.length).toBe(2)
  expect(next.hasNext).toBe(true)
  expect(next.nextToken).toBe('3')

  expect(next[0]).toEqual(expect.objectContaining({ id: '2', amount: '10.00000000', symbol: 'B' }))
  expect(next[1]).toEqual(expect.objectContaining({ id: '3', amount: '10.00000000', symbol: 'C' }))

  const last = await client.paginate(next)
  expect(last.length).toBe(1)
  expect(last.hasNext).toBe(false)
  expect(last.nextToken).toBeUndefined()

  expect(last[0]).toEqual(expect.objectContaining({ id: '4', amount: '10.00000000', symbol: 'D' }))
})

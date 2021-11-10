import { ContainerGroup, MasterNodeRegTestContainer } from '../../../src'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

const group = new ContainerGroup([
  new MasterNodeRegTestContainer(RegTestFoundationKeys[0]),
  new MasterNodeRegTestContainer(RegTestFoundationKeys[1]),
  new MasterNodeRegTestContainer(RegTestFoundationKeys[2])
])

beforeAll(async () => {
  await group.start()
  await group.get(0).waitForWalletCoinbaseMaturity()
})

afterAll(async () => {
  await group.stop()
})

it('send balance and wait for sync for balance to reach', async () => {
  const before = await group.get(1).call('getbalance')

  const address = await group.get(1).getNewAddress()
  await group.get(0).call('sendtoaddress', [address, 314])
  await group.get(0).generate(1)
  await group.waitForSync()

  const after = await group.get(1).call('getbalance')
  expect(after - before).toStrictEqual(314)
})

it('should add another container to already running group', async () => {
  const container = new MasterNodeRegTestContainer()
  await container.start()

  await group.add(container)
  await group.waitForSync()

  const count = await group.get(2).getBlockCount()
  expect(count).toBeGreaterThan(100)
})

it('send balance and wait for sync for balance to reach', async () => {
  const before = await group.get(2).call('getbalance')

  const address = await group.get(2).getNewAddress()
  const txid = await group.get(1).call('sendtoaddress', [address, 314])
  await group.waitForMempoolSync(txid)

  await group.get(0).generate(1)
  await group.waitForSync()

  const after = await group.get(2).call('getbalance')
  expect(after - before).toStrictEqual(314)
})

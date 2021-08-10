import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'

const testing = Testing.create(new MasterNodeRegTestContainer())

beforeAll(async () => {
  await testing.container.start()
  await testing.container.waitForWalletCoinbaseMaturity()
})

afterAll(async () => {
  await testing.container.stop()
})

it('should create mint send', async () => {
  await testing.token.create({ symbol: 'MINT' })
  await testing.generate(1)
  await testing.token.mint({ symbol: 'MINT', amount: 100 })
  await testing.generate(1)

  await testing.token.send({
    address: await testing.address('key-1'),
    amount: 10,
    symbol: 'MINT'
  })
  await testing.generate(1)

  const account = await testing.rpc.account.getAccount(await testing.address('key-1'))
  expect(account).toStrictEqual(['10.00000000@MINT'])
})

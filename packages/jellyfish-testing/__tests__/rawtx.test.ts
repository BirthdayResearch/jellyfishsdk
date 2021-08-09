import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { Elliptic } from '@defichain/jellyfish-crypto'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
})

afterAll(async () => {
  await container.stop()
})

it('should testing.rawtx.fund', async () => {
  const { hex: { signed } } = await testing.rawtx.fund({
    a: {
      amount: 10,
      ellipticPair: Elliptic.fromPrivKey(Buffer.from('619c335025c7f4012e556c2a58b2506e30b8511b53ade95ea316fd8c3286feb9', 'hex'))
    },
    b: {
      amount: 5,
      ellipticPair: Elliptic.fromPrivKey(Buffer.from('557c4bdff86e59015987c1c7f3328a1fb4c2177b5e834f09c8cd10fae51af93b', 'hex'))
    }
  })

  expect(signed.substr(0, 14)).toStrictEqual('04000000000101')
  expect(signed.substr(86, 78)).toStrictEqual('00ffffffff010065cd1d0000000016001425a544c073cbca4e88d59f95ccd52e584c7e6a820002')
  expect(signed).toContain('0121025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee635700000000')
})

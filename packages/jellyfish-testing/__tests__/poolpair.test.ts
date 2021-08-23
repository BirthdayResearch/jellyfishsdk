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

it('should create add remove swap', async () => {
  await testing.token.create({ symbol: 'ABC' })
  await testing.token.dfi({ amount: 10 })
  await testing.generate(1)

  await testing.poolpair.create({ tokenA: 'ABC', tokenB: 'DFI' })
  await testing.token.mint({ symbol: 'ABC', amount: '100' })
  await testing.generate(1)

  await testing.poolpair.add({
    a: { amount: '5', symbol: 'DFI' },
    b: { amount: '50', symbol: 'ABC' },
    address: await testing.address('my')
  })
  await testing.generate(1)

  await testing.poolpair.remove({
    address: await testing.address('my'),
    amount: '2',
    symbol: 'ABC-DFI'
  })
  await testing.generate(1)

  await testing.poolpair.swap({
    from: await testing.address('my'),
    tokenFrom: 'ABC',
    amountFrom: 1,
    to: await testing.address('my'),
    tokenTo: 'DFI'
  })
  await testing.generate(1)

  const account = await testing.rpc.account.getAccount(await testing.address('my'))
  expect(account).toStrictEqual(expect.objectContaining([
    '0.73021717@DFI',
    '5.32455532@ABC',
    '13.81137830@ABC-DFI'
  ]))
})

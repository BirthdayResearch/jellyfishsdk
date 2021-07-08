import { MasterNodeRegTestContainer, GenesisKeys } from '@defichain/testcontainers'
import { createToken } from '@defichain/testing'
import waitForExpect from 'wait-for-expect'

const aContainer = new MasterNodeRegTestContainer()
const bContainer = new MasterNodeRegTestContainer(GenesisKeys[1])

beforeAll(async () => {
  await aContainer.start({ ip: '172.21.0.0' })
  await aContainer.waitForReady()
  await aContainer.waitForWalletCoinbaseMaturity()

  await bContainer.start({ ip: '172.21.0.0' })
  await bContainer.waitForReady()
  await bContainer.waitForWalletCoinbaseMaturity()

  await aContainer.sync([bContainer])
})

afterAll(async () => {
  await aContainer.stop()
  await bContainer.stop()
})

it('balance', async () => {
  const aBalanceBefore = await aContainer.call('getbalance')
  const bBalanceBefore = await bContainer.call('getbalance') // 200000000

  const bAddr = await bContainer.call('getnewaddress')

  await aContainer.call('sendtoaddress', [bAddr, 314])
  const aBalanceAfter = await aContainer.call('getbalance')
  expect(aBalanceAfter).toBeLessThan(Number(aBalanceBefore) - 314) // the exact deduct was 314.0000446

  await aContainer.generate(1)

  const bBalanceAfter = await bContainer.call('getbalance')
  await waitForExpect(async () => {
    expect(bBalanceAfter).toStrictEqual(Number(bBalanceBefore) + 314) // 200000314
  })
})

it('token', async () => {
  const aTokensBefore = await aContainer.call('listtokens')
  expect(Object.keys(aTokensBefore).length).toStrictEqual(1)

  const bTokensBefore = await bContainer.call('listtokens')
  expect(Object.keys(bTokensBefore).length).toStrictEqual(1)

  // aContainer createToken
  await createToken(aContainer, 'CAT')
  const aTokensAfter = await aContainer.call('listtokens')
  expect(aTokensAfter['1'].symbol).toStrictEqual('CAT')

  const bTokensAfter = await bContainer.call('listtokens')
  await waitForExpect(async () => {
    expect(bTokensAfter['1'].symbol).toStrictEqual('CAT')
  })

  // bContainer createToken
  await createToken(bContainer, 'DOG')
  const b1TokensAfter = await bContainer.call('listtokens')
  expect(b1TokensAfter['2'].symbol).toStrictEqual('DOG')

  await waitForExpect(async () => {
    const a1TokensAfter = await aContainer.call('listtokens')
    expect(a1TokensAfter['2'].symbol).toStrictEqual('DOG')
  })
})

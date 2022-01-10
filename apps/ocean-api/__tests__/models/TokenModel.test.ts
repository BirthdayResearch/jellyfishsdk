import { OceanApiTesting } from '../../testing/OceanApiTesting'

const apiTesting = OceanApiTesting.create()

beforeEach(async () => {
  await apiTesting.start()

  await apiTesting.container.waitForWalletCoinbaseMaturity()
  await apiTesting.testing.token.create({
    symbol: 'TEST',
    name: 'Test Token'
  })
  await apiTesting.testing.generate(1)
})

afterEach(async () => {
  await apiTesting.stop()
})

it('should fetch token data', async () => {
  const tokenData = await apiTesting.client.token.get('1')
  console.log(JSON.stringify(tokenData))
})

import { OceanApiTesting } from '../../testing/OceanApiTesting'

const apiTesting = OceanApiTesting.create()
const client = apiTesting.client

beforeEach(async () => {
  await apiTesting.start()
})

afterEach(async () => {
  await apiTesting.stop()
})

it('should be fixed fee of 0.00005000 when there are no transactions', async () => {
  const feeRate = await client.fee.estimate()
  expect(feeRate).toStrictEqual(0.00005000)
})

it('should have fee of not 0.00005 with transactions activity', async () => {
  await apiTesting.container.waitForWalletBalanceGTE(100)

  for (let i = 0; i < 10; i++) {
    for (let x = 0; x < 20; x++) {
      await apiTesting.rpc.wallet.sendToAddress('bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r', 0.1, {
        subtractFeeFromAmount: true,
        avoidReuse: false
      })
    }
    await apiTesting.container.generate(1)
  }

  const feeRate = await client.fee.estimate()
  expect(feeRate).not.toStrictEqual(0.00005000)
})
